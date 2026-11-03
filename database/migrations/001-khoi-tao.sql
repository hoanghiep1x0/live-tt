-- 001 — khởi tạo: phiên, sổ quà, bình chọn, quay thưởng.
-- Khớp với schema.sql tại thời điểm tạo dự án.

PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS session (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  design_id   TEXT    NOT NULL,
  started_at  INTEGER NOT NULL,
  ended_at    INTEGER,
  channel     TEXT
);
CREATE INDEX IF NOT EXISTS idx_session_design ON session (design_id, started_at DESC);

CREATE TABLE IF NOT EXISTS gift (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id  INTEGER NOT NULL REFERENCES session (id),
  at          INTEGER NOT NULL,
  user        TEXT    NOT NULL,
  name        TEXT    NOT NULL,
  gift        TEXT    NOT NULL,
  count       INTEGER NOT NULL DEFAULT 1,
  coins       INTEGER NOT NULL DEFAULT 0,
  xu          INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_gift_session ON gift (session_id, at);
CREATE INDEX IF NOT EXISTS idx_gift_user    ON gift (user, at DESC);

CREATE TABLE IF NOT EXISTS vote (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id  INTEGER NOT NULL REFERENCES session (id),
  at          INTEGER NOT NULL,
  topic       TEXT    NOT NULL,
  choice      TEXT    NOT NULL,
  user        TEXT    NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_vote_session ON vote (session_id, at);

CREATE TABLE IF NOT EXISTS raffle (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id  INTEGER NOT NULL REFERENCES session (id),
  at          INTEGER NOT NULL,
  user        TEXT    NOT NULL,
  name        TEXT    NOT NULL,
  pool        TEXT    NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_raffle_session ON raffle (session_id, at);

CREATE TABLE IF NOT EXISTS migration (
  name    TEXT    PRIMARY KEY,
  ran_at  INTEGER NOT NULL
);
