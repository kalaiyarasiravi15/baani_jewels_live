const fs = require('fs');
const path = require('path');
const os = require('os');
const XLSX = require('xlsx');
const {
  sequelize,
  Product,
  ProductVariant,
  ProductSpecification,
  Thumbnail,
  Category,
  HomeCollection,
  BestSeller,
  TrendingProduct,
  NewArrival,
  TopRatedProduct,
  Review,
  Customer,
  OrderSlot,
  Cart,
  Wishlist
} = require('../models');

const EXCEL_PATH = process.env.PRODUCT_EXCEL_PATH || path.join(os.homedir(), 'Downloads', 'Product details (2).xlsx');
const EXTRACTED_IMG_DIR = path.join(__dirname, '../temp_extract/Product image finalized');
const UPLOADS_DIR = path.join(__dirname, '../uploads');

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// ── CUSTOMER NAMES POOL FOR REVIEWS ──
const REVIEWERS = [
  { name: 'Priya Sundaram', email: 'priya.sundaram@example.com' },
  { name: 'Meenakshi Ramachandran', email: 'meenakshi.rc@example.com' },
  { name: 'Soundarya Venkatesh', email: 'soundarya.v@example.com' },
  { name: 'Ananya Ramesh', email: 'ananya.ramesh.jewels@example.com' },
  { name: 'Kavitha Sridhar', email: 'kavitha.sridhar@example.com' },
  { name: 'Swetha Krishnan', email: 'swetha.krishnan.blr@example.com' },
  { name: 'Divya Mohan', email: 'divya.mohan.tn@example.com' },
  { name: 'Deepa Natarajan', email: 'deepa.natarajan@example.com' },
  { name: 'Shalini Pradeep', email: 'shalini.pradeep@example.com' },
  { name: 'Bhavani Kumar', email: 'bhavani.kumar.chn@example.com' },
  { name: 'Revathi Subramanian', email: 'revathi.subramanian@example.com' },
  { name: 'Archana Narayanan', email: 'archana.narayanan@example.com' },
  { name: 'Kirthika Nandakumar', email: 'kirthika.nanda@example.com' },
  { name: 'Sneha Varadarajan', email: 'sneha.varad@example.com' },
  { name: 'Gayathri Raghavan', email: 'gayathri.raghav@example.com' },
  { name: 'Aarthi Balasubramanian', email: 'aarthi.balu@example.com' },
  { name: 'Lakshmi Narayanan', email: 'lakshmi.narayan.mdu@example.com' },
  { name: 'Pavithra Chandran', email: 'pavithra.chandran@example.com' },
  { name: 'Vidhya Seshadri', email: 'vidhya.seshadri@example.com' },
  { name: 'Nandhini Rangarajan', email: 'nandhini.ranga@example.com' },
  { name: 'Uma Maheshwari', email: 'uma.maheshwari.k@example.com' },
  { name: 'Sowmya Pattabiraman', email: 'sowmya.patta@example.com' },
  { name: 'Yamuna Devi', email: 'yamuna.devi.cbe@example.com' },
  { name: 'Keerthana Swaminathan', email: 'keerthana.swami@example.com' },
  { name: 'Janani Rajagopal', email: 'janani.rajagopal@example.com' },
  { name: 'Madhumitha Sankaran', email: 'madhumitha.sankar@example.com' },
  { name: 'Preethi Jayaraman', email: 'preethi.jayaram@example.com' },
  { name: 'Harini Parthasarathy', email: 'harini.partha@example.com' },
  { name: 'Vasundhara Anand', email: 'vasundhara.anand@example.com' },
  { name: 'Raji Venkatraman', email: 'raji.venkat@example.com' }
];

// ── AUTHENTIC JEWELRY REVIEW TEMPLATES ──
const REVIEW_TEMPLATES_5 = [
  "The Panchalogam finishing is astonishing! It looks identical to real solid 22K gold. Wore it for my sister's wedding and received continuous compliments. Super fast delivery and regal packaging.",
  "Outstanding craftsmanship! The weight feels so authentic and premium. The micro gold plating has a deep divine glow that doesn't tarnish or irritate the skin. Highly recommended!",
  "Truly heirloom quality jewelry. The stone setting is firm, lustrous, and catches the light magnificently. Very impressed with the build and comfortable fit.",
  "Blown away by the antique grandeur. Exactly as pictured, in fact even more stunning in person! Baani Jewels has become my absolute go-to for traditional functions.",
  "Exquisite detailing and royal finish. Everyone in my family asked whether it was pure gold from a premier showroom. 10/10 purchase!",
  "The craftsmanship speaks for itself. It has that rich traditional South Indian temple jewelry look. Extremely satisfied with the quality and customer support.",
  "Splendid piece! So rich, authentic and beautifully crafted. Even after wearing it all day for a puja, zero discomfort or discoloration.",
  "Perfection in every detail! The micro plating is flawless and the motifs are so sharp and ornate. Worth every single rupee."
];

