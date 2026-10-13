use schemars::{json_schema, JsonSchema, Schema, SchemaGenerator};
use serde::{Deserialize, Deserializer, Serialize, Serializer};
use std::borrow::Cow;

/// Fixed integer duration; no programmable timing/curve payload.
#[derive(Debug, Clone, Copy, Default, PartialEq, Eq)]
pub struct DissolveDuration;
impl Serialize for DissolveDuration {
    fn serialize<S: Serializer>(&self, s: S) -> Result<S::Ok, S::Error> {
        s.serialize_u32(crate::limits::DISSOLVE_MS)
    }
}
impl<'de> Deserialize<'de> for DissolveDuration {
    fn deserialize<D: Deserializer<'de>>(d: D) -> Result<Self, D::Error> {
        if u32::deserialize(d)? == crate::limits::DISSOLVE_MS {
            Ok(Self)
        } else {
            Err(serde::de::Error::custom(
                "DISSOLVE durationMs must be exactly 100",
            ))
        }
    }
}
impl JsonSchema for DissolveDuration {
    fn schema_name() -> Cow<'static, str> {
        "DissolveDuration".into()
    }
    fn json_schema(_: &mut SchemaGenerator) -> Schema {
        json_schema!({"type":"integer","const":crate::limits::DISSOLVE_MS})
    }
}
/// DISSOLVE: prepared destination base opacity 0→1, linear; reduced motion is instant.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, JsonSchema)]
#[serde(tag = "type", deny_unknown_fields)]
pub enum Transition {
    #[serde(rename = "INSTANT")]
    Instant {},
    #[serde(rename = "DISSOLVE")]
    Dissolve {
        #[serde(rename = "durationMs")]
        duration_ms: DissolveDuration,
    },
}
impl Transition {
    pub const INSTANT: Self = Self::Instant {};
    pub const DISSOLVE: Self = Self::Dissolve {
        duration_ms: DissolveDuration,
    };
}
