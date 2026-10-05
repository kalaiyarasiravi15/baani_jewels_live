const { sequelize, Product, Category, ProductSpecification } = require('../models');

function generateSpecifications(product, categoryName) {
  const name = (product.name || '').toLowerCase();
  const desc = (product.description || '').toLowerCase();
  const cat  = (categoryName || '').toLowerCase();

  const specs = [];

  // 1. Material & Metal Base
  if (name.includes('panchalogam') || name.includes('impon') || desc.includes('panchalogam') || desc.includes('impon') || cat.includes('impon')) {
    specs.push({
      heading: 'Base Metal & Composition',
      description: 'Authentic Impon (Five-Metal Panchalogam alloy) renowned for traditional longevity and auspicious wellness.'
    });
  } else if (cat.includes('kids') || name.includes('kids') || name.includes('baby') || name.includes('boys')) {
    specs.push({
      heading: 'Base Metal & Safety',
      description: 'High-grade skin-safe copper & brass alloy, 100% lead-free and nickel-free designed for delicate skin.'
    });
  } else if (cat.includes('men') || name.includes('men') || name.includes('kaapu')) {
    specs.push({
      heading: 'Base Metal & Build',
      description: 'Sturdy high-density brass & copper alloy crafted for durable everyday wear and masculine style.'
    });
  } else {
    specs.push({
      heading: 'Base Metal & Material',
      description: 'Premium jeweler-grade brass alloy with high tensile strength and precision casting.'
    });
  }

  // 2. Plating & Polish
  if (name.includes('1gram') || name.includes('1 gram')) {
    specs.push({
      heading: 'Plating & Finish',
      description: '1-Gram Gold Micron Electroplating with high-gloss mirror finish mimicking 22kt pure gold.'
    });
  } else if (name.includes('micro') || name.includes('microplated') || desc.includes('microplated')) {
    specs.push({
      heading: 'Plating & Finish',
      description: 'Advanced Micro Gold Plating with long-lasting lacquer coating to resist tarnish and color fade.'
    });
  } else if (name.includes('antique') || name.includes('vintage') || desc.includes('vintage')) {
    specs.push({
      heading: 'Plating & Finish',
      description: 'Traditional Heritage Matte Gold Finish with subtle antique oxidized accents for an authentic vintage royal look.'
    });
  } else {
    specs.push({
      heading: 'Plating & Finish',
      description: 'Dual-layer rich 24K Micro Gold Plating with protective anti-tarnish protective lacquer.'
    });
  }

  // 3. Stones & Embellishments
  if (name.includes('kemp') || name.includes('ruby') || name.includes('red stone')) {
    specs.push({
      heading: 'Stones & Craftsmanship',
      description: 'Hand-set faceted synthetic Kemp & Ruby stones with traditional closed-bezel setting for lasting sparkle.'
    });
  } else if (name.includes('white stone') || name.includes('whitestone') || name.includes('cz')) {
    specs.push({
      heading: 'Stones & Craftsmanship',
      description: 'Precision-cut AAA grade sparkling White Cubic Zirconia stones with high refractive brilliance.'
    });
  } else if (name.includes('multistone') || name.includes('multi')) {
    specs.push({
      heading: 'Stones & Craftsmanship',
      description: 'Vibrant multi-color festive stones (Ruby red, Emerald green, and Diamond white) hand-mounted with care.'
    });
  } else if (name.includes('pearl') || name.includes('muthu')) {
    specs.push({
      heading: 'Stones & Pearls',
      description: 'Natural finish lustrous faux pearls and stone cluster drops for a graceful royal elegance.'
    });
  } else if (name.includes('lakshmi') || name.includes('coin') || name.includes('kasu')) {
    specs.push({
      heading: 'Motif & Carving',
      description: 'Embossed Goddess Lakshmi coin motifs symbolizing prosperity, fine detailed South Indian temple artistry.'
    });
  } else if (name.includes('swan') || name.includes('peacock') || name.includes('lotus') || name.includes('butterfly')) {
    specs.push({
      heading: 'Design & Motif',
      description: 'Artisanal hand-carved ethnic motifs inspired by traditional Dravidian temple architecture.'
    });
  } else {
    specs.push({
      heading: 'Design & Style',
      description: 'Classic South Indian traditional heritage aesthetic tailored for weddings, festivals, and cultural events.'
    });
  }

  // 4. Fit & Dimensions / Closure
  if (cat.includes('harams') || cat.includes('haram') || name.includes('haram') || name.includes('haaram') || name.includes('kasumaala')) {
    specs.push({
      heading: 'Dimensions & Closure',
      description: 'Long chain drape (approx 22-26 inches) with adjustable link chain / braided dori rope for customizable neck drop.'
    });
  } else if (cat.includes('attigai') || name.includes('attigai')) {
    specs.push({
      heading: 'Dimensions & Fit',
      description: 'Close-neck choker / collar fit with soft flexible link joints and adjustable back extension chain.'
    });
  } else if (cat.includes('earchain') || name.includes('earchain') || name.includes('maatal')) {
    specs.push({
      heading: 'Fit & Attachment',
      description: 'Lightweight ear-to-hair extension with secure top hair-hook and bottom earring connector loop.'
    });
  } else if (cat.includes('tikka') || name.includes('tikka') || name.includes('chutti')) {
    specs.push({
      heading: 'Dimensions & Attachment',
      description: 'Comfortable forehead central pendant drop with secure top hairpin hook.'
    });
  } else if (cat.includes('nosering') || name.includes('nosering') || name.includes('nath')) {
    specs.push({
      heading: 'Fit & Wear Type',
      description: 'Press-on clip style — comfortable to wear with zero piercing required.'
    });
  } else if (cat.includes('anklets') || name.includes('anklet') || name.includes('kolusu')) {
    specs.push({
      heading: 'Length & Clasp',
      description: 'Standard 10-10.5 inch length with secure S-hook clasp and subtle tinkling charm bells.'
    });
  } else if (cat.includes('hair') || name.includes('hair') || name.includes('jada') || name.includes('pin')) {
    specs.push({
      heading: 'Attachment Type',
      description: 'Sturdy hairpin / brooch back loops designed for effortless securing into braids and bridal buns.'
    });
  } else {
    specs.push({
      heading: 'Fit & Usage',
      description: 'Ergonomic comfortable design with adjustable sizing options suitable for extended celebration wear.'
    });
  }

  // 5. Care Instructions (standard 5th spec)
  specs.push({
    heading: 'Care & Maintenance',
    description: 'Keep away from direct perfumes, moisture, and chemicals. Gently wipe with dry cotton cloth after use and store in an airtight box.'
  });

  return specs;
}

