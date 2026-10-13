use igproto_model::{Code, Diagnostic, Severity, Stage, ValidationReport};
use serde::Serialize;
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Report {
    pub diagnostics: Vec<Diagnostic>,
    pub truncated: usize,
}
pub type Result<T> = std::result::Result<T, Report>;
pub fn error(code: Code, stage: Stage, member: &str, message: impl Into<String>) -> Report {
    let mut message = message.into();
    if message.len() > 1024 {
        let mut end = 1024;
        while !message.is_char_boundary(end) {
            end -= 1;
        }
        message.truncate(end);
    }
    Report {
        diagnostics: vec![Diagnostic {
            code,
            severity: Severity::Error,
            stage,
            source_path: member.chars().take(160).collect(),
            message,
            scene: None,
            target: None,
            interaction: None,
            related_identifier: None,
            line: None,
            column: None,
        }],
        truncated: 0,
    }
}
fn bounded(mut d: Diagnostic) -> Diagnostic {
    if d.message.len() > 1024 {
        d.message = "model rejected input; oversized diagnostic text omitted".into();
    }
    if d.source_path.len() > 1024 {
        d.source_path = "$".into();
    }
    d
}
impl From<ValidationReport> for Report {
    fn from(r: ValidationReport) -> Self {
        let mut diagnostics: Vec<_> = r.diagnostics.into_iter().map(bounded).collect();
        let truncated = diagnostics.len().saturating_sub(crate::limits::DIAGNOSTICS);
        diagnostics.truncate(crate::limits::DIAGNOSTICS);
        Self {
            diagnostics,
            truncated,
        }
    }
}
impl From<Box<Diagnostic>> for Report {
    fn from(d: Box<Diagnostic>) -> Self {
        Self {
            diagnostics: vec![bounded(*d)],
            truncated: 0,
        }
    }
}
pub fn check(r: ValidationReport) -> Result<Vec<Diagnostic>> {
    if r.is_valid() {
        Ok(r.diagnostics)
    } else {
        Err(r.into())
    }
}
impl std::fmt::Display for Report {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        for d in &self.diagnostics {
            writeln!(f, "{d}")?;
        }
        Ok(())
    }
}
impl std::error::Error for Report {}
