const fs   = require('fs');
const path = require('path');
const os = require('os');
const { sequelize, Product, Thumbnail } = require('../models');

const PICTURES_DIR = process.env.PRODUCT_PICTURES_DIR || path.join(process.env.OneDrive || os.homedir(), 'Pictures');
const EXTRACT_DIR = process.env.PRODUCT_EXTRACT_DIR || path.join(PICTURES_DIR, 'extracted_product_images');
const UPLOADS_DIR  = path.join(__dirname, '..', 'uploads');

// Explicit mappings provided by user
const userMappings = [
  { file: 'WhatsApp Image 2026-09-17 at 3.32.57 PM.jpeg',     sku: 'B0001', type: 'main' },
  { file: 'WhatsApp Image 2026-09-17 at 3.32.58 PM (3).jpeg', sku: 'B0001', type: 'thumb' },
  { file: 'WhatsApp Image 2026-09-17 at 3.32.58 PM (5).jpeg', sku: 'B0002', type: 'main' },
  { file: 'WhatsApp Image 2026-09-17 at 3.32.58 PM (2).jpeg', sku: 'B0002', type: 'thumb' },
  { file: 'WhatsApp Image 2026-09-17 at 3.33.27 PM.jpeg',     sku: 'B0003', type: 'main' },
  { file: 'WhatsApp Image 2026-09-17 at 3.33.05 PM.jpeg',     sku: 'B0066', type: 'main' },
  { file: 'WhatsApp Image 2026-09-17 at 3.32.58 PM (1).jpeg', sku: 'B0068', type: 'main' },
  { file: 'WhatsApp Image 2026-09-17 at 3.33.25 PM.jpeg',     sku: 'B0071', type: 'main' },
  { file: 'WhatsApp Image 2026-09-17 at 3.33.25 PM (1).jpeg', sku: 'B0073', type: 'main' },
];

function findImageFile(filename) {
  const p1 = path.join(EXTRACT_DIR, filename);
  if (fs.existsSync(p1)) return p1;
  const p2 = path.join(PICTURES_DIR, filename);
  if (fs.existsSync(p2)) return p2;
  return null;
}

async function run() {
  console.log('\n════════════════════════════════════════════════════════════════');
  console.log('  BAANI JEWELS — Uploading Product Images & Linking to DB');
  console.log('════════════════════════════════════════════════════════════════\n');

  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }

  // 1. Process explicit user mappings
  console.log('▶ STEP 1: Processing user-specified product images...');
  for (const map of userMappings) {
    const srcPath = findImageFile(map.file);
    if (!srcPath) {
      console.log(`  ❌ File not found: ${map.file}`);
      continue;
    }

    const product = await Product.findOne({ where: { sku: map.sku } });
    if (!product) {
      console.log(`  ❌ Product with SKU ${map.sku} not found`);
      continue;
    }

    const ext = path.extname(map.file);
    const destFileName = `prod-${product.sku.toLowerCase()}-${Date.now()}-${Math.floor(Math.random()*1000)}${ext}`;
    const destPath = path.join(UPLOADS_DIR, destFileName);

    fs.copyFileSync(srcPath, destPath);

    if (map.type === 'main') {
      await product.update({ mainImage: destFileName });
      console.log(`  📸 [${product.sku}] ${product.name} -> Main Image: ${destFileName}`);
    } else {
      await Thumbnail.create({ productId: product.id, image: destFileName });
      console.log(`  🖼️  [${product.sku}] ${product.name} -> Thumbnail: ${destFileName}`);
    }
  }

  console.log('\n✅ User specified images uploaded successfully!\n');

  // 2. Summary of DB image status
  const allProds = await Product.findAll({ attributes: ['id', 'sku', 'name', 'mainImage'] });
  const withImages = allProds.filter(p => p.mainImage);
  const thumbsCount = await Thumbnail.count();

  console.log('════════════════════════════════════════════════════════════════');
  console.log('  📊 IMAGE UPLOAD SUMMARY');
  console.log('════════════════════════════════════════════════════════════════');
  console.log(`  Total Products in DB: ${allProds.length}`);
  console.log(`  Products with Main Image: ${withImages.length}`);
  console.log(`  Total Thumbnails stored: ${thumbsCount}`);
  console.log('  Updated Products:');
  withImages.forEach(p => console.log(`    • [${p.sku}] ${p.name} => ${p.mainImage}`));
  console.log('════════════════════════════════════════════════════════════════\n');

  await sequelize.close();
}

run().catch(err => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});
