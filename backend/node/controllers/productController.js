const {
    Product, ProductVariant, ProductSpecification, Thumbnail,
    Category, HomeCollection, BestSeller, TrendingProduct, NewArrival, TopRatedProduct,
    OrderSlot, Review, Cart, Wishlist, sequelize
} = require('../models');
const { updateProductCollections } = require('./collectionController');
const { Op } = require('sequelize');
const fs   = require('fs');
const path = require('path');
const { getActiveDiscountContext, formatProductWithDiscounts } = require('../utils/priceHelper');
const { calculateGstPrice } = require('../utils/gstHelper');
const XLSX = require('xlsx');


const generateSlug = (name) => {
    return (name || 'product')
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
};

const parseOptionalField = (val) => {
    if (val === undefined || val === null || val === '' || val === 'null' || val === 'undefined') {
        return null;
    }
    return val;
};

const parseVariants = (value) => {
    if (!value) return [];
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
    if (!Array.isArray(parsed)) throw new Error('Variants must be a list.');
    if (parsed.length > 30) throw new Error('A product can have at most 30 variants.');
    return parsed.map((variant, index) => {
        const variantType = String(variant.variantType || variant.optionKind || variant.type || '').trim();
        const variantValue = String(variant.variantValue || variant.value || '').trim();
        const mrpPrice = Number(variant.mrpPrice);
        const salesPrice = Number(variant.salesPrice);
        const stock = Number(variant.stock !== undefined && variant.stock !== '' ? variant.stock : 0);
        if (!variantType) throw new Error(`Variant ${index + 1} needs an option type.`);
        if (!variantValue) throw new Error(`Variant ${index + 1} needs an option value.`);
        if (!Number.isFinite(mrpPrice) || mrpPrice <= 0) throw new Error(`Variant ${index + 1} has an invalid MRP.`);
        if (!Number.isFinite(salesPrice) || salesPrice <= 0 || salesPrice > mrpPrice) throw new Error(`Variant ${index + 1} has an invalid selling price.`);
        if (!Number.isInteger(stock) || stock < 0) throw new Error(`Variant ${index + 1} stock must be zero or greater.`);
        return { variantType, variantValue, mrpPrice, salesPrice, stock, status: variant.status !== false };
    });
};

const makeUniqueSlug = async (baseName, excludeId = null) => {
    const base = generateSlug(baseName);
    let slug = base;
    let counter = 2;
    while (true) {
        const where = { slug };
        if (excludeId) where.id = { [Op.ne]: excludeId };
        const existing = await Product.findOne({ where, paranoid: false });
        if (!existing) return slug;
        slug = `${base}-${counter}`;
        counter++;
    }
};

