#[cfg(all(feature = "acceptance-harness", not(target_os = "macos")))]
compile_error!("The existing acceptance harness is macOS-only; use a disposable Windows fixture identifier for desktop verification");
#[cfg(all(feature = "acceptance-harness", target_os = "macos"))]
mod acceptance_harness;
mod assets;
mod command_args;
mod default_markdown;
#[cfg(feature = "document-contract-tests")]
#[doc(hidden)]
pub mod document_contract_tests;
mod document_view;
mod html;
mod platform;
mod prototype;
#[cfg(all(feature = "html-native-probe", target_os = "macos"))]
pub use html::probe_run;
mod creation;
mod diagram;
mod document;
mod editing;
#[cfg(target_os = "macos")]
mod editing_menu;
mod image;
mod large_source;
mod listing;
mod native_entry;
mod recents;
mod recovery;
mod refresh;
mod reveal;
mod save_copies;
mod scope;
mod search;
mod selection;
mod session;
mod settings;
mod state;
use tauri::{Emitter, Manager};
#[cfg(target_os = "macos")]
static LAST_WINDOW_CLOSE_MS: std::sync::atomic::AtomicU64 = std::sync::atomic::AtomicU64::new(0);
#[cfg(target_os = "macos")]
static APP_READY: std::sync::atomic::AtomicBool = std::sync::atomic::AtomicBool::new(false);

#[cfg(target_os = "macos")]
struct NativeMenuControls {
    editor: editing_menu::EditorMenu,
    new_markdown: tauri::menu::MenuItem<tauri::Wry>,
    open_file: tauri::menu::MenuItem<tauri::Wry>,
    open_folder: tauri::menu::MenuItem<tauri::Wry>,
    close_tab: tauri::menu::MenuItem<tauri::Wry>,
    save: tauri::menu::MenuItem<tauri::Wry>,
    find: tauri::menu::MenuItem<tauri::Wry>,
    reload: tauri::menu::MenuItem<tauri::Wry>,
    appearance_system: tauri::menu::MenuItem<tauri::Wry>,
    appearance_light: tauri::menu::MenuItem<tauri::Wry>,
    appearance_dark: tauri::menu::MenuItem<tauri::Wry>,
    settings: tauri::menu::MenuItem<tauri::Wry>,
    reading_settings: tauri::menu::MenuItem<tauri::Wry>,
    go: tauri::menu::Submenu<tauri::Wry>,
    back: tauri::menu::MenuItem<tauri::Wry>,
    forward: tauri::menu::MenuItem<tauri::Wry>,
    visited: tauri::menu::MenuItem<tauri::Wry>,
    clear_history: tauri::menu::MenuItem<tauri::Wry>,
}

#[cfg(target_os = "macos")]
crate::command_args::flat_command_args! {
    NativeMenuArgs {
        close_tab: bool => "closeTab",
        save: bool => "save",
        find: bool => "find",
        reload: bool => "reload",
        locale: String => "locale",
        back: Option<bool> => "back",
        forward: Option<bool> => "forward",
        visited: Option<bool> => "visited",
        clear_history: Option<bool> => "clearHistory",
        editing_owner: Option<bool> => "editingOwner",
        editing_undo: Option<bool> => "editingUndo",
        editing_redo: Option<bool> => "editingRedo",
        editing_selection: Option<bool> => "editingSelection",
        default_markdown_ready: Option<bool> => "defaultMarkdownReady",
        new_markdown_ready: Option<bool> => "newMarkdownReady",
    }
}

