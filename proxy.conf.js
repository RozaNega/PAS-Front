const PROXY_CONFIG = [
  {
    context: ['/api/Notifications/send-email', '/api/Notifications', '/api/Auth/forgot-password', '/api/Auth/reset-password'],
    target: 'http://127.0.0.1:5030',
    secure: false,
    changeOrigin: true,
    logLevel: 'debug',
    bypass: function (req, res, proxyOptions) {
      console.log('[PROXY:EMAIL] Request:', req.method, req.url);
    },
  },
  {
    context: ['/api'],
    target: 'http://127.0.0.1:5028',
    secure: false,
    changeOrigin: true,
    logLevel: 'debug',
    bypass: function (req, res, proxyOptions) {
      console.log('[PROXY:API] Request:', req.method, req.url);
    },
  },
  {
    context: ['/hubs'],
    target: 'http://127.0.0.1:5028',
    secure: false,
    changeOrigin: true,
    ws: true,
    logLevel: 'debug',
  },
];

module.exports = PROXY_CONFIG;
