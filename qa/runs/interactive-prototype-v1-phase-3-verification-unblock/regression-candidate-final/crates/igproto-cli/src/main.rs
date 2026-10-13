#![forbid(unsafe_code)]
mod args;
use args::Args;
use igproto_compiler::{files::ReadRoot, vectorcraft::SavedExports};
use igproto_model::{Code, Stage};
use igproto_package::{
    diagnostics::{check, error},
    Control, Result,
};
use serde_json::{json, Value};
use std::{path::Path, time::Duration};
fn relative<'a>(path: &'a Path, root: &Path) -> Result<&'a str> {
    let s = path
        .strip_prefix(root)
        .ok()
        .and_then(|p| p.to_str())
        .filter(|s| igproto_model::relative_source_path(s))
        .ok_or_else(|| {
            error(
                Code::InvalidVisual,
                Stage::Reference,
                "arguments",
                "path must be canonical and contained in the explicit root",
            )
        })?;
    Ok(s)
}
fn run(a: &Args) -> Result<Value> {
    let c = Control::new(Duration::from_secs(
        if matches!(a.command.as_str(), "compile" | "inventory") {
            300
        } else {
            5
        },
    ));
    let root_path = a.path("--read-root")?;
    let root = ReadRoot::open(root_path)?;
    let result = match a.command.as_str() {
        "validate-package" | "inspect" => {
            let path = relative(a.path("--package")?, root_path)?;
            let bytes = root.read(path, igproto_package::limits::ARCHIVE, &c)?;
            let p = igproto_package::validate_with_control(&bytes, &c)?;
            json!({"status":"PASS","sha256":p.sha256(),"manifest":p.manifest(),"diagnostics":p.warnings(),"truncated":p.warnings_truncated(),"targets":p.inventory().scenes.iter().map(|(s,ts)|(s.to_string(),ts.iter().map(|t|t.id.to_string()).collect::<Vec<_>>())).collect::<std::collections::BTreeMap<_,_>>()})
        }
        _ => {
            let path = relative(a.path("--source")?, root_path)?;
            let bytes = root.read(path, igproto_model::limits::SOURCE_BYTES, &c)?;
            let source = igproto_model::decode_source(&bytes)?;
            if a.command == "validate-source" {
                let warnings = check(igproto_model::validate_source(&source))?;
                json!({"status":"PASS","diagnostics":warnings,"sourceSha256":igproto_package::resources::sha256(&bytes)})
            } else {
                let adapter = SavedExports {
                    authoring: root,
                    exports: ReadRoot::open(a.path("--exports")?)?,
                };
                let compiled = igproto_compiler::compile(&bytes, &adapter, &adapter, &c)?;
                if a.deny_warnings && !compiled.warnings.is_empty() {
                    return Err(igproto_package::Report {
                        diagnostics: compiled.warnings,
                        truncated: compiled.warnings_truncated,
                    });
                }
                if a.command == "compile" {
                    let output = a.path("--output")?;
                    let write_root = a.path("--write-root")?;
                    let name = relative(output, write_root)?;
                    if output == a.path("--source")?
                        || source
                            .visual_sources
                            .iter()
                            .any(|s| root_path.join(&s.path) == output)
                    {
                        return Err(error(
                            Code::InvalidVisual,
                            Stage::Reference,
                            "output",
                            "source/output alias forbidden",
                        ));
                    }
                    let parent = output.parent().unwrap();
                    let leaf = output.file_name().and_then(|s| s.to_str()).unwrap_or("");
                    let writer = ReadRoot::open(parent)?;
                    // Explicit replacement applies only to a prior valid artifact of this prototype.
                    if let Ok(prior) = writer.read(leaf, igproto_package::limits::ARCHIVE, &c) {
                        let prior = igproto_package::validate_with_control(&prior, &c)?;
                        if prior.manifest().prototype_id != source.prototype_id {
                            return Err(error(
                                Code::InvalidVisual,
                                Stage::Reference,
                                "output",
                                "existing artifact belongs to another prototype",
                            ));
                        }
                    }
                    if adapter
                        .authoring
                        .read(path, igproto_model::limits::SOURCE_BYTES, &c)?
                        != bytes
                    {
                        return Err(error(
                            Code::InvalidVisual,
                            Stage::Reference,
                            "prototype.source.json",
                            "I/O/source conflict: behavior source changed during compilation",
                        ));
                    }
                    let _ = name;
                    writer.publish(leaf, &compiled.bytes, &c)?;
                }
                json!({"status":"PASS","sha256":compiled.sha256,"bytes":compiled.bytes.len(),"compilerVersion":compiled.compiler_version,"sourceVersion":1,"profile":"macos-svg-v1","diagnostics":compiled.warnings,"truncated":compiled.warnings_truncated,"provenance":compiled.provenance,"targets":compiled.inventory.scenes.iter().map(|(s,ts)|(s.to_string(),ts.iter().map(|t|t.id.to_string()).collect::<Vec<_>>())).collect::<std::collections::BTreeMap<_,_>>()})
            }
        }
    };
    if a.deny_warnings
        && result["diagnostics"]
            .as_array()
            .is_some_and(|d| !d.is_empty())
    {
        return Err(error(
            Code::InvalidInventory,
            Stage::Model,
            "diagnostics",
            "warnings denied",
        ));
    }
    Ok(result)
}
fn main() -> std::process::ExitCode {
    let input: Vec<_> = std::env::args().skip(1).collect();
    if input.is_empty() || matches!(input.first().map(String::as_str), Some("--help" | "-h")) {
        println!("{}", args::USAGE);
        return std::process::ExitCode::SUCCESS;
    }
    let json_requested = input.iter().any(|v| v == "--json");
    let a = match Args::parse(input) {
        Ok(a) => a,
        Err(e) => {
            if json_requested {
                let e = error(Code::InvalidStructure, Stage::Decode, "arguments", e);
                println!(
                    "{}",
                    json!({"status":"FAIL","diagnostics":e.diagnostics,"truncated":e.truncated})
                );
            } else {
                eprintln!("{e}");
            }
            return std::process::ExitCode::from(2);
        }
    };
    let (value, code) = match run(&a) {
        Ok(v) => (v, 0),
        Err(e) => {
            let code = if e
                .diagnostics
                .iter()
                .any(|d| d.message.contains("cancelled"))
            {
                130
            } else if e.diagnostics.iter().any(|d| {
                d.message.starts_with("I/O/source conflict") || d.message.contains("digest changed")
            }) {
                3
            } else {
                2
            };
            (
                json!({"status":"FAIL","diagnostics":e.diagnostics,"truncated":e.truncated}),
                code,
            )
        }
    };
    if a.json {
        println!("{}", serde_json::to_string(&value).unwrap());
    } else {
        println!("{}", serde_json::to_string_pretty(&value).unwrap());
    }
    std::process::ExitCode::from(code)
}
