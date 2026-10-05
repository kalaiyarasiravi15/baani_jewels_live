// Helper to generate clean URL-friendly slugs for collections and products

export const slugify = (text) => {
  if (!text) return '';
  return String(text)
    .toLowerCase()
    .trim()
    .replace(/['"]/g, '') // remove quotes like Men's -> Mens
    .replace(/[^\w\s-]/g, '') // remove remaining non-alphanumeric except space and hyphen
    .replace(/\s+/g, '-') // spaces to hyphens
    .replace(/-+/g, '-'); // collapse multiple hyphens
};

export const getCollectionSlug = (col) => {
  if (!col) return '';
  if (col.slug && typeof col.slug === 'string' && col.slug.trim()) {
    return col.slug.trim();
  }
  return slugify(col.name || `collection-${col.id}`);
};
