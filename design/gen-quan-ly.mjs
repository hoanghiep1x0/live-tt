// Sinh design/quan-ly.html: mock data viết thẳng vào HTML, tab/modal/công tắc chạy bằng CSS (không cần JS).
import { writeFileSync } from "node:fs";

const OUT = process.argv[2];
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const ic = id => `<svg class="i"><use href="#i-${id}"/></svg>`;

const designs = [
  { id: "kechuyen", name: "Phòng kể chuyện", status: "ok", art: "📖", desc: "AI MC đọc truyện bằng giọng API, khán giả ngồi ghế hình quạt, top người tặng." },
  { id: "hiphop", name: "Sàn nhảy hip hop", status: "off", art: "🕺", desc: "Nhân vật chibi nhảy theo nhạc, quà lớn đổi điệu nhảy." },
  { id: "game3d", name: "Game 3D phiêu lưu", status: "warn", art: "🗺️", desc: "Khán giả bình luận để điều khiển nhân vật, quà mở màn chơi mới." },
  { id: "bar", name: "Quán bar đêm", status: "off", art: "🍸", desc: "Quầy bar ấm cúng, mỗi người vào được mời một ly, nhạc lofi nền." },
  { id: "vusua", name: "Sự tích cây vú sữa", status: "off", art: "🌳", desc: "Video kể chuyện dựng sẵn 720×1280, phát vòng lặp cho phòng mẫu." },
  { id: "doquiz", name: "Đố vui có thưởng", status: "off", art: "💡", desc: "Câu hỏi hiện trên màn, ai trả lời đúng đầu tiên được lên bảng vàng." },
  { id: "camping", name: "Lửa trại đêm sao", status: "off", art: "🔥", desc: "Ngồi quanh đống lửa, quà thêm củi, bình luận hiện thành đom đóm." },
  { id: "karaoke", name: "Karaoke yêu cầu", status: "off", art: "🎤", desc: "Khán giả gửi tên bài qua bình luận, quà đẩy bài lên đầu hàng chờ." },
];

const mods = [
  { id: "thanks", icon: "🎁", name: "Cảm ơn quà", sub: "Đọc tên & tạo hiệu ứng khi có quà", on: true,
    fields: [
      { k: "minCoins", label: "Quà tối thiểu (xu)", q: "Từ (xu)", type: "number", v: 1 },
      { k: "template", label: "Câu cảm ơn", type: "textarea", v: "Cảm ơn {ten} đã tặng {qua}!", hint: "Dùng {ten}, {qua}, {soluong}" },
      { k: "combo", label: "Gộp combo quà", q: "Combo", type: "toggle", v: true, hint: "Gom quà liên tiếp thành một lời cảm ơn" },
    ], quick: ["minCoins", "combo"] },
  { id: "greet", icon: "👋", name: "Chào mừng vào phòng", sub: "Gọi tên & chào khi có người vào phòng", on: true,
    fields: [
      { k: "template", label: "Câu chào", q: "Câu chào", type: "text", v: "Chào {ten} ghé phòng nha!", hint: "Dùng {ten} cho tên người vào" },
      { k: "gap", label: "Giãn cách tối thiểu (giây)", q: "Giãn (s)", type: "number", v: 12 },
      { k: "voice", label: "Đọc to lời chào", q: "Đọc to", type: "toggle", v: true },
      { k: "skipDefault", label: "Bỏ qua tên mặc định", type: "toggle", v: true, hint: "Không gọi tên kiểu \"user123…\"" },
    ], quick: ["gap", "voice"] },
  { id: "bot", icon: "🧑‍🤝‍🧑", name: "Bot trực phòng", sub: "Nhân vật ảo ra vào, thả tim, chào & cảm ơn người thật", on: true,
    fields: [
      { k: "count", label: "Số nhân vật ảo", q: "Số bot", type: "number", v: 12 },
      { k: "pace", label: "Nhịp hoạt động", q: "Nhịp", type: "select", v: "Vừa", opts: ["Chậm", "Vừa", "Nhanh"] },
      { k: "react", label: "Đáp lại người xem thật", q: "Đáp lại", type: "toggle", v: true, hint: "Chào người mới, cảm ơn quà theo tên" },
      { k: "perUser", label: "Mỗi người được đáp tối đa một lần mỗi (giây)", type: "number", v: 45 },
      { k: "names", label: "Tên nhân vật ảo", type: "textarea", v: "", hint: "Mỗi dòng một tên, để trống dùng tên mẫu" },
    ], quick: ["count", "pace", "react"] },
  { id: "tts", icon: "🎙️", name: "AI MC giọng đọc", sub: "Đọc bình luận & dẫn chuyện bằng giọng chọn sẵn", on: true,
    fields: [
      { k: "voice", label: "Giọng đang dùng", q: "Giọng", type: "select", v: "Nữ miền Bắc", opts: ["Nữ miền Bắc", "Nam miền Bắc", "Nữ miền Nam", "MC Hằng"] },
      { k: "speed", label: "Tốc độ (%)", q: "Tốc độ", type: "range", v: 100, min: 70, max: 140 },
      { k: "library", label: "Thư viện giọng", type: "voices", list: [
        { name: "Nữ miền Bắc", kind: "Có sẵn" },
        { name: "Nam miền Bắc", kind: "Có sẵn" },
        { name: "Nữ miền Nam", kind: "Có sẵn" },
        { name: "MC Hằng", kind: "Từ file mẫu", file: "mc-hang-30s.wav" },
      ] },
      { k: "readComments", label: "Đọc to bình luận", type: "toggle", v: true },
      { k: "maxDelay", label: "Bỏ câu dồn quá (giây)", type: "number", v: 15 },
    ], quick: ["voice", "speed"] },
  { id: "top", icon: "🏆", name: "Top người tặng", sub: "Bảng xếp hạng trong phiên", on: true,
    fields: [
      { k: "size", label: "Số người hiển thị", type: "number", v: 5 },
      { k: "reset", label: "Làm mới", type: "select", v: "Mỗi phiên", opts: ["Mỗi phiên", "Mỗi ngày", "Không bao giờ"] },
    ] },
  { id: "chibi", icon: "🧸", name: "Nhân vật chibi", sub: "Người xem thành chibi trên sân khấu", on: false,
    fields: [
      { k: "max", label: "Số nhân vật tối đa", q: "Số NV", type: "number", v: 20 },
      { k: "chat", label: "Hiện bong bóng chat", q: "Chat", type: "toggle", v: true },
      { k: "sound", label: "Âm thanh nhân vật", q: "Âm thanh", type: "toggle", v: false },
      { k: "avatar", label: "Dùng ảnh đại diện", type: "toggle", v: true },
    ], quick: ["max", "chat", "sound"] },
  { id: "likes", icon: "❤️", name: "Bộ đếm tim", sub: "Thanh tiến độ lượt thả tim", on: false,
    fields: [ { k: "goal", label: "Mục tiêu", type: "number", v: 10000 } ] },
  { id: "goal", icon: "🎯", name: "Mục tiêu quà", sub: "Thanh mục tiêu xu trong phiên", on: false,
    fields: [ { k: "goal", label: "Mục tiêu (xu)", type: "number", v: 5000 }, { k: "label", label: "Nhãn", type: "text", v: "Mở chương mới" } ] },
  { id: "music", icon: "🎵", name: "Nhạc nền", sub: "Danh sách phát nền tự động", on: false,
    fields: [ { k: "vol", label: "Âm lượng", q: "Vol", type: "range", v: 35, min: 0, max: 100 }, { k: "duck", label: "Hạ nhạc khi MC nói", q: "Hạ khi MC", type: "toggle", v: true } ],
    quick: ["vol", "duck"] },
  { id: "fx", icon: "🎆", name: "Pháo hoa", sub: "Hiệu ứng khi quà lớn", on: false,
    fields: [ { k: "min", label: "Kích hoạt từ (xu)", type: "number", v: 99 } ] },
  { id: "filter", icon: "🛡️", name: "Lọc từ cấm", sub: "Ẩn bình luận chứa từ cấm", on: true,
    fields: [ { k: "words", label: "Danh sách từ", type: "textarea", v: "spam, quảng cáo", hint: "Ngăn cách bằng dấu phẩy" } ] },
  { id: "approve", icon: "📝", name: "Duyệt tin nhắn", sub: "Duyệt bình luận trước khi đăng lên màn", on: true,
    fields: [
      { k: "auto", label: "Tự đăng tin không chứa từ cấm", q: "Tự duyệt", type: "toggle", v: false },
      { k: "hold", label: "Giữ trong hàng chờ tối đa (giây)", q: "Giữ (s)", type: "number", v: 30 },
      { k: "show", label: "Kiểu hiện trên màn", type: "select", v: "Bong bóng", opts: ["Bong bóng", "Thanh chữ chạy", "Thẻ ghim"] },
    ], quick: ["auto", "hold"] },
  { id: "autopilot", icon: "🤖", name: "Tự vận hành", sub: "Tự chuyển cảnh & tự nói khi phòng vắng", on: false,
    fields: [
      { k: "level", label: "Mức chủ động", q: "Mức", type: "select", v: "Vừa", opts: ["Nhẹ", "Vừa", "Mạnh"] },
      { k: "idle", label: "Coi là vắng sau (giây)", q: "Vắng (s)", type: "number", v: 45 },
      { k: "scene", label: "Tự chuyển cảnh", type: "toggle", v: true },
    ], quick: ["level", "idle"] },
  { id: "schedule", icon: "⏰", name: "Lịch phát", sub: "Hẹn giờ bật / tắt live theo khung giờ", on: false,
    fields: [
      { k: "start", label: "Giờ bắt đầu", q: "Bắt đầu", type: "time", v: "20:00" },
      { k: "end", label: "Giờ kết thúc", q: "Kết thúc", type: "time", v: "23:30" },
      { k: "days", label: "Ngày trong tuần", type: "select", v: "Mỗi ngày", opts: ["Mỗi ngày", "Thứ 2 – Thứ 6", "Cuối tuần"] },
    ], quick: ["start", "end"] },
  { id: "sfx", icon: "🔔", name: "Hiệu ứng âm thanh", sub: "Vỗ tay, chuông khi có quà hoặc theo dõi", on: true,
    fields: [
      { k: "vol", label: "Âm lượng", q: "Vol", type: "range", v: 60, min: 0, max: 100 },
      { k: "gift", label: "Phát khi có quà", q: "Khi có quà", type: "toggle", v: true },
      { k: "follow", label: "Phát khi có người theo dõi", type: "toggle", v: true },
    ], quick: ["vol", "gift"] },
  { id: "poll", icon: "🗳️", name: "Bình chọn", sub: "Khán giả gõ 1/2/3, kết quả hiện trên màn", on: false,
    fields: [
      { k: "options", label: "Số lựa chọn", q: "Lựa chọn", type: "number", v: 3 },
      { k: "time", label: "Thời gian bình chọn (giây)", q: "Thời gian (s)", type: "number", v: 60 },
      { k: "oneVote", label: "Mỗi người một phiếu", type: "toggle", v: true },
    ], quick: ["options", "time"] },
  { id: "announce", icon: "📢", name: "Thông báo ghim", sub: "Dòng chữ ghim hoặc chạy trên màn", on: true,
    fields: [
      { k: "text", label: "Nội dung", q: "Nội dung", type: "text", v: "Thả tim để mở chương mới nha!" },
      { k: "marquee", label: "Chữ chạy", q: "Chạy chữ", type: "toggle", v: true },
    ], quick: ["text", "marquee"] },
  { id: "raffle", icon: "🎰", name: "Quay thưởng", sub: "Bốc ngẫu nhiên một người trong phiên", on: false, action: "Quay",
    fields: [
      { k: "pool", label: "Bốc từ", type: "select", v: "Người bình luận", opts: ["Người bình luận", "Người tặng quà", "Tất cả người vào"] },
      { k: "keyword", label: "Chỉ người gõ từ khoá", type: "text", v: "", hint: "Để trống thì không lọc" },
    ] },
  { id: "quiz", icon: "❓", name: "Đố vui", sub: "Câu hỏi & chấm đáp án qua bình luận", on: false,
    fields: [ { k: "time", label: "Thời gian mỗi câu (giây)", type: "number", v: 20 } ] },
  { id: "follow", icon: "⭐", name: "Cảm ơn theo dõi", sub: "Chào khi có người follow", on: false,
    fields: [ { k: "template", label: "Câu cảm ơn", type: "text", v: "Cảm ơn {ten} đã theo dõi!" } ] },
];

