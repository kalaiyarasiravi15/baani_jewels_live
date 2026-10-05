/**
 * bulk-attach-images.js
 * Phase 2: Attach images to products uploaded from Excel.
 *
 * Image naming rules (supported formats):
 *   Single image:    "White stone kodi attigai.jpg"
 *   Multiple images: "White stone kodi attigai_1.jpg", "_2.jpg", "_3.jpg"
 *
 * Usage:
 *   node scripts/bulk-attach-images.js "C:\path\to\images\folder"
 *
 * Supported image extensions: .jpg .jpeg .png .webp .gif
 */

const fs   = require('fs');
const path = require('path');
const { sequelize, Product, Thumbnail } = require('../models');

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'products');
const IMG_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];

async function run() {
  const imageFolder = process.argv[2];
  if (!imageFolder) {
    console.error('❌ Usage: node scripts/bulk-attach-images.js "C:\\path\\to\\images"');
    process.exit(1);
  }
  if (!fs.existsSync(imageFolder)) {
    console.error('❌ Image folder not found:', imageFolder);
    process.exit(1);
  }

  // Create upload dir if missing
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    console.log('📁 Created uploads/products directory');
  }

  console.log('');
  console.log('════════════════════════════════════════════');
  console.log('  BAANI JEWELS — Bulk Image Attachment');
  console.log('════════════════════════════════════════════');
  console.log('📁 Reading images from:', imageFolder);
  console.log('');

  // 1. Scan image files
  const files = fs.readdirSync(imageFolder).filter(f =>
    IMG_EXTENSIONS.includes(path.extname(f).toLowerCase())
  );
  console.log(`📷 Found ${files.length} image files`);

  if (files.length === 0) {
    console.log('⚠️  No images found. Exiting.');
    await sequelize.close();
    return;
  }

  // 2. Group files by product name
  // Filename format: "ProductName.jpg" or "ProductName_1.jpg", "ProductName_2.jpg"
  const productImagesMap = new Map(); // productName (lower) -> [ {file, index} ]
  for (const file of files) {
    const ext  = path.extname(file).toLowerCase();
    const base = path.basename(file, ext); // without extension
    // Check if ends with _N (e.g., _1 _2 _10)
    const multiMatch = base.match(/^(.+)_(\d+)$/);
    let productName, imgIndex;
    if (multiMatch) {
      productName = multiMatch[1].trim().toLowerCase();
      imgIndex    = parseInt(multiMatch[2]);
    } else {
      productName = base.trim().toLowerCase();
      imgIndex    = 1;
    }
    if (!productImagesMap.has(productName)) productImagesMap.set(productName, []);
    productImagesMap.get(productName).push({ file, index: imgIndex });
  }

  // 3. Load all products from DB
  const products = await Product.findAll({ attributes: ['id', 'name', 'sku', 'mainImage'] });
  const productByName = new Map(products.map(p => [p.name.trim().toLowerCase(), p]));
  const productBySku  = new Map(products.filter(p => p.sku).map(p => [p.sku.trim().toLowerCase(), p]));

  console.log(`📦 Products in DB: ${products.length}`);
  console.log(`🔗 Unique product names in image folder: ${productImagesMap.size}`);
  console.log('');

  const results = { matched: 0, unmatched: [], failed: [] };

  // 4. Process each product group
  for (const [productName, imageFiles] of productImagesMap) {
    // Try match by name, then by sku
    let product = productByName.get(productName);
    if (!product) product = productBySku.get(productName);

    if (!product) {
      results.unmatched.push({ productName, files: imageFiles.map(f => f.file) });
      continue;
    }

    // Sort by index
    imageFiles.sort((a, b) => a.index - b.index);

    let mainImageSet = false;
    const thumbnailFiles = [];

    for (const { file, index } of imageFiles) {
      const srcPath  = path.join(imageFolder, file);
      const ext      = path.extname(file).toLowerCase();
      const destName = `product_${product.id}_${Date.now()}_${index}${ext}`;
      const destPath = path.join(UPLOAD_DIR, destName);

      try {
        fs.copyFileSync(srcPath, destPath);
        const relPath = `products/${destName}`;
        if (!mainImageSet) {
          await product.update({ mainImage: relPath });
          mainImageSet = true;
        } else {
          thumbnailFiles.push(relPath);
        }
      } catch (e) {
        results.failed.push({ product: product.name, file, error: e.message });
      }
    }

    // Save thumbnails
    if (thumbnailFiles.length > 0) {
      for (const imgPath of thumbnailFiles) {
        await Thumbnail.create({ productId: product.id, image: imgPath });
      }
    }

    console.log(`  ✅ [${product.sku || 'no-sku'}] ${product.name}`);
    console.log(`     Main: ${imageFiles[0].file}${thumbnailFiles.length > 0 ? ` | +${thumbnailFiles.length} thumbnails` : ''}`);
    results.matched++;
  }

  console.log('');
  console.log('════════════════════════════════════════════');
  console.log(`✅ MATCHED & ATTACHED: ${results.matched} products`);
  if (results.unmatched.length > 0) console.log(`⚠️  UNMATCHED (no product found): ${results.unmatched.length}`);
  if (results.failed.length > 0)   console.log(`❌ ERRORS: ${results.failed.length}`);
  console.log('════════════════════════════════════════════');

  if (results.unmatched.length > 0) {
    console.log('\n⚠️  Unmatched image files (no matching product in DB):');
    results.unmatched.forEach(u => {
      console.log(`  "${u.productName}" — files: ${u.files.join(', ')}`);
    });
  }
  if (results.failed.length > 0) {
    console.log('\n❌ Errors:');
    results.failed.forEach(f => console.log(`  ${f.product} / ${f.file}: ${f.error}`));
  }

  await sequelize.close();
}

run().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
