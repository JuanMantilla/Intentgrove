//! Shared incremental aggregate accounting before retaining compiler/reader content.
use crate::{
    diagnostics::{error, Result},
    limits,
};
use igproto_model::{Code, Stage};
#[derive(Default, Debug)]
pub struct PackageBudget {
    expanded: usize,
    svg: usize,
    elements: usize,
    paths: usize,
    png: usize,
    assets: usize,
    decoded: u64,
}
impl PackageBudget {
    pub fn scene(&mut self, bytes: usize, elements: usize, paths: usize) -> Result<()> {
        Self::add(&mut self.svg, bytes, limits::SVG_TOTAL, "scene bytes")?;
        Self::add(
            &mut self.elements,
            elements,
            limits::ELEMENTS_TOTAL,
            "elements",
        )?;
        Self::add(
            &mut self.paths,
            paths,
            limits::PATH_ITEMS_TOTAL,
            "path commands/point pairs",
        )?;
        Self::add(
            &mut self.expanded,
            bytes,
            limits::EXPANDED,
            "expanded bytes",
        )
    }
    pub fn png(&mut self, bytes: usize, decoded: u64) -> Result<()> {
        Self::add(&mut self.assets, 1, limits::ASSETS, "PNG count")?;
        Self::add(&mut self.png, bytes, limits::PNG_TOTAL, "encoded PNG bytes")?;
        self.decoded = self
            .decoded
            .checked_add(decoded)
            .ok_or_else(|| Self::fail("decoded PNG bytes"))?;
        if self.decoded > limits::DECODED {
            return Err(Self::fail("decoded PNG bytes"));
        }
        Self::add(
            &mut self.expanded,
            bytes,
            limits::EXPANDED,
            "expanded bytes",
        )
    }
    fn add(total: &mut usize, n: usize, max: usize, name: &str) -> Result<()> {
        *total = total.checked_add(n).ok_or_else(|| Self::fail(name))?;
        if *total > max {
            return Err(Self::fail(name));
        }
        Ok(())
    }
    fn fail(name: &str) -> crate::Report {
        error(
            Code::LimitExceeded,
            Stage::Limit,
            "package",
            format!("aggregate {name} budget exceeded"),
        )
    }
}
