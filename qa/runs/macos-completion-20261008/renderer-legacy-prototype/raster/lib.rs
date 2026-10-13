use resvg::{tiny_skia, usvg};


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
    if width == 0 || height == 0 || width > 2048 || height > 2048 || (width as u64) * (height as u64) > 4_194_304 {
        return Err(SvgError::Unsafe);
    }
    let scale = (max_dimension.clamp(1, 4096) as f32 / width.max(height) as f32).min(1.0);
    let output_width = ((width as f32 * scale).ceil() as u32).max(1);
    let output_height = ((height as f32 * scale).ceil() as u32).max(1);
    let mut pixmap = tiny_skia::Pixmap::new(output_width, output_height).ok_or(SvgError::Unsafe)?;
    resvg::render(&tree, tiny_skia::Transform::from_scale(scale, scale), &mut pixmap.as_mut());
    let png = pixmap.encode_png().map_err(|_| SvgError::Unsafe)?;
    if png.len() > 1024 * 1024 { return Err(SvgError::ResponseLimit) }
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
    options.fontdb_mut().load_font_data(include_bytes!("/Users/juanmantilla/projects/personal/md-reader/src/assets/fonts/Roboto[wdth,wght].ttf").to_vec());
    options.fontdb_mut().load_font_data(include_bytes!("/Users/juanmantilla/projects/personal/md-reader/src/assets/fonts/RobotoMono[wght].ttf").to_vec());
    options.fontdb_mut().load_font_data(include_bytes!("/Users/juanmantilla/projects/personal/md-reader/src/assets/fonts/NotoSansSymbols2-Regular.ttf").to_vec());
    options.fontdb_mut().load_font_data(include_bytes!("/Users/juanmantilla/projects/personal/md-reader/src/assets/fonts/NotoSansSymbols[wght].ttf").to_vec());
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
    if width == 0 || height == 0 || width > 2048 || height > 2048 || (width as u64) * (height as u64) > 4_194_304
        || x >= width || y >= height || size == 0 || size > 1024 { return Err(()) }
    let output_width = size.min(width - x);
    let output_height = size.min(height - y);
    let mut pixmap = tiny_skia::Pixmap::new(output_width, output_height).ok_or(())?;
    resvg::render(&tree, tiny_skia::Transform::from_translate(-(x as f32), -(y as f32)),
        &mut pixmap.as_mut());
    let png = pixmap.encode_png().map_err(|_| ())?;
    if png.len() > 1024 * 1024 { return Err(()) }
    Ok((png, output_width, output_height))
}

#[no_mangle]
pub unsafe extern "C" fn md_svg_raster(data: *const u8, len: usize, max_dimension: u32,
    output: *mut *mut u8, output_len: *mut usize, width: *mut u32, height: *mut u32) -> i32 {
    if data.is_null() || output.is_null() || output_len.is_null() || width.is_null() || height.is_null()
        || len == 0 || len > 1024 * 1024 { return -1 }
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
        || len == 0 || len > 1024 * 1024 { return -1 }
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
