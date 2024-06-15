// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::{
    collections::HashMap,
    ffi::OsStr,
    fs::read,
    path::{Path, PathBuf},
};

use base64::{prelude::BASE64_STANDARD, Engine};
use homedir::get_my_home;
use serde::{Deserialize, Serialize};
use tauri::{FileDropEvent, Manager, WindowEvent};

static IMAGE_EXTENSIONS: &[&str] = &[
    "png", "apng", "jpg", "jpeg", "jfif", "pjpeg", "pjp", "avif", "webp",
];

#[tauri::command]
fn open_file(window: tauri::Window) {
    tauri::api::dialog::FileDialogBuilder::new()
        .set_title("Select a File")
        .add_filter("Image Files", IMAGE_EXTENSIONS)
        .pick_file(move |file| match file {
            Some(path) => {
                let Some(filename) = path.file_name().and_then(|val| val.to_str()) else {
                    return;
                };

                let Some(extension) = path.extension() else {
                    let _ = window.emit_all("file_selected", ());
                    return;
                };
                let mime_type = if extension == "png" {
                    "image/png"
                } else if extension == "apng" {
                    "image/apng"
                } else if extension == "avif" {
                    "image/avif"
                } else if extension == "webp" {
                    "image/webp"
                } else if extension == "jpg"
                    || extension == "jpeg"
                    || extension == "jfif"
                    || extension == "pjpeg"
                    || extension == "pjp"
                {
                    "image/jpeg"
                } else {
                    let _ = window.emit_all("file_selected", ());
                    return;
                };

                let mut base64_str = String::with_capacity(1024);
                base64_str.push_str("data:");
                base64_str.push_str(mime_type);
                base64_str.push_str(";base64,");

                let Ok(vec) = read(&path) else {
                    let _ = window.emit_all("file_selected", ());
                    return;
                };

                BASE64_STANDARD.encode_string(vec, &mut base64_str);

                let _ = window.emit_all("file_selected", (filename.to_string(), base64_str));
            }
            None => {
                let _ = window.emit_all("file_selected", ());
            }
        });
}

#[derive(Serialize, Deserialize, Clone)]
struct GuiData {
    base_element: GuiElement,
    elements: Vec<GuiElement>,
}

#[derive(Serialize, Deserialize, Clone)]
struct GuiElement {
    dimensions: Rect,
    id: String,
    data: HashMap<String, ConfigValue>,
    name: String,
}

#[derive(Serialize, Deserialize, Clone)]
pub enum ConfigValue {
    StringValue(String),
    NumberValue(i64),
    PathValue { path: String, data: ImageData },
}

#[derive(Serialize, Deserialize, Clone)]
pub struct ImageData {
    width: u32,
    height: u32,
    data: Vec<u8>,
}

#[derive(Serialize, Deserialize, Copy, Clone)]
struct Rect {
    x: u32,
    y: u32,
    width: u32,
    height: u32,
}

#[derive(Serialize, Deserialize, Clone)]
struct LoadData {
    last_loaded_location: Option<String>,
    data: GuiData,
}

#[tauri::command]
fn save(window: tauri::Window, last_loaded_location: String, data: GuiData) {
    let (path, file_name) = {
        if last_loaded_location.len() < 1 {
            (
                get_my_home().ok().flatten(),
                if data.base_element.name.len() > 0 {
                    data.base_element.name.clone() + ".mcgf"
                } else {
                    "unnamed.mcgf".to_string()
                },
            )
        } else {
            let mut path = PathBuf::from(last_loaded_location);
            let file_name = match path.file_name().and_then(OsStr::to_str).map(str::to_string) {
                Some(v) => v,
                _ if data.base_element.name.len() > 0 => data.base_element.name.clone() + ".mcgf",
                _ => "unnamed.mcgf".to_string(),
            };
            path.pop(); // remove file name
            (Some(path), file_name)
        }
    };

    let mut builder = tauri::api::dialog::FileDialogBuilder::new()
        .set_title("Save GUI")
        .add_filter("Minecraft GUI Files", &["mcgf"])
        .set_file_name(&file_name);

    if let Some(path) = path {
        builder = builder.set_directory(path);
    }

    builder.save_file(move |path| {
        let Some(path) = path else {
            return;
        };

        let file = match std::fs::File::create(&path) {
            Ok(v) => v,
            Err(e) => return save_file_error(window, e.to_string()),
        };

        match serde_json::to_writer(file, &data) {
            Ok(..) => {}
            Err(e) => return save_file_error(window, e.to_string()),
        }

        let _ = window.emit_all("update-last-loaded", format!("{}", path.display()));
    });
}

fn save_file_error(window: tauri::Window, err: String) {
    let _ = window.emit_all("save-error", err);
}

#[tauri::command]
fn load(window: tauri::Window) {
    tauri::api::dialog::FileDialogBuilder::new()
        .set_title("Select a File")
        .add_filter("Minecraft GUI Files", &["mcgf"])
        .pick_file(|path| {
            if let Some(path) = path {
                load_file(window, &path)
            }
        });
}

fn load_file(window: tauri::Window, path: &Path) {
    let json_string = match std::fs::read_to_string(path) {
        Ok(v) => v,
        Err(e) => return load_file_error(window, e.to_string()),
    };
    let data: GuiData = match serde_json::from_str(&json_string) {
        Ok(v) => v,
        Err(e) => return load_file_error(window, e.to_string()),
    };

    let _ = window.emit_all(
        "load-success",
        LoadData {
            last_loaded_location: Some(format!("{}", path.display())),
            data,
        },
    );
}

fn load_file_error(window: tauri::Window, err: String) {
    let _ = window.emit_all("load-error", err);
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![open_file, save, load])
        .on_window_event(|ev| match ev.event() {
            WindowEvent::FileDrop(FileDropEvent::Dropped(paths)) => {
                if paths.len() < 1 {
                    return;
                }
                load_file(ev.window().clone(), &paths[0]);
            }
            _ => {}
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
