import type { AppConfig } from '../config/env';
import type { AppStore } from '../data/store';
import type { createServices } from '../services/create-services';
import type { AuthenticatedUser } from '../types';
import type { RequestContext } from '../shared/router';

export interface AppContext {
  config: AppConfig;
  store: AppStore;
  services: ReturnType<typeof createServices>;
}

export type AppRequestContext = RequestContext<AppContext> & {
  currentUser?: AuthenticatedUser;
};
