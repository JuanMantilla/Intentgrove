use igproto_model::*;
use serde_json::{json, Value};
use std::collections::BTreeMap;
const SOURCE: &[u8] =
    include_bytes!("../../../tests/fixtures/prototype/contracts/prototype.source.json");
const MINIMAL: &[u8] =
    include_bytes!("../../../tests/fixtures/prototype/contracts/minimal.source.json");
const GRAPH: &[u8] = include_bytes!("../../../tests/fixtures/prototype/contracts/prototype.json");
const MANIFEST: &[u8] = include_bytes!("../../../tests/fixtures/prototype/contracts/manifest.json");
fn source() -> PrototypeSource {
    decode_source(SOURCE).unwrap()
}
fn graph() -> Prototype {
    decode_prototype(GRAPH).unwrap()
}
fn edit(f: impl FnOnce(&mut Value)) -> Result<PrototypeSource, Box<Diagnostic>> {
    let mut v: Value = serde_json::from_slice(SOURCE).unwrap();
    f(&mut v);
    decode_source(&serde_json::to_vec(&v).unwrap())
}
fn record(id: &str) -> TargetRecord {
    TargetRecord {
        id: TargetId::new(id).unwrap(),
        kind: TargetKind::Group,
        ancestors: vec![],
        survived_sanitation: true,
        ancestor_display_none: false,
        ancestor_visibility_hidden: false,
        visibility_hidden: false,
        display_none: false,
    }
}
fn inventory() -> TargetInventory {
    let s = source();
    let mut scenes = BTreeMap::new();
    for scene in &s.scenes {
        let mut targets = vec![record(scene.visual_binding.root_target.as_str())];
        for b in s.interactions.iter().filter(|b| b.scene == scene.id) {
            targets.push(record(b.target.as_str()));
        }
        for state in &scene.local_state {
            targets.push(record(state.target.as_str()));
        }
        scenes.insert(scene.id.clone(), targets);
    }
    TargetInventory { scenes }
}
fn has(r: ValidationReport, code: Code) {
    assert!(!r.is_valid(), "{r:?}");
    assert!(r.diagnostics.iter().any(|d| d.code == code), "{r:?}");
}
fn scene(s: &str) -> SceneId {
    SceneId::new(s).unwrap()
}
fn target(s: &str) -> TargetId {
    TargetId::new(s).unwrap()
}
fn iid(s: &str) -> InteractionId {
    InteractionId::new(s).unwrap()
}

