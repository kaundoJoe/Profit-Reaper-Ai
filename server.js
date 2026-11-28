'use strict';
/* Profit Reaper server: accounts, license + activation keys, owner admin, signals, protected bot page.
   No dependencies required (nodemailer optional for real email). Needs Node 18+. */
const http=require('http'),fs=require('fs'),path=require('path'),crypto=require('crypto');
const E=process.env,PORT=+E.PORT||3000,DBF=E.DB_FILE||path.join(__dirname,'data.json'),PUB=fs.existsSync(path.join(__dirname,'public','index.html'))?path.join(__dirname,'public'):__dirname;
const CFG={ecocash:E.ECOCASH||'0786351730',contact:E.CONTACT||'',priceFull:10,priceActivation:4};
let db={users:{},keys:{},sessions:{},signals:[],payments:[],outbox:[],usage:{}};
try{db={...db,...JSON.parse(fs.readFileSync(DBF,'utf8'))}}catch(e){}
const save=()=>{const t=DBF+'.tmp';fs.writeFileSync(t,JSON.stringify(db));fs.renameSync(t,DBF)};
const rid=n=>crypto.randomBytes(n).toString('hex'),sha=s=>crypto.createHash('sha256').update(s).digest('hex');
const mkKey=p=>p+'-'+[0,1,2].map(()=>crypto.randomBytes(2).toString('hex').toUpperCase()).join('-');
const hashPw=(pw,salt)=>crypto.scryptSync(pw,salt,64).toString('hex');
const same=(a,b)=>{const x=Buffer.from(a),y=Buffer.from(b);return x.length===y.length&&crypto.timingSafeEqual(x,y)};
const norm=e=>String(e||'').trim().toLowerCase(),okMail=e=>/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e);
const active=u=>!!(u&&!u.suspended&&(u.role==='owner'||(u.activation&&db.keys[u.activation]&&!db.keys[u.activation].revoked)));
const pub=u=>({name:u.name,surname:u.surname,email:u.email,role:u.role,activated:active(u),suspended:!!u.suspended,licenseType:(db.keys[u.license]||{}).type||''});
/* ---------- owner bootstrap ---------- */
if(E.OWNER_EMAIL&&E.OWNER_PASSWORD&&!Object.values(db.users).some(u=>u.role==='owner')){const email=norm(E.OWNER_EMAIL),salt=rid(16);
 db.users[email]={id:rid(6),name:E.OWNER_NAME||'Founder',surname:'',email,phone:'',country:'',salt,pass:hashPw(E.OWNER_PASSWORD,salt),role:'owner',license:'',activation:'',createdAt:Date.now(),lastLogin:0};save();console.log('Owner account created for',email)}
else if(!Object.values(db.users).some(u=>u.role==='owner'))console.log('WARNING: set OWNER_EMAIL and OWNER_PASSWORD to create the owner account.');
/* ---------- email ---------- */
let nm=null;try{nm=require('nodemailer')}catch(e){}
async function mail(to,subject,text){const r={id:rid(4),t:Date.now(),to,subject,text,status:'queued'};db.outbox.unshift(r);db.outbox=db.outbox.slice(0,300);
 if(nm&&E.SMTP_HOST){try{await nm.createTransport({host:E.SMTP_HOST,port:+E.SMTP_PORT||587,secure:+E.SMTP_PORT===465,auth:{user:E.SMTP_USER,pass:E.SMTP_PASS}}).sendMail({from:E.MAIL_FROM||E.SMTP_USER,to,subject,text});r.status='sent'}catch(e){r.status='failed: '+e.message}}
 else r.status='NOT SENT (SMTP not set up). Copy this message and send it yourself.';save();return r.status}
