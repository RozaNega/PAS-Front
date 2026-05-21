import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { join } from 'node:path';
import { request as httpRequest } from 'node:http';
import { request as httpsRequest } from 'node:https';
import type { IncomingHttpHeaders } from 'node:http';
import type { Request, Response, NextFunction } from 'express';

const browserDistFolder = join(import.meta.dirname, '../browser');
const workspaceAssetsFolder = join(process.cwd(), 'src', 'assets');
const publicAssetsFolder = join(process.cwd(), 'public');

const app = express();
const angularApp = new AngularNodeAppEngine();

/**
 * Forward `/api/*` to the real PAS backend (same role as `proxy.conf.json` during `ng serve`).
 * The previous mock `Dashboard/statistics` response hid `recentActivities` and broke Activity Logs.
 *
 * Set `PAS_API_ORIGIN` when the API is not on http://localhost:5028 (no trailing slash).
 */
function pasApiProxy(req: Request, res: Response, next: NextFunction): void {
  if (!req.originalUrl.startsWith('/api')) {
    next();
    return;
  }

  const apiOrigin = (process.env['PAS_API_ORIGIN'] || 'http://localhost:5028').replace(/\/$/, '');
  let targetUrl: URL;
  try {
    targetUrl = new URL(req.originalUrl, `${apiOrigin}/`);
  } catch {
    res.status(500).json({ success: false, message: 'Invalid PAS_API_ORIGIN or request URL' });
    return;
  }

  const isHttps = targetUrl.protocol === 'https:';
  const lib = isHttps ? httpsRequest : httpRequest;
  const defaultPort = isHttps ? 443 : 80;
  const port = targetUrl.port ? Number(targetUrl.port) : defaultPort;

  const outgoingHeaders: IncomingHttpHeaders = { ...req.headers };
  outgoingHeaders.host = targetUrl.host;
  delete outgoingHeaders['connection'];

  const proxyReq = lib(
    {
      hostname: targetUrl.hostname,
      port,
      path: targetUrl.pathname + targetUrl.search,
      method: req.method,
      headers: outgoingHeaders,
    },
    (proxyRes) => {
      if (!proxyRes.statusCode) {
        res.status(502).end();
        return;
      }
      const hopByHop = new Set([
        'connection',
        'keep-alive',
        'proxy-authenticate',
        'proxy-authorization',
        'te',
        'trailers',
        'transfer-encoding',
        'upgrade',
      ]);
      const outHeaders: Record<string, string | string[]> = {};
      for (const [key, value] of Object.entries(proxyRes.headers)) {
        if (!key || hopByHop.has(key.toLowerCase()) || value === undefined) continue;
        outHeaders[key] = value;
      }
      res.writeHead(proxyRes.statusCode, outHeaders);
      proxyRes.pipe(res);
    },
  );

  proxyReq.on('error', (err) => {
    if (!res.headersSent) {
      res.status(502).json({
        success: false,
        message: `API proxy to ${apiOrigin} failed: ${err.message}`,
      });
    }
  });

  req.pipe(proxyReq);
}

app.use(pasApiProxy);

/**
 * Serve static files from /browser
 */
app.use(
  '/assets',
  express.static(workspaceAssetsFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

app.use(
  '/assets',
  express.static(publicAssetsFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

/**
 * Handle all other requests by rendering the Angular application.
 */
app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) => (response ? writeResponseToNodeResponse(response, res) : next()))
    .catch(next);
});

/**
 * Start the server if this module is the main entry point, or it is ran via PM2.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, (error) => {
    if (error) {
      throw error;
    }

    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);
