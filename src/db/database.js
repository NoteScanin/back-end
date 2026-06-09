const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_DIR = path.join(__dirname, '..', '..', 'data');
if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });

const DB_PATH = path.join(DB_DIR, 'scanin.db');
const db = new Database(DB_PATH);

// Enable WAL mode for better concurrent read performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ---------- Schema ----------
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT,
    avatar_url TEXT,
    provider TEXT NOT NULL DEFAULT 'local',
    google_id TEXT UNIQUE,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS notes (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    file_name TEXT NOT NULL,
    image_path TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS jobs (
    id TEXT PRIMARY KEY,
    note_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'QUEUED',
    progress INTEGER NOT NULL DEFAULT 0,
    error TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS results (
    id TEXT PRIMARY KEY,
    job_id TEXT NOT NULL,
    raw_text TEXT DEFAULT '',
    clean_text TEXT DEFAULT '',
    confidence REAL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
  );
`);

// Create indexes for common lookups
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_notes_user_id ON notes(user_id);
  CREATE INDEX IF NOT EXISTS idx_jobs_note_id ON jobs(note_id);
  CREATE INDEX IF NOT EXISTS idx_results_job_id ON results(job_id);
  CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
  CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);
`);

// ---------- Prepared statements ----------
const stmts = {
  // Users
  insertUser: db.prepare(`
    INSERT INTO users (id, name, email, password_hash, avatar_url, provider, google_id, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `),
  findUserByEmail: db.prepare('SELECT * FROM users WHERE email = ?'),
  findUserByGoogleId: db.prepare('SELECT * FROM users WHERE google_id = ?'),
  findUserById: db.prepare('SELECT * FROM users WHERE id = ?'),
  updateUser: db.prepare(`
    UPDATE users SET name = ?, avatar_url = ?, updated_at = ? WHERE id = ?
  `),

  // Notes
  insertNote: db.prepare(`
    INSERT INTO notes (id, user_id, file_name, image_path, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `),
  findNotesByUser: db.prepare('SELECT * FROM notes WHERE user_id = ? ORDER BY created_at DESC'),
  findNoteById: db.prepare('SELECT * FROM notes WHERE id = ?'),
  findNoteByIdAndUser: db.prepare('SELECT * FROM notes WHERE id = ? AND user_id = ?'),
  deleteNote: db.prepare('DELETE FROM notes WHERE id = ? AND user_id = ?'),
  countNotesByUser: db.prepare('SELECT COUNT(*) as count FROM notes WHERE user_id = ?'),

  // Jobs
  insertJob: db.prepare(`
    INSERT INTO jobs (id, note_id, status, progress, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `),
  findJobById: db.prepare('SELECT * FROM jobs WHERE id = ?'),
  updateJob: db.prepare(`
    UPDATE jobs SET status = ?, progress = ?, error = ?, updated_at = ? WHERE id = ?
  `),

  // Results
  insertResult: db.prepare(`
    INSERT INTO results (id, job_id, raw_text, clean_text, confidence, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `),
  findResultByJobId: db.prepare('SELECT * FROM results WHERE job_id = ?'),
};

module.exports = { db, stmts };