const sites = [
  { group: "Tài khoản", fav: "♪", name: "TikTok", sub: "@kechuyen.dem · đã đăng nhập", ok: true, url: "https://www.tiktok.com/@kechuyen.dem/live" },
  { group: "Tài khoản", fav: "▶", name: "LIVE Studio", sub: "chưa đăng nhập", ok: false, url: "https://livestudio.tiktok.com" },
  { group: "Trang lấy dữ liệu", fav: "●", name: "Phòng live của tôi", sub: "bình luận, quà, lượt xem", ok: true, url: "https://www.tiktok.com/@kechuyen.dem/live" },
  { group: "Trang lấy dữ liệu", fav: "◆", name: "Bảng điều khiển live", sub: "thống kê phiên", ok: false, url: "https://www.tiktok.com/live/dashboard" },
];

/* ---------- Khối HTML ---------- */
const designCard = d => {
  const obs = `http://127.0.0.1:5173/obs/${d.id}`;
  const studio = `https://livestudio.tiktok.com/room/${d.id}`;
  return `
      <article class="card design" data-name="${esc(d.name.toLowerCase())}">
        <div class="design-name">
          <span class="art">${d.art}</span>
          <b title="${esc(d.name)}">${esc(d.name)}</b>
          <label class="badge live-btn" title="Bấm để bật/tắt phát"><input type="checkbox" data-live="${esc(d.name)}" ${d.status === "ok" ? "checked" : ""}><span class="dot"></span><span class="on-text">Đang phát</span><span class="off-text">Tắt Live</span></label>
        </div>
        <div class="field"><input class="input" readonly value="${obs}" aria-label="Link OBS ${esc(d.name)}"><button class="btn btn-sm" type="button" data-copy="${obs}" title="Chép link OBS để dán vào Browser Source">Kết nối OBS</button></div>
        <div class="field"><input class="input" readonly value="${studio}" aria-label="Link TikTok Studio ${esc(d.name)}"><a class="btn btn-sm" href="${studio}" target="_blank" rel="noopener" title="Mở TikTok LIVE Studio">Kết nối Studio</a></div>
        <div class="card-actions"><button class="btn" type="button" data-reset="${esc(d.name)}" title="Xoá dữ liệu phiên của ${esc(d.name)}">${ic("reload")}Reset dữ liệu</button><button class="btn" type="button" data-edit title="Đổi tên ${esc(d.name)}">${ic("edit")}<span>Sửa</span></button></div>
      </article>`;
};

// Một ô chỉnh nhanh trên thẻ (nhãn ngắn + điều khiển nhỏ)
const quickCtl = (m, f) => {
  const sync = `data-sync="${m.id}.${f.k}"`, aria = `aria-label="${esc(f.label)}"`;
  let ctl;
  if (f.type === "toggle") ctl = `<input class="switch switch-sm" type="checkbox" ${sync} ${aria} ${f.v ? "checked" : ""}>`;
  else if (f.type === "range") ctl = `<input type="range" ${sync} ${aria} min="${f.min}" max="${f.max}" value="${f.v}"><output>${f.v}</output>`;
  else if (f.type === "select") ctl = `<select class="input input-xs" ${sync} ${aria}>${f.opts.map(o => `<option${o === f.v ? " selected" : ""}>${esc(o)}</option>`).join("")}</select>`;
  else ctl = `<input class="input input-xs" type="${["number", "time"].includes(f.type) ? f.type : "text"}" ${sync} ${aria} value="${esc(f.v)}">`;
  return `<span class="q q-${f.type}" title="${esc(f.label)}"><span class="q-lbl">${esc(f.q || f.label)}</span>${ctl}</span>`;
};
const quickRow = m => (m.quick || []).map(k => quickCtl(m, m.fields.find(f => f.k === k))).join("");

// Bấm bất kỳ đâu trên thẻ mở modal (label phủ cả thẻ); công tắc và ô chỉnh nhanh nằm trên lớp đó
const modCard = m => `
      <article class="card mod" data-name="${esc(m.name.toLowerCase())}">
        <label class="mod-hit" for="r-mod-${m.id}" title="Bấm để cấu hình ${esc(m.name)}"></label>
        <div class="mod-top">
          <span class="mod-icon">${m.icon}</span>
          <div class="mod-text"><b>${esc(m.name)}</b><span>${esc(m.sub)}</span></div>
          ${m.action ? `<button class="btn mod-act" type="button" data-act="${esc(m.name)}">${m.action}</button>` : ""}
          <input class="switch" type="checkbox" ${m.on ? "checked" : ""} data-on="${m.id}" data-card aria-label="Bật ${esc(m.name)}">
        </div>
${m.quick ? `        <div class="mod-quick" style="--n:${m.quick.length}">${quickRow(m)}</div>` : ""}
      </article>`;

