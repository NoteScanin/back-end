const UUID_V4_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/bmp',
  'image/tiff',
]);

function isUuidV4(value) {
  return typeof value === 'string' && UUID_V4_RE.test(value);
}

function isImageUpload(file) {
  return Boolean(file && IMAGE_MIME_TYPES.has(file.mimetype));
}

module.exports = {
  isUuidV4,
  isImageUpload,
};