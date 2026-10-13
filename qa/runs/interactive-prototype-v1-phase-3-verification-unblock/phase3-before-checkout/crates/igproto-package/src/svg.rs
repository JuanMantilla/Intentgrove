//! Parse, validate, and reconstruct SVG; target identity never depends on visual IDs.
use crate::{
    css,
    diagnostics::{error, Result},
    limits, svg_policy as policy,
};
use igproto_model::{
    Code, Diagnostic, SceneId, Stage, TargetId, TargetKind, TargetRecord, Viewport,
};
use std::collections::{BTreeMap, BTreeSet};
use svgtypes::{Transform, TransformListToken as T};
const SVG_NS: &str = "http://www.w3.org/2000/svg";
#[derive(Debug, Clone)]
pub struct Scene {
    pub bytes: Vec<u8>,
    pub targets: Vec<TargetRecord>,
    pub arial_text: bool,
    pub elements: usize,
    pub path_items: usize,
    pub assets: BTreeSet<String>,
    pub warnings: Vec<Diagnostic>,
}
#[derive(Clone, Debug)]
struct Node {
    tag: String,
    attrs: BTreeMap<String, String>,
    children: Vec<Child>,
    matrix: Transform,
    world: Transform,
}
#[derive(Clone, Debug)]
enum Child {
    Node(usize),
    Text(String),
}
#[derive(Clone, Copy)]
struct Box2 {
    x0: f64,
    y0: f64,
    x1: f64,
    y1: f64,
}
impl Box2 {
    fn point(x: f64, y: f64) -> Self {
        Self {
            x0: x,
            y0: y,
            x1: x,
            y1: y,
        }
    }
    fn union(self, b: Self) -> Self {
        Self {
            x0: self.x0.min(b.x0),
            y0: self.y0.min(b.y0),
            x1: self.x1.max(b.x1),
            y1: self.y1.max(b.y1),
        }
    }
    fn transform(self, m: Transform) -> Self {
        let mut b = Self::point(
            m.a * self.x0 + m.c * self.y0 + m.e,
            m.b * self.x0 + m.d * self.y0 + m.f,
        );
        for (x, y) in [(self.x1, self.y0), (self.x0, self.y1), (self.x1, self.y1)] {
            b = b.union(Self::point(
                m.a * x + m.c * y + m.e,
                m.b * x + m.d * y + m.f,
            ));
        }
        b
    }
}
pub(crate) fn multiply(a: Transform, b: Transform) -> Transform {
    Transform::new(
        a.a * b.a + a.c * b.b,
        a.b * b.a + a.d * b.b,
        a.a * b.c + a.c * b.d,
        a.b * b.c + a.d * b.d,
        a.a * b.e + a.c * b.f + a.e,
        a.b * b.e + a.d * b.f + a.f,
    )
}
fn bounded(m: Transform) -> bool {
    let trace = m.a * m.a + m.b * m.b + m.c * m.c + m.d * m.d;
    let det = m.a * m.d - m.b * m.c;
    let norm = ((trace + (trace * trace - 4. * det * det).max(0.).sqrt()) / 2.).sqrt();
    [m.a, m.b, m.c, m.d, m.e, m.f, norm]
        .iter()
        .all(|n| n.is_finite())
        && [m.a, m.b, m.c, m.d].iter().all(|n| n.abs() <= 1024.)
        && m.e.abs() <= 1_000_000.
        && m.f.abs() <= 1_000_000.
        && norm <= 64.
}
fn transform(s: &str) -> std::result::Result<Transform, &'static str> {
    let mut m = Transform::default();
    let mut count = 0;
    for t in svgtypes::TransformListParser::from(s) {
        count += 1;
        if count > 32 {
            return Err("transform operations exceed 32");
        }
        let t = t.map_err(|_| "malformed transform")?;
        let b = match t {
            T::Matrix { a, b, c, d, e, f } => Transform::new(a, b, c, d, e, f),
            T::Translate { tx, ty } => Transform::new(1., 0., 0., 1., tx, ty),
            T::Scale { sx, sy } => Transform::new(sx, 0., 0., sy, 0., 0.),
            T::Rotate { angle } => {
                if !angle.is_finite() || angle.abs() > 1_000_000. {
                    return Err("angle bounds");
                }
                let (s, c) = angle.to_radians().sin_cos();
                Transform::new(c, s, -s, c, 0., 0.)
            }
            T::SkewX { angle } => Transform::new(1., 0., angle.to_radians().tan(), 1., 0., 0.),
            T::SkewY { angle } => Transform::new(1., angle.to_radians().tan(), 0., 1., 0., 0.),
        };
        if !bounded(b) {
            return Err("transform coefficient/scale bounds");
        }
        m = multiply(m, b);
        if !bounded(m) {
            return Err("composed transform exceeds bounds");
        }
    }
    if count == 0 {
        return Err("empty transform");
    }
    Ok(m)
}
fn path(s: &str) -> std::result::Result<(usize, Option<Box2>), &'static str> {
    // Validate original operands as well as resolved coordinates (including arc radii).
    for seg in svgtypes::PathParser::from(s) {
        use svgtypes::PathSegment::*;
        let nums = match seg.map_err(|_| "malformed path")? {
            MoveTo { x, y, .. } | LineTo { x, y, .. } | SmoothQuadratic { x, y, .. } => vec![x, y],
            HorizontalLineTo { x, .. } => vec![x],
            VerticalLineTo { y, .. } => vec![y],
            CurveTo {
                x1,
                y1,
                x2,
                y2,
                x,
                y,
                ..
            } => vec![x1, y1, x2, y2, x, y],
            SmoothCurveTo { x2, y2, x, y, .. } => vec![x2, y2, x, y],
            Quadratic { x1, y1, x, y, .. } => vec![x1, y1, x, y],
            EllipticalArc {
                rx,
                ry,
                x_axis_rotation,
                x,
                y,
                ..
            } => vec![rx, ry, x_axis_rotation, x, y],
            ClosePath { .. } => vec![],
        };
        if nums.iter().any(|n| !n.is_finite() || n.abs() > 1_000_000.) {
            return Err("path operand bounds");
        }
    }
    let mut count = 0;
    let mut b: Option<Box2> = None;
    for seg in svgtypes::SimplifyingPathParser::from(s) {
        use svgtypes::SimplePathSegment::*;
        count += 1;
        if count > limits::PATH_ITEMS {
            return Err("path command budget");
        }
        let points = match seg.map_err(|_| "malformed resolved path")? {
            MoveTo { x, y } | LineTo { x, y } => vec![(x, y)],
            CurveTo {
                x1,
                y1,
                x2,
                y2,
                x,
                y,
            } => vec![(x1, y1), (x2, y2), (x, y)],
            Quadratic { x1, y1, x, y } => vec![(x1, y1), (x, y)],
            ClosePath => vec![],
        };
        for (x, y) in points {
            if !x.is_finite() || !y.is_finite() || x.abs() > 1_000_000. || y.abs() > 1_000_000. {
                return Err("resolved path coordinate bounds");
            }
            let p = Box2::point(x, y);
            b = Some(b.map_or(p, |b| b.union(p)));
        }
    }
    if count == 0 {
        return Err("empty path");
    }
    Ok((count, b))
}
fn serialize(i: usize, nodes: &[Node], out: &mut String) {
    let n = &nodes[i];
    out.push('<');
    out.push_str(&n.tag);
    for (a, v) in &n.attrs {
        out.push(' ');
        out.push_str(a);
        out.push_str("=\"");
        escape(v, out, true);
        out.push('"');
    }
    out.push('>');
    for child in &n.children {
        match child {
            Child::Node(j) => serialize(*j, nodes, out),
            Child::Text(t) => escape(t, out, false),
        }
    }
    out.push_str("</");
    out.push_str(&n.tag);
    out.push('>');
}
fn escape(s: &str, out: &mut String, attribute: bool) {
    for c in s.chars() {
        match c {
            '&' => out.push_str("&amp;"),
            '<' => out.push_str("&lt;"),
            '>' => out.push_str("&gt;"),
            '"' if attribute => out.push_str("&quot;"),
            '\r' => out.push_str("&#13;"),
            '\n' if attribute => out.push_str("&#10;"),
            '\t' if attribute => out.push_str("&#9;"),
            _ => out.push(c),
        }
    }
}
/// Compiler accepts simple styles, embedded/relative PNGs and explicit artboard origins.
/// Runtime validation uses `authoring=false`, identity asset resolver and origin=(0,0).
pub fn sanitize<F>(
    bytes: &[u8],
    scene: &SceneId,
    viewport: &Viewport,
    authoring: bool,
    origin: (f64, f64),
    mut asset: F,
    control: &crate::Control,
) -> Result<Scene>
where
    F: FnMut(&str) -> Result<String>,
{
    let member = format!("scenes/{scene}.svg");
    let fail = |msg: String| {
        let mut r = error(Code::InvalidVisual, Stage::Decode, &member, msg);
        r.diagnostics[0].scene = Some(scene.clone());
        r
    };
    if bytes.len() > limits::SVG {
        return Err(fail("scene exceeds 2 MiB".into()));
    }
    control.check(&member)?;
    let text = std::str::from_utf8(bytes).map_err(|_| fail("SVG must be UTF-8".into()))?;
    let doc = roxmltree::Document::parse_with_options(
        text,
        roxmltree::ParsingOptions {
            allow_dtd: false,
            nodes_limit: 30_001,
            ..Default::default()
        },
    )
    .map_err(|e| {
        let mut r = fail(format!("malformed/prohibited XML: {e}"));
        r.diagnostics[0].line = Some(e.pos().row as usize);
        r.diagnostics[0].column = Some(e.pos().col as usize);
        r
    })?;
    // A runtime reader must never reinterpret admitted UTF-8 bytes using another
    // encoding declaration. The compiler emits no declaration after reconstruction.
    let input = text.strip_prefix('\u{feff}').unwrap_or(text);
    if input.starts_with("<?xml ")
        || input.starts_with("<?xml\t")
        || input.starts_with("<?xml\n")
        || input.starts_with("<?xml\r")
    {
        let declaration = input
            .split_once("?>")
            .ok_or_else(|| fail("invalid XML declaration".into()))?
            .0;
        if declaration.len() > 512 {
            return Err(fail("XML declaration exceeds profile budget".into()));
        }
        let xml = format!("<declaration {}/>", &declaration[5..]);
        let d = roxmltree::Document::parse(&xml)
            .map_err(|_| fail("invalid XML declaration properties".into()))?;
        if d.root_element()
            .attribute("encoding")
            .is_some_and(|s| !s.eq_ignore_ascii_case("UTF-8"))
        {
            return Err(fail("SVG encoding declaration must be UTF-8".into()));
        }
    }
    let root = doc.root_element();
    if root.tag_name().name() != "svg" || root.tag_name().namespace() != Some(SVG_NS) {
        return Err(fail("root must be SVG namespace svg".into()));
    }
    let mut nodes: Vec<Node> = Vec::new();
    let mut index: std::collections::HashMap<roxmltree::NodeId, usize> =
        std::collections::HashMap::new();
    let mut path_items = 0;
    let mut text_bytes = 0;
    let mut arial_text = false;
    let mut assets = BTreeSet::new();
    let mut warnings = Vec::new();
    for n in doc.descendants() {
        control.check(&member)?;
        if n.is_pi() {
            return Err(fail("XML processing instructions prohibited".into()));
        }
        if n.is_text() {
            text_bytes += n.text().unwrap_or("").len();
            if text_bytes > limits::TEXT {
                return Err(fail("scene text budget exceeded".into()));
            }
            if !n.text().unwrap_or("").trim().is_empty()
                && !n
                    .ancestors()
                    .any(|a| matches!(a.tag_name().name(), "text" | "tspan" | "title" | "desc"))
            {
                return Err(fail("non-whitespace text outside text/title/desc".into()));
            }
            continue;
        }
        if !n.is_element() {
            continue;
        }
        let tag = n.tag_name().name();
        let depth = n.ancestors().filter(|a| a.is_element()).count();
        if depth > limits::DEPTH || nodes.len() >= limits::ELEMENTS {
            return Err(fail("SVG element/depth limit exceeded".into()));
        }
        if n.tag_name().namespace() != Some(SVG_NS)
            || !policy::ELEMENTS.contains(&tag)
            || (tag == "svg" && n != root)
        {
            return Err(fail(format!("prohibited SVG element `{tag}` or namespace")));
        }
        if n.namespaces().any(|ns| {
            !matches!(
                ns.uri(),
                SVG_NS | "http://www.w3.org/1999/xlink" | "http://www.w3.org/XML/1998/namespace"
            )
        }) {
            return Err(fail("unexpected namespace declaration".into()));
        }
        let parent = n
            .parent_element()
            .map(|p| p.tag_name().name())
            .unwrap_or("");
        let valid_parent = match tag {
            "svg" => parent.is_empty(),
            "stop" => matches!(parent, "linearGradient" | "radialGradient"),
            "feMergeNode" => parent == "feMerge",
            "feGaussianBlur" | "feOffset" | "feFlood" | "feComposite" | "feMerge" => {
                parent == "filter"
            }
            "tspan" => matches!(parent, "text" | "tspan"),
            "title" | "desc" => !matches!(parent, "" | "title" | "desc"),
            _ => {
                matches!(parent, "svg" | "g" | "defs")
                    || (parent == "clipPath"
                        && matches!(
                            tag,
                            "g" | "path"
                                | "rect"
                                | "circle"
                                | "ellipse"
                                | "line"
                                | "polyline"
                                | "polygon"
                                | "text"
                        ))
            }
        };
        if !valid_parent {
            return Err(fail(format!(
                "element `{tag}` is invalid inside `{parent}`"
            )));
        }
        if n.attributes().len() > limits::ATTRIBUTES {
            return Err(fail("attribute count exceeds 64".into()));
        }
        let mut attrs = BTreeMap::new();
        let mut style = None;
        for a in n.attributes() {
            let mut name = a.name().to_string();
            if let Some(ns) = a.namespace() {
                match (ns, a.name()) {
                    ("http://www.w3.org/XML/1998/namespace", "space") => name = "xml:space".into(),
                    ("http://www.w3.org/1999/xlink", "href") => name = "href".into(),
                    _ => return Err(fail(format!("prohibited namespaced attribute `{name}`"))),
                }
            }
            let value = a.value();
            let cap = if matches!(name.as_str(), "d" | "points") {
                limits::PATH_BYTES
            } else if authoring && name == "href" && tag == "image" {
                limits::SVG
            } else {
                limits::VALUE
            };
            if value.len() > cap {
                return Err(fail(format!("attribute `{name}` exceeds value budget")));
            }
            if name == "style" && authoring {
                style = Some(value);
                continue;
            }
            if name == "data-vc-blend" && authoring {
                if !matches!(value, "normal" | "multiply") {
                    return Err(fail("unclassified VectorCraft blend metadata".into()));
                }
                let mut d = error(
                    Code::InvalidVisual,
                    Stage::Model,
                    &member,
                    format!("removed inert exporter annotation data-vc-blend={value}"),
                )
                .diagnostics
                .remove(0);
                d.severity = igproto_model::Severity::Warning;
                warnings.push(d);
                continue;
            }
            if name.to_ascii_lowercase().starts_with("on") || !policy::applicable(tag, &name) {
                return Err(fail(format!(
                    "prohibited/inapplicable attribute `{name}` on `{tag}`"
                )));
            }
            if attrs.insert(name.clone(), value.to_string()).is_some() {
                return Err(fail(format!("duplicate normalized attribute `{name}`")));
            }
        }
        if let Some(s) = style {
            for (a, v) in css::declarations(s).map_err(|e| fail(e.into()))? {
                if !policy::applicable(tag, &a) {
                    return Err(fail(format!("CSS property `{a}` inapplicable on `{tag}`")));
                }
                attrs.insert(a, v);
            }
        }
        if attrs.len() > limits::ATTRIBUTES {
            return Err(fail("normalized attribute count exceeds budget".into()));
        }
        for (a, v) in &attrs {
            policy::value(tag, a, v).map_err(|e| fail(format!("invalid `{a}` on `{tag}`: {e}")))?;
        }
        let mut matrix = Transform::default();
        for a in ["transform", "gradientTransform"] {
            if let Some(v) = attrs.get(a) {
                matrix = transform(v).map_err(|e| fail(e.into()))?;
            }
        }
        let mut composed = matrix;
        for p in n.ancestors().skip(1) {
            if let Some(j) = index.get(&p.id()) {
                composed = multiply(nodes[*j].matrix, composed);
                if !bounded(composed) {
                    return Err(fail(
                        "ancestor-composed transform exceeds scale/coordinate bounds".into(),
                    ));
                }
            }
        }
        if let Some(v) = attrs.get("d") {
            path_items += path(v).map_err(|e| fail(e.into()))?.0;
        }
        if let Some(v) = attrs.get("points") {
            let ns = policy::numbers(v).map_err(|e| fail(e.into()))?;
            if ns.len() % 2 != 0 {
                return Err(fail("odd point coordinate count".into()));
            }
            path_items += ns.len() / 2;
        }
        if path_items > limits::PATH_ITEMS {
            return Err(fail("scene path/points budget exceeded".into()));
        }
        if tag == "image" {
            let href = attrs
                .get("href")
                .ok_or_else(|| fail("image requires href".into()))?;
            let path = asset(href)?;
            crate::resources::media(&path).and_then(|m| {
                if m == igproto_model::MediaType::Png {
                    Ok(m)
                } else {
                    Err(fail("image requires PNG asset".into()))
                }
            })?;
            assets.insert(path.clone());
            attrs.insert("href".into(), path);
        }
        if matches!(tag, "text" | "tspan") {
            arial_text = true;
            let family = attrs
                .get("font-family")
                .map(String::as_str)
                .or_else(|| {
                    n.ancestors()
                        .skip(1)
                        .filter_map(|p| {
                            index
                                .get(&p.id())
                                .and_then(|i| nodes[*i].attrs.get("font-family"))
                                .map(String::as_str)
                        })
                        .next()
                })
                .unwrap_or("Arial");
            if family != "Arial" {
                return Err(fail("only Arial live text supported".into()));
            }
            if !attrs.contains_key("font-family") {
                attrs.insert("font-family".into(), "Arial".into());
            }
            if !attrs.contains_key("font-size") {
                let size = n
                    .ancestors()
                    .skip(1)
                    .filter_map(|p| {
                        index
                            .get(&p.id())
                            .and_then(|i| nodes[*i].attrs.get("font-size"))
                    })
                    .next()
                    .cloned()
                    .unwrap_or("16".into());
                attrs.insert("font-size".into(), size);
            }
            if !attrs.contains_key("letter-spacing") {
                if let Some(value) = n
                    .ancestors()
                    .skip(1)
                    .filter_map(|p| {
                        index
                            .get(&p.id())
                            .and_then(|i| nodes[*i].attrs.get("letter-spacing"))
                    })
                    .next()
                    .cloned()
                {
                    attrs.insert("letter-spacing".into(), value);
                }
            }
        }
        let i = nodes.len();
        index.insert(n.id(), i);
        nodes.push(Node {
            tag: tag.into(),
            attrs,
            children: Vec::new(),
            matrix,
            world: composed,
        });
    }
    for n in doc.descendants().filter(|n| n.is_element()) {
        let i = index[&n.id()];
        for child in n.children() {
            if child.is_element() {
                nodes[i].children.push(Child::Node(index[&child.id()]));
            } else if child.is_text() {
                nodes[i]
                    .children
                    .push(Child::Text(child.text().unwrap_or("").into()));
            }
        }
    }
    let expected = [0., 0., viewport.width as f64, viewport.height as f64];
    let view = policy::numbers(
        nodes[0]
            .attrs
            .get("viewBox")
            .ok_or_else(|| fail("root requires viewBox".into()))?,
    )
    .map_err(|e| fail(e.into()))?;
    let offset = if view.as_slice() == expected {
        (0., 0.)
    } else if authoring && view.as_slice() == [origin.0, origin.1, expected[2], expected[3]] {
        origin
    } else {
        return Err(fail(
            "viewBox must match fixed viewport and explicit export origin".into(),
        ));
    };
    for (a, n) in [("width", viewport.width), ("height", viewport.height)] {
        if policy::length(
            nodes[0]
                .attrs
                .get(a)
                .ok_or_else(|| fail(format!("root requires {a}")))?,
            false,
        )
        .map_err(|e| fail(e.into()))?
            != n as f64
        {
            return Err(fail("root dimensions mismatch viewport".into()));
        }
    }
    let mut ids = BTreeMap::new();
    for (i, n) in nodes.iter().enumerate() {
        if let Some(id) = n.attrs.get("id") {
            if ids.insert(id.clone(), i).is_some() {
                return Err(fail(format!("duplicate visual id `{id}`")));
            }
        }
    }
    if ids.len() > limits::IDS {
        return Err(fail("visual ID limit exceeded".into()));
    }
    let mut dependencies: BTreeMap<usize, BTreeSet<usize>> = BTreeMap::new();
    let mut references = Vec::new();
    for (i, n) in nodes.iter().enumerate() {
        for (a, v) in &n.attrs {
            let reference = match a.as_str() {
                "fill" | "stroke" => policy::fragment(v).map(|id| (id, "gradient")),
                "clip-path" => policy::fragment(v).map(|id| (id, "clipPath")),
                "filter" => policy::fragment(v).map(|id| (id, "filter")),
                "href" if matches!(n.tag.as_str(), "linearGradient" | "radialGradient") => Some((
                    v.strip_prefix('#')
                        .filter(|s| policy::visual_id(s))
                        .ok_or_else(|| fail("gradient href must be local fragment".into()))?,
                    "gradient",
                )),
                _ => None,
            };
            if let Some((id, kind)) = reference {
                let j = *ids
                    .get(id)
                    .ok_or_else(|| fail(format!("missing fragment `{id}`")))?;
                let target = &nodes[j].tag;
                let valid = if kind == "gradient" {
                    matches!(target.as_str(), "linearGradient" | "radialGradient")
                } else {
                    target == kind
                };
                if !valid {
                    return Err(fail(format!("fragment `{id}` has wrong resource type")));
                }
                dependencies.entry(i).or_default().insert(j);
                references.push((i, a.clone(), j));
            }
        }
    }
    if references.len() > limits::REFERENCES {
        return Err(fail("visual reference limit exceeded".into()));
    }
    // Containment contributes to definition dependencies; references cannot recurse via ancestors.
    for (i, n) in nodes.iter().enumerate() {
        if policy::definition(&n.tag) {
            for c in &n.children {
                if let Child::Node(j) = c {
                    dependencies.entry(i).or_default().insert(*j);
                }
            }
        }
    }
    fn visit(
        i: usize,
        edges: &BTreeMap<usize, BTreeSet<usize>>,
        marks: &mut [u8],
        depths: &mut [usize],
        stack_depth: usize,
    ) -> Option<usize> {
        if stack_depth > 8 {
            return None;
        }
        if marks[i] == 1 {
            return None;
        }
        if marks[i] == 2 {
            return Some(depths[i]);
        }
        marks[i] = 1;
        let mut depth = 0;
        if let Some(js) = edges.get(&i) {
            for j in js {
                depth = depth.max(visit(*j, edges, marks, depths, stack_depth + 1)? + 1);
                if depth > 8 {
                    return None;
                }
            }
        }
        marks[i] = 2;
        depths[i] = depth;
        Some(depth)
    }
    let mut marks = vec![0; nodes.len()];
    let mut depths = vec![0; nodes.len()];
    for i in 0..nodes.len() {
        if visit(i, &dependencies, &mut marks, &mut depths, 0).is_none() {
            return Err(fail("cyclic/depth>8 visual references".into()));
        }
    }
    let filters = nodes.iter().filter(|n| n.tag == "filter").count();
    if filters > limits::FILTERS {
        return Err(fail("filter count exceeds 16".into()));
    }
    for n in &nodes {
        if matches!(n.tag.as_str(), "linearGradient" | "radialGradient") {
            let mut prev = 0.;
            for c in &n.children {
                if let Child::Node(j) = c {
                    if nodes[*j].tag == "stop" {
                        let offset = nodes[*j]
                            .attrs
                            .get("offset")
                            .ok_or_else(|| fail("stop requires offset".into()))?;
                        let x = policy::length(offset, true).map_err(|e| fail(e.into()))?;
                        if x < prev {
                            return Err(fail("gradient offsets must be ordered".into()));
                        }
                        prev = x;
                    }
                }
            }
        }
        if n.tag == "filter" {
            filter_inputs(n, &nodes).map_err(|e| fail(e.into()))?;
        }
    }
    let mut boxes = vec![None; nodes.len()];
    for i in (0..nodes.len()).rev() {
        boxes[i] = geometry(&nodes[i], &nodes, &boxes).map_err(|e| fail(e.into()))?;
        if let Some(b) = boxes[i] {
            let projected = b.transform(nodes[i].world);
            if [projected.x0, projected.y0, projected.x1, projected.y1]
                .iter()
                .any(|v| !v.is_finite() || v.abs() > 1_000_000.)
            {
                return Err(fail(
                    "world-space geometry exceeds coordinate budget".into(),
                ));
            }
        }
    }
    let mut filtered = 0;
    let mut surface = 0.;
    for (i, n) in nodes.iter().enumerate() {
        if let Some(j) = n
            .attrs
            .get("filter")
            .and_then(|v| policy::fragment(v))
            .and_then(|v| ids.get(v))
        {
            filtered += 1;
            let f = &nodes[*j];
            let bbox =
                boxes[i].ok_or_else(|| fail("filter requires bounded drawable geometry".into()))?;
            let bw = bbox.x1 - bbox.x0;
            let bh = bbox.y1 - bbox.y0;
            let units = f
                .attrs
                .get("filterUnits")
                .map(String::as_str)
                .unwrap_or("objectBoundingBox");
            let w = region(f, "width", "120%", bw, units).map_err(|e| fail(e.into()))?;
            let h = region(f, "height", "120%", bh, units).map_err(|e| fail(e.into()))?;
            let _x = region(f, "x", "-10%", bw, units).map_err(|e| fail(e.into()))?;
            let _y = region(f, "y", "-10%", bh, units).map_err(|e| fail(e.into()))?;
            if [_x, _y, w, h]
                .iter()
                .any(|v| !v.is_finite() || v.abs() > 1_000_000.)
            {
                return Err(fail("resolved filter coordinates exceed bounds".into()));
            }
            let world = n.world;
            let trace =
                world.a * world.a + world.b * world.b + world.c * world.c + world.d * world.d;
            let det = world.a * world.d - world.b * world.c;
            let scale2 = (trace + (trace * trace - 4. * det * det).max(0.).sqrt()) / 2.;
            let area = w * h * scale2;
            let bbox_units = f
                .attrs
                .get("primitiveUnits")
                .is_some_and(|s| s == "objectBoundingBox");
            let (ux, uy) = if bbox_units { (bw, bh) } else { (1., 1.) };
            for c in &f.children {
                if let Child::Node(j) = c {
                    let primitive = &nodes[*j];
                    if let Some(v) = primitive.attrs.get("stdDeviation") {
                        let ns = policy::numbers(v).map_err(|e| fail(e.into()))?;
                        if ns[0] * ux * scale2.sqrt() > 16.
                            || ns.get(1).copied().unwrap_or(ns[0]) * uy * scale2.sqrt() > 16.
                        {
                            return Err(fail("resolved/transformed blur exceeds 16 CSS px".into()));
                        }
                    }
                    let dx = primitive
                        .attrs
                        .get("dx")
                        .map(|s| policy::number(s))
                        .transpose()
                        .map_err(|e| fail(e.into()))?
                        .unwrap_or(0.)
                        * ux;
                    let dy = primitive
                        .attrs
                        .get("dy")
                        .map(|s| policy::number(s))
                        .transpose()
                        .map_err(|e| fail(e.into()))?
                        .unwrap_or(0.)
                        * uy;
                    if (world.a * dx + world.c * dy).abs() > 64.
                        || (world.b * dx + world.d * dy).abs() > 64.
                    {
                        return Err(fail(
                            "resolved/transformed filter offset exceeds 64 CSS px".into(),
                        ));
                    }
                }
            }

            if area < 0.
                || !area.is_finite()
                || area > f64::from(viewport.width) * f64::from(viewport.height) * 2.
                || area > 16_777_216.
            {
                return Err(fail("filter region exceeds bounded surface profile".into()));
            }
            surface += area;
        }
    }
    if filtered > limits::FILTERED || surface > 32_000_000. {
        return Err(fail(
            "aggregate filtered element/surface budget exceeded".into(),
        ));
    }
    let mut targets = Vec::new();
    for n in doc.descendants().filter(|n| n.is_element()) {
        let i = index[&n.id()];
        let a = &nodes[i].attrs;
        if let Some(id) = a.get("data-prototype-id") {
            if !policy::rendered(&nodes[i].tag)
                || n.ancestors()
                    .any(|p| p.is_element() && policy::definition(p.tag_name().name()))
            {
                return Err(fail(
                    "prototype target prohibited on definition node/subtree".into(),
                ));
            }
            let id = TargetId::new(id).map_err(|_| fail("malformed target marker".into()))?;
            let ancestors: Vec<_> = n
                .ancestors()
                .skip(1)
                .filter_map(|p| {
                    index
                        .get(&p.id())
                        .and_then(|j| nodes[*j].attrs.get("data-prototype-id"))
                })
                .map(|s| TargetId::new(s).unwrap())
                .collect();
            let hidden = |name: &str, value: &str| {
                n.ancestors().skip(1).any(|p| {
                    index.get(&p.id()).is_some_and(|j| {
                        !nodes[*j].attrs.contains_key("data-prototype-id")
                            && nodes[*j].attrs.get(name).is_some_and(|v| v == value)
                    })
                })
            };
            targets.push(TargetRecord {
                id,
                kind: if nodes[i].tag == "g" {
                    TargetKind::Group
                } else {
                    TargetKind::Rendered
                },
                ancestors,
                survived_sanitation: true,
                ancestor_display_none: hidden("display", "none"),
                ancestor_visibility_hidden: hidden("visibility", "hidden"),
                display_none: a.get("display").is_some_and(|v| v == "none"),
                visibility_hidden: a.get("visibility").is_some_and(|v| v == "hidden"),
            });
        }
    }
    if targets.len() > igproto_model::limits::TARGETS_PER_SCENE {
        return Err(fail("scene target budget exceeded".into()));
    }
    let mut unique = BTreeSet::new();
    for t in &targets {
        if !unique.insert(&t.id) {
            let mut r = error(
                Code::DuplicateTarget,
                Stage::Model,
                &member,
                format!("scene `{scene}` repeats target `{}`", t.id),
            );
            r.diagnostics[0].scene = Some(scene.clone());
            r.diagnostics[0].target = Some(t.id.clone());
            return Err(r);
        }
    }
    // Stable visual IDs affect only presentation references, never prototype IDs.
    let names: BTreeMap<_, _> = nodes
        .iter()
        .enumerate()
        .filter(|(_, n)| n.attrs.contains_key("id"))
        .enumerate()
        .map(|(k, (i, _))| (i, format!("v{k}")))
        .collect();
    for (i, name) in &names {
        nodes[*i].attrs.insert("id".into(), name.clone());
    }
    for (i, a, j) in references {
        nodes[i].attrs.insert(
            a.clone(),
            if a == "href" {
                format!("#{}", names[&j])
            } else {
                format!("url(#{})", names[&j])
            },
        );
    }
    nodes[0].attrs.insert("xmlns".into(), SVG_NS.into());
    nodes[0].attrs.insert(
        "viewBox".into(),
        format!("0 0 {} {}", viewport.width, viewport.height),
    );
    if offset != (0., 0.) {
        let children = std::mem::take(&mut nodes[0].children);
        let j = nodes.len();
        nodes.push(Node {
            tag: "g".into(),
            attrs: BTreeMap::from([(
                "transform".into(),
                format!("translate({} {})", -offset.0, -offset.1),
            )]),
            children,
            matrix: Transform::default(),
            world: Transform::default(),
        });
        nodes[0].children.push(Child::Node(j));
    }
    let mut output = String::new();
    serialize(0, &nodes, &mut output);
    if output.len() > limits::SVG {
        return Err(fail("normalized SVG exceeds byte budget".into()));
    }
    warnings.truncate(limits::DIAGNOSTICS);
    Ok(Scene {
        bytes: output.into_bytes(),
        targets,
        arial_text,
        elements: nodes.len(),
        path_items,
        assets,
        warnings,
    })
}
fn region(
    n: &Node,
    a: &str,
    default: &str,
    side: f64,
    units: &str,
) -> std::result::Result<f64, &'static str> {
    let s = n.attrs.get(a).map(String::as_str).unwrap_or(default);
    let v = policy::length(s, true)?;
    Ok(if units == "objectBoundingBox" || s.ends_with('%') {
        v * side
    } else {
        v
    })
}
fn filter_inputs(n: &Node, nodes: &[Node]) -> std::result::Result<(), &'static str> {
    let mut names = BTreeSet::from(["SourceGraphic".to_string(), "SourceAlpha".to_string()]);
    let primitives: Vec<_> = n
        .children
        .iter()
        .filter_map(|c| match c {
            Child::Node(i) if nodes[*i].tag != "title" && nodes[*i].tag != "desc" => Some(*i),
            _ => None,
        })
        .collect();
    if primitives.len() > 8 {
        return Err("filter exceeds eight primitives");
    }
    for j in primitives {
        let p = &nodes[j];
        for i in std::iter::once(p).chain(p.children.iter().filter_map(|c| {
            if let Child::Node(i) = c {
                Some(&nodes[*i])
            } else {
                None
            }
        })) {
            for a in ["in", "in2"] {
                if let Some(v) = i.attrs.get(a) {
                    if !names.contains(v) {
                        return Err(
                            "filter input must be SourceGraphic/SourceAlpha or earlier result",
                        );
                    }
                }
            }
            if i.tag == "feComposite" && !i.attrs.contains_key("in2") {
                return Err("composite requires in2");
            }
        }
        if let Some(result) = p.attrs.get("result") {
            if !names.insert(result.clone()) {
                return Err("duplicate/reserved filter result");
            }
        }
    }
    Ok(())
}
fn geometry(
    n: &Node,
    nodes: &[Node],
    boxes: &[Option<Box2>],
) -> std::result::Result<Option<Box2>, &'static str> {
    let num = |a: &str, default: f64| {
        n.attrs
            .get(a)
            .map(|s| policy::length(s, false))
            .unwrap_or(Ok(default))
    };
    let mut b = match n.tag.as_str() {
        "path" => n
            .attrs
            .get("d")
            .map(|s| path(s).map(|(_, b)| b))
            .transpose()?
            .flatten(),
        "polyline" | "polygon" => {
            let mut b: Option<Box2> = None;
            if let Some(s) = n.attrs.get("points") {
                for p in policy::numbers(s)?.chunks_exact(2) {
                    let q = Box2::point(p[0], p[1]);
                    b = Some(b.map_or(q, |b| b.union(q)));
                }
            }
            b
        }
        "rect" | "image" => {
            let (x, y) = (num("x", 0.)?, num("y", 0.)?);
            Some(Box2 {
                x0: x,
                y0: y,
                x1: x + num("width", 0.)?,
                y1: y + num("height", 0.)?,
            })
        }
        "circle" | "ellipse" => {
            let (x, y) = (num("cx", 0.)?, num("cy", 0.)?);
            let (rx, ry) = if n.tag == "circle" {
                let r = num("r", 0.)?;
                (r, r)
            } else {
                (num("rx", 0.)?, num("ry", 0.)?)
            };
            Some(Box2 {
                x0: x - rx,
                y0: y - ry,
                x1: x + rx,
                y1: y + ry,
            })
        }
        "line" => Some(
            Box2::point(num("x1", 0.)?, num("y1", 0.)?)
                .union(Box2::point(num("x2", 0.)?, num("y2", 0.)?)),
        ),
        "text" | "tspan" => Some(text_bounds(n, nodes)?),
        _ => None,
    };
    for c in &n.children {
        if let Child::Node(j) = c {
            if !policy::definition(&nodes[*j].tag) {
                if let Some(q) = boxes[*j] {
                    let q = q.transform(nodes[*j].matrix);
                    b = Some(b.map_or(q, |b| b.union(q)));
                }
            }
        }
    }
    if let Some(b) = b {
        if [b.x0, b.y0, b.x1, b.y1]
            .iter()
            .any(|v| !v.is_finite() || v.abs() > 1_000_000.)
        {
            return Err("computed geometry outside coordinate budget");
        }
    }
    Ok(b)
}

