//! Source-history menu ownership, only while the main rendered editor owns focus.
use std::sync::atomic::{AtomicBool, Ordering};
use tauri::{
    menu::{MenuItem, MenuItemKind, PredefinedMenuItem, Submenu},
    Manager, Wry,
};

pub struct EditorMenu {
    edit: Submenu<Wry>,
    native_undo: PredefinedMenuItem<Wry>,
    native_redo: PredefinedMenuItem<Wry>,
    undo: MenuItem<Wry>,
    redo: MenuItem<Wry>,
    format: Submenu<Wry>,
    bold: MenuItem<Wry>,
    italic: MenuItem<Wry>,
    code: MenuItem<Wry>,
    link: MenuItem<Wry>,
    owner: AtomicBool,
    spanish: AtomicBool,
    updating: std::sync::Mutex<()>,
}
impl EditorMenu {
    pub fn new(app: &tauri::AppHandle, edit: Submenu<Wry>) -> tauri::Result<Self> {
        let items = edit.items()?;
        let (
            Some(MenuItemKind::Predefined(native_undo)),
            Some(MenuItemKind::Predefined(native_redo)),
        ) = (items.first(), items.get(1))
        else {
            return Err(tauri::Error::Io(std::io::Error::other(
                "Default Edit history items unavailable",
            )));
        };
        let undo = MenuItem::with_id(app, "editing_undo", "Undo", false, Some("Cmd+Z"))?;
        let redo = MenuItem::with_id(app, "editing_redo", "Redo", false, Some("Cmd+Shift+Z"))?;
        let bold = MenuItem::with_id(app, "editing_bold", "Bold", false, Some("Cmd+B"))?;
        let italic = MenuItem::with_id(app, "editing_italic", "Italic", false, Some("Cmd+I"))?;
        let code = MenuItem::with_id(app, "editing_code", "Inline Code", false, None::<&str>)?;
        let link = MenuItem::with_id(app, "editing_link", "Link…", false, None::<&str>)?;
        let format = Submenu::with_items(app, "Format", false, &[&bold, &italic, &code, &link])?;
        edit.append(&format)?;
        Ok(Self {
            edit,
            native_undo: native_undo.clone(),
            native_redo: native_redo.clone(),
            undo,
            redo,
            format,
            bold,
            italic,
            code,
            link,
            owner: AtomicBool::new(false),
            spanish: AtomicBool::new(false),
            updating: std::sync::Mutex::new(()),
        })
    }
    pub fn owns(&self) -> bool {
        self.owner.load(Ordering::SeqCst)
    }
    pub fn update(
        &self,
        owner: bool,
        undo: bool,
        redo: bool,
        selection: bool,
        es: bool,
    ) -> tauri::Result<()> {
        let _guard = self.updating.lock().map_err(|_| {
            tauri::Error::Io(std::io::Error::other("Editor menu owner unavailable"))
        })?;
        self.spanish.store(es, Ordering::SeqCst);
        self.undo.set_text(if es { "Deshacer" } else { "Undo" })?;
        self.redo.set_text(if es { "Rehacer" } else { "Redo" })?;
        self.format
            .set_text(if es { "Formato" } else { "Format" })?;
        for (item, en, spanish) in [
            (&self.bold, "Bold", "Negrita"),
            (&self.italic, "Italic", "Cursiva"),
            (&self.code, "Inline Code", "Código en línea"),
            (&self.link, "Link…", "Enlace…"),
        ] {
            item.set_text(if es { spanish } else { en })?;
            item.set_enabled(owner && selection)?;
        }
        self.undo.set_enabled(owner && undo)?;
        self.redo.set_enabled(owner && redo)?;
        self.format.set_enabled(owner && selection)?;
        if owner != self.owns() {
            // Keep predefined responders for Settings/search/property fields.
            // Replace only the two history entries; Cut/Copy/Paste remain native.
            if owner {
                self.edit.remove(&self.native_undo)?;
                self.edit.remove(&self.native_redo)?;
                self.edit.insert(&self.undo, 0)?;
                self.edit.insert(&self.redo, 1)?;
            } else {
                self.edit.remove(&self.undo)?;
                self.edit.remove(&self.redo)?;
                self.edit.insert(&self.native_undo, 0)?;
                self.edit.insert(&self.native_redo, 1)?;
            }
            self.owner.store(owner, Ordering::SeqCst);
        }
        Ok(())
    }
    pub fn suspend(&self) {
        let _ = self.update(
            false,
            false,
            false,
            false,
            self.spanish.load(Ordering::SeqCst),
        );
    }
    pub fn dispatch(&self, app: &tauri::AppHandle, id: &str) {
        use tauri::Emitter;
        if self.owns() {
            if let Some(window) = app
                .get_webview_window("main")
                .filter(|w| w.is_focused().unwrap_or(false))
            {
                let _ = window.emit("native:menu", id.to_owned());
            }
        }
    }
}
