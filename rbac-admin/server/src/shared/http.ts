import type { IncomingMessage, ServerResponse } from 'node:http';
import { HttpError } from './errors';

export type QueryValue = string | string[] | undefined;
export type QueryParams = Record<string, QueryValue>;

export interface JsonSuccessPayload {
  code?: number;
  message?: string;
  data?: unknown;
  requestId?: string;
}

export interface JsonErrorPayload {
  code: number;
  message: string;
  details?: unknown;
  requestId?: string;
}

export function setCorsHeaders(
  req: IncomingMessage,
  res: ServerResponse,
  allowedOrigins: string[],
): void {
  const origin = req.headers.origin;
  const allowOrigin = origin && allowedOrigins.includes(origin) ? origin : allowedOrigins[0] || '*';

  res.setHeader('Access-Control-Allow-Origin', allowOrigin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Request-Id');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
}

export function sendJson(
  res: ServerResponse,
  statusCode: number,
  payload: JsonSuccessPayload | JsonErrorPayload,
): void {
  if (res.writableEnded) return;
  const body = JSON.stringify(payload);
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(body);
}

export async function readJsonBody<T>(req: IncomingMessage): Promise<T | undefined> {
  const method = req.method?.toUpperCase();
  if (!method || ['GET', 'HEAD'].includes(method)) {
    return undefined;
  }

  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  if (chunks.length === 0) {
    return undefined;
  }

  const raw = Buffer.concat(chunks).toString('utf-8').trim();
  if (!raw) {
    return undefined;
  }

  try {
    return JSON.parse(raw) as T;
  } catch (error) {
    throw new HttpError(400, '请求体不是合法的 JSON', 400, error);
  }
}

export function parseQuery(urlString: string): QueryParams {
  const query = new URL(urlString, 'http://localhost').searchParams;
  const result: QueryParams = {};

  for (const key of query.keys()) {
    const values = query.getAll(key);
    result[key] = values.length <= 1 ? values[0] : values;
  }

  return result;
}

export function getQueryString(query: QueryParams, key: string): string | undefined {
  const value = query[key];
  return Array.isArray(value) ? value[0] : value;
}
