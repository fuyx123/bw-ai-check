import type { IncomingHttpHeaders } from 'node:http';
import { conflict, forbidden, unauthorized } from '../shared/errors';
import { issueToken, verifyToken } from '../shared/token';
import type { AppConfig } from '../config/env';
import type { AppStore } from '../data/store';
import type { AuthenticatedUser, LoginPayload, UserRecord } from '../types';
import { AccessService } from './access-service';

const DEFAULT_PASSWORD = '123456';
const ADMIN_PASSWORD = 'admin123';

export class AuthService {
  constructor(
    private readonly store: AppStore,
    private readonly config: AppConfig,
    private readonly accessService: AccessService,
  ) {}

  private resolveLogin(loginKey: string): string {
    const normalized = loginKey.trim();
    if (normalized === 'admin') return 'E001';
    if (normalized === 'teacher') return 'T10101';
    if (normalized === 'dean') return 'E101';
    return normalized;
  }

  private getExpectedPassword(user: UserRecord): string {
    if (user.loginId === 'E001') return ADMIN_PASSWORD;
    return DEFAULT_PASSWORD;
  }

  private ensureLoginAllowed(user: UserRecord): void {
    if (!user.isActive) {
      forbidden('账号已禁用，请联系管理员');
    }
    if (user.accessStatus === 'inactive') {
      forbidden('账号当前无权限访问系统');
    }
  }

  login(payload: LoginPayload) {
    const identifier = (payload.loginId || payload.username || '').trim();
    if (!identifier) {
      unauthorized('请输入账号或学号/职工号');
    }

    const resolvedLogin = this.resolveLogin(identifier);
    const user = this.store.users.find((entry) => entry.loginId === resolvedLogin);
    if (!user) {
      unauthorized('账号或密码错误');
    }

    if (payload.userType && user.userType !== payload.userType) {
      unauthorized('账号类型与登录入口不匹配');
    }

    this.ensureLoginAllowed(user);

    if (payload.password !== this.getExpectedPassword(user)) {
      unauthorized('账号或密码错误');
    }

    const sessionId = this.store.createId('sess');
    const issuedAt = this.store.now();
    const expiresAt = new Date(Date.now() + this.config.tokenTtlSeconds * 1000).toISOString();

    this.store.sessions.set(sessionId, {
      id: sessionId,
      userId: user.id,
      issuedAt,
      expiresAt,
    });

    const token = issueToken(
      {
        sessionId,
        userId: user.id,
        exp: Math.floor(Date.parse(expiresAt) / 1000),
      },
      this.config.tokenSecret,
    );

    const currentUser = this.accessService.toAuthenticatedUser(user);

    return {
      token,
      user: {
        id: currentUser.id,
        name: currentUser.name,
        email: currentUser.email,
        avatar: currentUser.avatar || null,
        role: currentUser.role,
        roleId: currentUser.roleId,
        dataScope: currentUser.dataScope,
        permissions: currentUser.permissions,
        loginId: currentUser.loginId,
        userType: currentUser.userType,
      },
      expiresIn: this.config.tokenTtlSeconds,
    };
  }

  authenticate(headers: IncomingHttpHeaders): AuthenticatedUser {
    const authorization = headers.authorization;
    if (!authorization?.startsWith('Bearer ')) {
      unauthorized();
    }

    const token = authorization.slice(7).trim();
    const payload = verifyToken(token, this.config.tokenSecret);
    const session = this.store.sessions.get(payload.sessionId);
    if (!session) {
      unauthorized();
    }

    if (session.expiresAt < this.store.now()) {
      this.store.sessions.delete(session.id);
      unauthorized('登录状态已过期，请重新登录');
    }

    const user = this.accessService.getUserById(payload.userId);
    if (!user) {
      this.store.sessions.delete(session.id);
      unauthorized('登录用户不存在');
    }

    this.ensureLoginAllowed(user);
    return this.accessService.toAuthenticatedUser(user);
  }

  logout(headers: IncomingHttpHeaders): void {
    const authorization = headers.authorization;
    if (!authorization?.startsWith('Bearer ')) return;

    const token = authorization.slice(7).trim();
    const payload = verifyToken(token, this.config.tokenSecret);
    this.store.sessions.delete(payload.sessionId);
  }

  invalidateUserSessions(userId: string): void {
    for (const [sessionId, session] of this.store.sessions.entries()) {
      if (session.userId === userId) {
        this.store.sessions.delete(sessionId);
      }
    }
  }

  ensureUniqueLogin(loginId: string, excludeUserId?: string): void {
    const duplicate = this.store.users.find((user) => user.loginId === loginId && user.id !== excludeUserId);
    if (duplicate) {
      conflict(`登录凭证已存在：${loginId}`);
    }
  }
}
