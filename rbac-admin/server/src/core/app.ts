import { randomUUID } from 'node:crypto';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { loadConfig } from '../config/env';
import { createSeedData } from '../data/seed';
import { AppStore } from '../data/store';
import { sendJson, parseQuery, readJsonBody, setCorsHeaders } from '../shared/http';
import { HttpError } from '../shared/errors';
import { Router } from '../shared/router';
import { createServices } from '../services/create-services';
import type { AppContext, AppRequestContext } from './context';
import { registerRoutes } from '../modules/register-routes';

export function createApp() {
  const config = loadConfig();
  const store = new AppStore(createSeedData());
  const services = createServices(store, config);
  const appContext: AppContext = { config, store, services };
  const router = new Router<AppContext>();
  registerRoutes(router);

  const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    const requestId = req.headers['x-request-id']?.toString() || randomUUID();
    const startedAt = Date.now();
    res.setHeader('X-Request-Id', requestId);
    setCorsHeaders(req, res, config.allowedOrigins);

    if (req.method === 'OPTIONS') {
      res.statusCode = 204;
      res.end();
      return;
    }

    try {
      const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
      const match = router.match(req.method || 'GET', url.pathname);
      if (!match) {
        throw new HttpError(404, `未找到接口：${req.method} ${url.pathname}`, 404);
      }

      const body = await readJsonBody(req);
      const context: AppRequestContext = {
        app: appContext,
        req,
        res,
        requestId,
        path: url.pathname,
        query: parseQuery(req.url || '/'),
        params: match.params,
        body,
      };

      if (match.route.auth || match.route.permission) {
        const currentUser = services.authService.authenticate(req.headers);
        context.currentUser = currentUser;
        if (match.route.permission) {
          services.accessService.assertPermission(currentUser, match.route.permission);
        }
      }

      const result = await match.route.handler(context);
      sendJson(res, result?.statusCode || 200, {
        code: 0,
        message: result?.message || 'success',
        data: result?.data,
        requestId,
      });
    } catch (error) {
      const httpError = error instanceof HttpError
        ? error
        : new HttpError(500, error instanceof Error ? error.message : '服务器内部错误', 500);

      sendJson(res, httpError.status, {
        code: httpError.code,
        message: httpError.message,
        details: httpError.details,
        requestId,
      });
    } finally {
      const duration = Date.now() - startedAt;
      const status = res.statusCode || 500;
      console.log(`[api] ${status} ${req.method} ${req.url} ${duration}ms #${requestId}`);
    }
  });

  return {
    config,
    store,
    services,
    server,
  };
}