const field = (m, f, p = "f") => {
  if (f.type === "voices") return voicesField(m, f, p);
  const id = `${p}-${m.id}-${f.k}`, sync = `data-sync="${m.id}.${f.k}"`;
  if (f.type === "toggle") return `
          <label class="form-inline" for="${id}"><span><b>${esc(f.label)}</b>${f.hint ? `<small>${esc(f.hint)}</small>` : ""}</span>
            <input class="switch" type="checkbox" id="${id}" ${sync} ${f.v ? "checked" : ""}></label>`;
  let ctl;
  if (f.type === "select") ctl = `<select class="input" id="${id}" ${sync}>${f.opts.map(o => `<option${o === f.v ? " selected" : ""}>${esc(o)}</option>`).join("")}</select>`;
  else if (f.type === "textarea") ctl = `<textarea class="input" id="${id}" ${sync}>${esc(f.v)}</textarea>`;
  else if (f.type === "range") ctl = `<div class="range"><input type="range" id="${id}" ${sync} min="${f.min}" max="${f.max}" value="${f.v}"><output>${f.v}</output></div>`;
  else ctl = `<input class="input" id="${id}" type="${f.type}" ${sync} value="${esc(f.v)}">`;
  return `
          <div class="form-row"><label for="${id}">${esc(f.label)}</label>${ctl}${f.hint ? `<span class="hint">${esc(f.hint)}</span>` : ""}</div>`;
};

// Thư viện giọng: giọng có sẵn + giọng tạo từ file mẫu
const voicesField = (m, f, p) => `
          <div class="form-row"><span class="lbl">${esc(f.label)}</span>
            <div class="voice-list">${f.list.map(v => `
              <div class="voice-row"><span class="v-ico">${v.file ? "🎧" : "🔈"}</span>
                <span class="v-name"><b>${esc(v.name)}</b>${v.file ? `<small>${esc(v.file)}</small>` : ""}</span>
                <span class="v-tag${v.file ? " v-clone" : ""}">${v.kind}</span>
                <button class="btn btn-icon" type="button" data-play="${esc(v.name)}" title="Nghe thử">▶</button>
                ${v.file ? `<button class="btn btn-icon" type="button" data-del-voice="${esc(v.name)}" title="Xoá giọng">${ic("x")}</button>` : `<span class="btn-icon-gap"></span>`}
              </div>`).join("")}
            </div>
            <div class="voice-add">
              <input class="input" placeholder="Tên giọng mới, vd: MC Tuấn" aria-label="Tên giọng mới">
              <label class="btn"><input type="file" accept="audio/*" class="sr" data-voice-file>${ic("upload")}Chọn file mẫu</label>
              <button class="btn btn-gold" type="button" data-add-voice>Thêm giọng</button>
            </div>
            <span class="hint">File mẫu 10–30 giây, một người nói rõ, không nhạc nền (.wav hoặc .mp3). Giọng mới sẽ có trong danh sách "Giọng".</span></div>`;

// Modal chung: cấu hình nhanh nhiều module trong một chỗ
const quickModal = () => `
<div class="overlay" id="m-quick">
  <label class="backdrop" for="r-none" aria-label="Đóng"></label>
  <div class="modal modal-md" role="dialog" aria-modal="true" aria-labelledby="mq-title">
    <div class="modal-head">
      <span class="brand-mark">${ic("sliders")}</span>
      <div class="grow"><h2 id="mq-title">Cấu hình nhanh</h2><p>Chỉnh nhiều module trong một chỗ. Thay đổi khớp ngay với thẻ và modal riêng của từng module.</p></div>
      <label class="btn btn-icon btn-ghost" for="r-none" aria-label="Đóng">${ic("x")}</label>
    </div>
    <div class="modal-body">
      <div class="quick-grid">${mods.map(m => `
        <section class="quick-sec">
          <div class="quick-head"><span class="mod-icon">${m.icon}</span><b>${esc(m.name)}</b>
            <input class="switch" type="checkbox" data-on="${m.id}" ${m.on ? "checked" : ""} aria-label="Bật ${esc(m.name)}"></div>
          <div class="form">${m.fields.map(fl => field(m, fl, "q")).join("")}
          </div>
        </section>`).join("")}
      </div>
    </div>
    <div class="modal-foot">
      <label class="btn" for="r-none">Đóng</label>
      <label class="btn btn-gold" for="r-none" data-save="cấu hình nhanh">Lưu tất cả</label>
    </div>
  </div>
</div>`;

const modModal = m => `
<div class="overlay" id="mod-${m.id}">
  <label class="backdrop" for="r-none" aria-label="Đóng"></label>
  <div class="modal modal-sm" role="dialog" aria-modal="true" aria-labelledby="mt-${m.id}">
    <div class="modal-head">
      <span class="mod-icon">${m.icon}</span>
      <div class="grow"><h2 id="mt-${m.id}">${esc(m.name)}</h2><p>${esc(m.sub)}</p></div>
      <label class="btn btn-icon btn-ghost" for="r-none" aria-label="Đóng">${ic("x")}</label>
    </div>
    <div class="modal-body">
      <div class="form">
          <label class="form-inline hl" for="on-${m.id}"><span><b>Bật module</b><small>Tắt thì thiết kế vẫn chạy bình thường, chỉ thiếu tính năng này</small></span>
            <input class="switch" type="checkbox" id="on-${m.id}" data-on="${m.id}" ${m.on ? "checked" : ""}></label>${m.fields.map(f => field(m, f)).join("")}
      </div>
    </div>
    <div class="modal-foot">
      <label class="btn" for="r-none">Huỷ</label>
      <label class="btn btn-gold" for="r-none" data-save="${esc(m.name)}">Lưu và áp dụng</label>
    </div>
  </div>
</div>`;

const siteGroups = [...new Set(sites.map(s => s.group))].map(g => `
        <div>
          <div class="side-title">${g}</div>${sites.filter(s => s.group === g).map(s => `
          <label class="site" title="${esc(s.sub)}"><input type="radio" name="site" data-url="${s.url}" ${s === sites[0] ? "checked" : ""}>
            <span class="fav">${s.fav}</span><span class="meta">${esc(s.name)}</span><span class="dot ${s.ok ? "ok" : ""}"></span></label>`).join("")}
        </div>`).join("");

const MODALS = ["m-browser", "m-quick", ...mods.map(m => "mod-" + m.id)];
const OPEN = MODALS.map(id => `#r-${id}:checked ~ #${id}`).join(", ");
const OPEN_MODAL = MODALS.map(id => `#r-${id}:checked ~ #${id} .modal`).join(", ");

const liveName = (designs.find(d => d.status === "ok") || {}).name || "Chưa có thiết kế đang phát";

const onCount = mods.filter(m => m.on).length;

