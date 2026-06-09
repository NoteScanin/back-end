const express = require('express');
const path = require('path');
const fs = require('fs');
const PDFDocument = require('pdfkit');
const { v4: uuidv4 } = require('uuid');
const { stmts } = require('../db/database');
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
  
  const result = stmts.findResultByJobId.get(jobId);
  if (!result) return notFound(res, 'ocr result not found');

  const pdfId = uuidv4();
  const filePath = path.join(PDF_STORAGE_DIR, `${pdfId}.pdf`);
  const doc = new PDFDocument();
  const stream = fs.createWriteStream(filePath);
  doc.pipe(stream);
  
  // Here we can also use req.body.text if we want to allow editing the text before generating PDF.
  // The implementation plan says: "dengan teks yang mungkin sudah diedit" (with text that might have been edited)
  const textContent = req.body.text || result.clean_text || result.raw_text || '';
  
  doc.fontSize(12).text(textContent);
  doc.end();

  stream.on('finish', () => {
    const meta = { 
      id: pdfId, 
      result_id: result.id, 
      file_path: `/storage/pdfs/${pdfId}.pdf`, 
      created_at: new Date().toISOString() 
    };
    stmts.insertPdf.run(meta.id, meta.result_id, meta.file_path, meta.created_at);
    sendCreated(res, meta);
  });
});

router.get('/download/:pdfId', (req, res) => {
  const pdfId = req.params.pdfId;
  if (!isUuidV4(pdfId)) {
    return badRequest(res, 'invalid pdfId');
  }
  
  const p = stmts.findPdfById.get(pdfId);
  if (!p) return notFound(res, 'pdf not found');
  
  // Get original file name from DB to use as download name
  const { db } = require('../db/database');
  const noteRow = db.prepare(`
    SELECT n.file_name 
    FROM pdfs p
    JOIN results r ON p.result_id = r.id
    JOIN jobs j ON r.job_id = j.id
    JOIN notes n ON j.note_id = n.id
    WHERE p.id = ?
  `).get(pdfId);
  
  let downloadName = 'Catatan_Scan.pdf';
  if (noteRow && noteRow.file_name) {
    // Replace original extension with .pdf
    downloadName = noteRow.file_name.replace(/\.[^/.]+$/, "") + ".pdf";
  }
  
  const pdfFilename = path.basename(p.file_path);
  const correctAbs = path.join(PDF_STORAGE_DIR, pdfFilename);
  const abs = path.join(__dirname, '..', '..', 'data', p.file_path.replace(/^\//, ''));
  
  if (fs.existsSync(correctAbs)) {
    res.download(correctAbs, downloadName);
  } else {
    // Fallback if data/storage/pdfs isn't PDF_STORAGE_DIR
    res.download(abs, downloadName);
  }
});

module.exports = router;
