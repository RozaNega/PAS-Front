import express from 'express';
import nodemailer from 'nodemailer';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { readFileSync, existsSync, writeFileSync } from 'fs';
import http from 'http';
import crypto from 'crypto';
import { getDb } from './db/init.mjs';

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
    const { to, subject, body, userId, message, title: reqTitle } = req.body || {};

    // Store notification locally so it appears in the sidebar
    const notifMessage = message || body || subject || '';
    const notifTitle = reqTitle || subject || 'Notification';
    if (notifMessage) {
      addNotification({ userId: userId || to || '', message: notifMessage, title: notifTitle });
    }

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
        try { res.json(JSON.parse(data)); } catch { res.json({ success: true, message: 'Notification created', data: { id: 'local-' + Date.now() } }); }
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

// ---------- In-memory notification store ----------

const notificationsStore = [];
let notifIdCounter = 0;

function addNotification(notif) {
  notifIdCounter++;
  const entry = {
    id: `notif-${Date.now()}-${notifIdCounter}`,
    message: notif.message || notif.body || '',
    isRead: false,
    sentDate: new Date().toISOString(),
    userId: notif.userId || notif.to || '',
    title: notif.title || notif.subject || 'Notification',
    ...notif,
  };
  notificationsStore.unshift(entry);
  return entry;
}

app.get('/api/Notifications', async (req, res) => {
  const pageNumber = parseInt(req.query.pageNumber) || 1;
  const pageSize = parseInt(req.query.pageSize) || 50;
  const showOnlyUnread = req.query.showOnlyUnread === 'true';
  let filtered = [...notificationsStore];
  if (showOnlyUnread) filtered = filtered.filter(n => !n.isRead);
  const totalCount = filtered.length;
  const unreadCount = notificationsStore.filter(n => !n.isRead).length;
  const totalPages = Math.ceil(totalCount / pageSize) || 1;
  const start = (pageNumber - 1) * pageSize;
  const items = filtered.slice(start, start + pageSize);
  res.json({
    success: true,
    data: {
      notifications: items,
      totalCount,
      unreadCount,
      pageNumber,
      totalPages,
      hasPreviousPage: pageNumber > 1,
      hasNextPage: pageNumber < totalPages,
    },
    statusCode: 200,
  });
});

app.get('/api/Notifications/unread-count', async (req, res) => {
  const unreadCount = notificationsStore.filter(n => !n.isRead).length;
  res.json({ success: true, data: unreadCount, statusCode: 200 });
});

app.post('/api/Notifications/read-all', async (req, res) => {
  for (const n of notificationsStore) n.isRead = true;
  res.json({ success: true, message: 'All notifications marked as read.', statusCode: 200 });
});

app.post('/api/Notifications/:id/read', async (req, res) => {
  const n = notificationsStore.find(x => x.id === req.params.id);
  if (n) n.isRead = true;
  res.json({ success: true, message: 'Notification marked as read.', statusCode: 200 });
});

app.delete('/api/Notifications/:id', async (req, res) => {
  const idx = notificationsStore.findIndex(x => x.id === req.params.id);
  if (idx !== -1) notificationsStore.splice(idx, 1);
  res.json({ success: true, message: 'Notification deleted.', statusCode: 200 });
});

// ---------- Scheduled Reports Store (file-backed) ----------

const SCHEDULES_FILE = resolve(__dirname, '.scheduled-reports.json');

function loadSchedules() {
  try {
    if (!existsSync(SCHEDULES_FILE)) return [];
    return JSON.parse(readFileSync(SCHEDULES_FILE, 'utf8'));
  } catch { return []; }
}

