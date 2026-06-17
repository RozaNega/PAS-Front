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
import { promises as fs } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { createTransport, type Transporter } from 'nodemailer';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const browserDistFolder = join(import.meta.dirname, '../browser');
const workspaceAssetsFolder = join(process.cwd(), 'src', 'assets');
const publicAssetsFolder = join(process.cwd(), 'public');

const app = express();
const angularApp = new AngularNodeAppEngine();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const dashboardStatisticsResponse = {
  success: true,
  message: 'Dashboard statistics loaded successfully.',
  statusCode: 200,
  data: {
    platform: {
      badge: 'Operations Platform 2026',
      title: "AFRICOM'S TECHNOLOGIES",
      since: 'SINCE 2004',
      subtitle:
        'Coordinate assets, inventory, and requisitions from one command layer with policy-driven workflows and real-time visibility for every department.',
    },
    liveAttendees: {
      total: 14666,
      trendPercent: 12.5,
      trendDirection: 'up',
      comparisonLabel: 'vs last month',
      countdown: {
        days: 20,
        hours: 14,
        minutes: 6,
        seconds: 37,
        untilLabel: 'Until May 14th, 2026',
      },
    },
    highlights: [
      {
        value: '500+',
        label: 'Active Sites',
        note: 'Across all regions',
      },
      {
        value: '99.9%',
        label: 'Data Accuracy',
        note: 'Trusted and verified',
      },
      {
        value: '24/7',
        label: 'Operations Visibility',
        note: 'Real-time monitoring',
      },
    ],
  },
};

// ---------- SMTP / Email setup ----------
const _envPath = resolve(process.cwd(), '.env');
if (existsSync(_envPath)) {
  const _content = readFileSync(_envPath, 'utf8');
  for (const _line of _content.split('\n')) {
    const _t = _line.trim();
    if (!_t || _t.startsWith('#')) continue;
    const _eq = _t.indexOf('=');
    if (_eq === -1) continue;
    const _k = _t.slice(0, _eq).trim();
    let _v = _t.slice(_eq + 1).trim();
    if ((_v.startsWith('"') && _v.endsWith('"')) || (_v.startsWith("'") && _v.endsWith("'"))) _v = _v.slice(1, -1);
    if (!process.env[_k]) process.env[_k] = _v;
  }
}

let _transporter: Transporter | null = null;
if (process.env['SMTP_USER'] && process.env['SMTP_PASS']) {
  _transporter = createTransport({
    host: process.env['SMTP_HOST'] || 'smtp.gmail.com',
    port: parseInt(process.env['SMTP_PORT'] || '587', 10),
    secure: process.env['SMTP_PORT'] === '465',
    auth: { user: process.env['SMTP_USER'], pass: process.env['SMTP_PASS'] },
    tls: { rejectUnauthorized: false },
    family: 4,
  } as any);
  _transporter.verify()
    .then(() => console.log('[server.ts] SMTP verified for', process.env['SMTP_USER']))
    .catch((err: Error) => console.error('[server.ts] SMTP verify failed:', err.message));
}

async function _sendEmail(to: string, subject: string, body: string): Promise<{ messageId: string }> {
  const displayName = process.env['SMTP_FROM'] || 'Africom-PAS';
  const fromAddr = process.env['SMTP_USER'] || 'noreply@afrocom.com';
  const from = { name: displayName, address: fromAddr };
  if (_transporter) {
    const info = await _transporter.sendMail({ from, to, subject, text: body });
    console.log('[server.ts] Email sent to', to, '- ID:', info.messageId);
    return info;
  }
  console.log('[server.ts] --- EMAIL (no SMTP) ---');
  console.log('To:', to, 'Subject:', subject);
  return { messageId: 'console-' + Date.now() };
}

app.post('/api/Notifications/send-email', async (req, res, next) => {
  try {
    const { to, subject, body } = req.body || {};
    if (!to || !subject || !body) { res.status(400).json({ success: false, message: 'Missing to, subject, body' }); return; }
    await _sendEmail(to, subject, body);
    res.json({ success: true, message: 'Email sent' });
  } catch (err: unknown) {
    res.status(500).json({ success: false, message: err instanceof Error ? err.message : 'Error' });
  }
});

app.post('/api/Notifications', async (req, res) => {
  try {
    const { to, subject, body } = req.body || {};
    if (!to || !subject || !body) { res.status(400).json({ success: false, message: 'Missing to, subject, body' }); return; }
    await _sendEmail(to, subject, body);
    res.json({ success: true, message: 'Notification sent' });
  } catch (err: unknown) {
    res.status(500).json({ success: false, message: err instanceof Error ? err.message : 'Error' });
  }
});

app.get('/api/Notifications', async (_req, res) => {
  res.json({ success: true, data: [] });
});

app.post('/api/Auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email) { res.status(400).json({ success: false, message: 'Email required' }); return; }
    const link = `http://localhost:4200/reset-password?token=mock-${Date.now()}&email=${encodeURIComponent(email)}`;
    await _sendEmail(email, 'Password Reset Request', `Click: ${link}`);
    res.json({ success: true, message: 'Reset link sent', data: { token: 'mock-' + Date.now() } });
  } catch (err: unknown) {
    res.status(500).json({ success: false, message: err instanceof Error ? err.message : 'Error' });
  }
});

app.post('/api/Auth/reset-password', async (_req, res) => {
  res.json({ success: true, message: 'Password reset successful' });
});