/* ---------- helpers ---------- */
const hits={};function limited(ip,k,max,win){const t=Date.now(),a=(hits[ip+k]=(hits[ip+k]||[]).filter(x=>t-x<win));a.push(t);return a.length>max}
const send=(res,c,o)=>{res.writeHead(c,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(o))};
const redirect=(res,to)=>{res.writeHead(302,{Location:to});res.end()};
const page=(res,f)=>{let d;try{d=fs.readFileSync(path.join(PUB,f))}catch(e){console.log('MISSING FILE',path.join(PUB,f),e.message);res.writeHead(404,{'Content-Type':'text/plain; charset=utf-8'});return res.end('Page file missing on server: public/'+f)}res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});res.end(d)};
const body=(req,max=1e6)=>new Promise((ok,no)=>{let d='',n=0;req.on('data',c=>{n+=c.length;if(n>max){no(Error('Too large'));req.destroy()}else d+=c});req.on('end',()=>{try{ok(d?JSON.parse(d):{})}catch(e){no(Error('Bad JSON'))}})});
const ck=(req,n)=>{const m=(req.headers.cookie||'').match(new RegExp('(?:^|; )'+n+'=([^;]*)'));return m?m[1]:''};
const getUser=req=>{const t=ck(req,'sid'),s=t&&db.sessions[sha(t)];if(!s||s.exp<Date.now())return null;return db.users[s.uid]||null};
function login(req,res,u){const t=rid(32);db.sessions[sha(t)]={uid:u.email,exp:Date.now()+30*864e5};u.lastLogin=Date.now();save();
 res.setHeader('Set-Cookie',`sid=${t}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${30*86400}${req.headers['x-forwarded-proto']==='https'?'; Secure':''}`)}
const ip=req=>String(req.headers['x-forwarded-for']||req.socket.remoteAddress).split(',')[0].trim();
/* ---------- keys ---------- */
function newKey(kind,type,issuedTo,price,note){const key=mkKey(kind==='license'?'LIC':'ACT');db.keys[key]={key,kind,type,issuedTo:norm(issuedTo),boundTo:'',price,note:note||'',createdAt:Date.now(),revoked:false};return key}
function keysMail(email,name,keys,amount){return mail(email,'Your Profit Reaper access keys',`Hello ${name||''},\n\nThank you for your payment${amount?` of $${amount}`:''}.\n\n${keys.map(k=>k.label+': '+k.key).join('\n')}\n\nHow to use:\n1. Open the website, tap Register and enter your details with the License key (use this same email).\n2. After logging in, enter your Activation key to unlock the bot, analyzer and signals.\nKeys only work with ${email}.\n\nTrading is risky. Never trade money you cannot afford to lose.`)}
/* ---------- signal scanner ---------- */
const WATCH=[['XAUUSD','PAXGUSDT'],['BTCUSD','BTCUSDT'],['ETHUSD','ETHUSDT'],['EURUSD','EURUSDT'],['GBPUSD','GBPUSDT']],STF=E.SIGNAL_TF||'15m',SMIN=+E.SIGNAL_MIN_SCORE||5,SMAX=+E.SIGNALS_PER_DAY||4;
const ema=(a,n)=>{const k=2/(n+1);let e=a[0];return a.map((v,i)=>i?(e=v*k+e*(1-k)):e)};
function rsi(c,n=14){let g=0,l=0,r=50;for(let i=1;i<c.length;i++){const d=c[i]-c[i-1],u=Math.max(d,0),w=Math.max(-d,0);if(i<=n){g+=u;l+=w;if(i<n)continue;g/=n;l/=n}else{g=(g*(n-1)+u)/n;l=(l*(n-1)+w)/n}r=l===0?100:100-100/(1+g/l)}return r}
function atr(cs,n=14){const t=cs.map((x,i)=>i?Math.max(x.h-x.l,Math.abs(x.h-cs[i-1].c),Math.abs(x.l-cs[i-1].c)):x.h-x.l);let a=t.slice(0,n).reduce((x,y)=>x+y,0)/n;for(let i=n;i<t.length;i++)a=(a*(n-1)+t[i])/n;return a}
function analyze(cs){if(cs.length<60)return null;const c=cs.map(x=>x.c),n=c.length-1,p=c[n],e20=ema(c,20),e50=ema(c,50),e200=ema(c,200),R=rsi(c),A=atr(cs),a12=ema(c,12),a26=ema(c,26),ml=a12.map((v,i)=>v-a26[i]),sg=ema(ml,9),h=ml[n]-sg[n],h1=ml[n-1]-sg[n-1];
 const w=c.slice(-20),mid=w.reduce((a,b)=>a+b,0)/20,sd=Math.sqrt(w.reduce((a,b)=>a+(b-mid)**2,0)/20),pb=(p-(mid-2*sd))/(4*sd||1);let s=0;const why=[];
 if(e20[n]>e50[n]){s+=2;why.push('EMA20 is above EMA50 (short-term uptrend)')}else{s-=2;why.push('EMA20 is below EMA50 (short-term downtrend)')}
 if(cs.length>=200){if(p>e200[n]){s++;why.push('Price is above EMA200 (long-term bullish)')}else{s--;why.push('Price is below EMA200 (long-term bearish)')}}
 if(p>e20[n]){s++;why.push('Price is above EMA20')}else{s--;why.push('Price is below EMA20')}
 if(h>0){s++;why.push('MACD histogram is positive')}else{s--;why.push('MACD histogram is negative')}
 if(h>h1){s++;why.push('MACD momentum is rising')}else{s--;why.push('MACD momentum is falling')}
 if(R<30){s++;why.push('RSI '+R.toFixed(0)+' is oversold')}else if(R>70){s--;why.push('RSI '+R.toFixed(0)+' is overbought')}else why.push('RSI '+R.toFixed(0)+' is neutral');
 if(pb<.1){s++;why.push('Price is at the lower Bollinger band')}else if(pb>.9){s--;why.push('Price is at the upper Bollinger band')}
 return{p,s:Math.max(-8,Math.min(8,s)),A,why}}