#[cfg(target_os = "macos")]
#[tauri::command]
fn set_native_menu_state(
    controls: tauri::State<'_, NativeMenuControls>,
    window: tauri::WebviewWindow,
    args: NativeMenuArgs,
) -> scope::AppResult<()> {
    let NativeMenuArgs {
        close_tab,
        save,
        find,
        reload,
        locale,
        back,
        forward,
        visited,
        clear_history,
        editing_owner,
        editing_undo,
        editing_redo,
        editing_selection,
        default_markdown_ready,
        new_markdown_ready,
    } = args;
    let es = locale == "es";
    controls
        .new_markdown
        .set_enabled(
            new_markdown_ready.unwrap_or(false)
                && window.label() == "main"
                && window.is_focused().unwrap_or(false),
        )
        .map_err(|e| scope::AppError::new("menu_error", e.to_string()))?;
    default_markdown::update(&window, default_markdown_ready.unwrap_or(false), es);
    controls
        .editor
        .update(
            editing_owner.unwrap_or(false)
                && window.label() == "main"
                && window.is_focused().unwrap_or(false),
            editing_undo.unwrap_or(false),
            editing_redo.unwrap_or(false),
            editing_selection.unwrap_or(false),
            es,
        )
        .map_err(|err| scope::AppError::new("menu_error", err.to_string()))?;
    for (item, enabled) in [
        (&controls.back, back),
        (&controls.forward, forward),
        (&controls.visited, visited),
        (&controls.clear_history, clear_history),
    ] {
        item.set_enabled(enabled.unwrap_or(false))
            .map_err(|err| scope::AppError::new("menu_error", err.to_string()))?;
    }
    controls
        .go
        .set_text(if es { "Ir" } else { "Go" })
        .map_err(|err| scope::AppError::new("menu_error", err.to_string()))?;
    controls
        .close_tab
        .set_enabled(close_tab)
        .map_err(|err| scope::AppError::new("menu_error", err.to_string()))?;
    controls
        .save
        .set_enabled(save)
        .map_err(|err| scope::AppError::new("menu_error", err.to_string()))?;
    controls
        .find
        .set_enabled(find)
        .map_err(|err| scope::AppError::new("menu_error", err.to_string()))?;
    controls
        .reload
        .set_enabled(reload)
        .map_err(|err| scope::AppError::new("menu_error", err.to_string()))?;
    for (item, en, spanish) in [
        (
            &controls.new_markdown,
            "New Markdown File…",
            "Nuevo archivo Markdown…",
        ),
        (&controls.open_file, "Open File…", "Abrir archivo…"),
        (&controls.open_folder, "Open Folder…", "Abrir carpeta…"),
        (
            &controls.close_tab,
            if close_tab {
                "Close Tab"
            } else {
                "Close Tab (no tab)"
            },
            if close_tab {
                "Cerrar pestaña"
            } else {
                "Cerrar pestaña (sin pestaña)"
            },
        ),
        (
            &controls.save,
            if save {
                "Save"
            } else {
                "Save (no unsaved edit)"
            },
            if save {
                "Guardar"
            } else {
                "Guardar (sin cambios pendientes)"
            },
        ),
        (
            &controls.find,
            if find {
                "Find in Document"
            } else {
                "Find in Document (open a document)"
            },
            if find {
                "Buscar en el documento"
            } else {
                "Buscar en el documento (abre uno primero)"
            },
        ),
        (
            &controls.reload,
            if reload {
                "Reload"
            } else {
                "Reload (open a document)"
            },
            if reload {
                "Recargar"
            } else {
                "Recargar (abre un documento primero)"
            },
        ),
        (&controls.back, "Back", "Atrás"),
        (&controls.forward, "Forward", "Adelante"),
        (
            &controls.visited,
            "Visited Documents…",
            "Documentos visitados…",
        ),
        (
            &controls.clear_history,
            "Clear Visit History",
            "Borrar historial de visitas",
        ),
        (
            &controls.appearance_system,
            "System Appearance",
            "Apariencia del sistema",
        ),
        (
            &controls.appearance_light,
            "Light Appearance",
            "Apariencia clara",
        ),
        (
            &controls.appearance_dark,
            "Dark Appearance",
            "Apariencia oscura",
        ),
        (&controls.settings, "Settings…", "Ajustes…"),
        (
            &controls.reading_settings,
            "Reading Settings…",
            "Ajustes de lectura…",
        ),
    ] {
        item.set_text(if es { spanish } else { en })
            .map_err(|err| scope::AppError::new("menu_error", err.to_string()))?;
    }
    Ok(())
}

