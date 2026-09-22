// SwiftRun v2 - JWT helpers and auth middleware.

import jwt from 'jsonwebtoken';

const isProd = process.env.NODE_ENV === 'production';

function resolveSecret() {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  if (isProd) {
    console.error('FATAL: JWT_SECRET is not set in production. Refusing to start.');
    process.exit(1);
  }
  console.warn(
    'WARNING: JWT_SECRET is not set. Using an insecure dev default. ' +
      'Set JWT_SECRET in .env before any real deployment.'
  );
  return 'dev-only-secret-do-not-use-in-production';
}

export const JWT_SECRET = resolveSecret();
export const JWT_EXPIRY = '24h';

export function signToken(user) {
  return jwt.sign(
    { id: user.id, name: user.name, phone: user.phone, role: user.role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRY }
  );
}

// Attach req.user from a Bearer token. 401 when missing/invalid/expired.
export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Authentication required.' });
  }
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    return next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
}

// Role gate. Usage: requireRole('runner'), requireRole('customer', 'admin').
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'You do not have permission for this action.' });
    }
    return next();
  };
}
