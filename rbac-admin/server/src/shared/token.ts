import { createHmac, timingSafeEqual } from 'node:crypto';
import { unauthorized } from './errors';

interface TokenPayload {
  sessionId: string;
  userId: string;
  exp: number;
}

function toBase64Url(value: string): string {
  return Buffer.from(value, 'utf-8').toString('base64url');
}

function fromBase64Url(value: string): string {
  return Buffer.from(value, 'base64url').toString('utf-8');
}

function sign(input: string, secret: string): string {
  return createHmac('sha256', secret).update(input).digest('base64url');
}

export function issueToken(payload: TokenPayload, secret: string): string {
  const encoded = toBase64Url(JSON.stringify(payload));
  const signature = sign(encoded, secret);
  return `${encoded}.${signature}`;
}

export function verifyToken(token: string, secret: string): TokenPayload {
  const [encoded, signature] = token.split('.');
  if (!encoded || !signature) unauthorized('令牌格式不正确');

  const expected = sign(encoded, secret);
  const isValid = timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  if (!isValid) unauthorized('令牌签名校验失败');

  const payload = JSON.parse(fromBase64Url(encoded)) as TokenPayload;
  if (!payload.exp || Date.now() > payload.exp * 1000) {
    unauthorized('登录状态已过期，请重新登录');
  }

  return payload;
}
