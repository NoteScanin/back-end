const express = require('express');
const path = require('path');
const fs = require('fs');
const PDFDocument = require('pdfkit');
const { v4: uuidv4 } = require('uuid');
const { readJSON, writeJSON } = require('../utils/dataStore');
const { PDF_STORAGE_DIR } = require('../utils/paths');
const { sendCreated, notFound, badRequest } = require('../utils/apiResponse');
const { isUuidV4 } = require('../utils/validators');

const router = express.Router();

if (!fs.existsSync(PDF_STORAGE_DIR)) fs.mkdirSync(PDF_STORAGE_DIR, { recursive: true });

router.post('/generate/:jobId', (req, res) => {
  const jobId = req.params.jobId;
  if (!isUuidV4(jobId)) {
    return badRequest(res, 'invalid jobId');
  }
  const results = readJSON('results.json', []);
  const r = results.find(x => x.job_id === jobId);
  if (!r) return notFound(res, 'ocr result not found');

  const pdfId = uuidv4();
  const filePath = path.join(PDF_STORAGE_DIR, `${pdfId}.pdf`);
  const doc = new PDFDocument();
  const stream = fs.createWriteStream(filePath);
  doc.pipe(stream);
  doc.fontSize(12).text(r.clean_text || r.raw_text || '');
  doc.end();

  stream.on('finish', () => {
    const pdfs = readJSON('pdfs.json', []);
    const meta = { id: pdfId, result_id: r.id, file_path: `/storage/pdfs/${pdfId}.pdf`, created_at: new Date().toISOString() };
    pdfs.push(meta);
    writeJSON('pdfs.json', pdfs);
    sendCreated(res, meta);
  });
});

router.get('/download/:pdfId', (req, res) => {
  const pdfId = req.params.pdfId;
  if (!isUuidV4(pdfId)) {
    return badRequest(res, 'invalid pdfId');
  }
  const pdfs = readJSON('pdfs.json', []);
  const p = pdfs.find(x => x.id === pdfId);
  if (!p) return notFound(res);
  const abs = path.join(__dirname, '..', p.file_path.replace(/^\//, ''));
  res.download(abs);
});

module.exports = router;