const normalizeHeader = key => String(key || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
const normalizeRow = row => Object.fromEntries(Object.entries(row).map(([key, value]) => [normalizeHeader(key), value]));
const toBoolean = value => ['true', 'yes', '1'].includes(String(value).trim().toLowerCase());

const validateBulkRows = async rows => {
    const categories = await Category.findAll({ attributes: ['id', 'name'] });
    const collections = await HomeCollection.findAll({ attributes: ['id', 'name'] });
    const categoryByName = new Map(categories.map(c => [String(c.name).trim().toLowerCase(), c.id]));
    const collectionByName = new Map(collections.map(c => [String(c.name).trim().toLowerCase(), c.id]));
    const seenNames = new Set();
    return rows.map((raw, index) => {
        const row = normalizeRow(raw);
        const name = String(row.name || '').trim();
        const categoryValue = String(row.category || row.categoryid || '').trim();
        const categoryId = /^\d+$/.test(categoryValue) ? Number(categoryValue) : categoryByName.get(categoryValue.toLowerCase());
        const collectionValue = String(row.collection || row.collectionid || '').trim();
        const collectionId = !collectionValue ? null : (/^\d+$/.test(collectionValue) ? Number(collectionValue) : collectionByName.get(collectionValue.toLowerCase()));
        const mrpPrice = Number(row.mrpprice);
        const salesPrice = Number(row.salesprice);
        const stock = Number(row.stock);
        const errors = [];
        if (!name) errors.push('Name is required');
        if (name && seenNames.has(name.toLowerCase())) errors.push('Duplicate name in uploaded file');
        seenNames.add(name.toLowerCase());
        if (!categoryId) errors.push('Category must match an existing category name or ID');
        if (!Number.isFinite(mrpPrice) || mrpPrice < 0) errors.push('MRP price must be a valid non-negative number');
        if (!Number.isFinite(salesPrice) || salesPrice < 0) errors.push('Sales price must be a valid non-negative number');
        if (Number.isFinite(mrpPrice) && Number.isFinite(salesPrice) && salesPrice > mrpPrice) errors.push('Sales price cannot exceed MRP price');
        if (!Number.isInteger(stock) || stock < 0) errors.push('Stock must be a whole non-negative number');
        if (collectionValue && !collectionId) errors.push('Collection must match an existing collection name or ID');
        return { rowNumber: index + 2, raw, valid: errors.length === 0, errors, product: { name, description: String(row.description || '').trim(), categoryId, collectionId, mrpPrice, salesPrice, stock, status: row.status === undefined || row.status === '' ? true : toBoolean(row.status), isBestSeller: toBoolean(row.isbestseller), isTrending: toBoolean(row.istrending), isNewArrival: toBoolean(row.isnewarrival), isTopRated: toBoolean(row.istoprated) } };
    });
};

exports.previewBulkProducts = async (req, res) => {
    try {
        if (!req.file?.buffer) return res.status(400).json({ success: false, error: 'Select an Excel or CSV file.' });
        const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
        if (!rows.length) return res.status(400).json({ success: false, error: 'The uploaded file has no product rows.' });
        if (rows.length > 500) return res.status(400).json({ success: false, error: 'Maximum 500 products per upload.' });
        const preview = await validateBulkRows(rows);
        res.json({ success: true, rows: preview, summary: { total: preview.length, valid: preview.filter(r => r.valid).length, invalid: preview.filter(r => !r.valid).length } });
    } catch (error) { res.status(400).json({ success: false, error: `Unable to read bulk upload: ${error.message}` }); }
};

exports.importBulkProducts = async (req, res) => {
    const rows = Array.isArray(req.body?.rows) ? req.body.rows : [];
    if (!rows.length || rows.some(row => !row.valid || !row.product)) return res.status(400).json({ success: false, error: 'Preview valid rows before importing.' });
    const transaction = await sequelize.transaction();
    try {
        const created = [];
        for (const row of rows) {
            const product = await Product.create({ ...row.product, slug: await makeUniqueSlug(row.product.name) }, { transaction });
            await updateProductCollections(product.id, row.product, transaction);
            created.push({ id: product.id, name: product.name });
        }
        await transaction.commit();
        res.status(201).json({ success: true, message: `${created.length} products imported.`, products: created });
    } catch (error) { await transaction.rollback(); res.status(500).json({ success: false, error: `Import failed; no products were added: ${error.message}` }); }
};

/* ─── shared include array (single product detail) ─── */
const fullInclude = [
    { model: Category,        as: 'category',   attributes: ['id', 'name'] },
    { model: HomeCollection,  as: 'collection', attributes: ['id', 'name'] },
    { model: ProductVariant,  as: 'variants' },
    { model: Thumbnail,       as: 'thumbnails', attributes: ['id', 'image'] },
    { model: ProductSpecification, as: 'specifications', attributes: ['id', 'heading', 'description', 'sortOrder'] },
    { model: BestSeller,      as: 'bestSeller', attributes: ['id'] },
    { model: TrendingProduct, as: 'trending',   attributes: ['id'] },
    { model: NewArrival,      as: 'newArrival', attributes: ['id'] },
    { model: TopRatedProduct, as: 'topRated',   attributes: ['id'] },
    { model: Review,          as: 'reviews',    attributes: ['id', 'rating', 'status'] },
];

/* ─── lean include for list views (skips variants/specs/thumbnails for speed) ─── */
const listInclude = [
    { model: Category,        as: 'category',   attributes: ['id', 'name'] },
    { model: HomeCollection,  as: 'collection', attributes: ['id', 'name'] },
    { model: BestSeller,      as: 'bestSeller', attributes: ['id'] },
    { model: TrendingProduct, as: 'trending',   attributes: ['id'] },
    { model: NewArrival,      as: 'newArrival', attributes: ['id'] },
    { model: TopRatedProduct, as: 'topRated',   attributes: ['id'] },
    { model: Review,          as: 'reviews',    attributes: ['id', 'rating', 'status'] },
];

const formatProduct = (p, isAdmin = false) => {
    let variants = p.variants || [];
    if (!isAdmin) {
        variants = variants.filter(v => v.status !== false);
    }

    const inventoryVariants = variants.filter(v => v.variantType && v.variantValue);
    const totalStock = inventoryVariants.length > 0
        ? inventoryVariants.reduce((sum, v) => sum + Number(v.stock || 0), 0)
        : Number(p.stock || 0);

    const totalSalesStock = inventoryVariants.length > 0
        ? inventoryVariants.reduce((sum, v) => sum + Number(v.salesStock || 0), 0)
        : Number(p.salesStock || 0);

    variants = variants.map(v => {
        let parsedThumbs = [];
        try {
            parsedThumbs = typeof v.thumbnails === 'string' ? JSON.parse(v.thumbnails) : (v.thumbnails || []);
        } catch (err) { parsedThumbs = []; }

        let parsedSpecs = [];
        try {
            parsedSpecs = typeof v.specifications === 'string' ? JSON.parse(v.specifications) : (v.specifications || []);
        } catch (err) { parsedSpecs = []; }

        let parsedSubOptions = [];
        try {
            parsedSubOptions = typeof v.subOptions === 'string' ? JSON.parse(v.subOptions) : (v.subOptions || []);
        } catch (err) { parsedSubOptions = []; }

        return {
            ...v,
            mrpPrice:   v.mrpPrice   !== null ? Number(v.mrpPrice)   : null,
            salesPrice: v.salesPrice !== null ? Number(v.salesPrice) : null,
            stock:      Number(v.stock || 0),
            salesStock: Number(v.salesStock || 0),
            thumbnails: parsedThumbs,
            specifications: parsedSpecs,
            subOptions: parsedSubOptions
        };
    });

    const specifications = (p.specifications || []).sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

    const publishedReviews = (p.reviews || []).filter(r => r.status === 'published');
    const reviewCount = publishedReviews.length;
    const averageRating = reviewCount > 0
        ? Number((publishedReviews.reduce((sum, r) => sum + Number(r.rating || 0), 0) / reviewCount).toFixed(1))
        : 0;

    return {
        ...p,
        mrpPrice:     p.mrpPrice   !== null ? Number(p.mrpPrice)   : null,
        salesPrice:   p.salesPrice !== null ? Number(p.salesPrice) : null,
        stock:        p.stock      !== null ? Number(p.stock)      : 0,
        preBookingQty: p.preBookingQty !== null && p.preBookingQty !== undefined ? Number(p.preBookingQty) : 0,
        salesStock:   p.salesStock !== null ? Number(p.salesStock) : 0,
        thumbVideo:   p.thumbVideo || null,
        variants,
        specifications,
        totalStock,
        totalSalesStock,
        status:       p.status !== undefined ? p.status : true,
        isBestSeller: !!p.bestSeller,
        isTrending:   !!p.trending,
        isNewArrival: !!p.newArrival,
        isTopRated:   !!p.topRated,
        averageRating,
        reviewCount,
    };
};

const formatSingle = (p, isAdmin = false) => {
    const base = formatProduct(p, isAdmin);
    return {
        ...base,
        slug: p.slug || generateSlug(p.name),
    };
};


// --- 1. GET ALL PRODUCTS ---
exports.getAllProducts = async (req, res) => {
    try {
        const isAdmin = Boolean(req.adminId);
        const page = parseInt(req.query.page, 10);
        const limit = Math.min(parseInt(req.query.limit, 10) || 12, 100);

        const where = {};
        if (!isAdmin) {
            where.status = true;
        }

        // Category filter
        if (req.query.categoryId) {
            where.categoryId = Number(req.query.categoryId);
        } else if (req.query.category && req.query.category !== 'All Categories' && req.query.category !== 'all') {
            if (/^\d+$/.test(req.query.category)) {
                where.categoryId = Number(req.query.category);
            } else {
                const cat = await Category.findOne({ where: { name: req.query.category } });
                where.categoryId = cat ? cat.id : -1;
            }
        }

        // Includes copy so we can make specific joins required if needed
        let currentInclude = listInclude.map(inc => ({ ...inc }));

        if (req.query.includeVariants === 'true' || req.headers['x-admin-request'] === 'true') {
            currentInclude.push({
                model: ProductVariant,
                as: 'variants',
                attributes: ['id', 'variantType', 'variantValue', 'stock', 'salesStock', 'mrpPrice', 'salesPrice', 'status']
            });
        }

        // Collection filter
        if (req.query.collectionId) {
            where.collectionId = Number(req.query.collectionId);
        } else if (req.query.collection && req.query.collection !== 'all') {
            const col = String(req.query.collection).toLowerCase().trim();
            if (col === 'best-sellers' || col === 'bestsellers' || col === 'best-seller') {
                currentInclude = currentInclude.map(inc => inc.as === 'bestSeller' ? { ...inc, required: true } : inc);
            } else if (col === 'new-arrivals' || col === 'newarrivals' || col === 'new-arrival') {
                currentInclude = currentInclude.map(inc => inc.as === 'newArrival' ? { ...inc, required: true } : inc);
            } else if (col === 'top-rated' || col === 'toprated') {
                currentInclude = currentInclude.map(inc => inc.as === 'topRated' ? { ...inc, required: true } : inc);
            } else if (col === 'trending' || col === 'trending-now') {
                currentInclude = currentInclude.map(inc => inc.as === 'trending' ? { ...inc, required: true } : inc);
            } else if (/^\d+$/.test(col)) {
                where.collectionId = Number(col);
            } else {
                const hc = await HomeCollection.findOne({
                    where: {
                        [Op.or]: [
                            { name: req.query.collection },
                            sequelize.where(sequelize.fn('LOWER', sequelize.col('name')), col)
                        ]
                    }
                });
                where.collectionId = hc ? hc.id : -1;
            }
        }

        // Search query filter (matches name, SKU, description, category name, numeric ID, collection name, or variant)
        if (req.query.search && req.query.search.trim()) {
            const rawSearch = req.query.search.trim();
            const s = `%${rawSearch}%`;

            // 1. Category name matches
            const matchingCats = await Category.findAll({
                where: { name: { [Op.like]: s } },
                attributes: ['id']
            });
            const catIds = matchingCats.map(c => c.id);

            // 2. Home collection name matches
            const matchingCols = await HomeCollection.findAll({
                where: { name: { [Op.like]: s } },
                attributes: ['id']
            });
            const colIds = matchingCols.map(c => c.id);

            // 3. Variant value / type matches
            const matchingVariants = await ProductVariant.findAll({
                where: {
                    [Op.or]: [
                        { variantValue: { [Op.like]: s } },
                        { variantType: { [Op.like]: s } }
                    ]
                },
                attributes: ['productId']
            });
            const variantProdIds = [...new Set(matchingVariants.map(v => v.productId))];

            const orConditions = [
                { name: { [Op.like]: s } },
                { sku: { [Op.like]: s } },
                { description: { [Op.like]: s } }
            ];

            // If query is or contains digits, also match product id
            const numMatch = rawSearch.match(/\d+/);
            if (numMatch) {
                const numericId = parseInt(numMatch[0], 10);
                if (!isNaN(numericId)) {
                    orConditions.push({ id: numericId });
                }
            }

            if (catIds.length > 0) {
                orConditions.push({ categoryId: { [Op.in]: catIds } });
            }
            if (colIds.length > 0) {
                orConditions.push({ collectionId: { [Op.in]: colIds } });
            }
            if (variantProdIds.length > 0) {
                orConditions.push({ id: { [Op.in]: variantProdIds } });
            }

            where[Op.or] = orConditions;
        }

        // Stock filter (admin dashboard)
        if (req.query.filter) {
            const f = String(req.query.filter).toLowerCase().trim();
            if (f === 'outofstock') {
                where.stock = { [Op.lte]: 0 };
            } else if (f === 'lowstock') {
                where.stock = { [Op.gt]: 0, [Op.lte]: 10 };
            } else if (f === 'instock') {
                where.stock = { [Op.gt]: 10 };
            }
        }

        // Sorting
        let order = [['createdAt', 'DESC']];
        if (req.query.sort === 'price-low') {
            order = [['salesPrice', 'ASC'], ['mrpPrice', 'ASC']];
        } else if (req.query.sort === 'price-high') {
            order = [['salesPrice', 'DESC'], ['mrpPrice', 'DESC']];
        }

        const query = {
            where,
            include: currentInclude,
            order
        };

        // Server-side pagination for ALL callers (admin and frontend)
        if (page) {
            query.limit = limit;
            query.offset = (page - 1) * limit;
            query.distinct = true; // prevent double-counting with LEFT JOINs
            const { count, rows } = await Product.findAndCountAll(query);
            const formatted = isAdmin
                ? rows.map(p => formatProduct(p.toJSON(), true))
                : await Promise.resolve().then(async () => {
                    const context = await getActiveDiscountContext(req.query.audience);
                    return rows.map(p => formatProductWithDiscounts(formatProduct(p.toJSON(), false), context));
                });
            return res.status(200).json({
                products: formatted,
                totalProducts: count,
                totalPages: Math.ceil(count / limit),
                currentPage: page
            });
        }

        // No page param → return all (admin bulk fetch or small catalogs)
        const products = await Product.findAll(query);
        if (isAdmin) {
            return res.status(200).json(products.map(p => formatProduct(p.toJSON(), true)));
        }
        const context = await getActiveDiscountContext(req.query.audience);
        res.status(200).json(products.map(p => {
            const base = formatProduct(p.toJSON(), false);
            return formatProductWithDiscounts(base, context);
        }));
    } catch (e) {
        console.error('Error fetching products:', e);
        res.status(500).json({ error: 'Failed to fetch products' });
    }
};

// --- 2. GET SINGLE PRODUCT BY ID ---
exports.getProductById = async (req, res) => {
    try {
        const identifier = req.params.id;
        let product = null;

        if (/^\d+$/.test(identifier)) {
            product = await Product.findByPk(identifier, { include: fullInclude });
        }
        if (!product) {
            product = await Product.findOne({
                where: { slug: identifier },
                include: fullInclude
            });
        }
        if (!product) {
            const allProducts = await Product.findAll({ include: fullInclude });
            product = allProducts.find(p => 
                (p.slug && p.slug.toLowerCase() === identifier.toLowerCase()) ||
                generateSlug(p.name) === identifier.toLowerCase() ||
                p.name.toLowerCase() === identifier.toLowerCase()
            ) || null;
        }

        if (!product) return res.status(404).json({ message: 'Product Not Found' });
        const isAdmin = Boolean(req.adminId);
        const base = formatSingle(product.toJSON(), isAdmin);
        if (!isAdmin && base.status === false) {
            return res.status(404).json({ message: 'Product Not Found' });
        }
        if (isAdmin) {
            return res.status(200).json(base);
        }
        const context = await getActiveDiscountContext(req.query.audience);
        res.status(200).json(formatProductWithDiscounts(base, context));
    } catch (e) {
        res.status(500).json({ success: false, error: e.message, details: e.errors ? e.errors.map(err => err.message) : (e.stack || e) });
    }
};

exports.getProductBySlug = async (req, res) => {
    try {
        const { slug } = req.params;

        // First: try exact slug match (normal case)
        let product = await Product.findOne({
            where: { slug },
            include: fullInclude
        });

        if (!product) {
            const allProducts = await Product.findAll({
                where: { slug: null },
                include: fullInclude
            });
            product = allProducts.find(p => generateSlug(p.name) === slug) || null;
        }

        if (!product) return res.status(404).json({ message: 'Product Not Found' });

        const isAdmin = Boolean(req.adminId);
        const formatted = formatSingle(product.toJSON(), isAdmin);

        if (!isAdmin && formatted.status === false) {
            return res.status(404).json({ message: 'Product Not Found' });
        }

        if (!product.slug) {
            await product.update({ slug: formatted.slug }).catch(() => {});
        }

        if (isAdmin) {
            return res.status(200).json(formatted);
        }

        const context = await getActiveDiscountContext(req.query.audience);
        res.status(200).json(formatProductWithDiscounts(formatted, context));
    } catch (e) {
        res.status(500).json({ success: false, error: e.message, details: e.errors ? e.errors.map(err => err.message) : (e.stack || e) });
    }
};

// --- 3. CREATE PRODUCT ---
exports.createProduct = async (req, res) => {
    try {
        const {
            name, description, categoryId, collectionId, mrpPrice, salesPrice, stock, preBookingQty, status,
            showVariants, variants, specifications,
            isBestSeller, isTrending, isNewArrival, isTopRated
        } = req.body || {};

        if (!name || !name.trim()) {
            return res.status(400).json({ success: false, error: 'Product name is required.' });
        }

        const isVar = showVariants === 'true' || showVariants === true;
        const parsedVariants = isVar ? parseVariants(variants) : [];
        if (isVar && !parsedVariants.length) {
            return res.status(400).json({ success: false, error: 'Add at least one variant or turn variants off.' });
        }

        const mainImageFile = req.files?.find(f => f.fieldname === 'mainImage');
        const mainImage = mainImageFile ? mainImageFile.filename : null;

        const thumbFiles = req.files?.filter(f => f.fieldname === 'thumbnails') || [];
        const thumbVideoFile = req.files?.find(f => f.fieldname === 'thumbVideo');
        const thumbVideo = thumbVideoFile ? thumbVideoFile.filename : null;

        let finalMrp = parseOptionalField(mrpPrice);
        let finalSales = parseOptionalField(salesPrice);
        let finalStock = parseInt(stock, 10);

        if (isVar && parsedVariants.length > 0) {
            // When variants are enabled, use the default variant's prices and sum of stocks
            finalMrp = parsedVariants[0].mrpPrice;
            finalSales = parsedVariants[0].salesPrice;
            finalStock = parsedVariants.reduce((sum, v) => sum + Number(v.stock || 0), 0);
        } else {
            if (isNaN(finalStock) || finalStock < 0) {
                return res.status(400).json({ success: false, error: 'Stock Quantity cannot be negative.' });
            }
        }

        const product = await Product.create({
            name, slug: await makeUniqueSlug(name), description, categoryId, mainImage, thumbVideo,
            collectionId: parseOptionalField(collectionId),
            mrpPrice:   finalMrp,
            salesPrice: finalSales,
            stock:      finalStock,
            preBookingQty: preBookingQty !== undefined && preBookingQty !== null && preBookingQty !== '' ? Math.max(0, parseInt(preBookingQty, 10) || 0) : 0,
            status: status !== undefined ? (status === 'true' || status === true) : true
        });

        // ── Main product thumbnails ──
        const thumbData = thumbFiles.slice(0, 10).map(file => ({
            image: file.filename, productId: product.id
        }));
        await Thumbnail.bulkCreate(thumbData);

        // ── Specifications (min 3 required, max 30) ──
        if (specifications) {
            const parsedSpecs = typeof specifications === 'string' ? JSON.parse(specifications) : specifications;
            if (!Array.isArray(parsedSpecs) || parsedSpecs.length < 3) {
                await product.destroy();
                return res.status(400).json({ success: false, error: 'Please provide at least 3 product specifications.' });
            }
            const specData = parsedSpecs.slice(0, 30).map((f, idx) => ({
                productId:   product.id,
                heading:     f.heading     || null,
                description: f.description || null,
                sortOrder:   f.sortOrder   !== undefined ? f.sortOrder : idx
            }));
            await ProductSpecification.bulkCreate(specData);
        } else {
            await product.destroy();
            return res.status(400).json({ success: false, error: 'Please provide at least 3 product specifications.' });
        }

        // ── Create Variants if enabled ──
        if (parsedVariants.length) {
            await ProductVariant.bulkCreate(parsedVariants.map(variant => ({ ...variant, productId: product.id })));
        }

        await updateProductCollections(product.id, { isBestSeller, isTrending, isNewArrival, isTopRated });

        res.status(201).json({ success: true, message: 'Product Created!', productId: product.id, slug: product.slug });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message, details: e.errors ? e.errors.map(err => err.message) : (e.stack || e) });
    }
};