const r5=(v)=>+(v>=1000?v.toFixed(2):v>=10?v.toFixed(3):v.toFixed(5));
async function candles(sym){const q=`symbol=${sym}&interval=${STF}&limit=300`;for(const h of ['https://data-api.binance.vision','https://api.binance.com']){try{const r=await fetch(`${h}/api/v3/klines?${q}`,{signal:AbortSignal.timeout(8000)});if(r.ok)return(await r.json()).map(k=>({t:k[0],o:+k[1],h:+k[2],l:+k[3],c:+k[4]}))}catch(e){}}throw Error('no data for '+sym)}
async function scan(){const day=Date.now()-864e5;
 for(const[name,sym]of WATCH){try{const cs=await candles(sym);
  for(const g of db.signals)if(g.sym===name&&g.status==='open')for(const k of cs)if(k.t>g.t){const L=g.side==='BUY',sl=L?k.l<=g.sl:k.h>=g.sl,tp=L?k.h>=g.tp:k.l<=g.tp;if(sl||tp){g.status=sl?'lost':'won';g.closedAt=k.t;break}}
  const a=analyze(cs),today=db.signals.filter(g=>g.t>day).length;if(!a||Math.abs(a.s)<SMIN||today>=SMAX)continue;
  if(db.signals.some(g=>g.sym===name&&(g.status==='open'||Date.now()-g.t<4*36e5)))continue;
  const buy=a.s>0,e=a.p,sl=buy?e-1.5*a.A:e+1.5*a.A,tp=buy?e+2.5*a.A:e-2.5*a.A;
  db.signals.unshift({id:rid(4),t:Date.now(),sym:name,tf:STF,side:buy?'BUY':'SELL',entry:r5(e),sl:r5(sl),tp:r5(tp),score:a.s,why:a.why,status:'open'});console.log('Signal',name,buy?'BUY':'SELL')}catch(e){console.log('scan',name,e.message)}}
 db.signals=db.signals.slice(0,500);save()}
