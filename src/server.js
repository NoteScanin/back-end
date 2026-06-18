require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

// Initialize database (creates tables if needed)
require('./db/database');

const authRouter = require('./routes/auth');
const notesRouter = require('./routes/notes');
const ocrRouter = require('./routes/ocr');
const pdfRouter = require('./routes/pdf');
const healthRouter = require('./routes/health');
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./swagger.json');
const { ROOT_STORAGE_DIR, ensureStorageDirs } = require('./utils/paths');

ensureStorageDirs();

const app = express();

// Parsing jika ada banyak domain, pisahkan dengan koma di Railway env var
const frontendUrls = process.env.FRONTEND_URL 
  ? process.env.FRONTEND_URL.split(',').map(url => url.trim()) 
  : [];

// CORS configuration — allow frontend dev server and production domains
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3002',
    'http://localhost:3003',
    'http://localhost:3005',
    'https://note-scanin.vercel.app', // Domain bawaan vercel
    'https://notescanin.web.id',      // Domain custom utama
    'https://www.notescanin.web.id',  // Domain custom dengan www
    ...frontendUrls,
  ].filter(Boolean),
  credentials: true,
}));

app.use(express.json());
app.use('/storage', express.static(ROOT_STORAGE_DIR));

// Routes
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/notes', notesRouter);
app.use('/api/v1/ocr', ocrRouter);
app.use('/api/v1/pdf', pdfRouter);
app.use('/health', healthRouter);

// Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Serve frontend static files if frontend folder exists (supports local dev and container mount)
const CANDIDATE_FRONTENDS = [
  path.join(__dirname, '..', '..', 'frontend'), // typical workspace: backend/src -> ../.. -> frontend
  path.join(__dirname, '..', 'frontend'), // container: /app/src -> ../frontend
];
let FRONTEND_DIR = null;
for (const p of CANDIDATE_FRONTENDS) {
  if (fs.existsSync(p)) { FRONTEND_DIR = p; break; }
}
if (FRONTEND_DIR) {
  app.use(express.static(FRONTEND_DIR));
  app.get(/^(?!\/api|\/storage|\/api-docs|\/health).*/, (req, res) => {
    res.sendFile(path.join(FRONTEND_DIR, 'index.html'));
  });
  console.log('Serving frontend from', FRONTEND_DIR);
} else {
  console.log('No frontend directory found to serve statically');
}

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'not found',
    error_details: { message: 'not found' },
  });
});

app.use((err, req, res, next) => {
  console.error(err);
  const status = err.status || err.statusCode || (err.name === 'MulterError' && err.code === 'LIMIT_FILE_SIZE' ? 413 : 500);
  const details = {};
  if (err.code) details.code = err.code;
  if (err.allowed_types) details.allowed_types = err.allowed_types;
  if (err.name === 'MulterError' && err.code === 'LIMIT_FILE_SIZE') {
    details.limit = '10MB';
  }
  res.status(status).json({
    success: false,
    error: err.message || 'internal server error',
    error_details: {
      message: err.message || 'internal server error',
      ...(Object.keys(details).length ? { details } : {}),
    },
  });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`NoteScanin backend listening on port ${PORT}`);
  console.log(`Database: SQLite (data/scanin.db)`);
  console.log(`Auth: JWT + Google OAuth`);
});
