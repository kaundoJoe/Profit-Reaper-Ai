const http = require('http');
const querystring = require('querystring');
const PORT = process.env.PORT || 10000;

// Simple in-memory users (for demo - use real DB later)
let users = {};

function layout(title, body) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${title} - PROFIT REAPER AI</title><style>
  *{box-sizing:border-box;margin:0;padding:0;font-family:-apple-system,Arial,sans-serif}
  body{background:#000;color:#fff;min-height:100vh;display:flex;justify-content:center;padding:20px 16px}
  .wrap{width:100%;max-width:420px;text-align:center;padding-top:20px}
  .logo{width:92px;height:92px;margin:0 auto 16px;border:3px solid #7CFF00;border-radius:22px;display:flex;align-items:center;justify-content:center;font-size:32px;font-weight:900;color:#7CFF00;box-shadow:0 0 30px rgba(124,255,0,.35)}
  h1{font-size:32px;font-weight:900;line-height:1.1} h2{font-size:22px;margin-bottom:20px}
  .sub{color:#aaa;font-size:15px;margin:12px 0 28px;line-height:1.5}
  .card{background:#0a120a;border:1px solid #1e3a1e;border-radius:22px;padding:28px 22px;text-align:left;margin-bottom:16px}
  label{display:block;color:#ccc;font-size:12px;letter-spacing:2px;margin:0 0 8px 4px}
  input,select{width:100%;background:#050805;border:1px solid #1e4a1e;border-radius:14px;padding:16px;color:#fff;font-size:16px;margin-bottom:18px;outline:none}
  input:focus{border-color:#7CFF00}
  .btn{width:100%;background:#7CFF00;color:#000;border:none;border-radius:14px;padding:17px;font-size:17px;font-weight:800;cursor:pointer}
  .btn-outline{width:100%;background:transparent;color:#7CFF00;border:1.5px solid #7CFF00;border-radius:14px;padding:16px;font-size:16px;font-weight:700;cursor:pointer;margin-top:16px}
  .btn-red{width:100%;background:#ff3b30;color:#fff;border:none;border-radius:14px;padding:16px;font-size:16px;font-weight:700;cursor:pointer;margin-top:12px}
  .disclaimer{color:#666;font-size:12px;line-height:1.6;margin-top:24px;text-align:center}
  .topbar{display:flex;justify-content:space-between;align-items:center;margin-bottom:20px}
  .badge{background:#7CFF00;color:#000;padding:6px 12px;border-radius:20px;font-weight:800;font-size:12px}
  .stat{display:flex;justify-content:space-between;padding:12px 0;border-bottom:1px solid #1e3a1e;font-size:15px}
  .stat b{color:#7CFF00}
  .signal{border:1px solid #1e3a1e;border-radius:16px;padding:16px;margin-bottom:12px;text-align:left}
  .signal .pair{font-size:18px;font-weight:900}
  .buy{color:#7CFF00} .sell{color:#ff3b30}
  .small{color:#aaa;font-size:13px;line-height:1.5}
  a{color:#7CFF00;text-decoration:none}
  .nav{display:flex;gap:10px;margin-bottom:16px}
  .nav a{flex:1;background:#111;padding:12px;border-radius:12px;font-size:14px;font-weight:700}
  .nav a.active{background:#7CFF00;color:#000}
  </style></head><body><div class="wrap">${body}</div></body></html>`;
}

function loginPage(msg='') {
  return layout('Log In', `<div class="logo">PR</div><h1>PROFIT REAPER AI</h1><p class="sub">Live market analysis, daily signals and a fast scalping robot.</p>${msg?`<p style="color:#ff3b30;margin-bottom:16px">${msg}</p>`:''}<div class="card"><h2>Log in</h2><form method="POST" action="/login"><label>EMAIL</label><input type="email" name="email" required><label>PASSWORD</label><input type="password" name="password" required><button class="btn" type="submit">LOG IN</button></form><button class="btn-outline" onclick="window.location.href='/signup'">Create account</button></div><p class="disclaimer">Trading carries a high risk of loss. Signals and the bot are educational tools, not financial advice, and no profit is guaranteed.</p>`);
}

function signupPage(msg='') {
  return layout('Create Account', `<div class="logo">PR</div><h1>CREATE ACCOUNT</h1><p class="sub">Join Profit Reaper AI. Get signals + bot access instantly.</p>${msg?`<p style="color:#ff3b30;margin-bottom:16px">${msg}</p>`:''}<div class="card"><h2>Sign Up</h2><form method="POST" action="/signup"><label>FULL NAME</label><input type="text" name="name" required placeholder="John Doe"><label>EMAIL</label><input type="email" name="email" required><label>PASSWORD</label><input type="password" name="password" required><label>CONFIRM PASSWORD</label><input type="password" name="password2" required><button class="btn" type="submit">CREATE ACCOUNT</button></form><button class="btn-outline" onclick="window.location.href='/'">Already have account? Log in</button></div><p class="disclaimer">By creating an account you agree trading is risky. No profit is guaranteed.</p>`);
}

function dashboardPage(userEmail, name) {
  return layout('Dashboard', `
  <div class="topbar"><div style="text-align:left"><b>Hi, ${name||'Trader'} 👋</b><div class="small">${userEmail}</div></div><span class="badge">PRO LIVE</span></div>
  <div class="nav"><a href="/dashboard" class="active">Dashboard</a><a href="/signals">Signals</a><a href="/bot">Bot</a></div>
  <div class="card"><h2>Account Overview</h2>
    <div class="stat"><span>Balance (Demo)</span><b>$10,000.00</b></div>
    <div class="stat"><span>Today Profit</span><b>+$142.50</b></div>
    <div class="stat"><span>Win Rate</span><b>68%</b></div>
    <div class="stat"><span>Active Trades</span><b>2</b></div>
  </div>
  <div class="card"><h2>🔥 Today's Top Signal</h2>
    <div class="signal"><div class="pair">EUR/USD <span class="buy">BUY ↑</span></div><div class="small">Entry: 1.0845 | TP: 1.0895 | SL: 1.0815 | Confidence: 87%<br>Timeframe: 15m Scalp</div></div>
    <button class="btn" onclick="window.location.href='/signals'">View All Signals</button>
  </div>
  <div class="card"><h2>🤖 Scalping Bot</h2><p class="small">Status: <b style="color:#7CFF00">READY - Not Running</b><br>Strategy: Reaper Scalp v2 • Risk: 1% per trade</p><br><button class="btn" onclick="window.location.href='/bot'">Open Bot Controls</button></div>
  <button class="btn-outline" onclick="window.location.href='/'">Log Out</button>
  `);
}

function signalsPage() {
  return layout('Signals', `
  <div class="topbar"><b>📈 Live Signals</b><span class="badge">LIVE</span></div>
  <div class="nav"><a href="/dashboard">Dashboard</a><a href="/signals" class="active">Signals</a><a href="/bot">Bot</a></div>
  <div class="signal"><div class="pair">EUR/USD <span class="buy">BUY ↑</span></div><div class="small">Entry 1.0845 | TP 1.0895 | SL 1.0815 | 87% | 15m</div></div>
  <div class="signal"><div class="pair">GBP/USD <span class="sell">SELL ↓</span></div><div class="small">Entry 1.2720 | TP 1.2670 | SL 1.2750 | 82% | 15m</div></div>
  <div class="signal"><div class="pair">XAU/USD (Gold) <span class="buy">BUY ↑</span></div><div class="small">Entry 2650.00 | TP 2665.00 | SL 2642.00 | 91% | 30m</div></div>
  <div class="signal"><div class="pair">BTC/USD <span class="buy">BUY ↑</span></div><div class="small">Entry 97,200 | TP 98,500 | SL 96,400 | 79% | 1H</div></div>
  <div class="signal"><div class="pair">USD/JPY <span class="sell">SELL ↓</span></div><div class="small">Entry 154.20 | TP 153.60 | SL 154.60 | 74% | 15m</div></div>
  <p class="disclaimer">Signals update every 15 minutes. Not financial advice.</p>
  <button class="btn-outline" onclick="window.location.href='/dashboard'">Back to Dashboard</button>
  `);
}

function botPage() {
  return layout('Bot', `
  <div class="topbar"><b>🤖 Reaper Bot</b><span class="badge">v2.0</span></div>
  <div class="nav"><a href="/dashboard">Dashboard</a><a href="/signals">Signals</a><a href="/bot" class="active">Bot</a></div>
  <div class="card"><h2>Bot Settings</h2><form method="POST" action="/bot"><label>PAIR</label><select name="pair"><option>EUR/USD</option><option>GBP/USD</option><option>XAU/USD</option><option>BTC/USD</option></select><label>LOT SIZE</label><select name="lot"><option>0.01</option><option>0.05</option><option>0.10</option></select><label>RISK PER TRADE</label><select name="risk"><option>1%</option><option>2%</option><option>5%</option></select><button class="btn" type="submit">▶ START BOT</button></form><button class="btn-red" onclick="alert('Bot Stopped')">⏹ STOP BOT</button></div>
  <div class="card"><h2>Bot Log</h2><p class="small">• Bot ready...<br>• Waiting for signal...<br>• EUR/USD scanned - No entry yet<br>• Risk check: OK</p></div>
  <button class="btn-outline" onclick="window.location.href='/dashboard'">Back to Dashboard</button>
  `);
}

const server = http.createServer((req, res) => {
  let body = '';
  req.on('data', c => body += c);
  req.on('end', () => {
    const data = querystring.parse(body);
    const url = req.url.split('?')[0];

    if (url === '/' && req.method === 'GET') return res.end(loginPage());
    if (url === '/signup' && req.method === 'GET') return res.end(signupPage());
    if (url === '/dashboard') return res.end(dashboardPage('demo@profitreaper.com', 'Trader'));
    if (url === '/signals') return res.end(signalsPage());
    if (url === '/bot') return res.end(botPage());

    if (url === '/signup' && req.method === 'POST') {
      if (!data.name || !data.email || !data.password) return res.end(signupPage('Fill all fields'));
      if (data.password !== data.password2) return res.end(signupPage('Passwords do not match'));
      users[data.email] = { name: data.name, password: data.password };
      res.writeHead(302, { Location: '/dashboard' }); return res.end();
    }
    if (url === '/login' && req.method === 'POST') {
      // Allow any login for demo, or check saved user
      const u = users[data.email];
      if (u && u.password !== data.password) return res.end(loginPage('Wrong password'));
      res.writeHead(302, { Location: '/dashboard' }); return res.end();
    }
    if (url === '/bot' && req.method === 'POST') {
      return res.end(layout('Bot Started', `<div class="logo">PR</div><h1>BOT STARTED ✅</h1><p class="sub">Pair: ${data.pair} | Lot: ${data.lot} | Risk: ${data.risk}<br><br>Bot is now scanning for entries...</p><button class="btn" onclick="window.location.href='/bot'">Back to Bot</button><br><br><button class="btn-outline" onclick="window.location.href='/dashboard'">Dashboard</button>`));
    }
    res.end(loginPage());
  });
});

server.listen(PORT, () => console.log('Profit Reaper FULL LIVE on ' + PORT));
