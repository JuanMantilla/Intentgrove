use std::{
    path::{Path, PathBuf},
    process::Command,
    sync::atomic::{AtomicU64, Ordering},
};
fn fixtures(name: &str) -> PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR"))
        .join("../../tests/fixtures/prototype/phase-2")
        .join(name)
        .canonicalize()
        .unwrap()
}
fn cli() -> Command {
    Command::new(env!("CARGO_BIN_EXE_igproto"))
}
fn temp() -> PathBuf {
    static N: AtomicU64 = AtomicU64::new(0);
    let p = std::env::temp_dir().canonicalize().unwrap().join(format!(
        "igproto-cli-test-{}-{}",
        std::process::id(),
        N.fetch_add(1, Ordering::Relaxed)
    ));
    std::fs::create_dir(&p).unwrap();
    p
}
fn build(output: &Path, tz: &str) -> std::process::Output {
    let root = fixtures("representative");
    cli()
        .env("TZ", tz)
        .args(["compile", "--json", "--deny-warnings", "--source"])
        .arg(root.join("prototype.source.json"))
        .arg("--read-root")
        .arg(&root)
        .arg("--exports")
        .arg(&root)
        .arg("--write-root")
        .arg(output.parent().unwrap())
        .arg("--output")
        .arg(output)
        .output()
        .unwrap()
}
#[test]
fn cli_compile_validate_inspect_and_repeat_across_roots() {
    let a = temp();
    let b = temp();
    let out_a = a.join("contract.igproto");
    let out_b = b.join("contract.igproto");
    for (out, tz) in [(&out_a, "America/Bogota"), (&out_b, "Asia/Tokyo")] {
        let r = build(out, tz);
        assert!(
            r.status.success(),
            "{} {}",
            String::from_utf8_lossy(&r.stdout),
            String::from_utf8_lossy(&r.stderr)
        );
        let v: serde_json::Value = serde_json::from_slice(&r.stdout).unwrap();
        assert_eq!(v["status"], "PASS");
        assert!(v["diagnostics"].as_array().unwrap().is_empty());
        for command in ["validate-package", "inspect"] {
            let r = cli()
                .args([command, "--json", "--package"])
                .arg(out)
                .arg("--read-root")
                .arg(out.parent().unwrap())
                .output()
                .unwrap();
            assert!(r.status.success(), "{}", String::from_utf8_lossy(&r.stdout));
        }
    }
    assert_eq!(
        std::fs::read(&out_a).unwrap(),
        std::fs::read(&out_b).unwrap()
    );
    let before = std::fs::read(&out_a).unwrap();
    assert!(build(&out_a, "UTC").status.success());
    assert_eq!(before, std::fs::read(&out_a).unwrap());
    std::fs::remove_dir_all(a).unwrap();
    std::fs::remove_dir_all(b).unwrap();
}
#[test]
fn cli_source_and_inventory() {
    let root = fixtures("minimal");
    for command in ["validate-source", "inventory"] {
        let r = cli()
            .args([command, "--json", "--source"])
            .arg(root.join("prototype.source.json"))
            .arg("--read-root")
            .arg(&root)
            .arg("--exports")
            .arg(&root)
            .output()
            .unwrap();
        assert!(r.status.success(), "{}", String::from_utf8_lossy(&r.stdout));
    }
}
#[test]
fn cli_invalid_package_exit_2() {
    let root = temp();
    let path = root.join("bad.igproto");
    std::fs::write(&path, b"not zip").unwrap();
    let r = cli()
        .args(["validate-package", "--json", "--read-root"])
        .arg(&root)
        .arg("--package")
        .arg(path)
        .output()
        .unwrap();
    assert_eq!(r.status.code(), Some(2));
    let v: serde_json::Value = serde_json::from_slice(&r.stdout).unwrap();
    assert_eq!(v["status"], "FAIL");
    assert!(!v["diagnostics"].as_array().unwrap().is_empty());
    std::fs::remove_dir_all(root).unwrap();
}
#[test]
fn cli_missing_source_exit_3() {
    let root = temp();
    let r = cli()
        .args(["validate-source", "--json", "--read-root"])
        .arg(&root)
        .arg("--source")
        .arg(root.join("missing.json"))
        .output()
        .unwrap();
    assert_eq!(r.status.code(), Some(3));
    std::fs::remove_dir_all(root).unwrap();
}
#[test]
fn cli_outside_write_root() {
    let root = temp();
    let fixtures = fixtures("minimal");
    let r = cli()
        .args(["compile", "--json", "--source"])
        .arg(fixtures.join("prototype.source.json"))
        .arg("--read-root")
        .arg(&fixtures)
        .arg("--exports")
        .arg(&fixtures)
        .arg("--write-root")
        .arg(&root)
        .arg("--output")
        .arg(root.parent().unwrap().join("escape.igproto"))
        .output()
        .unwrap();
    assert_eq!(r.status.code(), Some(2));
    assert_eq!(std::fs::read_dir(&root).unwrap().count(), 0);
    std::fs::remove_dir_all(root).unwrap();
}
#[test]
fn cli_preserves_unrelated_output() {
    let root = temp();
    let path = root.join("contract.igproto");
    std::fs::write(&path, b"unrelated user bytes").unwrap();
    let r = build(&path, "UTC");
    assert!(!r.status.success());
    assert_eq!(std::fs::read(&path).unwrap(), b"unrelated user bytes");
    assert_eq!(std::fs::read_dir(&root).unwrap().count(), 1);
    std::fs::remove_dir_all(root).unwrap();
}
#[cfg(unix)]
#[test]
fn cli_output_symlink() {
    let root = temp();
    let original = root.join("original");
    let output = root.join("contract.igproto");
    std::fs::write(&original, b"original").unwrap();
    std::os::unix::fs::symlink(&original, &output).unwrap();
    assert!(!build(&output, "UTC").status.success());
    assert_eq!(std::fs::read(&original).unwrap(), b"original");
    std::fs::remove_dir_all(root).unwrap();
}
#[test]
fn cli_relative_path_rejected() {
    let r = cli()
        .args(["validate-source", "--read-root", "relative"])
        .output()
        .unwrap();
    assert_eq!(r.status.code(), Some(2));
}
#[test]
fn cli_unknown_option() {
    assert_eq!(
        cli()
            .args(["compile", "--run-player"])
            .output()
            .unwrap()
            .status
            .code(),
        Some(2)
    );
}
#[test]
fn cli_duplicate_path_option() {
    assert_eq!(
        cli()
            .args([
                "compile",
                "--read-root",
                "/private",
                "--read-root",
                "/private"
            ])
            .output()
            .unwrap()
            .status
            .code(),
        Some(2)
    );
}
#[test]
fn cli_help() {
    assert!(cli().arg("--help").output().unwrap().status.success());
}
#[test]
fn cli_json_argument_failure() {
    let r = cli()
        .args(["compile", "--json", "--unknown"])
        .output()
        .unwrap();
    assert_eq!(r.status.code(), Some(2));
    let v: serde_json::Value = serde_json::from_slice(&r.stdout).unwrap();
    assert_eq!(v["status"], "FAIL");
}
