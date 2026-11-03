-- Cấu trúc cơ sở dữ liệu. Nguồn sự thật — migrations/ phải dẫn tới đúng trạng thái này.
-- Dùng chung cho cả dev và production.

PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

-- Mỗi phiên phát của một thiết kế.
CREATE TABLE IF NOT EXISTS session (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  design_id   TEXT    NOT NULL,
  started_at  INTEGER NOT NULL,
  ended_at    INTEGER,
  channel     TEXT
);

CREATE INDEX IF NOT EXISTS idx_session_design ON session (design_id, started_at DESC);

-- Sổ quà đối soát. CHỈ THÊM: không sửa, không xoá.
-- "Reset dữ liệu" của thiết kế không đụng tới bảng này.
CREATE TABLE IF NOT EXISTS gift (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id  INTEGER NOT NULL REFERENCES session (id),
  at          INTEGER NOT NULL,
  user        TEXT    NOT NULL,
  name        TEXT    NOT NULL,
  gift        TEXT    NOT NULL,
  count       INTEGER NOT NULL DEFAULT 1,
  -- Xu thật TikTok. Giữ nguyên, không nhân tỉ lệ quy đổi.
  coins       INTEGER NOT NULL DEFAULT 0,
  -- Điểm sau quy đổi của thiết kế, để đối chiếu khi tỉ lệ đổi về sau.
  xu          INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_gift_session ON gift (session_id, at);
CREATE INDEX IF NOT EXISTS idx_gift_user    ON gift (user, at DESC);

-- Kết quả bình chọn, lưu để xem lại sau phiên.
CREATE TABLE IF NOT EXISTS vote (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id  INTEGER NOT NULL REFERENCES session (id),
  at          INTEGER NOT NULL,
  topic       TEXT    NOT NULL,
  choice      TEXT    NOT NULL,
  user        TEXT    NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_vote_session ON vote (session_id, at);

-- Lượt quay thưởng, lưu để chứng minh khi khán giả hỏi lại.
CREATE TABLE IF NOT EXISTS raffle (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id  INTEGER NOT NULL REFERENCES session (id),
  at          INTEGER NOT NULL,
  user        TEXT    NOT NULL,
  name        TEXT    NOT NULL,
  pool        TEXT    NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_raffle_session ON raffle (session_id, at);

-- Phiên bản migration đã chạy.
CREATE TABLE IF NOT EXISTS migration (
  name    TEXT    PRIMARY KEY,
  ran_at  INTEGER NOT NULL
);
