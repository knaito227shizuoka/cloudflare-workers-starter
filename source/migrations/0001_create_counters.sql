CREATE TABLE IF NOT EXISTS counters (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  value INTEGER NOT NULL DEFAULT 0 CHECK (value >= 0),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

INSERT OR IGNORE INTO counters (id, value) VALUES (1, 0);
