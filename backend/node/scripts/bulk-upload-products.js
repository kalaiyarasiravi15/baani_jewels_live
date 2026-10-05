/**
 * bulk-upload-products.js
 * Reads Product details (1).xlsx and inserts all 150 products into the DB.
 * - Auto-creates missing categories from the Grouping column
 * - Stores Product Code as SKU for later image matching
 * - Skips empty rows (no product name)
 * Run: node scripts/bulk-upload-products.js
 */

const path = require('path');
const os = require('os');
const XLSX  = require('xlsx');
const { sequelize, Product, Category } = require('../models');

// ─── CONFIG ───────────────────────────────────────────────────────────────────
const EXCEL_PATH = process.env.PRODUCT_EXCEL_PATH || path.join(
  os.homedir(), 'Downloads', 'Product details (1).xlsx'
);
const SHEET_NAME = 'Sheet1';
// ──────────────────────────────────────────────────────────────────────────────

function generateSlug(name) {
  return (name || 'product')
    .toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

async function makeUniqueSlug(baseName) {
  const base = generateSlug(baseName);
  let slug = base;
  let counter = 2;
  while (true) {
    const existing = await Product.findOne({ where: { slug }, paranoid: false });
    if (!existing) return slug;
    slug = `${base}-${counter++}`;
  }
}

async function getOrCreateCategory(name, cache) {
  const key = name.trim().toLowerCase();
  if (cache.has(key)) return cache.get(key);
  let cat = await Category.findOne({ where: sequelize.where(
    sequelize.fn('LOWER', sequelize.col('name')), key
  )});
  if (!cat) {
    cat = await Category.create({ name: name.trim(), status: true });
    console.log(`  📂 Created new category: "${cat.name}" (id=${cat.id})`);
  }
  cache.set(key, cat.id);
  return cat.id;
}

async function run() {
  console.log('');
  console.log('════════════════════════════════════════════');
  console.log('  BAANI JEWELS — Bulk Product Upload');
  console.log('════════════════════════════════════════════');
  console.log('');

  // 1. Read Excel
  const wb   = XLSX.readFile(EXCEL_PATH);
  const ws   = wb.Sheets[SHEET_NAME];
  const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
  const headers = data[0];
  console.log(`📄 Excel loaded: ${data.length - 1} rows (including empty)`);

  // 2. Parse rows — skip rows with no product name
  const rows = [];
  for (let i = 1; i < data.length; i++) {
    const row = {};
    headers.forEach((h, idx) => { row[h] = data[i][idx]; });
    const name = String(row['Product name'] || '').trim();
    if (!name) continue;
    rows.push({
      sno:          row['S.no'],
      sku:          String(row['Product code'] || '').trim(),
      name:         name,
      description:  String(row['Description'] || '').trim(),
      mrpPrice:     Number(row['MRP']) || 0,
      salesPrice:   Number(row['Offer price']) || 0,
      stock:        Number(row['Quantity']) || 0,
      grouping:     String(row['Grouping'] || '').trim(),
    });
  }
  console.log(`✅ Valid products (with names): ${rows.length}`);
  console.log(`⏭️  Skipped empty rows: ${data.length - 1 - rows.length}`);
  console.log('');

  // 3. Build category cache
  const categoryCache = new Map();
  const cats = await Category.findAll({ attributes: ['id', 'name'] });
  cats.forEach(c => categoryCache.set(c.name.trim().toLowerCase(), c.id));
  console.log(`📁 Existing categories in DB: ${cats.length}`);

  // 4. Import in transaction
  const transaction = await sequelize.transaction();
  const results = { success: [], failed: [] };

  try {
    for (const row of rows) {
      try {
        // Resolve category
        let categoryId = null;
        if (row.grouping) {
          categoryId = await getOrCreateCategory(row.grouping, categoryCache);
        } else {
          // Default fallback category
          categoryId = await getOrCreateCategory('General', categoryCache);
        }

        // Validate prices
        const mrp   = row.mrpPrice   >= 0 ? row.mrpPrice   : 0;
        const sales = row.salesPrice >= 0 ? row.salesPrice : mrp;

        // Create product
        const slug = await makeUniqueSlug(row.name);
        const product = await Product.create({
          name:        row.name,
          sku:         row.sku || null,
          slug:        slug,
          description: row.description || null,
          mrpPrice:    mrp,
          salesPrice:  sales,
          stock:       row.stock || 0,
          categoryId:  categoryId,
          status:      true,
        }, { transaction });

        results.success.push({ sno: row.sno, name: row.name, id: product.id, sku: row.sku });
      } catch (err) {
        results.failed.push({ sno: row.sno, name: row.name, error: err.message });
      }
    }

    await transaction.commit();
    console.log('');
    console.log('════════════════════════════════════════════');
    console.log(`✅ SUCCESS: ${results.success.length} products uploaded`);
    if (results.failed.length > 0) {
      console.log(`❌ FAILED:  ${results.failed.length} products`);
    }
    console.log('════════════════════════════════════════════');

    if (results.failed.length > 0) {
      console.log('\n❌ Failed products:');
      results.failed.forEach(f => console.log(`  Row ${f.sno}: ${f.name} — ${f.error}`));
    }

    console.log('\n✅ Uploaded products (first 20):');
    results.success.slice(0, 20).forEach(p => {
      console.log(`  [${p.sku}] ${p.name}  (DB id: ${p.id})`);
    });
    if (results.success.length > 20) {
      console.log(`  ... and ${results.success.length - 20} more`);
    }

  } catch (err) {
    await transaction.rollback();
    console.error('❌ Transaction failed, rolling back:', err.message);
  }

  await sequelize.close();
}

run().catch(e => { console.error('Fatal error:', e.message); process.exit(1); });
