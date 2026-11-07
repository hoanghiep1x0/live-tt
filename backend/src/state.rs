//! Trạng thái chung của máy chủ: thiết kế đang phát, cấu hình module, bus phát xuống.

use std::collections::HashMap;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::{Arc, RwLock};

use serde::Serialize;
use serde_json::{json, Map, Value};
use tokio::sync::broadcast;

use crate::designs::{self, DesignInfo};
use crate::events::LiveEvent;
use crate::paths::Layout;
use crate::session::{Session, SessionView};
use crate::settings::{self, Settings, SettingsError};
use crate::source::{SourceCfg, SourceStatus};
use crate::store::{self, StoreError};

/// Sức chứa hàng chờ phát xuống. Client chậm quá mức này thì mất bớt tin cũ,
/// chấp nhận được: tin mới quan trọng hơn tin cũ.
const BUS_CAP: usize = 256;

/// Giờ máy, mili-giây. Chỉ dùng ở biên; lõi phiên luôn nhận `now` truyền vào.
pub fn bay_gio_ms() -> i64 {
    use std::time::{SystemTime, UNIX_EPOCH};
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as i64)
        .unwrap_or(0)
}

#[derive(Clone, Debug, Serialize)]
pub struct ModuleState {
    pub enabled: bool,
    pub config: Value,
}

pub struct AppState {
    pub layout: Layout,
    pub port: u16,
    pub token: String,
    /// Chỉ một thiết kế chạy một lúc. Đây là chỗ giữ điều đó.
    live: RwLock<Option<String>>,
    /// Phiên của thiết kế đang phát. Phiên nằm ở backend để mọi cửa sổ quản lý,
    /// mọi sân khấu và OBS cùng thấy một sự thật.
    phien: RwLock<Option<Session>>,
    /// Phiên riêng của từng thiết kế đang được XEM THỬ (chưa phát). Nhờ nó, bật
    /// nhân vật ảo ở bảng xem thử là thấy người vào ghế ngay, không phải lên
    /// sóng mới biết. Mọi tin của các phiên này gắn `designId`, nên phòng đang
    /// phát và trang quản lý không bao giờ thấy chúng.
    xem_thu: RwLock<HashMap<String, Session>>,
    /// Mỗi thiết kế đang có bao nhiêu cửa sổ xem thử nối vào (tin `xem`).
    /// Cửa sổ cuối cùng đóng thì phiên xem thử bị bỏ: nhân vật ảo thôi chạy,
    /// MC thôi gọi AI — không ai xem mà vẫn tiêu tiền API là lỗi.
    dang_xem: RwLock<HashMap<String, usize>>,
    /// Lỗi lượt MC gần nhất của từng phòng (hết hạn mức, sai khoá…). Thẻ MC ở
    /// bảng xem hiện câu này; lượt thành công thì xoá.
    ai_loi: RwLock<HashMap<String, String>>,
    nguon: RwLock<SourceCfg>,
    /// Đổi nguồn là tăng số này; tác vụ nguồn cũ thấy số khác thì tự thoát.
    the_he_nguon: AtomicU64,
    loi_nguon: RwLock<Option<String>>,
    /// Lỗi của tiến trình cầu nối do backend tự bật (thiếu Node, chưa
    /// `npm install`, cầu nối chết…). Để ô riêng, không chung `loi_nguon`: client
    /// WebSocket của nguồn `bridge` cứ mỗi lần nối hụt lại ghi lỗi của nó, sẽ đè
    /// mất câu "cần cài Node" — thứ duy nhất người vận hành cần đọc lúc đó.
    loi_tien_trinh: RwLock<Option<String>>,
    /// Đếm file tải lên, để hai file trong cùng một mili-giây không đè nhau.
    media_dem: AtomicU64,
    /// Một lượt gọi MC đang bay. Gọi chồng lên nhau là MC nói hai câu cùng lúc
    /// và hoá đơn API nhân đôi.
    ai_ban: std::sync::atomic::AtomicBool,
    /// Sổ chi phí của buổi hiện tại ở từng phòng (`chi_phi.rs`). Lên sóng là
    /// mở sổ mới; tắt sóng thì sổ được lưu lại và vẫn giữ ở đây để bảng còn
    /// hiện tổng của buổi vừa xong.
    chi_phi: RwLock<HashMap<String, crate::chi_phi::So>>,
    /// Truyện đang kể ở từng phòng: dấu và lúc bắt đầu kể — MC chỉ gửi lại
    /// chuyện của truyện này, không gửi chuyện của truyện đã xong.
    truyen_tu: RwLock<HashMap<String, (String, i64)>>,
    /// MC đang kể tới đoạn nào ở từng phòng (`ke_truyen.rs`).
    ke_toi: RwLock<HashMap<String, crate::ke_truyen::TienDo>>,
    tx: broadcast::Sender<Value>,
}

/// Lý do từ chối, kèm mã HTTP để tầng trên khỏi phải đoán.
#[derive(Debug)]
pub enum AppError {
    NotFound(String),
    BadRequest(String),
    /// Đã có thiết kế khác đang phát — phải tắt nó trước.
    Conflict {
        live: String,
    },
    Internal(String),
    /// Nhà cung cấp bên ngoài từ chối. Không phải lỗi của người vừa bấm.
    Upstream(String),
}

impl From<crate::secrets::SecretError> for AppError {
    fn from(e: crate::secrets::SecretError) -> Self {
        match e {
            crate::secrets::SecretError::Invalid(m) => Self::BadRequest(m),
            crate::secrets::SecretError::Store(e) => Self::Internal(e.to_string()),
        }
    }
}

impl From<StoreError> for AppError {
    fn from(e: StoreError) -> Self {
        Self::Internal(e.to_string())
    }
}

impl From<SettingsError> for AppError {
    fn from(e: SettingsError) -> Self {
        match e {
            SettingsError::Invalid(m) => Self::BadRequest(m),
            SettingsError::Store(e) => Self::Internal(e.to_string()),
        }
    }
}

impl AppState {
    pub fn new(layout: Layout, port: u16, token: String) -> Arc<Self> {
        let (tx, _) = broadcast::channel(BUS_CAP);
        Arc::new(Self {
            layout,
            port,
            token,
            live: RwLock::new(None),
            phien: RwLock::new(None),
            xem_thu: RwLock::new(HashMap::new()),
            dang_xem: RwLock::new(HashMap::new()),
            ai_loi: RwLock::new(HashMap::new()),
            nguon: RwLock::new(SourceCfg::default()),
            the_he_nguon: AtomicU64::new(0),
            loi_nguon: RwLock::new(None),
            loi_tien_trinh: RwLock::new(None),
            media_dem: AtomicU64::new(0),
            ai_ban: std::sync::atomic::AtomicBool::new(false),
            chi_phi: RwLock::new(HashMap::new()),
            truyen_tu: RwLock::new(HashMap::new()),
            ke_toi: RwLock::new(HashMap::new()),
            tx,
        })
    }

    pub fn subscribe(&self) -> broadcast::Receiver<Value> {
        self.tx.subscribe()
    }

    /// Phát xuống mọi thiết kế và trang quản lý đang nối.
    /// Không ai nghe cũng không sao — đó là trạng thái bình thường lúc chưa mở phòng.
    pub fn broadcast(&self, msg: Value) {
        let _ = self.tx.send(msg);
    }

    pub fn live(&self) -> Option<String> {
        self.live.read().expect("khoá live hỏng").clone()
    }

    pub fn designs(&self) -> Vec<DesignInfo> {
        designs::scan(&self.layout, self.port, self.live().as_deref())
    }

    pub fn design_exists(&self, id: &str) -> bool {
        self.layout.design_manifest(id).exists()
    }

