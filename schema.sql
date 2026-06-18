-- DogRanking — opinie gości (Cloudflare D1)
-- Import: wrangler d1 execute dogranking-reviews --file=./schema.sql  (lub w panelu D1 → Console)
CREATE TABLE IF NOT EXISTS reviews (
  id          TEXT PRIMARY KEY,
  market      TEXT NOT NULL,             -- pl | uk | us
  category    TEXT NOT NULL,             -- karmy | przysmaki-i-gryzaki | ...
  slug        TEXT NOT NULL,             -- slug produktu
  author      TEXT NOT NULL,             -- imię/nick (publiczne)
  email       TEXT,                      -- opcjonalny, NIEpubliczny
  rating      INTEGER NOT NULL,          -- 1..5
  recommend   INTEGER,                   -- 1 = tak, 0 = nie, NULL = brak
  dog_size    TEXT,                      -- maly | sredni | duzy | NULL
  title       TEXT,
  body        TEXT NOT NULL,
  photo_key   TEXT,                      -- klucz obiektu w R2 (NULL = brak zdjęcia)
  status      TEXT NOT NULL DEFAULT 'pending',  -- pending | approved | rejected
  helpful     INTEGER NOT NULL DEFAULT 0,
  ip_hash     TEXT,                      -- hash IP (rate-limit, nie przechowujemy surowego IP)
  created_at  TEXT NOT NULL,
  approved_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_reviews_lookup ON reviews (market, category, slug, status, created_at);
CREATE INDEX IF NOT EXISTS idx_reviews_status ON reviews (status, created_at);
CREATE INDEX IF NOT EXISTS idx_reviews_rl ON reviews (ip_hash, created_at);
