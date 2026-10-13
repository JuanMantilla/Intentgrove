use super::*;
#[no_mangle]
pub unsafe extern "C" fn ig_html_probe_next_request(token: *const std::ffi::c_char) -> u64 {
    let token = std::ffi::CStr::from_ptr(token).to_str().unwrap();
    let h = host().unwrap();
    let mut views = lock(&h.service).unwrap();
    let v = views.get_mut(token).unwrap();
    let next = v.last_request + 1;
    checked(&mut views, token, 1, Some(next)).unwrap();
    next
}
pub fn probe_run() {
    use serde_json::json;
    extern "C" {
        fn ig_html_probe_window() -> *mut std::ffi::c_void;
        fn ig_html_probe_poll(seconds: f64);
        fn ig_html_probe_eval(
            token: *const std::ffi::c_char,
            script: *const std::ffi::c_char,
        ) -> *mut std::ffi::c_char;
        fn ig_html_probe_race_viewport(token: *const std::ffi::c_char);
        fn ig_html_probe_op_request(
            token: *const std::ffi::c_char,
            generation: u64,
            request: u64,
            op: *const std::ffi::c_char,
            json: *const std::ffi::c_char,
        ) -> *mut std::ffi::c_char;
        fn ig_html_probe_pending_dispose(token: *const std::ffi::c_char) -> *mut std::ffi::c_char;
        fn ig_html_probe_close(parent: *mut std::ffi::c_void);
        fn ig_html_probe_snapshot(
            token: *const std::ffi::c_char,
            path: *const std::ffi::c_char,
        ) -> bool;
    }
    unsafe fn ig_html_probe_op(
        token: *const std::ffi::c_char,
        generation: u64,
        op: *const std::ffi::c_char,
        json: *const std::ffi::c_char,
    ) -> *mut std::ffi::c_char {
        let request = if std::ffi::CStr::from_ptr(op).to_bytes() == b"dispose" {
            0
        } else {
            ig_html_probe_next_request(token)
        };
        ig_html_probe_op_request(token, generation, request, op, json)
    }
    fn c(s: &str) -> std::ffi::CString {
        std::ffi::CString::new(s).unwrap()
    }
    fn native_json(ptr: *mut std::ffi::c_char) -> serde_json::Value {
        let text = unsafe { std::ffi::CStr::from_ptr(ptr) }
            .to_string_lossy()
            .into_owned();
        unsafe { libc::free(ptr.cast()) };
        serde_json::from_str(&text).unwrap()
    }
    let args: Vec<_> = std::env::args().collect();
    let path = Path::new(args.get(1).expect("disposable fixture workspace"));
    let mode = args.get(2).map(String::as_str).unwrap_or("folder");
    assert!(
        path.to_string_lossy().contains("intentgrove-html-"),
        "probe only accepts task-owned temporary corpus"
    );
    let state = AppState::default();
    let service = Arc::new(HtmlService::default());
    initialize(state.clone(), service.clone(), None).unwrap();
    let parent = unsafe { ig_html_probe_window() };
    let mut results = vec![];
    let root = if mode == "folder" {
        Some(state.register_root(path).unwrap())
    } else {
        None
    };
    for name in [
        "page.html",
        "hostile.html",
        "second.htm",
        "empty.html",
        "unstyled.html",
        "nested/relative.html",
    ] {
        let target = if let Some(root) = &root {
            LocalTarget {
                file_id: None,
                root_id: Some(root.id.clone()),
                segments: Some(name.split('/').map(String::from).collect()),
            }
        } else {
            let f = state.register_explicit_file(&path.join(name)).unwrap();
            LocalTarget {
                file_id: Some(f.id),
                root_id: None,
                segments: None,
            }
        };
        let view = open_impl(&state, &service, target.clone(), None).unwrap();
        let token = view.view_token.clone().unwrap();
        let url = start_url(lock(&service).unwrap().get(&token).unwrap());
        if mode == "resource-folder" || mode == "resource-file" {
            let asset_path = if mode == "resource-folder" {
                path.to_path_buf()
            } else {
                path.join("assets/page.css")
            };
            let folder = mode == "resource-folder";
            let file = scope::open_selected(&asset_path, folder).unwrap();
            lock(&service)
                .unwrap()
                .get_mut(&token)
                .unwrap()
                .assets
                .push(SelectedAsset {
                    identity: scope::identity(&file).unwrap(),
                    path: asset_path,
                    file: Arc::new(file),
                    folder,
                });
        }
        assert!(unsafe {
            ig_html_mount(
                parent,
                c(&token).as_ptr(),
                1,
                0,
                c(&url).as_ptr(),
                0.0,
                0.0,
                900.0,
                660.0,
                true,
            )
        });
        unsafe { ig_html_probe_race_viewport(c(&token).as_ptr()) };
        let start = Instant::now();
        loop {
            unsafe { ig_html_probe_poll(0.02) };
            let status = lock(&service)
                .unwrap()
                .get(&token)
                .unwrap()
                .state
                .state
                .clone();
            if status != "opening" || start.elapsed().as_secs() >= 7 {
                break;
            }
        }
        let startup_request = lock(&service)
            .unwrap()
            .get(&token)
            .unwrap()
            .state
            .request_id;
        let dom = native_json(unsafe {
            ig_html_probe_eval(c(&token).as_ptr(),c("JSON.stringify({title:document.title,bg:getComputedStyle(document.body).backgroundColor,color:getComputedStyle(document.body).color,h1font:getComputedStyle(document.querySelector('h1')||document.body).fontFamily,images:[...document.images].map(i=>({src:i.getAttribute('src'),width:i.naturalWidth})),hostile:document.documentElement.dataset.executed??null,ipc:typeof window.__TAURI_INTERNALS__,webkit:typeof window.webkit?.messageHandlers,frames:frames.length,url:location.href,fonts:[...document.fonts].map(f=>({family:f.family,status:f.status})),border:getComputedStyle(document.body).borderTopWidth,frameContent:[...document.querySelectorAll('iframe')].map(f=>{try{return f.contentDocument?.body?.innerText||'empty'}catch{return 'denied'}})})").as_ptr())
        });
        let screenshot = if let Some(output) = args.get(3) {
            let name = format!("{output}/native-{mode}-{}.png", name.replace('/', "_"));
            unsafe { ig_html_probe_snapshot(c(&token).as_ptr(), c(&name).as_ptr()) }
        } else {
            false
        };
        let outline = native_json(unsafe {
            ig_html_probe_op(
                c(&token).as_ptr(),
                1,
                c("snapshot").as_ptr(),
                c("{}").as_ptr(),
            )
        });
        let find = native_json(unsafe {
            ig_html_probe_op(
                c(&token).as_ptr(),
                1,
                c("find").as_ptr(),
                c("{\"query\":\"Authored CSS\",\"backwards\":false}").as_ptr(),
            )
        });
        let anchor = native_json(unsafe {
            ig_html_probe_op(c(&token).as_ptr(),1,c("location").as_ptr(),c("{\"headingId\":\"section two\",\"offset\":0,\"scrollTop\":0,\"scrollLeft\":0,\"zoom\":1.5}").as_ptr())
        });
        let missing = native_json(unsafe {
            ig_html_probe_op(c(&token).as_ptr(),1,c("location").as_ptr(),c("{\"headingId\":\"absent\",\"offset\":0,\"scrollTop\":0,\"scrollLeft\":0,\"zoom\":1}").as_ptr())
        });
        // App-generated activation, distinct from physical mouse/Return acceptance.
        let activation = native_json(unsafe {
            ig_html_probe_eval(
                c(&token).as_ptr(),
                c("document.querySelector('a[href=\"notes.md\"]')?.click();'activated'").as_ptr(),
            )
        });
        unsafe { ig_html_probe_poll(0.1) };
        let links = lock(&service)
            .unwrap()
            .get(&token)
            .unwrap()
            .pending_links
            .values()
            .cloned()
            .collect::<Vec<_>>();
        let security = native_json(unsafe {
            ig_html_probe_eval(c(&token).as_ptr(),c("for(const a of document.querySelectorAll('a')){if(/^(javascript:|data:|http|file:|ipc:)/.test(a.getAttribute('href')||''))a.click();}document.querySelector('form')?.requestSubmit();try{window.open('http://127.0.0.1:9/popup')}catch{}try{location.assign(new URL('second.htm',location.href).href)}catch{}JSON.stringify({marker:document.documentElement.dataset.executed??null,url:location.href,ipc:typeof window.__TAURI_INTERNALS__,handlers:typeof window.webkit?.messageHandlers})").as_ptr())
        });
        unsafe { ig_html_probe_poll(0.1) };
        let snapshot = lock(&service).unwrap().get(&token).unwrap().state.clone();
        let saved_assets = lock(&service).unwrap().get(&token).unwrap().assets.clone();
        let pending_disposal =
            native_json(unsafe { ig_html_probe_pending_dispose(c(&token).as_ptr()) });
        let disposed = dispose_impl(&service, &token, 1).unwrap();
        let native_dispose = native_json(unsafe {
            ig_html_probe_op(
                c(&token).as_ptr(),
                1,
                c("dispose").as_ptr(),
                c("{}").as_ptr(),
            )
        });
        let stale = resource_impl(&state, &service, &token, &url)
            .unwrap_err()
            .code;
        let mut refresh = json!(null);
        if name == "page.html" {
            let replacement = open_impl(&state, &service, target.clone(), None).unwrap();
            let next = replacement.view_token.clone().unwrap();
            lock(&service).unwrap().get_mut(&next).unwrap().assets = saved_assets;
            let next_url = start_url(lock(&service).unwrap().get(&next).unwrap());
            assert!(unsafe {
                ig_html_mount(
                    parent,
                    c(&next).as_ptr(),
                    1,
                    0,
                    c(&next_url).as_ptr(),
                    0.0,
                    0.0,
                    900.0,
                    660.0,
                    true,
                )
            });
            let start = Instant::now();
            while lock(&service).unwrap().get(&next).unwrap().state.state == "opening"
                && start.elapsed().as_secs() < 7
            {
                unsafe { ig_html_probe_poll(0.02) };
            }
            let ready = lock(&service)
                .unwrap()
                .get(&next)
                .unwrap()
                .state
                .state
                .clone();
            let restored = native_json(unsafe {
                ig_html_probe_op(c(&next).as_ptr(),1,c("location").as_ptr(),c("{\"headingId\":\"section two\",\"offset\":0,\"scrollTop\":0,\"scrollLeft\":0,\"zoom\":1.5}").as_ptr())
            });
            dispose_impl(&service, &next, 1).unwrap();
            let _ = native_json(unsafe {
                ig_html_probe_op(
                    c(&next).as_ptr(),
                    1,
                    c("dispose").as_ptr(),
                    c("{}").as_ptr(),
                )
            });
            let cancelled = open_impl(&state, &service, target, None).unwrap();
            let ct = cancelled.view_token.unwrap();
            let cu = start_url(lock(&service).unwrap().get(&ct).unwrap());
            assert!(unsafe {
                ig_html_mount(
                    parent,
                    c(&ct).as_ptr(),
                    1,
                    0,
                    c(&cu).as_ptr(),
                    0.0,
                    0.0,
                    900.0,
                    660.0,
                    true,
                )
            });
            dispose_impl(&service, &ct, 1).unwrap();
            let cancelled_native = native_json(unsafe {
                ig_html_probe_op(c(&ct).as_ptr(), 1, c("dispose").as_ptr(), c("{}").as_ptr())
            });
            unsafe { ig_html_probe_poll(0.1) };
            refresh = json!({"newToken": next != token,"state":ready,"restored":restored,"cancelBeforeReady":cancelled_native,"cancelledBroker":resource_impl(&state,&service,&ct,&cu).unwrap_err().code});
        }
        results.push(json!({"name":name,"startupViewportRequest":startup_request,"screenshot":screenshot,"descriptor":view,"state":snapshot,"dom":dom,"outline":outline,"find":find,"anchor":anchor,"missingAnchor":missing,"activation":activation,"security":security,"links":links,"refresh":refresh,"pendingDisposal":pending_disposal,"disposed":disposed,"nativeDispose":native_dispose,"stale":stale}));
    }
    unsafe { ig_html_probe_close(parent) };
    println!("{}",serde_json::to_string_pretty(&json!({"mode":mode,"results":results,"scope":"direct native WKWebView plus real Rust grant/broker; not packaged Tauri/frontend acceptance"})).unwrap());
}