    /// Bật phát một thiết kế. Đang có thiết kế khác thì từ chối — người dùng
    /// phải tắt cái cũ trước, đúng luật một phòng một lúc.
    pub fn go_live(&self, id: &str) -> Result<(), AppError> {
        if !self.design_exists(id) {
            return Err(AppError::NotFound(format!("không có thiết kế \"{id}\"")));
        }
        // Lần đầu phát một bối cảnh thì nạp cấu hình gợi ý của nó, để phòng lên
        // hình là đã có tính năng chạy, không phải bật tay từng cái.
        self.ensure_seeded(id)?;
        {
            let mut cur = self.live.write().expect("khoá live hỏng");
            match cur.as_deref() {
                Some(dang) if dang == id => return Ok(()),
                Some(dang) => {
                    return Err(AppError::Conflict {
                        live: dang.to_string(),
                    })
                }
                None => *cur = Some(id.to_string()),
            }
        }

        // Buổi live MỚI không bao giờ mở màn bằng truyện đã kể: TikTok coi đó
        // là phát lại. Dọn khung về màn chờ, MC mở truyện mới ngay sau đó.
        crate::ke_truyen::don_truyen_cu(self, id);
        self.ghi_nho_nguon();
        // Lên sóng thì phiên thật thay chỗ phiên xem thử.
        self.xem_thu.write().expect("khoá xem thử hỏng").remove(id);
        *self.phien.write().expect("khoá phiên hỏng") = Some(self.phien_moi(id));
        self.broadcast(json!({ "t": "live", "designId": id }));
        // Buổi live mới: sổ chi phí mới, tính từ lúc này.
        let so = self.so_moi(id, true);
        self.chi_phi.write().expect("khoá chi phí hỏng").insert(id.to_string(), so.clone());
        self.phat_cua(id, json!({ "t": "chi-phi", "so": so }));
        Ok(())
    }

    pub fn stop_live(&self) {
        let cu = {
            let mut cur = self.live.write().expect("khoá live hỏng");
            cur.take()
        };
        self.ghi_nho_nguon();
        *self.phien.write().expect("khoá phiên hỏng") = None;
        if let Some(id) = &cu {
            self.broadcast(json!({ "t": "live", "designId": Value::Null }));
            self.dong_so_chi_phi(id);
        }
        // Phòng vừa thôi phát mà vẫn có trang xem thử thì quay về phiên xem thử.
        self.dung_xem_thu();
    }

    /// Phiên trắng của một thiết kế. Số ghế và tỉ lệ đổi xu do thiết kế khai,
    /// vì mỗi bối cảnh một khác.
    fn phien_moi(&self, id: &str) -> Session {
        let m = designs::read_manifest(&self.layout.design_manifest(id), id).ok();
        let (ghe, ti_le) = m.as_ref().map_or((84, 1.0), |m| (m.seats, m.point_rate));
        let mut s = Session::new(id, ghe, ti_le, bay_gio_ms());
        // Mã ghế ("ghế B4") là đồ đạc của từng phòng: chỉ phòng tự khai sơ đồ
        // hàng ghế mới đọc các lệnh dùng mã ghế.
        if let Some(m) = m.filter(|m| !m.seat_rows.is_empty()) {
            s.dat_so_do(m.seat_rows, m.row_seats.unwrap_or(0));
        }
        s
    }

    // ---- Phiên xem thử ----

    /// Một cửa sổ xem thử của `id` vừa nối. Dựng phiên xem thử nếu phòng chưa
    /// phát. Đếm cả khi phòng đang phát: thôi phát thì cửa sổ đó vẫn còn đó.
    pub fn mo_xem_thu(&self, id: &str) {
        *self
            .dang_xem
            .write()
            .expect("khoá xem thử hỏng")
            .entry(id.to_string())
            .or_insert(0) += 1;
        self.dung_xem_thu();
    }

    /// Một cửa sổ xem thử của `id` vừa đóng. Hết cửa sổ thì bỏ phiên xem thử.
    pub fn dong_xem_thu(&self, id: &str) {
        let het = {
            let mut g = self.dang_xem.write().expect("khoá xem thử hỏng");
            match g.get_mut(id) {
                Some(n) if *n > 1 => {
                    *n -= 1;
                    false
                }
                Some(_) => {
                    g.remove(id);
                    true
                }
                None => false,
            }
        };
        if het {
            self.xem_thu.write().expect("khoá xem thử hỏng").remove(id);
        }
    }

    /// Mỗi phòng đang được xem mà chưa phát thì có đúng một phiên xem thử.
    fn dung_xem_thu(&self) {
        let live = self.live();
        let ds: Vec<String> = self
            .dang_xem
            .read()
            .expect("khoá xem thử hỏng")
            .keys()
            .filter(|id| live.as_deref() != Some(id.as_str()))
            .cloned()
            .collect();
        let mut g = self.xem_thu.write().expect("khoá xem thử hỏng");
        for id in ds {
            if !g.contains_key(&id) {
                let p = self.phien_moi(&id);
                g.insert(id, p);
            }
        }
    }

    /// Các phiên xem thử đang có: id thiết kế và mốc mở phiên.
    pub fn cac_xem_thu(&self) -> Vec<(String, i64)> {
        self.xem_thu
            .read()
            .expect("khoá xem thử hỏng")
            .iter()
            .map(|(k, p)| (k.clone(), p.started_at()))
            .collect()
    }

    pub fn xem_thu_view(&self, id: &str) -> Option<SessionView> {
        self.xem_thu
            .read()
            .expect("khoá xem thử hỏng")
            .get(id)
            .map(|p| p.view(60))
    }

    /// MC nói một câu trong phiên xem thử của `id`. Như `mc_noi`, nhưng feed
    /// gắn `designId` nên chỉ cửa sổ xem thử của đúng phòng đó nghe thấy.
    pub fn mc_noi_xem_thu(&self, id: &str, text: String, voice: Option<String>, ke: Option<u32>, truyen: bool, chao: bool) {
        let now = bay_gio_ms();
        let item = {
            let mut g = self.xem_thu.write().expect("khoá xem thử hỏng");
            match g.get_mut(id) {
                Some(p) => p.mc_noi(now, text, voice, ke, truyen, chao),
                None => return,
            }
        };
        self.broadcast(json!({ "t": "feed", "items": [item], "designId": id }));
    }

    /// Áp một sự kiện vào phiên xem thử của `id`, phát feed gắn `designId`.
    pub fn ap_su_kien_xem_thu(&self, id: &str, ev: LiveEvent, ao: bool) {
        let now = bay_gio_ms();
        let items = {
            let mut g = self.xem_thu.write().expect("khoá xem thử hỏng");
            match g.get_mut(id) {
                Some(p) => p.apply(&ev, now, ao),
                None => return,
            }
        };
        if items.is_empty() {
            return;
        }
        self.broadcast(json!({ "t": "feed", "items": items, "designId": id }));
    }

    // ---- Phiên và nguồn sự kiện ----

    pub fn session_view(&self) -> Option<SessionView> {
        self.phien
            .read()
            .expect("khoá phiên hỏng")
            .as_ref()
            .map(|p| p.view(60))
    }

    /// Áp một sự kiện vào phiên rồi phát mục feed xuống ngay.
    ///
    /// Chỉ phát mục feed, KHÔNG phát cả bản phiên: phòng đông thì mỗi giây có
    /// hàng chục sự kiện, gửi kèm toàn bộ bảng top và danh sách ghế mỗi lần là
    /// tự làm nghẽn. Bản phiên đi theo nhịp ở `nhip_phien`.
    pub fn ap_su_kien(&self, ev: LiveEvent, ao: bool) {
        let now = bay_gio_ms();
        let items = {
            let mut g = self.phien.write().expect("khoá phiên hỏng");
            match g.as_mut() {
                Some(p) => p.apply(&ev, now, ao),
                None => return,
            }
        };
        if items.is_empty() {
            return;
        }
        self.broadcast(json!({ "t": "feed", "items": items }));
    }

    /// Mốc mở phiên đang chạy. Rẻ hơn `session_view` nhiều — bộ nhân vật ảo gọi
    /// mỗi nhịp chỉ để biết phiên có bị dựng lại hay không.
    pub fn phien_bat_dau(&self) -> Option<i64> {
        self.phien
            .read()
            .expect("khoá phiên hỏng")
            .as_ref()
            .map(Session::started_at)
    }

