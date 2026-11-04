//! Gọi hộ nhà cung cấp giọng đọc.
//!
//! Sân khấu gửi `{ provider, voice, text }`; backend gắn khoá rồi gọi đi, trả về
//! bytes mp3. Khoá không bao giờ rời khỏi backend.
//!
//! Hình dạng request giữ nguyên bản cũ để dùng lại được khoá và giọng đã có.

use std::io::Read;
use std::time::Duration;

use serde::Deserialize;
use serde_json::{json, Value};

use crate::paths::Layout;
use crate::secrets::{self, ProviderKind};

/// Câu dài hơn thì cắt. Nhà cung cấp tính tiền theo ký tự, và câu dài quá thì
/// đọc xong khán giả đã quên mất chuyện gì.
const MAX_TEXT: usize = 400;
/// Một câu nói không thể nặng hơn ngần này; nặng hơn là có gì đó sai.
const MAX_AUDIO: u64 = 8 * 1024 * 1024;
const TIMEOUT: Duration = Duration::from_secs(60);

const ELEVENLABS_BASE: &str = "https://api.elevenlabs.io/v1";

/// Hai cách gọi, cùng một cửa:
///
/// - Sân khấu gửi `voiceId` — id một giọng trong dàn, backend tự tra ra nhà
///   cung cấp và tên giọng. Sân khấu không cần biết dàn giọng được cấu hình sao.
/// - Trang quản lý gửi thẳng `provider` + `voice`, để nghe thử một giọng **chưa
///   lưu** vào dàn.
#[derive(Debug, Default, Deserialize)]
pub struct YeuCau {
    pub text: String,
    #[serde(default, rename = "voiceId")]
    pub voice_id: Option<String>,
    #[serde(default)]
    pub provider: Option<String>,
    #[serde(default)]
    pub voice: Option<String>,
    #[serde(default)]
    pub speed: Option<f32>,
}

#[derive(Debug)]
pub enum TtsError {
    /// Người dùng cấu hình sai hoặc chưa cấu hình.
    Invalid(String),
    /// Nhà cung cấp từ chối hoặc không gọi được.
    Provider(String),
}

fn ten_hop_le(x: &str) -> bool {
    x.chars().count() <= 80 && !x.chars().any(char::is_control)
}

/// Có nhà cung cấp đặt giọng vào `model` chứ không có trường `voice` riêng —
/// 9router là một. Quy ước giữ của bản cũ: tên giọng có dấu `/` thì chính nó là
/// model, ví dụ `google-tts/vi` hay `edge-tts/vi-VN-HoaiMyNeural`.
pub fn giong_la_model(voice: &str) -> bool {
    voice.contains('/')
}

