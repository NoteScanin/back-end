const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { stmts } = require('../db/database');
const { NOTES_STORAGE_DIR } = require('../utils/paths');
const { sendCreated, sendSuccess, badRequest, notFound } = require('../utils/apiResponse');
const { isImageUpload } = require('../utils/validators');
const { requireAuth } = require('../middleware/auth');

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

// All routes require authentication
router.use(requireAuth);

router.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) return badRequest(res, 'file required');

  const id = uuidv4();
  const now = new Date().toISOString();
  const imagePath = `/storage/notes/${path.basename(req.file.path)}`;

  stmts.insertNote.run(id, req.user.id, req.file.originalname, imagePath, now, now);

  const item = stmts.findNoteById.get(id);
  sendCreated(res, item);
});

router.get('/', (req, res) => {
  const notes = stmts.findNotesByUser.all(req.user.id);
  const countResult = stmts.countNotesByUser.get(req.user.id);
  sendSuccess(res, {
    items: notes,
    count: notes.length,
    total: countResult.count,
  });
});

router.get('/:id', (req, res) => {
  const note = stmts.findNoteByIdAndUser.get(req.params.id, req.user.id);
  if (!note) return notFound(res);
  sendSuccess(res, note);
});

router.delete('/:id', (req, res) => {
  const note = stmts.findNoteByIdAndUser.get(req.params.id, req.user.id);
  if (!note) return notFound(res);

  stmts.deleteNote.run(req.params.id, req.user.id);
  sendSuccess(res, { deleted: note });
});

module.exports = router;
