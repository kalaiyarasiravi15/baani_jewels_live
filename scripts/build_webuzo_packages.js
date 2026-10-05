const fs = require('fs');
const path = require('path');
const { ZipArchive } = require(path.resolve(__dirname, '../backend/node/node_modules/archiver'));

const OUT_DIR = path.resolve(__dirname, '..', 'DEPLOYMENT_PACKAGES');
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
  console.log('  GENERATING WEBUZO PRODUCTION DEPLOYMENT PACKAGES (POSIX)  ');
  console.log('===========================================================\n');

  // Clean old/unwanted zips
  const unwanted = [
    '3_BACKEND_CODE_ONLY.zip',
    '3_BACKEND_CODE_AND_MODULES_ONLY.zip',
    '4_BACKEND_COMPLETE_WITH_UPLOADS.zip'
  ];
  for (const f of unwanted) {
    const p = path.join(OUT_DIR, f);
    if (fs.existsSync(p)) {
      try { fs.unlinkSync(p); } catch (_) {}
      console.log(`Removed old file: ${f}`);
    }
  }

  // 1. FRONTEND STOREFRONT
  console.log('\n--- 1. Packaging Frontend Storefront (1_FRONTEND_STOREFRONT.zip) ---');
  const frontendDist = path.resolve(__dirname, '..', 'frontend', 'dist');
  const frontendZip = path.join(OUT_DIR, '1_FRONTEND_STOREFRONT.zip');
  await createZip(frontendZip, (archive) => {
    archive.directory(frontendDist, false);
  });

  // 2. ADMIN DASHBOARD
  console.log('\n--- 2. Packaging Admin Dashboard (2_ADMIN_DASHBOARD.zip) ---');
  const adminDist = path.resolve(__dirname, '..', 'backend', 'panel', 'admin_dashboard', 'dist');
  const adminZip = path.join(OUT_DIR, '2_ADMIN_DASHBOARD.zip');
  await createZip(adminZip, (archive) => {
    archive.directory(adminDist, false);
  });

  // 3. COMPLETE BACKEND (Code + Pre-bundled node_modules + All Uploads + All Configs)
  console.log('\n--- 3. Packaging Single Final Backend (3_BACKEND_WITH_ALL_DATA.zip) ---');
  const backendNode = path.resolve(__dirname, '..', 'backend', 'node');
  const backendZip = path.join(OUT_DIR, '3_BACKEND_WITH_ALL_DATA.zip');

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
    'node_modules',
    'uploads'
  ];

  await createZip(backendZip, (archive) => {
    for (const f of filesToInclude) {
      const fullPath = path.join(backendNode, f);
      if (fs.existsSync(fullPath)) {
        archive.file(fullPath, { name: f });
      }
    }

    // Always include production .env as .env in the backend zip
    const prodEnvPath = path.join(backendNode, '.env.production');
    if (fs.existsSync(prodEnvPath)) {
      archive.file(prodEnvPath, { name: '.env' });
    } else {
      const localEnvPath = path.join(backendNode, '.env');
      if (fs.existsSync(localEnvPath)) {
        archive.file(localEnvPath, { name: '.env' });
      }
    }

    for (const d of coreDirsToInclude) {
      const fullPath = path.join(backendNode, d);
      if (fs.existsSync(fullPath)) {
        archive.directory(fullPath, d);
      }
    }
  });

  console.log('\n===========================================================');
  console.log(`  ALL PACKAGES CREATED SUCCESSFULLY IN: ${OUT_DIR}`);
  console.log('===========================================================');
}

run().catch((err) => {
  console.error('Packaging failed:', err);
  process.exit(1);
});