#[test]
fn minimal_source() {
    let s = decode_source(MINIMAL).unwrap();
    assert!(validate_source(&s).is_valid());
}
#[test]
fn full_v1_source() {
    let s = source();
    assert!(validate_source_with_inventory(&s, &inventory()).is_valid());
    assert_eq!(s.interactions.len(), 5);
}
#[test]
fn compiled_contract() {
    let p = graph();
    let v = validate(&p, &source().viewport, &inventory()).unwrap();
    assert_eq!(v.prototype(), &p);
}
#[test]
fn metadata_contract() {
    let m = decode_manifest(MANIFEST).unwrap();
    assert!(validate_manifest(&m, &graph(), false, false).is_valid());
}
#[test]
fn round_trip() {
    let s = source();
    let out = serialize_source(&s).unwrap();
    assert_eq!(s, decode_source(out.as_bytes()).unwrap());
    assert!(out.ends_with('\n'));
    assert!(out.contains("\n  \"sourceVersion\""));
    assert_eq!(
        out,
        serialize_source(&decode_source(out.as_bytes()).unwrap()).unwrap()
    );
}
#[test]
fn author_array_order_preserved() {
    let mut s = source();
    s.scenes.reverse();
    s.interactions.reverse();
    assert_eq!(
        s,
        decode_source(serialize_source(&s).unwrap().as_bytes()).unwrap()
    );
}
#[test]
fn malformed_json() {
    assert_eq!(decode_source(b"{").unwrap_err().code, Code::InvalidJson);
}
#[test]
fn trailing_json() {
    let mut b = SOURCE.to_vec();
    b.extend_from_slice(b" {}");
    assert_eq!(decode_source(&b).unwrap_err().code, Code::InvalidJson);
}
#[test]
fn bom_rejected() {
    let mut b = vec![0xef, 0xbb, 0xbf];
    b.extend_from_slice(SOURCE);
    assert_eq!(decode_source(&b).unwrap_err().code, Code::InvalidJson);
}
#[test]
fn invalid_utf8() {
    assert_eq!(
        decode_source(b"{\"title\":\"\xff\"}").unwrap_err().code,
        Code::InvalidJson
    );
}
#[test]
fn missing_required_fields() {
    for field in [
        "prototypeId",
        "viewport",
        "entry",
        "visualSources",
        "scenes",
        "interactions",
    ] {
        assert_eq!(
            edit(|v| {
                v.as_object_mut().unwrap().remove(field);
            })
            .unwrap_err()
            .code,
            Code::InvalidStructure
        );
    }
}
#[test]
fn unknown_fields_at_every_shape() {
    for path in [
        "",
        "/viewport",
        "/visualSources/0",
        "/scenes/0",
        "/scenes/0/visualBinding",
        "/scenes/0/visualBinding/bounds",
        "/scenes/0/localState/0",
        "/interactions/0",
        "/interactions/0/action",
        "/interactions/0/transition",
    ] {
        assert_eq!(
            edit(|v| {
                v.pointer_mut(path).unwrap()["unknown"] = json!(1);
            })
            .unwrap_err()
            .code,
            Code::InvalidStructure,
            "{path}"
        );
    }
}
#[test]
fn null_is_never_optional() {
    for path in [
        "/title",
        "/scenes/0/label",
        "/interactions/0/label",
        "/entry",
    ] {
        assert_eq!(
            edit(|v| {
                if path == "/scenes/0/label" {
                    v["scenes"][0]["label"] = Value::Null;
                } else {
                    *v.pointer_mut(path).unwrap() = Value::Null;
                }
            })
            .unwrap_err()
            .code,
            Code::InvalidStructure
        );
    }
}
#[test]
fn integer_version_tokens() {
    for token in ["1.0", "1e0", "true", "\"1\"", "-1", "null"] {
        let b = format!("{{\"sourceVersion\":{token}}}");
        let code = decode_source(b.as_bytes()).unwrap_err().code;
        assert!(
            matches!(code, Code::InvalidVersion | Code::InvalidStructure),
            "{token}: {code:?}"
        );
    }
}
#[test]
fn missing_version() {
    assert_eq!(decode_source(b"{}").unwrap_err().code, Code::InvalidVersion);
}
#[test]
fn unsupported_versions() {
    for n in [0, 2, 999] {
        assert_eq!(
            edit(|v| v["sourceVersion"] = json!(n)).unwrap_err().code,
            Code::UnsupportedVersion
        );
    }
}
#[test]
fn graph_version_rules() {
    for token in ["1.0", "\"1\"", "false"] {
        assert_eq!(
            decode_prototype(format!("{{\"schemaVersion\":{token}}}").as_bytes())
                .unwrap_err()
                .code,
            Code::InvalidVersion
        );
    }
    assert_eq!(
        decode_prototype(b"{\"schemaVersion\":2}").unwrap_err().code,
        Code::UnsupportedVersion
    );
}
#[test]
fn poc_rejected() {
    assert_eq!(
        decode_manifest(b"{\"format\":\"intentgrove-prototype\",\"version\":1}")
            .unwrap_err()
            .code,
        Code::ExperimentalPackageUnsupported
    );
}
#[test]
fn missing_manifest_discriminators() {
    let mut v: Value = serde_json::from_slice(MANIFEST).unwrap();
    v.as_object_mut().unwrap().remove("profile");
    assert_eq!(
        decode_manifest(&serde_json::to_vec(&v).unwrap())
            .unwrap_err()
            .code,
        Code::InvalidStructure
    );
}
#[test]
fn unsupported_manifest_versions_and_profile() {
    for key in ["version", "schemaVersion"] {
        let mut v: Value = serde_json::from_slice(MANIFEST).unwrap();
        v[key] = json!(2);
        assert_eq!(
            decode_manifest(&serde_json::to_vec(&v).unwrap())
                .unwrap_err()
                .code,
            Code::UnsupportedVersion
        );
    }
    let mut v: Value = serde_json::from_slice(MANIFEST).unwrap();
    v["profile"] = json!("future");
    assert_eq!(
        decode_manifest(&serde_json::to_vec(&v).unwrap())
            .unwrap_err()
            .code,
        Code::InvalidStructure
    );
}
#[test]
fn duplicate_keys() {
    for b in [
        b"{\"sourceVersion\":1,\"sourceVersion\":1}".as_slice(),
        b"{\"sourceVersion\":1,\"viewport\":{\"width\":1,\"width\":1}}",
    ] {
        assert_eq!(decode_source(b).unwrap_err().code, Code::DuplicateKey);
    }
}
#[test]
fn escaped_duplicate_keys() {
    assert_eq!(
        decode_source(br#"{"sourceVersion":1,"source\u0056ersion":1}"#)
            .unwrap_err()
            .code,
        Code::DuplicateKey
    );
}
#[test]
fn depth_boundary() {
    let b = format!("{}0{}", "[".repeat(32), "]".repeat(32));
    assert_ne!(
        decode_source(b.as_bytes()).unwrap_err().code,
        Code::JsonDepth
    );
    let b = format!("{}0{}", "[".repeat(33), "]".repeat(33));
    assert_eq!(
        decode_source(b.as_bytes()).unwrap_err().code,
        Code::JsonDepth
    );
}
#[test]
fn json_size_limits() {
    let mut bytes = SOURCE.to_vec();
    bytes.resize(limits::SOURCE_BYTES, b' ');
    assert!(decode_source(&bytes).is_ok());
    bytes.push(b' ');
    assert_eq!(decode_source(&bytes).unwrap_err().code, Code::JsonLimit);
    let b = vec![b' '; limits::GRAPH_BYTES + 1];
    assert_eq!(decode_prototype(&b).unwrap_err().code, Code::JsonLimit);
    let b = vec![b' '; limits::MANIFEST_BYTES + 1];
    assert_eq!(decode_manifest(&b).unwrap_err().code, Code::JsonLimit);
}
#[test]
fn controls_in_strings_and_keys() {
    assert_eq!(
        edit(|v| v["title"] = json!("bad\ntext")).unwrap_err().code,
        Code::InvalidString
    );
    assert_eq!(
        decode_source(br#"{"sourceVersion":1,"a\u0000":1}"#)
            .unwrap_err()
            .code,
        Code::InvalidString
    );
}
#[test]
fn valid_ids() {
    for id in [
        "a",
        "dashboard",
        "settings-button",
        "a--",
        "a0-",
        "abcdefghijklmnopqrstuvwxyz0123456789",
    ] {
        assert!(SceneId::new(id).is_ok());
        assert!(TargetId::new(id).is_ok());
        assert!(SourceId::new(id).is_ok());
        assert!(InteractionId::new(id).is_ok());
    }
    assert!(SceneId::new("a".repeat(64)).is_ok());
}
#[test]
fn invalid_ids() {
    for id in [
        "",
        "A",
        "0x",
        "-a",
        "a_b",
        "a.b",
        "a b",
        "á",
        "a/",
        &"a".repeat(65),
    ] {
        assert!(SceneId::new(id).is_err());
        assert!(TargetId::new(id).is_err());
    }
    let d = edit(|v| v["scenes"][0]["id"] = json!("Dashboard")).unwrap_err();
    assert_eq!(d.code, Code::InvalidId);
    assert!(d.source_path.contains("scenes[0].id"));
}
#[test]
fn uuid_rules() {
    assert!(PrototypeId::new("12345678-1234-1234-1234-123456789abc").is_ok());
    for s in [
        "12345678-1234-1234-1234-123456789ABC",
        "12345678123412341234123456789abc",
        "invalid",
    ] {
        assert!(PrototypeId::new(s).is_err());
    }
}
#[test]
fn duplicate_scene() {
    let mut s = source();
    s.scenes.push(s.scenes[0].clone());
    has(validate_source(&s), Code::DuplicateScene);
}
#[test]
fn duplicate_interaction() {
    let mut s = source();
    let mut b = s.interactions[0].clone();
    b.target = target("another");
    s.interactions.push(b);
    has(validate_source(&s), Code::DuplicateInteraction);
}
#[test]
fn duplicate_binding() {
    let mut s = source();
    let mut b = s.interactions[0].clone();
    b.id = iid("other");
    s.interactions.push(b);
    has(validate_source(&s), Code::DuplicateBinding);
}
#[test]
fn targets_are_scene_scoped() {
    let mut s = source();
    s.interactions[1].target = s.interactions[0].target.clone();
    assert!(validate_source(&s).is_valid());
    let a = TargetKey {
        scene: scene("dashboard"),
        target: target("button"),
    };
    let b = TargetKey {
        scene: scene("settings"),
        target: target("button"),
    };
    assert_ne!(a, b);
}
#[test]
fn entry_role_and_missing() {
    for id in ["missing", "profile"] {
        let mut s = source();
        s.entry = scene(id);
        has(validate_source(&s), Code::InvalidEntry);
    }
}
#[test]
fn missing_source_scene() {
    let mut s = source();
    s.interactions[0].scene = scene("missing");
    has(validate_source(&s), Code::MissingScene);
}
#[test]
fn missing_destination_diagnostic() {
    let mut s = source();
    s.interactions[0].action = Action::Navigate {
        scene: scene("missing"),
    };
    let r = validate_source(&s);
    let d = r
        .diagnostics
        .iter()
        .find(|d| d.code == Code::MissingScene)
        .unwrap();
    assert_eq!(d.scene, Some(scene("dashboard")));
    assert_eq!(d.target, Some(target("settings-button")));
    assert_eq!(d.related_identifier.as_deref(), Some("missing"));
    assert!(d
        .message
        .contains("scene `dashboard` interaction target `settings-button`"));
    assert!(d.source_path.contains("action.scene"));
    assert_eq!(d.stage, Stage::Reference);
}
#[test]
fn missing_overlay_destination() {
    let mut s = source();
    s.interactions[2].action = Action::OpenOverlay {
        scene: scene("missing"),
    };
    has(validate_source(&s), Code::MissingScene);
}
#[test]
fn role_restrictions() {
    for (index, action) in [
        (
            0,
            Action::Navigate {
                scene: scene("profile"),
            },
        ),
        (
            2,
            Action::OpenOverlay {
                scene: scene("settings"),
            },
        ),
        (3, Action::Back {}),
        (
            3,
            Action::OpenOverlay {
                scene: scene("profile"),
            },
        ),
        (0, Action::CloseOverlay {}),
    ] {
        let mut s = source();
        s.interactions[index].action = action;
        has(validate_source(&s), Code::InvalidActionContext);
    }
}
#[test]
fn self_navigation_rejected() {
    let mut s = source();
    s.interactions[0].action = Action::Navigate {
        scene: scene("dashboard"),
    };
    has(validate_source(&s), Code::InvalidActionContext);
}
#[test]
fn user_navigation_cycles_allowed() {
    let mut s = source();
    s.interactions[1].action = Action::Navigate {
        scene: scene("dashboard"),
    };
    assert!(validate_source(&s).is_valid());
}
#[test]
fn exact_action_payloads() {
    for a in [
        json!({"type":"BACK","scene":"settings"}),
        json!({"type":"CLOSE_OVERLAY","target":"menu"}),
        json!({"type":"NAVIGATE"}),
        json!({"type":"OPEN_OVERLAY","target":"menu"}),
        json!({"type":"TOGGLE","scene":"dashboard"}),
        json!({"type":"TOGGLE","target":"menu-panel","expression":"x"}),
        json!({"type":"SCRIPT","script":"bad"}),
    ] {
        assert!(edit(|v| v["interactions"][0]["action"] = a).is_err());
    }
}
#[test]
fn only_click() {
    for trigger in ["HOVER", "KEY", "click", "TIMER"] {
        assert!(edit(|v| v["interactions"][0]["trigger"] = json!(trigger)).is_err());
    }
}
#[test]
fn transition_exact_profile() {
    for n in [0, 99, 101, 1000] {
        assert_eq!(
            edit(|v| v["interactions"][0]["transition"]["durationMs"] = json!(n))
                .unwrap_err()
                .code,
            Code::InvalidTransition
        );
    }
    for t in [
        json!({"type":"DISSOLVE"}),
        json!({"type":"DISSOLVE","durationMs":100.0}),
        json!({"type":"DISSOLVE","durationMs":"100"}),
        json!({"type":"DISSOLVE","durationMs":100,"curve":"linear"}),
        json!({"type":"INSTANT","durationMs":100}),
        json!({"type":"SLIDE"}),
    ] {
        assert!(edit(|v| v["interactions"][0]["transition"] = t).is_err());
    }
}
#[test]
fn dissolve_only_navigation() {
    for i in 1..5 {
        let mut s = source();
        s.interactions[i].transition = Transition::DISSOLVE;
        has(validate_source(&s), Code::InvalidTransition);
    }
}
#[test]
fn state_boolean_strict() {
    for value in [json!(1), json!("false"), json!({"expression":"x"})] {
        assert!(edit(|v| v["scenes"][0]["localState"][0]["initialVisible"] = value).is_err());
    }
}
#[test]
fn duplicate_state() {
    let mut s = source();
    let state = s.scenes[0].local_state[0].clone();
    s.scenes[0].local_state.push(state);
    has(validate_source(&s), Code::DuplicateState);
}
#[test]
fn undeclared_toggle_state() {
    let mut s = source();
    s.interactions[4].action = Action::Toggle {
        target: target("missing"),
    };
    has(validate_source(&s), Code::MissingState);
}
#[test]
fn missing_state_array() {
    assert!(edit(|v| {
        v["scenes"][0].as_object_mut().unwrap().remove("localState");
    })
    .is_err());
}
#[test]
fn missing_state_target() {
    let mut inv = inventory();
    inv.scenes
        .get_mut(&scene("dashboard"))
        .unwrap()
        .retain(|t| t.id != target("menu-panel"));
    has(
        validate_source_with_inventory(&source(), &inv),
        Code::MissingTarget,
    );
}
#[test]
fn invalid_state_group() {
    let mut inv = inventory();
    inv.scenes
        .get_mut(&scene("dashboard"))
        .unwrap()
        .iter_mut()
        .find(|t| t.id == target("menu-panel"))
        .unwrap()
        .kind = TargetKind::Rendered;
    has(
        validate_source_with_inventory(&source(), &inv),
        Code::InvalidStateTarget,
    );
}
#[test]
fn state_groups_cannot_nest() {
    let mut s = source();
    s.scenes[0].local_state.push(VisibilityState {
        target: target("menu-button"),
        initial_visible: true,
    });
    let mut inv = inventory();
    inv.scenes
        .get_mut(&scene("dashboard"))
        .unwrap()
        .iter_mut()
        .find(|t| t.id == target("menu-button"))
        .unwrap()
        .ancestors
        .push(target("menu-panel"));
    has(validate_source_with_inventory(&s, &inv), Code::NestedState);
}
#[test]
fn authored_hidden_state_constraints() {
    for flag in 0..3 {
        let mut inv = inventory();
        let t = inv
            .scenes
            .get_mut(&scene("dashboard"))
            .unwrap()
            .iter_mut()
            .find(|t| t.id == target("menu-panel"))
            .unwrap();
        match flag {
            0 => t.visibility_hidden = true,
            1 => t.ancestor_display_none = true,
            _ => t.ancestor_visibility_hidden = true,
        };
        has(
            validate_source_with_inventory(&source(), &inv),
            Code::HiddenState,
        );
    }
    let mut inv = inventory();
    inv.scenes
        .get_mut(&scene("dashboard"))
        .unwrap()
        .iter_mut()
        .find(|t| t.id == target("menu-panel"))
        .unwrap()
        .display_none = true;
    assert!(validate_source_with_inventory(&source(), &inv).is_valid());
}
#[test]
fn duplicate_inventory_target() {
    let mut inv = inventory();
    let list = inv.scenes.get_mut(&scene("dashboard")).unwrap();
    list.push(list[0].clone());
    has(
        validate_source_with_inventory(&source(), &inv),
        Code::DuplicateTarget,
    );
}
#[test]
fn missing_binding_target() {
    let mut inv = inventory();
    inv.scenes
        .get_mut(&scene("dashboard"))
        .unwrap()
        .retain(|t| t.id != target("settings-button"));
    has(
        validate_source_with_inventory(&source(), &inv),
        Code::MissingTarget,
    );
}
#[test]
fn inventory_required_for_each_scene() {
    let mut inv = inventory();
    inv.scenes.remove(&scene("settings"));
    has(
        validate_source_with_inventory(&source(), &inv),
        Code::InvalidInventory,
    );
}
#[test]
fn definition_and_lost_markers_rejected() {
    for lost in [false, true] {
        let mut inv = inventory();
        let t = &mut inv.scenes.get_mut(&scene("dashboard")).unwrap()[1];
        if lost {
            t.survived_sanitation = false;
        } else {
            t.kind = TargetKind::Definition;
        }
        has(
            validate_source_with_inventory(&source(), &inv),
            Code::InvalidInventory,
        );
    }
}
#[test]
fn root_must_be_group_in_scene() {
    let mut s = source();
    s.scenes[0].visual_binding.root_target = target("scene-profile");
    has(
        validate_source_with_inventory(&s, &inventory()),
        Code::MissingTarget,
    );
}
#[test]
fn overlay_requires_close() {
    let mut s = source();
    s.interactions.remove(3);
    has(validate_source(&s), Code::OverlayCloseRequired);
}
#[test]
fn overlay_close_initially_reachable() {
    let mut inv = inventory();
    inv.scenes
        .get_mut(&scene("profile"))
        .unwrap()
        .iter_mut()
        .find(|t| t.id == target("close-button"))
        .unwrap()
        .display_none = true;
    has(
        validate_source_with_inventory(&source(), &inv),
        Code::OverlayCloseRequired,
    );
    let mut s = source();
    s.scenes[2].local_state.push(VisibilityState {
        target: target("close-button"),
        initial_visible: true,
    });
    assert!(validate_source_with_inventory(&s, &inv).is_valid());
    s.scenes[2].local_state[0].initial_visible = false;
    has(
        validate_source_with_inventory(&s, &inv),
        Code::OverlayCloseRequired,
    );
}
#[test]
fn overlay_capacity_is_one() {
    assert_eq!(limits::OVERLAY_CAPACITY, 1);
    assert_eq!(limits::NAVIGATION_CAPACITY, 32);
}
#[test]
fn viewport_boundaries() {
    for (w, h) in [(1, 1), (390, 844), (4096, 2048), (2048, 4096)] {
        assert!(validate_viewport(&Viewport {
            width: w,
            height: h
        })
        .is_valid());
    }
    for (w, h) in [
        (0, 1),
        (1, 0),
        (4097, 1),
        (4096, 2049),
        (4096, 4096),
        (u32::MAX, u32::MAX),
    ] {
        has(
            validate_viewport(&Viewport {
                width: w,
                height: h,
            }),
            Code::InvalidViewport,
        );
    }
}
#[test]
fn viewport_integer_only() {
    for n in [json!(1.0), json!(-1), json!("390"), json!(true)] {
        assert!(edit(|v| v["viewport"]["width"] = n).is_err());
    }
}
#[test]
fn visual_bounds_and_sources() {
    let mut s = source();
    s.scenes[0].visual_binding.bounds.width = 391.0;
    has(validate_source(&s), Code::InvalidVisual);
    s = source();
    s.scenes[0].visual_binding.source = SourceId::new("missing").unwrap();
    has(validate_source(&s), Code::MissingSource);
    s = source();
    s.visual_sources.push(s.visual_sources[0].clone());
    has(validate_source(&s), Code::InvalidVisual);
}
#[test]
fn nonfinite_bounds_never_serialize_as_null() {
    let mut s = source();
    s.scenes[0].visual_binding.bounds.x = f64::NAN;
    has(validate_source(&s), Code::InvalidVisual);
    assert_eq!(serialize_source(&s).unwrap_err().code, Code::InvalidVisual);
}
#[test]
fn source_paths_and_digest() {
    for path in [
        "../design",
        "/tmp/design",
        "a/./b",
        "a//b",
        "a\\b",
        "https://site/design",
    ] {
        let mut s = source();
        s.visual_sources[0].path = path.into();
        has(validate_source(&s), Code::InvalidVisual);
    }
    let mut s = source();
    s.visual_sources[0].sha256 = "A".repeat(64);
    has(validate_source(&s), Code::InvalidVisual);
}
#[test]
fn runtime_visual_path() {
    let mut p = graph();
    p.scenes[0].visual = "scenes/other.svg".into();
    has(
        validate_prototype(&p, &source().viewport),
        Code::InvalidVisual,
    );
}
#[test]
fn metadata_byte_limits() {
    let mut s = source();
    s.title = Some("é".repeat(100));
    assert!(validate_source(&s).is_valid());
    s.title = Some("é".repeat(101));
    has(validate_source(&s), Code::InvalidString);
    s = source();
    s.interactions[0].label = Some("".into());
    has(validate_source(&s), Code::InvalidString);
}
#[test]
fn scene_limit_boundary() {
    let mut s = decode_source(MINIMAL).unwrap();
    for i in 1..=31 {
        let mut c = s.scenes[0].clone();
        c.id = scene(&format!("s-{i}"));
        s.scenes.push(c);
    }
    assert!(validate_source(&s).is_valid());
    let mut c = s.scenes[0].clone();
    c.id = scene("too-many");
    s.scenes.push(c);
    has(validate_source(&s), Code::LimitExceeded);
}
#[test]
fn interaction_per_scene_boundary() {
    let mut s = decode_source(MINIMAL).unwrap();
    for i in 0..256 {
        s.interactions.push(Interaction {
            id: iid(&format!("b-{i}")),
            scene: s.entry.clone(),
            target: target(&format!("t-{i}")),
            trigger: Trigger::Click,
            action: Action::Back {},
            transition: Transition::INSTANT,
            label: Some("Back".into()),
        });
    }
    assert!(validate_source(&s).is_valid());
    let mut b = s.interactions[0].clone();
    b.id = iid("over");
    b.target = target("over");
    s.interactions.push(b);
    has(validate_source(&s), Code::LimitExceeded);
}
#[test]
fn interaction_total_boundary() {
    let mut s = decode_source(MINIMAL).unwrap();
    for j in 1..4 {
        let mut c = s.scenes[0].clone();
        c.id = scene(&format!("s-{j}"));
        s.scenes.push(c);
    }
    for j in 0..4 {
        for i in 0..256 {
            s.interactions.push(Interaction {
                id: iid(&format!("b-{j}-{i}")),
                scene: s.scenes[j].id.clone(),
                target: target(&format!("t-{i}")),
                trigger: Trigger::Click,
                action: Action::Back {},
                transition: Transition::INSTANT,
                label: Some("Back".into()),
            });
        }
    }
    assert!(validate_source(&s).is_valid());
    let mut b = s.interactions[0].clone();
    b.id = iid("over");
    b.target = target("over");
    s.interactions.push(b);
    has(validate_source(&s), Code::LimitExceeded);
}
#[test]
fn state_limits_boundary() {
    let mut s = decode_source(MINIMAL).unwrap();
    for j in 1..8 {
        let mut c = s.scenes[0].clone();
        c.id = scene(&format!("s-{j}"));
        s.scenes.push(c);
    }
    for c in &mut s.scenes {
        for i in 0..64 {
            c.local_state.push(VisibilityState {
                target: target(&format!("t-{i}")),
                initial_visible: false,
            });
        }
    }
    assert!(validate_source(&s).is_valid());
    s.scenes[0].local_state.push(VisibilityState {
        target: target("over"),
        initial_visible: false,
    });
    has(validate_source(&s), Code::LimitExceeded);
}
#[test]
fn inventory_limit_boundary() {
    let mut s = decode_source(MINIMAL).unwrap();
    let root = s.scenes[0].visual_binding.root_target.clone();
    let mut inv = TargetInventory::default();
    for j in 0..8 {
        if j > 0 {
            let mut c = s.scenes[0].clone();
            c.id = scene(&format!("s-{j}"));
            s.scenes.push(c);
        }
        let mut ts = vec![record(root.as_str())];
        for i in 1..1024 {
            ts.push(record(&format!("t-{i}")));
        }
        inv.scenes.insert(s.scenes[j].id.clone(), ts);
    }
    assert!(validate_source_with_inventory(&s, &inv).is_valid());
    inv.scenes.get_mut(&s.entry).unwrap().push(record("over"));
    has(
        validate_source_with_inventory(&s, &inv),
        Code::LimitExceeded,
    );
}
#[test]
fn capability_exact_set() {
    let mut m = decode_manifest(MANIFEST).unwrap();
    assert_eq!(
        m.capabilities,
        required_capabilities(&graph(), false, false)
    );
    m.capabilities.reverse();
    has(
        validate_manifest(&m, &graph(), false, false),
        Code::CapabilityMismatch,
    );
    m = decode_manifest(MANIFEST).unwrap();
    m.capabilities.push(Capability::SvgV1);
    has(
        validate_manifest(&m, &graph(), false, false),
        Code::CapabilityMismatch,
    );
}
#[test]
fn missing_label_and_unreachable_are_warnings() {
    let mut s = source();
    s.interactions[0].label = None;
    s.interactions[0].action = Action::Back {};
    s.interactions[0].transition = Transition::INSTANT;
    let r = validate_source(&s);
    assert!(r.is_valid());
    assert!(r
        .diagnostics
        .iter()
        .any(|d| d.code == Code::MissingLabel && d.severity == Severity::Warning));
    assert!(r
        .diagnostics
        .iter()
        .any(|d| d.code == Code::UnreachableScene && d.severity == Severity::Warning));
}
#[test]
fn generated_schema_drift() {
    for (name, contents) in generated_contracts() {
        let path = std::path::Path::new(env!("CARGO_MANIFEST_DIR"))
            .join("schema")
            .join(name);
        assert_eq!(
            std::fs::read_to_string(path).unwrap(),
            contents,
            "regenerate with cargo run -p igproto-model --example generate_schemas"
        );
    }
}
#[test]
fn diagnostics_are_machine_readable() {
    let d = decode_source(b"{\"sourceVersion\":2}").unwrap_err();
    let v = serde_json::to_value(d).unwrap();
    assert_eq!(v["code"], "unsupported_version");
    assert_eq!(v["severity"], "error");
    assert_eq!(v["sourcePath"], "$.sourceVersion");
}

#[test]
fn decoder_cardinality_limits() {
    for (path, cap) in [
        ("/scenes", limits::SCENES),
        ("/interactions", limits::INTERACTIONS),
        ("/scenes/0/localState", limits::STATE_PER_SCENE),
    ] {
        let d = edit(|v| {
            let a = v.pointer_mut(path).unwrap().as_array_mut().unwrap();
            let item = a[0].clone();
            a.resize(cap + 1, item);
        })
        .unwrap_err();
        assert_eq!(d.code, Code::LimitExceeded);
        assert_eq!(d.stage, Stage::Limit);
    }
}
#[test]
fn independent_aggregate_limits() {
    let mut s = decode_source(MINIMAL).unwrap();
    for j in 1..9 {
        let mut c = s.scenes[0].clone();
        c.id = scene(&format!("s-{j}"));
        s.scenes.push(c);
    }
    for c in &mut s.scenes[..8] {
        for i in 0..64 {
            c.local_state.push(VisibilityState {
                target: target(&format!("t-{i}")),
                initial_visible: false,
            });
        }
    }
    s.scenes[8].local_state.push(VisibilityState {
        target: target("extra"),
        initial_visible: false,
    });
    let r = validate_source(&s);
    assert!(r
        .diagnostics
        .iter()
        .any(|d| d.code == Code::LimitExceeded && d.source_path == "$.scenes.localState"));
    for c in &s.scenes[..4] {
        for i in 0..256 {
            s.interactions.push(Interaction {
                id: iid(&format!("b-{}-{i}", c.id)),
                scene: c.id.clone(),
                target: target(&format!("t-{i}")),
                trigger: Trigger::Click,
                action: Action::Back {},
                transition: Transition::INSTANT,
                label: Some("Back".into()),
            });
        }
    }
    s.interactions.push(Interaction {
        id: iid("extra"),
        scene: s.scenes[4].id.clone(),
        target: target("extra"),
        trigger: Trigger::Click,
        action: Action::Back {},
        transition: Transition::INSTANT,
        label: Some("Back".into()),
    });
    let r = validate_source(&s);
    assert!(r
        .diagnostics
        .iter()
        .any(|d| d.code == Code::LimitExceeded && d.source_path == "$.interactions"));
}
#[test]
fn independent_inventory_total_limit() {
    let mut s = decode_source(MINIMAL).unwrap();
    let mut inv = TargetInventory::default();
    for j in 0..9 {
        if j > 0 {
            let mut c = s.scenes[0].clone();
            c.id = scene(&format!("s-{j}"));
            s.scenes.push(c);
        }
        let c = &s.scenes[j];
        let mut records = vec![record(c.visual_binding.root_target.as_str())];
        if j < 8 {
            for i in 1..1024 {
                records.push(record(&format!("t-{i}")));
            }
        }
        inv.scenes.insert(c.id.clone(), records);
    }
    let r = validate_source_with_inventory(&s, &inv);
    assert!(r
        .diagnostics
        .iter()
        .any(|d| d.code == Code::LimitExceeded && d.source_path == "$.inventory"));
}
#[test]
fn all_integer_payloads_reject_float_tokens() {
    let mut m: Value = serde_json::from_slice(MANIFEST).unwrap();
    m["files"][0]["bytes"] = json!(1.0);
    assert_eq!(
        decode_manifest(&serde_json::to_vec(&m).unwrap())
            .unwrap_err()
            .code,
        Code::InvalidStructure
    );
}
#[test]
fn manifest_closed_shapes_and_metadata_bounds() {
    for path in ["", "/generator", "/files/0"] {
        let mut m: Value = serde_json::from_slice(MANIFEST).unwrap();
        m["generator"] = json!({"name":"test","version":"1"});
        m.pointer_mut(path).unwrap()["extra"] = json!(true);
        assert_eq!(
            decode_manifest(&serde_json::to_vec(&m).unwrap())
                .unwrap_err()
                .code,
            Code::InvalidStructure
        );
    }
    let mut m = decode_manifest(MANIFEST).unwrap();
    m.generator = Some(Generator {
        name: "a".repeat(80),
        version: "b".repeat(80),
    });
    assert!(validate_manifest(&m, &graph(), false, false).is_valid());
    m.generator.as_mut().unwrap().name.push('a');
    has(
        validate_manifest(&m, &graph(), false, false),
        Code::InvalidString,
    );
}
#[test]
fn inconsistent_inventory_ancestry() {
    let mut inv = inventory();
    let records = inv.scenes.get_mut(&scene("dashboard")).unwrap();
    let first = records[1].id.clone();
    let second = records[2].id.clone();
    records[1].ancestors.push(second);
    records[2].ancestors.push(first);
    has(
        validate_source_with_inventory(&source(), &inv),
        Code::InvalidInventory,
    );
}
#[test]
fn empty_graph_is_invalid() {
    let mut p = graph();
    p.scenes.clear();
    has(
        validate_prototype(&p, &source().viewport),
        Code::InvalidEntry,
    );
}
#[test]
fn source_and_compiled_semantic_diagnostics_match() {
    let mut s = source();
    s.interactions[0].action = Action::Navigate {
        scene: scene("missing"),
    };
    let mut p = graph();
    p.interactions = s.interactions.clone();
    let a = validate_source(&s).diagnostics;
    let b = validate_prototype(&p, &s.viewport).diagnostics;
    assert_eq!(a, b);
}
#[test]
fn diagnostics_and_schema_generation_are_deterministic() {
    assert_eq!(validate_source(&source()), validate_source(&source()));
    assert_eq!(generated_contracts(), generated_contracts());
}
#[test]
fn tagged_hidden_ancestor_blocks_state_reveal() {
    let mut inv = inventory();
    let records = inv.scenes.get_mut(&scene("dashboard")).unwrap();
    let root = source().scenes[0].visual_binding.root_target.clone();
    records
        .iter_mut()
        .find(|t| t.id == root)
        .unwrap()
        .display_none = true;
    records
        .iter_mut()
        .find(|t| t.id == target("menu-panel"))
        .unwrap()
        .ancestors = vec![root];
    has(
        validate_source_with_inventory(&source(), &inv),
        Code::HiddenState,
    );
}
#[test]
fn tagged_state_ancestor_display_is_overridden_for_close() {
    let mut s = source();
    s.scenes[2].local_state.push(VisibilityState {
        target: target("close-panel"),
        initial_visible: true,
    });
    let root = s.scenes[2].visual_binding.root_target.clone();
    let mut inv = inventory();
    let records = inv.scenes.get_mut(&scene("profile")).unwrap();
    let mut panel = record("close-panel");
    panel.display_none = true;
    panel.ancestors = vec![root.clone()];
    records.push(panel);
    records
        .iter_mut()
        .find(|t| t.id == target("close-button"))
        .unwrap()
        .ancestors = vec![target("close-panel"), root];
    assert!(validate_source_with_inventory(&s, &inv).is_valid());
}
