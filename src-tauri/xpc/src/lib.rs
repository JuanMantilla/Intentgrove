use resvg::{tiny_skia, usvg};

unsafe extern "C" {
    fn md_image_xpc_main();
}

fn safe_css(value: &str) -> bool {
    let lower = value.to_ascii_lowercase();
    if lower.contains("@import") || lower.contains("expression(")
        || lower.contains("data:") || lower.contains("http:") || lower.contains("https:")
        || lower.contains("file:") {
        return false;
    }
    let mut rest = lower.as_str();
    while let Some(start) = rest.find("url(") {
        rest = &rest[start + 4..];
        let Some(end) = rest.find(')') else { return false };
        let reference = rest[..end].trim();
        let reference = match (reference.as_bytes().first(), reference.as_bytes().last()) {
            (Some(b'\''), Some(b'\'')) | (Some(b'"'), Some(b'"')) if reference.len() >= 2 =>
                &reference[1..reference.len() - 1],
            _ => reference,
        };
        if !reference.starts_with('#')
            || !reference[1..].chars().all(|c| c.is_ascii_alphanumeric() || "_-:.".contains(c)) {
            return false;
        }
        rest = &rest[end + 1..];
    }
    true
}

fn validate_svg(data: &[u8]) -> Result<(), ()> {
    let source = std::str::from_utf8(data).map_err(|_| ())?;
    let document = roxmltree::Document::parse_with_options(source,
        roxmltree::ParsingOptions { allow_dtd: false, ..Default::default() }).map_err(|_| ())?;
    if document.root_element().tag_name().name() != "svg" { return Err(()) }
    let mut count = 0usize;
    for node in document.descendants() {
        count += 1;
        if count > 50_000 || node.ancestors().count() > 64 { return Err(()) }
        if node.is_text() {
            let text = node.text().ok_or(())?;
            if text.len() > 65_536 { return Err(()) }
            if node.parent_element().is_some_and(|parent| parent.tag_name().name() == "style")
                && !safe_css(text) { return Err(()) }
        }
        if !node.is_element() { continue }
        let name = node.tag_name().name().to_ascii_lowercase();
        if ["script", "foreignobject", "image", "a", "iframe", "object", "embed", "audio", "video",
            "animate", "animatemotion", "animatetransform", "set"].contains(&name.as_str()) {
            return Err(());
        }
        for attribute in node.attributes() {
            let attr = attribute.name().to_ascii_lowercase();
            let value = attribute.value();
            if attr.starts_with("on") || !safe_css(value) { return Err(()) }
            if attr == "href" && (!value.starts_with('#') || value.len() < 2) { return Err(()) }
        }
    }
    Ok(())
}

#[derive(Debug)]
enum SvgError { Unsafe, ResponseLimit }

fn raster_svg(data: &[u8], max_dimension: u32) -> Result<(Vec<u8>, u32, u32), SvgError> {
    let tree = parse_svg(data).map_err(|_| SvgError::Unsafe)?;
    let width = tree.size().width().ceil() as u32;
    let height = tree.size().height().ceil() as u32;
    if width == 0 || height == 0 || (width as u64) * (height as u64) > 40_000_000 {
        return Err(SvgError::Unsafe);
    }
    let scale = (max_dimension.clamp(1, 4096) as f32 / width.max(height) as f32).min(1.0);
    let output_width = ((width as f32 * scale).ceil() as u32).max(1);
    let output_height = ((height as f32 * scale).ceil() as u32).max(1);
    let mut pixmap = tiny_skia::Pixmap::new(output_width, output_height).ok_or(SvgError::Unsafe)?;
    resvg::render(&tree, tiny_skia::Transform::from_scale(scale, scale), &mut pixmap.as_mut());
    let png = pixmap.encode_png().map_err(|_| SvgError::Unsafe)?;
    if png.len() > 8 * 1024 * 1024 { return Err(SvgError::ResponseLimit) }
    Ok((png, width, height))
}