// --- 4. UPDATE PRODUCT ---
exports.updateProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            name, description, categoryId, collectionId, mrpPrice, salesPrice, stock, status,
            showVariants, variants, specifications, removedThumbIds,
            isBestSeller, isTrending, isNewArrival, isTopRated
        } = req.body;

        const isVar = showVariants === 'true' || showVariants === true;
        const parsedVariants = isVar ? parseVariants(variants) : [];
        if (isVar && !parsedVariants.length) {
            return res.status(400).json({ success: false, error: 'Add at least one variant or turn variants off.' });
        }

        const product = await Product.findByPk(id, {
            include: [{ model: Thumbnail, as: 'thumbnails' }]
        });
        if (!product) return res.status(404).json({ message: 'Product Not Found' });

        // ── Main image ──
        let mainImage = product.mainImage;
        const mainImageFile = req.files?.find(f => f.fieldname === 'mainImage');
        if (mainImageFile) {
            if (product.mainImage) {
                const oldPath = path.join(__dirname, '../uploads', product.mainImage);
                if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
            }
            mainImage = mainImageFile.filename;
        }

        // ── Product Video ──
        let thumbVideo = product.thumbVideo;
        const thumbVideoFile = req.files?.find(f => f.fieldname === 'thumbVideo');
        if (thumbVideoFile) {
            if (product.thumbVideo) {
                const oldPath = path.join(__dirname, '../uploads', product.thumbVideo);
                if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
            }
            thumbVideo = thumbVideoFile.filename;
        } else if (req.body.removeVideo === 'true') {
            if (product.thumbVideo) {
                const oldPath = path.join(__dirname, '../uploads', product.thumbVideo);
                if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
            }
            thumbVideo = null;
        }

        // ── Slug ──
        let slug = product.slug;
        if (name && name !== product.name) {
            slug = await makeUniqueSlug(name, id);
        }
        if (!slug) {
            slug = await makeUniqueSlug(name || product.name, id);
        }

        let finalMrp = mrpPrice !== undefined ? parseOptionalField(mrpPrice) : product.mrpPrice;
        let finalSales = salesPrice !== undefined ? parseOptionalField(salesPrice) : product.salesPrice;
        let finalStock = product.stock;

        if (isVar && parsedVariants.length > 0) {
            finalMrp = parsedVariants[0].mrpPrice;
            finalSales = parsedVariants[0].salesPrice;
            finalStock = parsedVariants.reduce((sum, v) => sum + Number(v.stock || 0), 0);
        } else {
            if (stock !== undefined && stock !== null && stock !== '') {
                const stockNum = parseInt(stock, 10);
                if (isNaN(stockNum) || stockNum < 0) {
                    return res.status(400).json({ success: false, error: 'Stock Quantity cannot be negative.' });
                }
                finalStock = stockNum;
            }
        }

        let preBookingVal = req.body.preBookingQty !== undefined ? parseInt(req.body.preBookingQty, 10) : product.preBookingQty;
        if (isNaN(preBookingVal) || preBookingVal < 0) preBookingVal = 0;

        // Update main product metadata
        await product.update({
            name, slug, description, categoryId, mainImage, thumbVideo,
            collectionId: collectionId !== undefined ? parseOptionalField(collectionId) : product.collectionId,
            mrpPrice:   finalMrp,
            salesPrice: finalSales,
            stock:      finalStock,
            preBookingQty: preBookingVal,
            status: status !== undefined ? (status === 'true' || status === true) : product.status
        });

        // ── Remove main thumbnails ──
        if (removedThumbIds) {
            const ids = typeof removedThumbIds === 'string' ? JSON.parse(removedThumbIds) : removedThumbIds;
            if (Array.isArray(ids) && ids.length > 0) {
                const toDelete = product.thumbnails.filter(t => ids.includes(t.id));
                toDelete.forEach(t => {
                    const p = path.join(__dirname, '../uploads', t.image);
                    if (fs.existsSync(p)) fs.unlinkSync(p);
                });
                await Thumbnail.destroy({ where: { id: ids, productId: id } });
            }
        }

        // ── Add new main thumbnails (max 10 total) ──
        const thumbFiles = req.files?.filter(f => f.fieldname === 'thumbnails') || [];
        if (thumbFiles.length > 0) {
            const currentCount = await Thumbnail.count({ where: { productId: id } });
            const canAdd = Math.max(0, 10 - currentCount);
            if (canAdd > 0) {
                const newThumbs = thumbFiles.slice(0, canAdd).map(file => ({
                    image: file.filename, productId: id
                }));
                await Thumbnail.bulkCreate(newThumbs);
            }
        }

        // ── Specifications (min 3, max 30) — destroy & recreate ──
        if (specifications !== undefined) {
            const parsedSpecs = typeof specifications === 'string' ? JSON.parse(specifications) : specifications;
            if (Array.isArray(parsedSpecs) && parsedSpecs.length >= 3) {
                await ProductSpecification.destroy({ where: { productId: id } });
                const specData = parsedSpecs.slice(0, 30).map((f, idx) => ({
                    productId:   id,
                    heading:     f.heading     || null,
                    description: f.description || null,
                    sortOrder:   f.sortOrder   !== undefined ? f.sortOrder : idx
                }));
                await ProductSpecification.bulkCreate(specData);
            }
        }

        // ── Variants (full replacement) ──
        await ProductVariant.destroy({ where: { productId: product.id }, force: true });
        if (parsedVariants.length) {
            await ProductVariant.bulkCreate(parsedVariants.map(variant => ({ ...variant, productId: product.id })));
        }

        await updateProductCollections(id, { isBestSeller, isTrending, isNewArrival, isTopRated });

        res.status(200).json({ success: true, message: 'Product Updated Successfully!', slug });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message, details: e.errors ? e.errors.map(err => err.message) : (e.stack || e) });
    }
};

