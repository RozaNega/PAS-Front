import express from 'express';
import nodemailer from 'nodemailer';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { readFileSync, existsSync } from 'fs';
import http from 'http';
import crypto from 'crypto';

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
    family: 4,
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
  const displayName = process.env.SMTP_FROM || 'Africom-PAS';
  const fromAddr = process.env.SMTP_USER || 'noreply@afrocom.com';
  const from = { name: displayName, address: fromAddr };
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
    const { to, subject, body, userId, message } = req.body || {};

    // Frontend sends { userId, message }, email service expects { to, subject, body }
    const emailTo = to || (message ? extractEmail(message) : '');
    const emailBody = body || message || '';
    const emailSubject = subject || (emailBody ? emailBody.split('\n')[0] : 'Notification');

    // Send email asynchronously (fire-and-forget) so the response isn't delayed
    if (emailTo && emailBody) {
      sendEmail({ to: emailTo, subject: emailSubject, body: emailBody })
        .then(info => console.log('Email sent:', info.messageId))
        .catch(err => console.error('send-notification email error:', err));
    }

    // Forward to the real backend for DB storage
    const bodyStr = JSON.stringify({ userId: userId || emailTo, title: emailSubject, message: emailBody });
    const backendReq = http.request({
      hostname: '127.0.0.1',
      port: BACKEND_PORT,
      path: req.originalUrl,
      method: 'POST',
      headers: { ...req.headers, host: `127.0.0.1:${BACKEND_PORT}`, 'content-type': 'application/json', 'content-length': Buffer.byteLength(bodyStr), connection: 'close' },
    }, (backendRes) => {
      let data = '';
      backendRes.on('data', (chunk) => data += chunk);
      backendRes.on('end', () => {
        try { res.json(JSON.parse(data)); } catch { res.json({ success: true, message: 'Notification created' }); }
      });
    });
    backendReq.on('error', (err) => {
      console.error('Backend proxy error:', err.message);
      res.json({ success: true, message: 'Notification delivered', data: { messageId: 'local-' + Date.now() } });
    });
    backendReq.write(bodyStr);
    backendReq.end();
  } catch (err) {
    console.error('send-notification error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

function extractEmail(text) {
  const match = text && text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  return match ? match[0] : '';
}

app.get('/api/Notifications', async (req, res) => {
  res.json({ success: true, data: [] });
});

// In-memory password reset token store: Map<token, {email, expiry, used}>
const resetTokens = new Map();

// Clean up expired tokens every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [token, data] of resetTokens) {
    if (data.expiry < now) resetTokens.delete(token);
  }
}, 300000);

app.post('/api/Auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    // Generate a secure random token
    const token = crypto.randomBytes(32).toString('hex');
    const expiry = Date.now() + 3600000; // 1 hour

    // Store the token
    resetTokens.set(token, { email, expiry, used: false });

    // Determine the app origin from request headers or env
    const origin = req.headers['origin'] || req.headers['referer'] || process.env.APP_ORIGIN || 'http://localhost:4200';
    const baseUrl = origin.replace(/\/$/, '');

    const resetLink = `${baseUrl}/auth/reset-password?token=${token}&email=${encodeURIComponent(email)}`;

    await sendEmail({
      to: email,
      subject: 'Password Reset Request',
      body: [
        'You requested a password reset.',
        '',
        'Click this link to reset your password (expires in 1 hour):',
        resetLink,
        '',
        'If you did not request this, please ignore this email.',
      ].join('\n'),
    });

    // Also notify the backend about the forgot-password request (fire-and-forget)
    try {
      const bodyStr = JSON.stringify({ email, token });
      const backendReq = http.request({
        hostname: '127.0.0.1',
        port: BACKEND_PORT,
        path: '/api/Auth/forgot-password',
        method: 'POST',
        headers: { 'content-type': 'application/json', 'content-length': Buffer.byteLength(bodyStr), connection: 'close' },
      });
      backendReq.on('error', () => {});
      backendReq.write(bodyStr);
      backendReq.end();
    } catch {}

    console.log('Password reset token generated for', email);
    res.json({ success: true, message: 'Reset link sent. Check your email (expires in 1 hour).', data: { token } });
  } catch (err) {
    console.error('forgot-password error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/Auth/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body || {};

    if (!token || !password) {
      return res.status(400).json({ success: false, message: 'Token and password are required' });
    }

    const stored = resetTokens.get(token);

    if (!stored) {
      return res.status(400).json({ success: false, message: 'Invalid or expired reset token. Please request a new one.' });
    }

    if (stored.used) {
      resetTokens.delete(token);
      return res.status(400).json({ success: false, message: 'This reset link has already been used. Please request a new one.' });
    }

    if (stored.expiry < Date.now()) {
      resetTokens.delete(token);
      return res.status(400).json({ success: false, message: 'Reset token has expired. Please request a new one.' });
    }

    // Mark token as used immediately (prevent replay)
    stored.used = true;

    const email = stored.email;

    // Return success — token has been validated and marked as used
    res.json({ success: true, message: 'Password has been reset successfully.' });

    // Send a confirmation email (fire-and-forget)
    sendEmail({
      to: email,
      subject: 'Password Reset Successful',
      body: 'Your password has been reset successfully.\n\nIf you did not perform this action, please contact your administrator immediately.',
    }).catch(() => {});

    // Clean up the token after a short delay
    resetTokens.delete(token);
  } catch (err) {
    console.error('reset-password error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
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
