/**
 * Default API base (relative). Override in the browser when needed:
 * `localStorage.setItem('pas.apiUrl', 'http://localhost:5028/api')` then reload.
 * Dev servers: `ng serve` uses `proxy.conf.json` to forward `/api` → backend (port 5028).
 */
export const environment = {
  production: false,
  apiUrl: '/api',
  hubUrl: '/hubs',
  appTitle: 'Asset Management Platform',
  version: '1.0.0',
  tokenKey: 'pas_token',
  refreshTokenKey: 'pas_refresh_token',
  userKey: 'pas_user',
  /** Optional JWT `sub` of the approver; must match manager login when not using default `mgr_001`. */
  defaultManagerQueueId: '' as string,
};

