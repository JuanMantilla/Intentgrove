//! F005-D: native consent only; never initialize workspace for the private CLI.
const ENABLED: bool = !cfg!(any(debug_assertions, feature = "acceptance-harness", feature = "html-native-probe", feature = "settings-contract-tests"));
#[cfg(target_os = "macos")]
extern "C" {
    fn ig_default_markdown_cli(enabled: bool) -> i32;
    fn ig_default_markdown_update(window: *mut std::ffi::c_void, ready: bool, spanish: bool, enabled: bool);
}
pub fn consent_only(args: &[String]) -> Option<i32> {
    if !args.iter().any(|arg| arg == "--request-default-markdown") { return None; }
    if args.len() != 1 || args[0] != "--request-default-markdown" { return Some(4); }
    #[cfg(target_os = "macos")]
    return Some(unsafe { ig_default_markdown_cli(ENABLED) });
    #[cfg(not(target_os = "macos"))]
    Some(4)
}
#[cfg(target_os = "macos")]
pub fn update(window: &tauri::WebviewWindow, ready: bool, spanish: bool) {
    if !ENABLED || window.label() != "main" { return; }
    let window = window.clone();
    let handle = window.app_handle().clone();
    let _ = handle.run_on_main_thread(move || {
        if let Ok(pointer) = window.ns_window() {
            unsafe { ig_default_markdown_update(pointer, ready, spanish, ENABLED); }
        }
    });
}
#[cfg(target_os = "macos")]
use tauri::Manager;
#[cfg(test)]
mod tests {
    use super::*;
    #[test] fn private_mode_rejects_extra_paths_without_workspace() {
        assert_eq!(consent_only(&["--request-default-markdown".into(), "file.md".into()]), Some(4));
        assert_eq!(consent_only(&["file.md".into()]), None);
        assert_eq!(consent_only(&["--request-default-markdown".into()]), Some(4));
        assert!(!ENABLED);
    }
}
