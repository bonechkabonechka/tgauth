import * as jwt from 'jsonwebtoken';

export interface JWTPayload {
  id: string;
  tg_id: number;
  roles: string[];
}

const ACCESS_TOKEN_SECRET = process.env.JWT_ACCESS_SECRET || 'your-access-secret-change-in-production';
const REFRESH_TOKEN_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-change-in-production';

const ACCESS_TOKEN_EXPIRES_IN = '5m';
const REFRESH_TOKEN_EXPIRES_IN = '7d';

/**
 * Создает пару JWT токенов (access + refresh)
 */
export function createTokens(payload: JWTPayload): { accessToken: string; refreshToken: string } {
  const accessToken = jwt.sign(payload, ACCESS_TOKEN_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRES_IN,
  });

  const refreshToken = jwt.sign(payload, REFRESH_TOKEN_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRES_IN,
  });

  return { accessToken, refreshToken };
}

/**
 * Верифицирует access token
 */
export function verifyAccessToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, ACCESS_TOKEN_SECRET) as JWTPayload;
  } catch (error) {
    return null;
  }
}

/**
 * Верифицирует refresh token
 */
export function verifyRefreshToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, REFRESH_TOKEN_SECRET) as JWTPayload;
  } catch (error) {
    return null;
  }
}

/**
 * Обновляет access token используя refresh token
 */
export function refreshAccessToken(refreshToken: string): { accessToken: string; refreshToken: string } | null {
  const payload = verifyRefreshToken(refreshToken);
  
  if (!payload) {
    return null;
  }

  // Создаем новую пару токенов
  return createTokens(payload);
}