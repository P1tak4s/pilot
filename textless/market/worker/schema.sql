-- One row per upload, live or not. Refused uploads keep only their facts (no file) so the hourly limit counts them.
CREATE TABLE IF NOT EXISTS scenes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  author TEXT NOT NULL,
  link TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  ext TEXT NOT NULL,
  width INTEGER NOT NULL DEFAULT 0,
  height INTEGER NOT NULL DEFAULT 0,
  bytes INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL,             -- live | hidden | removed | refused
  ai_category TEXT NOT NULL DEFAULT '',
  ai_reason TEXT NOT NULL DEFAULT '',
  flagged INTEGER NOT NULL DEFAULT 0, -- 1: on the moderation page
  kept INTEGER NOT NULL DEFAULT 0,    -- 1: Isac kept it, reports can no longer hide it
  checked_at INTEGER NOT NULL DEFAULT 0, -- reports after this count toward the next look
  decided_by TEXT NOT NULL DEFAULT '',
  ip_hash TEXT NOT NULL,
  created INTEGER NOT NULL,
  owner_hash TEXT NOT NULL DEFAULT '' -- SHA-256 of the removal key the uploader got back; '' for scenes from before
);
CREATE INDEX IF NOT EXISTS scenes_live ON scenes (status, created);
CREATE INDEX IF NOT EXISTS scenes_ip ON scenes (ip_hash, created);

-- One report per person per scene.
CREATE TABLE IF NOT EXISTS reports (
  scene_id TEXT NOT NULL,
  ip_hash TEXT NOT NULL,
  reason TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  created INTEGER NOT NULL,
  PRIMARY KEY (scene_id, ip_hash)
);

-- What a person picked on the settings page, under the random key their plugin made. Nothing else is kept: no name,
-- no address. data is the JSON the page sent, already checked ({ set, scene }).
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  data TEXT NOT NULL,
  updated INTEGER NOT NULL
);

-- One star per person per scene, for the "most starred" sort.
CREATE TABLE IF NOT EXISTS stars (
  scene_id TEXT NOT NULL,
  ip_hash TEXT NOT NULL,
  created INTEGER NOT NULL,
  PRIMARY KEY (scene_id, ip_hash)
);
