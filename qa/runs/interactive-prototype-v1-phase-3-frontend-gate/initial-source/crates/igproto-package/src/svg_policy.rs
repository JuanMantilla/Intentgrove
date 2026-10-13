//! Element/property applicability table for the normative macos-svg-v1 profile.
use svgtypes::{Length, LengthUnit, NumberListParser};
pub const ELEMENTS: &[&str] = &[
    "svg",
    "g",
    "defs",
    "path",
    "rect",
    "circle",
    "ellipse",
    "line",
    "polyline",
    "polygon",
    "text",
    "tspan",
    "linearGradient",
    "radialGradient",
    "stop",
    "clipPath",
    "image",
    "filter",
    "feGaussianBlur",
    "feOffset",
    "feFlood",
    "feComposite",
    "feMerge",
    "feMergeNode",
    "title",
    "desc",
];
pub fn rendered(e: &str) -> bool {
    matches!(
        e,
        "g" | "path"
            | "rect"
            | "circle"
            | "ellipse"
            | "line"
            | "polyline"
            | "polygon"
            | "text"
            | "tspan"
            | "image"
    )
}
pub fn definition(e: &str) -> bool {
    matches!(
        e,
        "defs"
            | "linearGradient"
            | "radialGradient"
            | "stop"
            | "clipPath"
            | "filter"
            | "feGaussianBlur"
            | "feOffset"
            | "feFlood"
            | "feComposite"
            | "feMerge"
            | "feMergeNode"
    )
}
pub fn presentation(a: &str) -> bool {
    matches!(
        a,
        "fill"
            | "fill-opacity"
            | "fill-rule"
            | "stroke"
            | "stroke-opacity"
            | "stroke-width"
            | "stroke-linecap"
            | "stroke-linejoin"
            | "stroke-miterlimit"
            | "stroke-dasharray"
            | "stroke-dashoffset"
            | "opacity"
            | "display"
            | "visibility"
            | "clip-path"
            | "clip-rule"
            | "filter"
            | "font-family"
            | "font-size"
            | "font-weight"
            | "font-style"
            | "letter-spacing"
            | "text-anchor"
            | "dominant-baseline"
            | "stop-color"
            | "stop-opacity"
            | "flood-color"
            | "flood-opacity"
            | "color-interpolation-filters"
    )
}
pub fn applicable(e: &str, a: &str) -> bool {
    if a == "id" {
        return true;
    }
    if a == "data-prototype-id" {
        return rendered(e);
    }
    if a == "xml:space" {
        return matches!(e, "svg" | "g" | "text" | "tspan");
    }
    if presentation(a) {
        return match a {
            "stop-color" | "stop-opacity" => e == "stop",
            "flood-color" | "flood-opacity" => e == "feFlood",
            "color-interpolation-filters" => e == "filter",
            "filter" => rendered(e),
            _ => rendered(e) || matches!(e, "svg" | "tspan" | "clipPath"),
        };
    }
    match a {
        "version" | "viewBox" => e == "svg",
        "width" | "height" => matches!(e, "svg" | "rect" | "image" | "filter"),
        "x" | "y" => matches!(e, "rect" | "image" | "text" | "tspan" | "filter"),
        "rx" | "ry" => matches!(e, "rect" | "ellipse"),
        "cx" | "cy" => matches!(e, "circle" | "ellipse" | "radialGradient"),
        "r" => matches!(e, "circle" | "radialGradient"),
        "fx" | "fy" | "fr" => e == "radialGradient",
        "x1" | "x2" | "y1" | "y2" => matches!(e, "line" | "linearGradient"),
        "d" => e == "path",
        "points" => matches!(e, "polyline" | "polygon"),
        "transform" => rendered(e) || matches!(e, "tspan" | "clipPath"),
        "gradientTransform" | "gradientUnits" | "spreadMethod" => {
            matches!(e, "linearGradient" | "radialGradient")
        }
        "href" => matches!(e, "image" | "linearGradient" | "radialGradient"),
        "offset" => e == "stop",
        "clipPathUnits" => e == "clipPath",
        "filterUnits" | "primitiveUnits" => e == "filter",
        "stdDeviation" => e == "feGaussianBlur",
        "dx" | "dy" => matches!(e, "feOffset" | "text" | "tspan"),
        "in" => matches!(
            e,
            "feGaussianBlur" | "feOffset" | "feComposite" | "feMergeNode"
        ),
        "in2" | "operator" => e == "feComposite",
        "result" => matches!(
            e,
            "feGaussianBlur" | "feOffset" | "feFlood" | "feComposite" | "feMerge"
        ),
        "preserveAspectRatio" => matches!(e, "svg" | "image"),
        _ => false,
    }
}
pub fn number(s: &str) -> std::result::Result<f64, &'static str> {
    let v = s.parse::<f64>().map_err(|_| "invalid number")?;
    if !v.is_finite() || v.abs() > 1_000_000. {
        Err("nonfinite/out-of-bounds number")
    } else {
        Ok(v)
    }
}
pub fn length(s: &str, percent: bool) -> std::result::Result<f64, &'static str> {
    let l = s.parse::<Length>().map_err(|_| "invalid length")?;
    if !l.number.is_finite()
        || l.number.abs() > 1_000_000.
        || !matches!(
            l.unit,
            LengthUnit::None | LengthUnit::Px | LengthUnit::Percent
        )
        || (l.unit == LengthUnit::Percent && !percent)
    {
        return Err("unsupported units or length bounds");
    }
    Ok(if l.unit == LengthUnit::Percent {
        l.number / 100.
    } else {
        l.number
    })
}
pub fn numbers(s: &str) -> std::result::Result<Vec<f64>, &'static str> {
    let ns: NumberListParser<'_> = s.into();
    let ns = ns
        .collect::<std::result::Result<Vec<_>, _>>()
        .map_err(|_| "invalid number list")?;
    if ns.is_empty() || ns.iter().any(|n| !n.is_finite() || n.abs() > 1_000_000.) {
        Err("invalid number list bounds")
    } else {
        Ok(ns)
    }
}
pub fn visual_id(s: &str) -> bool {
    !s.is_empty()
        && s.len() <= 128
        && s.bytes().enumerate().all(|(i, b)| {
            b.is_ascii_alphabetic()
                || b == b'_'
                || (i > 0 && (b.is_ascii_digit() || b == b'-' || b == b'.'))
        })
}
pub fn fragment(s: &str) -> Option<&str> {
    s.strip_prefix("url(#")
        .and_then(|s| s.strip_suffix(')'))
        .filter(|s| visual_id(s))
}
pub fn value(e: &str, a: &str, v: &str) -> std::result::Result<(), &'static str> {
    let one = |values: &[&str]| {
        if values.contains(&v) {
            Ok(())
        } else {
            Err("unsupported enum value")
        }
    };
    let range = |min: f64, max: f64| {
        let n = number(v)?;
        if n < min || n > max {
            Err("number outside property range")
        } else {
            Ok(())
        }
    };
    match a {
        "id" | "result" => {
            if visual_id(v) {
                Ok(())
            } else {
                Err("invalid visual identifier")
            }
        }
        "data-prototype-id" => igproto_model::TargetId::new(v)
            .map(|_| ())
            .map_err(|_| "invalid prototype target"),
        "xml:space" => one(&["default", "preserve"]),
        "version" => one(&["1.1"]),
        "viewBox" => {
            if numbers(v)?.len() == 4 {
                Ok(())
            } else {
                Err("invalid viewBox")
            }
        }
        "fill" | "stroke" | "stop-color" | "flood-color" => {
            if v == "none" {
                return Ok(());
            }
            if matches!(a, "fill" | "stroke") && fragment(v).is_some() {
                return Ok(());
            }
            if !(v.starts_with('#') || v.starts_with("rgb(") || v.starts_with("rgba(")) {
                return Err("only explicit numeric paint or typed gradient allowed");
            }
            if v.starts_with("rgb(") || v.starts_with("rgba(") {
                let rgba = v.starts_with("rgba(");
                let start = if rgba { 5 } else { 4 };
                let body = v
                    .get(start..v.len().saturating_sub(1))
                    .filter(|_| v.ends_with(')'))
                    .ok_or("invalid color")?;
                let channels: Vec<_> = body.split(',').collect();
                if channels.len() != if rgba { 4 } else { 3 } {
                    return Err("invalid color channels");
                }
                for (i, c) in channels.iter().enumerate() {
                    let c = c.trim();
                    let percent = c.ends_with('%');
                    let value = number(c.strip_suffix('%').unwrap_or(c))?;
                    let max = if i == 3 {
                        1.
                    } else if percent {
                        100.
                    } else {
                        255.
                    };
                    if value < 0. || value > max || (i == 3 && percent) {
                        return Err("numeric color channel outside range");
                    }
                }
            }
            v.parse::<svgtypes::Color>()
                .map(|_| ())
                .map_err(|_| "invalid numeric color")
        }
        "opacity" | "fill-opacity" | "stroke-opacity" | "stop-opacity" | "flood-opacity" => {
            range(0., 1.)
        }
        "offset" => {
            let n = length(v, true)?;
            if (0.0..=1.0).contains(&n) {
                Ok(())
            } else {
                Err("gradient offset outside [0,1]")
            }
        }
        "display" => one(&["inline", "none"]),
        "visibility" => one(&["visible", "hidden"]),
        "font-family" => one(&["Arial"]),
        "font-weight" => one(&["normal", "bold", "400", "700"]),
        "font-style" => one(&["normal", "italic"]),
        "font-size" => {
            let n = length(v, false)?;
            if (1.0..=512.0).contains(&n) {
                Ok(())
            } else {
                Err("font size outside 1–512")
            }
        }
        "text-anchor" => one(&["start", "middle", "end"]),
        "dominant-baseline" => one(&["auto", "alphabetic", "middle", "central", "hanging"]),
        "stroke-linecap" => one(&["butt", "round", "square"]),
        "stroke-linejoin" => one(&["miter", "round", "bevel"]),
        "fill-rule" | "clip-rule" => one(&["nonzero", "evenodd"]),
        "stroke-miterlimit" => range(f64::MIN_POSITIVE, 100.),
        "stroke-dasharray" => {
            if v == "none" {
                Ok(())
            } else {
                let ns = numbers(v)?;
                if ns.iter().all(|n| *n >= 0.) && ns.iter().any(|n| *n > 0.) {
                    Ok(())
                } else {
                    Err("invalid nonnegative dash array")
                }
            }
        }
        "clip-path" | "filter" => {
            if v == "none" || fragment(v).is_some() {
                Ok(())
            } else {
                Err("only a same-scene typed fragment is allowed")
            }
        }
        "gradientUnits" | "clipPathUnits" | "filterUnits" | "primitiveUnits" => {
            one(&["userSpaceOnUse", "objectBoundingBox"])
        }
        "spreadMethod" => one(&["pad", "reflect", "repeat"]),
        "color-interpolation-filters" => one(&["sRGB", "linearRGB"]),
        "operator" => one(&["in", "over"]),
        "in" | "in2" => {
            if visual_id(v) {
                Ok(())
            } else {
                Err("invalid filter input")
            }
        }
        "preserveAspectRatio" => {
            if v.starts_with("defer") {
                return Err("deferred aspect ratio unsupported");
            }
            v.parse::<svgtypes::AspectRatio>()
                .map(|_| ())
                .map_err(|_| "invalid aspect ratio")
        }
        "stdDeviation" => {
            let ns = numbers(v)?;
            if ns.len() <= 2 && ns.iter().all(|n| (0.0..=16.0).contains(n)) {
                Ok(())
            } else {
                Err("blur exceeds 16 CSS px")
            }
        }
        "d" | "points" | "transform" | "gradientTransform" | "href" => Ok(()), // Dedicated typed parsers/reference resolver.
        "x" | "y" | "dx" | "dy" if matches!(e, "text" | "tspan") => {
            let ns = svgtypes::LengthListParser::from(v)
                .collect::<std::result::Result<Vec<_>, _>>()
                .map_err(|_| "invalid text positions")?;
            if ns.is_empty() {
                return Err("empty text positions");
            }
            for n in ns {
                if !matches!(n.unit, LengthUnit::None | LengthUnit::Px)
                    || !n.number.is_finite()
                    || n.number.abs() > 1_000_000.
                {
                    return Err("invalid text positions");
                }
            }
            Ok(())
        }
        _ => {
            let n = length(
                v,
                matches!(e, "linearGradient" | "radialGradient" | "filter"),
            )?;
            if matches!(
                a,
                "width" | "height" | "rx" | "ry" | "r" | "fr" | "stroke-width"
            ) && n < 0.
            {
                return Err("negative size");
            }
            if e == "feOffset" && n.abs() > 64. {
                return Err("filter offset exceeds 64 CSS px");
            }
            Ok(())
        }
    }
}
