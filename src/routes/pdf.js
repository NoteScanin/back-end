const express = require('express');
const path = require('path');
const fs = require('fs');
const PDFDocument = require('pdfkit');
const { v4: uuidv4 } = require('uuid');
const { readJSON, writeJSON } = require('../utils/dataStore');

const router = express.Router();

const PDF_DIR = path.join(__dirname, '..', 'storage', 'pdfs');
if (!fs.existsSync(PDF_DIR)) fs.mkdirSync(PDF_DIR, { recursive: true });

router.post('/generate/:jobId', (req, res) => {
  const jobId = req.params.jobId;
  const results = readJSON('results.json', []);
  const r = results.find(x => x.job_id === jobId);
  if (!r) return res.status(404).json({ error: 'ocr result not found' });

  const pdfId = uuidv4();
  const filePath = path.join(PDF_DIR, `${pdfId}.pdf`);
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
    res.json(meta);
  });
});

router.get('/download/:pdfId', (req, res) => {
  const pdfId = req.params.pdfId;
  const pdfs = readJSON('pdfs.json', []);
  const p = pdfs.find(x => x.id === pdfId);
  if (!p) return res.status(404).json({ error: 'not found' });
  const abs = path.join(__dirname, '..', p.file_path.replace(/^\//, ''));
  res.download(abs);
});

module.exports = router;