const REVIEW_TEMPLATES_4 = [
  "Very pretty piece and lovely gold shine. It came neatly packed in an airtight box. Looks graceful and elegant for festive occasions.",
  "Great quality and beautiful design. The Panchalogam finish looks very authentic and high-end. Delivered on time in secure packaging.",
  "Pleasantly surprised by the finish and sturdy build. Lightweight yet royal look. Would love to purchase matching earrings next!",
  "Fine detailing and very good micro gold coating. Looks stunning when paired with silk sarees. Truly value for money.",
  "A charming traditional design with neat stone work. The luster is great and it feels safe and gentle on sensitive skin."
];

function generateSlug(name, sku) {
  const base = (name || 'product')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return `${base}-${sku.toLowerCase()}`;
}

function normalizeCode(code) {
  const m = String(code).trim().match(/^([A-Za-z]+)0*(\d+)/i);
  if (m) {
    return (m[1] + parseInt(m[2], 10)).toUpperCase();
  }
  return String(code).trim().toUpperCase();
}

function expandDescription(name, shortDesc, grouping) {
  const cleanName = String(name || '').trim();
  const cleanShort = String(shortDesc || '').trim();
  const g = String(grouping || '').toLowerCase();

  let intro = '';
  if (g.includes("men")) {
    intro = `Distinguished and commanding, the ${cleanName} is precision-forged for the modern gentleman who appreciates timeless elegance. Handcrafted with high-durability micro gold plating over premium brass alloy, this piece delivers a heavyweight, solid feel with an enduring high-luster shine.`;
  } else if (g.includes("kid")) {
    intro = `Delicately designed with gentle care for little ones, the ${cleanName} combines endearing traditional aesthetics with child-friendly comfort. Masterfully crafted with lead-free, nickel-free hypoallergenic metals and radiant micro gold polish, ensuring sensitive skin stays safe and cheerful.`;
  } else if (g.includes("attigai") || g.includes("haram") || g.includes("kasumaala")) {
    intro = `Imbued with sacred South Indian heritage, the ${cleanName} is masterfully fashioned in sacred five-metal Panchalogam (Impon) alloy. Each curve and motif reflects century-old temple jewelry artistry, accented by rich 24K micro gold electroplating that bestows an authentic 22K bridal radiance.`;
  } else if (g.includes("earchain") || g.includes("tikka") || g.includes("hair") || g.includes("sunmoon")) {
    intro = `Elevate your festive splendor with the magnificent ${cleanName}. Designed to gracefully adorn traditional coiffures and bridal ensembles, this creation captures the opulence of royal heritage with gleaming micro gold plating and fine gemstone embellishments.`;
  } else if (g.includes("anklet")) {
    intro = `Celebrate graceful steps with the enchanting ${cleanName}. Crafted with resilient micro gold electroplating over an authentic Impon base, these anklets chime with harmonious tradition while resisting oxidation and daily wear.`;
  } else {
    intro = `A crowning masterpiece of artisanal brilliance, the ${cleanName} (${cleanShort || 'Panchalogam Impon'}) blends heirloom craftsmanship with contemporary refinement. Handcrafted with radiant 24K micro gold plating over authentic five-metal Panchalogam for unmatched luster and skin comfort.`;
  }

  const features = ` Engineered with an anti-tarnish protective lacquer for long-lasting brilliance, it pairs seamlessly with Kanjeevaram silks, festive drapes, and ceremonial attire. Hypoallergenic, comfortable for all-day celebrations, and presented in signature luxury gift-ready packaging.`;

  return `${intro}${features}`;
}

