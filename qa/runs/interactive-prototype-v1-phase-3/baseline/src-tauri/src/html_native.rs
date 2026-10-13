use super::*;
// Native callback ABI. Bytes belong to Rust until html_release; no pointer survives disposal.
#[repr(C)]
pub struct NativeBytes {
    data: *mut u8,
    len: usize,
    mime: *mut std::ffi::c_char,
}
#[no_mangle]
pub unsafe extern "C" fn ig_html_resource(
    token: *const std::ffi::c_char,
    raw: *const std::ffi::c_char,
) -> NativeBytes {
    let empty = NativeBytes {
        data: std::ptr::null_mut(),
        len: 0,
        mime: std::ptr::null_mut(),
    };
    std::panic::catch_unwind(|| {
        let token = std::ffi::CStr::from_ptr(token).to_str().ok()?;
        let raw = std::ffi::CStr::from_ptr(raw).to_str().ok()?;
        let h = host().ok()?;
        let (data, mime) = resource_impl(&h.state, &h.service, token, raw).ok()?;
        let mut data = data.into_boxed_slice();
        let len = data.len();
        let ptr = data.as_mut_ptr();
        std::mem::forget(data);
        Some(NativeBytes {
            data: ptr,
            len,
            mime: std::ffi::CString::new(mime).unwrap().into_raw(),
        })
    })
    .ok()
    .flatten()
    .unwrap_or(empty)
}
#[no_mangle]
pub unsafe extern "C" fn ig_html_release(bytes: NativeBytes) {
    if !bytes.data.is_null() {
        drop(Box::from_raw(std::ptr::slice_from_raw_parts_mut(
            bytes.data, bytes.len,
        )));
    }
    if !bytes.mime.is_null() {
        drop(std::ffi::CString::from_raw(bytes.mime));
    }
}
#[no_mangle]
pub unsafe extern "C" fn ig_html_event(
    token: *const std::ffi::c_char,
    generation: u64,
    raw: *const std::ffi::c_char,
) {
    let _ = std::panic::catch_unwind(|| {
        let Ok(token) = std::ffi::CStr::from_ptr(token).to_str() else {
            return;
        };
        let Ok(raw) = std::ffi::CStr::from_ptr(raw).to_str() else {
            return;
        };
        let Ok(value) = serde_json::from_str::<serde_json::Value>(raw) else {
            return;
        };
        let Ok(h) = host() else { return };
        let Ok(mut views) = lock(&h.service) else {
            return;
        };
        let Ok(v) = checked(&mut views, token, generation, None) else {
            return;
        };
        if current(&h.state, &v.source).is_err() {
            return;
        }
        if value["requestId"]
            .as_u64()
            .is_some_and(|id| id != v.last_request)
        {
            return;
        }
        let event = value["event"].as_str().unwrap_or("");
        if event == "shortcut" {
            if let Some(app) = &h.app {
                if let Some(w) = app.get_webview_window("main") {
                    let _=w.emit("html:shortcut",serde_json::json!({"viewToken":token,"generation":generation,"key":value["key"],"shift":value["shift"]}));
                }
            }
            return;
        }
        if matches!(event, "navigation_blocked" | "resource_issue") {
            issue(
                v,
                value["url"].as_str().unwrap_or(""),
                if event == "navigation_blocked" {
                    "navigation"
                } else {
                    "image"
                },
                value["reason"]
                    .as_str()
                    .unwrap_or("automatic_navigation_blocked"),
            );
        }
        if event == "link" {
            let Some(url) = value["url"].as_str().filter(|u| u.len() <= 4096) else {
                return;
            };
            let id = Uuid::new_v4().to_string();
            if v.pending_links.len() >= 32 {
                v.pending_links.clear();
            }
            v.pending_links.insert(id.clone(), url.into());
            if let Some(app) = &h.app {
                if let Some(w) = app.get_webview_window("main") {
                    let _=w.emit("html:link_activated",serde_json::json!({"viewToken":token,"generation":generation,"revision":v.state.revision,"navigationId":id,"destination":url,"location":v.state.location}));
                }
            }
            return;
        }
        if let Some(location) = value
            .get("location")
            .and_then(|l| serde_json::from_value(l.clone()).ok())
        {
            v.state.location = location;
        }
        if let Some(headings) = value
            .get("headings")
            .and_then(|l| serde_json::from_value::<Vec<Heading>>(l.clone()).ok())
        {
            v.state.headings = headings.into_iter().take(1000).collect();
        }
        if event == "ready" {
            v.state.state = if value["empty"].as_bool() == Some(true) {
                "empty"
            } else {
                "ready"
            }
            .into();
        }
        if event == "failed" {
            v.state.state = "failed".into();
            if v.state.reason_code.is_none() {
                v.state.reason_code = Some("html_render_failed".into());
            }
        }
        v.state.revision += 1;
        if let Some(app) = &h.app {
            if let Some(w) = app.get_webview_window("main") {
                let _ = w.emit("html:view_state", &v.state);
                if event == "location" {
                    let _ = w.emit("html:location_changed", &v.state);
                }
            }
        }
    });
}
#[cfg(target_os = "macos")]
extern "C" {
    pub(crate) fn ig_html_mount(
        parent: *mut std::ffi::c_void,
        token: *const std::ffi::c_char,
        generation: u64,
        request: u64,
        url: *const std::ffi::c_char,
        x: f64,
        y: f64,
        w: f64,
        h: f64,
        visible: bool,
    ) -> bool;
    pub(crate) fn ig_html_op(
        token: *const std::ffi::c_char,
        generation: u64,
        request: u64,
        op: *const std::ffi::c_char,
        json: *const std::ffi::c_char,
        reply: extern "C" fn(u64, *const std::ffi::c_char),
        ticket: u64,
    );
}
static REPLIES: OnceLock<Mutex<HashMap<u64, std::sync::mpsc::Sender<String>>>> = OnceLock::new();
static TICKET: std::sync::atomic::AtomicU64 = std::sync::atomic::AtomicU64::new(1);
pub(crate) extern "C" fn reply(ticket: u64, raw: *const std::ffi::c_char) {
    if raw.is_null() {
        return;
    }
    let text = unsafe { std::ffi::CStr::from_ptr(raw) }
        .to_string_lossy()
        .into_owned();
    if let Ok(mut pending) = REPLIES.get_or_init(Default::default).lock() {
        if let Some(sender) = pending.remove(&ticket) {
            let _ = sender.send(text);
        }
    }
}
pub(crate) async fn native_mount(
    window: tauri::WebviewWindow,
    token: String,
    generation: u64,
    request: u64,
    url: String,
    b: Bounds,
    visible: bool,
) -> AppResult<()> {
    #[cfg(target_os = "macos")]
    {
        let parent = window
            .ns_window()
            .map_err(|_| err("html_render_failed", "Native parent unavailable"))?
            as usize;
        let (send, recv) = std::sync::mpsc::channel();
        let t = token.clone();
        window
            .run_on_main_thread(move || {
                let result = (|| {
                    let h = host()?;
                    let mut views = lock(&h.service)?;
                    let v = checked(&mut views, &t, generation, None)?;
                    if v.last_request != request {
                        return Err(err("stale_request", "Mount superseded"));
                    }
                    let token = std::ffi::CString::new(t).unwrap();
                    let url = std::ffi::CString::new(url).unwrap();
                    if unsafe {
                        ig_html_mount(
                            parent as _,
                            token.as_ptr(),
                            generation,
                            request,
                            url.as_ptr(),
                            b.x,
                            b.y,
                            b.width,
                            b.height,
                            visible,
                        )
                    } {
                        Ok(())
                    } else {
                        Err(err("html_render_failed", "Native mount failed"))
                    }
                })();
                let _ = send.send(result);
            })
            .map_err(|_| err("html_render_failed", "Main thread unavailable"))?;
        tauri::async_runtime::spawn_blocking(move || {
            recv.recv_timeout(std::time::Duration::from_secs(6))
                .map_err(|_| err("html_render_failed", "Mount deadline"))?
        })
        .await
        .map_err(|_| err("internal", "Mount task failed"))?
    }
    #[cfg(target_os = "windows")]
    {
        let (send, recv) = std::sync::mpsc::channel();
        let w = window.clone();
        window
            .run_on_main_thread(move || {
                let result =
                    windows_surface::mount(&w, &token, generation, request, &url, &b, visible);
                let _ = send.send(result);
            })
            .map_err(|_| err("html_render_failed", "Main thread unavailable"))?;
        tauri::async_runtime::spawn_blocking(move || {
            recv.recv_timeout(std::time::Duration::from_secs(6))
                .map_err(|_| err("html_render_failed", "Mount deadline"))?
        })
        .await
        .map_err(|_| err("internal", "Mount task failed"))?
    }
}
pub(crate) async fn native_op(
    window: tauri::WebviewWindow,
    token: String,
    generation: u64,
    request: u64,
    op: &'static str,
    json: serde_json::Value,
) -> AppResult<serde_json::Value> {
    #[cfg(target_os = "macos")]
    {
        let ticket = TICKET.fetch_add(1, std::sync::atomic::Ordering::Relaxed);
        let (send, recv) = std::sync::mpsc::channel();
        REPLIES
            .get_or_init(Default::default)
            .lock()
            .unwrap()
            .insert(ticket, send);
        let t = token.clone();
        let json = json.to_string();
        window
            .run_on_main_thread(move || {
                let valid = op == "dispose"
                    || host()
                        .and_then(|h| {
                            let mut views = lock(&h.service)?;
                            let v = checked(&mut views, &t, generation, None)?;
                            if v.last_request != request {
                                Err(err("stale_request", "Operation superseded"))
                            } else {
                                Ok(())
                            }
                        })
                        .is_ok();
                if !valid {
                    reply(ticket, c"{\"error\":\"stale_request\"}".as_ptr());
                    return;
                }
                let t = std::ffi::CString::new(t).unwrap();
                let o = std::ffi::CString::new(op).unwrap();
                let j = std::ffi::CString::new(json).unwrap();
                unsafe {
                    ig_html_op(
                        t.as_ptr(),
                        generation,
                        request,
                        o.as_ptr(),
                        j.as_ptr(),
                        reply,
                        ticket,
                    )
                };
            })
            .map_err(|_| err("html_render_failed", "Main thread unavailable"))?;
        let result = tauri::async_runtime::spawn_blocking(move || {
            recv.recv_timeout(std::time::Duration::from_secs(6))
        })
        .await;
        REPLIES
            .get_or_init(Default::default)
            .lock()
            .unwrap()
            .remove(&ticket);
        let text = result
            .map_err(|_| err("internal", "HTML operation task failed"))?
            .map_err(|_| err("html_render_failed", "HTML operation deadline"))?;
        if op != "dispose" {
            let h = host()?;
            let mut views = lock(&h.service)?;
            let v = checked(&mut views, &token, generation, None)?;
            if v.last_request != request {
                return Err(err("stale_request", "Response superseded"));
            }
        }
        let value: serde_json::Value = serde_json::from_str(&text)
            .map_err(|_| err("html_render_failed", "Invalid native response"))?;
        if let Some(code) = value["error"].as_str() {
            return Err(AppError::new(
                match code {
                    "anchor_missing" => "anchor_missing",
                    "stale_view" => "stale_view",
                    "stale_request" => "stale_request",
                    "html_limit" => "html_limit",
                    "hidden_view" => "hidden_view",
                    _ => "html_render_failed",
                },
                code,
            ));
        }
        Ok(value)
    }
    #[cfg(target_os = "windows")]
    {
        let ticket = TICKET.fetch_add(1, std::sync::atomic::Ordering::Relaxed);
        let (send, recv) = std::sync::mpsc::channel();
        REPLIES
            .get_or_init(Default::default)
            .lock()
            .unwrap()
            .insert(ticket, send);
        let t = token.clone();
        window
            .run_on_main_thread(move || {
                windows_surface::operation(&t, generation, request, op, json, ticket)
            })
            .map_err(|_| err("html_render_failed", "Main thread unavailable"))?;
        let result = tauri::async_runtime::spawn_blocking(move || {
            recv.recv_timeout(std::time::Duration::from_secs(6))
        })
        .await;
        REPLIES
            .get_or_init(Default::default)
            .lock()
            .unwrap()
            .remove(&ticket);
        let text = result
            .map_err(|_| err("internal", "HTML task failed"))?
            .map_err(|_| err("html_render_failed", "Operation deadline"))?;
        if op != "dispose" {
            let h = host()?;
            let mut views = lock(&h.service)?;
            let v = checked(&mut views, &token, generation, None)?;
            if v.last_request != request {
                return Err(err("stale_request", "Reply superseded"));
            }
        }
        let value: serde_json::Value = serde_json::from_str(&text)
            .map_err(|_| err("html_render_failed", "Invalid native response"))?;
        if let Some(code) = value["error"].as_str() {
            return Err(AppError::new(
                match code {
                    "anchor_missing" => "anchor_missing",
                    "stale_view" => "stale_view",
                    "stale_request" => "stale_request",
                    "html_limit" => "html_limit",
                    "hidden_view" => "hidden_view",
                    _ => "html_render_failed",
                },
                code,
            ));
        }
        Ok(value)
    }
}
pub fn hide_all() {
    #[cfg(target_os = "macos")]
    unsafe {
        ig_html_op(
            c"".as_ptr(),
            0,
            0,
            c"hide_all".as_ptr(),
            c"{}".as_ptr(),
            reply,
            0,
        );
    }
    #[cfg(target_os = "windows")]
    windows_surface::hide_all();
}
pub fn dispose_all() {
    if let Ok(h) = host() {
        if let Ok(mut views) = lock(&h.service) {
            views.clear();
        }
        if let Ok(opens) = h.service.opens.lock() {
            for control in opens.values() {
                control.store(true, std::sync::atomic::Ordering::SeqCst);
            }
        }
    }
    #[cfg(target_os = "windows")]
    windows_surface::dispose_all();
    #[cfg(target_os = "macos")]
    unsafe {
        ig_html_op(
            c"".as_ptr(),
            0,
            0,
            c"dispose_all".as_ptr(),
            c"{}".as_ptr(),
            reply,
            0,
        );
    }
}
