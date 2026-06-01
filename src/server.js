const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const notesRouter = require('./routes/notes');
const ocrRouter = require('./routes/ocr');
const pdfRouter = require('./routes/pdf');
const healthRouter = require('./routes/health');
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./swagger.json');

const STORAGE_DIR = path.join(__dirname, '..', 'storage');
if (!fs.existsSync(STORAGE_DIR)) fs.mkdirSync(STORAGE_DIR, { recursive: true });

const app = express();
app.use(cors());
app.use(express.json());
app.use('/storage', express.static(STORAGE_DIR));

app.use('/api/v1/notes', notesRouter);
app.use('/api/v1/ocr', ocrRouter);
app.use('/api/v1/pdf', pdfRouter);
app.use('/health', healthRouter);

// Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`NoteScanin backend listening on port ${PORT}`);
});
