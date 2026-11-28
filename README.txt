PROFIT REAPER - SETUP
1. Upload ALL files to GitHub repo
2. Render > Settings > Start Command = node server2.js
3. Render > Environment:
   ADMIN_PASS=YourStrongPassword123
   DB_FILE=/data/data.json
4. Render > Disks > Add Disk, Mount Path = /data, Size 1GB
5. Manual Deploy > Deploy latest commit
6. Test: /api/signal?symbol=Volatility 75 Index
