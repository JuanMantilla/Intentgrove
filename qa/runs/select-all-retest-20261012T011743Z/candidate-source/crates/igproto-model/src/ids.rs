use crate::{
    diagnostic::{Code, Diagnostic, Stage},
    limits,
};
use schemars::{json_schema, JsonSchema, Schema, SchemaGenerator};
use serde::{Deserialize, Deserializer, Serialize};
use std::{borrow::Cow, fmt};

fn valid_id(s: &str) -> bool {
    !s.is_empty()
        && s.len() <= limits::ID_BYTES
        && s.as_bytes()[0].is_ascii_lowercase()
        && s.bytes()
            .all(|b| b.is_ascii_lowercase() || b.is_ascii_digit() || b == b'-')
}
fn valid_uuid(s: &str) -> bool {
    s.len() == 36
        && s.bytes().enumerate().all(|(i, b)| {
            if [8, 13, 18, 23].contains(&i) {
                b == b'-'
            } else {
                b.is_ascii_digit() || (b'a'..=b'f').contains(&b)
            }
        })
}
macro_rules! identifier {
    ($name:ident, $check:ident, $pattern:expr) => {
        #[derive(Debug, Clone, PartialEq, Eq, PartialOrd, Ord, Hash, Serialize)]
        #[serde(transparent)]
        pub struct $name(String);
        impl $name {
            pub fn new(value: impl Into<String>) -> Result<Self, Box<Diagnostic>> {
                let value = value.into();
                if $check(&value) { Ok(Self(value)) } else { Err(Diagnostic::error(Code::InvalidId, Stage::Model, "$", format!("invalid {}; expected {}", stringify!($name), $pattern))) }
            }
            pub fn as_str(&self) -> &str { &self.0 }
        }
        impl fmt::Display for $name {
            fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result { f.write_str(&self.0) }
        }
        impl<'de> Deserialize<'de> for $name {
            fn deserialize<D: Deserializer<'de>>(d: D) -> Result<Self,D::Error> {
                Self::new(String::deserialize(d)?).map_err(serde::de::Error::custom)
            }
        }
        impl JsonSchema for $name {
            fn schema_name() -> Cow<'static,str> { stringify!($name).into() }
            fn json_schema(_: &mut SchemaGenerator) -> Schema { json_schema!({"type":"string","pattern":$pattern}) }
        }
    }
}
identifier!(SceneId, valid_id, limits::ID_PATTERN);
identifier!(TargetId, valid_id, limits::ID_PATTERN);
identifier!(InteractionId, valid_id, limits::ID_PATTERN);
identifier!(SourceId, valid_id, limits::ID_PATTERN);
identifier!(
    PrototypeId,
    valid_uuid,
    "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"
);

/// Target identity always includes scene scope. Visibility state uses this same key.
#[derive(Debug, Clone, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub struct TargetKey {
    pub scene: SceneId,
    pub target: TargetId,
}
