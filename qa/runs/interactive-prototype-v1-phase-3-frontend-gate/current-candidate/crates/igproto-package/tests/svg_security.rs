use igproto_model::{Code, SceneId, Viewport};
use igproto_package::{svg, Control};
use std::time::Duration;
fn parse(body: &str, authoring: bool) -> igproto_package::Result<svg::Scene> {
    let svg=format!("<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"100\" height=\"100\" viewBox=\"0 0 100 100\">{body}</svg>");
    svg::sanitize(
        svg.as_bytes(),
        &SceneId::new("home").unwrap(),
        &Viewport {
            width: 100,
            height: 100,
        },
        authoring,
        (0., 0.),
        |s| {
            if s == format!("assets/{}.png", "0".repeat(64)) {
                Ok(s.into())
            } else {
                Err(igproto_package::diagnostics::error(
                    Code::InvalidVisual,
                    igproto_model::Stage::Reference,
                    "image",
                    "not packaged asset",
                ))
            }
        },
        &Control::new(Duration::from_secs(5)),
    )
}
macro_rules! reject {
    ($name:ident,$body:expr) => {
        #[test]
        fn $name() {
            assert!(parse($body, true).is_err(), "{}", $body);
        }
    };
}
reject!(script, "<script>alert(1)</script>");
reject!(inline_event, "<rect onclick=\"alert(1)\"/>");
reject!(mixed_case_event, "<rect oNcLiCk=\"alert(1)\"/>");
reject!(
    namespaced_event,
    "<rect xmlns:q=\"urn:evil\" q:onclick=\"alert(1)\"/>"
);
reject!(network_image, "<image href=\"https://example.com/x.png\"/>");
reject!(file_image, "<image href=\"file:///etc/passwd\"/>");
reject!(javascript_image, "<image href=\"javascript:alert(1)\"/>");
reject!(
    protocol_relative_image,
    "<image href=\"//example.com/x.png\"/>"
);
reject!(blob_image, "<image href=\"blob:opaque\"/>");
reject!(
    custom_scheme_image,
    "<image href=\"custom:host/image.png\"/>"
);
reject!(
    external_css_url,
    "<rect style=\"fill:url(https://evil.example/x)\"/>"
);
reject!(
    escaped_css_url,
    "<rect style=\"fill:u\\72l(https://evil.example/x)\"/>"
);
reject!(
    css_import,
    "<rect style=\"@import 'https://evil.example/a.css'\"/>"
);
reject!(css_var, "<rect style=\"fill:var(--paint)\"/>");
reject!(css_calc, "<rect style=\"stroke-width:calc(1px + 1px)\"/>");
reject!(css_behavior, "<rect style=\"behavior:url(x.htc)\"/>");
reject!(css_animation, "<rect style=\"animation:spin 1s\"/>");
reject!(css_important, "<rect style=\"fill:#fff!important\"/>");
reject!(css_nested_rgb, "<rect style=\"fill:rgb(rgb(1),2,3)\"/>");
reject!(foreign_object, "<foreignObject/>");
reject!(animation, "<animate/>");
reject!(set_element, "<set/>");
reject!(stylesheet, "<style>@font-face{}</style>");
reject!(link, "<a href=\"https://example.com\"><rect/></a>");
reject!(use_element, "<use href=\"#x\"/>");
reject!(symbol, "<symbol/>");
reject!(pattern, "<pattern/>");
reject!(mask, "<mask/>");
reject!(fe_image, "<filter><feImage href=\"x\"/></filter>");
reject!(external_font, "<text font-family=\"RemoteFont\">x</text>");
reject!(
    font_url,
    "<text style=\"font-family:url(https://example.com/x.woff)\">x</text>"
);
reject!(xml_base, "<g xml:base=\"file:///etc\"/>");
reject!(tabindex, "<g tabindex=\"0\"/>");
reject!(aria_override, "<g role=\"button\"/>");
reject!(unknown_attribute, "<rect unknown=\"value\"/>");
reject!(wrong_attribute_domain, "<rect stdDeviation=\"2\"/>");
reject!(
    gradient_attribute_on_shape,
    "<path gradientUnits=\"userSpaceOnUse\"/>"
);
reject!(
    unexpected_namespace,
    "<g xmlns=\"http://www.w3.org/1999/xhtml\"/>"
);
reject!(nested_svg, "<svg/>");
reject!(malformed_xml, "<g><path></g>");
reject!(
    processing_instruction,
    "<?xml-stylesheet href=\"https://evil/x\"?>"
);
reject!(
    target_in_defs,
    "<defs><g data-prototype-id=\"target\"><rect/></g></defs>"
);
reject!(target_on_filter, "<filter data-prototype-id=\"target\"/>");
reject!(
    duplicate_targets,
    "<g data-prototype-id=\"same\"/><rect data-prototype-id=\"same\"/>"
);
reject!(malformed_marker, "<g data-prototype-id=\"bad_target\"/>");
reject!(
    duplicate_visual_ids,
    "<rect id=\"same\"/><rect id=\"same\"/>"
);
reject!(missing_gradient, "<rect fill=\"url(#missing)\"/>");
reject!(
    wrong_fragment_type,
    "<defs><clipPath id=\"crop\"><rect/></clipPath></defs><rect fill=\"url(#crop)\"/>"
);
reject!(
    external_gradient,
    "<defs><linearGradient id=\"paint\" href=\"https://evil.example/paint\"/></defs>"
);
reject!(
    cyclic_gradient,
    "<defs><linearGradient id=\"a\" href=\"#b\"/><linearGradient id=\"b\" href=\"#a\"/></defs>"
);
reject!(
    unordered_stops,
    "<defs><linearGradient><stop offset=\"1\"/><stop offset=\"0\"/></linearGradient></defs>"
);
reject!(nonfinite_coordinate, "<rect x=\"NaN\"/>");
reject!(excess_coordinate, "<rect x=\"1000001\"/>");
reject!(negative_dimensions, "<rect width=\"-1\"/>");
reject!(opacity_range, "<g opacity=\"1.01\"/>");
reject!(font_size_range, "<text font-size=\"513\">x</text>");
reject!(unsupported_units, "<rect width=\"1vw\"/>");
reject!(percent_shape, "<rect width=\"10%\"/>");
reject!(transform_scale, "<g transform=\"scale(65)\"/>");
reject!(
    composed_scale,
    "<g transform=\"scale(8)\"><g transform=\"scale(9)\"/></g>"
);
reject!(
    three_ancestor_scale,
    "<g transform=\"scale(4)\"><g transform=\"scale(4)\"><g transform=\"scale(5)\"/></g></g>"
);
reject!(relative_path_overflow, "<path d=\"M1000000 0 l1 0\"/>");
reject!(
    arc_operand_overflow,
    "<path d=\"M0 0 A1000001 1 0 0 0 1 1\"/>"
);
reject!(odd_points, "<polygon points=\"0 0 1\"/>");
reject!(
    blur_range,
    "<filter><feGaussianBlur stdDeviation=\"17\"/></filter>"
);
reject!(offset_range, "<filter><feOffset dx=\"65\"/></filter>");
reject!(
    filter_forward_reference,
    "<filter><feOffset in=\"later\"/><feFlood result=\"later\"/></filter>"
);
reject!(
    filter_reserved_result,
    "<filter><feFlood result=\"SourceGraphic\"/></filter>"
);
reject!(
    filter_arithmetic,
    "<filter><feComposite operator=\"arithmetic\" k1=\"1\" in2=\"SourceGraphic\"/></filter>"
);
reject!(
    filter_missing_input,
    "<filter><feComposite operator=\"over\"/></filter>"
);
reject!(filter_region,"<defs><filter id=\"f\" filterUnits=\"userSpaceOnUse\" width=\"200\" height=\"101\"/></defs><rect width=\"100\" height=\"100\" filter=\"url(#f)\"/>");
reject!(scaled_filter_region,"<defs><filter id=\"f\" filterUnits=\"userSpaceOnUse\" width=\"100\" height=\"100\"/></defs><g transform=\"scale(2)\"><rect width=\"100\" height=\"100\" filter=\"url(#f)\"/></g>");
reject!(resolved_bbox_blur,"<defs><filter id=\"f\" primitiveUnits=\"objectBoundingBox\"><feGaussianBlur stdDeviation=\"0.2\"/></filter></defs><rect width=\"100\" height=\"100\" filter=\"url(#f)\"/>");
reject!(rgb_infinite, "<rect fill=\"rgb(1e999,0,0)\"/>");
reject!(rgba_range, "<rect fill=\"rgba(0,0,0,2)\"/>");
#[test]
fn dtd_entities() {
    let bytes=b"<!DOCTYPE svg [<!ENTITY x 'boom'>]><svg xmlns=\"http://www.w3.org/2000/svg\" width=\"100\" height=\"100\" viewBox=\"0 0 100 100\"><text>&x;</text></svg>";
    assert!(svg::sanitize(
        bytes,
        &SceneId::new("home").unwrap(),
        &Viewport {
            width: 100,
            height: 100
        },
        true,
        (0., 0.),
        |s| Ok(s.into()),
        &Control::new(Duration::from_secs(5))
    )
    .is_err());
}
#[test]
fn runtime_style_prohibited() {
    assert!(parse("<rect style=\"fill:#fff\"/>", false).is_err());
}
#[test]
fn target_and_text_preserved() {
    let scene=parse("<!--inert--><g data-prototype-id=\"button\"><text xml:space=\"preserve\">  A &amp; B  </text></g>",true).unwrap();
    let output = String::from_utf8(scene.bytes).unwrap();
    assert!(output.contains("data-prototype-id=\"button\""));
    assert!(output.contains("  A &amp; B  "));
    assert!(!output.contains("<!--"));
    assert_eq!(scene.targets[0].id.as_str(), "button");
}
#[test]
fn css_cascade_and_escapes() {
    let s = parse(
        "<rect fill=\"#000\" style=\"f\\69ll:#fff; opacity:0.5\"/>",
        true,
    )
    .unwrap();
    let out = String::from_utf8(s.bytes).unwrap();
    assert!(out.contains("fill=\"#fff\""));
    assert!(!out.contains("style="));
}
#[test]
fn supported_properties() {
    let body = r##"<defs><radialGradient id="r" gradientUnits="objectBoundingBox" gradientTransform="matrix(1 0 0 1 0 0)" cx="50%" cy="50%" fx="20%" fy="20%" r="50%" fr="0%" spreadMethod="reflect"><stop offset="0%" stop-color="rgb(0,10,20)" stop-opacity="0.5"/><stop offset="100%" stop-color="rgba(0,10,20,0.5)"/></radialGradient><clipPath id="c" clipPathUnits="userSpaceOnUse"><circle cx="20" cy="20" r="20"/></clipPath><filter id="f" filterUnits="userSpaceOnUse" primitiveUnits="userSpaceOnUse" x="0" y="0" width="60" height="60" color-interpolation-filters="linearRGB"><feGaussianBlur in="SourceAlpha" stdDeviation="1 2" result="blur"/><feOffset in="blur" dx="1" dy="-1" result="shift"/><feFlood flood-color="#000" flood-opacity="0.1" result="paint"/><feComposite in="paint" in2="shift" operator="in" result="shadow"/><feMerge result="final"><feMergeNode in="shadow"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs><g id="group" data-prototype-id="root" xml:space="preserve" opacity="0.8" display="inline" visibility="visible" transform="translate(1 1) rotate(3) skewX(1) skewY(1) scale(1)"><rect x="0px" y="0" width="30" height="30" rx="2" ry="3" fill="url(#r)" fill-opacity="0.5" fill-rule="evenodd" stroke="#123456" stroke-width="1" stroke-opacity="0.5" stroke-linecap="round" stroke-linejoin="bevel" stroke-miterlimit="10" stroke-dasharray="1 2" stroke-dashoffset="-1" clip-path="url(#c)" clip-rule="evenodd" filter="url(#f)"/><ellipse cx="5" cy="5" rx="2" ry="3"/><line x1="0" y1="0" x2="5" y2="5"/><polyline points="0,0 1,1"/><polygon points="0,0 1,1 2,0"/><path d="M0 0 h3 v3 q1 1 2 2 t1 1 c1 1 2 2 3 3 s1 1 2 2 a1 1 0 0 0 1 1 z"/><text x="0" y="50" dx="1" dy="2" font-family="Arial" font-size="12px" font-weight="700" font-style="italic" letter-spacing="1" text-anchor="middle" dominant-baseline="central"><tspan x="0,2" y="50,51">Hi</tspan></text><title>title</title><desc>description</desc></g>"##;
    assert!(parse(body, true).is_ok());
}
#[test]
fn original_vectorcraft_exports_preserve_profile() {
    for name in ["login", "dashboard", "settings", "profile-overlay"] {
        let path = std::path::Path::new(env!("CARGO_MANIFEST_DIR"))
            .join("../../tests/fixtures/prototype/phase-2/vectorcraft-originals")
            .join(format!("{name}.svg"));
        let bytes = std::fs::read(path).unwrap();
        let s = svg::sanitize(
            &bytes,
            &SceneId::new(name).unwrap(),
            &Viewport {
                width: 390,
                height: 844,
            },
            true,
            (0., 0.),
            |_| Ok(format!("assets/{}.png", "0".repeat(64))),
            &Control::new(Duration::from_secs(5)),
        )
        .unwrap();
        let out = String::from_utf8(s.bytes).unwrap();
        for token in [
            "linearGradient",
            "clipPath",
            "filter",
            "feMerge",
            "font-family=\"Arial\"",
            "data-prototype-id",
        ] {
            assert!(out.contains(token), "{name} lost {token}");
        }
        assert_eq!(s.warnings.len(), 1);
    }
}
#[test]
fn sanitizer_idempotent() {
    let a=parse("<defs><linearGradient id=\"zzz\"/><linearGradient id=\"aaa\"/></defs><rect fill=\"url(#zzz)\"/>",true).unwrap();
    let b = svg::sanitize(
        &a.bytes,
        &SceneId::new("home").unwrap(),
        &Viewport {
            width: 100,
            height: 100,
        },
        false,
        (0., 0.),
        |s| Ok(s.into()),
        &Control::new(Duration::from_secs(5)),
    )
    .unwrap();
    assert_eq!(a.bytes, b.bytes);
}
#[test]
fn element_count_boundary() {
    assert!(parse(&"<g/>".repeat(9999), true).is_ok());
    assert!(parse(&"<g/>".repeat(10000), true).is_err());
}
#[test]
fn nesting_boundary() {
    let body = format!("{}{}", "<g>".repeat(39), "</g>".repeat(39));
    assert!(parse(&body, true).is_ok());
    let body = format!("{}{}", "<g>".repeat(40), "</g>".repeat(40));
    assert!(parse(&body, true).is_err());
}
#[test]
fn target_count_boundary() {
    let body = (0..1024)
        .map(|i| format!("<g data-prototype-id=\"target-{i}\"/>"))
        .collect::<String>();
    assert!(parse(&body, true).is_ok());
    assert!(parse(&(body + "<g data-prototype-id=\"extra\"/>"), true).is_err());
}
#[test]
fn visual_id_boundary() {
    let body = (0..512)
        .map(|i| format!("<g id=\"id-{i}\"/>"))
        .collect::<String>();
    assert!(parse(&body, true).is_ok());
    assert!(parse(&(body + "<g id=\"extra\"/>"), true).is_err());
}
#[test]
fn reference_count_boundary() {
    let prefix = "<defs><linearGradient id=\"paint\"/></defs>";
    let body = prefix.to_string() + &"<rect fill=\"url(#paint)\"/>".repeat(2048);
    assert!(parse(&body, true).is_ok());
    assert!(parse(&(body + "<rect fill=\"url(#paint)\"/>"), true).is_err());
}
#[test]
fn text_boundary() {
    assert!(parse(&format!("<text>{}</text>", "x".repeat(100000)), true).is_err()); /* Computed geometry is tighter for a single huge run. */
    let body = (0..1000)
        .map(|_| format!("<text>{}</text>", "x".repeat(100)))
        .collect::<String>();
    assert!(parse(&body, true).is_ok());
    assert!(parse(&(body + "<text>x</text>"), true).is_err());
}
#[test]
fn transform_count_boundary() {
    assert!(parse(
        &format!("<g transform=\"{}\"/>", "translate(0 0) ".repeat(32)),
        true
    )
    .is_ok());
    assert!(parse(
        &format!("<g transform=\"{}\"/>", "translate(0 0) ".repeat(33)),
        true
    )
    .is_err());
}
#[test]
fn filter_primitive_boundary() {
    assert!(parse(
        &format!("<filter>{}</filter>", "<feOffset/>".repeat(8)),
        true
    )
    .is_ok());
    assert!(parse(
        &format!("<filter>{}</filter>", "<feOffset/>".repeat(9)),
        true
    )
    .is_err());
}
#[test]
fn filter_count_boundary() {
    assert!(parse(&"<filter/>".repeat(16), true).is_ok());
    assert!(parse(&"<filter/>".repeat(17), true).is_err());
}
#[test]
fn filtered_element_boundary() {
    let prefix =
        "<defs><filter id=\"f\" filterUnits=\"userSpaceOnUse\" width=\"1\" height=\"1\"/></defs>";
    assert!(parse(
        &(prefix.to_string() + &"<rect width=\"1\" height=\"1\" filter=\"url(#f)\"/>".repeat(32)),
        true
    )
    .is_ok());
    assert!(parse(
        &(prefix.to_string() + &"<rect width=\"1\" height=\"1\" filter=\"url(#f)\"/>".repeat(33)),
        true
    )
    .is_err());
}
#[test]
fn path_items_boundary() {
    let path = |n| format!("<path d=\"M0 0 {}\"/>", "L0 0 ".repeat(n));
    let body = path(33332) + &path(33332) + &path(33333);
    assert_eq!(parse(&body, true).unwrap().path_items, 100000);
    assert!(parse(&(body + &path(0)), true).is_err());
}
#[test]
fn reference_depth_boundary() {
    let chain = |n| {
        let mut b = "<defs>".to_string();
        for i in 0..n {
            b.push_str(&format!(
                "<linearGradient id=\"g{i}\" href=\"#g{}\"/>",
                i + 1
            ));
        }
        b.push_str(&format!("<linearGradient id=\"g{n}\"/></defs>"));
        b
    };
    assert!(parse(&chain(7), true).is_ok());
    assert!(parse(&chain(9), true).is_err());
}
#[test]
fn svg_byte_budget() {
    let base="<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"100\" height=\"100\" viewBox=\"0 0 100 100\"><!--";
    let end = "--></svg>";
    let bytes = format!(
        "{base}{}{end}",
        "x".repeat(igproto_package::limits::SVG - base.len() - end.len())
    );
    let call = |b: &[u8]| {
        svg::sanitize(
            b,
            &SceneId::new("home").unwrap(),
            &Viewport {
                width: 100,
                height: 100,
            },
            true,
            (0., 0.),
            |s| Ok(s.into()),
            &Control::new(Duration::from_secs(5)),
        )
    };
    assert!(call(bytes.as_bytes()).is_ok());
    assert!(call((bytes + " ").as_bytes()).is_err());
}
#[test]
fn typed_numeric_boundaries() {
    for body in [
        "<rect x=\"1000000\" width=\"0\"/>",
        "<g opacity=\"1\" transform=\"scale(64)\"/>",
        "<text font-size=\"512\">x</text>",
        "<filter><feGaussianBlur stdDeviation=\"16\"/><feOffset dx=\"64\" dy=\"-64\"/></filter>",
    ] {
        assert!(parse(body, true).is_ok(), "{body}");
    }
}
#[test]
fn marker_on_tspan() {
    let s = parse(
        "<text><tspan data-prototype-id=\"label\">Hi</tspan></text>",
        true,
    )
    .unwrap();
    assert_eq!(s.targets[0].id.as_str(), "label");
}
reject!(
    world_coordinate_overflow,
    "<rect x=\"1000000\" width=\"0\" transform=\"translate(1 0)\"/>"
);
reject!(resolved_filter_coordinate_overflow,"<defs><filter id=\"f\" x=\"1000000\"/></defs><rect width=\"100\" height=\"100\" filter=\"url(#f)\"/>");
#[test]
fn quoted_arial_css() {
    let s = parse(
        "<text style=\"font-family:'Arial';font-size:16px\">Hi</text>",
        true,
    )
    .unwrap();
    assert!(std::str::from_utf8(&s.bytes)
        .unwrap()
        .contains("font-family=\"Arial\""));
}
#[test]
fn declaration_value_boundary() {
    let dash = format!("<rect stroke-dasharray=\"{}\"/>", "1 ".repeat(8192));
    assert!(parse(&dash, true).is_ok());
    let dash = format!("<rect stroke-dasharray=\"{}\"/>", "1 ".repeat(8192) + "1");
    assert!(parse(&dash, true).is_err());
}
reject!(
    text_spacing_filter_bomb,
    "<defs><filter id=\"f\"/></defs><text letter-spacing=\"1000000\" filter=\"url(#f)\">Hi</text>"
);
reject!(
    text_position_filter_bomb,
    "<defs><filter id=\"f\"/></defs><text x=\"0 1000000\" filter=\"url(#f)\">Hi</text>"
);
reject!(
    text_delta_filter_bomb,
    "<defs><filter id=\"f\"/></defs><text dx=\"1000000 1000000\" filter=\"url(#f)\">Hi</text>"
);
reject!(
    inherited_text_spacing_bomb,
    "<g letter-spacing=\"1000000\"><text>Hi</text></g>"
);
reject!(
    target_on_unrendered_text_child,
    "<text><g data-prototype-id=\"target\"/></text>"
);
reject!(
    target_inside_title,
    "<title><g data-prototype-id=\"target\"/></title>"
);
#[test]
fn conflicting_xml_encoding_rejected() {
    let b=b"<?xml version=\"1.0\" encoding=\"UTF-7\"?><svg xmlns=\"http://www.w3.org/2000/svg\" width=\"100\" height=\"100\" viewBox=\"0 0 100 100\"><text>+ADw-script+AD4-</text></svg>";
    let e = svg::sanitize(
        b,
        &SceneId::new("home").unwrap(),
        &Viewport {
            width: 100,
            height: 100,
        },
        false,
        (0., 0.),
        |s| Ok(s.into()),
        &Control::new(Duration::from_secs(5)),
    )
    .unwrap_err();
    assert!(e.diagnostics[0].message.contains("UTF-8"));
}
reject!(transformed_blur_bomb,"<defs><filter id=\"f\"><feGaussianBlur stdDeviation=\"16\"/></filter></defs><rect width=\"1\" height=\"1\" transform=\"scale(2)\" filter=\"url(#f)\"/>");
reject!(transformed_offset_bomb,"<defs><filter id=\"f\"><feOffset dx=\"64\"/></filter></defs><rect width=\"1\" height=\"1\" transform=\"scale(2)\" filter=\"url(#f)\"/>");
#[test]
fn css_numeric_precision_preserved() {
    let s=parse("<rect style=\"stroke-width:1.234567891234567;opacity:0.999999991;font-size:12.345678912345px\"/>",true).unwrap();
    let out = std::str::from_utf8(&s.bytes).unwrap();
    for value in ["1.234567891234567", "0.999999991", "12.345678912345px"] {
        assert!(out.contains(value), "lost {value}: {out}");
    }
}
