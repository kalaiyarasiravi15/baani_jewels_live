const fs = require('fs');
const path = require('path');
const { ZipArchive } = require('archiver');

const ROOT_DIR = path.resolve(__dirname, '..', '..', '..');
const DEPLOY_DIR = path.join(ROOT_DIR, 'deploy_zips');

if (!fs.existsSync(DEPLOY_DIR)) {
    fs.mkdirSync(DEPLOY_DIR, { recursive: true });
}

function zipDirectory(sourceDir, outPath, ignorePatterns = []) {
    return new Promise((resolve, reject) => {
        console.log(`\n📦 Starting compression: ${path.basename(outPath)}...`);
        const output = fs.createWriteStream(outPath);
        const archive = new ZipArchive({
            zlib: { level: 9 }
        });

        output.on('close', () => {
            const mb = (archive.pointer() / 1024 / 1024).toFixed(2);
            console.log(`✅ Completed: ${path.basename(outPath)} (${mb} MB, ${archive.pointer()} total bytes)`);
            resolve(outPath);
        });

        archive.on('warning', (err) => {
            if (err.code === 'ENOENT') {
                console.warn('Warning:', err);
            } else {
                reject(err);
            }
        });

        archive.on('error', (err) => {
            reject(err);
        });

        archive.pipe(output);

        // Include dotfiles (like .htaccess, .env) and standard files
        archive.glob('**/*', {
            cwd: sourceDir,
            dot: true,
            ignore: ignorePatterns
        });

        archive.finalize();
    });
}

function copyFileSafe(src, dest) {
    fs.copyFileSync(src, dest);
    console.log(`📋 Copied to: ${dest}`);
}

async function run() {
    try {
        console.log('🚀 Starting Baani Jewels Production Zip Generation...');
        console.log(`Target Directories:`);
        console.log(`  1. Root: ${ROOT_DIR}`);
        console.log(`  2. Deploy: ${DEPLOY_DIR}`);

        // 1. Frontend Dist (dist folder created by npm run build)
        const frontendDist = path.join(ROOT_DIR, 'frontend', 'dist');
        const frontendZipDeploy = path.join(DEPLOY_DIR, 'frontend.zip');
        await zipDirectory(frontendDist, frontendZipDeploy);
        copyFileSafe(frontendZipDeploy, path.join(ROOT_DIR, 'frontend.zip'));
        // Legacy alias
        copyFileSafe(frontendZipDeploy, path.join(DEPLOY_DIR, 'frontend_dist.zip'));

        // 2. Admin Dashboard Dist (dist folder created by npm run build)
        const adminDist = path.join(ROOT_DIR, 'backend', 'panel', 'admin_dashboard', 'dist');
        const adminZipDeploy = path.join(DEPLOY_DIR, 'admin_dashboard.zip');
        await zipDirectory(adminDist, adminZipDeploy);
        copyFileSafe(adminZipDeploy, path.join(ROOT_DIR, 'admin_dashboard.zip'));
        // Legacy alias
        copyFileSafe(adminZipDeploy, path.join(DEPLOY_DIR, 'admin_dashboard_dist.zip'));

        // 3. Backend Code Only (~1 MB - ultra-fast deployment when uploads already exist on server)
        const backendNode = path.join(ROOT_DIR, 'backend', 'node');
        const backendCodeOnlyDeploy = path.join(DEPLOY_DIR, 'backend_code_only.zip');
        await zipDirectory(backendNode, backendCodeOnlyDeploy, [
            'node_modules/**',
            '.git/**',
            'uploads/**',
            'scripts/create_deploy_zips.js'
        ]);
        copyFileSafe(backendCodeOnlyDeploy, path.join(ROOT_DIR, 'backend_code_only.zip'));

        // 4. Backend Node Full (includes uploads/, excludes node_modules and .git)
        const backendZipDeploy = path.join(DEPLOY_DIR, 'backend.zip');
        await zipDirectory(backendNode, backendZipDeploy, [
            'node_modules/**',
            '.git/**',
            'scripts/create_deploy_zips.js'
        ]);
        copyFileSafe(backendZipDeploy, path.join(ROOT_DIR, 'backend.zip'));
        // Legacy alias
        copyFileSafe(backendZipDeploy, path.join(DEPLOY_DIR, 'backend_node.zip'));

        console.log('\n======================================================');
        console.log('🎉 ALL PRODUCTION PACKAGES GENERATED AND COPIED SUCCESSFULLY!');
        console.log('Files available in Root (k:\\bani jewellery\\) and deploy_zips/:');
        console.log('  - frontend.zip           -> Extract to Webuzo public_html/');
        console.log('  - admin_dashboard.zip    -> Extract to Webuzo public_html/banidashboard/');
        console.log('  - backend.zip            -> Full backend with uploads');
        console.log('  - backend_code_only.zip  -> Code only (~1MB, fast update if uploads exist)');
        console.log('======================================================\n');
    } catch (error) {
        console.error('❌ Error creating deployment zips:', error);
        process.exit(1);
    }
}

run();
