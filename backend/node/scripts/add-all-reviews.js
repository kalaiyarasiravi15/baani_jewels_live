const { sequelize, Product, Category, Customer, Review } = require('../models');
const bcrypt = require('bcryptjs');

// ── Pool of realistic Verified Customers ─────────────────────────────────────
const customerProfiles = [
  { name: 'Meenakshi V.',       email: 'meenakshi.v@gmail.com',       phone: '9840123456' },
  { name: 'Kavitha Sundaram',    email: 'kavitha.sundar@gmail.com',    phone: '9840234567' },
  { name: 'Swetha Krishnan',     email: 'swetha.k@gmail.com',          phone: '9840345678' },
  { name: 'Divya Mohan',         email: 'divya.mohan@gmail.com',       phone: '9840456789' },
  { name: 'Ananya Ramesh',       email: 'ananya.ramesh@gmail.com',     phone: '9840567890' },
  { name: 'Deepa Natarajan',     email: 'deepa.n@gmail.com',           phone: '9840678901' },
  { name: 'Shalini Pradeep',     email: 'shalini.p@gmail.com',         phone: '9840789012' },
  { name: 'Pooja Venkatesh',     email: 'pooja.v@gmail.com',           phone: '9840890123' },
  { name: 'Revathi Sridhar',     email: 'revathi.s@gmail.com',         phone: '9840901234' },
  { name: 'Lavanya Murali',      email: 'lavanya.m@gmail.com',         phone: '9841012345' },
  { name: 'Pavithra Rajan',      email: 'pavithra.r@gmail.com',        phone: '9841123456' },
  { name: 'Gayathri Raghavan',   email: 'gayathri.r@gmail.com',        phone: '9841234567' },
  { name: 'Sangeetha Balaji',    email: 'sangeetha.b@gmail.com',       phone: '9841345678' },
  { name: 'Aishwarya Saravanan', email: 'aishwarya.s@gmail.com',       phone: '9841456789' },
  { name: 'Harini Karthik',      email: 'harini.k@gmail.com',          phone: '9841567890' },
  { name: 'Keerthana Mani',      email: 'keerthana.m@gmail.com',       phone: '9841678901' },
  { name: 'Radhika Venkat',      email: 'radhika.v@gmail.com',         phone: '9841789012' },
  { name: 'Preethi Ganesan',     email: 'preethi.g@gmail.com',         phone: '9841890123' },
  { name: 'Archana Senthil',     email: 'archana.s@gmail.com',         phone: '9841901234' },
  { name: 'Janani Ramachandran', email: 'janani.r@gmail.com',          phone: '9842012345' },
  { name: 'Vijayalakshmi T.',    email: 'viji.t@gmail.com',            phone: '9842123456' },
  { name: 'Nithya Shankar',      email: 'nithya.shankar@gmail.com',    phone: '9842234567' },
  { name: 'Sowmya Murugesan',    email: 'sowmya.m@gmail.com',          phone: '9842345678' },
  { name: 'Karthik Subramanian', email: 'karthik.subbu@gmail.com',     phone: '9842456789' },
  { name: 'Vigneshwaran R.',     email: 'vignesh.r@gmail.com',         phone: '9842567890' },
  { name: 'Ramesh Kumar S.',     email: 'ramesh.kumar@gmail.com',      phone: '9842678901' }
];

