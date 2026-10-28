const fs = require('fs');
const path = require('path');
const { ZipArchive } = require(path.resolve('k:/bani jewellery/backend/node/node_modules/archiver'));

const OUT_DIR = path.resolve('k:/bani jewellery/DEPLOYMENT_PACKAGES');

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
      console.log(`✓ Created: ${path.basename(destZipPath)} (${sizeMB} MB)`);
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
  console.log('  CREATING EXACTLY THREE PROPER ZIP PACKAGES');
  console.log('===========================================================\n');

  // Remove all existing zip files in DEPLOYMENT_PACKAGES
  const existingFiles = fs.readdirSync(OUT_DIR);
  for (const f of existingFiles) {
    if (f.endsWith('.zip')) {
      fs.unlinkSync(path.join(OUT_DIR, f));
      console.log(`Cleaned up old zip: ${f}`);
    }
  }

  // 1. FRONTEND ZIP
  console.log('\n--- 1/3: Creating 1_FRONTEND.zip ---');
  const frontendDist = path.resolve('k:/bani jewellery/frontend/dist');
  const frontendZip = path.join(OUT_DIR, '1_FRONTEND.zip');
  await createZip(frontendZip, (archive) => {
    archive.directory(frontendDist, false);
  });

  // 2. ADMIN DASHBOARD ZIP
  console.log('\n--- 2/3: Creating 2_ADMIN.zip ---');
  const adminDist = path.resolve('k:/bani jewellery/backend/panel/admin_dashboard/dist');
  const adminZip = path.join(OUT_DIR, '2_ADMIN.zip');
  await createZip(adminZip, (archive) => {
    archive.directory(adminDist, false);
  });

  // 3. COMPLETE BACKEND ZIP
  console.log('\n--- 3/3: Creating 3_BACKEND.zip ---');
  const backendNode = path.resolve('k:/bani jewellery/backend/node');
  const backendZip = path.join(OUT_DIR, '3_BACKEND.zip');

  const filesToInclude = [
    'server.js',
    'app.js',
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
    'uploads',
    'node_modules'
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

  // Update README
  const readme = `================================================================================
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
`;
  fs.writeFileSync(path.join(OUT_DIR, 'DEPLOYMENT_README.txt'), readme, 'utf8');

  console.log('\n===========================================================');
  console.log(`  ALL 3 ZIP PACKAGES CREATED SUCCESSFULLY IN: ${OUT_DIR}`);
  console.log('===========================================================');
}

run().catch((err) => {
  console.error('Packaging error:', err);
  process.exit(1);
});