// --- 5. GET PRODUCTS BY CATEGORY ---
exports.getProductsByCategory = async (req, res) => {
    try {
        const { categoryId } = req.params;
        const isAdmin = Boolean(req.adminId);
        const query = { where: { categoryId }, include: fullInclude, order: [['createdAt', 'DESC']] };
        if (!isAdmin) query.where.status = true;
        const products = await Product.findAll(query);
        if (isAdmin) return res.status(200).json(products.map(p => ({ ...formatProduct(p.toJSON(), true), slug: p.slug || generateSlug(p.name) })));
        const context = await getActiveDiscountContext(req.query.audience);
        res.status(200).json(products.map(p => formatProductWithDiscounts({ ...formatProduct(p.toJSON(), false), slug: p.slug || generateSlug(p.name) }, context)));
    } catch (e) {
        res.status(500).json({ success: false, error: e.message, details: e.errors ? e.errors.map(err => err.message) : (e.stack || e) });
    }
};

// --- 6. DELETE PRODUCT ---
exports.deleteProduct = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { id } = req.params;
        let product = await Product.findByPk(id, {
            include: [{ model: Thumbnail, as: 'thumbnails' }, { model: ProductVariant, as: 'variants' }],
            paranoid: false,
            transaction: t
        });

        if (!product && id) {
            product = await Product.findOne({
                where: { [Op.or]: [{ sku: id }, { slug: id }] },
                include: [{ model: Thumbnail, as: 'thumbnails' }, { model: ProductVariant, as: 'variants' }],
                paranoid: false,
                transaction: t
            });
        }

        if (!product) {
            await t.rollback();
            return res.status(200).json({ success: true, message: 'Product deleted successfully!' });
        }

        const variantIds = (product.variants || []).map(v => v.id);
        const slots = await OrderSlot.findAll({
            where: {
                [Op.or]: [
                    { productId: product.id },
                    ...(variantIds.length ? [{ variantId: { [Op.in]: variantIds } }] : [])
                ]
            },
            transaction: t
        });
        const hasOrderHistory = slots.length > 0;

        for (const slot of slots) {
            await slot.update({
                productName: slot.productName || product.name || null,
                productImage: slot.productImage || product.mainImage || null
            }, { transaction: t });
        }

        const reviews = await Review.findAll({ where: { productId: product.id }, transaction: t });
        for (const review of reviews) {
            if (review.orderId) {
                await review.update({ orderId: null }, { transaction: t });
            }
            await review.destroy({ force: true, transaction: t });
        }

        await Cart.destroy({ where: { productId: product.id }, transaction: t });
        await Wishlist.destroy({ where: { productId: product.id }, transaction: t });
        await BestSeller.destroy({ where: { productId: product.id }, transaction: t });
        await TrendingProduct.destroy({ where: { productId: product.id }, transaction: t });
        await NewArrival.destroy({ where: { productId: product.id }, transaction: t });
        await TopRatedProduct.destroy({ where: { productId: product.id }, transaction: t });
        await Thumbnail.destroy({ where: { productId: product.id }, transaction: t });
        await ProductVariant.destroy({ where: { productId: product.id }, force: true, transaction: t });
        await ProductSpecification.destroy({ where: { productId: product.id }, transaction: t });
        await product.destroy({ force: true, transaction: t });
        await t.commit();

        if (!hasOrderHistory) {
            (product.variants || []).forEach(v => {
                safeUnlink(v.mainImage);
                if (v.thumbnails) {
                    try {
                        const parsed = JSON.parse(v.thumbnails);
                        if (Array.isArray(parsed)) parsed.forEach(file => safeUnlink(file));
                    } catch (e) {}
                }
            });
            safeUnlink(product.thumbVideo);
            (product.thumbnails || []).forEach(t => safeUnlink(t.image));
            safeUnlink(product.mainImage);
        }

        res.status(200).json({ success: true, message: 'Product Deleted Successfully!' });
    } catch (e) {
        await t.rollback();
        res.status(500).json({ success: false, error: e.message, details: e.errors ? e.errors.map(err => err.message) : (e.stack || e) });
    }
};

