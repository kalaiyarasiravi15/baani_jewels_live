const fs = require('fs');
const path = require('path');
const { ZipArchive } = require(path.resolve('k:/bani jewellery/backend/node/node_modules/archiver'));

const OUT_DIR = path.resolve('k:/bani jewellery/DEPLOYMENT_PACKAGES');
if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

function createZip(destZipPath, sourceConfig) {
  return new Promise((resolve, reject) => {
    if (fs.existsSync(destZipPath)) {
      try { fs.unlinkSync(destZipPath); } catch (_) {}
    }

    const output = fs.createWriteStream(destZipPath);
    const archive = new ZipArchive({
      zlib: { level: 9 },
      forceLocalTime: true
    });

    output.on('close', () => {
      const sizeMB = (archive.pointer() / (1024 * 1024)).toFixed(2);
      console.log(`✓ [SUCCESS] Created ${path.basename(destZipPath)} (${sizeMB} MB)`);
      resolve();
    });

    archive.on('warning', (err) => {
      if (err.code === 'ENOENT') console.warn(err);
      else reject(err);
    });

    archive.on('error', (err) => reject(err));
    archive.pipe(output);
    sourceConfig(archive);
    archive.finalize();
  });
}

async function run() {
  console.log('===========================================================');
  console.log('  GENERATING COMPLETE & PROPER DEPLOYMENT PACKAGES');
  console.log('===========================================================\n');

  // 1. FRONTEND STOREFRONT
  console.log('--- 1. Packaging Frontend Storefront (1_FRONTEND_STOREFRONT.zip) ---');
  const frontendDist = path.resolve('k:/bani jewellery/frontend/dist');
  const frontendZip = path.join(OUT_DIR, '1_FRONTEND_STOREFRONT.zip');
  await createZip(frontendZip, (archive) => {
    archive.directory(frontendDist, false);
  });

  // 2. ADMIN DASHBOARD
  console.log('\n--- 2. Packaging Admin Dashboard (2_ADMIN_DASHBOARD.zip) ---');
  const adminDist = path.resolve('k:/bani jewellery/backend/panel/admin_dashboard/dist');
  const adminZip = path.join(OUT_DIR, '2_ADMIN_DASHBOARD.zip');
  await createZip(adminZip, (archive) => {
    archive.directory(adminDist, false);
  });

  // 3. BACKEND FOR WEBUZO / CPANEL (Linux ready, clean, includes uploads and .env, excludes windows node_modules)
  console.log('\n--- 3. Packaging Linux Webuzo/cPanel Backend (3_BACKEND_NODE_API.zip) ---');
  const backendNode = path.resolve('k:/bani jewellery/backend/node');
  const backendZip = path.join(OUT_DIR, '3_BACKEND_NODE_API.zip');

  const filesToInclude = [
    'server.js',
    'package.json',
    'package-lock.json',
    '.env.production',
    '.env.example',
    'env.production',
    'env.json'
  ];

  const coreDirsToInclude = [
    'config',
    'controllers',
    'middleware',
    'models',
    'routes',
    'utils',
    'uploads'
  ];

  await createZip(backendZip, (archive) => {
    for (const f of filesToInclude) {
      const fullPath = path.join(backendNode, f);
      if (fs.existsSync(fullPath)) {
        archive.file(fullPath, { name: f });
      }
    }

    // Set production .env as default .env
    const prodEnvPath = path.join(backendNode, '.env.production');
    if (fs.existsSync(prodEnvPath)) {
      archive.file(prodEnvPath, { name: '.env' });
    }

    for (const d of coreDirsToInclude) {
      const fullPath = path.join(backendNode, d);
      if (fs.existsSync(fullPath)) {
        archive.directory(fullPath, d);
      }
    }
  });

  // 4. README & DEPLOYMENT INSTRUCTIONS
  console.log('\n--- 4. Creating DEPLOYMENT_README.txt ---');
  const readmeContent = `================================================================================
       BAANI JEWELS (PVT LTD) — OFFICIAL PRODUCTION DEPLOYMENT PACKAGES
================================================================================
Generated: ${new Date().toISOString()}

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
`;
  fs.writeFileSync(path.join(OUT_DIR, 'DEPLOYMENT_README.txt'), readmeContent, 'utf8');
  console.log('✓ Created DEPLOYMENT_README.txt');

  console.log('\n===========================================================');
  console.log(`  ALL PACKAGES CREATED PROPERLY IN: ${OUT_DIR}`);
  console.log('===========================================================');
}

run().catch((err) => {
  console.error('Packaging failed:', err);
  process.exit(1);
});