    pub fn dat_nguoi_xem(&self, n: u64) {
        if let Some(p) = self.phien.write().expect("khoá phiên hỏng").as_mut() {
            p.dat_nguoi_xem(n);
        }
    }

    /// Tổng lượt xem cả buổi live, do TikTok đếm (xem `Session::dat_luot_xem`).
    pub fn dat_luot_xem(&self, n: u64) {
        if let Some(p) = self.phien.write().expect("khoá phiên hỏng").as_mut() {
            p.dat_luot_xem(n);
        }
    }

    /// Kênh tắt live: dọn rạp ngay (xem `Session::don_phong`). Phát bản phiên
    /// xuống luôn, không đợi nhịp sau — người xem OBS phải thấy rạp trống đúng
    /// lúc buổi live kết thúc.
    pub fn don_phong(&self) {
        let view = {
            let mut g = self.phien.write().expect("khoá phiên hỏng");
            match g.as_mut() {
                Some(p) => {
                    if !p.don_phong() {
                        return;
                    }
                    p.view(60)
                }
                None => return,
            }
        };
        tracing::info!("kênh tắt live: dọn rạp, số người xem về 0");
        self.broadcast(json!({ "t": "session", "view": view }));
    }

    /// Nhịp đều: trả ghế của người đã vắng lâu, rồi phát bản phiên xuống.
    pub fn nhip_phien(&self) {
        let now = bay_gio_ms();
        let xem: Vec<(String, SessionView)> = {
            let mut g = self.xem_thu.write().expect("khoá xem thử hỏng");
            g.iter_mut()
                .map(|(id, p)| {
                    p.thu_hoi_ghe(now);
                    (id.clone(), p.view(60))
                })
                .collect()
        };
        for (id, view) in xem {
            self.broadcast(json!({ "t": "session", "view": view, "designId": id }));
        }
        let view = {
            let mut g = self.phien.write().expect("khoá phiên hỏng");
            match g.as_mut() {
                Some(p) => {
                    p.thu_hoi_ghe(now);
                    p.view(60)
                }
                None => return,
            }
        };
        self.broadcast(json!({ "t": "session", "view": view }));
    }

    /// Lời chào gửi cho client vừa nối: toàn bộ trạng thái hiện tại.
    ///
    /// Thiếu cái này thì một sân khấu mở giữa chừng chỉ biết "đang phát phòng
    /// nào" mà không biết module nào đang bật — và nó sẽ đứng im cho tới khi có
    /// người gạt một công tắc. Mở OBS sau khi lên sóng là chuyện bình thường,
    /// nên trạng thái phải tự tới, không chờ ai gạt.
    pub fn chao_ws(&self) -> Vec<Value> {
        let live = self.live();
        let mut ra = vec![json!({ "t": "live", "designId": live })];

        if let Some(id) = live.as_deref() {
            ra.extend(self.trang_thai_phong(id));
        }

        ra.push(json!({ "t": "voice", "cfg": crate::voice::read(&self.layout) }));

        if let Some(v) = self.session_view() {
            ra.push(json!({ "t": "session", "view": v }));
        }
        ra
    }

    /// Trạng thái riêng của một thiết kế: module bật, cấu hình từng module, lựa
    /// chọn của thiết kế, nhân vật ảo, MC AI. Dùng cho lời chào (thiết kế đang
    /// phát) và cho bản xem trước của một thiết kế CHƯA phát (`ws.rs`, tin `xem`).
    pub fn trang_thai_phong(&self, id: &str) -> Vec<Value> {
        let mut ra = Vec::new();
        if let Ok(mods) = self.all_modules(id) {
            let bat: Vec<&String> = mods
                .iter()
                .filter(|(_, v)| v.get("enabled").and_then(Value::as_bool).unwrap_or(false))
                .map(|(k, _)| k)
                .collect();
            ra.push(json!({ "t": "modules", "enabled": bat }));

            for (k, v) in &mods {
                if let Some(c) = v.get("config") {
                    ra.push(json!({ "t": "config", "moduleId": k, "config": c }));
                }
            }
        }
        if let Ok(cfg) = self.design_config(id) {
            ra.push(json!({ "t": "design", "config": Value::Object(cfg) }));
        }
        ra.push(json!({ "t": "bot", "cfg": self.bot_config(id) }));
        ra.push(json!({ "t": "ai", "cfg": self.ai_config(id) }));
        if let Some(v) = self.xem_thu_view(id) {
            ra.push(json!({ "t": "session", "view": v }));
        }
        let loi = self.ai_loi.read().expect("khoá lỗi MC hỏng").get(id).cloned();
        ra.push(json!({ "t": "ai-loi", "loi": loi }));
        if let Some(so) = self.so_chi_phi(id) {
            ra.push(json!({ "t": "chi-phi", "so": so }));
        }
        ra
    }

    /// Ghi một lượt gọi AI vào sổ chi phí của phòng rồi phát sổ xuống. `usd`
    /// `None` là nhà cung cấp không cho biết giá. Sổ đã đóng (buổi live vừa
    /// tắt) thì mở sổ mới — lượt này là của lúc xem thử, không phải buổi cũ.
    pub fn ghi_chi_phi(&self, design_id: &str, khoan: &str, d: &crate::chi_phi::Dung, usd: Option<f64>) {
        let live = self.live().as_deref() == Some(design_id);
        let moi = self.so_moi(design_id, live);
        let so = {
            let mut g = self.chi_phi.write().expect("khoá chi phí hỏng");
            let so = g.entry(design_id.to_string()).or_insert_with(|| moi.clone());
            if so.ket_thuc.is_some() {
                *so = moi;
            }
            so.ghi(khoan, d, usd);
            so.clone()
        };
        self.phat_cua(design_id, json!({ "t": "chi-phi", "so": so }));
    }

    /// Truyện đang kể ở phòng: (tên, dấu tên + các đoạn). `None` khi module
    /// story tắt hoặc chưa có đoạn nào.
    fn truyen_dang_ke(&self, design_id: &str) -> Option<(String, String)> {
        let m = self.module_state(design_id, "story").ok().filter(|m| m.enabled)?;
        let doan = crate::anh_truyen::cat_doan(m.config.get("passages")?.as_str()?);
        if doan.is_empty() {
            return None;
        }
        let ten = m.config.get("title").and_then(Value::as_str).unwrap_or_default().to_string();
        let dau = crate::anh_truyen::dau_truyen(&ten, &doan);
        Some((ten, dau))
    }

    /// Sổ trắng của một buổi; truyện đang có lúc mở sổ là truyện thứ nhất.
    fn so_moi(&self, design_id: &str, live: bool) -> crate::chi_phi::So {
        let mut so = crate::chi_phi::So::moi(design_id, live, bay_gio_ms());
        if let Some((ten, dau)) = self.truyen_dang_ke(design_id) {
            so.ghi_truyen(&ten, &dau);
        }
        so
    }

    /// Cấu hình story vừa đổi: đổi sang truyện khác thì sổ đếm thêm một truyện
    /// và phát lại ngay. Chưa có sổ thì mở sổ (xem thử) — để bảng biết đã kể
    /// mấy truyện kể cả khi chưa tốn đồng nào.
    fn theo_doi_truyen(&self, design_id: &str) {
        let Some((ten, dau)) = self.truyen_dang_ke(design_id) else { return };
        {
            let mut g = self.truyen_tu.write().expect("khoá truyện hỏng");
            match g.get(design_id) {
                // Lần đầu thấy truyện (vừa mở máy chủ): coi như kể từ đầu, giữ
                // nguyên những gì MC đã nói về chính truyện này.
                None => {
                    g.insert(design_id.to_string(), (dau.clone(), i64::MIN));
                }
                Some((d, _)) if *d != dau => {
                    g.insert(design_id.to_string(), (dau.clone(), bay_gio_ms()));
                }
                Some(_) => {}
            }
        }
        let live = self.live().as_deref() == Some(design_id);
        let so = {
            let mut g = self.chi_phi.write().expect("khoá chi phí hỏng");
            let so = g
                .entry(design_id.to_string())
                .or_insert_with(|| crate::chi_phi::So::moi(design_id, live, bay_gio_ms()));
            if so.ket_thuc.is_some() {
                *so = crate::chi_phi::So::moi(design_id, live, bay_gio_ms());
            }
            if !so.ghi_truyen(&ten, &dau) {
                return;
            }
            so.clone()
        };
        self.phat_cua(design_id, json!({ "t": "chi-phi", "so": so }));
    }

