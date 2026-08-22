ALTER TABLE activities ADD COLUMN draft_json TEXT;
ALTER TABLE activities ADD COLUMN published_at INTEGER;
ALTER TABLE programs ADD COLUMN draft_json TEXT;
ALTER TABLE programs ADD COLUMN published_at INTEGER;
-- news.published_at already exists (declared inline in 0002_content_media.sql);
-- re-adding it here fails with SQLITE_ERROR: duplicate column name.
ALTER TABLE news ADD COLUMN draft_json TEXT;

CREATE TABLE revisions (
  id TEXT PRIMARY KEY,
  collection TEXT NOT NULL CHECK (collection IN ('activities','programs','news')),
  record_id TEXT NOT NULL,
  version INTEGER NOT NULL,
  data TEXT NOT NULL,
  created_by TEXT REFERENCES users(id),
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  UNIQUE (collection, record_id, version)
);
CREATE INDEX idx_revisions_record ON revisions(collection, record_id, version DESC);

CREATE TABLE forms (
  id TEXT PRIMARY KEY,
  program_id TEXT REFERENCES programs(id),
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','trashed')),
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE form_versions (
  id TEXT PRIMARY KEY,
  form_id TEXT NOT NULL REFERENCES forms(id),
  version INTEGER NOT NULL,
  schema_json TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  UNIQUE (form_id, version)
);

CREATE TABLE submissions (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('registration','enquiry')),
  form_version_id TEXT REFERENCES form_versions(id),
  program_slug TEXT,
  payload_json TEXT NOT NULL,
  ip TEXT NOT NULL DEFAULT '',
  user_agent TEXT NOT NULL DEFAULT '',
  read_at INTEGER,
  trashed_at INTEGER,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX idx_submissions_inbox ON submissions(kind, trashed_at, created_at DESC);
CREATE TABLE submission_attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ip TEXT NOT NULL,
  bucket TEXT NOT NULL,
  at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX idx_sub_attempts ON submission_attempts(ip, bucket, at);