fn parse_svg(data: &[u8]) -> Result<usvg::Tree, ()> {
    validate_svg(data)?;
    let mut options = usvg::Options::default();
    options.resources_dir = None;
    options.image_href_resolver = usvg::ImageHrefResolver {
        resolve_data: Box::new(|_, _, _| None),
        resolve_string: Box::new(|_, _| None),
    };
    options.font_family = "Roboto".to_string();
    options.fontdb_mut().load_font_data(include_bytes!("../../../src/assets/fonts/Roboto[wdth,wght].ttf").to_vec());
    options.fontdb_mut().load_font_data(include_bytes!("../../../src/assets/fonts/RobotoMono[wght].ttf").to_vec());
    options.fontdb_mut().load_font_data(include_bytes!("../../../src/assets/fonts/NotoSansSymbols2-Regular.ttf").to_vec());
    options.fontdb_mut().load_font_data(include_bytes!("../../../src/assets/fonts/NotoSansSymbols[wght].ttf").to_vec());
    options.fontdb_mut().set_serif_family("Roboto");
    options.fontdb_mut().set_sans_serif_family("Roboto");
    options.fontdb_mut().set_monospace_family("Roboto Mono");
    options.fontdb_mut().set_cursive_family("Roboto");
    options.fontdb_mut().set_fantasy_family("Roboto");
    usvg::Tree::from_data(data, &options).map_err(|_| ())
}

fn raster_svg_tile(data: &[u8], x: u32, y: u32, size: u32)
    -> Result<(Vec<u8>, u32, u32), ()> {
    let tree = parse_svg(data)?;
    let width = tree.size().width().ceil() as u32;
    let height = tree.size().height().ceil() as u32;
    if width == 0 || height == 0 || (width as u64) * (height as u64) > 40_000_000
        || x >= width || y >= height || size == 0 || size > 1024 { return Err(()) }
    let output_width = size.min(width - x);
    let output_height = size.min(height - y);
    let mut pixmap = tiny_skia::Pixmap::new(output_width, output_height).ok_or(())?;
    resvg::render(&tree, tiny_skia::Transform::from_translate(-(x as f32), -(y as f32)),
        &mut pixmap.as_mut());
    let png = pixmap.encode_png().map_err(|_| ())?;
    if png.len() > 8 * 1024 * 1024 { return Err(()) }
    Ok((png, output_width, output_height))
}

#[no_mangle]
pub unsafe extern "C" fn md_svg_raster(data: *const u8, len: usize, max_dimension: u32,
    output: *mut *mut u8, output_len: *mut usize, width: *mut u32, height: *mut u32) -> i32 {
    if data.is_null() || output.is_null() || output_len.is_null() || width.is_null() || height.is_null()
        || len == 0 || len > 8 * 1024 * 1024 { return -1 }
    let input = unsafe { std::slice::from_raw_parts(data, len) };
    let result = std::panic::catch_unwind(|| raster_svg(input, max_dimension));
    let (png, image_width, image_height) = match result {
        Ok(Ok(value)) => value,
        Ok(Err(SvgError::ResponseLimit)) => return -2,
        _ => return -1,
    };
    let allocation = unsafe { libc::malloc(png.len()) as *mut u8 };
    if allocation.is_null() { return -1 }
    unsafe {
        std::ptr::copy_nonoverlapping(png.as_ptr(), allocation, png.len());
        *output = allocation;
        *output_len = png.len();
        *width = image_width;
        *height = image_height;
    }
    0
}

#[no_mangle]
pub unsafe extern "C" fn md_svg_raster_tile(data: *const u8, len: usize, x: u32, y: u32,
    size: u32, output: *mut *mut u8, output_len: *mut usize, width: *mut u32,
    height: *mut u32) -> i32 {
    if data.is_null() || output.is_null() || output_len.is_null() || width.is_null() || height.is_null()
        || len == 0 || len > 8 * 1024 * 1024 { return -1 }
    let input = unsafe { std::slice::from_raw_parts(data, len) };
    let result = std::panic::catch_unwind(|| raster_svg_tile(input, x, y, size));
    let Ok(Ok((png, tile_width, tile_height))) = result else { return -1 };
    let allocation = unsafe { libc::malloc(png.len()) as *mut u8 };
    if allocation.is_null() { return -1 }
    unsafe {
        std::ptr::copy_nonoverlapping(png.as_ptr(), allocation, png.len());
        *output = allocation;
        *output_len = png.len();
        *width = tile_width;
        *height = tile_height;
    }
    0
}