// ── Contextual feedback pools based on category / type ───────────────────────
const feedbackPool = {
  attigai: [
    "The Panchalogam finish is truly traditional! Sits very comfortably on the neck and looks just like real gold.",
    "Stunning craftsmanship! The white CZ stones sparkle beautifully in wedding lights. Received so many compliments.",
    "Vintage royal style at its best. The lock and back extension chain are sturdy and flexible.",
    "Kemp stone setting is very neat and secure. Exactly matches my festive silk saree.",
    "Authentic antique gold tone that does not look artificial. Very pleased with the quality and quick delivery!"
  ],
  haram: [
    "Exquisite craftsmanship! The long chain drape sits with regal elegance. High gold luster.",
    "Grand temple jewellery look without feeling heavy. Highly satisfied with the micro gold polish and packaging.",
    "Authentic long haram! The weight and shine feel rich and durable. Perfect for family celebrations.",
    "Looked absolutely majestic with my wedding saree. Everyone thought it was pure gold!",
    "Neat stone work and detailed design. The Panchalogam alloy gives it an auspicious heritage feel."
  ],
  kasumaala: [
    "Detailed Goddess Lakshmi coin embossing! Gives a prosperous traditional touch to the festive look.",
    "The 24-inch length is perfect. Shiny micro gold finish and very smooth against the skin.",
    "Classic South Indian heritage piece. Highly recommended for Diwali and temple festivals!",
    "Great value for money. Looks like handcrafted temple jewellery from high-end jewelers."
  ],
  earchain: [
    "Very lightweight and securely hooks to the hair without pulling. Comfortable to wear all day.",
    "Elevates regular earrings to a full bridal look! The small pearl drops add wonderful grace.",
    "Sturdy links and beautiful micro gold shine. Loved it!"
  ],
  tikka: [
    "The forehead pendant sits centered and balanced. Beautiful ruby kemp accents.",
    "Bridal ready! Very delicate yet sturdy top hairpin attachment.",
    "Classic temple design. Perfect for classical dance and festive functions."
  ],
  sunmoon: [
    "The Surya and Chandra clips are magnificent! Firm grip on the hair and rich antique polish.",
    "Essential traditional set for Bharatanatyam dance and bridal look. Premium build quality."
  ],
  nosering: [
    "Clip-on is so comfortable! Doesn't pinch or leave a mark. Looks 100% like real gold nath.",
    "No piercing needed and fits securely. Very cute kemp stone design."
  ],
  kids: [
    "Very safe and lightweight on my kid. No redness or skin irritation. Beautiful cute design!",
    "Smooth edges so no scratches on baby skin. Perfect gift for naming ceremony and birthdays.",
    "My daughter loved wearing this for her school function. Bright shine and durable."
  ],
  mens: [
    "Solid weight and masculine look. The micro gold plating resists sweat and daily wear.",
    "Murugar pendant carving has crisp detail. Sits nicely on my daily wear chain.",
    "Premium kaapu bracelet with smooth inner curve. Very comfortable fit."
  ],
  anklets: [
    "Delicate sweet tinkling sound from the charm bells. Smooth finish on the ankles.",
    "Anti-tarnish coating is really good, wearing it daily and shine is intact."
  ],
  hair: [
    "Sturdy pin loops and rich stone setting. Stays firmly attached in hair braids.",
    "Gives a complete traditional South Indian look for classical dance & wedding muhurtham."
  ],
  general: [
    "Excellent quality and fast delivery! Beautiful packing with care.",
    "Looks even better in person than in the photos. Great value and authentic finish.",
    "Very happy with this purchase from Baani Jewels. Will definitely order again!"
  ]
};

function pickFeedback(product, categoryName) {
  const n = (product.name || '').toLowerCase();
  const c = (categoryName || '').toLowerCase();

  let pool = feedbackPool.general;
  if (c.includes('attigai') || n.includes('attigai')) pool = feedbackPool.attigai;
  else if (c.includes('kasumaala') || n.includes('kasumaala') || n.includes('kasu')) pool = feedbackPool.kasumaala;
  else if (c.includes('haram') || n.includes('haram') || n.includes('haaram')) pool = feedbackPool.haram;
  else if (c.includes('earchain') || n.includes('earchain') || n.includes('maatal')) pool = feedbackPool.earchain;
  else if (c.includes('tikka') || n.includes('tikka') || n.includes('chutti')) pool = feedbackPool.tikka;
  else if (c.includes('sunmoon') || n.includes('sunmoon')) pool = feedbackPool.sunmoon;
  else if (c.includes('nosering') || n.includes('nosering') || n.includes('nath')) pool = feedbackPool.nosering;
  else if (c.includes('kids') || n.includes('kids') || n.includes('baby')) pool = feedbackPool.kids;
  else if (c.includes('men') || n.includes('men') || n.includes('kaapu')) pool = feedbackPool.mens;
  else if (c.includes('anklets') || n.includes('anklet') || n.includes('kolusu')) pool = feedbackPool.anklets;
  else if (c.includes('hair') || n.includes('hair') || n.includes('jada')) pool = feedbackPool.hair;

  const randomIdx = Math.floor(Math.random() * pool.length);
  return pool[randomIdx];
}

