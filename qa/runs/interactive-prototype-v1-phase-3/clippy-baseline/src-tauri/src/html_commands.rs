use super::*;
#[tauri::command]
pub async fn open_local_view(
    window: tauri::WebviewWindow,
    target: LocalTarget,
    expected_identity: Option<String>,
    request_id: String,
) -> AppResult<LocalView> {
    caller(&window)?;
    if request_id.is_empty() || request_id.len() > 64 {
        return Err(err(
            "invalid_request",
            "Open request ID must contain 1–64 bytes",
        ));
    }
    let h = host()?;
    let control = Arc::new(std::sync::atomic::AtomicBool::new(false));
    if h.service
        .cancelled_opens
        .lock()
        .unwrap()
        .contains(&request_id)
    {
        return Err(err("cancelled", "Open was cancelled before start"));
    }
    {
        let mut opens = h.service.opens.lock().unwrap();
        if opens.len() >= 16 {
            return Err(err("html_limit", "Too many pending opens"));
        }
        if let Some(previous) = opens.insert(request_id.clone(), control.clone()) {
            previous.store(true, std::sync::atomic::Ordering::SeqCst);
        }
    }
    let result = tauri::async_runtime::spawn_blocking(move || {
        let h = host()?;
        open_impl(&h.state, &h.service, target, expected_identity.as_deref())
    })
    .await
    .map_err(|_| err("internal", "HTML open task failed"))?;
    {
        let mut opens = h.service.opens.lock().unwrap();
        if opens
            .get(&request_id)
            .is_some_and(|c| Arc::ptr_eq(c, &control))
        {
            opens.remove(&request_id);
        }
    }
    if control.load(std::sync::atomic::Ordering::SeqCst)
        || h.service
            .cancelled_opens
            .lock()
            .unwrap()
            .contains(&request_id)
    {
        if let Ok(view) = &result {
            if let Some(t) = &view.view_token {
                let _ = dispose_impl(&h.service, t, view.generation);
            }
        }
        return Err(err("cancelled", "Open was cancelled"));
    }
    result
}
#[tauri::command]
pub fn cancel_html_open(window: tauri::WebviewWindow, request_id: String) -> AppResult<bool> {
    caller(&window)?;
    if request_id.is_empty() || request_id.len() > 64 {
        return Err(err("invalid_request", "Invalid open request ID"));
    }
    let h = host()?;
    let mut cancelled = h.service.cancelled_opens.lock().unwrap();
    if cancelled.len() >= 256 {
        cancelled.pop_front();
    }
    cancelled.push_back(request_id.clone());
    if let Some(control) = h.service.opens.lock().unwrap().get(&request_id) {
        control.store(true, std::sync::atomic::Ordering::SeqCst);
        return Ok(true);
    }
    Ok(false)
}
#[tauri::command]
pub fn get_html_state(
    window: tauri::WebviewWindow,
    view_token: String,
    generation: u64,
) -> AppResult<HtmlState> {
    caller(&window)?;
    let h = host()?;
    let mut views = lock(&h.service)?;
    let v = checked(&mut views, &view_token, generation, None)?;
    let file = current(&h.state, &v.source)?;
    if stamp_key(&file)? != v.source_stamp {
        v.state.reason_code = Some("changed".into());
    }
    let resources = v.resources.clone();
    for (path, (expected, stamp)) in resources {
        let segments = path
            .strip_prefix(resource_base(&h.state, &v.source)?)
            .ok()
            .map(|p| {
                p.iter()
                    .map(|p| p.to_string_lossy().into_owned())
                    .collect::<Vec<_>>()
            });
        if let Some(parts) = segments {
            match resource_file(&h.state, v, &parts) {
                Ok((file, _))
                    if scope::identity(&file)? == expected && stamp_key(&file)? == stamp => {}
                Ok(_) => {
                    issue(v, &path.display().to_string(), "resource", "changed");
                    v.state.reason_code = Some("resources_changed".into());
                }
                Err(e) => {
                    issue(v, &path.display().to_string(), "resource", e.code);
                    v.state.reason_code = Some("resources_changed".into());
                }
            }
        }
    }
    Ok(v.state.clone())
}
fn validate_bounds(bounds: &Bounds, width: f64, height: f64) -> AppResult<()> {
    if ![bounds.x, bounds.y, bounds.width, bounds.height]
        .iter()
        .all(|n| n.is_finite())
        || bounds.x < 0.0
        || bounds.y < 0.0
        || bounds.width < 1.0
        || bounds.height < 1.0
        || bounds.x + bounds.width > width
        || bounds.y + bounds.height > height
    {
        return Err(err(
            "invalid_viewport",
            "HTML bounds must fit the workspace client area",
        ));
    }
    Ok(())
}
#[tauri::command]
pub async fn mount_html_view(
    window: tauri::WebviewWindow,
    view_token: String,
    generation: u64,
    request_id: u64,
    bounds: Bounds,
    visible: bool,
    baseline: Option<Baseline>,
) -> AppResult<HtmlState> {
    caller(&window)?;
    let baseline = baseline.unwrap_or_default();
    if !matches!(baseline.font.as_str(), "roboto" | "serif" | "sans" | "mono")
        || !baseline.size.is_finite()
        || !(12.0..=24.0).contains(&baseline.size)
        || !baseline.line_height.is_finite()
        || !(1.3..=2.2).contains(&baseline.line_height)
    {
        return Err(err("invalid_request", "Invalid baseline typography"));
    }
    let size = window
        .inner_size()
        .map_err(|_| err("html_render_failed", "Window size unavailable"))?
        .to_logical::<f64>(window.scale_factor().unwrap_or(1.0));
    validate_bounds(&bounds, size.width, size.height)?;
    let h = host()?;
    let url = {
        let mut views = lock(&h.service)?;
        let v = checked(&mut views, &view_token, generation, Some(request_id))?;
        current(&h.state, &v.source)?;
        v.started = Instant::now();
        v.baseline = baseline;
        start_url(v)
    };
    let token = view_token.clone();
    native_mount(window, token, generation, request_id, url, bounds, visible).await?;
    let mut views = lock(&h.service)?;
    Ok(checked(&mut views, &view_token, generation, None)?
        .state
        .clone())
}
#[tauri::command]
pub async fn update_html_viewport(
    window: tauri::WebviewWindow,
    view_token: String,
    generation: u64,
    request_id: u64,
    bounds: Bounds,
    visible: bool,
) -> AppResult<()> {
    caller(&window)?;
    let size = window
        .inner_size()
        .map_err(|_| err("html_render_failed", "Window size unavailable"))?
        .to_logical::<f64>(window.scale_factor().unwrap_or(1.0));
    validate_bounds(&bounds, size.width, size.height)?;
    let h = host()?;
    {
        let mut views = lock(&h.service)?;
        checked(&mut views, &view_token, generation, Some(request_id))?;
    }
    native_op(
        window,
        view_token,
        generation,
        request_id,
        "viewport",
        serde_json::json!({"bounds":bounds_json(&bounds),"visible":visible}),
    )
    .await
    .map(|_| ())
}
fn bounds_json(b: &Bounds) -> serde_json::Value {
    serde_json::json!({"x":b.x,"y":b.y,"width":b.width,"height":b.height})
}
#[tauri::command]
pub async fn set_html_location(
    window: tauri::WebviewWindow,
    view_token: String,
    generation: u64,
    request_id: u64,
    location: HtmlLocation,
) -> AppResult<serde_json::Value> {
    caller(&window)?;
    if ![
        location.offset,
        location.scroll_top,
        location.scroll_left,
        location.zoom,
    ]
    .iter()
    .all(|v| v.is_finite())
        || !(0.5..=3.0).contains(&location.zoom)
        || location.heading_id.as_ref().is_some_and(|s| s.len() > 2048)
    {
        return Err(err("invalid_location", "Invalid HTML location or zoom"));
    }
    {
        let h = host()?;
        let mut views = lock(&h.service)?;
        checked(&mut views, &view_token, generation, Some(request_id))?;
    }
    native_op(
        window,
        view_token,
        generation,
        request_id,
        "location",
        serde_json::to_value(location).unwrap(),
    )
    .await
}
#[tauri::command]
pub async fn find_html_text(
    window: tauri::WebviewWindow,
    view_token: String,
    generation: u64,
    request_id: u64,
    query: String,
    backwards: bool,
) -> AppResult<serde_json::Value> {
    caller(&window)?;
    if query.len() > 256 {
        return Err(err("html_limit", "Find query exceeds 256 bytes"));
    }
    {
        let h = host()?;
        let mut views = lock(&h.service)?;
        checked(&mut views, &view_token, generation, Some(request_id))?;
    }
    native_op(
        window,
        view_token,
        generation,
        request_id,
        "find",
        serde_json::json!({"query":query,"backwards":backwards}),
    )
    .await
}
#[tauri::command]
pub async fn capture_html_location(
    window: tauri::WebviewWindow,
    view_token: String,
    generation: u64,
    request_id: u64,
) -> AppResult<serde_json::Value> {
    caller(&window)?;
    {
        let h = host()?;
        let mut views = lock(&h.service)?;
        checked(&mut views, &view_token, generation, Some(request_id))?;
    }
    native_op(
        window,
        view_token,
        generation,
        request_id,
        "snapshot",
        serde_json::json!({}),
    )
    .await
}
#[tauri::command]
pub async fn focus_html_view(
    window: tauri::WebviewWindow,
    view_token: String,
    generation: u64,
    request_id: u64,
) -> AppResult<()> {
    caller(&window)?;
    {
        let h = host()?;
        let mut views = lock(&h.service)?;
        checked(&mut views, &view_token, generation, Some(request_id))?;
    }
    native_op(
        window,
        view_token,
        generation,
        request_id,
        "focus",
        serde_json::json!({}),
    )
    .await
    .map(|_| ())
}
#[tauri::command]
pub async fn dispose_html_view(
    window: tauri::WebviewWindow,
    view_token: String,
    generation: u64,
) -> AppResult<bool> {
    caller(&window)?;
    let removed = dispose_impl(&host()?.service, &view_token, generation)?;
    native_op(
        window,
        view_token,
        generation,
        0,
        "dispose",
        serde_json::json!({}),
    )
    .await?;
    Ok(removed)
}
pub fn dispose_impl(service: &HtmlService, token: &str, generation: u64) -> AppResult<bool> {
    let mut views = lock(service)?;
    if views
        .get(token)
        .is_some_and(|v| v.state.generation != generation)
    {
        return Err(err("stale_view", "Generation changed"));
    }
    Ok(views.remove(token).is_some())
}
#[tauri::command]
pub async fn reload_html_view(
    window: tauri::WebviewWindow,
    view_token: String,
    generation: u64,
    request_id: u64,
) -> AppResult<LocalView> {
    caller(&window)?;
    let h = host()?;
    let (source, assets) = {
        let mut views = lock(&h.service)?;
        let v = checked(&mut views, &view_token, generation, Some(request_id))?;
        (v.source.clone(), v.assets.clone())
    };
    // Build a replacement first. Failure retains the old readable surface.
    let target = match source.source {
        FileSource::Root { root_id, segments } => LocalTarget {
            file_id: None,
            root_id: Some(root_id),
            segments: Some(segments),
        },
        _ => LocalTarget {
            file_id: Some(source.id),
            root_id: None,
            segments: None,
        },
    };
    let worker_state = h.state.clone();
    let worker_service = h.service.clone();
    let next = tauri::async_runtime::spawn_blocking(move || {
        open_impl(&worker_state, &worker_service, target, None)
    })
    .await
    .map_err(|_| err("internal", "Reload task failed"))??;
    {
        let mut views = lock(&h.service)?;
        let valid = checked(&mut views, &view_token, generation, None).and_then(|v| {
            if v.last_request == request_id {
                Ok(())
            } else {
                Err(err("stale_request", "Reload superseded"))
            }
        });
        if let Err(e) = valid {
            if let Some(token) = &next.view_token {
                views.remove(token);
            }
            return Err(e);
        }
        if let Some(token) = &next.view_token {
            views.get_mut(token).unwrap().assets = assets;
        }
        views.remove(&view_token);
    }
    if let Err(e) = native_op(
        window,
        view_token,
        generation,
        request_id,
        "dispose",
        serde_json::json!({}),
    )
    .await
    {
        discard_unmounted(&next);
        return Err(e);
    }
    Ok(next)
}
#[tauri::command]
pub async fn choose_html_resource(
    window: tauri::WebviewWindow,
    view_token: String,
    generation: u64,
    issue_id: String,
) -> AppResult<Option<HtmlState>> {
    caller(&window)?;
    let h = host()?;
    let raw = {
        let mut views = lock(&h.service)?;
        let v = checked(&mut views, &view_token, generation, None)?;
        let i = v
            .state
            .issues
            .iter()
            .find(|i| {
                i.id == issue_id
                    && matches!(i.reason.as_str(), "outside_grant" | "missing" | "denied")
            })
            .ok_or_else(|| err("invalid_resource", "Issue cannot be selected"))?;
        v.issue_urls
            .get(&i.id)
            .cloned()
            .ok_or_else(|| err("invalid_resource", "Resource URL expired"))?
    };
    choose_asset(window, view_token, generation, false, Some(raw)).await
}
#[tauri::command]
pub async fn choose_html_resource_folder(
    window: tauri::WebviewWindow,
    view_token: String,
    generation: u64,
) -> AppResult<Option<HtmlState>> {
    caller(&window)?;
    choose_asset(window, view_token, generation, true, None).await
}
async fn choose_asset(
    window: tauri::WebviewWindow,
    token: String,
    generation: u64,
    folder: bool,
    raw: Option<String>,
) -> AppResult<Option<HtmlState>> {
    use tauri_plugin_dialog::DialogExt;
    let app = window.app_handle().clone();
    tauri::async_runtime::spawn_blocking(move || {
        let selected = if folder {
            app.dialog().file().blocking_pick_folder()
        } else {
            app.dialog().file().blocking_pick_file()
        };
        let Some(selected) = selected else {
            return Ok(None);
        };
        let path = selected
            .into_path()
            .map_err(|_| err("invalid_path", "Invalid selection"))?;
        let h = host()?;
        let mut views = lock(&h.service)?;
        let v = checked(&mut views, &token, generation, None)?;
        current(&h.state, &v.source)?;
        if v.assets.len() >= 32 {
            return Err(err("html_limit", "At most 32 resource selections"));
        }
        if let Some(raw) = raw {
            let url =
                tauri::Url::parse(&raw).map_err(|_| err("invalid_resource", "Invalid URL"))?;
            let parts = resource_path(&url, &token)?;
            let desired = resource_base(&h.state, &v.source)?.join(parts.join("/"));
            if path != desired {
                return Err(err(
                    "resource_mismatch",
                    "Select the requested resource file",
                ));
            }
        }
        let file = scope::open_selected(&path, folder)?;
        v.assets.push(SelectedAsset {
            identity: scope::identity(&file)?,
            path,
            file: Arc::new(file),
            folder,
        });
        v.state.revision += 1;
        Ok(Some(v.state.clone()))
    })
    .await
    .map_err(|_| err("internal", "Resource selection task failed"))?
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HtmlLinkResponse {
    #[serde(flatten)]
    pub link: crate::assets::LinkResponse,
    pub requested_path: Option<String>,
    pub access_id: Option<String>,
}
pub(super) fn resolve_link_intent(
    state: &AppState,
    service: &HtmlService,
    token: &str,
    generation: u64,
    navigation_id: &str,
) -> AppResult<HtmlLinkResponse> {
    let (source, raw) = {
        let mut views = lock(service)?;
        let v = checked(&mut views, token, generation, None)?;
        current(state, &v.source)?;
        let raw = v.pending_links.remove(navigation_id).ok_or_else(|| {
            err(
                "stale_navigation",
                "Link intent expired or already consumed",
            )
        })?;
        (v.source.clone(), raw)
    };
    let url = tauri::Url::parse(&raw).map_err(|_| err("blocked", "Invalid link"))?;
    if url.scheme() != "ig-html" || url.host_str() != Some(token) {
        return Err(err("blocked", "Only local deliberate links are supported"));
    }
    if url.query().is_some() {
        return Err(err("blocked", "Local link query strings are unsupported"));
    }
    let parts = resource_path(&url, token)?;
    let anchor = url
        .fragment()
        .map(|s| {
            percent_encoding::percent_decode_str(s)
                .decode_utf8()
                .map(String::from)
                .map_err(|_| err("encoding", "Invalid fragment encoding"))
        })
        .transpose()?;
    let source_parts = source_url_parts(&source);
    if parts == source_parts {
        return Ok(HtmlLinkResponse {
            link: crate::assets::LinkResponse {
                kind: "anchor",
                file_id: Some(source.id),
                anchor,
                reason: None,
            },
            requested_path: None,
            access_id: None,
        });
    }
    let FileSource::Root { root_id, .. } = &source.source else {
        let requested = resource_base(state, &source)?.join(parts.join("/"));
        match crate::assets::resolve_individual_target(state, &source, &requested, anchor.clone()) {
            Ok(link) => {
                return Ok(HtmlLinkResponse {
                    link,
                    requested_path: Some(requested.display().to_string()),
                    access_id: None,
                })
            }
            // Keep the existing exact-file picker for an actual access denial.
            // Its approval continues this intent with the preserved fragment.
            Err(e) if e.code == "denied" => {}
            Err(e) => return Err(e),
        }
        let access_id = Uuid::new_v4().to_string();
        {
            let mut views = lock(service)?;
            let v = checked(&mut views, token, generation, None)?;
            if v.access_requests.len() >= 32 {
                v.access_requests.clear();
            }
            v.access_requests
                .insert(access_id.clone(), (requested.clone(), anchor.clone()));
        }
        return Ok(HtmlLinkResponse {
            link: crate::assets::LinkResponse {
                kind: "access_required",
                file_id: None,
                anchor,
                reason: Some(
                    "Access was denied; select the requested linked file to continue".into(),
                ),
            },
            requested_path: Some(requested.display().to_string()),
            access_id: Some(access_id),
        });
    };
    let root = state.root(root_id)?;
    let requested = root.path.join(parts.join("/"));
    let file = match scope::open_relative(&root.file, &parts, false) {
        Ok(file) => file,
        Err(e) => {
            return Ok(HtmlLinkResponse {
                link: crate::assets::LinkResponse {
                    kind: if e.code == "missing" {
                        "missing"
                    } else {
                        "blocked"
                    },
                    file_id: None,
                    anchor,
                    reason: Some(e.code.into()),
                },
                requested_path: Some(requested.display().to_string()),
                access_id: None,
            })
        }
    };
    let grant = state.register_root_file(&root, parts, &file)?;
    Ok(HtmlLinkResponse {
        link: crate::assets::LinkResponse {
            kind: if scope::html_name(&grant.name) {
                "html"
            } else if scope::markdown_name(&grant.name) {
                "document"
            } else if scope::image_format(&grant.name).is_some() {
                "image"
            } else {
                "details"
            },
            file_id: Some(grant.id),
            anchor,
            reason: None,
        },
        requested_path: Some(requested.display().to_string()),
        access_id: None,
    })
}
#[tauri::command]
pub fn resolve_local_view_link(
    window: tauri::WebviewWindow,
    view_token: String,
    generation: u64,
    navigation_id: String,
) -> AppResult<HtmlLinkResponse> {
    caller(&window)?;
    let h = host()?;
    resolve_link_intent(
        &h.state,
        &h.service,
        &view_token,
        generation,
        &navigation_id,
    )
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SelectedLink {
    pub view: LocalView,
    pub anchor: Option<String>,
}
#[tauri::command]
pub async fn choose_html_link_file(
    window: tauri::WebviewWindow,
    view_token: String,
    generation: u64,
    access_id: String,
) -> AppResult<Option<SelectedLink>> {
    use tauri_plugin_dialog::DialogExt;
    caller(&window)?;
    let app = window.app_handle().clone();
    tauri::async_runtime::spawn_blocking(move || {
        {
            let h = host()?;
            let mut views = lock(&h.service)?;
            let v = checked(&mut views, &view_token, generation, None)?;
            current(&h.state, &v.source)?;
            if !v.access_requests.contains_key(&access_id) {
                return Err(err("stale_navigation", "Access request expired"));
            }
        }
        let Some(selected) = app.dialog().file().blocking_pick_file() else {
            return Ok(None);
        };
        let path = selected
            .into_path()
            .map_err(|_| err("invalid_path", "Invalid selected path"))?;
        let h = host()?;
        let anchor = {
            let mut views = lock(&h.service)?;
            let v = checked(&mut views, &view_token, generation, None)?;
            current(&h.state, &v.source)?;
            let (expected, anchor) = v
                .access_requests
                .get(&access_id)
                .ok_or_else(|| err("stale_navigation", "Access request expired"))?;
            if path != *expected {
                return Err(err("resource_mismatch", "Select the requested linked file"));
            }
            anchor.clone()
        };
        let grant = h.state.register_explicit_file(&path)?;
        let view = open_impl(
            &h.state,
            &h.service,
            LocalTarget {
                file_id: Some(grant.id),
                root_id: None,
                segments: None,
            },
            None,
        )?;
        {
            let mut views = lock(&h.service)?;
            if let Ok(v) = checked(&mut views, &view_token, generation, None) {
                v.access_requests.remove(&access_id);
            } else {
                if let Some(token) = &view.view_token {
                    views.remove(token);
                }
                return Err(err("stale_view", "Source closed during link opening"));
            }
        }
        Ok(Some(SelectedLink { view, anchor }))
    })
    .await
    .map_err(|_| err("internal", "Link selection task failed"))?
}
