const fs = require('fs');
const path = require('path');

const ROOT_STORAGE_DIR = path.join(__dirname, '..', '..', 'data', 'storage');
const NOTES_STORAGE_DIR = path.join(ROOT_STORAGE_DIR, 'notes');
const PDF_STORAGE_DIR = path.join(ROOT_STORAGE_DIR, 'pdfs');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function ensureStorageDirs() {
  ensureDir(ROOT_STORAGE_DIR);
  ensureDir(NOTES_STORAGE_DIR);
  ensureDir(PDF_STORAGE_DIR);
}

module.exports = {
  ROOT_STORAGE_DIR,
  NOTES_STORAGE_DIR,
  PDF_STORAGE_DIR,
  ensureStorageDirs,
};