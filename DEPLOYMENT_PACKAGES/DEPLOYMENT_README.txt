================================================================================
       BAANI JEWELS (PVT LTD) — OFFICIAL WEBUZO / CPANEL DEPLOYMENT PACKAGES
================================================================================
Generated: 2026-10-29T10:43:36.552Z

This directory contains the 3 final, clean production packages for Webuzo deployment:

1. 1_FRONTEND.zip  -> Storefront UI (Extract into public_html / baanijewels.com)
2. 2_ADMIN.zip     -> Admin Dashboard (Extract into baanidashboard.baanijewels.com)
3. 3_BACKEND.zip   -> Backend Node.js API WITH node_modules & production .env
                      (Extract into baanijewelsapi.com app root)
4. DATABASE_sts_baanijewels_db.sql -> MySQL Database Schema & Baseline Data

================================================================================
2. WEBUZO NODE.JS SETUP INSTRUCTIONS
================================================================================

Step 1: Upload & Extract 3_BACKEND.zip
---------------------------------------
1. In Webuzo File Manager, navigate to the domain root of:
   baanijewelsapi.com (e.g. /home/stsbaanijewels/baanijewelsapi.com)
2. Upload "3_BACKEND.zip" and Extract it here.
3. Verify that the following exist in the folder:
   - server.js
   - .env (Already pre-configured with sts_baanijewels_db and live credentials!)
   - node_modules/ (Pre-packaged! No need to run npm install unless needed)
   - uploads/ (Clean product catalog images)
   - package.json

Step 2: Webuzo Node.js App Manager Configuration
------------------------------------------------
Open Webuzo -> "Node.js Version / App Manager":
- Node.js Version: 18.x or 20.x
- Application Mode: Production
- Application Root: /home/stsbaanijewels/baanijewelsapi.com  (your actual domain path)
- Application Startup File: server.js
- Port: 30006  (or Webuzo assigned port)
- Environment Variables:
  NODE_ENV=production
  PORT=30006

Click "Save" and then click "Run / Restart App".

================================================================================
3. SSH COMMANDS: STARTING & RUNNING THE NODE APPLICATION
================================================================================

Option A: Running with PM2 (Recommended for 24/7 background uptime):
-------------------------------------------------------------------
# Navigate to the API folder
cd /home/stsbaanijewels/baanijewelsapi.com

# Install pm2 globally if not installed
npm install -g pm2

# Start the application
pm2 start server.js --name "baani-api"

# Make it restart automatically on server reboot
pm2 save
pm2 startup

# Restart anytime after code updates:
pm2 restart baani-api

Option B: Running directly with Node.js:
----------------------------------------
cd /home/stsbaanijewels/baanijewelsapi.com
node server.js

Option C: Running in background with nohup:
------------------------------------------
nohup node server.js > server.log 2>&1 &

================================================================================
4. ERROR CHECKING & MONITORING COMMANDS (TROUBLESHOOTING)
================================================================================

1. Check Real-Time PM2 Logs & Errors:
   pm2 logs baani-api
   pm2 logs baani-api --lines 100 --err

2. Check PM2 Status & Memory:
   pm2 status
   pm2 show baani-api

3. If running via Webuzo native Node.js manager, check stdout/stderr logs:
   cat stderr.log
   cat stdout.log
   tail -f -n 50 stderr.log

4. Test if Backend API is responding locally on port 30006:
   curl -I http://localhost:30006/api/session
   # Should return HTTP 200 OK!

5. Check which process is listening on Port 30006:
   netstat -tlpn | grep 30006
   # OR
   lsof -i :30006

6. Test MySQL Database Connectivity:
   mysql -u sts_baanijewelsuser -p'me#8NizxCA' sts_baanijewels_db -e "SELECT COUNT(*) FROM products;"

================================================================================
5. FRONTEND & ADMIN DASHBOARD DEPLOYMENT
================================================================================

Frontend Storefront (1_FRONTEND.zip):
-------------------------------------
1. Go to Webuzo File Manager -> /home/stsbaanijewels/public_html
2. Extract all contents of "1_FRONTEND.zip" directly here (so index.html is in root).
3. Ensure .htaccess is present for React SPA routing:
   <IfModule mod_rewrite.c>
     RewriteEngine On
     RewriteBase /
     RewriteRule ^index\.html$ - [L]
     RewriteCond %{REQUEST_FILENAME} !-f
     RewriteCond %{REQUEST_FILENAME} !-d
     RewriteRule . /index.html [L]
   </IfModule>

Admin Dashboard (2_ADMIN.zip):
------------------------------
1. Go to Webuzo File Manager -> domain folder of baanidashboard.baanijewels.com
2. Extract all contents of "2_ADMIN.zip" directly here.
3. Ensure .htaccess is present (same React SPA rewrite rule as above).

================================================================================
All packages are pre-configured, audited, and production-tested!
================================================================================
