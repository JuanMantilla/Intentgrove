fn main() {
    println!("cargo:rerun-if-env-changed=TAURI_CONFIG");
    println!("cargo:rerun-if-changed=../target/qa-dist/.qa-marker");
    println!("cargo:rerun-if-changed=../dist/.qa-marker");
    let mut config: serde_json::Value = serde_json::from_str(&std::fs::read_to_string("tauri.conf.json").unwrap()).unwrap();
    if let Ok(extra) = std::env::var("TAURI_CONFIG") {
        let extra: serde_json::Value = serde_json::from_str(&extra).expect("valid Tauri override");
        if let Some(id) = extra.get("identifier") { config["identifier"] = id.clone(); }
        if let Some(dist) = extra.pointer("/build/frontendDist") { config["build"]["frontendDist"] = dist.clone(); }
    }
    let qa = std::env::var_os("CARGO_FEATURE_ACCEPTANCE_HARNESS").is_some();
    let qa_id = config["identifier"] == "com.juanmantilla.markdownworkspace.qa";
    let dist = std::path::Path::new(config["build"]["frontendDist"].as_str().expect("local frontend"));
    let marker = std::fs::read_to_string(dist.join(".qa-marker")).unwrap_or_default();
    assert_eq!(qa, qa_id, "QA feature/identifier mismatch");
    assert_eq!(qa, marker == "F002A-acceptance-harness-v1", "QA feature/frontend mismatch");
    if !qa {
        fn reject_qa_assets(directory: &std::path::Path) {
            let Ok(entries) = std::fs::read_dir(directory) else { return; };
            for entry in entries {
                let path = entry.expect("frontend entry").path();
                if path.is_dir() { reject_qa_assets(&path); }
                else if matches!(path.extension().and_then(|s|s.to_str()), Some("js"|"html"|"json")) {
                    let bytes = std::fs::read(&path).expect("frontend asset");
                    for marker in [b"qa:snapshot-request".as_slice(), b"__F002A_FAULT", b"F002A-acceptance-harness-v1"] {
                        assert!(!bytes.windows(marker.len()).any(|v|v==marker), "QA code in production assets");
                    }
                }
            }
        }
        reject_qa_assets(dist);
    }
    if qa { assert_eq!(dist, std::path::Path::new("../target/qa-dist"), "QA frontend must be isolated"); }

    println!("cargo:rerun-if-changed=src/macos_quit.m");
    println!("cargo:rerun-if-changed=src/image_xpc_client.m");
    if std::env::var("CARGO_CFG_TARGET_OS").as_deref() == Ok("macos") {
        let output = std::path::PathBuf::from(std::env::var_os("OUT_DIR").expect("Cargo output directory"));
        let arch = match std::env::var("CARGO_CFG_TARGET_ARCH").as_deref() {
            Ok("aarch64") => "arm64",
            Ok("x86_64") => "x86_64",
            _ => panic!("Unsupported macOS architecture"),
        };
        let status = std::process::Command::new("xcrun")
            .args(["clang", "-arch", arch, "-fobjc-arc", "-fblocks", "-mmacosx-version-min=14.0", "-c", "src/macos_quit.m", "-o"])
            .arg(output.join("macos_quit.o")).status().expect("macOS compiler");
        assert!(status.success(), "macOS quit bridge compilation failed");
        let status = std::process::Command::new("xcrun").args(["ar", "crs"])
            .arg(output.join("libmd_quit.a")).arg(output.join("macos_quit.o"))
            .status().expect("macOS archiver");
        assert!(status.success(), "macOS quit bridge archive failed");
        println!("cargo:rustc-link-search=native={}", output.display());
        println!("cargo:rustc-link-lib=static=md_quit");
        println!("cargo:rustc-link-lib=framework=Cocoa");
        let status = std::process::Command::new("xcrun")
            .args(["clang", "-arch", arch, "-fobjc-arc", "-fblocks", "-mmacosx-version-min=14.0", "-c", "src/image_xpc_client.m", "-o"])
            .arg(output.join("image_xpc_client.o")).status().expect("macOS compiler");
        assert!(status.success(), "image XPC client compilation failed");
        let status = std::process::Command::new("xcrun").args(["ar", "crs"])
            .arg(output.join("libmd_image_client.a")).arg(output.join("image_xpc_client.o"))
            .status().expect("macOS archiver");
        assert!(status.success(), "image XPC client archive failed");
        println!("cargo:rustc-link-lib=static=md_image_client");
        println!("cargo:rustc-link-lib=framework=Foundation");
    }
    tauri_build::build()
}
