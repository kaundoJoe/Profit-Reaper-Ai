const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const https = require('https');

const PORT = process.env.PORT || 10000;
const ADMIN_PASS = process.env.ADMIN_PASS || 'admin123';
const DB_FILE = process.env.DB_FILE || './data.json';

let db = { users: {}, keys: {} };
try {
  if (fs.existsSync(DB_FILE)) db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
} catch (e) { console.log('No DB yet, starting fresh'); }
if (!db.users) db.users = {};
if (!db.keys) db.keys = {};

function save() {
  try {
    fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
    fs.writeFileSync(DB_FILE, JSON.stringify(db));
  } catch (e) { console.log('Save error', e.message); }
}

function genKey() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let k = 'PR-';
  for (let i = 0; i < 4; i++) k += chars[Math.floor(Math.random() * chars.length)];
  k += '-';
  for (let i = 0; i < 4; i++) k += chars[Math.floor(Math.random() * chars.length)];
  return k;
}

function send(res, code, obj) {
  res.writeHead(code, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
  res.end(JSON.stringify(obj));
}

function serveFile(res, file, type) {
  const p = path.join(__dirname, file);
  if (!fs.existsSync(p)) { res.writeHead(404); return res.end('Not found: ' + file); }
  res.writeHead(200, { 'Content-Type': type });
  res.end(fs.readFileSync(p));
}

function getBody(req, cb) {
  let d = '';
  req.on('data', c => d += c);
  req.on('end', () => {
    try { cb(JSON.parse(d || '{}')); } catch (e) { cb({}); }
  });
}

// --- REAL DERIV SIGNAL ---
function getDerivSignal(cb) {
  const symbols = ['R_10', 'R_25', 'R_50', 'R_75', 'R_100'];
  const symbol = symbols[Math.floor(Math.random() * symbols.length)];
  const post = JSON.stringify({ ticks_history: symbol, count: 20, end: 'latest', style: 'ticks' });
  const opts = { hostname: 'api.deriv.com', path: '/api/v3', method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(post) } };
  const r = https.request(opts, (resp) => {
    let data = '';
    resp.on('data', c => data += c);
    resp.on('end', () => {
      try {
        const j = JSON.parse(data);
        const prices = j.history ? j.history.prices : null;
        if (!prices || prices.length < 5) throw new Error('no prices');
        const last = prices[prices.length - 1];
        const prev = prices[prices.length - 2];
        const change = ((last - prev) / prev * 100).toFixed(2);
        const signal = last > prev ? 'CALL' : 'PUT';
        const confidence = Math.min(95, 55 + Math.floor(Math.random() * 35));
        cb({ symbol, price: last, change, signal, confidence, time: new Date().toISOString(), source: 'DERIV LIVE' });
      } catch (e) { cb({ symbol, price: 0, change: '0.00', signal: 'CALL', confidence: 70, time: new Date().toISOString(), source: 'FALLBACK' }); }
    });
  });
  r.on('error', () => cb({ symbol, price: 0, change: '0.00', signal: 'CALL', confidence: 70, time: new Date().toISOString(), source: 'FALLBACK' }));
  r.write(post);
  r.end();
}

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.writeHead(200); return res.end(); }

  const url = req.url.split('?')[0];

  // PAGES
  if (url === '/' || url === '/index.html') return serveFile(res, 'index.html', 'text/html');
  if (url === '/app.html') return serveFile(res, 'app.html', 'text/html');
  if (url === '/admin.html') return serveFile(res, 'admin.html', 'text/html');
  if (url === '/admin-login.html') return serveFile(res, 'admin-login.html', 'text/html');

  // API: REGISTER - creates license key
  if (url === '/api/register' && req.method === 'POST') {
    return getBody(req, (b) => {
      const email = (b.email || '').toLowerCase().trim();
      const pass = b.password || '';
      if (!email || !pass) return send(res, 400, { error: 'Email and password required' });
      if (db.users[email]) return send(res, 400, { error: 'Account already exists, please login' });
      const key = genKey();
      db.users[email] = { email, password: pass, key, created: new Date().toISOString() };
      db.keys[key] = { email, created: new Date().toISOString(), active: true };
      save();
      return send(res, 200, { success: true, key, message: 'Account created! Your license key is ' + key });
    });
  }

  // API: LOGIN
  if (url === '/api/login' && req.method === 'POST') {
    return getBody(req, (b) => {
      const email = (b.email || '').toLowerCase().trim();
      const u = db.users[email];
      if (!u || u.password !== b.password) return send(res, 401, { error: 'Wrong email or password' });
      return send(res, 200, { success: true, key: u.key, email });
    });
  }

  // API: VERIFY LICENSE KEY
  if (url === '/api/verify' && req.method === 'POST') {
    return getBody(req, (b) => {
      const key = (b.key || '').toUpperCase().trim();
      const k = db.keys[key];
      if (!k || !k.active) return send(res, 401, { valid: false, error: 'Invalid or deactivated license key' });
      return send(res, 200, { valid: true, email: k.email });
    });
  }

  // API: SIGNAL - needs valid key
  if (url === '/api/signal' && req.method === 'POST') {
    return getBody(req, (b) => {
      const key = (b.key || '').toUpperCase().trim();
      const k = db.keys[key];
      if (!k || !k.active) return send(res, 401, { error: 'Invalid license key' });
      getDerivSignal((s) => send(res, 200, { success: true, ...s }));
    });
  }

  // API: ADMIN LOGIN
  if (url === '/api/admin-login' && req.method === 'POST') {
    return getBody(req, (b) => {
      if (b.password === ADMIN_PASS) return send(res, 200, { success: true, token: 'admin-' + crypto.randomBytes(8).toString('hex') });
      return send(res, 401, { error: 'Wrong admin password' });
    });
  }

  // API: ADMIN STATS
  if (url === '/api/admin-stats' && req.method === 'GET') {
    const users = Object.values(db.users);
    const keys = Object.keys(db.keys);
    return send(res, 200, { totalUsers: users.length, totalKeys: keys.length, activeKeys: keys.filter(k => db.keys[k].active).length, users: users.map(u => ({ email: u.email, key: u.key, created: u.created })) });
  }

  // API: ADMIN - CREATE KEY
  if (url === '/api/admin-create-key' && req.method === 'POST') {
    return getBody(req, (b) => {
      const key = genKey();
      db.keys[key] = { email: b.email || 'admin-created', created: new Date().toISOString(), active: true };
      save();
      return send(res, 200, { success: true, key });
    });
  }

  // API: ADMIN - TOGGLE KEY
  if (url === '/api/admin-toggle-key' && req.method === 'POST') {
    return getBody(req, (b) => {
      const k = db.keys[(b.key || '').toUpperCase()];
      if (!k) return send(res, 404, { error: 'Key not found' });
      k.active = !k.active;
      save();
      return send(res, 200, { success: true, active: k.active });
    });
  }

  res.writeHead(404);
  res.end('Not found');
});

server.listen(PORT, () => console.log('Profit Reaper LIVE on port ' + PORT));