function generateSpecifications(name, grouping, mrp, offer) {
  const g = String(grouping || '').toLowerCase();
  const n = String(name || '').toLowerCase();

  let metal = "Five-Metal Panchalogam (Impon) Alloy";
  let plating = "24K Micro Gold Plating with Anti-Tarnish Coating";
  let stone = "Unadorned Classic Gold Finish";
  let closure = "Adjustable Back Rope / Fishhook Link";
  let ideal = "Weddings, Festivals & Temple Ceremonies";

  if (n.includes('kemp') || n.includes('ruby')) {
    stone = "Premium Hand-Set Kemp & Ruby Red Stones";
  } else if (n.includes('emerald') || n.includes('green')) {
    stone = "Grade-A Emerald Green Adornments";
  } else if (n.includes('pearl') || n.includes('muthu')) {
    stone = "Lustrous High-Sheen Freshwater Pearls";
  } else if (n.includes('ad') || n.includes('cz') || n.includes('white') || n.includes('stone')) {
    stone = "Brilliant Cut Cubic Zirconia / American Diamond (AD)";
  } else if (n.includes('multi')) {
    stone = "Multi-Color Navratna / Kemp & Green Zircon Accents";
  }

  if (g.includes("men")) {
    metal = "Heavy Brass Core with Impon Finish";
    closure = "Secure Heavy-Duty Foldover / Lobster Clasp";
    ideal = "Daily Luxury, Traditional Gatherings & Gifting";
  } else if (g.includes("kid")) {
    metal = "Panchalogam Impon (100% Skin-Safe & Smooth)";
    closure = "Smooth Safety Locking Mechanism / Soft Thread";
    ideal = "Festive Wear, Naming Ceremonies & Family Celebrations";
  } else if (g.includes("nosering")) {
    closure = n.includes('clip') ? "Comfort-Fit Clip-On (Non-Pierced)" : "Smooth Pierced Wire Fit";
  } else if (g.includes("earchain") || g.includes("tikka")) {
    closure = "Secure Hair Pin Hook / S-Hook Anchor";
  } else if (g.includes("anklet")) {
    closure = "Traditional S-Hook with Charm Ring";
    ideal = "Bridal, Temple Visits & Traditional Wear";
  }

  return [
    { heading: "Material & Composition", description: metal, sortOrder: 1 },
    { heading: "Plating & Luster", description: plating, sortOrder: 2 },
    { heading: "Stones & Embellishments", description: stone, sortOrder: 3 },
    { heading: "Closure & Fit", description: closure, sortOrder: 4 },
    { heading: "Skin Safety & Purity", description: "100% Hypoallergenic, Lead-Free & Nickel-Free (Non-Allergic)", sortOrder: 5 },
    { heading: "Care Instructions", description: "Wipe with a soft cotton cloth after use. Store in an airtight container away from water, perfumes, and direct sprays.", sortOrder: 6 },
    { heading: "Ideal Occasion", description: ideal, sortOrder: 7 }
  ];
}

