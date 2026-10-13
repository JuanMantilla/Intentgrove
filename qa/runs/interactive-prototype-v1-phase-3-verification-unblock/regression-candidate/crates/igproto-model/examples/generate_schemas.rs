fn main() -> Result<(), Box<dyn std::error::Error>> {
    let dir = std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("schema");
    for (name, contents) in igproto_model::generated_contracts() {
        std::fs::write(dir.join(name), contents)?;
    }
    Ok(())
}