async function run() {
  console.log('\n════════════════════════════════════════════════════════════════');
  console.log('  BAANI JEWELS — Adding Specifications to All 150 Products');
  console.log('════════════════════════════════════════════════════════════════\n');

  // Clear existing specifications
  await ProductSpecification.destroy({ where: {}, truncate: true });
  console.log('  Cleaned old specifications table.');

  const products = await Product.findAll({
    include: [{ model: Category, as: 'category', attributes: ['name'] }]
  });

  console.log(`  Processing ${products.length} products...\n`);

  let totalSpecsAdded = 0;
  for (const p of products) {
    const catName = p.category ? p.category.name : '';
    const specsList = generateSpecifications(p, catName);

    for (let i = 0; i < specsList.length; i++) {
      await ProductSpecification.create({
        productId: p.id,
        heading: specsList[i].heading,
        description: specsList[i].description,
        sortOrder: i + 1
      });
      totalSpecsAdded++;
    }
  }

  console.log(`✅ Successfully added ${totalSpecsAdded} specification entries across ${products.length} products!`);
  console.log(`   (Each product now has 4-5 structured specifications meeting admin & PDP requirements)`);

  // Sample check
  const sampleProduct = products[0];
  const sampleSpecs = await ProductSpecification.findAll({ where: { productId: sampleProduct.id } });
  console.log(`\n📋 Sample Preview for [${sampleProduct.sku}] "${sampleProduct.name}":`);
  sampleSpecs.forEach(s => console.log(`   • ${s.heading}: ${s.description}`));

  await sequelize.close();
}

run().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
