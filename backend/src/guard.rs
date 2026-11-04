//! Chặn ở cửa. Máy chủ chỉ nghe 127.0.0.1, nhưng như thế chưa đủ:
//! một trang web bất kỳ trong trình duyệt vẫn gọi được vào localhost.
//!
//! Ba lớp:
//! 1. `Origin` lạ  → chặn, để trang web ngoài không gọi vào được.
//! 2. `Host` lạ    → chặn, chống DNS rebinding (tên miền trỏ về 127.0.0.1).
//! 3. Token        → bắt buộc cho `/api/*`. `/d/*` và `/a/*` miễn, vì OBS
//!                   không gửi được header tuỳ ý.

/// Kết quả kiểm tra, kèm lý do để ghi log và trả về cho người gọi.
#[derive(Debug, PartialEq, Eq)]
pub enum Verdict {
    Allow,
    Deny(&'static str),
}

/// Origin hợp lệ: chính máy chủ này, hoặc dev server của trang quản lý.
fn origin_ok(origin: &str, port: u16) -> bool {
    let cho_phep = [
        format!("http://127.0.0.1:{port}"),
        format!("http://localhost:{port}"),
        // Vite dev server khi làm trang quản lý.
        "http://127.0.0.1:5180".to_string(),
        "http://localhost:5180".to_string(),
        // Webview của bản đóng gói Tauri.
        "http://tauri.localhost".to_string(),
        "https://tauri.localhost".to_string(),
    ];
    cho_phep.iter().any(|x| x == origin)
}

fn host_ok(host: &str, port: u16) -> bool {
    let cho_phep = [
        format!("127.0.0.1:{port}"),
        format!("localhost:{port}"),
        format!("[::1]:{port}"),
    ];
    cho_phep.iter().any(|x| x == host)
}

/// Kiểm tra một yêu cầu. `token_header` là giá trị `Authorization` nếu có.
pub fn check(
    path: &str,
    host: Option<&str>,
    origin: Option<&str>,
    token_header: Option<&str>,
    port: u16,
    token_that: &str,
) -> Verdict {
    // Thiếu Host là yêu cầu dị dạng; HTTP/1.1 bắt buộc có.
    match host {
        Some(h) if host_ok(h, port) => {}
        Some(_) => return Verdict::Deny("Host không phải máy này"),
        None => return Verdict::Deny("thiếu Host"),
    }

    // Không có Origin là bình thường: OBS, curl, và điều hướng thẳng đều không gửi.
    if let Some(o) = origin {
        if !origin_ok(o, port) {
            return Verdict::Deny("Origin không được phép");
        }
    }

    if path.starts_with("/api/") || path == "/api" {
        let Some(h) = token_header else {
            return Verdict::Deny("thiếu token");
        };
        let Some(t) = h.strip_prefix("Bearer ") else {
            return Verdict::Deny("token sai định dạng");
        };
        if !bang_nhau_het_thoi_gian(t.as_bytes(), token_that.as_bytes()) {
            return Verdict::Deny("token sai");
        }
    }

    Verdict::Allow
}

/// So sánh không rò thời gian. Token ngắn nên rủi ro thấp, nhưng so sánh kiểu này
/// không tốn gì thêm.
fn bang_nhau_het_thoi_gian(a: &[u8], b: &[u8]) -> bool {
    if a.len() != b.len() {
        return false;
    }
    a.iter().zip(b).fold(0u8, |acc, (x, y)| acc | (x ^ y)) == 0
}

/// Token 128-bit dạng hex. Sinh mới mỗi lần mở app.
pub fn sinh_token() -> String {
    use rand::RngCore;
    let mut b = [0u8; 16];
    rand::thread_rng().fill_bytes(&mut b);
    b.iter().map(|x| format!("{x:02x}")).collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    const PORT: u16 = 47830;
    const TOKEN: &str = "abc123";
    const BEARER: &str = "Bearer abc123";

    fn kiem(path: &str, host: Option<&str>, origin: Option<&str>, auth: Option<&str>) -> Verdict {
        check(path, host, origin, auth, PORT, TOKEN)
    }

    #[test]
    fn obs_tai_trang_thiet_ke_khong_can_token() {
        // OBS Browser Source không gửi Origin và không gửi được header tuỳ ý.
        assert_eq!(
            kiem("/d/ke-chuyen/", Some("127.0.0.1:47830"), None, None),
            Verdict::Allow
        );
        assert_eq!(
            kiem("/a/ke-chuyen/bg.png", Some("127.0.0.1:47830"), None, None),
            Verdict::Allow
        );
    }

    #[test]
    fn api_bat_buoc_co_token() {
        assert_eq!(
            kiem("/api/designs", Some("127.0.0.1:47830"), None, None),
            Verdict::Deny("thiếu token")
        );
        assert_eq!(
            kiem("/api/designs", Some("127.0.0.1:47830"), None, Some(BEARER)),
            Verdict::Allow
        );
    }

    #[test]
    fn token_sai_bi_tu_choi() {
        assert_eq!(
            kiem(
                "/api/designs",
                Some("127.0.0.1:47830"),
                None,
                Some("Bearer sai")
            ),
            Verdict::Deny("token sai")
        );
        assert_eq!(
            kiem(
                "/api/designs",
                Some("127.0.0.1:47830"),
                None,
                Some("abc123")
            ),
            Verdict::Deny("token sai định dạng")
        );
    }

    #[test]
    fn trang_web_ngoai_bi_chan_du_co_token() {
        assert_eq!(
            kiem(
                "/api/designs",
                Some("127.0.0.1:47830"),
                Some("https://ke-gian.example"),
                Some(BEARER)
            ),
            Verdict::Deny("Origin không được phép")
        );
    }

    #[test]
    fn chan_dns_rebinding() {
        // Tên miền của kẻ tấn công trỏ về 127.0.0.1 thì Host sẽ là tên miền đó.
        assert_eq!(
            kiem("/d/ke-chuyen/", Some("ke-gian.example:47830"), None, None),
            Verdict::Deny("Host không phải máy này")
        );
    }

    #[test]
    fn host_dung_ten_nhung_sai_cong_cung_bi_chan() {
        assert_eq!(
            kiem("/d/ke-chuyen/", Some("127.0.0.1:8080"), None, None),
            Verdict::Deny("Host không phải máy này")
        );
    }

    #[test]
    fn thieu_host_bi_tu_choi() {
        assert_eq!(
            kiem("/d/ke-chuyen/", None, None, None),
            Verdict::Deny("thiếu Host")
        );
    }

    #[test]
    fn trang_quan_ly_tu_dev_server_duoc_phep() {
        assert_eq!(
            kiem(
                "/api/designs",
                Some("127.0.0.1:47830"),
                Some("http://localhost:5180"),
                Some(BEARER)
            ),
            Verdict::Allow
        );
    }

    #[test]
    fn token_moi_lan_sinh_moi_khac_nhau_va_du_dai() {
        let a = sinh_token();
        let b = sinh_token();
        assert_eq!(a.len(), 32, "128 bit dạng hex");
        assert_ne!(a, b);
        assert!(a.chars().all(|c| c.is_ascii_hexdigit()));
    }
}