    /// MC đang kể truyện `dau` tới đâu ở phòng này. Truyện khác thì từ đầu.
    pub fn tien_do_ke(&self, design_id: &str, dau: &str) -> crate::ke_truyen::TienDo {
        let g = self.ke_toi.read().expect("khoá kể truyện hỏng");
        crate::ke_truyen::TienDo::cua(g.get(design_id), dau)
    }

    /// Ghi lại tiến độ kể sau một lượt MC.
    pub fn ghi_tien_do_ke(&self, design_id: &str, td: crate::ke_truyen::TienDo) {
        self.ke_toi.write().expect("khoá kể truyện hỏng").insert(design_id.to_string(), td);
    }

    /// Lúc truyện đang kể ở phòng bắt đầu (đổi truyện là đổi mốc). `None` khi
    /// máy chủ chưa thấy truyện nào đổi từ lúc mở — gửi đủ như thường.
    pub fn truyen_bat_dau(&self, design_id: &str) -> Option<i64> {
        self.truyen_tu.read().expect("khoá truyện hỏng").get(design_id).map(|(_, t)| *t)
    }

    /// Sổ chi phí đang mở của một phòng.
    pub fn so_chi_phi(&self, design_id: &str) -> Option<crate::chi_phi::So> {
        self.chi_phi.read().expect("khoá chi phí hỏng").get(design_id).cloned()
    }

    /// Buổi live vừa tắt: chốt sổ và ghi thêm một dòng vào
    /// `database/designs/<id>/chi-phi.jsonl`. Sổ vẫn giữ trong bộ nhớ để bảng
    /// còn hiện tổng buổi vừa xong.
    fn dong_so_chi_phi(&self, design_id: &str) {
        let so = {
            let mut g = self.chi_phi.write().expect("khoá chi phí hỏng");
            let Some(so) = g.get_mut(design_id) else { return };
            if so.ket_thuc.is_some() {
                return;
            }
            so.ket_thuc = Some(bay_gio_ms());
            so.clone()
        };
        if let Some(thu_muc) = self.layout.config_file(design_id).parent() {
            use std::io::Write;
            let dong = serde_json::to_string(&so).unwrap_or_default();
            let ghi = std::fs::create_dir_all(thu_muc).and_then(|()| {
                std::fs::OpenOptions::new()
                    .create(true)
                    .append(true)
                    .open(thu_muc.join("chi-phi.jsonl"))
                    .and_then(|mut f| writeln!(f, "{dong}"))
            });
            match ghi {
                Ok(()) => tracing::info!(thiet_ke = %design_id, usd = so.tong_usd, "chốt sổ chi phí buổi live"),
                Err(e) => tracing::warn!("không ghi được sổ chi phí: {e}"),
            }
        }
        self.phat_cua(design_id, json!({ "t": "chi-phi", "so": so }));
    }

    /// Ghi lại lượt MC vừa rồi lỗi gì (`None`: lượt thành công). Chỉ phát khi
    /// đổi, để thẻ MC không nháy mỗi nhịp lúc lỗi cứ lặp lại y hệt.
    pub fn bao_ai(&self, design_id: &str, loi: Option<String>) {
        let doi = {
            let mut g = self.ai_loi.write().expect("khoá lỗi MC hỏng");
            match &loi {
                Some(l) => g.insert(design_id.to_string(), l.clone()).as_ref() != Some(l),
                None => g.remove(design_id).is_some(),
            }
        };
        if doi {
            self.phat_cua(design_id, json!({ "t": "ai-loi", "loi": loi }));
        }
    }

    /// Lượt MC gần nhất của phòng có đang lỗi không (`bao_ai`).
    pub fn ai_dang_loi(&self, design_id: &str) -> bool {
        self.ai_loi.read().expect("khoá lỗi MC hỏng").contains_key(design_id)
    }

    /// MC cho một nhân vật ảo đang ngồi trong phòng nói một câu (lệnh `ao-noi`).
    /// Không có ai ảo đang ngồi thì thôi — không dựng người từ hư không.
    pub fn ao_noi(&self, design_id: &str, dang_phat: bool, text: String) -> bool {
        let view = if dang_phat { self.session_view() } else { self.xem_thu_view(design_id) };
        let Some(view) = view else { return false };
        // Người do bộ nhân vật ảo dựng có nick `mh####` (xem `bot.rs`).
        let ao: Vec<_> = view.seats.iter().filter(|s| s.user.starts_with("mh")).collect();
        if ao.is_empty() {
            return false;
        }
        let ai = ao[rand::random::<u32>() as usize % ao.len()];
        let ev = LiveEvent {
            who: crate::events::EventUser {
                user: ai.user.clone(),
                name: ai.name.clone(),
                avatar: None,
            },
            what: crate::events::Payload::Comment { text },
        };
        if dang_phat {
            self.ap_su_kien(ev, true);
        } else {
            self.ap_su_kien_xem_thu(design_id, ev, true);
        }
        true
    }

    pub fn the_he_nguon(&self) -> u64 {
        self.the_he_nguon.load(Ordering::SeqCst)
    }

    /// Seed cho nguồn giả lập. Theo thế hệ nên mở lại nguồn là ra phòng khác,
    /// nhưng trong một lần chạy thì lặp lại được.
    pub fn seed_gia_lap(&self) -> u64 {
        self.the_he_nguon()
    }

    pub fn doi_nguon(&self, cfg: SourceCfg) -> u64 {
        *self.nguon.write().expect("khoá nguồn hỏng") = cfg;
        *self.loi_nguon.write().expect("khoá nguồn hỏng") = None;
        *self.loi_tien_trinh.write().expect("khoá nguồn hỏng") = None;
        self.ghi_nho_nguon();
        let the_he = self.the_he_nguon.fetch_add(1, Ordering::SeqCst) + 1;
        self.phat_nguon();
        the_he
    }

    /// Phát trạng thái nguồn xuống mọi trang (`{ t: 'source' }`), để nút "Kết
    /// nối Studio" và thanh trên đổi ngay chứ không đợi tải lại trang.
    fn phat_nguon(&self) {
        self.broadcast(json!({ "t": "source", "source": self.nguon() }));
    }

    /// Ghi nguồn sự kiện và phòng đang phát ra đĩa, để mở app lại là chạy tiếp.
    fn ghi_nho_nguon(&self) {
        let cfg = self.nguon.read().expect("khoá nguồn hỏng").clone();
        let live = self.live.read().expect("khoá live hỏng").clone();
        let v = json!({ "nguon": cfg, "live": live });
        if let Err(e) = store::write_json_atomic(&self.layout.nguon_file(), &v) {
            tracing::warn!(?e, "không ghi được nguồn sự kiện");
        }
    }

    /// Đọc lại nguồn và phòng đang phát của lần chạy trước. Trả phòng cần phát
    /// tiếp, nếu có. Gọi lúc máy chủ mở (`khoi_dong`).
    pub fn doc_nguon_da_nho(&self) -> Option<String> {
        let v = store::read_json(&self.layout.nguon_file()).ok().flatten()?;
        if let Some(cfg) = v.get("nguon").cloned().and_then(|c| serde_json::from_value::<SourceCfg>(c).ok()) {
            *self.nguon.write().expect("khoá nguồn hỏng") = cfg;
        }
        v.get("live").and_then(Value::as_str).map(str::to_string)
    }

    /// Lỗi của nguồn đang chạy (`None`: đang nhận dữ liệu). Chỉ phát xuống khi
    /// đổi — nguồn nối lại mỗi vài giây mà lần nào cũng phát là nháy cả trang.
    pub fn dat_loi_nguon(&self, loi: Option<String>) {
        let doi = {
            let mut g = self.loi_nguon.write().expect("khoá nguồn hỏng");
            let doi = *g != loi;
            *g = loi;
            doi
        };
        if doi {
            self.phat_nguon();
        }
    }