/// Dựng lời gọi cho một nhà cung cấp. Tách riêng để test được không cần mạng.
pub fn dung_goi(
    kind: ProviderKind,
    base: &str,
    voice: &str,
    model: &str,
    text: &str,
    speed: f32,
) -> Result<(String, &'static str, String, Value), TtsError> {
    // Làm tròn trước khi gửi: f32 cho ra 1.2000000476837158, nhà cung cấp nhận
    // được nhưng log của họ và của mình đọc thành ra khó chịu.
    let lam_tron = |x: f32| (f64::from(x) * 100.0).round() / 100.0;
    let speed = lam_tron(speed);
    match kind {
        // Anthropic là nhà cung cấp cho MC, không đọc được thành tiếng. Nói rõ
        // ở đây còn hơn để nó rơi vào nhánh OpenAI rồi lỗi khó hiểu tận đầu kia.
        ProviderKind::Anthropic => Err(TtsError::Invalid(
            "nhà cung cấp này dùng cho MC, không phải giọng đọc".into(),
        )),
        ProviderKind::Openai => {
            let b = if base.is_empty() {
                return Err(TtsError::Invalid("nhà cung cấp chưa có địa chỉ".into()));
            } else {
                base
            };
            let mut body = json!({
                "input": text,
                "response_format": "mp3",
                "speed": speed,
            });

            // Giọng nằm trong model thì nó thay model đã cấu hình, và không gửi
            // trường `voice` nữa — nhà cung cấp kiểu này không có trường đó.
            let model_that = if giong_la_model(voice) { voice } else { model.trim() };
            if !model_that.is_empty() {
                body["model"] = json!(model_that);
            }
            if !voice.is_empty() && !giong_la_model(voice) {
                body["voice"] = json!(voice);
            }
            if model_that.is_empty() && voice.is_empty() {
                return Err(TtsError::Invalid(
                    "chưa biết đọc bằng giọng nào: điền tên giọng, hoặc điền model cho nhà cung cấp".into(),
                ));
            }
            Ok((format!("{b}/audio/speech"), "Authorization", String::new(), body))
        }
        ProviderKind::Elevenlabs => {
            // Giọng của ElevenLabs là voice_id, không phải tên người.
            if voice.is_empty() || !voice.chars().all(|c| c.is_ascii_alphanumeric()) {
                return Err(TtsError::Invalid(
                    "ElevenLabs: giọng phải là voice_id (chỉ chữ và số)".into(),
                ));
            }
            let mut body = json!({
                "text": text,
                "voice_settings": { "speed": speed.clamp(0.7, 1.2) },
            });
            if !model.trim().is_empty() {
                body["model_id"] = json!(model.trim());
            }
            Ok((
                format!("{ELEVENLABS_BASE}/text-to-speech/{voice}?output_format=mp3_44100_128"),
                "xi-api-key",
                String::new(),
                body,
            ))
        }
    }
}

/// Chữ nghĩa của lỗi, để người vận hành biết phải làm gì chứ không chỉ thấy số.
pub fn loi_theo_ma(ma: u16, chi_tiet: &str) -> String {
    match ma {
        401 => "Khoá API giọng đọc sai hoặc đã bị thu hồi.".into(),
        402 | 403 => format!("Hết gói hoặc hết hạn mức giọng đọc ({ma}) — nạp thêm hoặc gia hạn."),
        429 => "Nhà cung cấp giọng đang giới hạn: hết hạn mức ngày, hoặc gọi quá nhanh.".into(),
        _ => {
            let d: String = chi_tiet.chars().take(200).collect();
            format!("Giọng đọc lỗi {ma}: {d}")
        }
    }
}