if(E.DISABLE_SCANNER!=='1'){setTimeout(scan,5000);setInterval(scan,5*60*1000)}
/* ---------- server ---------- */
const S=http.createServer(async(req,res)=>{try{
 const U=new URL(req.url,'http://x'),p=U.pathname,m=req.method,user=getUser(req);
 res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('X-Frame-Options','DENY');res.setHeader('Referrer-Policy','no-referrer');
 const owner=user&&user.role==='owner',need=()=>{if(!user){send(res,401,{error:'Please log in.'});return false}return true},needAct=()=>{if(!need())return false;if(!active(user)){send(res,403,{error:'Activation required.'});return false}return true},needOwner=()=>{if(!owner){send(res,403,{error:'Owner only.'});return false}return true};
 if(m==='GET'||m==='HEAD'){
  if(p==='/'||p==='/index.html')return page(res,'index.html');
  if(p==='/app')return active(user)?page(res,'app.html'):redirect(res,'/');
  if(p==='/admin')return owner?page(res,'admin.html'):redirect(res,'/');
  if(p==='/api/config')return send(res,200,CFG);
  if(p==='/api/me')return user?send(res,200,pub(user)):send(res,401,{error:'Not signed in'});
  if(p==='/api/signals'){if(!needAct())return;const t=db.signals.filter(g=>g.status!=='open');return send(res,200,{signals:db.signals.slice(0,30),today:db.signals.filter(g=>g.t>Date.now()-864e5).length,won:t.filter(g=>g.status==='won').length,lost:t.filter(g=>g.status==='lost').length})}
  if(p==='/api/admin/overview'){if(!needOwner())return;const us=Object.values(db.users).map(u=>({name:u.name,surname:u.surname,email:u.email,phone:u.phone,country:u.country,role:u.role,license:u.license,activation:u.activation,activated:active(u),suspended:!!u.suspended,createdAt:u.createdAt,lastLogin:u.lastLogin,paid:db.payments.filter(x=>x.email===u.email).reduce((t,x)=>t+x.amount,0)}));
   return send(res,200,{users:us,keys:Object.values(db.keys).sort((a,b)=>b.createdAt-a.createdAt).slice(0,300),payments:db.payments.slice(0,200),outbox:db.outbox.slice(0,50),revenue:db.payments.reduce((t,x)=>t+x.amount,0),signals:db.signals.length})}
  res.writeHead(404,{'Content-Type':'text/plain'});return res.end('Not found')}
 if(m==='HEAD'){res.writeHead(200,{'Content-Type':'text/html'});return res.end()}
 if(m!=='POST'){res.writeHead(405);return res.end()}
 if(!String(req.headers['content-type']||'').includes('json'))return send(res,415,{error:'JSON only'});
 const b=await body(req,p==='/api/vision'?9e6:1e6);
 if(p==='/api/register'){if(limited(ip(req),'reg',10,36e5))return send(res,429,{error:'Too many attempts. Try later.'});
  const email=norm(b.email),name=String(b.name||'').trim().slice(0,60),surname=String(b.surname||'').trim().slice(0,60),phone=String(b.phone||'').trim().slice(0,30),country=String(b.country||'').trim().slice(0,40),pw=String(b.password||''),lk=String(b.license||'').trim().toUpperCase();
  if(!name||!surname||!okMail(email)||phone.length<7||pw.length<8)return send(res,400,{error:'Enter your name, surname, a valid email, phone number and a password of at least 8 characters.'});
  if(db.users[email])return send(res,409,{error:'This email is already registered. Please log in.'});
  const k=db.keys[lk];if(!k||k.kind!=='license'||k.revoked)return send(res,400,{error:'Invalid license key.'});
  if(k.issuedTo&&k.issuedTo!==email)return send(res,403,{error:'This license key was issued to a different email address.'});
  if(k.boundTo&&k.boundTo!==email)return send(res,403,{error:'This license key is already used by another account.'});
  const salt=rid(16);db.users[email]={id:rid(6),name,surname,email,phone,country,salt,pass:hashPw(pw,salt),role:'user',license:lk,activation:'',createdAt:Date.now(),lastLogin:0};k.boundTo=email;login(req,res,db.users[email]);return send(res,200,pub(db.users[email]))}
 if(p==='/api/login'){if(limited(ip(req),'log',12,6e5))return send(res,429,{error:'Too many attempts. Wait 10 minutes.'});
  const u=db.users[norm(b.email)];if(!u||!same(hashPw(String(b.password||''),u.salt),u.pass))return send(res,401,{error:'Wrong email or password.'});
  if(u.suspended)return send(res,403,{error:'This account is suspended. Contact the owner.'});login(req,res,u);return send(res,200,pub(u))}
 if(p==='/api/logout'){const t=ck(req,'sid');if(t){delete db.sessions[sha(t)];save()}res.setHeader('Set-Cookie','sid=; Max-Age=0; Path=/');return send(res,200,{ok:1})}
 if(p==='/api/activate'){if(!need())return;const key=String(b.key||'').trim().toUpperCase(),k=db.keys[key];
  if(!k||k.kind!=='activation'||k.revoked)return send(res,400,{error:'Invalid activation key.'});
  if(k.issuedTo&&k.issuedTo!==user.email)return send(res,403,{error:'This activation key was issued to a different email address.'});
  if(k.boundTo&&k.boundTo!==user.email)return send(res,403,{error:'This activation key is already used by another account.'});
  k.boundTo=user.email;user.activation=key;save();return send(res,200,pub(user))}
 if(p==='/api/vision'){if(!needAct())return;if(!E.ANTHROPIC_API_KEY)return send(res,501,{error:'AI vision is not configured on the server.'});
  const d=new Date().toISOString().slice(0,10),uk=user.email+d;db.usage[uk]=(db.usage[uk]||0)+1;if(db.usage[uk]>(+E.VISION_PER_DAY||10))return send(res,429,{error:'Daily screenshot limit reached.'});
  const mm=String(b.image||'').match(/^data:(image\/(?:png|jpeg|webp));base64,(.+)$/);if(!mm)return send(res,400,{error:'Send a PNG, JPEG or WebP image.'});
  const r=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'content-type':'application/json','x-api-key':E.ANTHROPIC_API_KEY,'anthropic-version':'2023-06-01'},body:JSON.stringify({model:E.VISION_MODEL||'claude-sonnet-4-6',max_tokens:900,messages:[{role:'user',content:[{type:'image',source:{type:'base64',media_type:mm[1],data:mm[2]}},{type:'text',text:`This is a trading chart screenshot. Symbol: ${String(b.symbol||'unknown').slice(0,20)}. Chart timeframe chosen by the user: ${String(b.timeframe||'').slice(0,5)}. Describe the trend, key support and resistance, notable candle patterns and indicators visible. Give a bias (buy, sell or neutral) with the reasons, and an illustrative stop-loss and take-profit zone based on visible price levels. If the image is not a chart, say so. Keep it concise. This is educational analysis, not financial advice.`}]}]})});
  const j=await r.json();if(!r.ok)return send(res,502,{error:(j.error&&j.error.message)||'Vision request failed'});save();return send(res,200,{text:(j.content||[]).map(x=>x.text||'').join('\n')})}
 if(p.startsWith('/api/admin/')){if(!needOwner())return;
  if(p==='/api/admin/keys'){const plan=b.plan,email=norm(b.email),name=String(b.name||'').trim(),note=String(b.note||'').slice(0,200),out=[];
   if(plan==='full'){if(!okMail(email))return send(res,400,{error:'Enter the buyer email.'});const l=newKey('license','paid',email,10,note),a=newKey('activation','paid',email,10,note);db.payments.unshift({t:Date.now(),email,amount:10,note:'Full access $10. '+note});out.push({label:'License key',key:l},{label:'Activation key',key:a})}
   else if(plan==='activation'){if(!okMail(email))return send(res,400,{error:'Enter the buyer email.'});const a=newKey('activation','paid',email,4,note);db.payments.unshift({t:Date.now(),email,amount:4,note:'Activation $4. '+note});out.push({label:'Activation key',key:a})}
   else if(plan==='free-license'){const n=email?1:Math.min(20,Math.max(1,+b.count||1));for(let i=0;i<n;i++)out.push({label:'License key',key:newKey('license','free',email,0,note)})}
   else return send(res,400,{error:'Unknown plan.'});
   let status='not emailed (no email given)';if(okMail(email))status=await keysMail(email,name,out,plan==='full'?10:plan==='activation'?4:0);save();return send(res,200,{keys:out,mail:status})}
  if(p==='/api/admin/payment'){const email=norm(b.email),amount=+b.amount;if(!okMail(email)||!(amount>0))return send(res,400,{error:'Email and amount required.'});db.payments.unshift({t:Date.now(),email,amount,note:String(b.note||'').slice(0,200)});save();return send(res,200,{ok:1})}
  if(p==='/api/admin/revoke'){const k=db.keys[String(b.key||'').toUpperCase()];if(!k)return send(res,404,{error:'Key not found'});k.revoked=!k.revoked;save();return send(res,200,{revoked:k.revoked})}
  if(p==='/api/admin/suspend'){const u=db.users[norm(b.email)];if(!u||u.role==='owner')return send(res,404,{error:'User not found'});u.suspended=!u.suspended;save();return send(res,200,{suspended:u.suspended})}
  return send(res,404,{error:'Unknown admin action'})}
 return send(res,404,{error:'Not found'})
}catch(e){console.log('error',e.message);if(!res.headersSent){try{send(res,500,{error:'Server error'})}catch(x){}}else{try{res.end()}catch(x){}}}});
S.listen(PORT,()=>console.log('Profit Reaper running on port '+PORT,'| public files:',fs.existsSync(PUB)?fs.readdirSync(PUB).join(', '):'PUBLIC FOLDER MISSING'));