// ---------- Additional Auth Endpoints (dev mock) ----------

app.get('/api/Auth/me', async (_req, res) => {
  res.json({ success: true, data: { id: 'dev-user-001', email: 'dev@example.com', userName: 'DevUser', fullName: 'Dev User', roles: ['Admin'], twoFactorEnabled: true, emailConfirmed: true }, statusCode: 200 });
});

app.get('/api/Auth/confirm-email', async (req, res) => {
  const token = req.query['token'];
  if (!token) { res.status(400).json({ success: false, message: 'Invalid or missing token.', statusCode: 400 }); return; }
  res.json({ success: true, message: 'Email confirmed successfully.', statusCode: 200 });
});

app.post('/api/Auth/enable-2fa', async (req, res) => {
  const { method, contactInfo } = req.body || {};
  if (!method || !contactInfo) { res.status(400).json({ success: false, message: 'method and contactInfo are required.', statusCode: 400 }); return; }
  res.json({ success: true, message: '2FA enabled successfully.', statusCode: 200 });
});

app.post('/api/Auth/disable-2fa', async (_req, res) => {
  res.json({ success: true, message: '2FA disabled successfully.', statusCode: 200 });
});

app.post('/api/Auth/resend-verification', async (req, res) => {
  const { email } = req.body || {};
  if (!email) { res.status(400).json({ success: false, message: 'Email is required.', statusCode: 400 }); return; }
  res.json({ success: true, message: 'Verification email resent.', statusCode: 200 });
});

app.post('/api/Auth/send-phone-otp', async (req, res) => {
  const { phoneNumber } = req.body || {};
  if (!phoneNumber) { res.status(400).json({ success: false, message: 'Phone number is required.', statusCode: 400 }); return; }
  res.json({ success: true, message: 'OTP sent to phone.', otp: '123456', statusCode: 200 });
});

app.post('/api/Auth/verify-phone-otp', async (req, res) => {
  const { phoneNumber, otp } = req.body || {};
  if (!phoneNumber || !otp) { res.status(400).json({ success: false, message: 'Phone number and OTP are required.', statusCode: 400 }); return; }
  res.json({ success: true, message: 'Phone number verified successfully.', statusCode: 200 });
});

app.post('/api/Auth/logout', async (_req, res) => {
  res.json({ success: true, message: 'Logged out successfully.', statusCode: 200 });
});

app.post('/api/Auth/refresh-token', async (req, res) => {
  const { token } = req.body || {};
  res.json({ success: true, message: 'Token refreshed.', data: { token: token || 'mock-refreshed-token', refreshToken: 'mock-refresh-token' }, statusCode: 200 });
});

app.post('/api/Auth/change-password', async (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (!currentPassword || !newPassword) { res.status(400).json({ success: false, message: 'Current and new password are required.', statusCode: 400 }); return; }
  if (newPassword.length < 6) { res.status(400).json({ success: false, message: 'Password must be at least 6 characters.', statusCode: 400 }); return; }
  res.json({ success: true, message: 'Password changed successfully.', statusCode: 200 });
});

app.post('/api/Auth/upload-profile-photo', async (req, res) => {
  res.json({ success: true, message: 'Profile photo uploaded.', data: { photoUrl: '/uploads/photo-' + Date.now() + '.jpg' }, statusCode: 200 });
});

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

app.post('/api/landing/contact', async (req, res) => {
  const name = String(req.body?.name ?? '').trim();
  const email = String(req.body?.email ?? '').trim();
  const message = String(req.body?.message ?? '').trim();

  if (!email || message.length < 10) {
    return res.status(400).json({
      success: false,
      message: 'Invalid request.',
      data: null,
    });
  }

  const id = randomUUID();
  const entry = {
    id,
    name,
    email,
    message,
    createdAt: new Date().toISOString(),
  };

  try {
    const outDir = join(process.cwd(), '.tmp');
    const outFile = join(outDir, 'contact-submissions.jsonl');
    await fs.mkdir(outDir, { recursive: true });
    await fs.appendFile(outFile, JSON.stringify(entry) + '\n', 'utf8');
  } catch (err) {
    // Non-fatal: still return success, but log server-side.
    console.error('Failed to persist contact submission', err);
  }

  return res.status(200).json({
    success: true,
    message: 'Thanks — we received your message.',
    data: { id },
  });
});

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
    console.log('Auth Endpoints:');
    console.log('  POST /api/Auth/login                - Login');
    console.log('  POST /api/Auth/register              - Register new user');
    console.log('  POST /api/Auth/logout                - Logout');
    console.log('  POST /api/Auth/refresh-token         - Refresh JWT token');
    console.log('  POST /api/Auth/change-password       - Change password');
    console.log('  POST /api/Auth/forgot-password       - Send reset email');
    console.log('  POST /api/Auth/reset-password        - Reset password');
    console.log('  POST /api/Auth/resend-verification   - Resend email confirmation');
    console.log('  GET  /api/Auth/me                    - Get current user profile');
    console.log('  GET  /api/Auth/confirm-email         - Confirm email');
    console.log('  POST /api/Auth/enable-2fa            - Enable 2FA');
    console.log('  POST /api/Auth/disable-2fa           - Disable 2FA');
    console.log('  POST /api/Auth/send-phone-otp        - Send OTP');
    console.log('  POST /api/Auth/verify-phone-otp      - Verify OTP');
    console.log('  POST /api/Auth/upload-profile-photo  - Upload profile photo');
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);
