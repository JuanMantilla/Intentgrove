//! Pure validation shared with the Windows adapter; no path normalization grants access.
use crate::scope::{AppError, AppResult};
pub(crate) fn segment(name: &str) -> AppResult<()> {
    let stem = name.split('.').next().unwrap_or("").to_ascii_uppercase();
    let reserved = matches!(
        stem.as_str(),
        "CON" | "PRN" | "AUX" | "NUL" | "CONIN$" | "CONOUT$"
    ) || ["COM", "LPT"].iter().any(|prefix| {
        stem.strip_prefix(prefix).is_some_and(|suffix| {
            matches!(
                suffix,
                "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "¹" | "²" | "³"
            )
        })
    });
    if name.is_empty()
        || name == "."
        || name == ".."
        || name.ends_with(['.', ' '])
        || name.chars().any(|c| c < ' ' || ":/\\<>\"|?*".contains(c))
        || reserved
        || name.encode_utf16().count() > 255
    {
        return Err(AppError::new(
            "invalid_path",
            "Unsupported Windows path component",
        ));
    }
    Ok(())
}
pub(crate) fn selected(path: &str) -> AppResult<(&str, Vec<String>)> {
    // std::fs::canonicalize produces a verbatim drive path on Windows. Accept
    // only that drive form; UNC, device objects and GLOBALROOT still fail.
    let path = path.strip_prefix("\\\\?\\").unwrap_or(path);
    let bytes = path.as_bytes();
    if bytes.len() < 3 || !bytes[0].is_ascii_alphabetic() || &bytes[1..3] != b":\\" {
        return Err(AppError::new(
            "unsupported_mount",
            "Select an absolute local NTFS drive path",
        ));
    }
    let raw_tail = &path[3..];
    // A drive root already includes its separator. Do not turn an additional
    // empty component into a valid root by removing the trailing separator.
    if raw_tail == "\\" {
        return Err(AppError::new(
            "invalid_path",
            "Empty Windows path component",
        ));
    }
    let tail = raw_tail.strip_suffix('\\').unwrap_or(raw_tail);
    let components: Vec<String> = if tail.is_empty() {
        vec![]
    } else {
        tail.split('\\').map(str::to_owned).collect()
    };
    if components.len() > 128 {
        return Err(AppError::new("invalid_path", "Path is too deep"));
    }
    for name in &components {
        segment(name)?;
    }
    Ok((&path[..3], components))
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn rejects_streams_devices_ambiguous_and_reserved_names() {
        for name in [
            "",
            ".",
            "..",
            "a:b",
            "a/b",
            "a\\b",
            "foo.",
            "foo ",
            "NUL.md",
            "com1",
            "LPT³.txt",
            "a\0b",
            "a*",
            "a\nb",
        ] {
            assert!(segment(name).is_err(), "{name:?}");
        }
        assert!(segment("café space.md").is_ok());
    }
    #[test]
    fn only_accepts_absolute_drive_paths_and_preserves_case_unicode() {
        for path in [
            "",
            "/tmp/fixture",
            "C:/fixture",
            "C:foo",
            "\\\\server\\share",
            "\\\\.\\pipe\\x",
            "C:\\a\\..\\x",
            "C:\\a:stream",
            "C:\\\\foo",
            "C:\\\\",
            "\\\\?\\UNC\\server\\share",
            "\\\\?\\GLOBALROOT\\Device\\HarddiskVolume1\\x",
            "\\\\?\\C:relative",
            "C:\\a\\.\\x",
            "C:\\a\\NUL.md",
            "C:\\a\\tail.\\x",
            "C:\\a\0b",
        ] {
            assert!(selected(path).is_err(), "{path:?}");
        }
        assert_eq!(
            selected("C:\\Café space\\Read.MD").unwrap().1,
            ["Café space", "Read.MD"]
        );
        assert_eq!(
            selected(r"\\?\c:\Café space\Read.MD").unwrap(),
            ("c:\\", vec!["Café space".into(), "Read.MD".into()])
        );
        assert!(selected("C:\\").unwrap().1.is_empty());
        assert!(selected(&format!("C:\\{}", "a\\".repeat(129))).is_err());
        assert!(selected(&format!("C:\\{}", "é".repeat(256))).is_err());
    }
}
