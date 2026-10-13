//! One bounded decoder for source, graph and manifest. Reject duplicates before maps collapse.
use crate::{limits, *};
use serde::{
    de::{self, DeserializeOwned, DeserializeSeed, MapAccess, SeqAccess, Visitor},
    Deserializer,
};
use serde_json::{Map, Number, Value};
use std::fmt;

struct Strict {
    depth: usize,
    path: String,
}
impl<'de> DeserializeSeed<'de> for Strict {
    type Value = Value;
    fn deserialize<D: Deserializer<'de>>(self, d: D) -> Result<Value, D::Error> {
        d.deserialize_any(self)
    }
}
impl<'de> Visitor<'de> for Strict {
    type Value = Value;
    fn expecting(&self, f: &mut fmt::Formatter) -> fmt::Result {
        f.write_str("strict JSON")
    }
    fn visit_bool<E: de::Error>(self, v: bool) -> Result<Value, E> {
        Ok(Value::Bool(v))
    }
    fn visit_i64<E: de::Error>(self, v: i64) -> Result<Value, E> {
        Ok(Value::Number(v.into()))
    }
    fn visit_u64<E: de::Error>(self, v: u64) -> Result<Value, E> {
        Ok(Value::Number(v.into()))
    }
    fn visit_f64<E: de::Error>(self, v: f64) -> Result<Value, E> {
        Number::from_f64(v)
            .map(Value::Number)
            .ok_or_else(|| E::custom("nonfinite number"))
    }
    fn visit_unit<E: de::Error>(self) -> Result<Value, E> {
        Err(E::custom(format!(
            "invalid_structure at {}: null is prohibited",
            self.path
        )))
    }
    fn visit_str<E: de::Error>(self, v: &str) -> Result<Value, E> {
        self.visit_string(v.into())
    }
    fn visit_string<E: de::Error>(self, v: String) -> Result<Value, E> {
        if v.chars().any(char::is_control) {
            return Err(E::custom(format!(
                "invalid_string at {}: control character",
                self.path
            )));
        }
        Ok(Value::String(v))
    }
    fn visit_seq<A: SeqAccess<'de>>(self, mut a: A) -> Result<Value, A::Error> {
        if self.depth >= limits::JSON_DEPTH {
            return Err(de::Error::custom(format!("json_depth at {}", self.path)));
        }
        let mut items = Vec::new();
        let cap = if self.path == "$.scenes" {
            Some(limits::SCENES)
        } else if self.path == "$.interactions" {
            Some(limits::INTERACTIONS)
        } else if self.path.ends_with(".localState") {
            Some(limits::STATE_PER_SCENE)
        } else {
            None
        };
        while let Some(v) = a.next_element_seed(Strict {
            depth: self.depth + 1,
            path: format!("{}[{}]", self.path, items.len()),
        })? {
            if cap.is_some_and(|cap| items.len() >= cap) {
                return Err(de::Error::custom(format!(
                    "limit_exceeded at {}: array exceeds V1 cardinality",
                    self.path
                )));
            }
            items.push(v);
        }
        Ok(Value::Array(items))
    }
    fn visit_map<A: MapAccess<'de>>(self, mut a: A) -> Result<Value, A::Error> {
        if self.depth >= limits::JSON_DEPTH {
            return Err(de::Error::custom(format!("json_depth at {}", self.path)));
        }
        let mut map = Map::new();
        while let Some(key) = a.next_key::<String>()? {
            let path = format!("{}.{}", self.path, key);
            if key.chars().any(char::is_control) {
                return Err(de::Error::custom(format!("invalid_string at {path}")));
            }
            if map.contains_key(&key) {
                return Err(de::Error::custom(format!("duplicate_key at {path}")));
            }
            let v = a.next_value_seed(Strict {
                depth: self.depth + 1,
                path,
            })?;
            map.insert(key, v);
        }
        Ok(Value::Object(map))
    }
}
fn strict(bytes: &[u8], cap: usize) -> Result<Value, Box<Diagnostic>> {
    if bytes.len() > cap {
        return Err(Diagnostic::error(
            Code::JsonLimit,
            Stage::Limit,
            "$",
            format!("JSON exceeds {cap} bytes"),
        ));
    }
    let mut d = serde_json::Deserializer::from_slice(bytes);
    let value = Strict {
        depth: 0,
        path: "$".into(),
    }
    .deserialize(&mut d)
    .map_err(json_error)?;
    d.end().map_err(json_error)?;
    Ok(value)
}
fn json_error(e: serde_json::Error) -> Box<Diagnostic> {
    let msg = e.to_string();
    let code = if msg.starts_with("duplicate_key") {
        Code::DuplicateKey
    } else if msg.starts_with("json_depth") {
        Code::JsonDepth
    } else if msg.starts_with("limit_exceeded") {
        Code::LimitExceeded
    } else if msg.starts_with("invalid_string") {
        Code::InvalidString
    } else if msg.starts_with("invalid_structure") {
        Code::InvalidStructure
    } else {
        Code::InvalidJson
    };
    let path = msg
        .split(" at ")
        .nth(1)
        .and_then(|p| p.split([' ', ':']).next())
        .unwrap_or("$");
    let stage = if matches!(code, Code::LimitExceeded | Code::JsonDepth) {
        Stage::Limit
    } else {
        Stage::Decode
    };
    let mut diagnostic = Diagnostic::error(code, stage, path, msg.clone());
    diagnostic.line = Some(e.line());
    diagnostic.column = Some(e.column());
    diagnostic
}
fn version(value: &Value, key: &str) -> Result<(), Box<Diagnostic>> {
    let path = format!("$.{key}");
    match value.get(key) {
        Some(Value::Number(n)) if n.is_u64() => {
            if n.as_u64() == Some(1) {
                Ok(())
            } else {
                Err(Diagnostic::error(
                    Code::UnsupportedVersion,
                    Stage::Decode,
                    path,
                    format!("unsupported {key} {n}; supported integer version is 1"),
                ))
            }
        }
        _ => Err(Diagnostic::error(
            Code::InvalidVersion,
            Stage::Decode,
            path,
            format!("{key} is required and must be an integer token"),
        )),
    }
}
fn typed<T: DeserializeOwned>(value: Value) -> Result<T, Box<Diagnostic>> {
    serde_path_to_error::deserialize(value).map_err(|e| {
        let message = e.inner().to_string();
        let code = if message.contains("invalid SceneId")
            || message.contains("invalid TargetId")
            || message.contains("invalid InteractionId")
            || message.contains("invalid SourceId")
            || message.contains("invalid PrototypeId")
        {
            Code::InvalidId
        } else if message.contains("DISSOLVE durationMs") {
            Code::InvalidTransition
        } else {
            Code::InvalidStructure
        };
        Diagnostic::error(code, Stage::Decode, format!("$.{}", e.path()), message)
    })
}
pub fn decode_source(bytes: &[u8]) -> Result<PrototypeSource, Box<Diagnostic>> {
    let v = strict(bytes, limits::SOURCE_BYTES)?;
    version(&v, "sourceVersion")?;
    typed(v)
}
pub fn decode_prototype(bytes: &[u8]) -> Result<Prototype, Box<Diagnostic>> {
    let v = strict(bytes, limits::GRAPH_BYTES)?;
    version(&v, "schemaVersion")?;
    typed(v)
}
pub fn decode_manifest(bytes: &[u8]) -> Result<Manifest, Box<Diagnostic>> {
    let v = strict(bytes, limits::MANIFEST_BYTES)?;
    if v.get("format") == Some(&Value::String("intentgrove-prototype".into()))
        && v.get("version") == Some(&serde_json::json!(1))
        && v.get("schemaVersion").is_none()
        && v.get("profile").is_none()
    {
        return Err(Diagnostic::error(Code::ExperimentalPackageUnsupported,Stage::Decode,"$","experimental POC manifest lacks production schemaVersion/profile; recompile source using production tooling"));
    }
    version(&v, "version")?;
    version(&v, "schemaVersion")?;
    typed(v)
}
/// Two spaces, LF, stable struct/member order, preserved author array order.
/// Does not save a file or certify semantic validity.
pub fn serialize_source(source: &PrototypeSource) -> Result<String, Box<Diagnostic>> {
    // serde_json serializes nonfinite floats as null; reject them before that can lose data.
    for (i, s) in source.scenes.iter().enumerate() {
        let b = &s.visual_binding.bounds;
        if ![b.x, b.y, b.width, b.height].iter().all(|v| v.is_finite()) {
            return Err(Diagnostic::error(
                Code::InvalidVisual,
                Stage::Model,
                format!("$.scenes[{i}].visualBinding.bounds"),
                "bounds must be finite",
            ));
        }
    }
    let json = serde_json::to_string_pretty(source).map_err(json_error)? + "\n";
    decode_source(json.as_bytes())?;
    Ok(json)
}
