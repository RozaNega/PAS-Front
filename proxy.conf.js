const PROXY_CONFIG = {
  '/api': {
    target: 'http://127.0.0.1:5028',
    secure: false,
    changeOrigin: true,
    logLevel: 'debug',
    bypass: function (req, res, proxyOptions) {
      // Log all requests
      console.log('[PROXY] Request:', req.method, req.url);
    },
  },
  '/hubs': {
    target: 'http://127.0.0.1:5028',
    secure: false,
    changeOrigin: true,
    ws: true,
    logLevel: 'debug',
  },
};

module.exports = PROXY_CONFIG;
