use igproto_compiler::{
    compile,
    export::{AssetProvider, ExportProvider},
    files::ReadRoot,
    vectorcraft::SavedExports,
};
use igproto_model::*;
use igproto_package::{diagnostics::error, Control, Result};
use std::{
    collections::{BTreeMap, BTreeSet},
    path::{Path, PathBuf},
    time::Duration,
};
fn fixture(name: &str) -> PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR"))
        .join("../../tests/fixtures/prototype/phase-2")
        .join(name)
        .canonicalize()
        .unwrap()
}
fn control() -> Control {
    Control::new(Duration::from_secs(300))
}
#[derive(Clone)]
struct Memory {
    source: Vec<u8>,
    scenes: BTreeMap<SceneId, Vec<u8>>,
    visuals: BTreeMap<String, Vec<u8>>,
    assets: BTreeMap<String, Vec<u8>>,
}
impl Memory {
    fn load(name: &str) -> Self {
        let root = fixture(name);
        let source = std::fs::read(root.join("prototype.source.json")).unwrap();
        let s = decode_source(&source).unwrap();
        Self {
            source,
            scenes: s
                .scenes
                .iter()
                .map(|s| {
                    (
                        s.id.clone(),
                        std::fs::read(root.join(format!("scenes/{}.svg", s.id))).unwrap(),
                    )
                })
                .collect(),
            visuals: s
                .visual_sources
                .iter()
                .map(|v| (v.path.clone(), std::fs::read(root.join(&v.path)).unwrap()))
                .collect(),
            assets: if name == "representative" {
                BTreeMap::from([(
                    "images/checker.png".into(),
                    std::fs::read(root.join("images/checker.png")).unwrap(),
                )])
            } else {
                BTreeMap::new()
            },
        }
    }
    fn build(&self) -> Result<igproto_compiler::CompileResult> {
        compile(&self.source, self, self, &control())
    }
    fn source_edit(&mut self, f: impl FnOnce(&mut serde_json::Value)) {
        let mut v = serde_json::from_slice(&self.source).unwrap();
        f(&mut v);
        self.source = serde_json::to_vec(&v).unwrap();
    }
    fn scene_edit(&mut self, id: &str, f: impl FnOnce(String) -> String) {
        let s = SceneId::new(id).unwrap();
        let b = String::from_utf8(self.scenes[&s].clone()).unwrap();
        self.scenes.insert(s, f(b).into_bytes());
    }
}
impl ExportProvider for Memory {
    fn scenes(&self) -> Result<BTreeSet<SceneId>> {
        Ok(self.scenes.keys().cloned().collect())
    }
    fn verify_sources(&self, s: &PrototypeSource, _c: &Control) -> Result<()> {
        for v in &s.visual_sources {
            if self
                .visuals
                .get(&v.path)
                .map(|b| igproto_package::resources::sha256(b))
                .as_ref()
                != Some(&v.sha256)
            {
                return Err(error(
                    Code::InvalidVisual,
                    Stage::Reference,
                    &v.path,
                    "stale digest",
                ));
            }
        }
        Ok(())
    }
    fn scene(&self, s: &SourceScene, _c: &Control) -> Result<Vec<u8>> {
        Ok(self.scenes[&s.id].clone())
    }
}
impl AssetProvider for Memory {
    fn png(&self, path: &str, _c: &Control) -> Result<Vec<u8>> {
        self.assets.get(path).cloned().ok_or_else(|| {
            error(
                Code::MissingSource,
                Stage::Reference,
                path,
                "missing PNG asset",
            )
        })
    }
}
#[test]
fn minimal_native_export() {
    let m = Memory::load("minimal");
    let r = m.build().unwrap();
    assert!(r.warnings.is_empty());
    let p = igproto_package::validate(&r.bytes).unwrap();
    assert_eq!(p.prototype().scenes.len(), 1);
    assert_eq!(
        p.inventory().scenes[&SceneId::new("home").unwrap()][0]
            .id
            .as_str(),
        "root"
    );
}
#[test]
fn representative_compile() {
    let r = Memory::load("representative").build().unwrap();
    assert!(r.warnings.is_empty());
    let p = igproto_package::validate(&r.bytes).unwrap();
    assert_eq!(p.prototype().interactions.len(), 6);
    for c in [
        Capability::NavigationV1,
        Capability::OverlayV1,
        Capability::VisibilityV1,
        Capability::DissolveV1,
        Capability::PngV1,
        Capability::ArialTextV1,
    ] {
        assert!(p.manifest().capabilities.contains(&c));
    }
}
#[test]
fn invalid_source() {
    let m = Memory::load("minimal");
    let e = compile(b"{broken", &m, &m, &control()).unwrap_err();
    assert_eq!(e.diagnostics[0].stage, Stage::Decode);
}
#[test]
fn semantic_source_error() {
    let mut m = Memory::load("representative");
    m.source_edit(|s| s["interactions"][0]["action"]["scene"] = "missing".into());
    assert!(m.build().is_err());
}
#[test]
fn missing_export() {
    let mut m = Memory::load("representative");
    m.scenes.remove(&SceneId::new("settings").unwrap());
    assert_eq!(
        m.build().unwrap_err().diagnostics[0].code,
        Code::MissingScene
    );
}
#[test]
fn unknown_export() {
    let mut m = Memory::load("minimal");
    m.scenes.insert(SceneId::new("extra").unwrap(), vec![]);
    assert_eq!(
        m.build().unwrap_err().diagnostics[0].code,
        Code::MissingScene
    );
}
#[test]
fn missing_target() {
    let mut m = Memory::load("representative");
    m.scene_edit("settings", |s| {
        s.replace("data-prototype-id=\"back-button\"", "")
    });
    assert!(m
        .build()
        .unwrap_err()
        .diagnostics
        .iter()
        .any(|d| d.code == Code::MissingTarget
            && d.scene.as_ref().is_some_and(|s| s.as_str() == "settings")));
}
#[test]
fn duplicate_target() {
    let mut m = Memory::load("representative");
    m.scene_edit("settings", |s| {
        s.replace("</svg>", "<g data-prototype-id=\"back-button\"/></svg>")
    });
    assert_eq!(
        m.build().unwrap_err().diagnostics[0].code,
        Code::DuplicateTarget
    );
}
#[test]
fn malformed_target() {
    let mut m = Memory::load("minimal");
    m.scene_edit("home", |s| {
        s.replace("prototype-id=\"root\"", "prototype-id=\"Bad Target\"")
    });
    assert!(m.build().is_err());
}
#[test]
fn missing_root() {
    let mut m = Memory::load("minimal");
    m.scene_edit("home", |s| s.replace("data-prototype-id=\"root\"", ""));
    assert!(m
        .build()
        .unwrap_err()
        .diagnostics
        .iter()
        .any(|d| d.code == Code::MissingTarget));
}
#[test]
fn unsupported_svg() {
    let mut m = Memory::load("minimal");
    m.scene_edit("home", |s| s.replace("</svg>", "<script/></svg>"));
    assert!(m.build().unwrap_err().diagnostics[0]
        .message
        .contains("script"));
}
#[test]
fn invalid_png() {
    let mut m = Memory::load("representative");
    m.assets
        .insert("images/checker.png".into(), b"GIF89a".to_vec());
    assert!(m.build().unwrap_err().diagnostics[0]
        .message
        .contains("PNG"));
}
#[test]
fn missing_asset() {
    let mut m = Memory::load("representative");
    m.assets.clear();
    assert!(m.build().is_err());
}
#[test]
fn stale_visual_source() {
    let mut m = Memory::load("minimal");
    m.visuals.get_mut("visual.vectorcraft").unwrap().push(0);
    assert!(m.build().is_err());
}
#[test]
fn target_identity_preserved() {
    let r = Memory::load("representative").build().unwrap();
    let p = igproto_package::validate(&r.bytes).unwrap();
    for s in ["dashboard", "settings"] {
        assert!(p.inventory().scenes[&SceneId::new(s).unwrap()]
            .iter()
            .any(|t| t.id.as_str() == "back-button"));
    }
    let s = std::str::from_utf8(p.member("scenes/dashboard.svg").unwrap()).unwrap();
    assert!(!s.contains("style="));
    assert!(s.contains("data-prototype-id=\"settings-button\""));
}
#[test]
fn unused_marker_warns_and_survives() {
    let mut m = Memory::load("minimal");
    m.scene_edit("home", |s| {
        s.replace("</svg>", "<rect data-prototype-id=\"unused\"/></svg>")
    });
    let r = m.build().unwrap();
    assert!(r
        .warnings
        .iter()
        .any(|d| d.message.contains("unused marker")));
    assert!(r.inventory.scenes[&SceneId::new("home").unwrap()]
        .iter()
        .any(|t| t.id.as_str() == "unused"));
}
#[test]
fn deterministic_repeated() {
    let m = Memory::load("representative");
    let a = m.build().unwrap();
    let b = m.build().unwrap();
    assert_eq!(a.sha256, b.sha256);
    assert_eq!(a.bytes, b.bytes);
}
#[test]
fn deterministic_source_order() {
    let mut m = Memory::load("representative");
    let a = m.build().unwrap();
    m.source_edit(|s| {
        s["scenes"].as_array_mut().unwrap().reverse();
        s["visualSources"].as_array_mut().unwrap().reverse();
        s["interactions"].as_array_mut().unwrap().reverse();
    });
    assert_eq!(a.bytes, m.build().unwrap().bytes);
}
#[test]
fn meaningful_change_updates_digest() {
    let mut m = Memory::load("representative");
    let a = m.build().unwrap();
    m.scene_edit("settings", |s| s.replace("#315de8", "#315de9"));
    let b = m.build().unwrap();
    assert_ne!(a.sha256, b.sha256);
    let a = igproto_package::validate(&a.bytes).unwrap();
    let b = igproto_package::validate(&b.bytes).unwrap();
    assert_ne!(
        a.member("scenes/settings.svg"),
        b.member("scenes/settings.svg")
    );
    assert_eq!(a.member("prototype.json"), b.member("prototype.json"));
}
#[test]
fn embedded_png_deduplicates() {
    let mut m = Memory::load("representative");
    use base64::Engine;
    let png = m.assets["images/checker.png"].clone();
    let data = base64::engine::general_purpose::STANDARD.encode(png);
    m.scene_edit("dashboard", |s| {
        s.replace(
            "images/checker.png",
            &format!("data:image/png;base64,{data}"),
        )
    });
    let r = m.build().unwrap();
    let p = igproto_package::validate(&r.bytes).unwrap();
    assert_eq!(
        p.manifest()
            .files
            .iter()
            .filter(|f| f.media_type == MediaType::Png)
            .count(),
        1
    );
    assert!(
        !std::str::from_utf8(p.member("scenes/dashboard.svg").unwrap())
            .unwrap()
            .contains("data:image")
    );
}
#[test]
fn authoring_traversal_image() {
    let mut m = Memory::load("representative");
    m.scene_edit("dashboard", |s| {
        s.replace("images/checker.png", "../checker.png")
    });
    assert!(m.build().is_err());
}
#[test]
fn cancelled_compile() {
    let m = Memory::load("minimal");
    let c = control();
    c.cancel();
    assert!(compile(&m.source, &m, &m, &c).is_err());
}
#[test]
fn deadline_compile() {
    let m = Memory::load("minimal");
    assert!(compile(&m.source, &m, &m, &Control::new(Duration::ZERO)).is_err());
}
#[test]
fn saved_exports_adapter() {
    let root = fixture("minimal");
    let provider = SavedExports {
        authoring: ReadRoot::open(&root).unwrap(),
        exports: ReadRoot::open(&root).unwrap(),
    };
    let source = std::fs::read(root.join("prototype.source.json")).unwrap();
    assert!(compile(&source, &provider, &provider, &control()).is_ok());
}
#[cfg(unix)]
fn temp() -> PathBuf {
    use std::sync::atomic::{AtomicU64, Ordering};
    static N: AtomicU64 = AtomicU64::new(0);
    let path = std::env::temp_dir().canonicalize().unwrap().join(format!(
        "igproto-phase2-test-{}-{}",
        std::process::id(),
        N.fetch_add(1, Ordering::Relaxed)
    ));
    std::fs::create_dir(&path).unwrap();
    path
}
#[cfg(unix)]
#[test]
fn symlink_file_rejected() {
    let dir = temp();
    std::os::unix::fs::symlink(
        fixture("minimal").join("prototype.source.json"),
        dir.join("source.json"),
    )
    .unwrap();
    assert!(ReadRoot::open(&dir)
        .unwrap()
        .read("source.json", 1024 * 1024, &control())
        .is_err());
    std::fs::remove_dir_all(dir).unwrap();
}
#[cfg(unix)]
#[test]
fn symlink_ancestor_rejected() {
    let dir = temp();
    std::os::unix::fs::symlink(fixture("minimal"), dir.join("linked")).unwrap();
    let root = ReadRoot::open(&dir).unwrap();
    assert!(root
        .read("linked/prototype.source.json", 1024 * 1024, &control())
        .is_err());
    assert!(ReadRoot::open(&dir.join("linked")).is_err());
    std::fs::remove_dir_all(dir).unwrap();
}
#[cfg(unix)]
#[test]
fn filesystem_traversal_rejected() {
    let root = ReadRoot::open(&fixture("minimal")).unwrap();
    for path in [
        "../prototype.source.json",
        "/etc/passwd",
        "scenes//home.svg",
        "scenes/%2e%2e/x",
        "scenes\\home.svg",
    ] {
        assert!(root.read(path, 1024, &control()).is_err());
    }
}
#[cfg(unix)]
#[test]
fn atomic_cancel_preserves_output() {
    let dir = temp();
    std::fs::write(dir.join("test.igproto"), b"original").unwrap();
    let root = ReadRoot::open(&dir).unwrap();
    let c = control();
    c.cancel();
    assert!(root.publish("test.igproto", b"changed", &c).is_err());
    assert_eq!(
        std::fs::read(dir.join("test.igproto")).unwrap(),
        b"original"
    );
    assert_eq!(std::fs::read_dir(&dir).unwrap().count(), 1);
    std::fs::remove_dir_all(dir).unwrap();
}
#[cfg(unix)]
#[test]
fn atomic_success_and_no_temporary_files() {
    let dir = temp();
    let root = ReadRoot::open(&dir).unwrap();
    root.publish("test.igproto", b"first", &control()).unwrap();
    root.publish("test.igproto", b"second", &control()).unwrap();
    assert_eq!(std::fs::read(dir.join("test.igproto")).unwrap(), b"second");
    assert_eq!(std::fs::read_dir(&dir).unwrap().count(), 1);
    std::fs::remove_dir_all(dir).unwrap();
}
#[cfg(unix)]
#[test]
fn output_symlink_rejected() {
    let dir = temp();
    let original = dir.join("original");
    std::fs::write(&original, b"original").unwrap();
    std::os::unix::fs::symlink(&original, dir.join("test.igproto")).unwrap();
    assert!(ReadRoot::open(&dir)
        .unwrap()
        .publish("test.igproto", b"changed", &control())
        .is_err());
    assert_eq!(std::fs::read(original).unwrap(), b"original");
    std::fs::remove_dir_all(dir).unwrap();
}
#[cfg(unix)]
#[test]
fn anchored_directory_resists_substitution() {
    let dir = temp();
    let child = dir.join("child");
    std::fs::create_dir(&child).unwrap();
    std::fs::write(child.join("a.txt"), b"approved").unwrap();
    let root = ReadRoot::open(&child).unwrap();
    std::fs::rename(&child, dir.join("moved")).unwrap();
    std::os::unix::fs::symlink(fixture("minimal"), &child).unwrap();
    assert_eq!(root.read("a.txt", 100, &control()).unwrap(), b"approved");
    std::fs::remove_dir_all(dir).unwrap();
}
#[cfg(unix)]
#[test]
fn hardlink_output_alias_rejected() {
    let dir = temp();
    std::fs::write(dir.join("source.json"), b"source").unwrap();
    std::fs::hard_link(dir.join("source.json"), dir.join("out.igproto")).unwrap();
    assert!(ReadRoot::open(&dir)
        .unwrap()
        .publish("out.igproto", b"changed", &control())
        .is_err());
    assert_eq!(std::fs::read(dir.join("source.json")).unwrap(), b"source");
    std::fs::remove_dir_all(dir).unwrap();
}
#[test]
fn source_binding_bounds_mismatch() {
    let mut m = Memory::load("minimal");
    m.source_edit(|s| s["scenes"][0]["visualBinding"]["bounds"]["width"] = 101.into());
    assert!(m.build().is_err());
}
#[test]
fn export_viewport_mismatch() {
    let mut m = Memory::load("minimal");
    m.scene_edit("home", |s| {
        s.replace("viewBox=\"0 0 100 100\"", "viewBox=\"0 0 101 100\"")
    });
    assert!(m.build().is_err());
}
#[test]
fn explicit_artboard_offset_normalized() {
    let mut m = Memory::load("minimal");
    m.source_edit(|s| s["scenes"][0]["visualBinding"]["bounds"]["x"] = 500.into());
    m.scene_edit("home", |s| {
        s.replace("viewBox=\"0 0 100 100\"", "viewBox=\"500 0 100 100\"")
    });
    let r = m.build().unwrap();
    let p = igproto_package::validate(&r.bytes).unwrap();
    let svg = std::str::from_utf8(p.member("scenes/home.svg").unwrap()).unwrap();
    assert!(svg.contains("viewBox=\"0 0 100 100\""));
    assert!(svg.contains("translate(-500 -0)"));
}
#[test]
fn overlay_close_inside_initially_revealed_state() {
    let mut m = Memory::load("representative");
    m.source_edit(|s| {
        s["scenes"][2]["localState"] =
            serde_json::json!([{"target":"close-panel","initialVisible":true}])
    });
    m.scene_edit("profile",|s|s.replace("<g data-prototype-id=\"close-button\">","<g data-prototype-id=\"close-panel\" display=\"none\"><g data-prototype-id=\"close-button\">").replace("</g><text","</g></g><text"));
    let r = m.build().unwrap();
    assert!(igproto_package::validate(&r.bytes).is_ok());
}
#[cfg(unix)]
fn copied_minimal() -> PathBuf {
    let dir = temp();
    std::fs::create_dir(dir.join("scenes")).unwrap();
    for file in [
        "prototype.source.json",
        "export.source.json",
        "export.warnings.txt",
        "visual.vectorcraft",
        "scenes/home.svg",
    ] {
        std::fs::copy(fixture("minimal").join(file), dir.join(file)).unwrap();
    }
    dir
}
#[cfg(unix)]
#[test]
fn unknown_export_warning_rejected() {
    let dir = copied_minimal();
    std::fs::write(
        dir.join("export.warnings.txt"),
        b"unknown rendering fallback",
    )
    .unwrap();
    let provider = SavedExports {
        authoring: ReadRoot::open(&dir).unwrap(),
        exports: ReadRoot::open(&dir).unwrap(),
    };
    let source = std::fs::read(dir.join("prototype.source.json")).unwrap();
    let e = compile(&source, &provider, &provider, &control()).unwrap_err();
    assert!(e.diagnostics[0].message.contains("export warnings"));
    std::fs::remove_dir_all(dir).unwrap();
}
#[cfg(unix)]
#[test]
fn stale_export_snapshot_rejected() {
    let dir = copied_minimal();
    let mut snapshot: serde_json::Value =
        serde_json::from_slice(&std::fs::read(dir.join("export.source.json")).unwrap()).unwrap();
    snapshot["visualSources"][0]["sha256"] = "0".repeat(64).into();
    std::fs::write(
        dir.join("export.source.json"),
        serde_json::to_vec(&snapshot).unwrap(),
    )
    .unwrap();
    let provider = SavedExports {
        authoring: ReadRoot::open(&dir).unwrap(),
        exports: ReadRoot::open(&dir).unwrap(),
    };
    let source = std::fs::read(dir.join("prototype.source.json")).unwrap();
    assert!(compile(&source, &provider, &provider, &control())
        .unwrap_err()
        .diagnostics[0]
        .message
        .contains("binding/digest changed"));
    std::fs::remove_dir_all(dir).unwrap();
}
#[cfg(unix)]
#[test]
fn opaque_visual_digest_streams_beyond_package_cap() {
    let dir = temp();
    let f = std::fs::File::create(dir.join("opaque.vectorcraft")).unwrap();
    f.set_len(33 * 1024 * 1024).unwrap();
    let hash = ReadRoot::open(&dir)
        .unwrap()
        .digest("opaque.vectorcraft", &control())
        .unwrap();
    assert_eq!(hash.len(), 64);
    let c = control();
    c.cancel();
    assert!(ReadRoot::open(&dir)
        .unwrap()
        .digest("opaque.vectorcraft", &c)
        .is_err());
    std::fs::remove_dir_all(dir).unwrap();
}
#[test]
fn embedded_asset_errors_never_dump_base64() {
    let mut m = Memory::load("representative");
    m.scene_edit("dashboard", |s| {
        s.replace(
            "images/checker.png",
            &format!("data:image/png;base64,{}", "QUFB".repeat(1000)),
        )
    });
    let e = m.build().unwrap_err();
    let serialized = serde_json::to_string(&e).unwrap();
    assert!(!serialized.contains("base64,"));
    assert!(!serialized.contains("QUFB"));
    assert_eq!(e.diagnostics[0].source_path, "scenes/dashboard.svg");
}
struct CountedAssets<'a> {
    memory: &'a Memory,
    calls: std::cell::Cell<usize>,
    change: bool,
}
impl AssetProvider for CountedAssets<'_> {
    fn png(&self, path: &str, c: &Control) -> Result<Vec<u8>> {
        let calls = self.calls.get();
        self.calls.set(calls + 1);
        if self.change && calls > 0 {
            Ok(b"changed".to_vec())
        } else {
            self.memory.png(path, c)
        }
    }
}
#[test]
fn repeated_png_references_share_one_snapshot() {
    let mut m = Memory::load("representative");
    m.scene_edit("dashboard",|s|s.replace("</svg>","<image width=\"2\" height=\"2\" href=\"images/checker.png\"/><image width=\"2\" height=\"2\" href=\"images/checker.png\"/></svg>"));
    let a = CountedAssets {
        memory: &m,
        calls: std::cell::Cell::new(0),
        change: false,
    };
    assert!(compile(&m.source, &m, &a, &control()).is_ok());
    assert_eq!(a.calls.get(), 2);
}
#[test]
fn changed_png_snapshot_rejected() {
    let m = Memory::load("representative");
    let a = CountedAssets {
        memory: &m,
        calls: std::cell::Cell::new(0),
        change: true,
    };
    let e = compile(&m.source, &m, &a, &control()).unwrap_err();
    assert!(e.diagnostics[0].message.contains("packaged PNG changed"));
}
#[cfg(unix)]
#[test]
fn canonical_unicode_visual_source_path_is_supported() {
    let dir = temp();
    let name = "café sketches.vectorcraft";
    let native = std::fs::read(fixture("minimal").join("visual.vectorcraft")).unwrap();
    std::fs::write(dir.join(name), &native).unwrap();
    let mut source = decode_source(&Memory::load("minimal").source).unwrap();
    source.visual_sources[0].path = name.into();
    assert!(validate_source(&source).is_valid());
    assert_eq!(
        ReadRoot::open(&dir)
            .unwrap()
            .digest(name, &control())
            .unwrap(),
        source.visual_sources[0].sha256
    );
    std::fs::remove_dir_all(dir).unwrap();
}
#[test]
fn unicode_local_png_name_is_normalized_to_ascii_digest() {
    let mut m = Memory::load("representative");
    let png = m.assets.remove("images/checker.png").unwrap();
    m.assets.insert("images/café photo.PNG".into(), png);
    m.scene_edit("dashboard", |s| {
        s.replace("images/checker.png", "images/café photo.PNG")
    });
    let r = m.build().unwrap();
    let p = igproto_package::validate(&r.bytes).unwrap();
    assert!(p.manifest().files.iter().all(|f| f.path.is_ascii()));
    assert!(
        !std::str::from_utf8(p.member("scenes/dashboard.svg").unwrap())
            .unwrap()
            .contains("café")
    );
}
#[cfg(unix)]
#[test]
fn unicode_output_filename_does_not_change_package_paths() {
    let dir = temp();
    ReadRoot::open(&dir)
        .unwrap()
        .publish("café contract.igproto", b"test", &control())
        .unwrap();
    assert_eq!(
        std::fs::read(dir.join("café contract.igproto")).unwrap(),
        b"test"
    );
    std::fs::remove_dir_all(dir).unwrap();
}
