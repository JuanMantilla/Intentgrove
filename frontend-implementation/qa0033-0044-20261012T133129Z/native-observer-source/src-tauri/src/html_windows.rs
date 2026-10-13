//! Standalone WebView2; no Tauri initialization, IPC, host objects or file mapping.
//! Windows runtime verification requires a Windows host with WebView2 installed.
use super::*;
use std::{cell::RefCell, rc::Rc};
use webview2_com::{callback::*, Microsoft::Web::WebView2::Win32::*};
use windows::{
    core::{Interface, BOOL, HSTRING, PWSTR},
    Win32::{
        Foundation::HGLOBAL,
        System::Com::{StructuredStorage::CreateStreamOnHGlobal, STREAM_SEEK_SET},
    },
};
use wry::{
    dpi::{LogicalPosition, LogicalSize},
    Rect, WebView, WebViewBuilder, WebViewBuilderExtWindows, WebViewExtWindows,
};
struct Surface {
    token: String,
    web: WebView,
    generation: u64,
    request: Arc<std::sync::atomic::AtomicU64>,
    visible: bool,
    ready: Arc<std::sync::atomic::AtomicBool>,
    desired: Arc<std::sync::atomic::AtomicBool>,
    completed_token: i64,
    resource_event_token: i64,
}
impl Drop for Surface {
    fn drop(&mut self) {
        unsafe {
            let core = self.web.webview();
            let _ = core.remove_WebResourceRequested(self.resource_event_token);
            let _ = core.remove_NavigationCompleted(self.completed_token);
            cancel_resources(&self.token);
            let _ = core.Stop();
            let _ = self.web.controller().Close();
        }
    }
}
thread_local! {static SURFACES:RefCell<HashMap<String,Surface>>=RefCell::new(HashMap::new());}
struct PendingResource {
    token: String,
    args: ICoreWebView2WebResourceRequestedEventArgs,
    deferral: ICoreWebView2Deferral,
    environment: ICoreWebView2Environment,
    core: ICoreWebView2,
}
thread_local! {static RESOURCES:RefCell<HashMap<u64,PendingResource>>=RefCell::new(HashMap::new());}
static RESOURCE_ID: std::sync::atomic::AtomicU64 = std::sync::atomic::AtomicU64::new(1);
static RESOURCE_JOBS: std::sync::atomic::AtomicUsize = std::sync::atomic::AtomicUsize::new(0);
struct ResourcePermit;
impl Drop for ResourcePermit {
    fn drop(&mut self) {
        RESOURCE_JOBS.fetch_sub(1, std::sync::atomic::Ordering::SeqCst);
    }
}
fn resource_permit() -> Option<ResourcePermit> {
    RESOURCE_JOBS
        .fetch_update(
            std::sync::atomic::Ordering::SeqCst,
            std::sync::atomic::Ordering::SeqCst,
            |n| (n < 128).then_some(n + 1),
        )
        .ok()
        .map(|_| ResourcePermit)
}
fn resource_response(
    token: &str,
    args: &ICoreWebView2WebResourceRequestedEventArgs,
    env: &ICoreWebView2Environment,
    result: AppResult<(Vec<u8>, &'static str)>,
) -> windows::core::Result<()> {
    let (mut data, mime, status) = match result {
        Ok((d, m)) => (d, m, 200),
        Err(_) => (Vec::new(), "text/plain", 403),
    };
    let origin = format!("https://{token}.intentgrove-html.invalid");
    // Translate only this provider's generated app-font URLs to its WebView2 origin.
    if mime.starts_with("text/html") {
        if let Ok(text) = std::str::from_utf8(&data) {
            data = text
                .replace(
                    &format!("ig-html://{token}/__ig_assets/"),
                    &format!("{origin}/__ig_assets/"),
                )
                .into_bytes();
        }
    }
    unsafe {
        let stream = CreateStreamOnHGlobal(HGLOBAL::default(), true)?;
        if !data.is_empty() {
            stream
                .Write(data.as_ptr().cast(), data.len() as u32, None)
                .ok()?;
            stream.Seek(0, STREAM_SEEK_SET, None)?;
        }
        let csp=format!("default-src 'none'; script-src 'none'; connect-src 'none'; style-src {origin} 'unsafe-inline'; img-src {origin}; font-src {origin}; media-src 'none'; object-src 'none'; frame-src 'none'; worker-src 'none'; base-uri 'none'; form-action 'none'; sandbox allow-same-origin");
        let headers=HSTRING::from(format!("Content-Type: {mime}\r\nContent-Security-Policy: {csp}\r\nX-Content-Type-Options: nosniff\r\nCache-Control: no-store\r\n"));
        let response = env.CreateWebResourceResponse(
            &stream,
            status,
            &HSTRING::from("Local broker"),
            &headers,
        )?;
        args.SetResponse(&response)
    }
}
fn finish_resource(p: PendingResource, result: AppResult<(Vec<u8>, &'static str)>) {
    if resource_response(&p.token, &p.args, &p.environment, result).is_err() {
        unsafe {
            let _ = p.core.Stop();
        }
    }
    unsafe {
        let _ = p.deferral.Complete();
    }
}
fn cancel_resources(token: &str) {
    let pending = RESOURCES.with(|r| {
        let mut r = r.borrow_mut();
        let ids = r
            .iter()
            .filter(|(_, p)| p.token == token)
            .map(|(id, _)| *id)
            .collect::<Vec<_>>();
        ids.into_iter()
            .filter_map(|id| r.remove(&id))
            .collect::<Vec<_>>()
    });
    for p in pending {
        finish_resource(p, Err(err("stale_view", "Resource owner disposed")));
    }
}
fn failure(e: impl std::fmt::Display) -> AppError {
    AppError::new("html_render_failed", e.to_string())
}
fn bounds(b: &Bounds) -> Rect {
    Rect {
        position: LogicalPosition::new(b.x, b.y).into(),
        size: LogicalSize::new(b.width, b.height).into(),
    }
}
fn broker_url(raw: &str, token: &str) -> Option<String> {
    let u = tauri::Url::parse(raw).ok()?;
    if u.scheme() != "https"
        || u.host_str() != Some(&format!("{token}.intentgrove-html.invalid"))
        || u.port().is_some()
        || !u.username().is_empty()
        || u.password().is_some()
    {
        return None;
    }
    Some(format!(
        "ig-html://{token}{}{}{}",
        u.path(),
        u.query().map(|q| format!("?{q}")).unwrap_or_default(),
        u.fragment().map(|f| format!("#{f}")).unwrap_or_default()
    ))
}
fn emit(token: &str, generation: u64, value: serde_json::Value) {
    let t = std::ffi::CString::new(token).unwrap();
    let json = std::ffi::CString::new(value.to_string()).unwrap();
    unsafe { ig_html_event(t.as_ptr(), generation, json.as_ptr()) };
}
fn respond(ticket: u64, value: serde_json::Value) {
    let json = std::ffi::CString::new(value.to_string()).unwrap();
    reply(ticket, json.as_ptr());
}
fn inspect(
    web: &WebView,
    token: String,
    generation: u64,
    op: &str,
    args: serde_json::Value,
    ticket: Option<u64>,
    request: Arc<std::sync::atomic::AtomicU64>,
) -> AppResult<()> {
    let expected = request.load(std::sync::atomic::Ordering::SeqCst);
    let mut zoom = 1.0;
    unsafe {
        web.controller().ZoomFactor(&mut zoom).map_err(failure)?;
    }
    let source = format!(
        "(async()=>{{const op={};const args={};{} }})()",
        serde_json::to_string(op).unwrap(),
        args,
        include_str!("html_inspect.js")
    );
    // WebView2 ExecuteScript does not await a Promise: inspection is synchronous.
    let source = source.replacen("(async()=>", "(()=>", 1);
    web.evaluate_script_with_callback(&source, move |raw| {
        let mut value = if request.load(std::sync::atomic::Ordering::SeqCst) != expected {
            serde_json::json!({"error":"stale_request"})
        } else {
            serde_json::from_str::<serde_json::Value>(&raw)
                .unwrap_or(serde_json::json!({"error":"html_render_failed"}))
        };
        if let Some(location) = value.get_mut("location") {
            location["zoom"] = serde_json::json!(zoom);
        }
        let live = host()
            .and_then(|h| {
                let mut vs = lock(&h.service)?;
                checked(&mut vs, &token, generation, None).map(|_| ())
            })
            .is_ok();
        if !live {
            if let Some(ticket) = ticket {
                respond(ticket, serde_json::json!({"error":"stale_view"}));
            }
            return;
        }
        let mut event = value.clone();
        event["requestId"] = serde_json::json!(expected);
        event["event"] = serde_json::json!(if ticket.is_none() {
            if value.get("error").is_some() {
                "failed"
            } else {
                "ready"
            }
        } else {
            "location"
        });
        emit(&token, generation, event);
        if let Some(ticket) = ticket {
            respond(ticket, value);
        }
    })
    .map_err(failure)
}
pub(super) fn mount(
    window: &tauri::WebviewWindow,
    token: &str,
    generation: u64,
    request_id: u64,
    url: &str,
    b: &Bounds,
    visible: bool,
) -> AppResult<()> {
    {
        let h = host()?;
        let mut vs = lock(&h.service)?;
        if checked(&mut vs, token, generation, None)?.last_request != request_id {
            return Err(err("stale_request", "Mount superseded"));
        }
    }
    if SURFACES.with(|s| s.borrow().contains_key(token)) {
        return Err(err("html_render_failed", "Already mounted"));
    }
    let web = WebViewBuilder::new()
        .with_javascript_disabled()
        .with_devtools(false)
        .with_incognito(true)
        .with_browser_accelerator_keys(false)
        .with_bounds(bounds(b))
        .with_visible(false)
        .with_new_window_req_handler(|_, _| wry::NewWindowResponse::Deny)
        .with_download_started_handler(|_, _| false)
        .build_as_child(window)
        .map_err(failure)?;
    let core = web.webview();
    let env = web.environment();
    let initial = Rc::new(std::cell::Cell::new(true));
    let request = Arc::new(std::sync::atomic::AtomicU64::new(request_id));
    let ready = Arc::new(std::sync::atomic::AtomicBool::new(false));
    let desired = Arc::new(std::sync::atomic::AtomicBool::new(visible));
    let completed_token;
    let resource_event_token;
    let t = token.to_string();
    let start = url.replacen(
        &format!("ig-html://{token}"),
        &format!("https://{token}.intentgrove-html.invalid"),
        1,
    );
    unsafe {
        let settings = core.Settings().map_err(failure)?;
        settings.SetAreDevToolsEnabled(false).map_err(failure)?;
        settings.SetIsScriptEnabled(false).map_err(failure)?;
        settings.SetIsWebMessageEnabled(false).map_err(failure)?;
        settings.SetAreHostObjectsAllowed(false).map_err(failure)?;
        settings
            .SetAreDefaultContextMenusEnabled(false)
            .map_err(failure)?;
        settings
            .SetAreDefaultScriptDialogsEnabled(false)
            .map_err(failure)?;
        let mut event_token = 0;
        core.cast::<ICoreWebView2_22>()
            .map_err(failure)?
            .AddWebResourceRequestedFilterWithRequestSourceKinds(
                &HSTRING::from("*"),
                COREWEBVIEW2_WEB_RESOURCE_CONTEXT_ALL,
                COREWEBVIEW2_WEB_RESOURCE_REQUEST_SOURCE_KINDS_ALL,
            )
            .map_err(failure)?;
        core.cast::<ICoreWebView2_18>()
            .map_err(failure)?
            .add_LaunchingExternalUriScheme(
                &LaunchingExternalUriSchemeEventHandler::create(Box::new(|_, args| {
                    if let Some(a) = args {
                        a.SetCancel(true)?;
                    }
                    Ok(())
                })),
                &mut event_token,
            )
            .map_err(failure)?;
        let shortcut_token = t.clone();
        web.controller().add_AcceleratorKeyPressed(&AcceleratorKeyPressedEventHandler::create(Box::new(move|_,args|{
            let Some(args)=args else{return Ok(())};let mut kind=COREWEBVIEW2_KEY_EVENT_KIND_KEY_DOWN;args.KeyEventKind(&mut kind)?;
            let mut key=0;args.VirtualKey(&mut key)?;
            let ctrl=windows::Win32::UI::Input::KeyboardAndMouse::GetKeyState(0x11) as u16&0x8000!=0;
            if ctrl&&kind==COREWEBVIEW2_KEY_EVENT_KIND_KEY_DOWN&&matches!(key,0x46|0x52|0x57|0x4f){args.SetHandled(true)?;let shift=windows::Win32::UI::Input::KeyboardAndMouse::GetKeyState(0x10) as u16&0x8000!=0;emit(&shortcut_token,generation,serde_json::json!({"event":"shortcut","key":char::from_u32(key).unwrap().to_ascii_lowercase().to_string(),"shift":shift}));}Ok(())
        })),&mut event_token).map_err(failure)?;
        let resource_token = t.clone();
        let resource_window = window.clone();
        let count = Rc::new(std::cell::Cell::new(0usize));
        core.add_WebResourceRequested(
            &WebResourceRequestedEventHandler::create(Box::new(move |sender, args| {
                let Some(args) = args else { return Ok(()) };
                let Some(sender) = sender else {
                    return resource_response(
                        &resource_token,
                        &args,
                        &env,
                        Err(err("html_render_failed", "Resource sender unavailable")),
                    );
                };
                let req = args.Request()?;
                let mut ptr = PWSTR::null();
                req.Uri(&mut ptr)?;
                let raw = webview2_com::take_pwstr(ptr);
                let Some(url) = broker_url(&raw, &resource_token) else {
                    return resource_response(
                        &resource_token,
                        &args,
                        &env,
                        Err(err("remote_blocked", "Network denied")),
                    );
                };
                count.set(count.get() + 1);
                let permit = if count.get() <= 129 {
                    resource_permit()
                } else {
                    None
                };
                let Some(permit) = permit else {
                    emit(
                        &resource_token,
                        generation,
                        serde_json::json!({"event":"resource_issue","url":url,"reason":"limit"}),
                    );
                    return resource_response(
                        &resource_token,
                        &args,
                        &env,
                        Err(err("limit", "Resource queue capacity")),
                    );
                };
                let deferral = match args.GetDeferral() {
                    Ok(d) => d,
                    Err(_) => {
                        return resource_response(
                            &resource_token,
                            &args,
                            &env,
                            Err(err("html_render_failed", "Request deferral unavailable")),
                        )
                    }
                };
                let id = RESOURCE_ID.fetch_add(1, std::sync::atomic::Ordering::Relaxed);
                RESOURCES.with(|r| {
                    r.borrow_mut().insert(
                        id,
                        PendingResource {
                            token: resource_token.clone(),
                            args: args.clone(),
                            deferral,
                            environment: env.clone(),
                            core: sender,
                        },
                    )
                });
                let token = resource_token.clone();
                let window = resource_window.clone();
                tauri::async_runtime::spawn_blocking(move || {
                    let result =
                        host().and_then(|h| resource_impl(&h.state, &h.service, &token, &url));
                    let _ = window.run_on_main_thread(move || {
                        let _permit = permit;
                        if let Some(p) = RESOURCES.with(|r| r.borrow_mut().remove(&id)) {
                            finish_resource(p, result);
                        }
                    });
                });
                Ok(())
            })),
            &mut event_token,
        )
        .map_err(failure)?;
        resource_event_token = event_token;
        let navigation_token = t.clone();
        let initial_url = start.clone();
        core.add_NavigationStarting(&NavigationStartingEventHandler::create(Box::new(move|_,args|{
   let Some(args)=args else{return Ok(())};let mut ptr=PWSTR::null();args.Uri(&mut ptr)?;let raw=webview2_com::take_pwstr(ptr);
   let mut user=BOOL(0);args.IsUserInitiated(&mut user)?;let mut redirected=BOOL(0);args.IsRedirected(&mut redirected)?;
   if initial.get()&&raw==initial_url&&!redirected.as_bool(){initial.set(false);return Ok(());}
   args.SetCancel(true)?;
   if user.as_bool()&&!redirected.as_bool(){emit(&navigation_token,generation,serde_json::json!({"event":"link","url":broker_url(&raw,&navigation_token).unwrap_or(raw)}));}
   else{emit(&navigation_token,generation,serde_json::json!({"event":"navigation_blocked","url":raw}));}Ok(())
  })),&mut event_token).map_err(failure)?;
        core.add_FrameNavigationStarting(
            &FrameNavigationStartingEventHandler::create(Box::new(|_, args| {
                if let Some(a) = args {
                    a.SetCancel(true)?;
                }
                Ok(())
            })),
            &mut event_token,
        )
        .map_err(failure)?;
        core.add_PermissionRequested(
            &PermissionRequestedEventHandler::create(Box::new(|_, args| {
                if let Some(a) = args {
                    a.SetState(COREWEBVIEW2_PERMISSION_STATE_DENY)?;
                }
                Ok(())
            })),
            &mut event_token,
        )
        .map_err(failure)?;
        let completed_view_token = t.clone();
        let is_ready = ready.clone();
        let show = desired.clone();
        let controller = web.controller().clone();
        core.add_NavigationCompleted(
            &NavigationCompletedEventHandler::create(Box::new(move |sender, args| {
                let Some(inspection_core) = sender else {
                    return Ok(());
                };
                let mut success = BOOL(0);
                if let Some(args) = args {
                    args.IsSuccess(&mut success)?;
                }
                if !success.as_bool() {
                    emit(
                        &completed_view_token,
                        generation,
                        serde_json::json!({"event":"failed"}),
                    );
                    return Ok(());
                }
                let source = format!(
                    "(()=>{{const op='snapshot';const args={{}};{} }})()",
                    include_str!("html_inspect.js")
                );
                let tk = completed_view_token.clone();
                let is_ready = is_ready.clone();
                let show = show.clone();
                let controller = controller.clone();
                inspection_core.ExecuteScript(
                    &HSTRING::from(source),
                    &ExecuteScriptCompletedHandler::create(Box::new(move |status, raw| {
                        status?;
                        let live = host()
                            .and_then(|h| {
                                let mut views = lock(&h.service)?;
                                let v = checked(&mut views, &tk, generation, None)?;
                                current(&h.state, &v.source).map(|_| ())
                            })
                            .is_ok();
                        if !live {
                            return Ok(());
                        }
                        let mut value: serde_json::Value = serde_json::from_str(&raw)
                            .unwrap_or(serde_json::json!({"error":"html_render_failed"}));
                        value["event"] = serde_json::json!(if value.get("error").is_some() {
                            "failed"
                        } else {
                            "ready"
                        });
                        let mounted = SURFACES.with(|s| {
                            s.try_borrow()
                                .map(|s| s.get(&tk).is_some_and(|s| s.generation == generation))
                                .unwrap_or(false)
                        });
                        if !mounted {
                            return Ok(());
                        }
                        if value.get("error").is_none() {
                            is_ready.store(true, std::sync::atomic::Ordering::SeqCst);
                            controller
                                .SetIsVisible(show.load(std::sync::atomic::Ordering::SeqCst))?;
                        }
                        emit(&tk, generation, value);
                        Ok(())
                    })),
                )?;
                Ok(())
            })),
            &mut event_token,
        )
        .map_err(failure)?;
        completed_token = event_token;
    }
    web.load_url(&start).map_err(failure)?;
    SURFACES.with(|s| {
        s.borrow_mut().insert(
            t.clone(),
            Surface {
                token: t,
                web,
                generation,
                request,
                visible,
                completed_token,
                resource_event_token,
                ready,
                desired,
            },
        )
    });
    let timeout_token = token.to_string();
    let timeout_window = window.clone();
    tauri::async_runtime::spawn_blocking(move || {
        std::thread::sleep(std::time::Duration::from_secs(5));
        let _ = timeout_window.run_on_main_thread(move || {
            SURFACES.with(|s| {
                let mut s = s.borrow_mut();
                if s.get(&timeout_token).is_some_and(|v| {
                    v.generation == generation && !v.ready.load(std::sync::atomic::Ordering::SeqCst)
                }) {
                    emit(
                        &timeout_token,
                        generation,
                        serde_json::json!({"event":"failed","error":"html_timeout"}),
                    );
                    s.remove(&timeout_token);
                }
            });
        });
    });
    Ok(())
}
pub(super) fn operation(
    token: &str,
    generation: u64,
    request: u64,
    op: &str,
    args: serde_json::Value,
    ticket: u64,
) {
    if op == "dispose" {
        SURFACES.with(|s| {
            let mut s = s.borrow_mut();
            if s.get(token).is_some_and(|v| v.generation == generation) {
                s.remove(token);
            }
        });
        respond(ticket, serde_json::json!({"disposed":true}));
        return;
    }
    let result = SURFACES.with(|s| {
        let mut s = s.borrow_mut();
        let view = s
            .get_mut(token)
            .filter(|v| v.generation == generation)
            .ok_or_else(|| err("stale_view", "Surface expired"))?;
        {
            let h = host()?;
            let mut vs = lock(&h.service)?;
            if checked(&mut vs, token, generation, None)?.last_request != request {
                return Err(err("stale_request", "Operation superseded"));
            }
        }
        view.request
            .store(request, std::sync::atomic::Ordering::SeqCst);
        match op {
            "viewport" => {
                let b: Bounds = serde_json::from_value(args["bounds"].clone()).map_err(failure)?;
                view.web.set_bounds(bounds(&b)).map_err(failure)?;
                view.visible = args["visible"].as_bool().unwrap_or(false);
                view.desired
                    .store(view.visible, std::sync::atomic::Ordering::SeqCst);
                view.web
                    .set_visible(
                        view.visible && view.ready.load(std::sync::atomic::Ordering::SeqCst),
                    )
                    .map_err(failure)?;
                respond(ticket, serde_json::json!({"updated":true}));
            }
            "focus" => {
                if !view.visible {
                    return Err(err("hidden_view", "Surface hidden"));
                }
                view.web.focus().map_err(failure)?;
                respond(ticket, serde_json::json!({"focused":true}));
            }
            _ => {
                if op == "location" {
                    view.web
                        .zoom(args["zoom"].as_f64().unwrap_or(1.0))
                        .map_err(failure)?;
                }
                inspect(
                    &view.web,
                    token.into(),
                    generation,
                    op,
                    args,
                    Some(ticket),
                    view.request.clone(),
                )?;
            }
        }
        Ok(())
    });
    if let Err(e) = result {
        respond(ticket, serde_json::json!({"error":e.code}));
    }
}
pub(super) fn dispose_all() {
    SURFACES.with(|s| s.borrow_mut().clear());
}

pub(super) fn hide_all() {
    SURFACES.with(|s| {
        for surface in s.borrow_mut().values_mut() {
            surface.visible = false;
            surface
                .desired
                .store(false, std::sync::atomic::Ordering::SeqCst);
            let _ = surface.web.set_visible(false);
        }
    });
}
