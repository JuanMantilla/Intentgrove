use crate::{
    diagnostics::{error, Result},
    resources,
};
use igproto_model::{Code, Stage};
use std::{
    collections::BTreeMap,
    io::{Cursor, Write},
};
pub fn canonical_json<T: serde::Serialize>(value: &T) -> Result<Vec<u8>> {
    // serde_json without preserve_order uses lexicographic BTreeMap object keys.
    let v = serde_json::to_value(value).map_err(|_| {
        error(
            Code::InvalidStructure,
            Stage::Model,
            "json",
            "serialization failed",
        )
    })?;
    serde_json::to_vec(&v).map_err(|_| {
        error(
            Code::InvalidStructure,
            Stage::Model,
            "json",
            "serialization failed",
        )
    })
}
pub fn write(members: &BTreeMap<String, Vec<u8>>) -> Result<Vec<u8>> {
    let total = members.iter().try_fold(22usize, |sum, (name, b)| {
        if b.len() > resources::entry_limit(name)? {
            return Err(error(
                Code::LimitExceeded,
                Stage::Limit,
                name,
                "member exceeds budget",
            ));
        }
        sum.checked_add(b.len() + 76 + name.len() * 2)
            .ok_or_else(|| {
                error(
                    Code::LimitExceeded,
                    Stage::Limit,
                    "archive",
                    "archive size overflow",
                )
            })
    })?;
    if total > crate::limits::ARCHIVE || members.len() > crate::limits::ENTRIES {
        return Err(error(
            Code::LimitExceeded,
            Stage::Limit,
            "archive",
            "STORE output exceeds archive size/count budget",
        ));
    }
    let err = || {
        error(
            Code::InvalidStructure,
            Stage::Decode,
            "archive",
            "ZIP serialization failed",
        )
    };
    let mut zip = zip::ZipWriter::new(Cursor::new(Vec::new()));
    let options = zip::write::SimpleFileOptions::default()
        .compression_method(zip::CompressionMethod::Stored)
        .last_modified_time(zip::DateTime::default())
        .unix_permissions(0o644)
        .large_file(false);
    for (name, bytes) in members {
        resources::media(name)?;
        zip.start_file(name, options).map_err(|_| err())?;
        zip.write_all(bytes).map_err(|_| err())?;
    }
    Ok(zip.finish().map_err(|_| err())?.into_inner())
}