    /// Lỗi của tiến trình cầu nối (`source::tien_trinh`). Có thì nó thắng lỗi
    /// của nguồn: cầu nối chưa chạy thì mọi lỗi nối khác chỉ là hệ quả.
    pub fn dat_loi_tien_trinh(&self, loi: Option<String>) {
        let doi = {
            let mut g = self.loi_tien_trinh.write().expect("khoá nguồn hỏng");
            let doi = *g != loi;
            *g = loi;
            doi
        };
        if doi {
            self.phat_nguon();
        }
    }

    pub fn nguon(&self) -> SourceStatus {
        let cfg = self.nguon.read().expect("khoá nguồn hỏng").clone();
        let problem = self
            .loi_tien_trinh
            .read()
            .expect("khoá nguồn hỏng")
            .clone()
            .or_else(|| self.loi_nguon.read().expect("khoá nguồn hỏng").clone());
        let running = cfg.kind != crate::source::SourceKind::Tat && problem.is_none();
        SourceStatus {
            cfg,
            running,
            problem,
        }
    }

    // ---- Cài đặt người vận hành đặt cho thiết kế ----

    pub fn set_settings(&self, design_id: &str, patch: &Value) -> Result<Settings, AppError> {
        if !self.design_exists(design_id) {
            return Err(AppError::NotFound(format!(
                "không có thiết kế \"{design_id}\""
            )));
        }
        Ok(settings::apply(&self.layout, design_id, patch)?)
    }

    /// Xoá dữ liệu phiên. Cấu hình module và sổ quà không bị đụng tới.
    pub fn reset_design(&self, design_id: &str) -> Result<Vec<String>, AppError> {
        if !self.design_exists(design_id) {
            return Err(AppError::NotFound(format!(
                "không có thiết kế \"{design_id}\""
            )));
        }
        Ok(settings::reset(&self.layout, design_id)?)
    }

    // ---- Cấu hình module, lưu theo từng thiết kế ----

    fn modules_of(&self, design_id: &str) -> Result<Map<String, Value>, StoreError> {
        let doc = store::read_object(&self.layout.config_file(design_id))?;
        Ok(match doc.get("modules") {
            Some(Value::Object(m)) => m.clone(),
            _ => Map::new(),
        })
    }

    /// Ghi lại `modules`, GIU NGUYEN cac khoa khac cua file (vi du `design`).
    /// Ghi de ca file thi mot lan gat cong tac module se xoa mat lua chon khung
    /// cua thiet ke.
    fn save_modules(&self, design_id: &str, modules: Map<String, Value>) -> Result<(), StoreError> {
        let path = self.layout.config_file(design_id);
        let mut doc = store::read_object(&path)?;
        doc.insert("modules".into(), Value::Object(modules));
        store::write_json_atomic(&path, &Value::Object(doc))
    }

    /// Cau hinh MC do AI dan cua mot thiet ke.
    pub fn ai_config(&self, design_id: &str) -> crate::ai::AiCfg {
        let doc = match store::read_object(&self.layout.config_file(design_id)) {
            Ok(d) => d,
            Err(_) => return crate::ai::AiCfg::default(),
        };
        match doc.get("ai") {
            Some(v) => serde_json::from_value(v.clone()).unwrap_or_default(),
            None => crate::ai::AiCfg::default(),
        }
    }

    /// Gop mot patch vao cau hinh MC roi phat xuong ngay.
    pub fn set_ai_config(&self, design_id: &str, patch: Value) -> Result<(), AppError> {
        let Value::Object(patch) = patch else {
            return Err(AppError::BadRequest("cấu hình MC phải là một object".into()));
        };
        let cu = self.ai_config(design_id);
        let mut obj = match serde_json::to_value(cu) {
            Ok(Value::Object(m)) => m,
            _ => Map::new(),
        };
        for (k, v) in patch {
            obj.insert(k, v);
        }
        let moi: crate::ai::AiCfg = serde_json::from_value(Value::Object(obj))
            .map_err(|e| AppError::BadRequest(format!("cấu hình MC không hợp lệ: {e}")))?;
        let moi_val = serde_json::to_value(moi).unwrap_or(Value::Null);

        let path = self.layout.config_file(design_id);
        let mut doc = store::read_object(&path)?;
        doc.insert("ai".into(), moi_val.clone());
        store::write_json_atomic(&path, &Value::Object(doc))?;

        self.phat_cua(design_id, json!({ "t": "ai", "cfg": moi_val }));
        Ok(())
    }

    /// MC noi mot cau: ghi vao phien roi phat xuong feed.
    ///
    /// Di qua feed chu khong phai mot tin rieng: cau MC phai nam trong phien de
    /// luot sau AI doc lai duoc minh vua noi gi, va cua so xem mo giua chung
    /// cung thay MC dang ke toi dau.
    pub fn mc_noi(&self, text: String, voice: Option<String>, ke: Option<u32>, truyen: bool, chao: bool) {
        let now = bay_gio_ms();
        let item = {
            let mut g = self.phien.write().expect("khoá phiên hỏng");
            match g.as_mut() {
                Some(p) => p.mc_noi(now, text, voice, ke, truyen, chao),
                None => return,
            }
        };
        self.broadcast(json!({ "t": "feed", "items": [item] }));
    }

    /// Co ban cua MC: mot luot goi AI dang bay, khong goi chong len.
    /// Số đếm kế tiếp cho tên file tải lên.
    pub fn media_dem(&self) -> u64 {
        self.media_dem
            .fetch_add(1, std::sync::atomic::Ordering::Relaxed)
    }

    pub fn ai_dang_chay(&self) -> bool {
        self.ai_ban.load(std::sync::atomic::Ordering::Relaxed)
    }

    pub fn ai_bat_dau(&self) {
        self.ai_ban.store(true, std::sync::atomic::Ordering::Relaxed);
    }

    pub fn ai_xong(&self) {
        self.ai_ban.store(false, std::sync::atomic::Ordering::Relaxed);
    }

    /// Tat bat va so luong nhan vat ao cua mot thiet ke.
    pub fn bot_config(&self, design_id: &str) -> crate::bot::BotCfg {
        let doc = match store::read_object(&self.layout.config_file(design_id)) {
            Ok(d) => d,
            Err(_) => return crate::bot::BotCfg::default(),
        };
        match doc.get("bot") {
            Some(v) => serde_json::from_value(v.clone()).unwrap_or_default(),
            None => crate::bot::BotCfg::default(),
        }
    }

    /// Gop mot patch vao cau hinh nhan vat ao roi phat xuong ngay.
    pub fn set_bot_config(&self, design_id: &str, patch: Value) -> Result<(), AppError> {
        let Value::Object(patch) = patch else {
            return Err(AppError::BadRequest(
                "cấu hình nhân vật ảo phải là một object".into(),
            ));
        };
        let cu = self.bot_config(design_id);
        let mut obj = match serde_json::to_value(cu) {
            Ok(Value::Object(m)) => m,
            _ => Map::new(),
        };
        for (k, v) in patch {
            obj.insert(k, v);
        }
        // Doc lai qua BotCfg de so lon hay kieu la bi chan ngay o day, khong
        // phai doi toi luc chay.
        let moi: crate::bot::BotCfg =
            serde_json::from_value(Value::Object(obj)).map_err(|e| {
                AppError::BadRequest(format!("cấu hình nhân vật ảo không hợp lệ: {e}"))
            })?;
        let moi_val = serde_json::to_value(moi).unwrap_or(Value::Null);

        let path = self.layout.config_file(design_id);
        let mut doc = store::read_object(&path)?;
        doc.insert("bot".into(), moi_val.clone());
        store::write_json_atomic(&path, &Value::Object(doc))?;

        self.phat_cua(design_id, json!({ "t": "bot", "cfg": moi_val }));
        Ok(())
    }

