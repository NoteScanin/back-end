function sendSuccess(res, data = {}, status = 200) {
  return res.status(status).json({
    success: true,
    data,
    ...data,
  });
}

function sendCreated(res, data = {}) {
  return sendSuccess(res, data, 201);
}

function sendError(res, status, message, details) {
  return res.status(status).json({
    success: false,
    error: message,
    error_details: {
      message,
      ...(details ? { details } : {}),
    },
  });
}

function notFound(res, message = 'not found') {
  return sendError(res, 404, message);
}

function badRequest(res, message = 'bad request', details) {
  return sendError(res, 400, message, details);
}

module.exports = {
  sendSuccess,
  sendCreated,
  sendError,
  notFound,
  badRequest,
};