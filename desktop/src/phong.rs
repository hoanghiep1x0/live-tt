//! Cửa sổ PHÒNG riêng: một cửa sổ chỉ có sân khấu và bảng cài đặt của phòng
//! đó, như bản cũ — người vận hành mở phòng ra một cửa sổ, chỉnh ngay bên cạnh
//! hình, không phải đi vòng qua trang quản lý.
//!
//! Cửa sổ này KHÔNG phải thứ đem lên sóng: OBS / TikTok LIVE Studio lấy phòng
//! bằng nguồn Trình duyệt ở `http://127.0.0.1:<cổng>/d/<id>/`, vừa sạch (không
//! có bảng cài đặt) vừa không phụ thuộc cửa sổ nào đang mở.

use tauri::{AppHandle, Manager, WebviewUrl, WebviewWindowBuilder};

/// Bảng cài đặt rộng 360px (`.bx-ngan` trong `bang-xem.css`). Cửa sổ chừa đúng
/// ngần này cho bảng, phần còn lại là sân khấu.
const RONG_NGAN: f64 = 360.0;
/// Sân khấu ngang 16:9 vừa mắt ở cỡ này; phòng dọc thì tự co trong khoảng đó.
const RONG_SAN: f64 = 900.0;
const CAO_SAN: f64 = 620.0;

/// Nhãn cửa sổ của một phòng. Hàm thuần.
pub fn nhan_cua_so(id: &str) -> String {
    format!("phong-{id}")
}

/// `phong_mo(id)` — mở (hay đưa lên trước) cửa sổ phòng `id`.
///
/// `async`: y như `trinh_duyet::tab_mo`, tạo khung web trong lệnh ĐỒNG BỘ
/// (chạy trên luồng chính) bị kẹt trên Windows — cửa sổ hiện ra trắng tinh,
/// đứng ở about:blank.
#[tauri::command]
pub async fn phong_mo(app: AppHandle, id: String) -> Result<(), String> {
    let id = crate::trinh_duyet::kiem_id(&id)?;
    let nhan = nhan_cua_so(&id);
    // Mở lần hai: đưa đúng cửa sổ đang có lên trước, không dựng thêm cái nữa.
    if let Some(w) = app.get_webview_window(&nhan) {
        let _ = w.unminimize();
        let _ = w.show();
        let _ = w.set_focus();
        return Ok(());
    }
    let cong = live_backend::khoi_dong::cong_muon();
    let url = format!("http://127.0.0.1:{cong}/d/{id}/");
    let u = url.parse().map_err(|e| format!("địa chỉ phòng hỏng: {e}"))?;
    WebviewWindowBuilder::new(&app, &nhan, WebviewUrl::External(u))
        .title(format!("Phòng {id}"))
        .inner_size(RONG_SAN + RONG_NGAN, CAO_SAN)
        .min_inner_size(420.0 + RONG_NGAN, 420.0)
        .theme(Some(tauri::Theme::Dark))
        .build()
        .map_err(|e| format!("không mở được cửa sổ phòng: {e}"))?;
    tracing::info!(%id, %url, "mở cửa sổ phòng");
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn nhan_cua_so_theo_id_phong() {
        assert_eq!(nhan_cua_so("ke-chuyen"), "phong-ke-chuyen");
        // Mỗi phòng một cửa sổ riêng, không đụng nhau.
        assert_ne!(nhan_cua_so("ke-chuyen"), nhan_cua_so("lop-hoc"));
    }
}
