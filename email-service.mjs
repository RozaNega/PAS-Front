import express from 'express';
import nodemailer from 'nodemailer';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { readFileSync, existsSync, writeFileSync } from 'fs';
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

// ---------- Local Login Handler (dev mock) ----------

app.post('/api/Auth/login', async (req, res) => {
  try {
    const { username, userName, UserName, email, Email, password, Password } = req.body || {};
    const loginName = username || userName || UserName || email || Email || '';
    const loginPwd = password || Password || '';

    if (!loginName || !loginPwd) {
      return res.status(400).json({ success: false, message: 'Username and password are required' });
    }

    // Check local user store first (match by username or email)
    let userEntry = null;
    for (const [storedEmail, storedUser] of usersStore) {
      const matchName = storedUser.username.toLowerCase() === loginName.toLowerCase();
      const matchEmail = storedEmail.toLowerCase() === loginName.toLowerCase();
      if (matchName || matchEmail) {
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

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: userEntry.email,
          username: userEntry.username,
          fullName: userEntry.fullName,
          email: userEntry.email,
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

// ---------- Local Register Intercept (dev mock) ----------

app.post('/api/Auth/register', async (req, res) => {
  try {
    const { username, fullName, email, password, roleName } = req.body || {};

    // Store locally so login and forgot-password work
    if (email && password) {
      const uname = username || (fullName || '').toLowerCase().replace(/\s+/g, '_') || email.split('@')[0];
      usersStore.set(email.toLowerCase(), {
        username: uname,
        password,
        fullName: fullName || uname,
        role: roleName || 'Admin',
      });
      saveUsersStore(usersStore);

      // Also store in approvedUsers for username lookup
      approvedUsers.set(email.toLowerCase(), uname);
      saveApprovedUsers(approvedUsers);
    }

    // Proxy to backend for actual registration
    return proxyToBackend(req, res);
  } catch (err) {
    console.error('register intercept error:', err);
    return proxyToBackend(req, res);
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
app.listen(port, () => {
  console.log(`Email service running on http://localhost:${port}`);
  console.log(`Proxying non-email /api requests to http://127.0.0.1:${BACKEND_PORT}`);
  console.log('Endpoints:');
  console.log('  POST /api/Notifications/send-email  - Send a direct email');
  console.log('  POST /api/Notifications             - Send notification email');
  console.log('  GET  /api/Notifications             - List notifications');
  console.log('  POST /api/Auth/forgot-password      - Generate reset token & send email');
});