/// Diagram helper entry: enforce intrinsic/pixel bounds before raster allocation.
#[no_mangle]
pub unsafe extern "C" fn md_diagram_raster(data: *const u8, len: usize, max_dimension: u32,
    output: *mut *mut u8, output_len: *mut usize, width: *mut u32, height: *mut u32) -> i32 {
    if data.is_null() || len == 0 || len > 1024 * 1024 { return -1; }
    let input = unsafe { std::slice::from_raw_parts(data, len) };
    let Ok(tree) = parse_svg(input) else { return -1; };
    let w = tree.size().width().ceil() as u32;
    let h = tree.size().height().ceil() as u32;
    if w == 0 || h == 0 || w > 2048 || h > 2048 || u64::from(w)*u64::from(h) > 4_194_304 { return -1; }
    unsafe { md_svg_raster(data, len, max_dimension.min(2048), output, output_len, width, height) }
}

pub fn run_decoder() {
    unsafe { md_image_xpc_main() }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn painted_pixels(source: &str) -> usize {
        let (png, _, _) = raster_svg(source.as_bytes(), 4096).unwrap();
        tiny_skia::Pixmap::decode_png(&png).unwrap().pixels().iter()
            .filter(|pixel| pixel.alpha() > 0).count()
    }

    #[test]
    fn svg_rejects_active_and_external_content() {
        for source in [
            "<!DOCTYPE svg [<!ENTITY x SYSTEM 'file:///etc/passwd'>]><svg>&x;</svg>",
            "<svg xmlns='http://www.w3.org/2000/svg'><script>alert(1)</script></svg>",
            "<svg xmlns='http://www.w3.org/2000/svg'><image href='file:///tmp/a.png'/></svg>",
            "<svg xmlns='http://www.w3.org/2000/svg'><rect style='fill:url(https://host/a)'/></svg>",
        ] { assert!(validate_svg(source.as_bytes()).is_err()); }
        let safe = b"<svg xmlns='http://www.w3.org/2000/svg' width='24' height='16'><rect width='24' height='16' fill='red'/></svg>";
        assert!(raster_svg(safe, 4096).is_ok());
        assert_eq!(raster_svg_tile(safe, 8, 4, 8).unwrap().1, 8);
    }

    #[test]
    fn svg_renders_text_with_unavailable_system_fonts_and_symbols() {
        let fallback_fonts: [&[u8]; 2] = [
            include_bytes!("../../../src/assets/fonts/NotoSansSymbols2-Regular.ttf"),
            include_bytes!("../../../src/assets/fonts/NotoSansSymbols[wght].ttf"),
        ];
        for symbol in ['☰', '✓', '⌄'] {
            assert!(fallback_fonts.iter().any(|data| {
                let font = skrifa::FontRef::new(data).unwrap();
                skrifa::charmap::Charmap::new(&font).map(symbol).is_some()
            }),
                "bundled symbol font lacks {symbol}");
        }
        for label in ["Hello", "☰", "✓", "⌄"] {
            let source = format!("<svg xmlns='http://www.w3.org/2000/svg' width='160' height='48'><text x='4' y='36' font-size='32' font-family='-apple-system, Helvetica Neue, Arial, sans-serif'>{label}</text></svg>");
            assert!(painted_pixels(&source) > 20, "missing glyphs for {label}");
        }
    }

    #[test]
    fn svg_allows_visible_url_text_but_rejects_resource_urls() {
        let source = "<svg xmlns='http://www.w3.org/2000/svg' width='260' height='40'><text x='2' y='25'>https://example.com</text></svg>";
        assert!(painted_pixels(source) > 20);
        for source in [
            "<svg xmlns='http://www.w3.org/2000/svg'><style>rect { fill: url('https://example.com/x') }</style></svg>",
            "<svg xmlns='http://www.w3.org/2000/svg'><rect fill=\"url('file:///tmp/x')\"/></svg>",
            "<svg xmlns='http://www.w3.org/2000/svg'><rect fill=\"url('data:image/png;base64,AA')\"/></svg>",
        ] { assert!(validate_svg(source.as_bytes()).is_err()); }
    }

    #[test]
    fn svg_renders_quoted_local_gradient_and_rejects_nonlocal_references() {
        let source = "<svg xmlns='http://www.w3.org/2000/svg' width='24' height='16'><defs><linearGradient id='g'><stop stop-color='red'/><stop offset='1' stop-color='blue'/></linearGradient></defs><rect width='24' height='16' fill=\"url('#g')\"/></svg>";
        assert_eq!(painted_pixels(source), 24 * 16);
        for reference in ["url('https://example.com/g')", "url('data:text/plain,x')", "url('file:///tmp/g')", "url('#g') url('https://example.com/g')", "url('#g\"')"] {
            assert!(!safe_css(reference), "accepted {reference}");
        }
    }
}
