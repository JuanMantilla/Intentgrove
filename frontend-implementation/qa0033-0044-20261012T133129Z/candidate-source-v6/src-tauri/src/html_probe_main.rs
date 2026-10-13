#[cfg(target_os = "macos")]
fn main() {
    md_reader_lib::probe_run();
}
#[cfg(not(target_os = "macos"))]
fn main() {
    panic!("Native probe currently requires macOS");
}
