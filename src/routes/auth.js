const express = require('express');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { OAuth2Client } = require('google-auth-library');
const { stmts } = require('../db/database');
const { generateToken, requireAuth } = require('../middleware/auth');
const { sendSuccess, sendCreated, sendError, badRequest } = require('../utils/apiResponse');

const router = express.Router();

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

// ────────────────────────────────────────────
// POST /api/v1/auth/register
// ────────────────────────────────────────────
router.post('/register', (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return badRequest(res, 'Nama, email, dan password wajib diisi.');
  }

  if (password.length < 8) {
    return badRequest(res, 'Password minimal 8 karakter.');
  }

  // Check if email already exists
  const existing = stmts.findUserByEmail.get(email.toLowerCase());
  if (existing) {
    return sendError(res, 409, 'Email sudah terdaftar. Silakan login.');
  }

  const now = new Date().toISOString();
  const id = uuidv4();
  const passwordHash = bcrypt.hashSync(password, 12);

  stmts.insertUser.run(
    id,
    name.trim(),
    email.toLowerCase().trim(),
    passwordHash,
    null,     // avatar_url
    'local',  // provider
    null,     // google_id
    now,
    now
  );

  const user = stmts.findUserById.get(id);
  const { password_hash, ...safeUser } = user;
  const token = generateToken(user);

  sendCreated(res, { user: safeUser, token });
});

// ────────────────────────────────────────────
// POST /api/v1/auth/login
// ────────────────────────────────────────────
router.post('/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return badRequest(res, 'Email dan password wajib diisi.');
  }

  const user = stmts.findUserByEmail.get(email.toLowerCase().trim());
  if (!user) {
    return sendError(res, 401, 'Email atau password salah.');
  }

  if (!user.password_hash) {
    return sendError(res, 401, 'Akun ini menggunakan Google Sign-In. Silakan login dengan Google.');
  }

  const valid = bcrypt.compareSync(password, user.password_hash);
  if (!valid) {
    return sendError(res, 401, 'Email atau password salah.');
  }

  const { password_hash, ...safeUser } = user;
  const token = generateToken(user);

  sendSuccess(res, { user: safeUser, token });
});

// ────────────────────────────────────────────
// POST /api/v1/auth/google
// ────────────────────────────────────────────
router.post('/google', async (req, res) => {
  const { credential } = req.body;

  if (!credential) {
    return badRequest(res, 'Google credential wajib diisi.');
  }

  try {
    let googleId, email, name, picture;

    // Try ID token verification first, then fallback to access_token userinfo
    try {
      const ticket = await googleClient.verifyIdToken({
        idToken: credential,
        audience: GOOGLE_CLIENT_ID,
      });
      const payload = ticket.getPayload();
      googleId = payload.sub;
      email = payload.email;
      name = payload.name;
      picture = payload.picture;
    } catch {
      // Fallback: treat credential as access_token, fetch userinfo
      const userinfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${credential}` },
      });
      if (!userinfoRes.ok) throw new Error('Invalid access token');
      const userinfo = await userinfoRes.json();
      googleId = userinfo.sub;
      email = userinfo.email;
      name = userinfo.name;
      picture = userinfo.picture;
    }

    const now = new Date().toISOString();

    // Check if user already exists by google_id
    let user = stmts.findUserByGoogleId.get(googleId);

    if (!user) {
      // Check if email exists (local user wanting to link Google)
      user = stmts.findUserByEmail.get(email.toLowerCase());

      if (user) {
        // Link Google to existing account — update google_id, avatar, provider
        const updateGoogleLink = require('../db/database').db.prepare(`
          UPDATE users SET google_id = ?, avatar_url = ?, provider = CASE WHEN provider = 'local' THEN 'local+google' ELSE provider END, updated_at = ? WHERE id = ?
        `);
        updateGoogleLink.run(googleId, picture || user.avatar_url, now, user.id);
        user = stmts.findUserById.get(user.id);
      } else {
        // Create new user
        const id = uuidv4();
        stmts.insertUser.run(
          id,
          name || 'User',
          email.toLowerCase(),
          null,     // no password
          picture || null,
          'google',
          googleId,
          now,
          now
        );
        user = stmts.findUserById.get(id);
      }
    } else {
      // Existing Google user — update avatar if changed
      stmts.updateUser.run(name || user.name, picture || user.avatar_url, now, user.id);
      user = stmts.findUserById.get(user.id);
    }

    const { password_hash, ...safeUser } = user;
    const token = generateToken(user);

    sendSuccess(res, { user: safeUser, token });
  } catch (err) {
    console.error('Google auth error:', err);
    return sendError(res, 401, 'Google authentication gagal. Silakan coba lagi.');
  }
});

// ────────────────────────────────────────────
// GET /api/v1/auth/me
// ────────────────────────────────────────────
router.get('/me', requireAuth, (req, res) => {
  sendSuccess(res, { user: req.user });
});

module.exports = router;
