const http=require('http'),fs=require('fs'),path=require('path');
const E=process.env,PORT=E.PORT||3000,DBF=E.DB_FILE||path.join(__dirname,'data.json');
const AUTH=E.ADMIN_PASS||'admin123';
const PUB=path.join(__dirname,'public');
function load(){try{return JSON.parse(fs.readFileSync(DBF,'utf8'))}catch(e){return{signals:[],settings:{winRate:72,interval:5,mode:'auto'}}}}
let DB=load();
function save(){try{fs.writeFileSync(DBF,JSON.stringify(DB))}catch(e){}}
function json(res,o,c){res.writeHead(c||200,{'Content-Type':'application/json'});res.end(JSON.stringify(o))}
function page(res,f){try{const html=fs.readFileSync(path.join(__dirname,f));res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});res.end(html)}catch(e){if(!res.headersSent){res.writeHead(404)}res.end('Not found')}}
function genSignal(){const pairs=['EUR/USD','GBP/USD','USD/JPY','AUD/USD','USD/CAD','EUR/GBP','BTC/USD'];const p=pairs[Math.floor(Math.random()*pairs.length)];const dir=Math.random()>0.5?'CALL':'PUT';const now=new Date();return{id:Date.now(),pair:p,direction:dir,time:now.toLocaleTimeString(),date:now.toLocaleDateString(),confidence:70+Math.floor(Math.random()*25)}}
const server=http.createServer((req,res)=>{
const u=new URL(req.url,'http://x');const p=u.pathname;
if(p==='/'||p==='/index.html')return page(res,'index.html');
if(p==='/app'||p==='/app.html')return page(res,'app.html');
if(p==='/admin'||p==='/admin.html')return page(res,'admin.html');
if(p==='/api/status')return json(res,{ok:true,online:true,winRate:DB.settings.winRate,interval:DB.settings.interval,mode:DB.settings.mode,total:DB.signals.length});
if(p==='/api/signals')return json(res,{signals:DB.signals.slice(-20).reverse()});
if(p==='/api/signal'){const s=genSignal();DB.signals.push(s);if(DB.signals.length>100)DB.signals=DB.signals.slice(-100);save();return json(res,{signal:s})}
if(p==='/api/admin/login'&&req.method==='POST'){let b='';req.on('data',c=>b+=c);req.on('end',()=>{try{const j=JSON.parse(b);return json(res,{ok:j.password===AUTH})}catch(e){return json(res,{ok:false})}});return}
if(p==='/api/admin/settings'&&req.method==='POST'){let b='';req.on('data',c=>b+=c);req.on('end',()=>{try{const j=JSON.parse(b);DB.settings={...DB.settings,...j};save();return json(res,{ok:true})}catch(e){return json(res,{ok:false})}});return}
res.writeHead(404);res.end('Not found');
});
server.listen(PORT,()=>console.log('Running on '+PORT));
