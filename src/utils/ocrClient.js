const fs = require('node:fs');
const path = require('node:path');
const { ROOT_STORAGE_DIR } = require('./paths');

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || '';

async function runStubOcr(noteId, fileName) {
  return {
    raw_text: `Simulated OCR for note ${noteId} (${fileName})`,
    clean_text: `Simulated OCR for note ${noteId} (${fileName})`,
    confidence: 0.75,
  };
}

async function runAiOcr(imagePath, fileName, noteId = fileName) {
  let fullPath;
  if (imagePath.startsWith('/storage/')) {
    const relativePath = imagePath.replace(/^\/storage\//, '');
    fullPath = path.join(ROOT_STORAGE_DIR, relativePath);
  } else {
    fullPath = path.isAbsolute(imagePath)
      ? imagePath
      : path.join(__dirname, '..', '..', imagePath);
  }

  if (!fs.existsSync(fullPath)) {
    throw new Error(`Note file not found: ${fullPath}`);
  }

  if (!AI_SERVICE_URL) {
    return runStubOcr(noteId, fileName);
  }

  const form = new FormData();
  const fileBuffer = fs.readFileSync(fullPath);
  const blob = new Blob([fileBuffer], { type: 'application/octet-stream' });
  form.append('file', blob, fileName || path.basename(fullPath));

  const response = await fetch(`${AI_SERVICE_URL.replace(/\/$/, '')}/ocr`, {
    method: 'POST',
    body: form,
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`AI OCR request failed (${response.status}): ${body}`);
  }

  return response.json();
}

module.exports = {
  runAiOcr,
  runStubOcr,
};
