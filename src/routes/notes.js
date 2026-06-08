const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { readJSON, writeJSON } = require('../utils/dataStore');
const { NOTES_STORAGE_DIR } = require('../utils/paths');
const { sendCreated, sendSuccess, badRequest, notFound } = require('../utils/apiResponse');
const { isImageUpload } = require('../utils/validators');

const router = express.Router();

if (!fs.existsSync(NOTES_STORAGE_DIR)) fs.mkdirSync(NOTES_STORAGE_DIR, { recursive: true });

const upload = multer({
  dest: NOTES_STORAGE_DIR,
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    if (!isImageUpload(file)) {
      const error = new Error('only image uploads are allowed');
      error.status = 400;
      error.code = 'INVALID_FILE_TYPE';
      error.allowed_types = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/bmp', 'image/tiff'];
      return cb(error);
    }
    cb(null, true);
  },
});

router.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) return badRequest(res, 'file required');
  const notes = readJSON('notes.json', []);
  const id = uuidv4();
  const item = {
    id,
    file_name: req.file.originalname,
    image_path: `/storage/notes/${path.basename(req.file.path)}`,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  notes.push(item);
  writeJSON('notes.json', notes);
  sendCreated(res, item);
});

router.get('/', (req, res) => {
  const notes = readJSON('notes.json', []);
  sendSuccess(res, {
    items: notes,
    count: notes.length,
    total: notes.length,
  });
});

router.get('/:id', (req, res) => {
  const notes = readJSON('notes.json', []);
  const n = notes.find(x => x.id === req.params.id);
  if (!n) return notFound(res);
  sendSuccess(res, n);
});

router.delete('/:id', (req, res) => {
  let notes = readJSON('notes.json', []);
  const idx = notes.findIndex(x => x.id === req.params.id);
  if (idx === -1) return notFound(res);
  const [deleted] = notes.splice(idx, 1);
  writeJSON('notes.json', notes);
  sendSuccess(res, { deleted });
});

module.exports = router;
