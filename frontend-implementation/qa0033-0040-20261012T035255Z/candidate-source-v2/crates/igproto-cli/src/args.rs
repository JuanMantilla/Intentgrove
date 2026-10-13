use std::collections::BTreeMap;
#[derive(Debug)]
pub struct Args {
    pub command: String,
    pub paths: BTreeMap<String, String>,
    pub json: bool,
    pub deny_warnings: bool,
}
pub const USAGE:&str="igproto <validate-source|inventory|compile|validate-package|inspect> --read-root ABS --source ABS [--exports ABS --write-root ABS --output ABS] [--json] [--deny-warnings]\nPackage commands use --package ABS instead of --source. Export SVGs reside in EXPORTS/scenes/<scene-id>.svg; relative PNGs resolve from EXPORTS.";
impl Args {
    pub fn parse(input: impl IntoIterator<Item = String>) -> std::result::Result<Self, String> {
        let mut it = input.into_iter();
        let command = it.next().ok_or(USAGE)?;
        if !matches!(
            command.as_str(),
            "validate-source" | "inventory" | "compile" | "validate-package" | "inspect"
        ) {
            return Err(USAGE.into());
        }
        let mut result = Self {
            command,
            paths: BTreeMap::new(),
            json: false,
            deny_warnings: false,
        };
        while let Some(a) = it.next() {
            match a.as_str() {
                "--json" => result.json = true,
                "--deny-warnings" => result.deny_warnings = true,
                "--read-root" | "--write-root" | "--source" | "--exports" | "--output"
                | "--package" => {
                    let value = it.next().ok_or_else(|| format!("missing value for {a}"))?;
                    if !std::path::Path::new(&value).is_absolute()
                        || result.paths.insert(a.clone(), value).is_some()
                    {
                        return Err(format!("{a} requires one absolute path"));
                    }
                }
                _ => return Err(format!("unknown option {a}")),
            }
        }
        Ok(result)
    }
    pub fn path(
        &self,
        key: &str,
    ) -> std::result::Result<&std::path::Path, igproto_package::Report> {
        self.paths
            .get(key)
            .map(std::path::Path::new)
            .ok_or_else(|| {
                igproto_package::diagnostics::error(
                    igproto_model::Code::InvalidStructure,
                    igproto_model::Stage::Decode,
                    "arguments",
                    format!("missing {key}"),
                )
            })
    }
}