#[cfg(target_os = "windows")]
struct WindowsFileMenu {
    new_markdown: tauri::menu::MenuItem<tauri::Wry>,
}
#[cfg(target_os = "windows")]
#[tauri::command]
fn set_native_menu_state(
    window: tauri::WebviewWindow,
    controls: tauri::State<'_, WindowsFileMenu>,
    locale: String,
    new_markdown_ready: Option<bool>,
) -> scope::AppResult<()> {
    controls
        .new_markdown
        .set_text(if locale == "es" {
            "Nuevo archivo Markdown…"
        } else {
            "New Markdown File…"
        })
        .and_then(|_| {
            controls.new_markdown.set_enabled(
                new_markdown_ready.unwrap_or(false)
                    && window.label() == "main"
                    && window.is_focused().unwrap_or(false),
            )
        })
        .map_err(|e| scope::AppError::new("menu_error", e.to_string()))
}
#[cfg(target_os = "windows")]
fn install_windows_file_menu(app: &mut tauri::App) -> tauri::Result<()> {
    use tauri::menu::{Menu, MenuItem, Submenu};
    let new_markdown = MenuItem::with_id(
        app.handle(),
        "workspace_new_markdown",
        "New Markdown File…",
        false,
        Some("CmdOrCtrl+T"),
    )?;
    let file = Submenu::with_items(app.handle(), "File", true, &[&new_markdown])?;
    app.set_menu(Menu::with_items(app.handle(), &[&file])?)?;
    app.manage(WindowsFileMenu { new_markdown });
    Ok(())
}

#[cfg(target_os = "macos")]
static QUIT_APP: std::sync::OnceLock<tauri::AppHandle> = std::sync::OnceLock::new();

#[cfg(target_os = "macos")]
extern "C" fn should_defer_native_quit() -> bool {
    // A Rust panic must never cross the Objective-C ABI; fail closed for drafts.
    std::panic::catch_unwind(|| {
        let Some(app) = QUIT_APP.get() else {
            return true;
        };
        let editing = app.state::<editing::EditingState>();
        if editing.quit_allowed() {
            return false;
        }
        if !editing.has_sessions()
            && app
                .state::<state::AppState>()
                .selection_epoch()
                .unwrap_or(0)
                == 0
        {
            return false;
        }
        if let Some(window) = app.get_webview_window("main") {
            let _ = window.emit("editing:close_requested", "quit");
        }
        true
    })
    .unwrap_or(true)
}

#[cfg(target_os = "macos")]
fn install_native_quit_guard(app: &tauri::AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    extern "C" {
        fn md_install_quit_guard(callback: extern "C" fn() -> bool) -> bool;
    }
    QUIT_APP
        .set(app.clone())
        .map_err(|_| "Native quit guard already initialized")?;
    // Setup runs on the main thread with the existing Tao application delegate.
    if unsafe { md_install_quit_guard(should_defer_native_quit) } {
        Ok(())
    } else {
        Err("Could not install the native editing Quit guard".into())
    }
}