// Conservative text allocation bounds include all positions and inherited spacing;
// text is never reflowed or rewritten to make a filter fit.
fn text_bounds(n: &Node, nodes: &[Node]) -> std::result::Result<Box2, &'static str> {
    fn lengths(n: &Node, a: &str) -> std::result::Result<Vec<f64>, &'static str> {
        n.attrs
            .get(a)
            .map(|s| {
                svgtypes::LengthListParser::from(s.as_str())
                    .map(|v| v.map(|v| v.number))
                    .collect::<std::result::Result<Vec<_>, _>>()
                    .map_err(|_| "invalid text geometry")
            })
            .unwrap_or(Ok(vec![]))
    }
    fn stats(
        n: &Node,
        nodes: &[Node],
    ) -> std::result::Result<(usize, f64, f64, f64), &'static str> {
        let size = n
            .attrs
            .get("font-size")
            .map(|v| policy::length(v, false))
            .transpose()?
            .unwrap_or(16.);
        let spacing = n
            .attrs
            .get("letter-spacing")
            .map(|v| policy::length(v, false))
            .transpose()?
            .unwrap_or(0.);
        let mut chars = 0;
        let mut advance = size + spacing.abs();
        let mut dx = lengths(n, "dx")?.iter().map(|n| n.abs()).sum::<f64>();
        let mut dy = lengths(n, "dy")?.iter().map(|n| n.abs()).sum::<f64>();
        for c in &n.children {
            match c {
                Child::Text(t) => chars += t.len(),
                Child::Node(j) if nodes[*j].tag == "tspan" => {
                    let (len, step, x, y) = stats(&nodes[*j], nodes)?;
                    chars += len;
                    let m = nodes[*j].matrix;
                    let norm = (m.a.abs() + m.b.abs()).max(m.c.abs() + m.d.abs()).max(1.);
                    advance = advance.max(step * norm);
                    dx += x * norm;
                    dy += y * norm;
                }
                _ => (),
            }
        }
        Ok((chars, advance, dx, dy))
    }
    let xs = lengths(n, "x")?;
    let ys = lengths(n, "y")?;
    let (chars, advance, dx, dy) = stats(n, nodes)?;
    let x0 = xs.iter().copied().reduce(f64::min).unwrap_or(0.);
    let x1 = xs.iter().copied().reduce(f64::max).unwrap_or(0.);
    let y0 = ys.iter().copied().reduce(f64::min).unwrap_or(0.);
    let y1 = ys.iter().copied().reduce(f64::max).unwrap_or(0.);
    let width = chars as f64 * advance + dx;
    let height = advance + dy;
    Ok(Box2 {
        x0: x0 - width,
        y0: y0 - height,
        x1: x1 + width,
        y1: y1 + height,
    })
}
