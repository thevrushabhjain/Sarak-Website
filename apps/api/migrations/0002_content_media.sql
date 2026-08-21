CREATE TABLE media (
  id TEXT PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  mime TEXT NOT NULL,
  bytes INTEGER NOT NULL,
  alt TEXT NOT NULL DEFAULT '',
  created_by TEXT REFERENCES users(id),
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE activities (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  tag TEXT NOT NULL DEFAULT '',
  image_url TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'published'
    CHECK (status IN ('draft','published','unpublished','trashed')),
  prev_status TEXT,
  sort INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE programs (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  image_url TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  open INTEGER NOT NULL DEFAULT 1,
  deadline_text TEXT NOT NULL DEFAULT '',
  form_id TEXT,
  status TEXT NOT NULL DEFAULT 'published'
    CHECK (status IN ('draft','published','unpublished','trashed')),
  prev_status TEXT,
  sort INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE news (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  image_url TEXT NOT NULL DEFAULT '',
  excerpt TEXT NOT NULL DEFAULT '',
  published_at INTEGER,
  status TEXT NOT NULL DEFAULT 'published'
    CHECK (status IN ('draft','published','unpublished','trashed')),
  prev_status TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);