exports.updateStock = async (req, res) => {
    try {
        const { productId, variantId, stock } = req.body;
        const normalizedStock = Number(stock);
        if (!Number.isInteger(normalizedStock) || normalizedStock < 0) {
            return res.status(400).json({ success: false, error: 'Stock must be a non-negative whole number' });
        }
        const variants = await ProductVariant.findAll({ where: { productId } });
        const selectableVariants = variants.filter(v =>
            String(v.variantType || '').trim() && String(v.variantValue || '').trim()
        );

        if (variantId) {
            const variant = await ProductVariant.findOne({ where: { id: variantId, productId } });
            if (!variant) return res.status(404).json({ success: false, error: 'Variant not found' });
            await variant.update({ stock: normalizedStock });
            return res.status(200).json({ success: true, message: 'Variant stock updated successfully', data: variant });
        } else {
            const product = await Product.findByPk(productId);
            if (!product) return res.status(404).json({ success: false, error: 'Product not found' });
            if (selectableVariants.length > 0) {
                return res.status(400).json({
                    success: false,
                    error: 'This product has selectable variants. Update stock for each variant instead of the base product.'
                });
            }
            await product.update({ stock: normalizedStock });
            if (variants.length > 0) {
                const placeholderVariantIds = variants
                    .filter(v => !String(v.variantType || '').trim() && !String(v.variantValue || '').trim())
                    .map(v => v.id);
                if (placeholderVariantIds.length > 0) {
                    await ProductVariant.update(
                        { stock: normalizedStock },
                        { where: { id: placeholderVariantIds } }
                    );
                }
            }
            return res.status(200).json({ success: true, message: 'Product stock updated successfully', data: product });
        }
    } catch (e) {
        res.status(500).json({ success: false, error: e.message, details: e.errors ? e.errors.map(err => err.message) : (e.stack || e) });
    }
};
