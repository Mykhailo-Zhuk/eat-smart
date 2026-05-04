import jwt from 'jsonwebtoken';

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET ?? 'fallback-access-secret-change-in-production';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET ?? 'fallback-refresh-secret-change-in-production';

interface TokenPayload {
  userId: string;
  iat?: number;
  exp?: number;
}

export function generateAccessToken(userId: string): string {
  return jwt.sign({ userId }, ACCESS_SECRET, { expiresIn: '15m' });
}

export function generateRefreshToken(userId: string): string {
  return jwt.sign({ userId }, REFRESH_SECRET, { expiresIn: '30d' });
}

export function verifyAccessToken(token: string): { userId: string } | null {
  try {
    const payload = jwt.verify(token, ACCESS_SECRET) as TokenPayload;
    return { userId: payload.userId };
  } catch {
    return null;
  }
}

export function verifyRefreshToken(token: string): { userId: string } | null {
  try {
    const payload = jwt.verify(token, REFRESH_SECRET) as TokenPayload;
    return { userId: payload.userId };
  } catch {
    return null;
  }
}
