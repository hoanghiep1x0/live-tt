//! Sự kiện phòng live, đã chuẩn hoá.
//!
//! Mọi nguồn — webview TikTok, cầu nối ngoài, giả lập — đều phải trả đúng kiểu
//! này. Thêm một nguồn mới chỉ là viết một mapper; phần còn lại của hệ thống
//! không biết sự kiện đến từ đâu và không cần biết.
//!
//! Hình dạng JSON khớp `LiveEvent` bên `client/shared/contracts/src/events.ts`:
//! phẳng, `kind` nằm cùng cấp với thông tin người.

use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub struct EventUser {
    /// Nick TikTok — định danh duy nhất của một người xem.
    pub user: String,
    /// Tên hiển thị, có thể trùng nhau giữa nhiều người.
    pub name: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub avatar: Option<String>,
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
#[serde(tag = "kind", rename_all = "lowercase")]
pub enum Payload {
    Gift {
        gift: String,
        count: u32,
        /// Xu TikTok của **một** món. Tổng = count × xuEach.
        #[serde(rename = "xuEach")]
        xu_each: i64,
    },
    Like {
        count: u32,
        /// Tổng tim cả phiên do TikTok đếm. Có thì tin con số này hơn cộng dồn
        /// phía mình, vì tin có thể rơi mất trên đường.
        #[serde(default, skip_serializing_if = "Option::is_none")]
        total: Option<u64>,
    },
    Comment {
        text: String,
    },
    Join,
    Leave,
    Follow,
    Share,
    Subscribe {
        #[serde(default, skip_serializing_if = "Option::is_none")]
        months: Option<u32>,
    },
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub struct LiveEvent {
    #[serde(flatten)]
    pub who: EventUser,
    #[serde(flatten)]
    pub what: Payload,
}

impl LiveEvent {
    pub fn new(user: &str, name: &str, what: Payload) -> Self {
        Self {
            who: EventUser { user: user.into(), name: name.into(), avatar: None },
            what,
        }
    }

    /// Tên loại, dùng cho `FeedItem.kind` và cho log.
    pub fn kind(&self) -> &'static str {
        match self.what {
            Payload::Gift { .. } => "gift",
            Payload::Like { .. } => "like",
            Payload::Comment { .. } => "comment",
            Payload::Join => "join",
            Payload::Leave => "leave",
            Payload::Follow => "follow",
            Payload::Share => "share",
            Payload::Subscribe { .. } => "subscribe",
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn json_phang_dung_nhu_hop_dong_ben_client() {
        let e = LiveEvent::new(
            "hanh.ng",
            "Hạnh",
            Payload::Gift { gift: "Hoa hồng".into(), count: 3, xu_each: 10 },
        );
        assert_eq!(
            serde_json::to_value(&e).unwrap(),
            json!({ "user": "hanh.ng", "name": "Hạnh", "kind": "gift",
                    "gift": "Hoa hồng", "count": 3, "xuEach": 10 })
        );
    }

    #[test]
    fn doc_duoc_tin_tu_cau_noi_ngoai() {
        let v: LiveEvent =
            serde_json::from_value(json!({ "user": "an", "name": "An", "kind": "comment", "text": "chào" }))
                .unwrap();
        assert_eq!(v.who.user, "an");
        assert!(matches!(v.what, Payload::Comment { ref text } if text == "chào"));
    }

    #[test]
    fn su_kien_khong_co_phan_rieng_van_doc_duoc() {
        for k in ["join", "leave", "follow", "share"] {
            let v: LiveEvent =
                serde_json::from_value(json!({ "user": "a", "name": "A", "kind": k })).unwrap();
            assert_eq!(v.kind(), k);
        }
    }

    #[test]
    fn thieu_truong_bat_buoc_thi_tu_choi_chu_khong_doan_bua() {
        // Quà mà không nói quà gì: từ chối, không tự điền "quà".
        let kq: Result<LiveEvent, _> =
            serde_json::from_value(json!({ "user": "a", "name": "A", "kind": "gift", "count": 1 }));
        assert!(kq.is_err());
    }

    #[test]
    fn tim_co_the_kem_tong_cua_tiktok_hoac_khong() {
        let co: LiveEvent = serde_json::from_value(
            json!({ "user": "a", "name": "A", "kind": "like", "count": 5, "total": 900 }),
        )
        .unwrap();
        assert!(matches!(co.what, Payload::Like { count: 5, total: Some(900) }));

        let khong: LiveEvent =
            serde_json::from_value(json!({ "user": "a", "name": "A", "kind": "like", "count": 5 }))
                .unwrap();
        assert!(matches!(khong.what, Payload::Like { count: 5, total: None }));
    }
}