    /// Cau va ten cua nhan vat ao, lay tu design.json cua thiet ke.
    /// Câu nhân vật ảo chào và cảm ơn khách thật của phòng (chào, cảm ơn).
    pub fn crowd_dap(&self, design_id: &str) -> (Vec<String>, Vec<String>) {
        match designs::read_manifest(&self.layout.design_manifest(design_id), design_id) {
            Ok(m) => (m.crowd.greet, m.crowd.thanks),
            Err(_) => (Vec::new(), Vec::new()),
        }
    }

    /// Lời dặn MC riêng của thiết kế (`mc.dan` trong design.json), hoặc `None`
    /// khi thiết kế không khai, file thiếu, rỗng hay quá dài — lúc đó MC dùng
    /// lời dặn gốc. Đường dẫn đi qua `safe_join` trong thư mục của chính thiết kế.
    pub fn dan_mc(&self, design_id: &str) -> Option<String> {
        let m = designs::read_manifest(&self.layout.design_manifest(design_id), design_id).ok()?;
        let rel = m.mc?.dan?;
        let goc = self.layout.designs_dir().join(design_id);
        let file = crate::paths::safe_join(&goc, &rel)?;
        let chu = std::fs::read_to_string(file).ok()?;
        let chu = chu.trim();
        (!chu.is_empty() && chu.len() <= crate::ai::MAX_DAN_THIET_KE).then(|| chu.to_string())
    }

    pub fn crowd_cua(&self, design_id: &str) -> (Vec<String>, Vec<String>) {
        match designs::read_manifest(&self.layout.design_manifest(design_id), design_id) {
            Ok(m) => (m.crowd.lines, m.crowd.names),
            Err(_) => (Vec::new(), Vec::new()),
        }
    }

    /// Lua chon cua chinh thiet ke (khung doc / ngang...), khong thuoc module nao.
    pub fn design_config(&self, design_id: &str) -> Result<Map<String, Value>, AppError> {
        let doc = store::read_object(&self.layout.config_file(design_id))?;
        Ok(match doc.get("design") {
            Some(Value::Object(m)) => m.clone(),
            _ => Map::new(),
        })
    }

    /// Gop mot patch vao lua chon cua thiet ke roi phat xuong ngay. Gop chu
    /// khong thay ca cuc: bang xem chi gui o vua doi.
    pub fn set_design_config(&self, design_id: &str, patch: Value) -> Result<(), AppError> {
        let Value::Object(patch) = patch else {
            return Err(AppError::BadRequest(
                "lựa chọn thiết kế phải là một object".into(),
            ));
        };
        let path = self.layout.config_file(design_id);
        let mut doc = store::read_object(&path)?;
        let mut cfg = match doc.get("design") {
            Some(Value::Object(m)) => m.clone(),
            _ => Map::new(),
        };
        for (k, v) in patch {
            cfg.insert(k, v);
        }
        doc.insert("design".into(), Value::Object(cfg.clone()));
        store::write_json_atomic(&path, &Value::Object(doc))?;

        self.phat_cua(design_id, json!({ "t": "design", "config": Value::Object(cfg) }));
        Ok(())
    }

    /// Nạp cấu hình gợi ý của bối cảnh, **chỉ khi** thiết kế chưa có cấu hình nào.
    ///
    /// Nhờ vậy làm một phòng mới (đám cưới, chùa, quán bar) là viết `recommends`
    /// và `defaults` trong `design.json`, không sửa module nào. Nạp một lần duy
    /// nhất: người vận hành chỉnh sau đó thì chỉnh của họ phải được giữ.
    pub fn ensure_seeded(&self, design_id: &str) -> Result<bool, AppError> {
        if self.layout.config_file(design_id).exists() {
            return Ok(false);
        }
        let m = designs::read_manifest(&self.layout.design_manifest(design_id), design_id)
            .map_err(AppError::NotFound)?;

        let mut modules = Map::new();
        let mut dat = |id: &str, enabled: bool, config: Value| {
            // design.json do người viết thiết kế soạn; id sai thì bỏ, không ghi
            // rác vào cấu hình rồi để trang quản lý vẽ một thẻ không tồn tại.
            if !crate::paths::valid_id(id) {
                tracing::warn!(
                    design_id,
                    id,
                    "bỏ id module sai định dạng trong design.json"
                );
                return;
            }
            let e = modules
                .entry(id.to_string())
                .or_insert_with(|| json!({ "config": {} }));
            if let Some(o) = e.as_object_mut() {
                if enabled {
                    o.insert("enabled".into(), Value::Bool(true));
                }
                if config.is_object() {
                    o.insert("config".into(), config);
                }
            }
        };

        for (id, cfg) in &m.defaults {
            dat(id, false, cfg.clone());
        }
        for id in &m.recommends {
            dat(id, true, Value::Null);
        }

        if modules.is_empty() {
            return Ok(false);
        }
        self.save_modules(design_id, modules)?;
        Ok(true)
    }

    pub fn module_state(&self, design_id: &str, module_id: &str) -> Result<ModuleState, AppError> {
        let m = self.modules_of(design_id)?;
        let v = m.get(module_id);
        Ok(ModuleState {
            enabled: v
                .and_then(|x| x.get("enabled"))
                .and_then(Value::as_bool)
                .unwrap_or(false),
            config: v
                .and_then(|x| x.get("config"))
                .cloned()
                .unwrap_or_else(|| json!({})),
        })
    }

    pub fn all_modules(&self, design_id: &str) -> Result<Map<String, Value>, AppError> {
        Ok(self.modules_of(design_id)?)
    }

    /// Ghi cấu hình rồi phát xuống ngay. Thiết kế áp nóng, KHÔNG tải lại trang —
    /// phòng đang live mà tải lại là mất khán giả.
    pub fn set_config(
        &self,
        design_id: &str,
        module_id: &str,
        patch: Value,
    ) -> Result<(), AppError> {
        let Value::Object(patch) = patch else {
            return Err(AppError::BadRequest("cấu hình phải là một object".into()));
        };
        let mut modules = self.modules_of(design_id)?;
        let entry = modules
            .entry(module_id.to_string())
            .or_insert_with(|| json!({}));

        // GỘP chứ không thay cả cục. Bảng xem gửi lên đúng MỘT ô vừa đổi: thay
        // cả cục thì gạt một công tắc là xoá sạch mọi ô còn lại của module đó —
        // tên truyện, đường dẫn video, cả bài truyện đã soạn.
        let mut cfg = match entry.get("config") {
            Some(Value::Object(m)) => m.clone(),
            _ => Map::new(),
        };
        for (k, v) in patch {
            cfg.insert(k, v);
        }
        let config = Value::Object(cfg);
        if let Some(obj) = entry.as_object_mut() {
            obj.insert("config".into(), config.clone());
        }
        self.save_modules(design_id, modules)?;

        self.phat_cua(design_id, json!({ "t": "config", "moduleId": module_id, "config": config }));
        if module_id == "story" {
            self.theo_doi_truyen(design_id);
        }
        Ok(())
    }

    pub fn set_enabled(&self, design_id: &str, module_id: &str, on: bool) -> Result<(), AppError> {
        let mut modules = self.modules_of(design_id)?;
        let entry = modules
            .entry(module_id.to_string())
            .or_insert_with(|| json!({}));
        if let Some(obj) = entry.as_object_mut() {
            obj.insert("enabled".into(), Value::Bool(on));
        }
        self.save_modules(design_id, modules.clone())?;

        let bat: Vec<&String> = modules
            .iter()
            .filter(|(_, v)| v.get("enabled").and_then(Value::as_bool).unwrap_or(false))
            .map(|(k, _)| k)
            .collect();
        self.phat_cua(design_id, json!({ "t": "modules", "enabled": bat }));
        if module_id == "story" && on {
            self.theo_doi_truyen(design_id);
        }
        Ok(())
    }

