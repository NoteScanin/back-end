#!/usr/bin/env node
const fs = require('fs');

async function main() {
  const noteId = process.argv[2];
  const base = process.argv[3] || 'http://localhost:3001';
  if (!noteId) {
    console.error('Usage: node run_ocr_and_pdf.js <noteId> [baseUrl]');
    process.exit(2);
  }

  console.log('Starting OCR for note', noteId);
  const startResp = await fetch(`${base}/api/v1/ocr/process/${noteId}`, { method: 'POST' });
  const startJson = await startResp.json().catch(() => ({}));
  console.log('start response:', startJson);
  const jobId = startJson.jobId;
  if (!jobId) {
    console.error('No jobId returned');
    process.exit(1);
  }

  console.log('Polling job', jobId);
  for (let i = 0; i < 120; i++) {
    const s = await (await fetch(`${base}/api/v1/ocr/jobs/${jobId}`)).json().catch(()=>({}));
    console.log('status:', s.status, 'progress:', s.progress);
    if (s.status === 'COMPLETED' || s.progress >= 100) break;
    await new Promise(r => setTimeout(r, 800));
  }

  const result = await (await fetch(`${base}/api/v1/ocr/results/${jobId}`)).json().catch(()=>null);
  console.log('ocr result:', result && result.id);
  if (!result) {
    console.error('No OCR result found');
    process.exit(1);
  }

  console.log('Generating PDF');
  const pdfResp = await (await fetch(`${base}/api/v1/pdf/generate/${jobId}`, { method: 'POST' })).json().catch(()=>null);
  console.log('pdf resp:', pdfResp && pdfResp.id);
  if (!pdfResp || !pdfResp.id) {
    console.error('PDF generation failed');
    process.exit(1);
  }

  const pdfId = pdfResp.id;
  const downloadUrl = `${base}/api/v1/pdf/download/${pdfId}`;
  console.log('Downloading PDF to /tmp/out.pdf');
  const pdfFetch = await fetch(downloadUrl).catch(()=>null);
  if (!pdfFetch) { console.error('Failed to download PDF'); process.exit(1); }
  const ab = await pdfFetch.arrayBuffer();
  fs.writeFileSync('/tmp/out.pdf', Buffer.from(ab));
  console.log('Saved /tmp/out.pdf');
}

main().catch(e=>{console.error(e); process.exit(1)});
