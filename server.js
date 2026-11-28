const http = require('http');
const PORT = process.env.PORT || 10000;

const homePage = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>PROFIT REAPER AI</title>
<style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, Arial, sans-serif; }
  body { background: #000; color: #fff; min-height: 100vh; display: flex; justify-content: center; padding: 20px 16px; }
  .wrap { width: 100%; max-width: 420px; text-align: center; padding-top: 40px; }
  .logo { width: 92px; height: 92px; margin: 0 auto 16px; border: 3px solid #7CFF00; border-radius: 22px; display: flex; align-items: center; justify-content: center; font-size: 32px; font-weight: 900; color: #7CFF00; box-shadow: 0 0 30px rgba(124,255,0,0.35); }
  h1 { font-size: 32px; font-weight: 900; line-height: 1.1; }
  .sub { color: #aaa; font-size: 15px; margin: 12px 0 28px; line-height: 1.5; }
  .card { background: #0a120a; border: 1px solid #1e3a1e; border-radius: 22px; padding: 28px 22px; text-align: left; }
  .card h2 { font-size: 22px; margin-bottom: 22px; }
  label { display: block; color: #ccc; font-size: 12px; letter-spacing: 2px; margin: 0 0 8px 4px; }
  input { width: 100%; background: #050805; border: 1px solid #1e4a1e; border-radius: 14px; padding: 16px; color: #fff; font-size: 16px; margin-bottom: 18px; outline: none; }
  input:focus { border-color: #7CFF00; }
  .btn-login { width: 100%; background: #7CFF00; color: #000; border: none; border-radius: 14px; padding: 17px; font-size: 17px; font-weight: 800; cursor: pointer; margin-top: 6px; }
  .btn-create { width: 100%; background: transparent; color: #7CFF00; border: 1.5px solid #7CFF00; border-radius: 14px; padding: 16px; font-size: 16px; font-weight: 700; cursor: pointer; margin-top: 16px; }
  .disclaimer { color: #666; font-size: 12px; line-height: 1.6; margin-top: 24px; text-align: center; }
</style>
</head>
<body>
  <div class="wrap">
    <div class="logo">PR</div>
    <h1>PROFIT REAPER AI</h1>
    <p class="sub">Live market analysis, daily signals and a fast scalping robot.</p>
    <div class="card">
      <h2>Log in</h2>
      <form method="POST" action="/login">
        <label>EMAIL</label>
        <input type="email" name="email" required>
        <label>PASSWORD</label>
        <input type="password" name="password" required>
        <button class="btn-login" type="submit">LOG IN</button>
      </form>
      <button class="btn-create" onclick="window.location.href='/signup'">Create account</button>
    </div>
    <p class="disclaimer">Trading carries a high risk of loss. Signals and the bot are educational tools, not financial advice, and no profit is guaranteed. Past or paper results do not predict real results.</p>
  </div>
</body>
</html>`;

const server = http.createServer((req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  if (req.url === '/signup') {
    res.end('<h2 style="color:white;background:black;padding:40px;text-align:center;">Create account - coming next</h2><p style="text-align:center;"><a href="/">Back</a></p>');
  } else if (req.url === '/login' && req.method === 'POST') {
    res.end('<h2 style="color:white;background:black;padding:40px;text-align:center;">Logged in - Dashboard coming next</h2><p style="text-align:center;"><a href="/">Back</a></p>');
  } else {
    res.end(homePage);
  }
});

server.listen(PORT, () => console.log('Profit Reaper LIVE on port ' + PORT));
