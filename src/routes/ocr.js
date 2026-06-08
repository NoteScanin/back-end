const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { readJSON, writeJSON } = require('../utils/dataStore');
const { runAiOcr } = require('../utils/ocrClient');
const { sendSuccess, notFound, badRequest } = require('../utils/apiResponse');
const { isUuidV4 } = require('../utils/validators');

const router = express.Router();

// In-memory map of SSE clients by jobId
const sseClients = new Map();

function updateSse(job) {
  const res = sseClients.get(job.id);
  if (res) {
    res.write(`event: progress\ndata: ${JSON.stringify({ progress: job.progress, status: job.status })}\n\n`);
  }
}

function updateJob(job) {
  const jobs = readJSON('jobs.json', []);
  const idx = jobs.findIndex(j => j.id === job.id);
  if (idx === -1) jobs.push(job);
  else jobs[idx] = job;
  writeJSON('jobs.json', jobs);
  updateSse(job);
}

function findNote(noteId) {
  const notes = readJSON('notes.json', []);
  return notes.find((note) => note.id === noteId) || null;
}

async function processOcrJob(job, note) {
  job.status = 'PROCESSING';
  job.progress = 15;
  job.updated_at = new Date().toISOString();
  updateJob(job);

  const result = await runAiOcr(note.image_path, note.file_name);

  job.status = 'COMPLETED';
  job.progress = 100;
  job.updated_at = new Date().toISOString();
  updateJob(job);

  const results = readJSON('results.json', []);
  const record = {
    id: uuidv4(),
    job_id: job.id,
    raw_text: result.raw_text || '',
    clean_text: result.clean_text || result.raw_text || '',
    confidence: typeof result.confidence === 'number' ? result.confidence : 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  results.push(record);
  writeJSON('results.json', results);

  return record;
}

router.post('/process/:noteId', (req, res) => {
  const noteId = req.params.noteId;
  if (!isUuidV4(noteId)) {
    return badRequest(res, 'invalid noteId');
  }
  const note = findNote(noteId);

  if (!note) {
    return notFound(res, 'note not found');
  }

  const jobId = uuidv4();
  const job = { id: jobId, note_id: noteId, status: 'QUEUED', progress: 0, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
  updateJob(job);

  setTimeout(async () => {
    try {
      await processOcrJob(job, note);
    } catch (error) {
      job.status = 'FAILED';
      job.progress = 0;
      job.error = error.message;
      job.updated_at = new Date().toISOString();
      updateJob(job);
    }
  }, 300);

  sendSuccess(res, { jobId, noteId, status: 'QUEUED' }, 202);
});

router.get('/jobs/:jobId', (req, res) => {
  if (!isUuidV4(req.params.jobId)) {
    return badRequest(res, 'invalid jobId');
  }
  const jobs = readJSON('jobs.json', []);
  const j = jobs.find(x => x.id === req.params.jobId);
  if (!j) return notFound(res);
  sendSuccess(res, j);
});

router.get('/results/:jobId', (req, res) => {
  if (!isUuidV4(req.params.jobId)) {
    return badRequest(res, 'invalid jobId');
  }
  const results = readJSON('results.json', []);
  const r = results.find(x => x.job_id === req.params.jobId);
  if (!r) return notFound(res);
  sendSuccess(res, r);
});

// SSE stream for job progress
router.get('/jobs/:jobId/stream', (req, res) => {
  const jobId = req.params.jobId;
  if (!isUuidV4(jobId)) {
    return badRequest(res, 'invalid jobId');
  }
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.write('\n');
  sseClients.set(jobId, res);

  req.on('close', () => {
    sseClients.delete(jobId);
  });
});

module.exports = router;
