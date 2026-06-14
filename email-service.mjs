import express from 'express';
import nodemailer from 'nodemailer';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { readFileSync, existsSync } from 'fs';
import http from 'http';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, '.env');
if (existsSync(envPath)) {
  const envContent = readFileSync(envPath, 'utf8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let val = trimmed.slice(eqIdx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

const app = express();
app.use(express.json());
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

let transporter = null;
if (process.env.SMTP_USER && process.env.SMTP_PASS) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_PORT === '465',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    tls: { rejectUnauthorized: false },
  });

  transporter.verify().then(() => {
    console.log('SMTP connection verified successfully for', process.env.SMTP_USER);
  }).catch((err) => {
    console.error('SMTP VERIFICATION FAILED:', err.message);
    console.error('Check that SMTP_USER and SMTP_PASS in .env are correct.');
    console.error('For Gmail, use an App Password (not your regular password).');
  });
} else {
  console.log('SMTP credentials not set. Emails will be logged to console.');
}

async function sendEmail({ to, subject, body }) {
  const from = process.env.SMTP_FROM || 'noreply@afrocom.com';
  if (transporter) {
    try {
      const info = await transporter.sendMail({ from, to, subject, text: body });
      console.log('Email sent to', to, '- MessageID:', info.messageId);
      if (info.rejected && info.rejected.length) console.log('REJECTED:', info.rejected);
      if (info.pending && info.pending.length) console.log('PENDING:', info.pending);
      return info;
    } catch (sendErr) {
      console.error('sendMail error:', sendErr);
      throw sendErr;
    }
  }
  console.log('--- EMAIL (no SMTP) ---');
  console.log('From:', from);
  console.log('To:', to);
  console.log('Subject:', subject);
  console.log('Body:');
  console.log(body);
  console.log('--- END EMAIL ---');
  return { messageId: 'console-' + Date.now() };
}

app.post('/api/Notifications/send-email', async (req, res) => {
  try {
    const { to, subject, body } = req.body || {};
    if (!to || !subject || !body) {
      return res.status(400).json({ success: false, message: 'Missing required fields: to, subject, body' });
    }
    const info = await sendEmail({ to, subject, body });
    res.json({ success: true, message: 'Email sent', data: { messageId: info.messageId } });
  } catch (err) {
    console.error('send-email error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/Notifications', async (req, res) => {
  try {
    const { to, subject, body } = req.body || {};
    if (!to || !subject || !body) {
      return res.status(400).json({ success: false, message: 'Missing required fields: to, subject, body' });
    }
    const info = await sendEmail({ to, subject, body });
    res.json({ success: true, message: 'Email sent', data: { messageId: info.messageId } });
  } catch (err) {
    console.error('send-notification error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/api/Notifications', async (req, res) => {
  res.json({ success: true, data: [] });
});

app.post('/api/Auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }
    const resetLink = `${req.protocol}://${req.hostname}:4200/reset-password?token=mock-token-${Date.now()}&email=${encodeURIComponent(email)}`;
    await sendEmail({
      to: email,
      subject: 'Password Reset Request',
      body: `You requested a password reset.\n\nClick this link to reset your password:\n${resetLink}\n\nIf you did not request this, please ignore this email.`,
    });
    res.json({ success: true, message: 'Reset link sent', data: { token: 'mock-token-' + Date.now() } });
  } catch (err) {
    console.error('forgot-password error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/Auth/reset-password', async (req, res) => {
  res.json({ success: true, message: 'Password reset successful' });
});

app.post('/api/Auth/login', async (req, res) => {
  res.json({ success: true, message: 'Mock login' });
});

const BACKEND_PORT = 5028;

function proxyToBackend(req, res) {
  const options = {
    hostname: '127.0.0.1',
    port: BACKEND_PORT,
    path: req.originalUrl,
    method: req.method,
    headers: { ...req.headers, host: `127.0.0.1:${BACKEND_PORT}`, connection: 'close' },
  };

  const proxyReq = http.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res);
  });

  proxyReq.on('error', (err) => {
    console.error('Proxy error for', req.method, req.originalUrl, '-', err.message);
    res.status(502).json({ success: false, message: `Backend unavailable: ${err.message}` });
  });

  req.pipe(proxyReq);
}

app.use('/api', (req, res, next) => {
  const isEmailPath = req.path.startsWith('/Notifications') || req.path.startsWith('/Auth/forgot-password') || req.path.startsWith('/Auth/reset-password') || req.path.startsWith('/Auth/login');
  if (!isEmailPath) {
    console.log('Proxying to backend:', req.method, req.originalUrl);
    return proxyToBackend(req, res);
  }
  next();
});

const port = 5030;
app.listen(port, () => {
  console.log(`Email service running on http://localhost:${port}`);
  console.log(`Proxying non-email /api requests to http://127.0.0.1:${BACKEND_PORT}`);
  console.log('Endpoints:');
  console.log('  POST /api/Notifications/send-email  - Send a direct email');
  console.log('  POST /api/Notifications             - Send notification email');
  console.log('  GET  /api/Notifications             - List notifications');
  console.log('  POST /api/Auth/forgot-password      - Send password reset email');
  console.log('  POST /api/Auth/reset-password       - Reset password');
});
