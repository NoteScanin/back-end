const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { readJSON, writeJSON } = require('../utils/dataStore');

const router = express.Router();

const STORAGE = path.join(__dirname, '..', 'storage', 'notes');
if (!fs.existsSync(STORAGE)) fs.mkdirSync(STORAGE, { recursive: true });

const upload = multer({ dest: STORAGE });

router.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'file required' });
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
  res.json(item);
});

router.get('/', (req, res) => {
  const notes = readJSON('notes.json', []);
  res.json(notes);
});

router.get('/:id', (req, res) => {
  const notes = readJSON('notes.json', []);
  const n = notes.find(x => x.id === req.params.id);
  if (!n) return res.status(404).json({ error: 'not found' });
  res.json(n);
});

router.delete('/:id', (req, res) => {
  let notes = readJSON('notes.json', []);
  const idx = notes.findIndex(x => x.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'not found' });
  const [deleted] = notes.splice(idx, 1);
  writeJSON('notes.json', notes);
  res.json({ deleted });
});

module.exports = router;
