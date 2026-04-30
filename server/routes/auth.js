import express from 'express';
import crypto from 'crypto';

const router = express.Router();

/**
 * Mock-auth с детерминированным userId (стабильный между сессиями для одного email)
 * и явной ролью на основе подстроки "admin" в email.
 *
 * Токен — base64-payload + HMAC-подпись секретом из env (или дефолтным).
 * Клиент кладёт его в localStorage. Это не JWT, но архитектурно эквивалентно
 * для учебной демонстрации.
 */

const SECRET = process.env.AUTH_SECRET || 'nova-shop-dev-secret-change-me';

function deterministicUserId(email) {
  return 'usr_' + crypto.createHash('sha1').update(email.toLowerCase()).digest('hex').slice(0, 12);
}

function signToken(payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig  = crypto.createHmac('sha256', SECRET).update(body).digest('base64url');
  return `${body}.${sig}`;
}

export function verifyToken(token) {
  if (!token || typeof token !== 'string' || !token.includes('.')) return null;
  const [body, sig] = token.split('.');
  const expected = crypto.createHmac('sha256', SECRET).update(body).digest('base64url');
  if (sig !== expected) return null;
  try {
    return JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
}

function buildUser(email, username) {
  const role = /admin/i.test(email) ? 'admin' : 'user';
  return {
    id: deterministicUserId(email),
    email,
    username: username || email.split('@')[0],
    role,
    createdAt: new Date().toISOString()
  };
}

router.post('/register', (req, res) => {
  const { email, password, username } = req.body;
  if (!email || !password || !username) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 chars' });
  }

  const user = buildUser(email, username);
  const token = signToken({ id: user.id, role: user.role, email: user.email });
  res.json({ user, token });
});

router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }

  const user = buildUser(email);
  const token = signToken({ id: user.id, role: user.role, email: user.email });
  res.json({ user, token });
});

router.post('/logout', (req, res) => {
  res.json({ message: 'Logged out successfully' });
});

router.get('/me', (req, res) => {
  const auth = req.headers.authorization || '';
  const token = auth.replace(/^Bearer\s+/i, '');
  const payload = verifyToken(token);
  if (!payload) return res.status(401).json({ error: 'Invalid token' });
  const user = buildUser(payload.email);
  user.id = payload.id;
  res.json({ user });
});

export default router;
