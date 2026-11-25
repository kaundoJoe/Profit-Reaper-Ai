PROFIT REAPER - SETUP
=====================
Needs a host that runs Node.js 18+ (Render, Railway, a VPS...). Do NOT use plain file hosting: the keys,
logins and owner panel need this server.

1. Upload this folder. Start command:  node server.js
2. Set these environment variables (required):
   OWNER_EMAIL=you@example.com        (your owner login)
   OWNER_PASSWORD=a-long-password     (change it, 12+ characters)
   DB_FILE=/data/data.json            (put this on a persistent disk or you lose all clients on redeploy)
3. Optional:
   ECOCASH=0786351730   CONTACT=your WhatsApp number
   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, MAIL_FROM   (real email sending; also run: npm install nodemailer)
   ANTHROPIC_API_KEY=...   (AI screenshot reading; VISION_PER_DAY=10 per user)
   SIGNAL_TF=15m  SIGNAL_MIN_SCORE=5  SIGNALS_PER_DAY=4
4. Use HTTPS (hosts like Render give it free). Open https://your-site/ and log in as owner, then /admin.

Without SMTP, keys are NOT emailed. The owner panel shows each message with "Open in email app" and
"Send via WhatsApp" buttons so you can send them yourself.
Back up data.json regularly.
