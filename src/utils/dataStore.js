const fs = require('fs');
const path = require('path');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
ensureDir(DATA_DIR);

function readJSON(file, def) {
  const p = path.join(DATA_DIR, file);
  try {
    if (!fs.existsSync(p)) return def;
    const raw = fs.readFileSync(p, 'utf8');
    return JSON.parse(raw || 'null') || def;
  } catch (e) {
    return def;
  }
}

function writeJSON(file, obj) {
  const p = path.join(DATA_DIR, file);
  fs.writeFileSync(p, JSON.stringify(obj, null, 2));
}

module.exports = { readJSON, writeJSON, DATA_DIR };
