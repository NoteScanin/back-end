const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { readJSON, writeJSON } = require('../utils/dataStore');

const router = express.Router();

// In-memory map of SSE clients by jobId
const sseClients = new Map();

function updateJob(job) {
  const jobs = readJSON('jobs.json', []);
  const idx = jobs.findIndex(j => j.id === job.id);
  if (idx === -1) jobs.push(job);
  else jobs[idx] = job;
  writeJSON('jobs.json', jobs);
  // notify SSE if any
  const res = sseClients.get(job.id);
  if (res) {
    res.write(`event: progress\ndata: ${JSON.stringify({ progress: job.progress, status: job.status })}\n\n`);
  }
}

router.post('/process/:noteId', (req, res) => {
  const noteId = req.params.noteId;
  const jobId = uuidv4();
  const job = { id: jobId, note_id: noteId, status: 'QUEUED', progress: 0, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
  updateJob(job);

  // simulate processing
  setTimeout(() => {
    job.status = 'PROCESSING';
    job.progress = 10;
    updateJob(job);

    const interval = setInterval(() => {
      job.progress += Math.floor(Math.random() * 20) + 10;
      if (job.progress >= 100) {
        job.progress = 100;
        job.status = 'COMPLETED';
        job.updated_at = new Date().toISOString();
        updateJob(job);
        clearInterval(interval);

        // write result
        const results = readJSON('results.json', []);
        const result = {
          id: uuidv4(),
          job_id: job.id,
          raw_text: `Simulated OCR for note ${noteId}`,
          clean_text: `Simulated OCR for note ${noteId}`,
          confidence: Math.random() * 0.4 + 0.6,
          created_at: new Date().toISOString()
        };
        results.push(result);
        writeJSON('results.json', results);
      } else {
        job.updated_at = new Date().toISOString();
        updateJob(job);
      }
    }, 800);
  }, 300);

  res.json({ jobId });
});

router.get('/jobs/:jobId', (req, res) => {
  const jobs = readJSON('jobs.json', []);
  const j = jobs.find(x => x.id === req.params.jobId);
  if (!j) return res.status(404).json({ error: 'not found' });
  res.json(j);
});

router.get('/results/:jobId', (req, res) => {
  const results = readJSON('results.json', []);
  const r = results.find(x => x.job_id === req.params.jobId);
  if (!r) return res.status(404).json({ error: 'not found' });
  res.json(r);
});

// SSE stream for job progress
router.get('/jobs/:jobId/stream', (req, res) => {
  const jobId = req.params.jobId;
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