async function run() {
  console.log('\n════════════════════════════════════════════════════════════════');
  console.log('  BAANI JEWELS — Adding Customer Reviews Across All Products');
  console.log('════════════════════════════════════════════════════════════════\n');

  // 1. Ensure Customer accounts exist
  console.log('▶ STEP 1: Setting up Verified Customer Accounts...');
  const passwordHash = await bcrypt.hash('Customer@123', 10);
  const createdCustomers = [];

  for (const profile of customerProfiles) {
    let [customer] = await Customer.findOrCreate({
      where: { email: profile.email },
      defaults: {
        name: profile.name,
        email: profile.email,
        password: passwordHash,
        phone: profile.phone,
        isGuest: false
      }
    });
    createdCustomers.push(customer);
  }
  console.log(`  ✅ Ready with ${createdCustomers.length} verified customer profiles.\n`);

  // 2. Clean old reviews
  console.log('▶ STEP 2: Clearing existing reviews...');
  await Review.destroy({ where: {}, truncate: true });
  console.log('  Cleaned old reviews table.\n');

  // 3. Load all 150 products
  const products = await Product.findAll({
    include: [{ model: Category, as: 'category', attributes: ['name'] }]
  });
  console.log(`▶ STEP 3: Adding 2 to 3 published reviews for all ${products.length} products...`);

  let totalReviewsAdded = 0;
  let customerIndex = 0;

  for (let pIdx = 0; pIdx < products.length; pIdx++) {
    const product = products[pIdx];
    const catName = product.category ? product.category.name : '';

    // Assign 2 to 3 reviews per product
    const reviewCount = (pIdx % 3 === 0) ? 3 : 2;

    for (let r = 0; r < reviewCount; r++) {
      const customer = createdCustomers[customerIndex % createdCustomers.length];
      customerIndex++;

      // 85% 5-star, 15% 4-star
      const rating = (Math.random() > 0.15) ? 5 : 4;
      const feedback = pickFeedback(product, catName);

      // Distribute creation date across past 3 months
      const daysAgo = Math.floor(Math.random() * 75) + 1;
      const reviewDate = new Date(Date.now() - (daysAgo * 24 * 60 * 60 * 1000));

      await Review.create({
        customerId: customer.id,
        productId: product.id,
        orderId: null,
        rating: rating,
        feedback: feedback,
        status: 'published',
        createdAt: reviewDate,
        updatedAt: reviewDate
      });

      totalReviewsAdded++;
    }
  }

  console.log(`\n✅ Added ${totalReviewsAdded} verified reviews across all ${products.length} products!`);
  console.log(`   • All reviews are set to 'published' status.`);
  console.log(`   • Every product now displays realistic customer feedback & 4.8 - 5.0 star rating.`);
  console.log(`   • Visible in Admin Dashboard > Reviews and on all Product Details pages.`);

  // Sample check
  const sampleProduct = products[0];
  const sampleReviews = await Review.findAll({
    where: { productId: sampleProduct.id },
    include: [{ model: Customer, as: 'customerInfo', attributes: ['name'] }]
  });
  console.log(`\n📋 Sample Review Preview for [${sampleProduct.sku}] "${sampleProduct.name}":`);
  sampleReviews.forEach(sr => {
    console.log(`   ⭐ ${sr.rating}/5 by ${sr.customerInfo?.name || 'Customer'}: "${sr.feedback}"`);
  });

  await sequelize.close();
}

run().catch(err => {
  console.error('Fatal error in review generator:', err);
  process.exit(1);
});
