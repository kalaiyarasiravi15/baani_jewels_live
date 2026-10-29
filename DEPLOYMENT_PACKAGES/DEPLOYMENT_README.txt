================================================================================
       BAANI JEWELS (PVT LTD) — OFFICIAL PRODUCTION DEPLOYMENT PACKAGES
================================================================================
Generated: 2026-10-29T09:43:45.512Z

This folder contains all production-ready packages for deploying Baani Jewellery
Storefront, Admin Dashboard, and Backend API on Webuzo / cPanel / Linux VPS.

--------------------------------------------------------------------------------
1. PACKAGES OVERVIEW
--------------------------------------------------------------------------------
1_FRONTEND_STOREFRONT.zip
   - Size: ~21 MB
   - Contents: Compiled React + Vite production build of the Customer Storefront.
   - Includes .htaccess, index.html, assets/, assests/ (brand images & media).
   - Deployment: Extract directly into public_html of your domain (e.g. baanijewels.com).

2_ADMIN_DASHBOARD.zip
   - Size: ~23 MB
   - Contents: Compiled React + Vite production build of the Baani Admin Dashboard.
   - Includes .htaccess, index.html, assets/, assests/.
   - Deployment: Extract into public_html of admin subdomain (e.g. admin.baanijewels.com)
     or a subfolder (e.g. baanijewels.com/admin).

3_BACKEND_NODE_API.zip
   - Contents: Complete Node.js API with all controllers, models, routes, config,
     full uploads/ media library (product images & banners), and production .env.
   - Cleaned for Linux/Webuzo (Windows binary node_modules excluded).
   - Deployment:
       1) Upload & extract into your Node.js application directory.
       2) Run "npm install --production" or use Webuzo/cPanel "Node.js Selector" -> "Run NPM Install".
       3) Start application with entry point "server.js".

3_BACKEND_WITH_ALL_DATA.zip
   - Size: ~321 MB
   - Complete archive with pre-bundled dependencies and full uploads.

DATABASE_ieicoimbatore_banijewel_db.sql
   - Size: ~386 KB
   - Full MySQL database schema + complete seed data (products, categories, deals,
     settings, shipping zones, admin accounts, banner configurations).
   - Import via phpMyAdmin or MySQL CLI:
       mysql -u <db_user> -p <db_name> < DATABASE_ieicoimbatore_banijewel_db.sql

--------------------------------------------------------------------------------
2. DEFAULT CREDENTIALS
--------------------------------------------------------------------------------
Admin Portal:
   - Email: baanijeweladmin2026@gmail.com
   - Access URL: /dashboard

--------------------------------------------------------------------------------
3. VERIFICATION & TESTS
--------------------------------------------------------------------------------
All core flows (Desktop & Mobile Cart Qty +/-, Checkout, Order Placement,
and Admin Order Sync) have been fully verified with automated Playwright tests.
Screenshots available in frontend/test_screenshots/.
================================================================================
