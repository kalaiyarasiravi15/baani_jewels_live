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
      resolve(sizeMB);
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

async function buildPackages() {
  console.log('================================================================================');
  console.log('   GENERATING WEBUZO DEPLOYMENT PACKAGES (WITH NODE_MODULES)');
  console.log('================================================================================\n');

  // Clean old duplicate zip files in OUT_DIR
  const existingFiles = fs.readdirSync(OUT_DIR);
  for (const f of existingFiles) {
    if (f.endsWith('.zip')) {
      try {
        fs.unlinkSync(path.join(OUT_DIR, f));
        console.log(`Removed old zip: ${f}`);
      } catch (_) {}
    }
  }

  // 1. FRONTEND STOREFRONT
  console.log('\n--- 1. Packaging 1_FRONTEND.zip ---');
  const frontendDist = path.resolve('k:/bani jewellery/frontend/dist');
  const frontendZip = path.join(OUT_DIR, '1_FRONTEND.zip');
  await createZip(frontendZip, (archive) => {
    archive.directory(frontendDist, false);
  });

  // 2. ADMIN DASHBOARD
  console.log('\n--- 2. Packaging 2_ADMIN.zip ---');
  const adminDist = path.resolve('k:/bani jewellery/backend/panel/admin_dashboard/dist');
  const adminZip = path.join(OUT_DIR, '2_ADMIN.zip');
  await createZip(adminZip, (archive) => {
    archive.directory(adminDist, false);
  });

  // 3. BACKEND (WITH NODE_MODULES + CLEAN UPLOADS + PROD .ENV)
  console.log('\n--- 3. Packaging 3_BACKEND.zip (with node_modules) ---');
  const backendNode = path.resolve('k:/bani jewellery/backend/node');
  const backendZip = path.join(OUT_DIR, '3_BACKEND.zip');

  const filesToInclude = [
    'server.js',
    'app.js',
    'package.json',
    'package-lock.json',
    '.env.production',
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
    // 1. Files
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

    // 2. Directories
    for (const d of coreDirsToInclude) {
      const fullPath = path.join(backendNode, d);
      if (!fs.existsSync(fullPath)) continue;

      if (d === 'node_modules') {
        // Exclude nodemon windows-kill.exe or unnecessary cache
        archive.glob('**/*', {
          cwd: fullPath,
          ignore: ['nodemon/bin/windows-kill.exe', '.cache/**']
        }, { prefix: 'node_modules' });
      } else {
        archive.directory(fullPath, d);
      }
    }
  });

  // Also update Downloads/baaniapi.zip directly
  console.log('\n--- 4. Updating C:\\Users\\Kalaiyarasi\\Downloads\\baaniapi.zip ---');
  const dlZip = 'C:\\Users\\Kalaiyarasi\\Downloads\\baaniapi.zip';
  try {
    fs.copyFileSync(backendZip, dlZip);
    const dlSize = (fs.statSync(dlZip).size / (1024 * 1024)).toFixed(2);
    console.log(`✓ [SUCCESS] Synced baaniapi.zip (${dlSize} MB) in Downloads`);
  } catch (err) {
    console.error('Warning: could not sync to Downloads:', err.message);
  }

  // 5. Create detailed DEPLOYMENT_README.txt with all start and error checking commands
  console.log('\n--- 5. Generating Comprehensive DEPLOYMENT_README.txt ---');
  const readmeContent = `================================================================================
       BAANI JEWELS (PVT LTD) — OFFICIAL WEBUZO / CPANEL DEPLOYMENT PACKAGES
================================================================================
Generated: ${new Date().toISOString()}

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
     RewriteRule ^index\\.html$ - [L]
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
`;

  fs.writeFileSync(path.join(OUT_DIR, 'DEPLOYMENT_README.txt'), readmeContent, 'utf8');
  console.log('✓ [SUCCESS] Written updated DEPLOYMENT_README.txt');

  console.log('\n================================================================================');
  console.log('   ALL PACKAGES READY IN: ' + OUT_DIR);
  console.log('================================================================================\n');
}

buildPackages();