    /// Phát một tin trạng thái của thiết kế `design_id` xuống MỌI cửa sổ.
    ///
    /// Thiết kế đang phát: tin không gắn gì, như mọi tin của phòng đang live.
    /// Chưa phát: gắn `designId`, để mọi cửa sổ xem thử của đúng phòng đó cùng
    /// đổi ngay (bảng xem thử một cửa sổ, OBS hay cửa sổ khác thu hình), còn
    /// phòng đang phát và trang quản lý bỏ qua.
    fn phat_cua(&self, design_id: &str, mut tin: Value) {
        if self.live().as_deref() != Some(design_id) {
            if let Some(o) = tin.as_object_mut() {
                o.insert("designId".into(), json!(design_id));
            }
        }
        self.broadcast(tin);
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use std::path::Path;

    fn dung(root: &Path, id: &str) {
        let d = root.join("client").join("designs").join(id);
        fs::create_dir_all(d.join("dist")).unwrap();
        fs::write(
            d.join("design.json"),
            format!(r#"{{"id":"{id}","name":"{id}"}}"#),
        )
        .unwrap();
        fs::write(d.join("dist").join("index.html"), "<!doctype html>").unwrap();
    }

    fn state(root: &Path) -> Arc<AppState> {
        AppState::new(Layout::new(root), 47830, "tok".into())
    }

    #[test]
    fn loi_dan_mc_rieng_cua_thiet_ke_va_lui_ve_goc() {
        let tmp = tempfile::tempdir().unwrap();
        dung(tmp.path(), "ke-chuyen");
        let s = state(tmp.path());
        assert_eq!(s.dan_mc("ke-chuyen"), None, "không khai mc.dan thì dùng lời dặn gốc");

        let d = tmp.path().join("client/designs/lop-hoc-chu");
        fs::create_dir_all(&d).unwrap();
        fs::write(
            d.join("design.json"),
            r#"{"id":"lop-hoc-chu","name":"x","mc":{"dan":"mc-dan.md"}}"#,
        )
        .unwrap();
        assert_eq!(s.dan_mc("lop-hoc-chu"), None, "khai mà thiếu file thì cũng lùi về gốc");
        fs::write(d.join("mc-dan.md"), "  Bạn là cô giáo.  
").unwrap();
        assert_eq!(s.dan_mc("lop-hoc-chu").as_deref(), Some("Bạn là cô giáo."));

        // Đường dẫn thoát ra ngoài thư mục thiết kế bị chặn.
        fs::write(tmp.path().join("bi-mat.md"), "khoá").unwrap();
        fs::write(
            d.join("design.json"),
            r#"{"id":"lop-hoc-chu","name":"x","mc":{"dan":"../../../bi-mat.md"}}"#,
        )
        .unwrap();
        assert_eq!(s.dan_mc("lop-hoc-chu"), None);
    }

    #[test]
    fn so_chi_phi_mo_khi_len_song_chot_khi_tat_roi_mo_so_xem_thu_moi() {
        let tmp = tempfile::tempdir().unwrap();
        dung(tmp.path(), "ke-chuyen");
        let s = state(tmp.path());
        let d = crate::chi_phi::Dung { tok_vao: 100, tok_ra: 10, ..Default::default() };

        s.go_live("ke-chuyen").unwrap();
        s.ghi_chi_phi("ke-chuyen", crate::chi_phi::MC, &d, Some(0.01));
        s.ghi_chi_phi("ke-chuyen", crate::chi_phi::VE_ANH, &d, None);
        let so = s.so_chi_phi("ke-chuyen").unwrap();
        assert!(so.live && so.ket_thuc.is_none());
        assert_eq!((so.khoan["mc"].lan, so.chua_ro), (1, 1));

        s.stop_live();
        let chot = s.so_chi_phi("ke-chuyen").unwrap();
        assert!(chot.ket_thuc.is_some(), "tắt sóng là chốt sổ, vẫn giữ để bảng hiện");
        let file = tmp.path().join("database/designs/ke-chuyen/chi-phi.jsonl");
        let dong = fs::read_to_string(&file).unwrap();
        assert_eq!(dong.lines().count(), 1);
        assert!(dong.contains("\"tongUsd\":0.01"));

        // Lượt gọi sau buổi live là của lúc xem thử: sổ mới, không cộng vào buổi cũ.
        s.ghi_chi_phi("ke-chuyen", crate::chi_phi::VIET, &d, Some(0.002));
        let moi = s.so_chi_phi("ke-chuyen").unwrap();
        assert!(!moi.live && moi.ket_thuc.is_none());
        assert!(!moi.khoan.contains_key("mc"));
        // Tắt sóng lần nữa khi không phát thì không ghi thêm dòng nào.
        s.stop_live();
        assert_eq!(fs::read_to_string(&file).unwrap().lines().count(), 1);
    }

    #[test]
    fn so_dem_truyen_da_ke_trong_buoi() {
        let tmp = tempfile::tempdir().unwrap();
        dung(tmp.path(), "ke-chuyen");
        let s = state(tmp.path());
        s.set_enabled("ke-chuyen", "story", true).unwrap();
        s.set_config("ke-chuyen", "story", json!({ "title": "Cây vú sữa", "passages": "Một.
Hai." }))
            .unwrap();

        s.go_live("ke-chuyen").unwrap();
        assert_eq!(s.so_chi_phi("ke-chuyen").unwrap().truyen, ["Cây vú sữa"], "truyện lúc lên sóng là truyện thứ nhất");

        // Sửa chữ trong cùng truyện: không đếm thêm.
        s.set_config("ke-chuyen", "story", json!({ "passages": "Một.
Hai khác." })).unwrap();
        assert_eq!(s.so_chi_phi("ke-chuyen").unwrap().truyen.len(), 1);

        // Đổi truyện: đếm thêm.
        s.set_config("ke-chuyen", "story", json!({ "title": "Tấm Cám", "passages": "Ngày xưa." })).unwrap();
        // Ghi cấu hình khác của story (ảnh, lỗi…) mà truyện không đổi: không đếm.
        s.set_config("ke-chuyen", "story", json!({ "anhLoi": "" })).unwrap();
        assert_eq!(s.so_chi_phi("ke-chuyen").unwrap().truyen, ["Cây vú sữa", "Tấm Cám"]);
    }

    #[test]
    fn chi_mot_thiet_ke_phat_mot_luc() {
        let d = tempfile::tempdir().unwrap();
        dung(d.path(), "ke-chuyen");
        dung(d.path(), "hip-hop");
        let s = state(d.path());

        s.go_live("ke-chuyen").unwrap();
        assert_eq!(s.live().as_deref(), Some("ke-chuyen"));

        // Bật cái thứ hai khi chưa tắt cái đầu: phải từ chối, kèm tên cái đang chạy.
        match s.go_live("hip-hop") {
            Err(AppError::Conflict { live }) => assert_eq!(live, "ke-chuyen"),
            kq => panic!("phải báo xung đột, nhận {kq:?}"),
        }
        assert_eq!(
            s.live().as_deref(),
            Some("ke-chuyen"),
            "cái đang chạy không được đổi"
        );

        s.stop_live();
        s.go_live("hip-hop").unwrap();
        assert_eq!(s.live().as_deref(), Some("hip-hop"));
    }

    #[test]
    fn bat_lai_chinh_thiet_ke_dang_phat_thi_khong_sao() {
        let d = tempfile::tempdir().unwrap();
        dung(d.path(), "ke-chuyen");
        let s = state(d.path());
        s.go_live("ke-chuyen").unwrap();
        assert!(s.go_live("ke-chuyen").is_ok());
    }

    #[test]
    fn khong_phat_duoc_thiet_ke_khong_ton_tai() {
        let d = tempfile::tempdir().unwrap();
        let s = state(d.path());
        assert!(matches!(s.go_live("khong-co"), Err(AppError::NotFound(_))));
    }

    #[test]
    fn cau_hinh_ghi_roi_doc_lai_duoc() {
        let d = tempfile::tempdir().unwrap();
        dung(d.path(), "ke-chuyen");
        let s = state(d.path());
        s.set_config("ke-chuyen", "gift-thanks", json!({ "minCoins": 10 }))
            .unwrap();
        let m = s.module_state("ke-chuyen", "gift-thanks").unwrap();
        assert_eq!(m.config["minCoins"], json!(10));
        assert!(!m.enabled, "mặc định là tắt");
    }

    #[test]
    fn bat_tat_khong_lam_mat_cau_hinh() {
        let d = tempfile::tempdir().unwrap();
        dung(d.path(), "ke-chuyen");
        let s = state(d.path());
        s.set_config("ke-chuyen", "gift-thanks", json!({ "minCoins": 10 }))
            .unwrap();
        s.set_enabled("ke-chuyen", "gift-thanks", true).unwrap();
        let m = s.module_state("ke-chuyen", "gift-thanks").unwrap();
        assert!(m.enabled);
        assert_eq!(m.config["minCoins"], json!(10), "cấu hình phải còn nguyên");
    }

    #[test]
    fn lua_chon_thiet_ke_ghi_roi_doc_lai_va_gop_chu_khong_thay() {
        let d = tempfile::tempdir().unwrap();
        dung(d.path(), "ke-chuyen");
        let s = state(d.path());
        s.set_design_config("ke-chuyen", json!({ "khungNgang": true }))
            .unwrap();
        s.set_design_config("ke-chuyen", json!({ "ghe": 120 })).unwrap();
        let c = s.design_config("ke-chuyen").unwrap();
        assert_eq!(c["khungNgang"], json!(true), "ô cũ phải còn");
        assert_eq!(c["ghe"], json!(120));
    }

    #[test]
    fn lua_chon_thiet_ke_va_cau_hinh_module_khong_de_len_nhau() {
        let d = tempfile::tempdir().unwrap();
        dung(d.path(), "ke-chuyen");
        let s = state(d.path());
        s.set_design_config("ke-chuyen", json!({ "khungNgang": true }))
            .unwrap();
        // Gạt một công tắc module: file cấu hình bị ghi lại, lựa chọn thiết kế
        // phải còn nguyên.
        s.set_enabled("ke-chuyen", "gift-thanks", true).unwrap();
        s.set_config("ke-chuyen", "gift-thanks", json!({ "minCoins": 3 }))
            .unwrap();
        assert_eq!(
            s.design_config("ke-chuyen").unwrap()["khungNgang"],
            json!(true)
        );
        assert!(s.module_state("ke-chuyen", "gift-thanks").unwrap().enabled);
    }

    #[tokio::test]
    async fn doi_lua_chon_cua_thiet_ke_dang_phat_thi_phat_xuong_ngay() {
        let d = tempfile::tempdir().unwrap();
        dung(d.path(), "ke-chuyen");
        let s = state(d.path());
        s.go_live("ke-chuyen").unwrap();
        let mut rx = s.subscribe();

        s.set_design_config("ke-chuyen", json!({ "khungNgang": true }))
            .unwrap();

        let msg = rx.recv().await.unwrap();
        assert_eq!(msg["t"], json!("design"));
        assert_eq!(msg["config"]["khungNgang"], json!(true));
    }

    #[test]
    fn lua_chon_thiet_ke_khong_phai_object_bi_tu_choi() {
        let d = tempfile::tempdir().unwrap();
        dung(d.path(), "ke-chuyen");
        let s = state(d.path());
        assert!(matches!(
            s.set_design_config("ke-chuyen", json!("ngang")),
            Err(AppError::BadRequest(_))
        ));
    }

    #[test]
    fn sua_mot_o_khong_xoa_cac_o_khac() {
        // Bảng xem gửi lên đúng một ô vừa đổi. Thay cả cục thì gạt một công tắc
        // là xoá sạch tên truyện, video và cả bài truyện đã soạn.
        let d = tempfile::tempdir().unwrap();
        dung(d.path(), "ke-chuyen");
        let s = state(d.path());
        s.set_config(
            "ke-chuyen",
            "story",
            json!({ "title": "Sự tích cây vú sữa", "secPerPassage": 16 }),
        )
        .unwrap();
        s.set_config("ke-chuyen", "story", json!({ "loop": true }))
            .unwrap();
        let c = s.module_state("ke-chuyen", "story").unwrap().config;
        assert_eq!(c["title"], json!("Sự tích cây vú sữa"), "ô cũ phải còn");
        assert_eq!(c["secPerPassage"], json!(16));
        assert_eq!(c["loop"], json!(true));
    }

    #[test]
    fn doi_nha_cung_cap_ai_duoc_giu_lai_va_khong_xoa_o_khac() {
        // Người vận hành trỏ phần chữ sang một nhà khác: phải giữ, và không
        // được thổi bay nhịp hay lời dặn đã soạn.
        let d = tempfile::tempdir().unwrap();
        dung(d.path(), "ke-chuyen");
        let s = state(d.path());
        s.set_ai_config("ke-chuyen", json!({ "extra": "tối nay kể cổ tích", "everySec": 45 }))
            .unwrap();
        s.set_ai_config(
            "ke-chuyen",
            json!({ "provider": "openrouter", "model": "deepseek/deepseek-chat" }),
        )
        .unwrap();
        s.set_ai_config("ke-chuyen", json!({ "anhProvider": "ve-anh" }))
            .unwrap();

        let c = s.ai_config("ke-chuyen");
        assert_eq!(c.provider, "openrouter");
        assert_eq!(c.model, "deepseek/deepseek-chat");
        assert_eq!(c.nha_chu(), "openrouter");
        assert_eq!(c.nha_anh(), "ve-anh");
        assert_eq!(c.extra, "tối nay kể cổ tích", "ô cũ phải còn");
        assert_eq!(c.every_sec, 45);
    }

    #[test]
    fn cau_hinh_khong_phai_object_bi_tu_choi() {
        let d = tempfile::tempdir().unwrap();
        dung(d.path(), "ke-chuyen");
        let s = state(d.path());
        assert!(matches!(
            s.set_config("ke-chuyen", "gift-thanks", json!(5)),
            Err(AppError::BadRequest(_))
        ));
    }

    #[test]
    fn moi_thiet_ke_giu_cau_hinh_rieng() {
        let d = tempfile::tempdir().unwrap();
        dung(d.path(), "ke-chuyen");
        dung(d.path(), "hip-hop");
        let s = state(d.path());
        s.set_config("ke-chuyen", "music", json!({ "vol": 20 }))
            .unwrap();
        s.set_config("hip-hop", "music", json!({ "vol": 90 }))
            .unwrap();
        assert_eq!(
            s.module_state("ke-chuyen", "music").unwrap().config["vol"],
            json!(20)
        );
        assert_eq!(
            s.module_state("hip-hop", "music").unwrap().config["vol"],
            json!(90)
        );
    }

    #[tokio::test]
    async fn doi_cau_hinh_cua_thiet_ke_dang_phat_thi_phat_xuong_ngay() {
        let d = tempfile::tempdir().unwrap();
        dung(d.path(), "ke-chuyen");
        let s = state(d.path());
        s.go_live("ke-chuyen").unwrap();
        let mut rx = s.subscribe();

        s.set_config("ke-chuyen", "gift-thanks", json!({ "minCoins": 7 }))
            .unwrap();

        let msg = rx.recv().await.unwrap();
        assert_eq!(msg["t"], json!("config"));
        assert_eq!(msg["moduleId"], json!("gift-thanks"));
        assert_eq!(msg["config"]["minCoins"], json!(7));
    }

    #[tokio::test]
    async fn doi_cau_hinh_thiet_ke_khong_phat_thi_khong_lam_phien() {
        let d = tempfile::tempdir().unwrap();
        dung(d.path(), "ke-chuyen");
        dung(d.path(), "hip-hop");
        let s = state(d.path());
        s.go_live("ke-chuyen").unwrap();
        let mut rx = s.subscribe();

        s.set_config("hip-hop", "music", json!({ "vol": 10 }))
            .unwrap();

        // Vẫn phát, để mọi cửa sổ xem thử của hip-hop cùng đổi; nhưng gắn
        // `designId` nên phòng đang phát và trang quản lý bỏ qua.
        let tin = rx.try_recv().expect("cửa sổ xem thử của hip-hop phải nhận");
        assert_eq!(tin["designId"], json!("hip-hop"));
    }
}