#[cfg(target_os = "macos")]
fn install_quit_menu(app: &mut tauri::App) -> tauri::Result<()> {
    use tauri::menu::{Menu, MenuItem, MenuItemKind, PredefinedMenuItem};
    let menu = Menu::default(app.handle())?;
    let settings = MenuItem::with_id(
        app.handle(),
        "workspace_settings",
        "Settings…",
        true,
        Some("Cmd+,"),
    )?;
    let reading_settings = MenuItem::with_id(
        app.handle(),
        "workspace_reading_settings",
        "Reading Settings…",
        true,
        None::<&str>,
    )?;
    if let Some(MenuItemKind::Submenu(app_menu)) = menu.items()?.first() {
        let items = app_menu.items()?;
        if !items.is_empty() {
            app_menu.remove_at(items.len() - 1)?;
        }
        let safe_quit =
            MenuItem::with_id(app.handle(), "editing_quit", "Quit", true, Some("Cmd+Q"))?;
        app_menu.append(&settings)?;
        app_menu.append(&safe_quit)?;
    }
    let items = menu.items()?;
    let new_markdown = MenuItem::with_id(
        app.handle(),
        "workspace_new_markdown",
        "New Markdown File…",
        false,
        Some("CmdOrCtrl+T"),
    )?;
    let open_file = MenuItem::with_id(
        app.handle(),
        "workspace_open_file",
        "Open File…",
        true,
        Some("Cmd+O"),
    )?;
    let open_folder = MenuItem::with_id(
        app.handle(),
        "workspace_open_folder",
        "Open Folder…",
        true,
        Some("Cmd+Shift+O"),
    )?;
    let close_tab = MenuItem::with_id(
        app.handle(),
        "workspace_close_tab",
        "Close Tab",
        false,
        Some("Cmd+W"),
    )?;
    let close_window = MenuItem::with_id(
        app.handle(),
        "workspace_close_window",
        "Close Window",
        true,
        Some("Cmd+Shift+W"),
    )?;
    let save = MenuItem::with_id(app.handle(), "workspace_save", "Save", false, Some("Cmd+S"))?;
    if let Some(MenuItemKind::Submenu(file_menu)) = items.get(1) {
        let existing = file_menu.items()?;
        for _ in 0..existing.len() {
            file_menu.remove_at(0)?;
        }
        file_menu.append(&new_markdown)?;
        file_menu.append(&open_file)?;
        file_menu.append(&open_folder)?;
        file_menu.append(&PredefinedMenuItem::separator(app.handle())?)?;
        file_menu.append(&save)?;
        file_menu.append(&PredefinedMenuItem::separator(app.handle())?)?;
        file_menu.append(&close_tab)?;
        file_menu.append(&close_window)?;
    }
    let find = MenuItem::with_id(
        app.handle(),
        "workspace_find",
        "Find in Document",
        false,
        Some("Cmd+F"),
    )?;
    let reload = MenuItem::with_id(
        app.handle(),
        "workspace_reload",
        "Reload",
        false,
        Some("Cmd+R"),
    )?;
    let appearance_system = MenuItem::with_id(
        app.handle(),
        "workspace_appearance_system",
        "System Appearance",
        true,
        None::<&str>,
    )?;
    let appearance_light = MenuItem::with_id(
        app.handle(),
        "workspace_appearance_light",
        "Light Appearance",
        true,
        None::<&str>,
    )?;
    let appearance_dark = MenuItem::with_id(
        app.handle(),
        "workspace_appearance_dark",
        "Dark Appearance",
        true,
        None::<&str>,
    )?;
    if let Some(MenuItemKind::Submenu(view_menu)) = items.get(3) {
        view_menu.prepend(&find)?;
        view_menu.append(&reading_settings)?;
        view_menu.append(&reload)?;
        view_menu.append(&PredefinedMenuItem::separator(app.handle())?)?;
        view_menu.append(&appearance_system)?;
        view_menu.append(&appearance_light)?;
        view_menu.append(&appearance_dark)?;
    }
    let back = MenuItem::with_id(app.handle(), "go_back", "Back", false, None::<&str>)?;
    let forward = MenuItem::with_id(app.handle(), "go_forward", "Forward", false, None::<&str>)?;
    let visited = MenuItem::with_id(
        app.handle(),
        "go_visited",
        "Visited Documents…",
        false,
        None::<&str>,
    )?;
    let clear_history = MenuItem::with_id(
        app.handle(),
        "go_clear",
        "Clear Visit History",
        false,
        None::<&str>,
    )?;
    let go = tauri::menu::Submenu::with_items(
        app.handle(),
        "Go",
        true,
        &[
            &back,
            &forward,
            &PredefinedMenuItem::separator(app.handle())?,
            &visited,
            &clear_history,
        ],
    )?;
    let editor = match items.get(2) {
        Some(MenuItemKind::Submenu(edit)) => {
            editing_menu::EditorMenu::new(app.handle(), edit.clone())?
        }
        _ => {
            return Err(tauri::Error::Io(std::io::Error::other(
                "Default Edit menu unavailable",
            )))
        }
    };
    menu.insert(&go, 4)?;
    app.set_menu(menu)?;
    app.manage(NativeMenuControls {
        editor,
        new_markdown,
        open_file,
        open_folder,
        close_tab,
        save,
        find,
        reload,
        appearance_system,
        appearance_light,
        appearance_dark,
        settings,
        reading_settings,
        go,
        back,
        forward,
        visited,
        clear_history,
    });
    Ok(())
}

