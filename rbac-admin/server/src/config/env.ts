const DEFAULT_PORT = 3000;
const DEFAULT_TOKEN_TTL_SECONDS = 60 * 60 * 12;
const DEFAULT_ALLOWED_ORIGIN = 'http://localhost:5173';

export interface AppConfig {
  port: number;
  host: string;
  tokenSecret: string;
  tokenTtlSeconds: number;
  allowedOrigins: string[];
}

function parsePort(raw?: string): number {
  if (!raw) return DEFAULT_PORT;
  const port = Number(raw);
  return Number.isInteger(port) && port > 0 ? port : DEFAULT_PORT;
}

function parsePositiveInt(raw: string | undefined, fallback: number): number {
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function parseOrigins(raw?: string): string[] {
  const source = raw?.trim() || DEFAULT_ALLOWED_ORIGIN;
  return source
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export function loadConfig(): AppConfig {
  return {
    port: parsePort(process.env.API_PORT || process.env.PORT),
    host: process.env.API_HOST?.trim() || '0.0.0.0',
    tokenSecret: process.env.API_TOKEN_SECRET?.trim() || 'bw-ai-check-dev-secret',
    tokenTtlSeconds: parsePositiveInt(process.env.API_TOKEN_TTL_SECONDS, DEFAULT_TOKEN_TTL_SECONDS),
    allowedOrigins: parseOrigins(process.env.API_ALLOWED_ORIGINS),
  };
}
