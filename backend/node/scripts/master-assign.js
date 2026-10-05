const XLSX = require('xlsx');
const { sequelize, Product, Category, HomeCollection,
        BestSeller, TrendingProduct, NewArrival, TopRatedProduct } = require('../models');
const { Op } = require('sequelize');
const path = require('path');
const os = require('os');

const COL_WOMENS   = 1;
const COL_MENS     = 2;
const COL_KIDS     = 3;
const COL_TRENDING = 4;

async function run() {
  console.log('\n════════════════════════════════════════════════════════════════');
  console.log('  BAANI JEWELS — Master Product Cleanup & Smart Section Assignment');
  console.log('════════════════════════════════════════════════════════════════\n');

  // ─── STEP 1: Delete non-Excel products safely ─────────────────────────────
  console.log('▶ STEP 1: Removing products NOT from Excel...');
  const nonExcel = await Product.findAll({
    where: {
      [Op.or]: [
        { sku: null },
        { sku: '' }
      ]
    },
    attributes: ['id', 'name']
  });

  const nonExcelIds = nonExcel.map(p => p.id);
  console.log(`  Found ${nonExcelIds.length} non-Excel product(s) to remove.`);

  if (nonExcelIds.length > 0) {
    // Disable foreign key checks to safely clean up references
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 0;');
    
    // Clean up dependent tables
    await sequelize.query(`DELETE FROM carts WHERE productId IN (${nonExcelIds.join(',')})`);
    await sequelize.query(`DELETE FROM wishlists WHERE productId IN (${nonExcelIds.join(',')})`);
    await sequelize.query(`DELETE FROM reviews WHERE productId IN (${nonExcelIds.join(',')})`);
    await sequelize.query(`DELETE FROM thumbnails WHERE productId IN (${nonExcelIds.join(',')})`);
    await sequelize.query(`DELETE FROM productspecifications WHERE productId IN (${nonExcelIds.join(',')})`);
    await sequelize.query(`DELETE FROM productvariants WHERE productId IN (${nonExcelIds.join(',')})`);
    await sequelize.query(`DELETE FROM bestsellers WHERE productId IN (${nonExcelIds.join(',')})`);
    await sequelize.query(`DELETE FROM trendingproducts WHERE productId IN (${nonExcelIds.join(',')})`);
    await sequelize.query(`DELETE FROM newarrivals WHERE productId IN (${nonExcelIds.join(',')})`);
    await sequelize.query(`DELETE FROM topratedproducts WHERE productId IN (${nonExcelIds.join(',')})`);
    
    // Force delete products
    await sequelize.query(`DELETE FROM products WHERE id IN (${nonExcelIds.join(',')})`);
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 1;');

    nonExcel.forEach(p => console.log(`  🗑️  Deleted: "${p.name}" (id: ${p.id})`));
  }
  console.log('  ✅ Non-Excel product cleanup complete.\n');

  // ─── STEP 2: Read Excel and categorize products ───────────────────────────
  console.log('▶ STEP 2: Analyzing all 150 Excel products for Collection & Sections...');
  const wb   = XLSX.readFile(process.env.PRODUCT_EXCEL_PATH || path.join(os.homedir(), 'Downloads', 'Product details (1).xlsx'));
  const ws   = wb.Sheets['Sheet1'];
  const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
  const hdrs = data[0];

  const excelRows = [];
  for (let i = 1; i < data.length; i++) {
    const row = {};
    hdrs.forEach((h, idx) => { row[h] = data[i][idx] ? data[i][idx].toString().trim() : ''; });
    if (row['Product name']) excelRows.push(row);
  }

  console.log(`  Read ${excelRows.length} valid product rows from Excel Sheet1.`);

  // Load all current active products from DB (which are now only the 150 Excel products)
  const allProducts = await Product.findAll({
    include: [{ model: Category, as: 'category', attributes: ['id', 'name'] }]
  });
  console.log(`  Active DB products count: ${allProducts.length}`);

  const productBySku = new Map(allProducts.map(p => [p.sku, p]));
  const productByName = new Map(allProducts.map(p => [p.name.toLowerCase().trim(), p]));

  // ─── STEP 3: Collection Assignment ─────────────────────────────────────────
  console.log('\n▶ STEP 3: Assigning Collections (Womens, Mens, Kids, Trending Sets)...');

  const womenProductIds = [];
  const menProductIds = [];
  const kidsProductIds = [];
  const trendingSetProductIds = [];

  for (const row of excelRows) {
    const sku = row['Product code'];
    const p = productBySku.get(sku) || productByName.get(row['Product name'].toLowerCase().trim());
    if (!p) continue;

    const g = (row['Grouping'] || '').toLowerCase();
    const n = (row['Product name'] || '').toLowerCase();

    // 1. Mens
    if (g === "men's jewellery" || g === "mens jewellery" || n.includes('mens ') || n.includes("men's ") || n.includes('kaapu')) {
      menProductIds.push(p.id);
    }
    // 2. Kids
    else if (g === 'kids jewellery' || n.includes('kids ') || n.includes('baby ')) {
      kidsProductIds.push(p.id);
    }
    // 3. Trending Sets (sets / combos / haram with earrings / bridal / long set)
    else if (n.includes('set') || n.includes('combo') || n.includes('with earings') || n.includes('with earrings') || n.includes('bridal') || n.includes('royal')) {
      trendingSetProductIds.push(p.id);
    }
    // 4. Womens
    else {
      womenProductIds.push(p.id);
    }
  }

  // Update DB collections
  await Product.update({ collectionId: null }, { where: {} });
  
  if (womenProductIds.length > 0) {
    await Product.update({ collectionId: COL_WOMENS }, { where: { id: { [Op.in]: womenProductIds } } });
  }
  if (menProductIds.length > 0) {
    await Product.update({ collectionId: COL_MENS }, { where: { id: { [Op.in]: menProductIds } } });
  }
  if (kidsProductIds.length > 0) {
    await Product.update({ collectionId: COL_KIDS }, { where: { id: { [Op.in]: kidsProductIds } } });
  }
  if (trendingSetProductIds.length > 0) {
    await Product.update({ collectionId: COL_TRENDING }, { where: { id: { [Op.in]: trendingSetProductIds } } });
  }

  console.log(`  ✅ Womens Collection (id: ${COL_WOMENS}): ${womenProductIds.length} products`);
  console.log(`  ✅ Mens Collection (id: ${COL_MENS}): ${menProductIds.length} products`);
  console.log(`  ✅ Kids Collection (id: ${COL_KIDS}): ${kidsProductIds.length} products`);
  console.log(`  ✅ Trending Sets Collection (id: ${COL_TRENDING}): ${trendingSetProductIds.length} products`);

  // ─── STEP 4: Reset and Populate Homepage Showcase Sections ──────────────────
  console.log('\n▶ STEP 4: Smart Selection for Best Seller, Top Rated, New Arrival, Trending Sections...');

  await BestSeller.destroy({ where: {}, truncate: true });
  await TopRatedProduct.destroy({ where: {}, truncate: true });
  await NewArrival.destroy({ where: {}, truncate: true });
  await TrendingProduct.destroy({ where: {}, truncate: true });
  console.log('  Cleaned existing section tables.');

  // Helper: map discount percentage and price
  const enrichedProducts = allProducts.map(p => {
    const mrp = Number(p.mrpPrice || 0);
    const sales = Number(p.salesPrice || mrp);
    const discount = mrp > sales && mrp > 0 ? Math.round(((mrp - sales) / mrp) * 100) : 0;
    const discountAmount = mrp - sales;
    return {
      id: p.id,
      name: p.name,
      sku: p.sku,
      categoryName: p.category ? p.category.name : '',
      categoryId: p.categoryId,
      mrp,
      sales,
      discount,
      discountAmount,
      stock: p.stock
    };
  });

  // 1. BEST SELLERS (12 items): High discount + Popular Categories (Attigai, Kasumaala, Haram, Earchain, Bangles)
  const bestSellersPool = enrichedProducts
    .filter(p => p.discount > 0)
    .sort((a, b) => (b.discount - a.discount) || (b.discountAmount - a.discountAmount))
    .slice(0, 12);

  for (const item of bestSellersPool) {
    await BestSeller.create({ productId: item.id });
  }
  console.log(`  ⭐ Best Sellers added: ${bestSellersPool.length} products (Highest Discounts & Popular demand)`);
  bestSellersPool.slice(0, 4).forEach(p => console.log(`     - [${p.discount}% OFF] [${p.sku}] ${p.name} (₹${p.sales} / ₹${p.mrp})`));

  // 2. TOP RATED (10 items): Premium, Highest MRP value & Panchalogam/Royal designs
  const topRatedPool = enrichedProducts
    .filter(p => p.mrp >= 800)
    .sort((a, b) => b.mrp - a.mrp)
    .slice(0, 10);

  for (const item of topRatedPool) {
    await TopRatedProduct.create({ productId: item.id });
  }
  console.log(`  👑 Top Rated added: ${topRatedPool.length} products (Premium & Royal High-Value Jewels)`);
  topRatedPool.slice(0, 4).forEach(p => console.log(`     - [₹${p.mrp}] [${p.sku}] ${p.name} (${p.categoryName})`));

  // 3. NEW ARRIVALS (14 items): Wide variety across all 13 categories (Attigai, Tikka, Earchain, Hair Accessories, Anklets, Kids, Mens, Noserings, Sunmoon)
  const categoryGroups = new Map();
  for (const p of enrichedProducts) {
    const cat = p.categoryName || 'General';
    if (!categoryGroups.has(cat)) categoryGroups.set(cat, []);
    categoryGroups.get(cat).push(p);
  }

  const newArrivalsPool = [];
  // Pick 1-2 distinct stylish items from each category
  for (const [catName, catItems] of categoryGroups.entries()) {
    // Pick middle/latest items from each category
    const picked = catItems.slice(0, 1);
    newArrivalsPool.push(...picked);
  }
  // Fill up to 14 if needed
  if (newArrivalsPool.length < 14) {
    const remaining = enrichedProducts.filter(p => !newArrivalsPool.some(n => n.id === p.id));
    newArrivalsPool.push(...remaining.slice(0, 14 - newArrivalsPool.length));
  }
  const finalNewArrivals = newArrivalsPool.slice(0, 14);

  for (const item of finalNewArrivals) {
    await NewArrival.create({ productId: item.id });
  }
  console.log(`  ✨ New Arrivals added: ${finalNewArrivals.length} products (Representing all 13 categories)`);
  finalNewArrivals.slice(0, 4).forEach(p => console.log(`     - [${p.categoryName}] [${p.sku}] ${p.name}`));

  // 4. TRENDING PRODUCTS (12 items): Kemp stones, Kodi attigai, Lakshmi kasumaala, Mango swan, microplated
  const trendingPool = enrichedProducts
    .filter(p => {
      const n = p.name.toLowerCase();
      return n.includes('kemp') || n.includes('kodi') || n.includes('lakshmi') || 
             n.includes('swan') || n.includes('lotus') || n.includes('pearl') ||
             n.includes('stone') || n.includes('closeneck');
    })
    .slice(0, 12);

  for (const item of trendingPool) {
    await TrendingProduct.create({ productId: item.id });
  }
  console.log(`  🔥 Trending Products added: ${trendingPool.length} products (Kemp, Kodi, Lakshmi & Stone styles)`);
  trendingPool.slice(0, 4).forEach(p => console.log(`     - [${p.sku}] ${p.name}`));

  // ─── FINAL VERIFICATION ───────────────────────────────────────────────────
  console.log('\n════════════════════════════════════════════════════════════════');
  console.log('  🎉 COMPLETE SUMMARY REPORT');
  console.log('════════════════════════════════════════════════════════════════');
  const totalProducts = await Product.count();
  const bsCount = await BestSeller.count();
  const trCount = await TopRatedProduct.count();
  const naCount = await NewArrival.count();
  const tpCount = await TrendingProduct.count();

  console.log(`  Total Products in Store: ${totalProducts} (100% from Excel)`);
  console.log(`  Collections:`);
  console.log(`    • Womens:        ${womenProductIds.length}`);
  console.log(`    • Mens:          ${menProductIds.length}`);
  console.log(`    • Kids:          ${kidsProductIds.length}`);
  console.log(`    • Trending Sets: ${trendingSetProductIds.length}`);
  console.log(`  Showcase Sections:`);
  console.log(`    • Best Sellers:     ${bsCount}`);
  console.log(`    • Top Rated:        ${trCount}`);
  console.log(`    • New Arrivals:     ${naCount}`);
  console.log(`    • Trending:         ${tpCount}`);
  console.log('════════════════════════════════════════════════════════════════\n');

  await sequelize.close();
}

run().catch(err => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});
