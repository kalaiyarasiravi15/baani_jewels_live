const { Product, sequelize } = require('../models');

function generateSlug(name) {
  return (name || 'product')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

async function updateSlugsToCleanNames() {
  try {
    const products = await Product.findAll({ order: [['id', 'ASC']] });
    console.log(`Updating clean slugs for ${products.length} products...`);

    const usedSlugs = new Set();
    let updatedCount = 0;

    for (const p of products) {
      const base = generateSlug(p.name);
      let slug = base;
      let counter = 2;
      while (usedSlugs.has(slug)) {
        slug = `${base}-${counter++}`;
      }
      usedSlugs.add(slug);

      await p.update({ slug });
      updatedCount++;

      if (p.id === 132 || p.id <= 5) {
        console.log(`Product ID ${p.id} ("${p.name}") -> Slug: "${slug}"`);
      }
    }

    console.log(`Successfully updated ${updatedCount} products with clean product name slugs.`);
  } catch (err) {
    console.error('Error updating slugs:', err);
  } finally {
    process.exit(0);
  }
}

updateSlugsToCleanNames();