function saveSchedules(list) {
  try {
    writeFileSync(SCHEDULES_FILE, JSON.stringify(list, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to persist schedules:', err.message);
  }
}

let schedulesStore = loadSchedules();
let scheduleIdCounter = schedulesStore.reduce((max, s) => Math.max(max, s._idNum || 0), 0);

app.post('/api/Notifications/schedules', (req, res) => {
  const { frequency, email, startDate, filters, reportType } = req.body || {};
  if (!frequency || !email || !startDate) {
    return res.status(400).json({ success: false, message: 'frequency, email, and startDate are required' });
  }
  scheduleIdCounter++;
  const schedule = {
    id: `sched-${Date.now()}-${scheduleIdCounter}`,
    _idNum: scheduleIdCounter,
    frequency,
    email,
    startDate,
    filters: filters || {},
    reportType: reportType || 'valuation',
    createdAt: new Date().toISOString(),
    lastRunAt: null,
    nextRunAt: calculateNextRun(frequency, startDate),
    isActive: true,
  };
  schedulesStore.push(schedule);
  saveSchedules(schedulesStore);
  console.log('Report scheduled:', schedule.id, '-', frequency, email);
  res.json({ success: true, message: 'Report scheduled successfully', data: { id: schedule.id } });
});

app.get('/api/Notifications/schedules', (req, res) => {
  res.json({ success: true, data: schedulesStore, statusCode: 200 });
});

app.delete('/api/Notifications/schedules/:id', (req, res) => {
  const idx = schedulesStore.findIndex(s => s.id === req.params.id);
  if (idx === -1) return res.status(404).json({ success: false, message: 'Schedule not found' });
  schedulesStore.splice(idx, 1);
  saveSchedules(schedulesStore);
  res.json({ success: true, message: 'Schedule deleted' });
});

function calculateNextRun(frequency, startDate) {
  const start = new Date(startDate);
  if (isNaN(start.getTime())) return null;
  const now = Date.now();
  if (start.getTime() > now) return start.toISOString();
  // If start date is in the past, calculate the next occurrence
  const next = new Date(start);
  while (next.getTime() <= now) {
    switch (frequency) {
      case 'daily': next.setDate(next.getDate() + 1); break;
      case 'weekly': next.setDate(next.getDate() + 7); break;
      case 'monthly': next.setMonth(next.getMonth() + 1); break;
      case 'quarterly': next.setMonth(next.getMonth() + 3); break;
      default: return start.toISOString();
    }
  }
  return next.toISOString();
}

// ---------- Pending registrations store ----------

// File-backed pending registrations store: Map<id, {username, fullName, email, roleName, department, employeeCode, phoneNumber, password, submittedAt}>
const PENDING_FILE = resolve(__dirname, '.pending-registrations.json');

function loadPendingRegistrations() {
  try {
    if (!existsSync(PENDING_FILE)) return new Map();
    const raw = readFileSync(PENDING_FILE, 'utf8');
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return new Map();
    const map = new Map();
    for (const item of arr) map.set(item.id, item);
    return map;
  } catch {
    return new Map();
  }
}

function savePendingRegistrations(map) {
  try {
    writeFileSync(PENDING_FILE, JSON.stringify(Array.from(map.values()), null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to persist pending registrations:', err.message);
  }
}

const pendingRegistrations = loadPendingRegistrations();
let pendingIdCounter = Array.from(pendingRegistrations.keys()).reduce((max, id) => {
  const parts = id.split('-');
  const num = parseInt(parts[parts.length - 1], 10);
  return isNaN(num) ? max : Math.max(max, num);
}, 0);

const USERS_FILE = resolve(__dirname, '.approved-users.json');

function loadApprovedUsers() {
  try {
    if (!existsSync(USERS_FILE)) return new Map();
    const raw = readFileSync(USERS_FILE, 'utf8');
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return new Map();
    return new Map(arr);
  } catch {
    return new Map();
  }
}

function saveApprovedUsers(map) {
  try {
    writeFileSync(USERS_FILE, JSON.stringify(Array.from(map.entries()), null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to persist approved users:', err.message);
  }
}

const approvedUsers = loadApprovedUsers();

// File-backed local user store: Map<email, {username, password, fullName, role}>
const USERS_STORE_FILE = resolve(__dirname, '.users-store.json');

function loadUsersStore() {
  try {
    if (!existsSync(USERS_STORE_FILE)) return new Map();
    const raw = readFileSync(USERS_STORE_FILE, 'utf8');
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return new Map();
    return new Map(arr);
  } catch { return new Map(); }
}

function saveUsersStore(map) {
  try {
    writeFileSync(USERS_STORE_FILE, JSON.stringify(Array.from(map.entries()), null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to persist users store:', err.message);
  }
}

const usersStore = loadUsersStore();

<
// Seed usersStore from data/users.json on startup so existing users appear in the list
(function seedUsersFromJson() {
  try {
    const usersJsonPath = resolve(__dirname, 'data', 'users.json');
    if (existsSync(usersJsonPath)) {
      const raw = readFileSync(usersJsonPath, 'utf8');
      const users = JSON.parse(raw);
      if (Array.isArray(users)) {
        for (const u of users) {
          const email = (u.email || '').toLowerCase();
          if (email && !usersStore.has(email)) {
            usersStore.set(email, {
              username: u.username || '',
              password: '',
              fullName: u.fullName || u.firstName + ' ' + u.lastName || u.username || '',
              role: u.role || (Array.isArray(u.roles) && u.roles.length ? u.roles[0] : ''),
              department: u.department || '',
              employeeCode: u.employeeCode || '',
              phoneNumber: u.phoneNumber || '',
              position: u.position || '',
              joinDate: u.joinDate || '',
            });
          }
        }
        saveUsersStore(usersStore);
      }
    }
  } catch (err) {
    console.error('Failed to seed users from data/users.json:', err.message);
  }
})();

// Seed a default admin user if store is empty
if (usersStore.size === 0) {
  const defaultUser = {
    username: 'admin',
    password: 'admin1234',
    fullName: 'Admin User',
    role: 'Admin',
  };
  usersStore.set('admin@africom.local', defaultUser);
  saveUsersStore(usersStore);
  console.log('Seeded default admin user (admin@africom.local / admin1234)');
}


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

    // Use provided username, or look up from local stores
    const { username: providedUsername } = req.body || {};
    let username = providedUsername || approvedUsers.get(email.toLowerCase()) || '';
    if (!username) {
      const stored = usersStore.get(email.toLowerCase());
      if (stored) username = stored.username;
    }

    // Store the token
    resetTokens.set(token, { email, expiry, used: false, username });

    // Determine the app origin from request headers or env
    const origin = req.headers['origin'] || req.headers['referer'] || process.env.APP_ORIGIN || 'http://localhost:4200';
    const baseUrl = origin.replace(/\/$/, '');

    const resetLink = `${baseUrl}/auth/reset-password?token=${token}&email=${encodeURIComponent(email)}`;

    // Send the email asynchronously (fire-and-forget) so SMTP failures don't block the response
    sendEmail({
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
    }).catch((err) => console.error('Failed to send reset email:', err));

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
    const { token, password, newPassword } = req.body || {};
    const pwd = password || newPassword;

    if (!token || !pwd) {
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
    const username = stored.username || '';

    // Store the new password locally so login works even without the backend
    if (usersStore.has(email.toLowerCase())) {
      const existing = usersStore.get(email.toLowerCase());
      existing.password = pwd;
      usersStore.set(email.toLowerCase(), existing);
      saveUsersStore(usersStore);
    } else {
      // Create a local entry if one doesn't exist yet
      usersStore.set(email.toLowerCase(), {
        username: username || email.split('@')[0],
        password: pwd,
        fullName: username || email.split('@')[0],
        role: 'Employee',
        department: existing.department || '',
        employeeCode: existing.employeeCode || '',
        phoneNumber: existing.phoneNumber || '',
        position: existing.position || '',
        joinDate: existing.joinDate || new Date().toISOString().split('T')[0],
      });
      saveUsersStore(usersStore);
    }

    // Forward the password reset to the real backend (fire-and-forget)
    try {
      const bodyStr = JSON.stringify({ email, token, newPassword: pwd, password: pwd });
      const backendReq = http.request({
        hostname: '127.0.0.1',
        port: BACKEND_PORT,
        path: '/api/Auth/reset-password',
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'content-length': Buffer.byteLength(bodyStr),
          connection: 'close',
        },
      });
      backendReq.on('error', () => {});
      backendReq.write(bodyStr);
      backendReq.end();
    } catch {}

    // Ensure username is always returned so login page can pre-fill it
    const resolvedUsername = username || (usersStore.has(email.toLowerCase()) ? usersStore.get(email.toLowerCase()).username : '');

    // Return success — token has been validated and marked as used
    res.json({
      success: true,
      message: 'Password has been reset successfully.',
      data: resolvedUsername ? { username: resolvedUsername } : { username: email.split('@')[0] },
    });

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

// ---------- Additional Auth Endpoints (dev mock) ----------

app.get('/api/Auth/me', (req, res) => {
  // Return a minimal user profile — real backend returns full profile
  res.json({
    success: true,
    data: {
      id: 'dev-user-001',
      email: req.headers['x-user-email'] || 'dev@example.com',
      userName: 'DevUser',
      fullName: 'Dev User',
      roles: ['Admin'],
      twoFactorEnabled: true,
      emailConfirmed: true,
      phoneNumber: null,
      phoneNumberConfirmed: false,
    },
    statusCode: 200,
  });
});

app.get('/api/Auth/confirm-email', (req, res) => {
  const { token, email } = req.query;
  if (!token) {
    return res.status(400).json({ success: false, message: 'Invalid or missing token.', statusCode: 400 });
  }
  res.json({ success: true, message: 'Email confirmed successfully.', statusCode: 200 });
});

app.post('/api/Auth/enable-2fa', (req, res) => {
  const { method, contactInfo } = req.body || {};
  if (!method || !contactInfo) {
    return res.status(400).json({ success: false, message: 'method and contactInfo are required.', statusCode: 400 });
  }
  res.json({ success: true, message: '2FA enabled successfully.', statusCode: 200 });
});

app.post('/api/Auth/disable-2fa', (_req, res) => {
  res.json({ success: true, message: '2FA disabled successfully.', statusCode: 200 });
});

app.post('/api/Auth/resend-verification', (req, res) => {
  const { email } = req.body || {};
  if (!email) {
    return res.status(400).json({ success: false, message: 'Email is required.', statusCode: 400 });
  }
  res.json({ success: true, message: 'Verification email resent.', statusCode: 200 });
});

app.post('/api/Auth/send-phone-otp', (req, res) => {
  const { phoneNumber } = req.body || {};
  if (!phoneNumber) {
    return res.status(400).json({ success: false, message: 'Phone number is required.', statusCode: 400 });
  }
  res.json({ success: true, message: 'OTP sent to phone.', otp: '123456', statusCode: 200 });
});

app.post('/api/Auth/verify-phone-otp', (req, res) => {
  const { phoneNumber, otp } = req.body || {};
  if (!phoneNumber || !otp) {
    return res.status(400).json({ success: false, message: 'Phone number and OTP are required.', statusCode: 400 });
  }
  // Accept any 6-digit OTP for dev
  res.json({ success: true, message: 'Phone number verified successfully.', statusCode: 200 });
});

app.post('/api/Auth/logout', (_req, res) => {
  res.json({ success: true, message: 'Logged out successfully.', statusCode: 200 });
});

app.post('/api/Auth/refresh-token', (req, res) => {
  const { token } = req.body || {};
  res.json({
    success: true,
    message: 'Token refreshed.',
    data: { token: token || 'mock-refreshed-token', refreshToken: 'mock-refresh-token' },
    statusCode: 200,
  });
});

app.post('/api/Auth/change-password', (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ success: false, message: 'Current and new password are required.', statusCode: 400 });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.', statusCode: 400 });
  }
  res.json({ success: true, message: 'Password changed successfully.', statusCode: 200 });
});

app.post('/api/Auth/upload-profile-photo', (req, res) => {
  res.json({ success: true, message: 'Profile photo uploaded.', data: { photoUrl: '/uploads/photo-' + Date.now() + '.jpg' }, statusCode: 200 });
});

app.put('/api/Auth/update-profile', (req, res) => {
  const { fullName, username, department, position, employeeCode, phoneNumber } = req.body || {};
  // Update the user in the local store so changes persist across page refreshes
  const email = resolveEmailFromUserStore(username);
  if (email) {
    const existing = usersStore.get(email);
    if (existing) {
      usersStore.set(email, {
        ...existing,
        fullName: fullName || existing.fullName,
        username: username || existing.username,
        department: department || existing.department || '',
        position: position || existing.position || '',
        employeeCode: employeeCode || existing.employeeCode || '',
        phoneNumber: phoneNumber || existing.phoneNumber || '',
      });
      saveUsersStore(usersStore);
    }
  }
  res.json({ success: true, message: 'Profile updated successfully.', statusCode: 200 });
});

function resolveEmailFromUserStore(username) {
  if (!username) return null;
  for (const [storedEmail, storedUser] of usersStore) {
    if (storedUser.username === username) return storedEmail;
  }
  return null;
}

// ---------- Local Login Handler (dev mock) ----------

app.post('/api/Auth/login', async (req, res) => {
  try {
    const { username, userName, UserName, email, Email, password, Password } = req.body || {};
    const loginName = username || userName || UserName || email || Email || '';
    const loginPwd = password || Password || '';

    if (!loginName || !loginPwd) {
      return res.status(400).json({ success: false, message: 'Username and password are required' });
    }

    // ── Hardcoded super admin ──
    if (loginName === 'admin' && loginPwd === 'Admin@123') {
      const tokenPayload = {
        sub: 'admin@afrocom.com',
        unique_name: 'admin',
        email: 'admin@afrocom.com',
        role: 'admin',
        fullName: 'Admin User',
        exp: Math.floor(Date.now() / 1000) + 86400,
      };
      const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
      const payload = Buffer.from(JSON.stringify(tokenPayload)).toString('base64url');
      const token = `${header}.${payload}.mock-dev-signature`;
      return res.json({
        success: true,
        data: {
          token,
          user: {
            id: 'u-001',
            username: 'admin',
            fullName: 'Admin User',
            email: 'admin@afrocom.com',
            employeeCode: 'EMP001',
            department: 'IT',
            phone: '+251-911-000000',
            position: 'Administrator',
            joinDate: '2024-01-01',
            roles: ['admin'],
            permissions: [],
            isActive: true,
          },
        },
      });
    }

    // Check local user store first (match by username or email)
    let userEntry = null;
    for (const [storedEmail, storedUser] of usersStore) {
      const matchName = storedUser.username.toLowerCase() === loginName.toLowerCase();
      const matchEmail = storedEmail.toLowerCase() === loginName.toLowerCase();
      if (matchName || matchEmail) {
        // If stored password is empty, this user was seeded from data/users.json
        // with unknown password → proxy to real backend
        if (!storedUser.password) {
          return proxyToBackend(req, res);
        }
        if (storedUser.password === loginPwd) {
          userEntry = { ...storedUser, email: storedEmail };
          break;
        }
        // Password doesn't match local store
        return res.status(401).json({
          success: false,
          message: 'Invalid username or password.',
          errors: ['Invalid username or password.'],
        });
      }
    }

    if (!userEntry) {
      // Not found in local store — proxy to backend
      return proxyToBackend(req, res);
    }

    // ── Role check: deny login if user has no role assigned ──
    const userRole = userEntry.role || '';
    if (!userRole) {
      return res.status(403).json({
        success: false, succeeded: false,
        message: 'Account pending role assignment. Contact an administrator.',
        errors: ['Account pending role assignment. Contact an administrator.'],
      });
    }

    console.log('Local login successful for', userEntry.email);

    // Generate a fake JWT token
    const tokenPayload = {
      sub: userEntry.email,
      unique_name: userEntry.username,
      email: userEntry.email,
      role: userEntry.role,
      fullName: userEntry.fullName,
      exp: Math.floor(Date.now() / 1000) + 86400,
    };
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify(tokenPayload)).toString('base64url');
    const token = `${header}.${payload}.mock-dev-signature`;

    // Build extended profile fields — use stored values or generate sensible defaults
    const empCode = userEntry.employeeCode || `EMP_${String(Math.floor(Math.random() * 9000) + 1000)}`;
    const dept = userEntry.department || 'IT Department';
    const phoneVal = userEntry.phoneNumber || '+251-911-000000';
    const pos = userEntry.position || 'Staff';
    const joinDt = userEntry.joinDate || new Date().toISOString().split('T')[0];

    res.json({
      success: true,
      data: {
        token,
        refreshToken: `mock-refresh-${Date.now()}`,
        user: {
          id: userEntry.email,
          username: userEntry.username,
          fullName: userEntry.fullName,
          email: userEntry.email,
          employeeCode: empCode,
          department: dept,
          phone: phoneVal,
          position: pos,
          joinDate: joinDt,
          roles: [userEntry.role],
          permissions: [],
          isActive: true,
        },
      },
    });
  } catch (err) {
    console.error('login error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/Auth/refresh-token', async (req, res) => {
  try {
    const { refreshToken } = req.body || {};
    if (!refreshToken) {
      return res.status(400).json({ success: false, message: 'Refresh token required' });
    }
    console.log('Refreshing token for', refreshToken.slice(0, 20) + '...');

    const tokenPayload = {
      sub: 'dev-user',
      unique_name: 'devuser',
      email: 'dev@example.com',
      role: 'Admin',
      exp: Math.floor(Date.now() / 1000) + 86400,
    };
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify(tokenPayload)).toString('base64url');
    const newToken = `${header}.${payload}.mock-dev-signature`;

    res.json({
      success: true,
      data: {
        token: newToken,
        refreshToken: `mock-refresh-${Date.now()}`,
      },
    });
  } catch (err) {
    console.error('refresh-token error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ---------- Local Register Intercept (dev mock) ----------

app.post('/api/Auth/register', async (req, res) => {
  try {
    const { username, fullName, email, password, department, employeeCode, phoneNumber } = req.body || {};

    // Store locally with NO role (pending admin assignment)
    if (email && password) {
      const uname = username || (fullName || '').toLowerCase().replace(/\s+/g, '_') || email.split('@')[0];
      usersStore.set(email.toLowerCase(), {
        username: uname,
        password,
        fullName: fullName || uname,
        role: '',
        department: department || '',
        employeeCode: employeeCode || '',
        phoneNumber: phoneNumber || '',
        position: '',
        joinDate: new Date().toISOString().split('T')[0],
      });
      saveUsersStore(usersStore);

      // Also store in approvedUsers for username lookup
      approvedUsers.set(email.toLowerCase(), uname);
      saveApprovedUsers(approvedUsers);
    }

    res.status(201).json({
      success: true,
      message: 'Account created successfully! An administrator must assign your role before you can log in.',
      data: { id: email },
    });
  } catch (err) {
    console.error('register intercept error:', err);
    res.status(500).json({ success: false, message: 'Server error during registration.' });
  }
});

// ---------- Pending Registration Endpoints ----------

app.post('/api/Auth/register-pending', async (req, res) => {
  try {
    const { username, fullName, email, password, roleName, department, employeeCode, phoneNumber } = req.body || {};

    if (!email || !password || !fullName || !roleName) {
      return res.status(400).json({ success: false, message: 'Missing required fields: email, password, fullName, roleName' });
    }

    pendingIdCounter++;
    const id = `pending-${Date.now()}-${pendingIdCounter}`;
    const record = {
      id,
      username: username || fullName.toLowerCase().replace(/\s+/g, '_'),
      fullName: fullName.trim(),
      email: email.trim().toLowerCase(),
      roleName: roleName.trim(),
      department: department || '',
      employeeCode: employeeCode || '',
      phoneNumber: phoneNumber || '',
      password,
      submittedAt: new Date().toISOString(),
    };

    pendingRegistrations.set(id, record);
    savePendingRegistrations(pendingRegistrations);

    // Forward to backend (fire-and-forget)
    try {
      const bodyStr = JSON.stringify(record);
      const backendReq = http.request({
        hostname: '127.0.0.1',
        port: BACKEND_PORT,
        path: '/api/Auth/register-pending',
        method: 'POST',
        headers: { 'content-type': 'application/json', 'content-length': Buffer.byteLength(bodyStr), connection: 'close' },
      });
      backendReq.on('error', () => {});
      backendReq.write(bodyStr);
      backendReq.end();
    } catch {}

    console.log('Pending registration created for', email, 'as', roleName);
    res.json({ success: true, message: 'Registration submitted for admin approval.', data: { id } });
  } catch (err) {
    console.error('register-pending error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/api/Auth/pending-registrations', async (req, res) => {
  try {
    const list = Array.from(pendingRegistrations.values()).map(({ password, ...rest }) => rest);
    res.json({ success: true, data: list, statusCode: 200 });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/api/Auth/pending-registrations/count', async (req, res) => {
  try {
    res.json({ success: true, data: pendingRegistrations.size, statusCode: 200 });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/Auth/pending-registrations/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;
    const record = pendingRegistrations.get(id);

    if (!record) {
      return res.status(404).json({ success: false, message: 'Pending registration not found.' });
    }

    const { username, fullName, email, roleName, department, employeeCode, phoneNumber, password } = record;

    // Forward to the backend to create the user (fire-and-forget)
    try {
      const bodyStr = JSON.stringify({
        username, fullName, email, roleName, department, employeeCode, phoneNumber,
        password, confirmPassword: password,
      });
      const backendReq = http.request({
        hostname: '127.0.0.1',
        port: BACKEND_PORT,
        path: '/api/Auth/register',
        method: 'POST',
        headers: { 'content-type': 'application/json', 'content-length': Buffer.byteLength(bodyStr), connection: 'close' },
      });
      backendReq.on('error', () => {});
      backendReq.write(bodyStr);
      backendReq.end();
    } catch {}

    pendingRegistrations.delete(id);
    savePendingRegistrations(pendingRegistrations);

    // Save approved user for local username lookup
    const resolvedUsername = username || fullName.toLowerCase().replace(/\s+/g, '_');
    approvedUsers.set(email.toLowerCase(), resolvedUsername);
    saveApprovedUsers(approvedUsers);

    // Store full user in local login store (with password)
    usersStore.set(email.toLowerCase(), {
      username: resolvedUsername,
      password,
      fullName,
      role: roleName,
      department: department || '',
      employeeCode: employeeCode || '',
      phoneNumber: phoneNumber || '',
      position: position || '',
      joinDate: new Date().toISOString().split('T')[0],
    });
    saveUsersStore(usersStore);

    console.log('Pending registration approved for', email);

    // Send confirmation email (fire-and-forget)
    sendEmail({
      to: email,
      subject: 'Account Approved',
      body: `Your account has been approved. You can now log in with your credentials.\n\nThank you.`,
    }).catch(() => {});

    res.json({ success: true, message: `${fullName} approved as ${roleName}.` });
  } catch (err) {
    console.error('approve-pending error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/Auth/pending-registrations/:id/reject', async (req, res) => {
  try {
    const { id } = req.params;
    const record = pendingRegistrations.get(id);

    if (!record) {
      return res.status(404).json({ success: false, message: 'Pending registration not found.' });
    }

    pendingRegistrations.delete(id);
    savePendingRegistrations(pendingRegistrations);
    console.log('Pending registration rejected for', record.email);

    // Send rejection email (fire-and-forget)
    sendEmail({
      to: record.email,
      subject: 'Account Request Rejected',
      body: `Your account registration request has been rejected. Please contact your administrator for more information.`,
    }).catch(() => {});

    res.json({ success: true, message: `${record.fullName}'s registration has been rejected.` });
  } catch (err) {
    console.error('reject-pending error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

const BACKEND_PORT = 5028;

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch { reject(new Error('Invalid JSON')); }
      });
    }).on('error', reject);
  });
}

function proxyToBackend(req, res) {
  // If express.json() parsed the body, re-serialize it since the original
  // incoming stream was consumed and req.pipe() would send nothing.
  const body = req.body !== undefined ? JSON.stringify(req.body) : undefined;

  const headers = {
    ...req.headers,
    host: `127.0.0.1:${BACKEND_PORT}`,
    connection: 'close',
  };
  // Remove headers that are no longer accurate after re-serialization
  delete headers['content-length'];
  delete headers['transfer-encoding'];
  if (body !== undefined) {
    headers['content-length'] = Buffer.byteLength(body);
  }

  const options = {
    hostname: '127.0.0.1',
    port: BACKEND_PORT,
    path: req.originalUrl,
    method: req.method,
    headers,
  };

  const proxyReq = http.request(options, (proxyRes) => {
    const resHeaders = { ...proxyRes.headers };
    delete resHeaders['transfer-encoding'];
    res.writeHead(proxyRes.statusCode, resHeaders);
    proxyRes.pipe(res);
  });

  proxyReq.on('error', (err) => {
    console.error('Proxy error for', req.method, req.originalUrl, '-', err.message);
    if (!res.headersSent) {
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, message: `Backend unavailable: ${err.message}` }));
    }
  });

  if (body !== undefined) {
    proxyReq.end(body);
  } else {
    req.pipe(proxyReq);
  }
}


// ---------- Warehouse & Shelf Location mock endpoints (dev only) ----------

const DEV_WAREHOUSES = [
  { id: 'wh-001', warehouseName: 'Main Warehouse', locationCode: 'MW-01', address: '123 Storage Ave', city: 'Addis Ababa', country: 'Ethiopia', contactPerson: 'Abebe', contactPhone: '+251-911-000001', contactEmail: 'abebe@warehouse.com', isActive: true, totalShelves: 5, occupiedShelves: 3, totalItems: 1200, createdAt: '2025-01-15T08:00:00Z' },
  { id: 'wh-002', warehouseName: 'East Distribution', locationCode: 'ED-01', address: '456 Logistics Rd', city: 'Dire Dawa', country: 'Ethiopia', contactPerson: 'Bekele', contactPhone: '+251-911-000002', contactEmail: 'bekele@warehouse.com', isActive: true, totalShelves: 3, occupiedShelves: 2, totalItems: 800, createdAt: '2025-02-20T10:30:00Z' },
  { id: 'wh-003', warehouseName: 'North Storage', locationCode: 'NS-01', address: '789 Industrial Zone', city: 'Mekelle', country: 'Ethiopia', contactPerson: 'Chaltu', contactPhone: '+251-911-000003', contactEmail: 'chaltu@warehouse.com', isActive: false, totalShelves: 2, occupiedShelves: 0, totalItems: 0, createdAt: '2025-03-10T14:00:00Z' },
];

const DEV_SHELVES = [
  { id: 'sl-001', warehouseId: 'wh-001', warehouseName: 'Main Warehouse', fullAddress: 'A-1-01', qrCodeValue: 'QR-A1-01', isActive: true, itemCount: 4, totalQuantity: 320, capacity: 500, aisle: 'A', rack: '1', shelfNumber: '01', zone: 'Receiving', binType: 'Standard', length: 120, width: 80, height: 200, maxWeight: 500, description: 'Main receiving shelf', createdAt: '2025-01-20T09:00:00Z' },
  { id: 'sl-002', warehouseId: 'wh-001', warehouseName: 'Main Warehouse', fullAddress: 'A-1-02', qrCodeValue: 'QR-A1-02', isActive: true, itemCount: 3, totalQuantity: 180, capacity: 500, aisle: 'A', rack: '1', shelfNumber: '02', zone: 'Storage', binType: 'Standard', length: 120, width: 80, height: 200, maxWeight: 500, description: '', createdAt: '2025-01-20T09:05:00Z' },
  { id: 'sl-003', warehouseId: 'wh-001', warehouseName: 'Main Warehouse', fullAddress: 'B-1-01', qrCodeValue: 'QR-B1-01', isActive: true, itemCount: 2, totalQuantity: 95, capacity: 400, aisle: 'B', rack: '1', shelfNumber: '01', zone: 'Storage', binType: 'Heavy Duty', length: 150, width: 100, height: 200, maxWeight: 1000, description: 'Heavy equipment storage', createdAt: '2025-02-01T11:00:00Z' },
  { id: 'sl-004', warehouseId: 'wh-001', warehouseName: 'Main Warehouse', fullAddress: 'B-1-02', qrCodeValue: 'QR-B1-02', isActive: true, itemCount: 5, totalQuantity: 410, capacity: 400, aisle: 'B', rack: '1', shelfNumber: '02', zone: 'Storage', binType: 'Heavy Duty', length: 150, width: 100, height: 200, maxWeight: 1000, description: '', createdAt: '2025-02-01T11:10:00Z' },
  { id: 'sl-005', warehouseId: 'wh-001', warehouseName: 'Main Warehouse', fullAddress: 'C-1-01', qrCodeValue: 'QR-C1-01', isActive: true, itemCount: 0, totalQuantity: 0, capacity: 300, aisle: 'C', rack: '1', shelfNumber: '01', zone: 'Shipping', binType: 'Standard', length: 100, width: 80, height: 180, maxWeight: 300, description: '', createdAt: '2025-02-10T08:30:00Z' },
  { id: 'sl-006', warehouseId: 'wh-002', warehouseName: 'East Distribution', fullAddress: 'A-1-01', qrCodeValue: 'QR-EA1-01', isActive: true, itemCount: 3, totalQuantity: 200, capacity: 350, aisle: 'A', rack: '1', shelfNumber: '01', zone: 'Storage', binType: 'Standard', length: 110, width: 75, height: 190, maxWeight: 400, description: '', createdAt: '2025-03-01T09:00:00Z' },
  { id: 'sl-007', warehouseId: 'wh-002', warehouseName: 'East Distribution', fullAddress: 'A-1-02', qrCodeValue: 'QR-EA1-02', isActive: true, itemCount: 2, totalQuantity: 150, capacity: 350, aisle: 'A', rack: '1', shelfNumber: '02', zone: 'Storage', binType: 'Standard', length: 110, width: 75, height: 190, maxWeight: 400, description: '', createdAt: '2025-03-01T09:05:00Z' },
  { id: 'sl-008', warehouseId: 'wh-002', warehouseName: 'East Distribution', fullAddress: 'B-1-01', qrCodeValue: 'QR-EB1-01', isActive: false, itemCount: 0, totalQuantity: 0, capacity: 300, aisle: 'B', rack: '1', shelfNumber: '01', zone: 'Maintenance', binType: 'Standard', length: 100, width: 70, height: 180, maxWeight: 300, description: 'Under maintenance', createdAt: '2025-03-15T10:00:00Z' },
];

app.get('/api/Warehouses', (req, res) => {
  const { searchTerm, isActive } = req.query;
  let list = [...DEV_WAREHOUSES];
  if (searchTerm) list = list.filter(w => w.warehouseName.toLowerCase().includes(searchTerm.toLowerCase()));
  if (isActive === 'true') list = list.filter(w => w.isActive);
  if (isActive === 'false') list = list.filter(w => !w.isActive);
  res.json({ success: true, message: null, data: list, statusCode: 200 });
});

app.get('/api/Warehouses/:id', (req, res) => {
  const w = DEV_WAREHOUSES.find(x => x.id === req.params.id);
  if (!w) return res.status(404).json({ success: false, message: 'Warehouse not found', statusCode: 404 });
  res.json({ success: true, message: null, data: w, statusCode: 200 });
});

app.post('/api/Warehouses', (req, res) => {
  const { warehouseName, locationCode, address, city, country, contactPerson, contactPhone, contactEmail } = req.body || {};
  if (!warehouseName || !locationCode) {
    return res.status(400).json({ success: false, message: 'warehouseName and locationCode are required', statusCode: 400 });
  }
  const newWh = {
    id: `wh-${Date.now()}`,
    warehouseName, locationCode, address: address || '', city: city || '', country: country || '',
    contactPerson: contactPerson || '', contactPhone: contactPhone || '', contactEmail: contactEmail || '',
    isActive: true, totalShelves: 0, occupiedShelves: 0, totalItems: 0,
    createdAt: new Date().toISOString(),
  };
  DEV_WAREHOUSES.push(newWh);
  res.json({ success: true, message: 'Warehouse created', data: newWh.id, statusCode: 200 });
});

app.get('/api/ShelfLocations', (req, res) => {
  const { warehouseId, searchTerm } = req.query;
  let list = [...DEV_SHELVES];
  if (warehouseId) list = list.filter(s => s.warehouseId === warehouseId);
  if (searchTerm) list = list.filter(s => s.fullAddress.toLowerCase().includes(searchTerm.toLowerCase()) || s.zone?.toLowerCase().includes(searchTerm.toLowerCase()));
  list.sort((a, b) => a.warehouseName.localeCompare(b.warehouseName) || a.fullAddress.localeCompare(b.fullAddress));
  res.json({ success: true, message: null, data: list, statusCode: 200 });
});

app.get('/api/ShelfLocations/:id', (req, res) => {
  const s = DEV_SHELVES.find(x => x.id === req.params.id);
  if (!s) return res.status(404).json({ success: false, message: 'Shelf location not found', statusCode: 404 });
  res.json({ success: true, message: null, data: s, statusCode: 200 });
});

app.post('/api/ShelfLocations', (req, res) => {
  const { warehouseId, warehouseName, aisle, rack, shelfNumber, zone, binType, capacity } = req.body || {};
  if (!warehouseId || !aisle || !rack || !shelfNumber) {
    return res.status(400).json({ success: false, message: 'warehouseId, aisle, rack, and shelfNumber are required', statusCode: 400 });
  }
  const wh = DEV_WAREHOUSES.find(w => w.id === warehouseId);
  const newSl = {
    id: `sl-${Date.now()}`,
    warehouseId, warehouseName: wh?.warehouseName || warehouseName || '',
    fullAddress: `${aisle}-${rack}-${shelfNumber}`,
    qrCodeValue: `QR-${aisle}-${rack}-${shelfNumber}`,
    isActive: true, itemCount: 0, totalQuantity: 0, capacity: capacity || 100,
    aisle, rack, shelfNumber, zone: zone || '', binType: binType || 'Standard',
    length: 0, width: 0, height: 0, maxWeight: 0, description: '',
    createdAt: new Date().toISOString(),
  };
  DEV_SHELVES.push(newSl);
  res.json({ success: true, message: 'Shelf location created', data: newSl.id, statusCode: 200 });
});

app.put('/api/ShelfLocations/:id', (req, res) => {
  const idx = DEV_SHELVES.findIndex(x => x.id === req.params.id);
  if (idx === -1) return res.status(404).json({ success: false, message: 'Shelf location not found', statusCode: 404 });
  const existing = DEV_SHELVES[idx];
  const updates = req.body || {};
  DEV_SHELVES[idx] = { ...existing, ...updates, id: existing.id, createdAt: existing.createdAt, updatedAt: new Date().toISOString() };
  res.json({ success: true, message: 'Shelf location updated', statusCode: 200 });
});

app.delete('/api/ShelfLocations/:id', (req, res) => {
  const idx = DEV_SHELVES.findIndex(x => x.id === req.params.id);
  if (idx === -1) return res.status(404).json({ success: false, message: 'Shelf location not found', statusCode: 404 });
  DEV_SHELVES.splice(idx, 1);
  res.json({ success: true, message: 'Shelf location deleted', statusCode: 200 });
});

// ---------- Properties (valuations) — SQLite backed ----------

function mapRowToProperty(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    tagNumber: row.tag_number,
    serialNumber: row.serial_number,
    propertyTypeId: row.property_type_id,
    propertyTypeName: row.property_type_name || null,
    propertyCategoryId: row.property_category_id,
    propertyCategoryName: row.category_name || row.property_category_id,
    unitPrice: row.unit_price,
    totalValue: row.total_value,
    quantity: row.quantity,
    purchaseDate: row.purchase_date,
    locationId: row.location_id,
    locationName: row.location_name || row.location_id,
    currentValue: row.current_value,
    description: row.description,
    purchasePrice: row.purchase_price,
    safetyBoxId: row.safety_box_id,
    shelfNumber: row.shelf_number,
    isActive: !!row.is_active,
  };
}

app.get('/api/Properties', (req, res) => {
  try {
    const db = getDb();
    const { searchTerm, locationId, propertyTypeId, propertyCategoryId } = req.query;

    let sql = `
      SELECT p.*, pc.name as category_name, l.name as location_name, pt.name as property_type_name
      FROM properties p
      LEFT JOIN property_categories pc ON pc.id = p.property_category_id
      LEFT JOIN locations l ON l.id = p.location_id
      LEFT JOIN property_types pt ON pt.id = p.property_type_id
      WHERE 1=1
    `;
    const params = [];

    if (searchTerm) {
      sql += ' AND (p.name LIKE ? OR p.tag_number LIKE ? OR p.serial_number LIKE ?)';
      const term = `%${searchTerm}%`;
      params.push(term, term, term);
    }
    if (locationId) {
      sql += ' AND p.location_id = ?';
      params.push(locationId);
    }
    if (propertyTypeId) {
      sql += ' AND p.property_type_id = ?';
      params.push(propertyTypeId);
    }
    if (propertyCategoryId) {
      sql += ' AND p.property_category_id = ?';
      params.push(propertyCategoryId);
    }

    sql += ' ORDER BY p.created_at DESC';

    const rows = db.prepare(sql).all(...params);
    const data = rows.map(mapRowToProperty);
    res.json({ success: true, message: null, data, statusCode: 200 });
  } catch (err) {
    console.error('GET /api/Properties error:', err.message);
    res.status(500).json({ success: false, message: err.message, statusCode: 500 });
  }
});

app.get('/api/Properties/:id', (req, res) => {
  try {
    const db = getDb();
    const row = db.prepare(`
      SELECT p.*, pc.name as category_name, l.name as location_name, pt.name as property_type_name
      FROM properties p
      LEFT JOIN property_categories pc ON pc.id = p.property_category_id
      LEFT JOIN locations l ON l.id = p.location_id
      LEFT JOIN property_types pt ON pt.id = p.property_type_id
      WHERE p.id = ?
    `).get(req.params.id);

    if (!row) {
      return res.status(404).json({ success: false, message: 'Property not found', statusCode: 404 });
    }
    res.json({ success: true, message: null, data: mapRowToProperty(row), statusCode: 200 });
  } catch (err) {
    console.error('GET /api/Properties/:id error:', err.message);
    res.status(500).json({ success: false, message: err.message, statusCode: 500 });
  }
});

// ---------- Roles API ----------

function getRolesWithUserCounts() {
  const roleMap = {};
  for (const [, storedUser] of usersStore) {
    const r = storedUser.role || '';
    if (r) roleMap[r] = (roleMap[r] || 0) + 1;
  }
  return [
    { id: 'role-admin', name: 'Admin', roleName: 'Admin', description: 'Full system access', userCount: roleMap['admin'] || 0, permissions: ['admin_dashboard', 'view_users', 'view_employees', 'view_roles', 'view_audit_log', 'view_notifications'], isActive: true },
    { id: 'role-manager', name: 'Manager', roleName: 'Manager', description: 'Department manager', userCount: roleMap['manager'] || 0, permissions: ['manager_dashboard', 'approve_requests', 'view_reports'], isActive: true },
    { id: 'role-employee', name: 'Employee', roleName: 'Employee', description: 'Regular employee', userCount: roleMap['employee'] || 0, permissions: ['employee_dashboard', 'create_requests', 'view_own_requests'], isActive: true },
    { id: 'role-storekeeper', name: 'Storekeeper', roleName: 'Storekeeper', description: 'Warehouse staff', userCount: roleMap['storekeeper'] || 0, permissions: ['storekeeper_dashboard', 'manage_inventory', 'issue_items'], isActive: true },
    { id: 'role-compliance', name: 'Compliance Officer', roleName: 'Compliance Officer', description: 'Compliance and audit', userCount: roleMap['compliance-officer'] || 0, permissions: ['compliance_dashboard', 'view_audits', 'manage_compliance'], isActive: true },
  ];
}

app.get('/api/Roles', (req, res) => {
  res.json({ success: true, message: '', data: getRolesWithUserCounts(), statusCode: 200 });
});

app.get('/api/Roles/:id', (req, res) => {
  const role = DEV_ROLES.find(r => r.id === req.params.id);
  if (!role) return res.status(404).json({ success: false, message: 'Not found', statusCode: 404 });
  res.json({ success: true, message: '', data: role, statusCode: 200 });
});

// ---------- Employee & User Lookup (used by dashboard to fill profile fields) ----------

app.get('/api/users', (req, res) => {
  const items = Array.from(usersStore.entries()).map(([email, u], index) => ({
    id: index + 1,
    userId: email,
    username: u.username,
    email,
    fullName: u.fullName,
    firstName: (u.fullName || '').split(' ')[0] || '',
    lastName: (u.fullName || '').split(' ').slice(1).join(' ') || '',
    role: u.role || '',
    roles: u.role ? [u.role] : [],
    isActive: true,
    employeeName: u.fullName || u.username,
    employeeCode: u.employeeCode || '',
    roleName: u.role || '',
    department: u.department || '',
    phoneNumber: u.phoneNumber || '',
  }));
  res.json({ success: true, message: '', data: { items, pageNumber: 1, totalPages: 1, totalCount: items.length, hasPreviousPage: false, hasNextPage: false }, statusCode: 200 });
});

app.get('/api/users/:id', (req, res) => {
  const userId = req.params.id;
  for (const [storedEmail, storedUser] of usersStore) {
    if (storedEmail === userId || storedUser.username === userId) {
      return res.json({
        success: true,
        data: {
          id: storedEmail,
          userId: storedEmail,
          username: storedUser.username,
          email: storedEmail,
          fullName: storedUser.fullName,
          firstName: storedUser.fullName?.split(' ')[0] || storedUser.fullName,
          lastName: storedUser.fullName?.split(' ').slice(1).join(' ') || '',
          role: storedUser.role,
          roles: [storedUser.role],
          isActive: true,
          employeeCode: storedUser.employeeCode || '',
          phoneNumber: storedUser.phoneNumber || '',
          department: storedUser.department || '',
        },
        statusCode: 200,
      });
    }
  }
  res.status(404).json({ success: false, message: 'User not found', statusCode: 404 });
});

app.patch('/api/users/:id/assign-role', (req, res) => {
  const { roleName } = req.body || {};
  if (!roleName) return res.status(400).json({ success: false, message: 'roleName is required', statusCode: 400 });

  const userId = req.params.id;
  const entries = Array.from(usersStore.entries());
  for (let i = 0; i < entries.length; i++) {
    const [storedEmail, storedUser] = entries[i];
    const indexId = String(i + 1);
    if (storedEmail === userId || storedUser.username === userId || String(storedUser.id) === userId || indexId === userId) {
      storedUser.role = roleName;
      usersStore.set(storedEmail, storedUser);
      saveUsersStore(usersStore);
      return res.json({ success: true, message: `Role "${roleName}" assigned to user`, data: storedUser, statusCode: 200 });
    }
  }
  res.status(404).json({ success: false, message: 'User not found', statusCode: 404 });
});

app.patch('/api/users/:id/toggle-status', (req, res) => {
  res.json({ success: true, message: 'Toggled', statusCode: 200 });
});

app.put('/api/users/:id', (req, res) => {
  const userId = req.params.id;
  const body = req.body || {};
  for (const [storedEmail, storedUser] of usersStore) {
    if (storedEmail === userId || storedUser.username === userId) {
      usersStore.set(storedEmail, {
        ...storedUser,
        fullName: body.fullName || body.name || body.fullName || storedUser.fullName,
        username: body.username || storedUser.username,
        department: body.department || storedUser.department || '',
        position: body.position || body.jobTitle || storedUser.position || '',
        employeeCode: body.employeeCode || storedUser.employeeCode || '',
        phoneNumber: body.phoneNumber || body.phone || storedUser.phoneNumber || '',
        joinDate: body.joinDate || storedUser.joinDate || new Date().toISOString().split('T')[0],
      });
      saveUsersStore(usersStore);

      return res.json({
        success: true,
        message: 'Profile updated successfully.',
        data: { id: storedEmail },
        statusCode: 200,
      });
    }
  }
  // If not found in local store, create a new entry
  usersStore.set(userId, {
    username: body.username || userId,
    password: '',
    fullName: body.fullName || body.name || userId,
    role: 'User',
    department: body.department || '',
    employeeCode: body.employeeCode || '',
    phoneNumber: body.phoneNumber || '',
    position: body.position || '',
    joinDate: new Date().toISOString().split('T')[0],
  });
  saveUsersStore(usersStore);
  res.json({ success: true, message: 'User created.', statusCode: 200 });
});

app.get('/api/employees/by-user/:userId', (req, res) => {
  const userId = req.params.userId;
  for (const [storedEmail, storedUser] of usersStore) {
    if (storedEmail === userId || storedUser.username === userId) {
      return res.json({
        success: true,
        data: {
          id: 1,
          employeeId: storedEmail,
          firstName: storedUser.fullName?.split(' ')[0] || storedUser.fullName,
          lastName: storedUser.fullName?.split(' ').slice(1).join(' ') || '',
          email: storedEmail,
          phoneNumber: storedUser.phoneNumber || '',
          department: storedUser.department || '',
          position: storedUser.position || '',
          employeeCode: storedUser.employeeCode || '',
          fullName: storedUser.fullName,
          designation: storedUser.position || '',
          dateOfJoining: storedUser.joinDate || new Date().toISOString().split('T')[0],
          employmentType: 'Full-Time',
          status: 'Active',
          isActive: true,
        },
        statusCode: 200,
      });
    }
  }
  res.status(404).json({ success: false, message: 'Employee not found', statusCode: 404 });
});

// Serve ItemMasters locally so the catalog works with the in-memory
// user store (fake JWT tokens are rejected by the real backend on 5028).
app.get('/api/ItemMasters', (req, res) => {
  try {
    const d = JSON.parse(readFileSync(resolve(__dirname, 'data', 'inventory.json'), 'utf8'));
    const items = d.itemMasters || [];
    return res.json({
      success: true, message: '',
      data: { items, pageNumber: 1, totalPages: 1, totalCount: items.length, hasPreviousPage: false, hasNextPage: false },
      statusCode: 200,
    });
  } catch {
    return res.json({ success: true, message: '', data: { items: [], pageNumber: 1, totalPages: 1, totalCount: 0, hasPreviousPage: false, hasNextPage: false }, statusCode: 200 });
  }
});

app.get('/api/ItemMasters/:id', (req, res, next) => {
  try {
    const d = JSON.parse(readFileSync(resolve(__dirname, 'data', 'inventory.json'), 'utf8'));
    const item = (d.itemMasters || []).find(x => String(x.id) === String(req.params.id));
    if (item) {
      const stockLocations = (d.inventory || [])
        .filter(inv => String(inv.itemId) === String(req.params.id))
        .map(inv => ({ shelfId: inv.shelfId, shelfLocation: inv.shelfLocation, warehouseName: inv.warehouseName, availableQuantity: inv.availableStock ?? 0 }));
      return res.json({ success: true, message: '', data: { ...item, stockLocations }, statusCode: 200 });
    }
  } catch {}
  next();
});

function writeInventoryJson(d) {
  writeFileSync(resolve(__dirname, 'data', 'inventory.json'), JSON.stringify(d, null, 2), 'utf8');
}

app.post('/api/ItemMasters', express.json(), (req, res) => {
  try {
    const d = JSON.parse(readFileSync(resolve(__dirname, 'data', 'inventory.json'), 'utf8'));
    const payload = req.body || {};
    const id = payload.id || `itm-${Date.now()}`;
    const item = { id, itemName: payload.itemName || payload.sku || '', sku: payload.sku || '', description: payload.description || '', categoryName: payload.categoryName || '', unitOfMeasure: payload.unitOfMeasure || 'PCS', currentStock: payload.stockQuantity || 0, reservedStock: 0, availableStock: payload.stockQuantity || 0, minStockLevel: payload.minStockLevel || 0, requiresInspection: false, isLowStock: false, stockQuantity: payload.stockQuantity || 0, isActive: payload.isActive ?? true };
    d.itemMasters = d.itemMasters || [];
    d.itemMasters.push(item);
    d.inventory = d.inventory || [];
    d.inventory.push({ id: `inv-${Date.now()}`, itemId: id, itemName: item.itemName, sku: item.sku, shelfId: payload.shelfId || '', shelfLocation: payload.shelfLocation || '', warehouseId: payload.warehouseId || '', warehouseName: payload.warehouseName || '', currentStock: item.currentStock || 0, reservedStock: 0, availableStock: item.currentStock || 0, unitOfMeasure: item.unitOfMeasure || 'Units', lastUpdated: new Date().toISOString(), minimumThreshold: item.minStockLevel || 0, maximumThreshold: 0 });
    writeInventoryJson(d);
    res.json({ success: true, message: 'Created', data: id, statusCode: 201 });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message, statusCode: 500 });
  }
});

app.put('/api/ItemMasters/:id', express.json(), (req, res) => {
  try {
    const d = JSON.parse(readFileSync(resolve(__dirname, 'data', 'inventory.json'), 'utf8'));
    d.itemMasters = d.itemMasters || [];
    const idx = d.itemMasters.findIndex(x => String(x.id) === String(req.params.id));
    if (idx === -1) return res.status(404).json({ success: false, message: 'Not found', statusCode: 404 });
    d.itemMasters[idx] = { ...d.itemMasters[idx], ...req.body };
    writeInventoryJson(d);
    res.json({ success: true, message: 'Updated', data: d.itemMasters[idx], statusCode: 200 });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message, statusCode: 500 });
  }
});

app.delete('/api/ItemMasters/:id', (req, res) => {
  try {
    const d = JSON.parse(readFileSync(resolve(__dirname, 'data', 'inventory.json'), 'utf8'));
    d.itemMasters = d.itemMasters || [];
    const idx = d.itemMasters.findIndex(x => String(x.id) === String(req.params.id));
    if (idx === -1) return res.status(404).json({ success: false, message: 'Not found', statusCode: 404 });
    const removed = d.itemMasters.splice(idx, 1);
    writeInventoryJson(d);
    res.json({ success: true, message: 'Deleted', data: removed, statusCode: 200 });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message, statusCode: 500 });
  }
});

// In-memory store for service requests with file persistence
// (avoids proxying to real backend which rejects the fake email-service JWT with 401).
const SR_FILE = resolve(__dirname, 'data', 'service-requests.json');
let serviceRequests = [];

function loadServiceRequests() {
  try {
    if (existsSync(SR_FILE)) {
      serviceRequests = JSON.parse(readFileSync(SR_FILE, 'utf8'));
      console.log(`Loaded ${serviceRequests.length} service requests from disk`);
    }
  } catch (e) {
    console.error('Error loading service requests:', e.message);
    serviceRequests = [];
  }
}

function saveServiceRequests() {
  try {
    writeFileSync(SR_FILE, JSON.stringify(serviceRequests, null, 2), 'utf8');
  } catch (e) {
    console.error('Error saving service requests:', e.message);
  }
}

loadServiceRequests();

function normalizeServiceRequest(item) {
  const items = (item.items || []).map(i => ({
    id: i.id || i.itemId || `itm-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    itemId: i.itemId || '',
    itemName: i.itemName || i.name || '',
    sku: i.sku || '',
    unitOfMeasure: i.unitOfMeasure || 'PCS',
    requestedQty: i.requestedQty || i.quantity || 0,
    issuedQty: i.issuedQty || 0,
    pendingQty: (i.requestedQty || i.quantity || 0) - (i.issuedQty || 0),
    shelfId: i.shelfId || i.preferredShelfId || null,
    shelfLocation: i.shelfLocation || null,
  }));
  return {
    id: item.id,
    srNumber: item.srNumber || item.id,
    requesterId: item.requesterId || item.employeeId || '',
    requesterName: item.requesterName || item.employeeName || item.requester || 'Employee',
    department: item.department || '',
    purpose: item.purpose || item.justification || item.remarks || '',
    urgency: item.urgency || 'Normal',
    notes: item.notes || item.remarks || '',
    requestDate: item.requestDate || item.createdAt || new Date().toISOString(),
    status: item.status || 'Pending',
    stockVerificationStatus: item.stockVerificationStatus || 'NotVerified',
    totalItems: items.length,
    totalQuantity: items.reduce((s, i) => s + i.requestedQty, 0),
    issuedQuantity: items.reduce((s, i) => s + (i.issuedQty || 0), 0),
    items,
    createdAt: item.createdAt || item.requestDate || new Date().toISOString(),
    updatedAt: item.updatedAt || null,
  };
}

// Must be registered before /api/ServiceRequests/:id to avoid :id matching 'approve' etc.
app.post('/api/ServiceRequests/:id/approve', express.json(), (req, res) => {
  console.log('HIT approve:', req.params.id);
  const item = serviceRequests.find(x => String(x.id) === String(req.params.id));
  if (!item) return res.status(404).json({ success: false, message: 'Not found', statusCode: 404 });
  const payload = req.body || {};
  item.status = 'Approved';
  item.approvedById = payload.userId || payload.Id || '';
  item.approvedByName = payload.userName || 'Approver';
  item.updatedAt = new Date().toISOString();
  const normal = normalizeServiceRequest(item);
  Object.assign(item, normal);
  saveServiceRequests();
  res.json({ success: true, message: 'Approved', data: normal, statusCode: 200 });
});

app.post('/api/ServiceRequests/:id/reject', express.json(), (req, res) => {
  const item = serviceRequests.find(x => String(x.id) === String(req.params.id));
  if (!item) return res.status(404).json({ success: false, message: 'Not found', statusCode: 404 });
  const payload = req.body || {};
  item.status = 'Rejected';
  item.rejectionReason = payload.reason || payload.reason || 'Rejected';
  item.updatedAt = new Date().toISOString();
  const normal = normalizeServiceRequest(item);
  Object.assign(item, normal);
  saveServiceRequests();
  res.json({ success: true, message: 'Rejected', data: normal, statusCode: 200 });
});

app.post('/api/ServiceRequests/:id/verify-stock', express.json(), (req, res) => {
  const item = serviceRequests.find(x => String(x.id) === String(req.params.id));
  if (!item) return res.status(404).json({ success: false, message: 'Not found', statusCode: 404 });
  const payload = req.body || {};
  const isAvailable = payload.isAvailable === true || payload.isAvailable === 'true';
  item.stockVerificationStatus = isAvailable ? 'Verified' : 'Insufficient';
  item.stockVerifiedByName = payload.userName || 'Storekeeper';
  item.stockVerificationDate = new Date().toISOString();
  item.stockVerificationNotes = payload.notes || '';
  item.updatedAt = new Date().toISOString();
  const normal = normalizeServiceRequest(item);
  Object.assign(item, normal);
  saveServiceRequests();
  res.json({ success: true, message: isAvailable ? 'Stock verified' : 'Stock insufficient', data: normal, statusCode: 200 });
});

app.get('/api/ServiceRequests', (req, res) => {
  const items = serviceRequests.map(normalizeServiceRequest);
  const status = req.query.status;
  const filtered = status ? items.filter(x => (x.status || '').toLowerCase() === String(status).toLowerCase()) : items;
  res.json({ success: true, message: '', data: { items: filtered, pageNumber: 1, totalPages: 1, totalCount: filtered.length, hasPreviousPage: false, hasNextPage: false }, statusCode: 200 });
});

// Issue / StoreIssueVouchers
function loadSIVs() {
  try { return JSON.parse(readFileSync(resolve(__dirname, 'data', 'store-issue-vouchers.json'), 'utf8')); } catch { return []; }
}
function saveSIVs(list) { writeFileSync(resolve(__dirname, 'data', 'store-issue-vouchers.json'), JSON.stringify(list, null, 2), 'utf8'); }
const storeIssueVouchers = loadSIVs();

app.post('/api/ServiceRequests/:id/issue', express.json(), (req, res) => {
  const sr = serviceRequests.find(x => String(x.id) === String(req.params.id));
  if (!sr) return res.status(404).json({ success: false, message: 'Service request not found', statusCode: 404 });
  sr.status = 'Issued';
  sr.updatedAt = new Date().toISOString();
  saveServiceRequests();
  const siv = {
    id: 'siv-' + Date.now(),
    sivNumber: 'SIV-' + String(Date.now()).slice(-8),
    serviceRequestId: req.params.id,
    srNumber: sr.srNumber,
    issueDate: new Date().toISOString().split('T')[0],
    requesterName: sr.requesterName || '',
    department: sr.department || '',
    status: 'Issued',
    totalItems: req.body?.items?.length || 0,
    items: (req.body?.items || []).map(x => ({ ...x, id: 'siv-item-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6) })),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  storeIssueVouchers.unshift(siv);
  saveSIVs(storeIssueVouchers);
  res.json({ success: true, message: 'Issued successfully', data: siv, statusCode: 200 });
});

app.get('/api/StoreIssueVouchers', (req, res) => {
  res.json({ success: true, message: '', data: storeIssueVouchers, statusCode: 200 });
});

app.post('/api/StoreIssueVouchers', express.json(), (req, res) => {
  try {
    const { command } = req.body;
    if (!command) return res.status(400).json({ success: false, message: 'No command provided', statusCode: 400 });
    const sr = serviceRequests.find(x => String(x.id) === String(command.serviceRequestId));
    if (sr) { sr.status = 'Issued'; sr.updatedAt = new Date().toISOString(); saveServiceRequests(); }
    const siv = {
      id: 'siv-' + Date.now(),
      sivNumber: 'SIV-' + String(Date.now()).slice(-8),
      serviceRequestId: command.serviceRequestId,
      srNumber: sr?.srNumber || '',
      issueDate: new Date().toISOString().split('T')[0],
      requesterName: command.issuedToId || sr?.requesterName || '',
      department: command.department || sr?.department || '',
      status: 'Issued',
      totalItems: command.items?.length || 0,
      items: (command.items || []).map(x => ({ ...x, id: 'siv-item-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6) })),
      notes: command.notes || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    storeIssueVouchers.unshift(siv);
    saveSIVs(storeIssueVouchers);
    res.status(201).json({ success: true, message: 'SIV created', data: siv.id, statusCode: 201 });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message, statusCode: 500 });
  }
});

app.get('/api/ServiceRequests/:id', (req, res) => {
  const item = serviceRequests.find(x => String(x.id) === String(req.params.id));
  if (!item) return res.status(404).json({ success: false, message: 'Not found', statusCode: 404 });
  res.json({ success: true, message: '', data: normalizeServiceRequest(item), statusCode: 200 });
});

app.post('/api/ServiceRequests', express.json(), (req, res) => {
  try {
    const payload = req.body || {};
    // Support both { command: { ... } } and flat body formats
    const data = payload.command || payload;
    const id = `sr-${Date.now()}`;
    const srNumber = data.srNumber?.trim() || id;
    const item = {
      id, srNumber, ...data,
      status: 'Pending',
      stockVerificationStatus: 'NotVerified',
      requestDate: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
    const normal = normalizeServiceRequest(item);
    serviceRequests.push(normal);
    saveServiceRequests();
    // Notify manager by email
    const managerEmail = process.env.MANAGER_EMAIL || 'k44144202@gmail.com';
    const employeeName = data.requesterName || data.employeeName || 'Employee';
    const emailBody = `Service request ${srNumber} has been submitted by ${employeeName}.\n\nItems:\n${(data.items || []).map(i => `  - ${i.itemName || i.itemId} x ${i.requestedQty || i.quantity}`).join('\n')}\n\nPurpose: ${data.purpose || data.remarks || 'N/A'}\n\nPlease review in the approval dashboard.`;
    sendEmail({ to: managerEmail, subject: `New Service Request: ${srNumber}`, body: emailBody }).catch(() => {});
    return res.status(201).json({ success: true, message: 'Created', data: id, statusCode: 201 });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message, statusCode: 500 });
  }
});

// ServiceRequest (no 's') endpoints used by the core ServiceRequestService
function serviceRequestRows(statusFilter) {
  const all = serviceRequests.map(normalizeServiceRequest);
  const filtered = statusFilter ? all.filter(x => (x.status || '').toLowerCase() === statusFilter.toLowerCase()) : all;
  return filtered.map(x => ({
    id: x.id,
    requestNumber: x.srNumber,
    title: x.purpose || x.notes || '',
    description: x.purpose || '',
    category: x.department || '',
    priority: x.urgency || 'Normal',
    status: x.status,
    requester: x.requesterName,
    requesterId: x.requesterId,
    department: x.department,
    submittedDate: x.requestDate,
    approvedDate: x.updatedAt,
    approvedBy: x.approvedByName || null,
    comments: x.notes || null,
    items: x.items || [],
  }));
}

app.get('/api/ServiceRequest', (req, res) => {
  res.json({ success: true, message: '', data: serviceRequestRows(null), statusCode: 200 });
});

app.get('/api/ServiceRequest/pending', (req, res) => {
  res.json({ success: true, message: '', data: serviceRequestRows('pending'), statusCode: 200 });
});

app.get('/api/ServiceRequest/approved', (req, res) => {
  res.json({ success: true, message: '', data: serviceRequestRows('approved'), statusCode: 200 });
});

app.get('/api/ServiceRequest/rejected', (req, res) => {
  res.json({ success: true, message: '', data: serviceRequestRows('rejected'), statusCode: 200 });
});

app.post('/api/ServiceRequest/:id/reject', express.json(), (req, res) => {
  const item = serviceRequests.find(x => String(x.id) === String(req.params.id));
  if (!item) return res.status(404).json({ success: false, message: 'Not found', statusCode: 404 });
  item.status = 'Rejected';
  item.updatedAt = new Date().toISOString();
  saveServiceRequests();
  res.json({ success: true, message: 'Rejected', data: normalizeServiceRequest(item), statusCode: 200 });
});

// Serve inventory stock data locally (proxy to backend returns 401).
app.get('/api/InventoryStock', (req, res) => {
  try {
    const d = JSON.parse(readFileSync(resolve(__dirname, 'data', 'inventory.json'), 'utf8'));
    const inv = d.inventory || [];
    const whFilter = req.query.warehouseId;
    let filtered = inv;
    if (whFilter) filtered = inv.filter(x => String(x.warehouseId) === String(whFilter));
    const items = filtered.map(x => ({
      ...x,
      id: x.id || x.itemId,
      currentQuantity: x.currentStock ?? x.availableStock ?? 0,
      itemId: x.itemId,
      itemName: x.itemName || '',
      sku: x.sku || '',
      unitOfMeasure: x.unitOfMeasure || 'PCS',
      warehouseName: x.warehouseName || '',
      shelfLocation: x.shelfLocation || '',
      currentStock: x.currentStock ?? x.availableStock ?? 0,
      availableStock: x.availableStock ?? x.currentStock ?? 0,
      unitPrice: x.unitPrice || 0,
    }));
    res.json({ success: true, message: '', data: items, statusCode: 200 });
  } catch {
    res.json({ success: true, message: '', data: [], statusCode: 200 });
  }
});

// ─── DisposalRecords ──────────────────────────────────────────────────────
function loadDisposalRecords() {
  try {
    return JSON.parse(readFileSync(resolve(__dirname, 'data', 'disposal-records.json'), 'utf8'));
  } catch {
    return [];
  }
}
function saveDisposalRecords(list) {
  writeFileSync(resolve(__dirname, 'data', 'disposal-records.json'), JSON.stringify(list, null, 2), 'utf8');
}
let disposalRecords = loadDisposalRecords();

app.get('/api/DisposalRecords', (req, res) => {
  const list = disposalRecords.map(x => ({
    id: x.id,
    disposalNumber: x.disposalNumber,
    itemId: x.items?.[0]?.itemId || '',
    itemName: x.items?.[0]?.itemName || '',
    sku: x.items?.[0]?.sku || '',
    quantity: x.items?.reduce((s, i) => s + i.quantity, 0) || 0,
    disposalDate: x.createdAt,
    createdAt: x.createdAt,
    disposedBy: x.disposedBy || '',
    disposedByName: x.disposedByName || '',
    reason: x.reason || '',
    status: x.status || 'Pending',
    totalItems: x.items?.length || 0,
    totalQuantity: x.items?.reduce((s, i) => s + i.quantity, 0) || 0,
    totalValue: x.items?.reduce((s, i) => s + i.quantity * (i.unitCost || 0), 0) || 0,
    estimatedValue: x.items?.reduce((s, i) => s + i.quantity * (i.unitCost || 0), 0) || 0,
    actualValue: 0,
  }));
  const pageNumber = parseInt(req.query.pageNumber) || 1;
  const pageSize = parseInt(req.query.pageSize) || 50;
  const start = (pageNumber - 1) * pageSize;
  const page = list.slice(start, start + pageSize);
  res.json({
    success: true, message: '',
    data: { items: page, pageNumber, totalPages: Math.ceil(list.length / pageSize), totalCount: list.length, hasPreviousPage: pageNumber > 1, hasNextPage: start + pageSize < list.length },
    statusCode: 200,
  });
});

app.get('/api/DisposalRecords/:id', (req, res) => {
  const record = disposalRecords.find(x => String(x.id) === String(req.params.id));
  if (!record) return res.status(404).json({ success: false, message: 'Not found', statusCode: 404 });
  res.json({
    success: true, message: '', data: {
      ...record,
      auditHistory: record.auditHistory || [{ date: record.createdAt, action: 'Created', performedBy: record.disposedByName || record.disposedBy || '' }],
    }, statusCode: 200,
  });
});

app.post('/api/DisposalRecords', express.json(), (req, res) => {
  try {
    const { items, reason } = req.body;
    if (!items || !items.length) return res.status(400).json({ success: false, message: 'No items provided', statusCode: 400 });
    // Deduct stock from inventory.json
    const d = JSON.parse(readFileSync(resolve(__dirname, 'data', 'inventory.json'), 'utf8'));
    const inv = d.inventory || [];
    const im = d.itemMasters || [];
    for (const item of items) {
      const invRec = inv.find(x => String(x.itemId) === String(item.itemId));
      if (invRec) {
        if ((invRec.availableStock ?? 0) < item.quantity) {
          return res.status(400).json({ success: false, message: `Insufficient stock for item '${item.itemName || item.itemId}'. Available: ${invRec.availableStock ?? 0}, Requested for disposal: ${item.quantity}`, statusCode: 400 });
        }
        invRec.currentStock = (invRec.currentStock ?? 0) - item.quantity;
        invRec.availableStock = (invRec.availableStock ?? 0) - item.quantity;
      }
      const imRec = im.find(x => String(x.id) === String(item.itemId));
      if (imRec) {
        imRec.currentStock = Math.max(0, (imRec.currentStock ?? 0) - item.quantity);
        imRec.availableStock = Math.max(0, (imRec.availableStock ?? 0) - item.quantity);
        imRec.stockQuantity = Math.max(0, (imRec.stockQuantity ?? 0) - item.quantity);
      }
    }
    // Remove inventory records where stock reached 0
    d.inventory = inv.filter(x => (x.availableStock ?? 0) > 0);
    // Remove itemMasters where stock reached 0
    d.itemMasters = im.filter(x => (x.availableStock ?? x.currentStock ?? x.stockQuantity ?? 0) > 0);
    writeFileSync(resolve(__dirname, 'data', 'inventory.json'), JSON.stringify(d, null, 2), 'utf8');
    // Create disposal record
    const record = {
      id: 'disp-' + Date.now(),
      disposalNumber: 'DSP-' + String(Date.now()).slice(-8),
      items: items.map(x => ({ ...x, unitCost: 0, totalValue: 0 })),
      reason: reason || '',
      status: 'Completed',
      disposedBy: req.body.userId || req.body.disposedBy || 'storekeeper',
      disposedByName: req.body.userName || req.body.disposedByName || 'Storekeeper',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      auditHistory: [{ date: new Date().toISOString(), action: 'Created & Completed', performedBy: req.body.userName || req.body.disposedByName || 'Storekeeper' }],
    };
    disposalRecords.unshift(record);
    saveDisposalRecords(disposalRecords);
    return res.status(201).json({ success: true, message: 'Disposal completed successfully', data: record.id, statusCode: 201 });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message, statusCode: 500 });
  }
});

app.post('/api/DisposalRecords/:id/approve', express.json(), (req, res) => {
  const record = disposalRecords.find(x => String(x.id) === String(req.params.id));
  if (!record) return res.status(404).json({ success: false, message: 'Not found', statusCode: 404 });
  record.status = req.body.isApproved ? 'Approved' : 'Rejected';
  record.approvedById = req.body.userId || '';
  record.approvedByName = req.body.userName || '';
  record.approvedDate = new Date().toISOString();
  record.approvalRemarks = req.body.remarks || '';
  record.updatedAt = new Date().toISOString();
  (record.auditHistory || (record.auditHistory = [])).push({ date: record.approvedDate, action: record.status === 'Approved' ? 'Approved' : 'Rejected', performedBy: req.body.userName || '', remarks: req.body.remarks || '' });
  saveDisposalRecords(disposalRecords);
  res.json({ success: true, message: `Disposal ${record.status}`, data: record, statusCode: 200 });
});

// ─── Warehouses ──────────────────────────────────────────────────────────
const warehouses = [
  { id: 'wh-001', warehouseName: 'Main Warehouse', location: 'Building A', isActive: true },
  { id: 'wh-002', warehouseName: 'Branch Warehouse A', location: 'Building B', isActive: true },
  { id: 'wh-003', warehouseName: 'Overflow Storage', location: 'Building C', isActive: true },
];

app.get('/api/Warehouses', (req, res) => {
  let list = warehouses;
  if (req.query.isActive === 'true') list = list.filter(w => w.isActive);
  res.json({ success: true, message: '', data: list, statusCode: 200 });
});

// ─── TransferRecords ─────────────────────────────────────────────────────
const transferRecords = [];

app.get('/api/TransferRecords', (req, res) => {
  const pageNumber = parseInt(req.query.pageNumber) || 1;
  const pageSize = parseInt(req.query.pageSize) || 20;
  const start = (pageNumber - 1) * pageSize;
  const page = transferRecords.slice(start, start + pageSize);
  res.json({
    success: true, message: '',
    data: { items: page, pageNumber, totalPages: Math.ceil(transferRecords.length / pageSize), totalCount: transferRecords.length, hasPreviousPage: pageNumber > 1, hasNextPage: start + pageSize < transferRecords.length },
    statusCode: 200,
  });
});

app.get('/api/TransferRecords/:id', (req, res) => {
  const item = transferRecords.find(x => String(x.id) === String(req.params.id));
  if (!item) return res.status(404).json({ success: false, message: 'Not found', statusCode: 404 });
  res.json({ success: true, message: '', data: item, statusCode: 200 });
});

app.post('/api/TransferRecords', express.json(), (req, res) => {
  try {
    const { itemId, quantity, fromLocationId, toLocationId, reason, remarks, reference } = req.body;
    if (!itemId || !fromLocationId || !toLocationId) return res.status(400).json({ success: false, message: 'Missing required fields', statusCode: 400 });
    const fromWh = warehouses.find(w => String(w.id) === String(fromLocationId));
    const toWh = warehouses.find(w => String(w.id) === String(toLocationId));
    const record = {
      id: 'tr-' + Date.now(),
      transferNumber: reference || `TR-${Date.now()}`,
      itemId,
      quantity: quantity || 1,
      fromLocationId,
      fromLocation: fromLocationId,
      fromLocationName: fromWh?.warehouseName || fromLocationId,
      toLocationId,
      toLocation: toLocationId,
      toLocationName: toWh?.warehouseName || toLocationId,
      reason: reason || '',
      remarks: remarks || '',
      status: 'Completed',
      initiatedBy: 'storekeeper',
      transferDate: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      history: [{ date: new Date().toISOString(), action: 'Created', performedBy: 'storekeeper' }],
    };
    transferRecords.unshift(record);
    res.status(201).json({ success: true, message: 'Transfer record created', data: record.id, statusCode: 201 });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message, statusCode: 500 });
  }
});


app.use('/api', (req, res, next) => {
  const isEmailPath =
    req.path.startsWith('/Notifications') ||
    req.path.startsWith('/Auth/login') ||
    req.path.startsWith('/Auth/register') ||
    req.path.startsWith('/Auth/forgot-password') ||
    req.path.startsWith('/Auth/reset-password') ||
    req.path.startsWith('/Auth/register-pending') ||
    req.path.startsWith('/Auth/pending-registrations');
  if (!isEmailPath) {
    console.log('Proxying to backend:', req.method, req.originalUrl);
    return proxyToBackend(req, res);
  }
  next();
});

const port = 5030;

// Initialize database (non-fatal — auth/login endpoints don't need it)
try {
  getDb();
} catch (err) {
  console.error('Database init failed (auth/login still works):', err.message);
}

app.listen(port, () => {
  console.log(`Email service running on http://localhost:${port}`);
  console.log(`Proxying non-email /api requests to http://127.0.0.1:${BACKEND_PORT}`);
  console.log('Endpoints:');
  console.log('  POST /api/Notifications/send-email  - Send a direct email');
  console.log('  POST /api/Notifications             - Send notification email');
  console.log('  GET  /api/Notifications             - List notifications');
  console.log('  POST /api/Auth/forgot-password      - Generate reset token & send email');
  console.log('  POST /api/Auth/login                - Local login handler');
  console.log('  POST /api/Auth/register             - Register new user');
  console.log('  POST /api/Auth/logout               - Logout current user');
  console.log('  POST /api/Auth/refresh-token        - Refresh JWT token');
  console.log('  POST /api/Auth/change-password      - Change user password');
  console.log('  POST /api/Auth/reset-password       - Reset password using token');
  console.log('  POST /api/Auth/resend-verification  - Resend email confirmation');
  console.log('  POST /api/Auth/register-pending     - Register pending user');
  console.log('  GET  /api/Auth/pending-registrations - List pending users');
  console.log('  GET  /api/Auth/pending-registrations/count - Pending count');
  console.log('  POST /api/Auth/pending-registrations/:id/approve - Approve pending');
  console.log('  POST /api/Auth/pending-registrations/:id/reject  - Reject pending');
  console.log('  GET  /api/Auth/me                   - Get current user profile');
  console.log('  GET  /api/Auth/confirm-email        - Confirm email address');
  console.log('  POST /api/Auth/enable-2fa           - Enable 2FA');
  console.log('  POST /api/Auth/disable-2fa          - Disable 2FA');
  console.log('  POST /api/Auth/send-phone-otp       - Send OTP to phone');
  console.log('  POST /api/Auth/verify-phone-otp     - Verify phone OTP code');
  console.log('  POST /api/Auth/upload-profile-photo - Upload profile photo');
  console.log('  PUT  /api/Auth/update-profile        - Update current user profile');
});