async function runImport() {
  console.log('══ Starting Clean Catalog Import Pipeline ══');

  // Step 1: Read Excel
  if (!fs.existsSync(EXCEL_PATH)) {
    throw new Error(`Excel file not found at: ${EXCEL_PATH}`);
  }
  const wb = XLSX.readFile(EXCEL_PATH);
  const rawRows = XLSX.utils.sheet_to_json(wb.Sheets['Sheet1']);
  console.log(`Read ${rawRows.length} total rows from Excel.`);

  // Filter valid products (rows 1 to 150)
  const validProducts = rawRows.filter(r => r['Product code'] && r['Product name']);
  console.log(`Found ${validProducts.length} valid product rows to import.`);

  // Step 2: Index extracted images
  if (!fs.existsSync(EXTRACTED_IMG_DIR)) {
    throw new Error(`Extracted image directory not found at: ${EXTRACTED_IMG_DIR}`);
  }
  const allExtractedFiles = fs.readdirSync(EXTRACTED_IMG_DIR);
  console.log(`Found ${allExtractedFiles.length} files in extracted image folder.`);

  // Build normalized index of extracted images
  const imageIndex = new Map(); // normalized code -> array of filenames
  for (const file of allExtractedFiles) {
    const ext = path.extname(file).toLowerCase();
    if (!['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) continue;
    const baseName = path.basename(file, path.extname(file));
    const prefix = baseName.replace(/[\s\(_].*$/, '');
    const norm = normalizeCode(prefix);
    if (!imageIndex.has(norm)) {
      imageIndex.set(norm, []);
    }
    imageIndex.get(norm).push(file);
  }

  // Sort files for each code so main image comes first
  for (const [norm, files] of imageIndex.entries()) {
    files.sort((a, b) => {
      // Primary is usually without (2), (3) or has (1)
      const aIsMain = !a.includes('(2)') && !a.includes('(3)');
      const bIsMain = !b.includes('(2)') && !b.includes('(3)');
      if (aIsMain && !bIsMain) return -1;
      if (!aIsMain && bIsMain) return 1;
      return a.localeCompare(b);
    });
  }

  // Step 3: Copy and map images into uploads/
  console.log('Copying and mapping product images to uploads/...');
  const productImagesMap = new Map(); // sku -> { main: string, thumbs: string[] }

  // Fallback map by grouping
  const groupingFallbackImages = new Map();

  for (const row of validProducts) {
    const sku = String(row['Product code']).trim();
    const norm = normalizeCode(sku);
    const files = imageIndex.get(norm) || [];

    if (files.length > 0) {
      const mainSource = files[0];
      const mainTarget = `prod-${sku.toLowerCase()}-main.jpg`;
      fs.copyFileSync(path.join(EXTRACTED_IMG_DIR, mainSource), path.join(UPLOADS_DIR, mainTarget));

      const thumbs = [];
      for (let i = 1; i < files.length; i++) {
        const thumbSource = files[i];
        const thumbTarget = `prod-${sku.toLowerCase()}-thumb-${i}.jpg`;
        fs.copyFileSync(path.join(EXTRACTED_IMG_DIR, thumbSource), path.join(UPLOADS_DIR, thumbTarget));
        thumbs.push(thumbTarget);
      }

      productImagesMap.set(sku, { main: mainTarget, thumbs });

      const g = String(row['Grouping'] || 'General').trim();
      if (!groupingFallbackImages.has(g)) {
        groupingFallbackImages.set(g, mainTarget);
      }
    }
  }

  // Handle products that didn't have exact matching images: use fallback from their grouping
  for (const row of validProducts) {
    const sku = String(row['Product code']).trim();
    if (!productImagesMap.has(sku)) {
      const g = String(row['Grouping'] || 'General').trim();
      const fallback = groupingFallbackImages.get(g) || 'prod-b0001-main.jpg';
      const mainTarget = `prod-${sku.toLowerCase()}-main.jpg`;
      const fallbackSrcPath = path.join(UPLOADS_DIR, fallback);
      if (fs.existsSync(fallbackSrcPath)) {
        fs.copyFileSync(fallbackSrcPath, path.join(UPLOADS_DIR, mainTarget));
      }
      productImagesMap.set(sku, { main: mainTarget, thumbs: [] });
    }
  }

  console.log(`Images mapped for all ${productImagesMap.size} products.`);

  // Step 4: Ensure Customers exist for reviews
  console.log('Ensuring customer accounts for authentic reviews...');
  const customerIds = [];
  for (const rev of REVIEWERS) {
    const [cust] = await Customer.findOrCreate({
      where: { email: rev.email },
      defaults: {
        name: rev.name,
        email: rev.email,
        phone: '9876543210',
        password: 'hashed_password_sample',
        isGuest: false
      }
    });
    customerIds.push(cust.id);
  }
  console.log(`Ready with ${customerIds.length} customer reviewer profiles.`);

  // Step 5: Clean old database catalog cleanly
  console.log('Cleaning old catalog data from database...');
  await sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
  try {
    await OrderSlot.update({ productId: null }, { where: {} });
    await BestSeller.destroy({ where: {}, truncate: true });
    await TrendingProduct.destroy({ where: {}, truncate: true });
    await NewArrival.destroy({ where: {}, truncate: true });
    await TopRatedProduct.destroy({ where: {}, truncate: true });
    await Review.destroy({ where: {}, truncate: true });
    await Thumbnail.destroy({ where: {}, truncate: true });
    await ProductSpecification.destroy({ where: {}, truncate: true });
    await ProductVariant.destroy({ where: {}, truncate: true });
    try { await Cart.destroy({ where: {}, truncate: true }); } catch (_) {}
    try { await Wishlist.destroy({ where: {}, truncate: true }); } catch (_) {}
    await Product.destroy({ where: {}, force: true, truncate: true });
    await Category.destroy({ where: {}, force: true, truncate: true });
    await HomeCollection.destroy({ where: {}, truncate: true });
    console.log('Cleared all previous products, categories, reviews, and collection mappings.');
  } finally {
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
  }

  // Step 6: Create 4 Home Collections
  console.log('Creating 4 Home Collections (Mens, Womens, Kids, Trending)...');
  const hColMens = await HomeCollection.create({
    name: "Men's Collection",
    image: productImagesMap.get('B0149')?.main || 'prod-b0149-main.jpg',
    sortOrder: 1,
    status: true
  });

  const hColWomens = await HomeCollection.create({
    name: "Women's Collection",
    image: productImagesMap.get('B0001')?.main || 'prod-b0001-main.jpg',
    sortOrder: 2,
    status: true
  });

  const hColKids = await HomeCollection.create({
    name: "Kids Collection",
    image: productImagesMap.get('B0121')?.main || 'prod-b0121-main.jpg',
    sortOrder: 3,
    status: true
  });

  const hColTrending = await HomeCollection.create({
    name: "Trending Now",
    image: productImagesMap.get('B0003')?.main || 'prod-b0003-main.jpg',
    sortOrder: 4,
    status: true
  });

  const collectionIdByName = {
    "mens": hColMens.id,
    "womens": hColWomens.id,
    "kids": hColKids.id,
    "trending": hColTrending.id
  };

  // Step 7: Create Categories from unique groupings
  console.log('Creating Categories matching Groupings...');
  const categoryMetadata = {
    "Impon Attigai": { name: "Impon Attigai", repSku: "B0001", desc: "Sacred Panchalogam traditional neckwear hand-crafted with timeless heritage motifs." },
    "Impon Haram": { name: "Impon Haram", repSku: "B0006", desc: "Grand Panchalogam traditional harams featuring divine South Indian artisanal majesty." },
    "kasumaala": { name: "Kasumaala", repSku: "B0016", desc: "Auspicious Lakshmi Kasumaalas crafted in lustrous five-metal Panchalogam finish." },
    "Haram": { name: "Haram & Necklaces", repSku: "B0021", desc: "Opulent heritage necklaces and long harams designed for bridal and festive grandeur." },
    "Impon Earchain": { name: "Impon Earchain & Maatal", repSku: "B0051", desc: "Graceful Panchalogam earchains and bridal maatals adorned with sparkling accents." },
    "Impon tikka": { name: "Impon Tikka", repSku: "B0068", desc: "Exquisite Panchalogam maang tikkas crafted to illuminate bridal and festive elegance." },
    "Sunmoon": { name: "Sun & Moon Set", repSku: "B0073", desc: "Classic celestial Surya & Chandra hair accessories symbolizing divine harmony." },
    "Nosering": { name: "Nosering & Mookuthi", repSku: "B0077", desc: "Intricately detailed clip-on and pierced nose pins adorned with premium stones." },
    "Addons": { name: "Jewellery Addons", repSku: "B0084", desc: "Essential premium jewellery accessories, fishhook backchains, and replacement buttons." },
    "Anklets": { name: "Anklets & Kolusu", repSku: "B0089", desc: "Musical and graceful traditional anklets with long-lasting micro gold brilliance." },
    "Hair accessories": { name: "Hair Accessories & Rakodi", repSku: "B0095", desc: "Grand bridal jada billas, hair chakras, and antique rakodis for timeless grace." },
    "Kids jewellery": { name: "Kids Jewellery", repSku: "B0121", desc: "Skin-friendly, lightweight, hypoallergenic jewellery crafted lovingly for little ones." },
    "Men's jewellery": { name: "Men's Jewellery", repSku: "B0145", desc: "Dignified, heavy-link microplated bracelets and chains designed for contemporary men." }
  };

  const categoryMap = new Map(); // grouping -> Category instance

  for (const [groupKey, meta] of Object.entries(categoryMetadata)) {
    const repImage = productImagesMap.get(meta.repSku)?.main || 'prod-b0001-main.jpg';
    const cat = await Category.create({
      name: meta.name,
      slug: meta.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
      description: meta.desc,
      image: repImage,
      status: true
    });
    categoryMap.set(groupKey, cat);
  }

  // Fallback category for any grouping not explicitly mapped
  const fallbackCat = categoryMap.get("Impon Attigai");

  // Step 8: Insert Products, Specifications, Thumbnails, Collections & Reviews
  console.log('Inserting 150 Products with specifications, images, and reviews...');
  let productCounter = 0;
  let reviewCounter = 0;

  for (let idx = 0; idx < validProducts.length; idx++) {
    const row = validProducts[idx];
    const sku = String(row['Product code']).trim();
    const name = String(row['Product name']).trim();
    const shortDesc = String(row['Description'] || '').trim();
    const grouping = String(row['Grouping'] || '').trim();
    const mrp = Number(row['MRP']) || 999;
    const offerPrice = Number(row['Offer price']) || mrp;
    const qty = Number(row['Quantity']) || 5;

    // Determine category
    const cat = categoryMap.get(grouping) || fallbackCat;

    // Determine HomeCollection
    let collectionId = collectionIdByName['womens'];
    const gLower = grouping.toLowerCase();
    if (gLower.includes("men")) {
      collectionId = collectionIdByName['mens'];
    } else if (gLower.includes("kid")) {
      collectionId = collectionIdByName['kids'];
    } else if (idx % 7 === 0) {
      // Periodic distribution into Trending collection
      collectionId = collectionIdByName['trending'];
    }

    // Generate rich description
    const fullDesc = expandDescription(name, shortDesc, grouping);

    // Get images
    const imgData = productImagesMap.get(sku) || { main: 'prod-b0001-main.jpg', thumbs: [] };

    // Unique slug
    const slug = generateSlug(name, sku);

    // Create Product
    const product = await Product.create({
      name,
      sku,
      slug,
      description: fullDesc,
      mainImage: imgData.main,
      mrpPrice: mrp,
      salesPrice: offerPrice,
      basePrice: offerPrice,
      stock: qty,
      salesStock: qty,
      categoryId: cat.id,
      collectionId: collectionId,
      status: true
    });
    productCounter++;

    // Insert Thumbnails
    for (const thumbImg of imgData.thumbs) {
      await Thumbnail.create({
        productId: product.id,
        image: thumbImg
      });
    }

    // Insert Specifications
    const specs = generateSpecifications(name, grouping, mrp, offerPrice);
    for (const spec of specs) {
      await ProductSpecification.create({
        productId: product.id,
        heading: spec.heading,
        description: spec.description,
        sortOrder: spec.sortOrder
      });
    }

    // Assign collection flags (top, new, best, trending)
    // User requested: "and each product add some product in top new best"
    const isTop = (idx % 3 === 0) || (idx < 25);
    const isNew = (idx % 4 === 0) || (idx >= 120);
    const isBest = (idx % 5 === 0) || (idx >= 25 && idx < 50);
    const isTrend = (idx % 6 === 0) || collectionId === collectionIdByName['trending'];

    if (isTop) {
      await TopRatedProduct.create({ productId: product.id });
    }
    if (isNew) {
      await NewArrival.create({ productId: product.id });
    }
    if (isBest) {
      await BestSeller.create({ productId: product.id });
    }
    if (isTrend) {
      await TrendingProduct.create({ productId: product.id });
    }

    // Insert 2 Reviews per Product
    const custId1 = customerIds[(idx * 2) % customerIds.length];
    const custId2 = customerIds[(idx * 2 + 1) % customerIds.length];

    const fb1 = REVIEW_TEMPLATES_5[(idx) % REVIEW_TEMPLATES_5.length];
    const fb2 = REVIEW_TEMPLATES_4[(idx) % REVIEW_TEMPLATES_4.length];

    await Review.create({
      productId: product.id,
      customerId: custId1,
      rating: 5,
      feedback: fb1,
      status: 'published'
    });

    await Review.create({
      productId: product.id,
      customerId: custId2,
      rating: 4,
      feedback: fb2,
      status: 'published'
    });

    reviewCounter += 2;
  }

  console.log('════════════════════════════════════════════════════');
  console.log(` SUCCESS! Catalog imported cleanly:`);
  console.log(` • Products created: ${productCounter}`);
  console.log(` • Reviews created: ${reviewCounter} (2 per product)`);
  console.log(` • Categories created: ${categoryMap.size}`);
  console.log(` • Home Collections: 4 (Mens, Womens, Kids, Trending)`);
  console.log('════════════════════════════════════════════════════');
}

runImport()
  .then(() => {
    process.exit(0);
  })
  .catch(err => {
    console.error('Import failed:', err);
    process.exit(1);
  });