const html = `<!doctype html>
<html lang="vi">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Quản lý thiết kế</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700&display=swap">
<style>
  :root {
    --bg: #f3efe6; --bg-glow1: rgba(201,160,82,.22); --bg-glow2: rgba(120,98,180,.10);
    --card-top: #ffffff; --card-bot: #f7f3ea; --fg: #1c1814; --muted: #7a7062;
    --line: rgba(60,45,20,.12); --ctl: rgba(60,45,20,.32); --hi: rgba(255,255,255,.9); --input-bg: #fbf8f2;
    --shadow: 0 1px 0 rgba(60,45,20,.06), 0 2px 4px rgba(60,45,20,.06), 0 12px 28px -12px rgba(60,45,20,.28);
    --shadow-up: 0 1px 0 rgba(60,45,20,.06), 0 6px 10px rgba(60,45,20,.08), 0 24px 44px -16px rgba(60,45,20,.38);
    --gold1: #e9c77e; --gold2: #b6873a; --gold-fg: #2a1d08; --gold-text: #8f6620;
    --ok: #2f9e5b; --warn: #d08a1b; --off: #b5ab9b;
    --overlay: rgba(28,22,14,.45); --radius: 14px; --tile-top: #fffaf0; --tile-bot: #efe6d4;
  }
  @media (prefers-color-scheme: dark) {
    :root:not([data-theme="light"]) {
      --bg: #0b0a0e; --bg-glow1: rgba(201,160,82,.14); --bg-glow2: rgba(110,90,200,.12);
      --card-top: #1d1b22; --card-bot: #141318; --fg: #f4efe6; --muted: #9b958a;
      --line: rgba(255,255,255,.07); --ctl: rgba(255,255,255,.18); --hi: rgba(255,255,255,.07); --input-bg: #0f0e12;
      --shadow: 0 1px 0 rgba(0,0,0,.6), 0 2px 4px rgba(0,0,0,.4), 0 14px 30px -12px rgba(0,0,0,.85);
      --shadow-up: 0 1px 0 rgba(0,0,0,.6), 0 8px 14px rgba(0,0,0,.45), 0 30px 50px -16px rgba(0,0,0,.95);
      --gold-text: #e3c27f; --off: #5d5850; --overlay: rgba(0,0,0,.65); --tile-top: #2a2730; --tile-bot: #19171d;
    }
  }
  :root[data-theme="dark"] {
    --bg: #0b0a0e; --bg-glow1: rgba(201,160,82,.14); --bg-glow2: rgba(110,90,200,.12);
    --card-top: #1d1b22; --card-bot: #141318; --fg: #f4efe6; --muted: #9b958a;
    --line: rgba(255,255,255,.07); --ctl: rgba(255,255,255,.18); --hi: rgba(255,255,255,.07); --input-bg: #0f0e12;
    --shadow: 0 1px 0 rgba(0,0,0,.6), 0 2px 4px rgba(0,0,0,.4), 0 14px 30px -12px rgba(0,0,0,.85);
    --shadow-up: 0 1px 0 rgba(0,0,0,.6), 0 8px 14px rgba(0,0,0,.45), 0 30px 50px -16px rgba(0,0,0,.95);
    --gold-text: #e3c27f; --off: #5d5850; --overlay: rgba(0,0,0,.65); --tile-top: #2a2730; --tile-bot: #19171d;
  }
  * { box-sizing: border-box; }
  html { scroll-behavior: auto; }
  body { margin: 0; min-height: 100vh; color: var(--fg);
    background: radial-gradient(900px 500px at 12% -10%, var(--bg-glow1), transparent 60%),
                radial-gradient(800px 600px at 100% 0%, var(--bg-glow2), transparent 60%), var(--bg);
    background-attachment: fixed;
    font: 14px/1.5 "Be Vietnam Pro", ui-sans-serif, system-ui, "Segoe UI", sans-serif; -webkit-font-smoothing: antialiased; }
  button, input, select, textarea { font: inherit; color: inherit; }
  a { color: inherit; text-decoration: none; }
  svg.i { width: 15px; height: 15px; stroke: currentColor; fill: none; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; flex: none; }
  .sr { position: fixed; top: 0; left: 0; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }

  /* Bề mặt nổi dùng chung */
  .raised { background: linear-gradient(180deg, var(--card-top), var(--card-bot)); border: 1px solid var(--line);
    box-shadow: inset 0 1px 0 var(--hi), var(--shadow); }

  /* ---- Thanh trên ---- */
  .topbar { position: sticky; top: 0; z-index: 10; backdrop-filter: blur(14px) saturate(140%);
    background: color-mix(in srgb, var(--card-bot) 72%, transparent); border-bottom: 1px solid var(--line);
    box-shadow: 0 10px 30px -20px rgba(0,0,0,.5); }
  .topbar-in { max-width: 1320px; margin: 0 auto; padding: 0 16px; height: 64px; display: flex; align-items: center; gap: 18px; }
  .brand { font-weight: 700; display: flex; align-items: center; gap: 10px; white-space: nowrap; letter-spacing: .01em; }
  .brand-mark { width: 30px; height: 30px; border-radius: 9px; display: grid; place-items: center; font-size: 14px; color: var(--gold-fg);
    background: linear-gradient(145deg, var(--gold1), var(--gold2));
    box-shadow: inset 0 1px 0 rgba(255,255,255,.55), inset 0 -2px 0 rgba(0,0,0,.18), 0 6px 14px -4px rgba(182,135,58,.6); }
  .brand small { display: block; font-weight: 500; font-size: 11px; color: var(--muted); letter-spacing: .08em; text-transform: uppercase; }
  .tabs { display: flex; gap: 4px; padding: 4px; border-radius: 12px; background: var(--input-bg);
    box-shadow: inset 0 2px 4px rgba(0,0,0,.18), inset 0 0 0 1px var(--line); }
  .tab { border: 0; background: transparent; padding: 7px 14px; border-radius: 9px; cursor: pointer; color: var(--muted);
    font-weight: 600; font-size: 13px; display: flex; align-items: center; gap: 7px; white-space: nowrap; transition: color .15s, background .15s; }
  .tab:hover { color: var(--fg); }
  .tab .count { font-size: 11px; padding: 0 7px; border-radius: 99px; background: var(--line); }
  .spacer { flex: 1; }
  .conn { display: flex; align-items: center; gap: 8px; color: var(--muted); font-size: 13px; white-space: nowrap; padding: 6px 12px; border-radius: 99px; }
  .conn b { color: var(--fg); font-weight: 600; }

  /* Tab chạy bằng radio */
  #t-designs:checked ~ .topbar label[for="t-designs"],
  #t-mods:checked ~ .topbar label[for="t-mods"] { color: var(--fg); background: linear-gradient(180deg, var(--card-top), var(--card-bot));
    box-shadow: inset 0 1px 0 var(--hi), 0 1px 2px rgba(0,0,0,.25), 0 4px 10px -4px rgba(0,0,0,.35); }
  #t-designs:checked ~ .topbar label[for="t-designs"] svg, #t-mods:checked ~ .topbar label[for="t-mods"] svg { color: var(--gold-text); }
  #t-designs:checked ~ main #tab-mods, #t-mods:checked ~ main #tab-designs { display: none; }
  #t-designs:focus-visible ~ .topbar label[for="t-designs"], #t-mods:focus-visible ~ .topbar label[for="t-mods"] { outline: 2px solid var(--gold2); outline-offset: 1px; }

  /* ---- Nút, ô nhập ---- */
  .btn { height: 34px; padding: 0 14px; border-radius: 2px; cursor: pointer; display: inline-flex; align-items: center; gap: 7px;
    font-weight: 600; font-size: 13px; white-space: nowrap; color: var(--fg);
    background: linear-gradient(180deg, var(--card-top), var(--card-bot)); border: 1px solid var(--ctl);
    box-shadow: inset 0 1px 0 var(--hi), 0 1px 2px rgba(0,0,0,.18), 0 3px 8px -3px rgba(0,0,0,.3); transition: transform .12s, box-shadow .12s; }
  .btn:hover { transform: translateY(-1px); box-shadow: inset 0 1px 0 var(--hi), 0 2px 3px rgba(0,0,0,.2), 0 8px 16px -6px rgba(0,0,0,.4); }
  .btn:active { transform: translateY(1px); box-shadow: inset 0 2px 4px rgba(0,0,0,.25); }
  .btn-icon { width: 34px; padding: 0; justify-content: center; flex: none; }
  .btn-ghost { background: transparent; border-color: transparent; box-shadow: none; }
  .btn-ghost:hover { background: var(--line); box-shadow: none; }
  .btn-gold { color: var(--gold-fg); border-color: rgba(120,80,20,.5); background: linear-gradient(180deg, var(--gold1), var(--gold2));
    box-shadow: inset 0 1px 0 rgba(255,255,255,.55), inset 0 -2px 0 rgba(0,0,0,.15), 0 6px 16px -6px rgba(182,135,58,.75); }
  .input { height: 34px; width: 100%; min-width: 0; padding: 0 11px; border-radius: 2px; border: 1px solid var(--ctl);
    background: var(--input-bg); box-shadow: inset 0 2px 3px rgba(0,0,0,.12); font-size: 13px; outline: none; }
  .input:focus { border-color: var(--gold2); box-shadow: inset 0 2px 3px rgba(0,0,0,.12), 0 0 0 3px color-mix(in srgb, var(--gold1) 30%, transparent); }
  .input[readonly] { color: var(--muted); font-family: ui-monospace, Consolas, monospace; font-size: 12px; }
  .btn:focus-visible, .mod-icon:focus-visible, .switch:focus-visible, .chip:has(input:focus-visible) { outline: 2px solid var(--gold2); outline-offset: 2px; }

  /* ---- Khung trang ---- */
  main { max-width: 1320px; margin: 0 auto; padding: 28px 16px 64px; }
  .page-head { display: flex; align-items: flex-end; gap: 14px; margin-bottom: 22px; flex-wrap: wrap; }
  .eyebrow { font-size: 11px; font-weight: 600; letter-spacing: .14em; text-transform: uppercase; color: var(--gold-text); }
  .page-head h1 { font-size: 26px; margin: 2px 0 4px; font-weight: 700; letter-spacing: -.01em; }
  .page-head p { margin: 0; color: var(--muted); font-size: 13.5px; max-width: 620px; }
  .page-head .tools { margin-left: auto; display: flex; gap: 8px; }
  .page-head .tools .input { width: 240px; }

  /* ---- Thẻ ---- */
  .card { border-radius: var(--radius); background: linear-gradient(180deg, var(--card-top), var(--card-bot));
    border: 1px solid var(--line); box-shadow: inset 0 1px 0 var(--hi), var(--shadow); position: relative;
    transition: transform .25s cubic-bezier(.2,.8,.2,1), box-shadow .25s; transform: perspective(900px) translateZ(0); }
  .card::before { content: ""; position: absolute; inset: 0; border-radius: inherit; pointer-events: none; padding: 1px;
    background: linear-gradient(160deg, color-mix(in srgb, var(--gold1) 55%, transparent), transparent 35%, transparent 70%, color-mix(in srgb, var(--gold2) 30%, transparent));
    -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0); -webkit-mask-composite: xor; mask-composite: exclude; opacity: .55; transition: opacity .25s; }
  .card:hover { transform: perspective(900px) translateY(-4px) rotateX(2deg); box-shadow: inset 0 1px 0 var(--hi), var(--shadow-up); }
  .card:hover::before { opacity: 1; }

  .grid-designs { display: grid; gap: 18px; grid-template-columns: repeat(4, minmax(0, 1fr)); }
  .grid-mods { display: grid; gap: 14px; grid-template-columns: repeat(4, minmax(0, 1fr)); }
  @media (max-width: 1200px) { .grid-designs, .grid-mods { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
  @media (max-width: 880px)  { .grid-designs, .grid-mods { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
  @media (max-width: 560px)  { .grid-designs, .grid-mods { grid-template-columns: 1fr; } }

  .design { padding: 16px; display: flex; flex-direction: column; gap: 11px; }
  .design-name { display: flex; align-items: center; gap: 10px; min-width: 0; }
  .design-name b { font-weight: 700; font-size: 15px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 1; }
  .art { width: 34px; height: 34px; border-radius: 10px; display: grid; place-items: center; font-size: 17px; flex: none;
    background: linear-gradient(145deg, var(--tile-top), var(--tile-bot)); border: 1px solid var(--line);
    box-shadow: inset 0 1px 0 var(--hi), inset 0 -2px 3px rgba(0,0,0,.15), 0 4px 10px -4px rgba(0,0,0,.45); }
  .badge { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 99px;
    color: var(--muted); background: var(--input-bg); box-shadow: inset 0 1px 2px rgba(0,0,0,.15); white-space: nowrap; }
  /* Nút bật phát: thẻ đang phát đổi viền, nền và bóng; thẻ khác giữ nguyên */
  .live-btn { cursor: pointer; padding: 3px 10px; color: #fff; border: 1px solid rgba(0,0,0,.2);
    background: linear-gradient(180deg, #9a9081, #6f665a);
    box-shadow: inset 0 1px 0 rgba(255,255,255,.3), 0 2px 6px -2px rgba(0,0,0,.45);
    transition: background .2s, box-shadow .2s, transform .12s; }
  .live-btn .dot { background: rgba(255,255,255,.75); }
  .live-btn:hover { transform: translateY(-1px); }
  .live-btn:active { transform: translateY(1px); }
  .live-btn input { position: absolute; opacity: 0; pointer-events: none; }
  .live-btn .on-text { display: none; }
  .live-btn:has(input:checked) .on-text { display: inline; }
  .live-btn:has(input:checked) .off-text { display: none; }
  .live-btn:has(input:checked) { color: #fff; border-color: rgba(0,0,0,.2); background: linear-gradient(180deg, #3fbf72, #23894b);
    box-shadow: inset 0 1px 0 rgba(255,255,255,.35), 0 3px 10px -2px rgba(47,158,91,.7); }
  .live-btn:has(input:checked) .dot { background: #fff; animation: pulse 1.4s ease-in-out infinite; }
  .live-btn:has(input:focus-visible) { outline: 2px solid var(--gold2); outline-offset: 2px; }
  @keyframes pulse { 50% { box-shadow: 0 0 0 4px rgba(255,255,255,.35); } }
  .design:has(.live-btn input:checked) {
    border-color: color-mix(in srgb, var(--ok) 70%, transparent);
    background: linear-gradient(180deg, color-mix(in srgb, var(--ok) 14%, var(--card-top)), color-mix(in srgb, var(--ok) 6%, var(--card-bot)));
    box-shadow: inset 0 1px 0 var(--hi), 0 0 0 1px color-mix(in srgb, var(--ok) 35%, transparent),
                0 14px 34px -12px color-mix(in srgb, var(--ok) 65%, transparent), 0 0 28px -6px color-mix(in srgb, var(--ok) 40%, transparent); }
  .design:has(.live-btn input:checked)::before { opacity: 0; }
  /* Đang có phòng phát: nút các phòng khác bị khoá */
  .grid-designs:has(.live-btn input:checked) .live-btn:not(:has(input:checked)) { opacity: .45; cursor: not-allowed; }
  html:not(.js) .grid-designs:has(.live-btn input:checked) .live-btn:not(:has(input:checked)) { pointer-events: none; }
  .dot { width: 7px; height: 7px; border-radius: 50%; background: var(--off); flex: none; }
  .dot.ok { background: var(--ok); box-shadow: 0 0 0 3px color-mix(in srgb, var(--ok) 22%, transparent), 0 0 8px var(--ok); }
  .dot.warn { background: var(--warn); box-shadow: 0 0 0 3px color-mix(in srgb, var(--warn) 22%, transparent); }
  .field { display: flex; gap: 6px; align-items: center; }
  .btn-sm { flex: none; width: 108px; justify-content: center; padding: 0 8px; font-size: 12px; }
  .card-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; padding-top: 11px; margin-top: 2px; border-top: 1px solid var(--line); }
  .card-actions .btn { justify-content: center; font-size: 12px; }
  .name-edit { height: 30px; flex: 1; min-width: 0; font-weight: 700; font-size: 14px; }
  .card-actions .btn.saving { color: #fff; border-color: rgba(10,70,35,.6); background: linear-gradient(180deg, #3fbf72, #23894b); }
  .desc-row { margin-top: 2px; padding-top: 11px; border-top: 1px solid var(--line); }
  .desc { flex: 1; min-width: 0; margin: 0; color: var(--muted); font-size: 12.5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

  .mod { min-height: 106px; padding: 12px 14px 12px 12px; display: flex; flex-direction: column; justify-content: center; gap: 10px; cursor: pointer; }
  .grid-compact .mod { min-height: 0; height: 68px; padding: 0 14px 0 12px; }
  .group-title { margin: 6px 0 12px; font-size: 11px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; color: var(--gold-text);
    display: flex; align-items: center; gap: 8px; }
  .group-title span { font-size: 11px; color: var(--muted); padding: 0 7px; border-radius: 99px; background: var(--line); letter-spacing: 0; }
  .grid-mods + .group-title { margin-top: 26px; }
  .mod-hit { position: absolute; inset: 0; z-index: 1; border-radius: inherit; cursor: pointer; }
  .mod-top { display: flex; align-items: center; gap: 12px; }
  .mod-top .switch, .mod-quick .q { position: relative; z-index: 2; }
  .mod-quick { display: grid; grid-template-columns: repeat(var(--n), auto); justify-content: space-between; align-items: center; min-height: 30px; padding-top: 10px; border-top: 1px solid var(--line); }
  .q { display: flex; align-items: center; justify-content: space-between; gap: 8px; min-width: 0; cursor: default; padding: 0 12px; }
  .q:first-child { padding-left: 0; } .q:last-child { padding-right: 0; }
  .q + .q { border-left: 1px solid var(--line); }
  .q-lbl { font-size: 11.5px; font-weight: 600; color: var(--muted); white-space: nowrap; }
  .q input[type=range] { flex: 1; min-width: 50px; accent-color: var(--ok); cursor: pointer; }
  .q output { min-width: 30px; text-align: center; font-size: 12px; font-weight: 600; font-variant-numeric: tabular-nums; }
  .input-xs { height: 28px; font-size: 12px; padding: 0 8px; min-width: 0; }
  .q-text .input-xs, .q-select .input-xs { flex: 1; }
  .q-number .input-xs { width: 72px; flex: none; }
  .q-time .input-xs { width: 108px; flex: none; }
  .q-select .input-xs { min-width: 76px; }
  .q-range input[type=range] { width: 76px; flex: none; }
  .q-text .input-xs { width: 150px; }
  .q-text .input-xs, .q-select .input-xs { flex: 1; }
  .mod-act { position: relative; z-index: 2; height: 28px; padding: 0 12px; font-size: 12px; }
  .switch-sm { width: 34px; height: 20px; }
  .switch-sm::after { width: 14px; height: 14px; }
  .switch-sm:checked::after { transform: translateX(14px); }
  .mod-icon { width: 44px; height: 44px; border-radius: 12px; display: grid; place-items: center; cursor: pointer; flex: none; font-size: 20px;
    background: linear-gradient(145deg, var(--tile-top), var(--tile-bot)); border: 1px solid var(--line);
    box-shadow: inset 0 1px 0 var(--hi), inset 0 -2px 3px rgba(0,0,0,.14), 0 1px 2px rgba(0,0,0,.25);
    transition: transform .15s, box-shadow .15s; }
  .mod:hover .mod-top .mod-icon { transform: translateY(-2px) scale(1.04); }
  .mod-text { flex: 1; min-width: 0; }
  .mod-text b { display: block; font-weight: 600; font-size: 13.5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .mod-text span { display: block; font-size: 12px; color: var(--muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .mod:has(.mod-top .switch:checked) { border-color: color-mix(in srgb, var(--ok) 55%, var(--line)); }

  /* Công tắc nổi 3D */
  .switch { appearance: none; -webkit-appearance: none; margin: 0; width: 42px; height: 24px; border-radius: 99px; flex: none; cursor: pointer; position: relative;
    background: var(--input-bg); border: 1px solid var(--line); box-shadow: inset 0 2px 4px rgba(0,0,0,.3); transition: background .2s; }
  .switch::after { content: ""; position: absolute; top: 2px; left: 2px; width: 18px; height: 18px; border-radius: 50%;
    background: linear-gradient(180deg, #ffffff, #d9d4ca); box-shadow: 0 2px 4px rgba(0,0,0,.4), inset 0 -1px 1px rgba(0,0,0,.15);
    transition: transform .2s cubic-bezier(.3,1.4,.5,1); }
  .switch:checked { background: linear-gradient(180deg, #23894b, #3fbf72); border-color: rgba(10,70,35,.6);
    box-shadow: inset 0 2px 4px rgba(0,0,0,.25), 0 0 12px -2px rgba(47,158,91,.65); }
  .switch:checked::after { transform: translateX(18px); }

  /* ---- Modal (mở bằng #id, không cần JS) ---- */
  .overlay { position: fixed; inset: 0; z-index: 50; display: none; place-items: center; padding: 16px; }
  ${OPEN} { display: grid; animation: fade .18s ease-out; }
  ${OPEN_MODAL} { animation: pop .28s cubic-bezier(.2,.9,.25,1.15); }
  .backdrop { position: absolute; inset: 0; background: var(--overlay); backdrop-filter: blur(6px); }
  .modal { position: relative; width: 100%; max-height: calc(100vh - 32px); display: flex; flex-direction: column; border-radius: 18px;
    background: linear-gradient(180deg, var(--card-top), var(--card-bot)); border: 1px solid var(--line);
    box-shadow: inset 0 1px 0 var(--hi), 0 40px 80px -20px rgba(0,0,0,.6), 0 0 0 1px color-mix(in srgb, var(--gold1) 18%, transparent); }
  .modal-sm { max-width: 540px; } .modal-md { max-width: 1180px; height: 90vh; }
  .quick-grid { display: grid; gap: 14px; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); align-items: start; }
  .quick-sec { padding: 14px; border-radius: 12px; background: var(--input-bg); border: 1px solid var(--line); box-shadow: inset 0 1px 3px rgba(0,0,0,.12); }
  .quick-sec:has(.quick-head .switch:checked) { border-color: color-mix(in srgb, var(--ok) 50%, var(--line)); }
  .quick-head { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
  .quick-head b { flex: 1; font-size: 14px; }
  .quick-head .mod-icon { width: 34px; height: 34px; font-size: 16px; border-radius: 9px; }
  .quick-sec .form { gap: 12px; }
  .apply-to { margin-top: 10px; display: inline-flex; align-items: center; gap: 8px; padding: 6px 12px; border-radius: 99px; font-size: 13px;
    background: color-mix(in srgb, var(--ok) 12%, transparent); border: 1px solid color-mix(in srgb, var(--ok) 35%, transparent); }
  .apply-to small { color: var(--muted); font-size: 12px; }
  .live-target { color: var(--ok); font-size: 13px; }
  .voice-list { display: flex; flex-direction: column; border: 1px solid var(--ctl); border-radius: 2px; background: var(--input-bg); }
  .voice-row { display: flex; align-items: center; gap: 10px; padding: 7px 8px 7px 10px; }
  .voice-row + .voice-row { border-top: 1px solid var(--line); }
  .v-ico { width: 22px; text-align: center; }
  .v-name { flex: 1; min-width: 0; font-size: 13px; }
  .v-name b { font-weight: 600; } .v-name small { display: block; font-size: 11px; color: var(--muted); }
  .v-tag { font-size: 11px; font-weight: 600; color: var(--muted); padding: 1px 8px; border-radius: 99px; background: var(--line); white-space: nowrap; }
  .v-tag.v-clone { color: var(--gold-text); background: color-mix(in srgb, var(--gold1) 18%, transparent); }
  .voice-row .btn-icon { width: 28px; height: 28px; font-size: 11px; }
  .btn-icon-gap { width: 28px; flex: none; }
  .voice-add { display: flex; gap: 6px; flex-wrap: wrap; }
  .voice-add .input { flex: 1; min-width: 160px; }
  .quick-sec .form-inline { background: var(--card-bot); } .modal-lg { width: 95vw; max-width: none; height: 95vh; max-height: none; }
  .overlay:has(.modal-lg) { padding: 0; }
  .modal-head { display: flex; align-items: center; gap: 12px; padding: 16px 18px; border-bottom: 1px solid var(--line); }
  .modal-head h2 { margin: 0; font-size: 16px; font-weight: 700; }
  .modal-head p { margin: 0; color: var(--muted); font-size: 12.5px; }
  .grow { flex: 1; min-width: 0; }
  .modal-body { padding: 18px; overflow: auto; flex: 1; }
  .modal-foot { display: flex; justify-content: flex-end; gap: 8px; padding: 14px 18px; border-top: 1px solid var(--line); }
  @keyframes fade { from { opacity: 0; } }
  @keyframes pop { from { opacity: 0; transform: perspective(900px) translateY(14px) rotateX(6deg) scale(.97); } }

  /* Trình duyệt */
  .browser { display: flex; flex-direction: column; flex: 1; min-height: 0; }
  .browser-side { display: flex; align-items: center; gap: 4px; padding: 8px 14px; border-bottom: 1px solid var(--line);
    overflow-x: auto; scrollbar-width: none; flex: none; }
  .browser-side > div { display: flex; align-items: center; gap: 4px; flex: none; }
  .browser-side > div + div { margin-left: 8px; padding-left: 12px; border-left: 1px solid var(--line); }
  .side-title { display: none; }
  .site { position: relative; display: flex; align-items: center; gap: 8px; height: 34px; padding: 0 12px 0 8px; border-radius: 8px;
    cursor: pointer; color: var(--muted); font-size: 13px; font-weight: 600; white-space: nowrap; flex: none; border: 1px solid transparent; }
  .site input { position: absolute; opacity: 0; pointer-events: none; }
  .site:hover { color: var(--fg); background: var(--line); }
  .site:has(input:checked) { color: var(--fg); background: linear-gradient(180deg, var(--card-top), var(--card-bot)); border-color: var(--line);
    box-shadow: inset 0 1px 0 var(--hi), 0 3px 8px -3px rgba(0,0,0,.4); }
  .site:has(input:checked)::after { content: ""; position: absolute; left: 10px; right: 10px; bottom: -1px; height: 2px; border-radius: 2px;
    background: linear-gradient(90deg, var(--gold1), var(--gold2)); }
  .site:has(input:focus-visible) { outline: 2px solid var(--gold2); }
  .fav { width: 20px; height: 20px; border-radius: 5px; display: grid; place-items: center; font-size: 10px; flex: none;
    background: linear-gradient(145deg, var(--tile-top), var(--tile-bot)); border: 1px solid var(--line); box-shadow: inset 0 1px 0 var(--hi); }
  .meta { min-width: 0; }
  .browser-main { flex: 1; display: flex; flex-direction: column; min-width: 0; min-height: 0; }
  .urlbar { display: flex; gap: 6px; padding: 12px 14px; border-bottom: 1px solid var(--line); }
  .viewport { flex: 1; margin: 14px; border-radius: 12px; display: grid; place-items: center; text-align: center; padding: 24px; color: var(--muted);
    background: var(--input-bg); box-shadow: inset 0 3px 10px rgba(0,0,0,.25), inset 0 0 0 1px var(--line); }
  .viewport b { display: block; color: var(--fg); font-size: 15px; margin-bottom: 4px; }
  .viewport .globe { font-size: 34px; margin-bottom: 8px; filter: drop-shadow(0 6px 10px rgba(0,0,0,.35)); }
  .linkrow { display: flex; align-items: center; gap: 10px; padding: 12px 14px; border-top: 1px solid var(--line); flex-wrap: wrap; }
  .linkrow .lbl { font-size: 12.5px; color: var(--muted); display: flex; align-items: center; gap: 6px; }

  /* Chip chọn */
  .chips { display: flex; flex-wrap: wrap; gap: 6px; }
  .chip { display: inline-flex; align-items: center; gap: 6px; height: 28px; padding: 0 12px; border-radius: 99px; font-size: 12px; font-weight: 500; cursor: pointer;
    background: var(--input-bg); border: 1px solid var(--line); box-shadow: inset 0 1px 2px rgba(0,0,0,.15); user-select: none; }
  .chip input { position: absolute; opacity: 0; pointer-events: none; }
  .chip:has(input:checked) { color: var(--gold-fg); border-color: rgba(120,80,20,.5); background: linear-gradient(180deg, var(--gold1), var(--gold2));
    box-shadow: inset 0 1px 0 rgba(255,255,255,.5), 0 3px 8px -3px rgba(182,135,58,.7); }
  .chip:has(input:checked)::before { content: "✓"; font-weight: 700; }

  /* Form cấu hình */
  .form { display: flex; flex-direction: column; gap: 16px; }
  .form-row { display: flex; flex-direction: column; gap: 7px; }
  .form-row > label, .form-row > .lbl { font-size: 13px; font-weight: 600; }
  .hint { font-size: 12px; color: var(--muted); }
  .form-inline { display: flex; align-items: center; justify-content: space-between; gap: 14px; padding: 12px 14px; border-radius: 12px; cursor: pointer;
    background: var(--input-bg); border: 1px solid var(--line); box-shadow: inset 0 1px 3px rgba(0,0,0,.12); }
  .form-inline.hl { border-color: color-mix(in srgb, var(--gold2) 40%, var(--line)); }
  .form-inline b { display: block; font-weight: 600; font-size: 13px; } .form-inline small { display: block; font-size: 12px; color: var(--muted); }
  textarea.input { height: 72px; padding: 9px 11px; resize: vertical; }
  .range { display: flex; gap: 12px; align-items: center; }
  .range input { flex: 1; accent-color: var(--ok); }
  .range output { min-width: 40px; text-align: center; font-weight: 600; font-variant-numeric: tabular-nums; padding: 3px 0; border-radius: 7px;
    background: var(--input-bg); box-shadow: inset 0 1px 3px rgba(0,0,0,.18); }

  .toast { position: fixed; bottom: 22px; left: 50%; transform: translateX(-50%); z-index: 80; padding: 9px 16px; border-radius: 10px; font-size: 13px; font-weight: 600;
    color: var(--gold-fg); background: linear-gradient(180deg, var(--gold1), var(--gold2)); box-shadow: 0 12px 30px -8px rgba(0,0,0,.6); }
  @media (max-width: 760px) {
    .topbar-in { height: auto; flex-wrap: wrap; padding: 10px 16px; }
    .conn { display: none; }
    .page-head .tools { margin-left: 0; width: 100%; } .page-head .tools .input { width: 100%; }
  }
  @media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation: none !important; transition: none !important; } .card:hover { transform: none; } }
</style>
</head>
<body>

<svg width="0" height="0" style="position:absolute" aria-hidden="true">
  <symbol id="i-globe" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20"/></symbol>
  <symbol id="i-grid" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></symbol>
  <symbol id="i-puzzle" viewBox="0 0 24 24"><path d="M19.4 11H18V7a1 1 0 0 0-1-1h-4V4.6a2.4 2.4 0 1 0-4.8 0V6H4a1 1 0 0 0-1 1v4h1.4a2.4 2.4 0 1 1 0 4.8H3V20a1 1 0 0 0 1 1h4.2v-1.4a2.4 2.4 0 1 1 4.8 0V21H17a1 1 0 0 0 1-1v-4.2h1.4a2.4 2.4 0 1 0 0-4.8z"/></symbol>
  <symbol id="i-copy" viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></symbol>
  <symbol id="i-ext" viewBox="0 0 24 24"><path d="M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></symbol>
  <symbol id="i-x" viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12"/></symbol>
  <symbol id="i-left" viewBox="0 0 24 24"><path d="m15 18-6-6 6-6"/></symbol>
  <symbol id="i-right" viewBox="0 0 24 24"><path d="m9 18 6-6-6-6"/></symbol>
  <symbol id="i-reload" viewBox="0 0 24 24"><path d="M21 12a9 9 0 1 1-3-6.7L21 8M21 3v5h-5"/></symbol>
  <symbol id="i-plug" viewBox="0 0 24 24"><path d="M12 22v-5M9 8V2M15 8V2M18 8v5a6 6 0 0 1-12 0V8z"/></symbol>
  <symbol id="i-edit" viewBox="0 0 24 24"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></symbol>
  <symbol id="i-sliders" viewBox="0 0 24 24"><path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/></symbol>
  <symbol id="i-upload" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/></symbol>
  <symbol id="i-plus" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></symbol>
</svg>

<input class="sr" type="radio" name="tab" id="t-designs" checked>
<input class="sr" type="radio" name="tab" id="t-mods">
<!-- Modal mở bằng radio: không cần JS, không đổi địa chỉ trang -->
<input class="sr" type="radio" name="modal" id="r-none" checked>
${MODALS.map(id => `<input class="sr" type="radio" name="modal" id="r-${id}" tabindex="-1">`).join("\n")}

<header class="topbar">
  <div class="topbar-in">
    <div class="brand"><span class="brand-mark">✦</span><span>Live Studio<small>Quản lý phòng</small></span></div>
    <nav class="tabs" aria-label="Điều hướng">
      <label class="tab" for="r-m-browser">${ic("globe")}Trình duyệt</label>
      <label class="tab" for="t-designs">${ic("grid")}Thiết kế <span class="count">${designs.length}</span></label>
      <label class="tab" for="t-mods">${ic("puzzle")}Tính năng <span class="count" id="c-mods">${onCount}/${mods.length}</span></label>
    </nav>
    <div class="spacer"></div>
    <div class="conn raised"><span class="dot ok"></span>TikTok · <b>@kechuyen.dem</b></div>
  </div>
</header>

<main>
  <section id="tab-designs">
    <div class="page-head">
      <div><div class="eyebrow">Bộ sưu tập</div><h1>Thiết kế</h1><p>Mỗi thiết kế là một phòng live độc lập. Dán link OBS vào Browser Source, link Studio để mở phiên phát.</p></div>
      <div class="tools">
        <input class="input" data-filter="grid-designs" placeholder="Tìm thiết kế…" aria-label="Tìm thiết kế">
        <button class="btn btn-gold" type="button">${ic("plus")}Thêm</button>
      </div>
    </div>
    <div class="grid-designs" id="grid-designs">${designs.map(designCard).join("")}
    </div>
  </section>

  <section id="tab-mods">
    <div class="page-head">
      <div><div class="eyebrow">Gói tính năng</div><h1>Tính năng</h1><p>Bấm vào thẻ để cấu hình đầy đủ. Công tắc và ô chỉnh nhanh trên thẻ áp dụng ngay.</p>
        <div class="apply-to"><span class="dot ok"></span>Đang áp dụng cho <b data-live-name>${esc(liveName)}</b><small>— thiết kế đang phát</small></div></div>
      <div class="tools">
        <input class="input" data-filter="grid-mods" placeholder="Tìm module…" aria-label="Tìm module">
        <label class="btn btn-gold" for="r-m-quick">${ic("sliders")}Cấu hình nhanh</label>
      </div>
    </div>
    <div id="grid-mods">
      <h3 class="group-title">Chỉnh nhanh <span>${mods.filter(m => m.quick).length}</span></h3>
      <div class="grid-mods">${mods.filter(m => m.quick).map(modCard).join("")}
      </div>
      <h3 class="group-title">Module khác <span>${mods.filter(m => !m.quick).length}</span></h3>
      <div class="grid-mods grid-compact">${mods.filter(m => !m.quick).map(modCard).join("")}
      </div>
    </div>
  </section>
</main>

<!-- Modal trình duyệt -->
<div class="overlay" id="m-browser">
  <label class="backdrop" for="r-none" aria-label="Đóng"></label>
  <div class="modal modal-lg" role="dialog" aria-modal="true" aria-labelledby="mb-title">
    <div class="modal-head">
      <span class="brand-mark">${ic("globe")}</span>
      <div class="grow"><h2 id="mb-title">Trình duyệt</h2><p>Đăng nhập một lần, phiên được giữ lại. Thiết kế lấy dữ liệu từ trang đang kết nối.</p></div>
      <label class="btn btn-icon btn-ghost" for="r-none" aria-label="Đóng">${ic("x")}</label>
    </div>
    <div class="browser">
      <aside class="browser-side">${siteGroups}
      </aside>
      <div class="browser-main">
        <div class="urlbar">
          <button class="btn btn-icon" type="button" aria-label="Lùi">${ic("left")}</button>
          <button class="btn btn-icon" type="button" aria-label="Tiến">${ic("right")}</button>
          <button class="btn btn-icon" type="button" aria-label="Tải lại">${ic("reload")}</button>
          <input class="input" id="mb-url" value="${sites[0].url}" aria-label="Địa chỉ">
          <button class="btn btn-gold" type="button">Mở</button>
        </div>
        <div class="viewport"><div><div class="globe">🌐</div><b>Khung webview</b>Trong bản Tauri, trang web hiện ở đây (webview riêng, giữ cookie đăng nhập).</div></div>
        <div class="linkrow">
          <span class="lbl">${ic("plug")}Dữ liệu trang này đưa vào thiết kế đang phát:</span>
          <b class="live-target" data-live-name>${esc(liveName)}</b>
        </div>
      </div>
    </div>
  </div>
</div>

<!-- Modal cấu hình nhanh -->${quickModal()}

<!-- Modal cấu hình từng module -->${mods.map(modModal).join("")}

<script>
/* Chỉ là phần thêm: trang vẫn dùng được khi JS bị chặn. */
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
function toast(msg) {
  const t = document.createElement("div"); t.className = "toast"; t.textContent = msg;
  document.body.appendChild(t); setTimeout(() => t.remove(), 1600);
}
document.addEventListener("click", e => {
  const c = e.target.closest("[data-copy]");
  if (c) { navigator.clipboard?.writeText(c.dataset.copy).catch(() => {}); toast("Đã chép link OBS"); }
  const a = e.target.closest("[data-act]");
  if (a) toast(a.dataset.act + ": đang quay…");
  const ed = e.target.closest("[data-edit]");
  if (ed) toggleRename(ed.closest(".design"));
  const rs = e.target.closest("[data-reset]");
  if (rs && confirm("Reset dữ liệu của “" + rs.dataset.reset + "”? Bình luận, quà, bảng xếp hạng của phiên sẽ bị xoá.")) toast("Đã reset dữ liệu: " + rs.dataset.reset);
  const p = e.target.closest("[data-play]");
  if (p) toast("Nghe thử: " + p.dataset.play);
  const dv = e.target.closest("[data-del-voice]");
  if (dv) { dv.closest(".voice-row").remove(); toast("Đã xoá giọng " + dv.dataset.delVoice); }
  if (e.target.closest("[data-add-voice]")) toast("Đang tạo giọng từ file mẫu…");
  const s = e.target.closest("[data-save]");
  if (s) toast("Đã áp dụng " + s.dataset.save);
});
// Sửa: chỉ đổi tên thiết kế, ngay trên thẻ
function toggleRename(card, cancel) {
  const btn = card.querySelector("[data-edit]"), inp = card.querySelector(".name-edit");
  if (!inp) {
    const b = card.querySelector(".design-name b");
    const i = document.createElement("input");
    i.className = "input name-edit"; i.value = b.textContent; i.dataset.old = b.textContent;
    b.hidden = true; b.after(i); i.focus(); i.select();
    btn.classList.add("saving"); btn.querySelector("span").textContent = "Lưu";
    i.addEventListener("keydown", e => {
      if (e.key === "Enter") toggleRename(card);
      if (e.key === "Escape") { e.stopPropagation(); toggleRename(card, true); }
    });
    return;
  }
  const b = card.querySelector(".design-name b");
  const name = cancel ? inp.dataset.old : (inp.value.trim() || inp.dataset.old);
  b.textContent = name; b.title = name; b.hidden = false; inp.remove();
  btn.classList.remove("saving"); btn.querySelector("span").textContent = "Sửa";
  const lv = card.querySelector("[data-live]");
  lv.dataset.live = name;
  if (lv.checked) $$("[data-live-name]").forEach(x => x.textContent = name);
  if (!cancel && name !== inp.dataset.old) toast("Đã đổi tên thành: " + name);
}
document.addEventListener("keydown", e => { if (e.key === "Escape") document.getElementById("r-none").checked = true; });
$$("[data-filter]").forEach(inp => inp.addEventListener("input", () => {
  const q = inp.value.trim().toLowerCase();
  $$("#" + inp.dataset.filter + " .card").forEach(c => c.hidden = q && !c.dataset.name.includes(q));
}));
// Chỉ một phòng phát cùng lúc: phải tắt phòng đang phát rồi mới bật được phòng khác.
document.documentElement.classList.add("js");
$$(".live-btn").forEach(lb => lb.addEventListener("click", e => {
  const me = lb.querySelector("input");
  const live = $$("[data-live]").find(x => x.checked && x !== me);
  if (!live) return;
  e.preventDefault();
  toast("Hãy tắt \\"" + live.dataset.live + "\\" trước khi phát phòng khác");
}));
$$(".site input").forEach(r => r.addEventListener("change", () => { document.getElementById("mb-url").value = r.dataset.url; }));
// Công tắc bật module và mọi tham số khớp nhau giữa thẻ, modal riêng và modal cấu hình nhanh
function syncCount() {
  const all = $$("[data-on][data-card]");
  document.getElementById("c-mods").textContent = all.filter(x => x.checked).length + "/" + all.length;
}
function showRange(el) { if (el.type === "range" && el.nextElementSibling && el.nextElementSibling.tagName === "OUTPUT") el.nextElementSibling.textContent = el.value; }
function syncFrom(el) {
  const on = el.dataset.on, key = el.dataset.sync;
  if (on) $$('[data-on="' + on + '"]').forEach(x => { if (x !== el) x.checked = el.checked; });
  if (key) $$('[data-sync="' + key + '"]').forEach(x => {
    if (x === el) return;
    if (x.type === "checkbox") x.checked = el.checked; else x.value = el.value;
    showRange(x);
  });
  showRange(el);
}
document.addEventListener("input", e => syncFrom(e.target));
document.addEventListener("change", e => { if (e.target.dataset.voiceFile !== undefined && e.target.files[0]) toast("Đã chọn: " + e.target.files[0].name); });
document.addEventListener("change", e => {
  if (e.target.dataset.live) {
    toast((e.target.checked ? "Bắt đầu phát: " : "Đã dừng phát: ") + e.target.dataset.live);
    const on = $$("[data-live]").find(x => x.checked);
    $$("[data-live-name]").forEach(x => x.textContent = on ? on.dataset.live : "Chưa có thiết kế đang phát");
  }
  syncFrom(e.target);
  if (!e.target.dataset.on) return;
  syncCount();
  if ("card" in e.target.dataset) toast((e.target.checked ? "Đã bật " : "Đã tắt ") + e.target.closest(".mod").querySelector("b").textContent);
});
</script>
</body>
</html>
`;

writeFileSync(OUT, html);
console.log("ok", html.length);