fn is_go_menu_action(id: &str) -> bool {
    matches!(id, "go_back" | "go_forward" | "go_visited" | "go_clear")
}

fn allowed_navigation(url: &tauri::Url) -> bool {
    (url.scheme() == "tauri" && url.host_str() == Some("localhost"))
        || (cfg!(target_os = "windows")
            && url.scheme() == "http"
            && url.host_str() == Some("tauri.localhost")
            && url.port().is_none()
            && url.username().is_empty()
            && url.password().is_none())
        || (cfg!(debug_assertions)
            && url.scheme() == "http"
            && url.host_str() == Some("localhost")
            && url.port() == Some(5173))
}

#[cfg(target_os = "macos")]
fn show_or_create_main_window(app: &tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.set_focus();
        return;
    }
    let Some(config) = app.config().app.windows.first() else {
        return;
    };
    match tauri::WebviewWindowBuilder::from_config(app, config).and_then(|builder| {
        builder
            .on_navigation(allowed_navigation)
            .on_new_window(|_, _| tauri::webview::NewWindowResponse::Deny)
            .on_download(|_, _| false)
            .build()
    }) {
        Ok(window) => {
            let _ = window.show();
            let _ = window.set_focus();
        }
        Err(_) => eprintln!("Could not reopen the main window"),
    }
}