/// Gọi nhà cung cấp. **Chặn luồng** — gọi trong `spawn_blocking`.
pub fn sinh(layout: &Layout, req: &YeuCau) -> Result<Vec<u8>, TtsError> {
    let text: String = req.text.trim().chars().take(MAX_TEXT).collect();
    if text.is_empty() {
        return Err(TtsError::Invalid("không có câu nào để đọc".into()));
    }

    // Gửi `voiceId` thì tra dàn giọng; gửi thẳng provider/voice thì dùng luôn.
    let (nha, giong) = match (&req.provider, &req.voice) {
        (Some(p), Some(v)) => (p.clone(), v.clone()),
        _ => {
            let cfg = crate::voice::read(layout);
            let id = req.voice_id.clone().unwrap_or_default();
            let Some(v) = cfg.tim(&id) else {
                return Err(TtsError::Invalid(
                    "dàn giọng còn trống — thêm một giọng trong trang quản lý".into(),
                ));
            };
            (v.provider.clone(), v.voice.clone())
        }
    };

    if !ten_hop_le(&giong) {
        return Err(TtsError::Invalid("tên giọng sai định dạng".into()));
    }
    if nha.is_empty() {
        return Err(TtsError::Invalid("giọng này chưa chọn nhà cung cấp".into()));
    }

    let Some(p) = secrets::get(layout, &nha) else {
        return Err(TtsError::Invalid(format!("chưa cấu hình nhà cung cấp \"{nha}\"")));
    };
    if p.key.is_empty() {
        return Err(TtsError::Invalid(format!("nhà cung cấp \"{nha}\" chưa có khoá API")));
    }

    let speed = req.speed.unwrap_or(1.0).clamp(0.5, 2.0);
    let base = if p.base_url.is_empty() {
        String::new()
    } else {
        secrets::kiem_base(&p.base_url).map_err(|_| {
            TtsError::Invalid("địa chỉ nhà cung cấp không hợp lệ".into())
        })?
    };

    let (url, ten_header, _, body) = dung_goi(p.kind, &base, &giong, &p.model, &text, speed)?;
    let gia_tri_header = match p.kind {
        ProviderKind::Openai => format!("Bearer {}", p.key),
        ProviderKind::Elevenlabs | ProviderKind::Anthropic => p.key.clone(),
    };

    let agent = ureq::Agent::config_builder()
        .timeout_global(Some(TIMEOUT))
        .max_redirects(0)
        .build()
        .new_agent();

    let kq = agent
        .post(&url)
        .header(ten_header, &gia_tri_header)
        .header("Accept", "audio/mpeg")
        .send_json(&body);

    let mut res = match kq {
        Ok(r) => r,
        Err(ureq::Error::StatusCode(ma)) => {
            return Err(TtsError::Provider(loi_theo_ma(ma, "")));
        }
        Err(e) => {
            return Err(TtsError::Provider(format!(
                "không gọi được nhà cung cấp giọng đọc: {e}"
            )));
        }
    };

    let mut bytes = Vec::new();
    res.body_mut()
        .as_reader()
        .take(MAX_AUDIO)
        .read_to_end(&mut bytes)
        .map_err(|e| TtsError::Provider(format!("không đọc được audio: {e}")))?;

    if bytes.is_empty() {
        return Err(TtsError::Provider("nhà cung cấp trả về rỗng".into()));
    }
    Ok(bytes)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn dung_goi_kieu_openai() {
        let (url, h, _, body) = dung_goi(
            ProviderKind::Openai,
            "https://api.vieneu.io/api/v1",
            "Anh Khôi",
            "vieneu-v4",
            "Xin chào",
            1.1,
        )
        .unwrap();
        assert_eq!(url, "https://api.vieneu.io/api/v1/audio/speech");
        assert_eq!(h, "Authorization");
        assert_eq!(body["input"], json!("Xin chào"));
        assert_eq!(body["voice"], json!("Anh Khôi"));
        assert_eq!(body["response_format"], json!("mp3"));
        assert_eq!(body["model"], json!("vieneu-v4"));
    }

    #[test]
    fn khong_co_model_thi_khong_gui_truong_model() {
        let (_, _, _, body) =
            dung_goi(ProviderKind::Openai, "https://a.b/v1", "An", "  ", "x", 1.0).unwrap();
        assert!(body.get("model").is_none());
    }

    #[test]
    fn giong_nam_trong_model_thi_khong_gui_truong_voice() {
        // Đúng như curl của 9router: chỉ có model và input.
        let (url, _, _, body) =
            dung_goi(ProviderKind::Openai, "http://localhost:20128/v1", "google-tts/en", "", "Hello", 1.0)
                .unwrap();
        assert_eq!(url, "http://localhost:20128/v1/audio/speech");
        assert_eq!(body["model"], json!("google-tts/en"));
        assert!(body.get("voice").is_none(), "nhà kiểu này không có trường voice");
        assert_eq!(body["input"], json!("Hello"));
    }

    #[test]
    fn giong_trong_model_thay_cho_model_da_cau_hinh() {
        let (_, _, _, body) = dung_goi(
            ProviderKind::Openai,
            "http://localhost:20128/v1",
            "edge-tts/vi-VN-HoaiMyNeural",
            "google-tts/vi",
            "x",
            1.0,
        )
        .unwrap();
        assert_eq!(body["model"], json!("edge-tts/vi-VN-HoaiMyNeural"));
    }

    #[test]
    fn de_trong_giong_thi_dung_model_da_cau_hinh() {
        let (_, _, _, body) =
            dung_goi(ProviderKind::Openai, "https://a.b/v1", "", "google-tts/vi", "x", 1.0).unwrap();
        assert_eq!(body["model"], json!("google-tts/vi"));
        assert!(body.get("voice").is_none());
    }

    #[test]
    fn khong_co_giong_ma_cung_khong_co_model_thi_bao_ro() {
        let kq = dung_goi(ProviderKind::Openai, "https://a.b/v1", "", "", "x", 1.0);
        match kq {
            Err(TtsError::Invalid(m)) => assert!(m.contains("giọng nào"), "{m}"),
            x => panic!("phải nói rõ thiếu gì, nhận {x:?}"),
        }
    }

    #[test]
    fn elevenlabs_khong_cho_de_trong_giong() {
        assert!(dung_goi(ProviderKind::Elevenlabs, "", "", "m", "x", 1.0).is_err());
    }

    #[test]
    fn openai_thieu_dia_chi_thi_bao_ngay() {
        let kq = dung_goi(ProviderKind::Openai, "", "An", "", "x", 1.0);
        assert!(matches!(kq, Err(TtsError::Invalid(_))));
    }

    #[test]
    fn dung_goi_kieu_elevenlabs() {
        let (url, h, _, body) =
            dung_goi(ProviderKind::Elevenlabs, "", "abc123", "eleven_multilingual_v2", "Xin chào", 1.5)
                .unwrap();
        assert_eq!(
            url,
            "https://api.elevenlabs.io/v1/text-to-speech/abc123?output_format=mp3_44100_128"
        );
        assert_eq!(h, "xi-api-key");
        assert_eq!(body["text"], json!("Xin chào"));
        assert_eq!(
            body["voice_settings"]["speed"],
            json!(1.2),
            "ElevenLabs chỉ nhận 0,7–1,2"
        );
        assert_eq!(body["model_id"], json!("eleven_multilingual_v2"));
    }

    #[test]
    fn elevenlabs_doi_voice_id_chu_khong_phai_ten_nguoi() {
        let kq = dung_goi(ProviderKind::Elevenlabs, "", "Anh Khôi", "", "x", 1.0);
        assert!(matches!(kq, Err(TtsError::Invalid(_))));
    }

    #[test]
    fn loi_noi_ro_phai_lam_gi() {
        assert!(loi_theo_ma(401, "").contains("Khoá"));
        assert!(loi_theo_ma(402, "").contains("hạn mức"));
        assert!(loi_theo_ma(429, "").contains("giới hạn"));
        assert!(loi_theo_ma(500, "sập máy chủ").contains("sập máy chủ"));
    }

    #[test]
    fn chi_tiet_loi_bi_cat_cho_ngan() {
        let dai = "x".repeat(500);
        assert!(loi_theo_ma(500, &dai).chars().count() < 260);
    }

    #[test]
    fn ten_giong_phai_sach() {
        assert!(ten_hop_le("Anh Khôi"));
        assert!(ten_hop_le(""), "để trống được, vì có nhà đặt giọng trong model");
        assert!(!ten_hop_le("Anh\nKhôi"));
        assert!(!ten_hop_le(&"x".repeat(81)));
    }

    #[test]
    fn chua_cau_hinh_nha_cung_cap_thi_bao_ro() {
        let d = tempfile::tempdir().unwrap();
        let l = Layout::new(d.path());
        let kq = sinh(
            &l,
            &YeuCau {
                provider: Some("vieneu".into()),
                voice: Some("An".into()),
                text: "chào".into(),
                ..YeuCau::default()
            },
        );
        match kq {
            Err(TtsError::Invalid(m)) => assert!(m.contains("chưa cấu hình"), "{m}"),
            x => panic!("phải báo chưa cấu hình, nhận {x:?}"),
        }
    }

    #[test]
    fn cau_rong_thi_khong_goi_di() {
        let d = tempfile::tempdir().unwrap();
        let l = Layout::new(d.path());
        let kq = sinh(
            &l,
            &YeuCau {
                provider: Some("vieneu".into()),
                voice: Some("An".into()),
                text: "   ".into(),
                ..YeuCau::default()
            },
        );
        assert!(matches!(kq, Err(TtsError::Invalid(_))));
    }
}
