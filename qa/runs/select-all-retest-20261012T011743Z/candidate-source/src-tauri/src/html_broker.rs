use super::*;
pub(super) fn open_impl(
    state: &AppState,
    service: &HtmlService,
    target: LocalTarget,
    expected: Option<&str>,
) -> AppResult<LocalView> {
    crate::document_view::open_impl(state, service, target, expected, &igproto_package::Control::new(std::time::Duration::from_secs(5)))
}
pub(crate) fn open_granted(state: &AppState, service: &HtmlService, grant: FileGrant, expected: Option<&str>) -> AppResult<LocalView> {
    let file = current(state, &grant)?;
    let identity_key = key(grant.identity);
    if expected.is_some_and(|value| value != identity_key) {
        return Err(err("reselection_required", "Expected identity changed"));
    }
    let kind = crate::document_view::kind(&grant.name);
    let bytes = scope::size(&file)?;
    let disk_version = if kind == "html" {
        let data = bounded_bytes(&file, MAX_HTML).map_err(|e| {
            if e.code == "oversize" {
                err("html_limit", "HTML exceeds 4 MiB")
            } else {
                e
            }
        })?;
        std::str::from_utf8(&data).map_err(|_| err("encoding", "HTML must be UTF-8"))?;
        current(state, &grant)?;
        format!("{:x}", Sha256::digest(&data))
    } else {
        stamp_key(&file)?
    };
    let token = (kind == "html").then(|| Uuid::new_v4().to_string());
    let descriptor = LocalView {
        prototype: None,
        file_id: grant.id.clone(),
        identity_key,
        disk_version,
        name: grant.name.clone(),
        display_path: grant.display_path.clone(),
        kind,
        view_token: token.clone(),
        generation: 1,
        bytes,
        extension: Path::new(&grant.name)
            .extension()
            .and_then(|ext| ext.to_str())
            .unwrap_or("")
            .to_ascii_lowercase(),
    };
    if let Some(token) = token {
        let mut views = lock(service)?;
        if views.len() >= 16 {
            return Err(err("html_limit", "At most 16 live HTML views"));
        }
        views.insert(
            token.clone(),
            View {
                descriptor: descriptor.clone(),
                source: grant,
                state: HtmlState {
                    view_token: token,
                    generation: 1,
                    revision: 0,
                    request_id: 0,
                    state: "opening".into(),
                    reason_code: None,
                    issues: vec![],
                    headings: vec![],
                    location: HtmlLocation {
                        zoom: 1.0,
                        ..Default::default()
                    },
                },
                assets: vec![],
                resources: HashMap::new(),
                total: 0,
                css_bytes: 0,
                font_bytes: 0,
                resource_requests: 0,
                image_decoded: 0,
                started: Instant::now(),
                document_loaded: false,
                baseline: Baseline::default(),
                last_request: 0,
                pending_links: HashMap::new(),
                access_requests: HashMap::new(),
                css_graph: HashMap::new(),
                css_imports: 0,
                issue_urls: HashMap::new(),
                source_stamp: stamp_key(&file)?,
            },
        );
    }
    Ok(descriptor)
}
pub(super) fn checked<'a>(
    views: &'a mut HashMap<String, View>,
    token: &str,
    generation: u64,
    request: Option<u64>,
) -> AppResult<&'a mut View> {
    let v = views
        .get_mut(token)
        .filter(|v| v.state.generation == generation)
        .ok_or_else(|| err("stale_view", "HTML view expired"))?;
    if let Some(request) = request {
        if request <= v.last_request {
            return Err(err("stale_request", "HTML request superseded"));
        }
        v.last_request = request;
        v.state.request_id = request;
    }
    Ok(v)
}
pub(super) fn issue(v: &mut View, raw: &str, kind: &str, reason: &str) {
    if raw.len() > 4096 {
        return;
    }
    if v.state.issues.len() < 128
        && !v.state.issues.iter().any(|i| {
            v.issue_urls.get(&i.id).is_some_and(|url| url == raw)
                && i.kind == kind
                && i.reason == reason
        })
    {
        let id = Uuid::new_v4().to_string();
        v.issue_urls.insert(id.clone(), raw.into());
        v.state.issues.push(ResourceIssue {
            id,
            declared_url: raw.chars().take(2048).collect(),
            kind: kind.into(),
            reason: reason.into(),
        });
        v.state.revision += 1;
    }
}
pub(super) fn resource_kind(v: &View, raw: &str) -> &'static str {
    tauri::Url::parse(raw)
        .ok()
        .and_then(|url| resource_path(&url, &v.state.view_token).ok())
        .map(|parts| {
            if parts == source_url_parts(&v.source) {
                "document"
            } else {
                mime(&parts).map(|(_, kind, _)| kind).unwrap_or("resource")
            }
        })
        .unwrap_or("resource")
}
pub(super) fn resource_path(url: &tauri::Url, token: &str) -> AppResult<Vec<String>> {
    if url.scheme() != "ig-html"
        || url.host_str() != Some(token)
        || !url.username().is_empty()
        || url.password().is_some()
        || url.port().is_some()
    {
        return Err(err(
            "remote_blocked",
            "Only this view's broker origin is allowed",
        ));
    }
    let mut parts = vec![];
    for part in url.path().split('/').filter(|p| !p.is_empty()) {
        let part = percent_encoding::percent_decode_str(part)
            .decode_utf8()
            .map_err(|_| err("encoding", "Invalid URL encoding"))?;
        scope::validate_segment(&part)?;
        if part.contains(':') {
            return Err(err("outside_grant", "URL scheme is not a path"));
        }
        parts.push(part.into_owned());
    }
    if parts.is_empty() || parts.len() > 64 {
        return Err(err("outside_grant", "Invalid resource path"));
    }
    Ok(parts)
}
// URL ancestry is a naming coordinate, never a filesystem capability.
pub(super) fn resource_base(state: &AppState, source: &FileGrant) -> AppResult<PathBuf> {
    match &source.source {
        FileSource::Root { root_id, .. } => Ok(state.root(root_id)?.path),
        _ => Path::new(&source.display_path)
            .ancestors()
            .last()
            .map(Path::to_path_buf)
            .ok_or_else(|| err("outside_grant", "No resource naming base")),
    }
}
pub(super) fn source_url_parts(source: &FileGrant) -> Vec<String> {
    match &source.source {
        FileSource::Root { segments, .. } => segments.clone(),
        _ => Path::new(&source.display_path)
            .components()
            .filter_map(|part| match part {
                std::path::Component::Normal(p) => Some(p.to_string_lossy().into_owned()),
                _ => None,
            })
            .collect(),
    }
}
pub(super) fn resource_file(
    state: &AppState,
    v: &View,
    parts: &[String],
) -> AppResult<(File, PathBuf)> {
    current(state, &v.source)?;
    let mut missing_in_root = false;
    let path = if let FileSource::Root { root_id, .. } = &v.source.source {
        let root = state.root(root_id)?;
        let path = root.path.join(parts.join("/"));
        match scope::open_relative(&root.file, parts, false) {
            Ok(file) => return Ok((file, path)),
            Err(e) if e.code != "missing" => return Err(e),
            Err(_) => {
                missing_in_root = true;
                path
            }
        }
    } else {
        // Volume-root naming preserves ../ resolution without granting that root.
        resource_base(state, &v.source)?.join(parts.join("/"))
    };
    for selected in &v.assets {
        let now = scope::open_selected(&selected.path, selected.folder)?;
        if scope::identity(&now)? != selected.identity {
            return Err(err("changed", "Resource selection replaced"));
        }
        if selected.folder {
            if let Ok(relative) = path.strip_prefix(&selected.path) {
                let segments: Vec<_> = relative
                    .iter()
                    .map(|p| p.to_string_lossy().into_owned())
                    .collect();
                return Ok((
                    scope::open_relative(&selected.file, &segments, false)?,
                    path,
                ));
            }
        } else if path == selected.path {
            return Ok((now, path));
        }
    }
    Err(if missing_in_root {
        err("missing", "Resource not found")
    } else {
        err("outside_grant", "Resource needs deliberate selection")
    })
}
pub(super) fn mime(parts: &[String]) -> AppResult<(&'static str, &'static str, usize)> {
    match parts
        .last()
        .and_then(|p| p.rsplit('.').next())
        .unwrap_or("")
        .to_ascii_lowercase()
        .as_str()
    {
        "css" => Ok(("text/css; charset=utf-8", "stylesheet", 1024 * 1024)),
        "png" => Ok(("image/png", "image", 16 * 1024 * 1024)),
        "jpg" | "jpeg" => Ok(("image/jpeg", "image", 16 * 1024 * 1024)),
        "gif" => Ok(("image/gif", "image", 16 * 1024 * 1024)),
        "webp" => Ok(("image/webp", "image", 16 * 1024 * 1024)),
        "woff" => Ok(("font/woff", "font", 8 * 1024 * 1024)),
        "woff2" => Ok(("font/woff2", "font", 8 * 1024 * 1024)),
        "ttf" => Ok(("font/ttf", "font", 8 * 1024 * 1024)),
        "otf" => Ok(("font/otf", "font", 8 * 1024 * 1024)),
        _ => Err(err(
            "unsupported",
            "Embedded SVG, documents, media and unknown resources are unsupported",
        )),
    }
}
pub(super) fn font_magic(data: &[u8]) -> bool {
    [b"wOFF".as_slice(), b"wOF2", b"OTTO", b"\0\x01\0\0", b"true"]
        .iter()
        .any(|m| data.starts_with(m))
}
/// Each request reopens and revalidates the current grant and file, even a repeat URL.
pub(super) fn resource_impl(
    state: &AppState,
    service: &HtmlService,
    token: &str,
    raw: &str,
) -> AppResult<(Vec<u8>, &'static str)> {
    // Serialize broker reads, but never hold ownership/state locks across I/O.
    let _permit = service
        .resources_gate
        .lock()
        .map_err(|_| err("internal", "Resource queue unavailable"))?;
    let mut draft = lock(service)?
        .get(token)
        .cloned()
        .ok_or_else(|| err("stale_view", "HTML view disposed"))?;
    #[cfg(test)]
    if let Some(hook) = service.read_hook.lock().unwrap().clone() {
        hook();
    }
    {
        let mut views = lock(service)?;
        checked(&mut views, token, draft.state.generation, None)?;
    }
    let result = resource_read(state, token, raw, &mut draft);
    let mut views = lock(service)?;
    let live = checked(&mut views, token, draft.state.generation, None)?;
    if live.source_stamp != draft.source_stamp {
        return Err(err("changed", "Source superseded during resource read"));
    }
    live.resources = draft.resources;
    live.total = draft.total;
    live.css_bytes = draft.css_bytes;
    live.font_bytes = draft.font_bytes;
    live.resource_requests = draft.resource_requests;
    live.image_decoded = draft.image_decoded;
    live.document_loaded = draft.document_loaded;
    live.css_graph = draft.css_graph;
    live.css_imports = draft.css_imports;
    if result.is_err() && resource_kind(live, raw) == "document" {
        live.state.state = "failed".into();
        live.state.reason_code = result.as_ref().err().map(|e| e.code.into());
    }
    for item in draft.state.issues {
        if live.state.issues.len() < 128
            && !live.state.issues.iter().any(|old| {
                live.issue_urls.get(&old.id) == draft.issue_urls.get(&item.id)
                    && old.kind == item.kind
                    && old.reason == item.reason
            })
        {
            if let Some(raw) = draft.issue_urls.get(&item.id) {
                live.issue_urls.insert(item.id.clone(), raw.clone());
            }
            live.state.issues.push(item);
            live.state.revision += 1;
        }
    }
    result
}
fn resource_read(
    state: &AppState,
    token: &str,
    raw: &str,
    v: &mut View,
) -> AppResult<(Vec<u8>, &'static str)> {
    let result = (|| {
        if raw.len() > 4096 {
            return Err(err("limit", "Resource URL too long"));
        }
        if v.started.elapsed().as_secs() >= 5 {
            return Err(err("limit", "HTML load deadline exceeded; reload to retry"));
        }
        if stamp_key(&current(state, &v.source)?)? != v.source_stamp {
            return Err(err("changed", "HTML changed; reload"));
        }
        let url =
            tauri::Url::parse(raw).map_err(|_| err("outside_grant", "Malformed resource URL"))?;
        let parts = resource_path(&url, token)?;
        let source_parts = source_url_parts(&v.source);
        if parts == source_parts && !v.document_loaded {
            let file = current(state, &v.source)?;
            let data = bounded_bytes(&file, MAX_HTML)?;
            let text =
                std::str::from_utf8(&data).map_err(|_| err("encoding", "HTML must be UTF-8"))?;
            if format!("{:x}", Sha256::digest(&data)) != v.descriptor.disk_version {
                return Err(err("changed", "HTML changed before mount; reload"));
            }
            if stamp_key(&current(state, &v.source)?)? != v.source_stamp {
                return Err(err("changed", "HTML changed while reading"));
            }
            v.document_loaded = true;
            scan_remote(v, text);
            // CSP is a response header, not author-overridable markup. Baseline precedes author CSS.
            // Preserve authored canvas/inheritance semantics. Reading fallback applies
            // only when there is no authored styling, conservatively detected.
            static AUTHORED_STYLE: OnceLock<regex::Regex> = OnceLock::new();
            let styled = AUTHORED_STYLE
                .get_or_init(|| {
                    regex::Regex::new(
                        r#"(?is)<style\b|\sstyle\s*=|<link\b[^>]*\brel\s*=\s*["']?[^>]*stylesheet"#,
                    )
                    .unwrap()
                })
                .is_match(text);
            let mut out = if styled {
                Vec::new()
            } else {
                let family = match v.baseline.font.as_str() {
                    "serif" => "Georgia,serif",
                    "sans" => "system-ui,sans-serif",
                    "mono" => "IGRobotoMono,monospace",
                    _ => "IGRoboto,sans-serif",
                };
                format!("<!doctype html><style>@font-face{{font-family:IGRoboto;src:url('ig-html://{token}/__ig_assets/roboto.ttf')}}@font-face{{font-family:IGRobotoMono;src:url('ig-html://{token}/__ig_assets/mono.ttf')}}:where(html){{font:{}px/{} {};color:#202826}}:where(body){{margin:24px}}:where(a){{text-decoration:underline}}</style>", v.baseline.size, v.baseline.line_height, family).into_bytes()
            };
            let presentation = without_network_hints(text)?;
            out.extend_from_slice(presentation.as_bytes());
            return Ok((out, "text/html; charset=utf-8"));
        }
        if parts.len() == 2 && parts[0] == "__ig_assets" {
            let data: &[u8] = match parts[1].as_str() {
                "roboto.ttf" => include_bytes!("../../src/assets/fonts/Roboto[wdth,wght].ttf"),
                "mono.ttf" => include_bytes!("../../src/assets/fonts/RobotoMono[wght].ttf"),
                _ => return Err(err("unsupported", "Unknown bundled presentation asset")),
            };
            v.resource_requests += 1;
            if v.resource_requests > MAX_RESOURCES
                || v.font_bytes + data.len() > 8 * 1024 * 1024
                || v.total + data.len() > MAX_TOTAL
            {
                return Err(err("limit", "Bundled asset budget exceeded"));
            }
            v.font_bytes += data.len();
            v.total += data.len();
            return Ok((data.to_vec(), "font/ttf"));
        }
        let (mime, kind, max) = mime(&parts)?;
        v.resource_requests += 1;
        if v.resource_requests > MAX_RESOURCES {
            return Err(err("limit", "128 resource budget reached"));
        }
        let (file, path) = resource_file(state, v, &parts)?;
        let identity = scope::identity(&file)?;
        let before_stamp = stamp_key(&file)?;
        if v.resources.get(&path).is_some_and(|(old, stamp)| {
            *old != identity || stamp_key(&file).as_ref().ok() != Some(stamp)
        }) {
            return Err(err("changed", "Resource identity changed; reload"));
        }
        let len = usize::try_from(scope::size(&file)?)
            .map_err(|_| err("limit", "Resource size overflow"))?;
        if len > max {
            return Err(err("limit", "Resource file budget exceeded"));
        }
        let reservation = len
            .checked_add(1)
            .ok_or_else(|| err("limit", "Resource size overflow"))?;
        if reservation > MAX_TOTAL.saturating_sub(v.total) {
            return Err(err("limit", "64 MiB resource budget reached"));
        }
        if kind == "stylesheet" && len > (4usize * 1024 * 1024).saturating_sub(v.css_bytes) {
            return Err(err("limit", "4 MiB stylesheet budget reached"));
        }
        if kind == "font" && len > (8usize * 1024 * 1024).saturating_sub(v.font_bytes) {
            return Err(err("limit", "8 MiB font budget reached"));
        }
        // Reserve before I/O, including failed validation and one bounded growth byte.
        v.total += reservation;
        if kind == "stylesheet" {
            v.css_bytes += len;
        }
        if kind == "font" {
            v.font_bytes += len;
        }
        let data = bounded_bytes(&file, len)?;
        let (after, _) = resource_file(state, v, &parts)?;
        if scope::identity(&after)? != identity || stamp_key(&after)? != before_stamp {
            return Err(err("changed", "Resource replaced while reading"));
        }
        if kind == "stylesheet" {
            let text = std::str::from_utf8(&data)
                .map_err(|_| err("encoding", "Stylesheet must be UTF-8"))?;
            // Browser resolves nested imports; the same broker budget and grant checks apply.
            check_css_imports(v, &url, text)?;
            scan_remote(v, text);
        }
        if kind == "image" {
            let decoded = image_budget::decoded_budget(&data, mime)?;
            if v.image_decoded + decoded > 128 * 1024 * 1024 {
                return Err(err(
                    "image_limit",
                    "128 MiB total decoded image estimate exceeded",
                ));
            }
            v.image_decoded += decoded;
        }
        if kind == "font" {
            if !font_magic(&data) {
                return Err(err("unsupported", "Unrecognized font signature"));
            }
        }
        v.resources.insert(path, (identity, stamp_key(&file)?));
        Ok((data, mime))
    })();
    if let Err(e) = &result {
        let kind = resource_kind(v, raw);
        issue(v, raw, kind, e.code);
    }
    result
}
pub(super) fn scan_remote(v: &mut View, text: &str) {
    // Diagnostics only. Enforcement is CSP plus the engine network blocker.
    for word in
        text.split(|c: char| c.is_whitespace() || matches!(c, '\'' | '"' | '(' | ')' | '<' | '>'))
    {
        if word.starts_with("http:") || word.starts_with("https:") || word.starts_with("//") {
            issue(v, word, "resource", "remote_blocked");
        }
    }
}
pub(super) fn start_url(v: &View) -> String {
    let parts = source_url_parts(&v.source);
    let mut url = tauri::Url::parse(&format!("ig-html://{}/", v.state.view_token)).unwrap();
    url.path_segments_mut().unwrap().extend(parts);
    url.to_string()
}
pub(super) fn css_key(url: &tauri::Url) -> String {
    let mut url = url.clone();
    url.set_fragment(None);
    url.set_query(None);
    url.to_string()
}
pub(super) fn check_css_imports(v: &mut View, base: &tauri::Url, text: &str) -> AppResult<()> {
    // Recognize static @import forms. Exotic/escaped forms still cross the broker
    // and global count/byte/deadline limits, but are rejected below to bound depth.
    static IMPORT: OnceLock<regex::Regex> = OnceLock::new();
    let re = IMPORT.get_or_init(|| {
        regex::Regex::new(r#"(?i)@import\s+(?:url\(\s*)?["']?([^"'\s);]+)"#).unwrap()
    });
    if text.contains('\\') {
        return Err(err(
            "unsupported",
            "Escaped CSS is unsupported by the bounded import policy",
        ));
    }
    if text.to_ascii_lowercase().matches("@import").count() != re.captures_iter(text).count() {
        return Err(err("unsupported", "Unrecognized CSS import syntax"));
    }
    let mut targets = vec![];
    for captures in re.captures_iter(text) {
        if v.css_imports >= 128 {
            return Err(err("limit", "CSS import count exceeded"));
        }
        v.css_imports += 1;
        let raw = &captures[1];
        if raw.contains('\\') {
            return Err(err("unsupported", "Escaped CSS imports unsupported"));
        }
        let url = base
            .join(raw)
            .map_err(|_| err("unsupported", "Malformed CSS import"))?;
        if url.scheme() == "ig-html" && url.host_str() == base.host_str() {
            targets.push(css_key(&url));
        }
    }
    v.css_graph.insert(css_key(base), targets);
    fn walk(
        graph: &HashMap<String, Vec<String>>,
        node: &str,
        active: &mut HashSet<String>,
        done: &mut HashSet<(String, usize)>,
        depth: usize,
    ) -> AppResult<()> {
        if depth > 8 {
            return Err(err("limit", "CSS import depth exceeds 8"));
        }
        if active.contains(node) {
            return Err(err("limit", "CSS import cycle"));
        }
        if done.contains(&(node.into(), depth)) {
            return Ok(());
        }
        active.insert(node.into());
        if let Some(children) = graph.get(node) {
            for next in children {
                walk(graph, next, active, done, depth + 1)?;
            }
        }
        active.remove(node);
        done.insert((node.into(), depth));
        Ok(())
    }
    let mut done = HashSet::new();
    for root in v.css_graph.keys() {
        walk(&v.css_graph, root, &mut HashSet::new(), &mut done, 0)?;
    }
    Ok(())
}

pub(crate) fn fingerprint(state: &AppState, file_id: &str) -> AppResult<(String, String)> {
    let grant = state.file(file_id)?;
    if let FileSource::Root { root_id, segments } = &grant.source {
        let root = state.root(root_id)?;
        let file = scope::open_relative(&root.file, segments, false)?;
        let identity = scope::identity(&file)?;
        if identity != grant.identity {
            state.update_root_file_identity(file_id, identity)?;
        }
    }
    let service = HtmlService::default();
    let view = open_impl(
        state,
        &service,
        LocalTarget {
            file_id: Some(file_id.into()),
            root_id: None,
            segments: None,
        },
        None,
    )?;
    std::thread::sleep(std::time::Duration::from_millis(125));
    let second = open_impl(
        state,
        &HtmlService::default(),
        LocalTarget {
            file_id: Some(file_id.into()),
            root_id: None,
            segments: None,
        },
        Some(&view.identity_key),
    )?;
    if view.disk_version != second.disk_version {
        return Err(err("unstable", "HTML has not settled; retry"));
    }
    Ok((view.disk_version, view.identity_key))
}

// Hints can establish sockets before CSP/request delegates run. Parse with
// scripting disabled (including noscript), then remove non-stylesheet links.
// Serialization is presentation-only; disk bytes and their hash are untouched.
pub(super) fn without_network_hints(text: &str) -> AppResult<String> {
    if text.bytes().filter(|b| *b == b'<').count() > 100_000 {
        return Err(err("html_limit", "HTML markup complexity exceeded"));
    }
    let document = dom_query::Document::from(text);
    for node in document.select("link").nodes() {
        let rel = node.attr("rel").unwrap_or_default();
        let roles: Vec<_> = rel.split_ascii_whitespace().collect();
        if roles.len() != 1 || !roles[0].eq_ignore_ascii_case("stylesheet") {
            node.remove_from_parent();
        }
    }
    for node in document
        .select("base,iframe,object,embed,meta[http-equiv]")
        .nodes()
    {
        node.remove_from_parent();
    }
    for node in document.select("*").nodes() {
        for name in [
            "href",
            "src",
            "action",
            "formaction",
            "data",
            "poster",
            "background",
            "codebase",
            "archive",
            "manifest",
        ] {
            if node.attr(name).is_some_and(|v| {
                let raw = v.trim().replace(['\t', '\r', '\n'], "");
                raw.starts_with("//") || tauri::Url::parse(&raw).is_ok()
            }) {
                node.remove_attr(name);
            }
        }
        node.remove_attrs(&["ping", "attributionsrc", "srcset"]);
    }
    let html = document.html().to_string();
    if html.len() > 8 * 1024 * 1024 {
        return Err(err("html_limit", "HTML presentation exceeds 8 MiB"));
    }
    Ok(html)
}
