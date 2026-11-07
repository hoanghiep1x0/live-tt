// Không mở cửa sổ dòng lệnh cạnh app trên Windows (bản phát hành).
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    live_desktop::run();
}
