import { APP_BASE_HREF } from '@angular/common';
import { CommonEngine } from '@angular/ssr/node';
import express from 'express';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import nodemailer from 'nodemailer';
import AppServerModule from './src/main.server';

const DOTNET_BACKEND = (process.env.API_BASE_URL || process.env['PAS_API_ORIGIN'] || 'http://localhost:5028').replace(/\/api\/?$/i, '');

export function app(): express.Express {
  const server = express();
  const serverDistFolder = dirname(fileURLToPath(import.meta.url));
  const browserDistFolder = resolve(serverDistFolder, '../browser');
  const indexHtml = join(serverDistFolder, 'index.server.html');
  const workspaceAssetsFolder = resolve(process.cwd(), 'src', 'assets');
  const publicAssetsFolder = resolve(process.cwd(), 'public');

  const commonEngine = new CommonEngine();

  server.use(express.json());
  server.use(express.urlencoded({ extended: true }));
  server.set('view engine', 'html');
  server.set('views', browserDistFolder);

  // ─── SMTP helper (real email sending) ─────────────────────────────────
  function getSmtpTransport() {
    const host = process.env.SMTP_HOST || 'smtp.gmail.com';
    const port = parseInt(process.env.SMTP_PORT || '587', 10);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    if (!user || !pass) return null;
    return nodemailer.createTransport({ host, port, secure: port === 465, auth: { user, pass } });
  }

  // ─── Send Email (Notifications) ──────────────────────────────────────
  server.post('/api/Notifications/send-email', express.json(), async (req, res) => {
    const { to, subject, body } = req.body || {};
    if (!to || !subject || !body) {
      return res.status(400).json({ success: false, message: 'Missing required fields: to, subject, body', statusCode: 400 });
    }
    if (!to.includes('@')) {
      return res.status(400).json({
        success: false, message: 'Send-email requires a real email address in the "to" field (got a userId instead). The frontend must pass the resolved email.', statusCode: 400,
      });
    }
    const transport = getSmtpTransport();
    if (!transport) {
      console.log(`[SSR] Email not sent (SMTP not configured). Would send to ${to}: "${subject}"`);
      return res.json({ success: true, message: 'Email logged (SMTP not configured)', statusCode: 200, data: { to, subject, body } });
    }
    try {
      const info = await transport.sendMail({
        from: process.env.SMTP_FROM || 'noreply@afrocom.com',
        to,
        subject: `[PAS] ${subject}`,
        html: body.replace(/\n/g, '<br>'),
      });
      console.log(`[SSR] Email sent to ${to}: ${info.messageId}`);
      res.json({ success: true, message: 'Email sent', statusCode: 200, data: { messageId: info.messageId } });
    } catch (err: any) {
      console.error(`[SSR] Email send failed for ${to}:`, err.message);
      res.status(500).json({ success: false, message: `Email send failed: ${err.message}`, statusCode: 500 });
    }
  });

  // ─── Send verification email helper (used by .NET backend proxy) ────
  server.post('/api/Notifications/send-verification', express.json(), async (req, res) => {
    const { email, name, token } = req.body || {};
    if (!email || !token) {
      return res.status(400).json({ success: false, message: 'Missing email or token', statusCode: 400 });
    }
    const transport = getSmtpTransport();
    const link = `${process.env.APP_URL || 'http://localhost:4200'}/auth/verify-email?token=${token}`;
    const html = `
      <h2>Welcome to PAS, ${name || 'User'}!</h2>
      <p>Please verify your email address by clicking the link below:</p>
      <p><a href="${link}" style="display:inline-block;padding:12px 24px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px">Verify Email</a></p>
      <p>Or copy this link: <br/>${link}</p>
      <p>This link expires in 24 hours.</p>
    `;
    if (!transport) {
      console.log(`[SSR] Verification email for ${email}: ${link}`);
      return res.json({ success: true, message: 'Verification email logged', statusCode: 200, data: { link } });
    }
    try {
      const info = await transport.sendMail({
        from: process.env.SMTP_FROM || 'noreply@afrocom.com',
        to: email,
        subject: '[PAS] Verify your email address',
        html,
      });
      console.log(`[SSR] Verification email sent to ${email}: ${info.messageId}`);
      res.json({ success: true, message: 'Verification email sent', statusCode: 200, data: { messageId: info.messageId } });
    } catch (err: any) {
      console.error(`[SSR] Verification email failed for ${email}:`, err.message);
      res.status(500).json({ success: false, message: `Verification email failed: ${err.message}`, statusCode: 500 });
    }
  });

  // ─── Proxy all /api/* to .NET backend ───────────────────────────────
  server.use('/api', async (req, res) => {
    const backendUrl = `${DOTNET_BACKEND}${req.originalUrl}`;
    try {
      const fetchOpts: any = {
        method: req.method,
        headers: {
          'Content-Type': 'application/json',
          ...Object.fromEntries(
            Object.entries(req.headers).filter(
              ([k]) => !['host', 'connection', 'content-length'].includes(k),
            ),
          ),
        },
      };
      if (req.method !== 'GET' && req.method !== 'HEAD' && Object.keys(req.body || {}).length > 0) {
        fetchOpts.body = JSON.stringify(req.body);
      }
      const response = await fetch(backendUrl, fetchOpts);
      const text = await response.text();
      let data;
      try { data = text ? JSON.parse(text) : null; } catch { data = text; }
      res.status(response.status).json(data || { success: false, message: 'Empty response', statusCode: response.status });
    } catch (err: any) {
      console.error(`[SSR] Proxy failed for ${req.originalUrl}:`, err.message);
      res.status(502).json({ success: false, message: `Backend unavailable: ${err.message}`, statusCode: 502 });
    }
  });

  // ─── Static files ──────────────────────────────────────────────────
  server.use('/assets', express.static(workspaceAssetsFolder, { maxAge: '1y', index: false, redirect: false }));
  server.use('/assets', express.static(publicAssetsFolder, { maxAge: '1y', index: false, redirect: false }));
  server.get('*.*', express.static(browserDistFolder, { maxAge: '1y' }));

  // ─── Angular SSR rendering ─────────────────────────────────────────
  server.get('*', (req, res, next) => {
    const { protocol, originalUrl, baseUrl, headers } = req;
    commonEngine
      .render({
        bootstrap: AppServerModule,
        documentFilePath: indexHtml,
        url: `${protocol}://${headers.host}${originalUrl}`,
        publicPath: browserDistFolder,
        providers: [{ provide: APP_BASE_HREF, useValue: baseUrl }],
      })
      .then((html: string) => res.send(html))
      .catch((err: Error) => next(err));
  });

  return server;
}

async function run(): Promise<void> {
  const port = process.env['PORT'] || 4000;
  const server = app();
  server.listen(port, () => {
    console.log(`[SSR] PAS server listening on http://localhost:${port}`);
    console.log(`[SSR] Proxying /api/* to ${DOTNET_BACKEND}`);
  });
}

run();
