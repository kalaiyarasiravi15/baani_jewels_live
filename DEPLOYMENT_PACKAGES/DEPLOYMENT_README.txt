================================================================================
          BAANI JEWELS — PRODUCTION DEPLOYMENT PACKAGES (3 PROPER ZIPS)
================================================================================
Configured for:
- Main Storefront: https://baanijewels.com
- Admin Dashboard: https://baanidashboard.baanijewels.com
- Backend API: https://baanijewelsapi.com
- Node.js Port: 30006
- MySQL User: sts_baanijewelsuser
- MySQL Database: sts_baanijewels_db

1. 1_FRONTEND.zip
   - Customer Storefront (React + Vite production build).
   - Pre-configured to call https://baanijewelsapi.com
   - Extract directly into: public_html of your main domain (baanijewels.com).

2. 2_ADMIN.zip
   - Admin Dashboard (React + Vite production build).
   - Pre-configured to call https://baanijewelsapi.com
   - Extract directly into: public_html of your admin domain (baanidashboard.baanijewels.com).

3. 3_BACKEND.zip
   - Complete Node.js Backend API fully bundled with node_modules/, all controllers,
     models, routes, config, uploads/ product photos/banners, and production .env.
   - Entry points provided: "server.js" AND "app.js".
   - Scripts configured in package.json: "start", "serve", "app".
   - Pre-configured with database credentials (sts_baanijewelsuser / sts_baanijewels_db)
     and reverse proxy port (30006).

   * HOW TO DEPLOY IN WEBUZO / CPANEL "Setup Node.js App":
     1) In cPanel / Webuzo -> "Setup Node.js App":
        - Node.js Version: 18.x or 20.x
        - Application Mode: Production
        - Application Root: path to your API folder (e.g., public_html/baanijewelsapi or baanijewelsapi)
        - Application URL: baanijewelsapi.com
        - Application Startup File: server.js (or app.js)
     2) Extract 3_BACKEND.zip DIRECTLY into that Application Root directory.
        * IMPORTANT: Ensure server.js, app.js, and package.json are in the Application
          Root directory, NOT inside a nested subfolder like "3_BACKEND/".
     3) If Webuzo created a default placeholder package.json earlier, OVERWRITE it with
        the package.json from this zip!
     4) Click "Run JS script" or "Restart" (or run "npm start" / "node server.js").
        Because node_modules is already bundled, you do NOT need to run npm install!

   * IF RUNNING VIA SSH / TERMINAL:
     cd /home/sts_baanijewelsuser/path-to-your-api-folder
     npm start
     # or: node server.js

4. DATABASE_sts_baanijewels_db.sql
   - Complete MySQL database dump (39 tables, products, categories, settings, coupons).
   - Import into MySQL / MariaDB via phpMyAdmin or command line:
       mysql -u sts_baanijewelsuser -p sts_baanijewels_db < DATABASE_sts_baanijewels_db.sql
================================================================================
NOTE ON FRONTEND & ADMIN:
Both 1_FRONTEND.zip and 2_ADMIN.zip are static HTML/CSS/JS builds.
Do NOT create Node.js applications for them. Simply extract their files into the
respective public_html document roots and they will work immediately.
================================================================================
