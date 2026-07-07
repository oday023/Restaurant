import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import dotenv from 'dotenv';

export const loadEnvironment = () => {
  const candidates = [
    process.env.RESTOHUB_ENV_FILE,
    resolve(process.cwd(), '.env'),
    resolve(process.cwd(), '.env.local'),
    resolve(process.cwd(), '.env.production'),
  ].filter((value): value is string => Boolean(value));

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      dotenv.config({ path: candidate });
      return candidate;
    }
  }

  dotenv.config();
  return null;
};

export const validateStartupEnvironment = () => {
  const errors: string[] = [];
  const nodeEnv = process.env.NODE_ENV ?? 'development';
  const isProduction = nodeEnv === 'production';
  const portValue = Number.parseInt(process.env.PORT ?? '4000', 10);

  if (!Number.isInteger(portValue) || portValue <= 0 || portValue > 65535) {
    errors.push('PORT must be a valid TCP port between 1 and 65535.');
  }

  const jwtSecret = process.env.JWT_SECRET?.trim() ?? (nodeEnv === 'test' ? 'test-jwt-secret-32-chars-minimum-1234' : undefined);
  if (!jwtSecret) {
    errors.push('JWT_SECRET must be set before starting the server.');
  } else if (jwtSecret.length < 32) {
    errors.push('JWT_SECRET must be at least 32 characters long.');
  }

  const cookieSecret = process.env.COOKIE_SECRET?.trim() ?? (nodeEnv === 'test' ? 'test-cookie-secret-32-chars-minimum-5678' : undefined);
  if (!cookieSecret) {
    errors.push('COOKIE_SECRET must be set before starting the server.');
  } else if (cookieSecret.length < 32) {
    errors.push('COOKIE_SECRET must be at least 32 characters long.');
  }

  if (isProduction && !process.env.RESTOHUB_BOOTSTRAP_ADMIN_PASSWORD?.trim()) {
    errors.push('RESTOHUB_BOOTSTRAP_ADMIN_PASSWORD must be set in production.');
  }

  if (isProduction && !process.env.CORS_ORIGINS?.trim()) {
    errors.push('CORS_ORIGINS must be set in production.');
  }

  if (errors.length > 0) {
    throw new Error(`Authentication environment validation failed:\n- ${errors.join('\n- ')}`);
  }

  return {
    port: portValue,
    jwtSecret,
    cookieSecret,
    nodeEnv,
    corsOrigins: process.env.CORS_ORIGINS?.split(',').map((value) => value.trim()).filter(Boolean) ?? ['http://localhost:3000', 'http://127.0.0.1:3000'],
    refreshTokenTtlSeconds: Number.parseInt(process.env.REFRESH_TOKEN_TTL_SECONDS ?? '604800', 10),
    passwordResetTokenTtlSeconds: Number.parseInt(process.env.PASSWORD_RESET_TOKEN_TTL_SECONDS ?? '1800', 10),
    authRateLimitMax: Number.parseInt(process.env.AUTH_RATE_LIMIT_MAX ?? '10', 10),
    apiRateLimitMax: Number.parseInt(process.env.API_RATE_LIMIT_MAX ?? '120', 10),
  };
};
