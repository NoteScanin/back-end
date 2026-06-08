const express = require('express');
const router = express.Router();
const { sendSuccess } = require('../utils/apiResponse');

router.get('/', (req, res) => {
  sendSuccess(res, {
    status: 'ok',
    service: 'notescanin-backend',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
