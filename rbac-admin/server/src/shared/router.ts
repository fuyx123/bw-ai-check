import type { IncomingMessage, ServerResponse } from 'node:http';
import type { QueryParams } from './http';

export interface RequestContext<TApp> {
  app: TApp;
  req: IncomingMessage;
  res: ServerResponse;
  requestId: string;
  path: string;
  query: QueryParams;
  params: Record<string, string>;
  body?: unknown;
  currentUser?: unknown;
}

export interface RouteHandlerResult {
  statusCode?: number;
  message?: string;
  data?: unknown;
}

export interface RouteDefinition<TApp> {
  method: string;
  path: string;
  handler: (context: RequestContext<TApp>) => Promise<RouteHandlerResult | void> | RouteHandlerResult | void;
  auth?: boolean;
  permission?: string | string[];
}

interface RouteMatch<TApp> {
  route: RouteDefinition<TApp>;
  params: Record<string, string>;
}

function trimSlashes(input: string): string {
  return input.replace(/^\/+|\/+$/g, '');
}

export class Router<TApp> {
  private readonly routes: RouteDefinition<TApp>[] = [];

  register(route: RouteDefinition<TApp>): void {
    this.routes.push({
      ...route,
      method: route.method.toUpperCase(),
    });
  }

  match(method: string, pathname: string): RouteMatch<TApp> | undefined {
    const normalizedMethod = method.toUpperCase();
    const normalizedPath = trimSlashes(pathname);
    const inputSegments = normalizedPath ? normalizedPath.split('/') : [];

    for (const route of this.routes) {
      if (route.method !== normalizedMethod) continue;

      const routeSegments = trimSlashes(route.path)
        ? trimSlashes(route.path).split('/')
        : [];

      if (routeSegments.length !== inputSegments.length) continue;

      const params: Record<string, string> = {};
      let matched = true;

      for (let index = 0; index < routeSegments.length; index += 1) {
        const routeSegment = routeSegments[index];
        const inputSegment = inputSegments[index];

        if (routeSegment.startsWith(':')) {
          params[routeSegment.slice(1)] = decodeURIComponent(inputSegment);
          continue;
        }

        if (routeSegment !== inputSegment) {
          matched = false;
          break;
        }
      }

      if (matched) {
        return { route, params };
      }
    }

    return undefined;
  }
}
