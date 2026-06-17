const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { stmts } = require('../db/database');
const { runAiOcr } = require('../utils/ocrClient');
const { sendSuccess, notFound, badRequest } = require('../utils/apiResponse');
const { isUuidV4 } = require('../utils/validators');
const { requireAuth } = require('../middleware/auth');

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
  const now = new Date().toISOString();
  const existing = stmts.findJobById.get(job.id);
  if (!existing) {
    stmts.insertJob.run(job.id, job.note_id, job.status, job.progress, now, now);
  } else {
    stmts.updateJob.run(job.status, job.progress, job.error || null, now, job.id);
  }
  updateSse(job);
}

// All routes require authentication
router.use(requireAuth);

function findNote(noteId, userId) {
  return stmts.findNoteByIdAndUser.get(noteId, userId);
}

async function processOcrJob(job, note) {
  job.status = 'PROCESSING';
  job.progress = 15;
  updateJob(job);

  const result = await runAiOcr(note.image_path, note.file_name);

  job.status = 'COMPLETED';
  job.progress = 100;
  updateJob(job);

  const now = new Date().toISOString();
  const id = uuidv4();
  stmts.insertResult.run(
    id,
    job.id,
    result.raw_text || '',
    result.clean_text || result.raw_text || '',
    typeof result.confidence === 'number' ? result.confidence : 0,
    now,
    now
  );

  return stmts.findResultByJobId.get(job.id);
}

router.post('/process/:noteId', (req, res) => {
  const noteId = req.params.noteId;
  if (!isUuidV4(noteId)) {
    return badRequest(res, 'invalid noteId');
  }
  const note = findNote(noteId, req.user.id);

  if (!note) {
    return notFound(res, 'note not found');
  }

  const jobId = uuidv4();
  const job = { id: jobId, note_id: noteId, status: 'QUEUED', progress: 0 };
  updateJob(job);

  setTimeout(async () => {
    try {
      await processOcrJob(job, note);
    } catch (error) {
      job.status = 'FAILED';
      job.progress = 0;
      job.error = error.message;
      updateJob(job);
    }
  }, 300);

  sendSuccess(res, { jobId, noteId, status: 'QUEUED' }, 202);
});

router.get('/jobs/:jobId', (req, res) => {
  if (!isUuidV4(req.params.jobId)) {
    return badRequest(res, 'invalid jobId');
  }
  const j = stmts.findJobById.get(req.params.jobId);
  if (!j) return notFound(res);
  sendSuccess(res, j);
});

router.get('/results/:jobId', (req, res) => {
  if (!isUuidV4(req.params.jobId)) {
    return badRequest(res, 'invalid jobId');
  }
  const r = stmts.findResultByJobId.get(req.params.jobId);
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

  // Send a ping every 15 seconds to keep the connection alive (prevent Railway/browser timeouts)
  const keepAlive = setInterval(() => {
    res.write(': ping\n\n');
  }, 15000);

  req.on('close', () => {
    clearInterval(keepAlive);
    sseClients.delete(jobId);
  });
});

module.exports = router;
