export const environment = {
  production: false,
  apiUrl: '/api',
  hubUrl: '/hubs',
  appTitle: 'Asset Management Platform',
  version: '1.0.0',
  tokenKey: 'pas_token',
  refreshTokenKey: 'pas_refresh_token',
  userKey: 'pas_user',
  /** Set to your manager account JWT `sub` so API pending rows and in-app approvals line up. */
  defaultManagerQueueId: '' as string,
};
