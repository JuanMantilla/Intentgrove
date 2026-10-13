fn main() {
    println!("cargo:rerun-if-changed=bridge.m");
    let output = std::path::PathBuf::from(std::env::var_os("OUT_DIR").expect("Cargo output directory"));
    let arch = match std::env::var("CARGO_CFG_TARGET_ARCH").as_deref() {
        Ok("aarch64") => "arm64",
        Ok("x86_64") => "x86_64",
        _ => panic!("Unsupported macOS architecture"),
    };
    let status = std::process::Command::new("xcrun")
        .args(["clang", "-arch", arch, "-fobjc-arc", "-fblocks", "-mmacosx-version-min=14.0",
            "-c", "bridge.m", "-o"])
        .arg(output.join("image_xpc.o")).status().expect("macOS compiler");
    assert!(status.success(), "image XPC bridge compilation failed");
    let status = std::process::Command::new("xcrun").args(["ar", "crs"])
        .arg(output.join("libmd_image_xpc.a")).arg(output.join("image_xpc.o"))
        .status().expect("macOS archiver");
    assert!(status.success(), "image XPC bridge archive failed");
    println!("cargo:rustc-link-search=native={}", output.display());
    println!("cargo:rustc-link-lib=static=md_image_xpc");
    println!("cargo:rustc-link-lib=framework=Foundation");
    println!("cargo:rustc-link-lib=framework=ImageIO");
    println!("cargo:rustc-link-lib=framework=CoreGraphics");
}
