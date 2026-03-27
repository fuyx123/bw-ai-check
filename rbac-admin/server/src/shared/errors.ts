export class HttpError extends Error {
  readonly status: number;
  readonly code: number;
  readonly details?: unknown;

  constructor(status: number, message: string, code = status, details?: unknown) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function badRequest(message: string, details?: unknown): never {
  throw new HttpError(400, message, 400, details);
}

export function unauthorized(message = '未认证或登录状态已失效'): never {
  throw new HttpError(401, message, 401);
}

export function forbidden(message = '无权限执行当前操作'): never {
  throw new HttpError(403, message, 403);
}

export function notFound(message = '资源不存在'): never {
  throw new HttpError(404, message, 404);
}

export function conflict(message: string, details?: unknown): never {
  throw new HttpError(409, message, 409, details);
}