#[tauri::command]
fn finish_editing_close(
    app: tauri::AppHandle,
    window: tauri::Window,
    quit: bool,
) -> scope::AppResult<()> {
    let editing = window.state::<editing::EditingState>();
    editing.allow_quit();
    if quit || cfg!(target_os = "windows") {
        app.state::<refresh::RefreshService>().stop();
        app.exit(0);
        return Ok(());
    }
    #[cfg(target_os = "macos")]
    LAST_WINDOW_CLOSE_MS.store(
        session::now_ms().unwrap_or(0),
        std::sync::atomic::Ordering::SeqCst,
    );
    window.destroy().map_err(|error| {
        #[cfg(target_os = "macos")]
        LAST_WINDOW_CLOSE_MS.store(0, std::sync::atomic::Ordering::SeqCst);
        editing.cancel_quit();
        scope::AppError::new("close_error", error.to_string())
    })?;
    app.state::<state::AppState>().clear_for_window_reopen()?;
    editing.clear_for_window_reopen()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    if let Some(code) =
        default_markdown::consent_only(&std::env::args().skip(1).collect::<Vec<_>>())
    {
        std::process::exit(code);
    }
    let state = state::AppState::default();
    let refresh = refresh::RefreshService::new(state.clone());
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .manage(state)
        .manage(diagram::DiagramState::default())
        .manage(editing::EditingState::default())
        .manage(creation::CreationState::default())
        .manage(large_source::LargeSourceState::default())
        .manage(search::SearchState::default())
        .manage(refresh)
        .manage(native_entry::NativeEntryState::default())
        .manage(settings::SettingsState::default())
        .invoke_handler(|invoke: tauri::ipc::Invoke| {
            #[cfg(all(feature = "acceptance-harness", target_os = "macos"))]
            if invoke.message.command() == "diagram_acceptance" {
                let handler: fn(tauri::ipc::Invoke) -> bool =
                    tauri::generate_handler![diagram::acceptance::diagram_acceptance];
                return handler(invoke);
            }
            let Some(invoke) = settings::authorize_invoke(invoke) else {
                return true;
            };
            let handler: fn(tauri::ipc::Invoke) -> bool = tauri::generate_handler![
                document_view::open_local_view,
                prototype::commands::get_prototype_document,
                prototype::commands::reload_prototype_document,
                prototype::commands::dispose_prototype_document,
                prototype::commands::release_prototype_grant,
                document_view::cancel_html_open,
                html::commands::mount_html_view,
                html::commands::update_html_viewport,
                html::commands::get_html_state,
                html::commands::set_html_location,
                html::commands::find_html_text,
                html::commands::focus_html_view,
                html::commands::capture_html_location,
                html::commands::dispose_html_view,
                html::commands::reload_html_view,
                html::commands::choose_html_resource,
                html::commands::choose_html_resource_folder,
                html::commands::resolve_local_view_link,
                html::commands::choose_html_link_file,
                settings::show_settings,
                settings::get_settings_state,
                settings::apply_settings_change,
                settings::acknowledge_settings_change,
                settings::publish_workspace_preferences,
                settings::get_workspace_preferences,
                settings::close_settings,
                creation::choose_markdown_destination,
                creation::cancel_markdown_destination,
                creation::create_markdown_file,
                selection::select_root,
                selection::prepare_root_selection,
                selection::commit_root_selection,
                selection::cancel_root_selection,
                selection::select_file,
                listing::list_entries,
                listing::cancel_listing,
                document::read_document,
                large_source::inspect_large_file,
                large_source::open_large_source,
                large_source::cancel_large_open,
                large_source::read_source_window,
                large_source::source_line_offset,
                large_source::find_large_source,
                large_source::cancel_large_find,
                large_source::copy_source_selection,
                large_source::close_large_source,
                search::start_folder_search,
                search::cancel_folder_search,
                search::open_search_hit,
                search::open_local_search_hit,
                editing::list_edit_sections,
                editing::begin_section_edit,
                editing::save_section_edit,
                editing::discard_section_edit,
                editing::suspend_section_edit,
                editing::choose_section_save_as,
                editing::commit_section_save_as,
                recovery::checkpoint_section_edit,
                recovery::load_section_recovery,
                recovery::clear_all_recovery,
                save_copies::list_safety_copies,
                save_copies::clear_resolved_safety_copies,
                session::load_workspace_session,
                session::checkpoint_workspace_session,
                session::finish_workspace_session,
                session::clear_workspace_session,
                session::reselect_session_root,
                session::reselect_session_file,
                recents::list_recent_items,
                recents::remember_recent_document,
                recents::open_recent_item,
                recents::reselect_recent_item,
                recents::remove_recent_item,
                recents::clear_recent_items,
                native_entry::list_native_entries,
                native_entry::accept_native_entry,
                native_entry::dismiss_native_entry,
                set_native_menu_state,
                finish_editing_close,
                refresh::reconcile_visible_state,
                refresh::get_confirmed_document,
                refresh::reload_item,
                refresh::cancel_reload,
                assets::resolve_link,
                reveal::reveal_file,
                assets::read_image,
                diagram::render_diagram,
                diagram::cancel_diagram,
                image::open_image,
                image::open_image_tile,
            ];
            handler(invoke)
        })
        .on_menu_event(|app, event| {
            let id = event.id().as_ref();
            if id == "workspace_new_markdown" {
                if let Some(window) = app
                    .get_webview_window("main")
                    .filter(|w| w.is_focused().unwrap_or(false))
                {
                    let _ = window.emit("native:menu", id.to_owned());
                }
                return;
            }
            #[cfg(target_os = "macos")]
            if matches!(
                id,
                "editing_undo"
                    | "editing_redo"
                    | "editing_bold"
                    | "editing_italic"
                    | "editing_code"
                    | "editing_link"
            ) {
                app.state::<NativeMenuControls>().editor.dispatch(app, id);
                return;
            }
            if let Some(window) = app
                .get_webview_window("settings")
                .filter(|w| w.is_focused().unwrap_or(false))
            {
                if matches!(id, "workspace_close_window" | "workspace_close_tab") {
                    let _ = window.close();
                    return;
                }
                // Native menu shortcuts must not mutate a background workspace
                // while a preference field owns keyboard focus.
                if (id.starts_with("workspace_") || is_go_menu_action(id))
                    && !matches!(id, "workspace_settings" | "workspace_reading_settings")
                {
                    return;
                }
            }
            if id == "workspace_settings" || id == "workspace_reading_settings" {
                #[cfg(target_os = "macos")]
                show_or_create_main_window(app);
                let _ = settings::show(
                    app,
                    if id == "workspace_settings" {
                        settings::Group::General
                    } else {
                        settings::Group::Reading
                    },
                );
                return;
            }
            if id == "workspace_close_window" {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.close();
                }
                return;
            }
            if id.starts_with("workspace_") || is_go_menu_action(id) {
                #[cfg(target_os = "macos")]
                show_or_create_main_window(app);
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.emit("native:menu", id.to_owned());
                }
                return;
            }
            if id != "editing_quit" {
                return;
            }
            if app.state::<editing::EditingState>().quit_allowed()
                || (!app.state::<editing::EditingState>().has_sessions()
                    && app
                        .state::<state::AppState>()
                        .selection_epoch()
                        .unwrap_or(0)
                        == 0)
            {
                app.exit(0);
            } else if let Some(window) = app.get_webview_window("main") {
                let _ = window.emit("editing:close_requested", "quit");
            }
        })
        .setup(|app| {
            html::initialize(
                app.state::<state::AppState>().inner().clone(),
                std::sync::Arc::new(html::HtmlService::default()),
                Some(app.handle().clone()),
            )
            .map_err(|e| format!("{}: {}", e.code, e.message))?;
            #[cfg(target_os = "macos")]
            install_quit_menu(app)?;
            #[cfg(target_os = "windows")]
            install_windows_file_menu(app)?;
            // Tauri's Windows WebView preparation calls create_dir_all on the
            // app-local directory. Own its first creation with the existing
            // private-storage policy, before WebView2 can inherit a broad DACL.
            // Existing unsafe directories still fail closed; never repair them.
            #[cfg(target_os = "windows")]
            recovery::private_storage_dir(app.handle(), "session").map_err(|error| {
                format!(
                    "Could not initialize protected workspace storage: {}: {}",
                    error.code, error.message
                )
            })?;
            app.state::<refresh::RefreshService>()
                .start_worker(app.handle().clone());
            let config = app
                .config()
                .app
                .windows
                .first()
                .ok_or("Main window configuration is missing")?;
            #[cfg(all(feature = "acceptance-harness", target_os = "macos"))]
            let qa_script = acceptance_harness::setup(app.handle())?;
            // macOS may deliver Open Documents before Tauri's Ready callback.
            // That callback creates `main` for a cold Finder launch, so setup
            // must not build a second window with the same label.
            if app.get_webview_window("main").is_none() {
                let builder = tauri::WebviewWindowBuilder::from_config(app, config)?;
                #[cfg(all(feature = "acceptance-harness", target_os = "macos"))]
                let builder = builder
                    .initialization_script(qa_script)
                    .data_store_identifier(*b"F002A-QA-store01");
                builder
                    .on_navigation(allowed_navigation)
                    .on_new_window(|_, _| tauri::webview::NewWindowResponse::Deny)
                    .on_download(|_, _| false)
                    .build()?;
            }
            #[cfg(target_os = "macos")]
            install_native_quit_guard(app.handle())?;
            #[cfg(target_os = "macos")]
            APP_READY.store(true, std::sync::atomic::Ordering::SeqCst);
            Ok(())
        })
        .on_window_event(|window, event| {
            if matches!(event, tauri::WindowEvent::Focused(false)) {
                #[cfg(target_os = "macos")]
                if let Some(c) = window.try_state::<NativeMenuControls>() {
                    let _ = c.new_markdown.set_enabled(false);
                }
                #[cfg(target_os = "windows")]
                if let Some(c) = window.try_state::<WindowsFileMenu>() {
                    let _ = c.new_markdown.set_enabled(false);
                }
            }
            #[cfg(target_os = "macos")]
            if matches!(event, tauri::WindowEvent::Focused(false))
                || (window.label() != "main" && matches!(event, tauri::WindowEvent::Focused(true)))
            {
                if let Some(controls) = window.try_state::<NativeMenuControls>() {
                    controls.editor.suspend();
                }
            }
            if window.label() == "main"
                && matches!(
                    event,
                    tauri::WindowEvent::Resized(_) | tauri::WindowEvent::Focused(false)
                )
            {
                html::hide_all();
                let _ = window.emit("html:viewport_invalidated", ());
            }
            if settings::handle_window_event(window, event) {
                return;
            }
            if window.label() != "main" {
                return;
            }
            if let tauri::WindowEvent::DragDrop(tauri::DragDropEvent::Drop { paths, .. }) = event {
                if window
                    .state::<native_entry::NativeEntryState>()
                    .enqueue(paths.clone(), "drop")
                {
                    let _ = window.emit("native:entry_pending", ());
                }
            }
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let _ = window.emit("editing:close_requested", "window");
            }
            if matches!(event, tauri::WindowEvent::Destroyed) {
                let settings = window.state::<settings::SettingsState>();
                if let Ok(mut coordinator) = settings.0.lock() {
                    coordinator.owner_closed();
                }
                window.state::<refresh::RefreshService>().suspend_watches();
                html::dispose_all();
                let _ = window.state::<state::AppState>().unload_prototypes();
                window.state::<diagram::DiagramState>().cancel_all();
            }
        })
        .build(tauri::generate_context!())
        .expect("failed to build Intentgrove")
        .run(|app, event| {
            #[cfg(target_os = "macos")]
            if let tauri::RunEvent::Opened { urls } = &event {
                let paths = urls
                    .iter()
                    .filter_map(|url| url.to_file_path().ok())
                    .collect();
                if app
                    .state::<native_entry::NativeEntryState>()
                    .enqueue(paths, "finder")
                {
                    let _ = app.emit("native:entry_pending", ());
                }
                // Cold Open Documents can arrive before Ready. Setup owns the
                // first window and the renderer reads the queued paths on mount.
                if APP_READY.load(std::sync::atomic::Ordering::SeqCst) {
                    show_or_create_main_window(app);
                }
            }
            #[cfg(target_os = "macos")]
            if let tauri::RunEvent::Reopen { .. } = &event {
                show_or_create_main_window(app);
            }
            if matches!(event, tauri::RunEvent::Exit) {
                html::dispose_all();
                let _ = app.state::<state::AppState>().unload_prototypes();
                app.state::<diagram::DiagramState>().cancel_all();
                app.state::<refresh::RefreshService>().stop();
            }
            if let tauri::RunEvent::ExitRequested { api, code, .. } = event {
                #[cfg(target_os = "macos")]
                if code.is_none() {
                    let closed_at =
                        LAST_WINDOW_CLOSE_MS.swap(0, std::sync::atomic::Ordering::SeqCst);
                    if closed_at > 0
                        && session::now_ms().is_ok_and(|now| now.saturating_sub(closed_at) <= 2_000)
                    {
                        api.prevent_exit();
                        return;
                    }
                }
                let editing = app.state::<editing::EditingState>();
                if !editing.quit_allowed()
                    && (editing.has_sessions()
                        || app
                            .state::<state::AppState>()
                            .selection_epoch()
                            .unwrap_or(0)
                            > 0)
                {
                    api.prevent_exit();
                    if let Some(window) = app.get_webview_window("main") {
                        let _ = window.emit("editing:close_requested", "quit");
                    }
                }
            }
        });
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn blocks_external_top_level_navigation() {
        assert!(allowed_navigation(
            &"tauri://localhost/index.html".parse().unwrap()
        ));
        for url in [
            "https://example.test/",
            "file:///etc/passwd",
            "javascript:alert(1)",
        ] {
            assert!(!allowed_navigation(&url.parse().unwrap()), "{url}");
        }
    }
}
