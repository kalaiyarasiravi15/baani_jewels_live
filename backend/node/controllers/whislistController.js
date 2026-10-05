const { Wishlist, Product, ProductVariant, Thumbnail, Category } = require('../models/index');

const productInclude = [
    { model: Product, as: 'product', include: [
        { model: Category, as: 'category', attributes: ['id', 'name'] },
        { model: ProductVariant, as: 'variants' },
        { model: Thumbnail, as: 'thumbnails', attributes: ['id', 'image'] }
    ]}
];

const isSameCustomer = (req, customerId) => String(req.customerId) === String(customerId);

// GET wishlist for customer
exports.getWishlist = async (req, res) => {
    try {
        if (!isSameCustomer(req, req.params.customerId)) return res.status(403).json({ message: 'You can access only your own wishlist.' });
        const items = await Wishlist.findAll({
            where: { customerId: req.params.customerId },
            include: productInclude,
            where: { customerId: req.params.customerId },
            include: productInclude,
            order: [['createdAt', 'DESC']]
        });
        res.json(items);
    } catch (e) { res.status(500).json({ error: e.message }); }
};

// TOGGLE: add if not exists, remove if exists
exports.toggleWishlist = async (req, res) => {
    try {
        let { customerId, productId, variantId, selectedSubOption, productName, price, image } = req.body;
        if (!isSameCustomer(req, customerId)) return res.status(403).json({ message: 'You can update only your own wishlist.' });

        if (!productId) return res.status(400).json({ message: 'A valid product is required.' });
        const product = await Product.findByPk(productId);
        if (!product) return res.status(404).json({ message: 'Product not found.' });
        const variant = variantId ? await ProductVariant.findOne({ where: { id: variantId, productId } }) : null;
        if (variantId && !variant) return res.status(400).json({ message: 'Invalid product variant.' });
        

        const existing = await Wishlist.findOne({ where: { 
            customerId, 
            productId, 
            variantId: variantId || null, 
            selectedSubOption: selectedSubOption || null 
        } });
        if (existing) {
            return res.json({ message: 'Already in wishlist', action: 'exists', item: existing });
        }
        const item = await Wishlist.create({ 
            customerId, 
            productId, 
            variantId: variantId || null, 
            selectedSubOption: selectedSubOption || null 
        });
        res.status(201).json({ message: 'Added to wishlist', action: 'added', item });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

// REMOVE single
exports.removeFromWishlist = async (req, res) => {
    try {
        const item = await Wishlist.findByPk(req.params.id);
        if (!item) return res.status(404).json({ message: 'Not found' });
        if (!isSameCustomer(req, item.customerId)) return res.status(403).json({ message: 'You can update only your own wishlist.' });
        const deleted = await Wishlist.destroy({ where: { id: req.params.id } });
        if (deleted) res.json({ message: 'Removed' });
        else res.status(404).json({ message: 'Not found' });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

// CHECK if product is in wishlist
exports.checkWishlist = async (req, res) => {
    try {
        const { customerId, productId } = req.params;
        if (!isSameCustomer(req, customerId)) return res.status(403).json({ message: 'You can access only your own wishlist.' });
        const { variantId, selectedSubOption } = req.query;
        
        let whereClause = { customerId, productId };
        if (variantId) whereClause.variantId = variantId;
        if (selectedSubOption) whereClause.selectedSubOption = selectedSubOption;

        const item = await Wishlist.findOne({ where: whereClause });
        res.json({ inWishlist: !!item });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

const validGuestSession = (value) => typeof value === 'string' && /^[a-zA-Z0-9-]{20,80}$/.test(value);

exports.getGuestWishlist = async (req, res) => {
    try {
        const { guestSessionId } = req.params;
        if (!validGuestSession(guestSessionId)) return res.status(400).json({ message: 'Invalid guest session.' });
        const items = await Wishlist.findAll({ where: { guestSessionId, customerId: null }, include: productInclude, order: [['createdAt', 'DESC']] });
        res.json(items);
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.toggleGuestWishlist = async (req, res) => {
    try {
        const { guestSessionId, productId, variantId, selectedSubOption } = req.body || {};
        if (!validGuestSession(guestSessionId) || !productId) return res.status(400).json({ message: 'Guest session and product are required.' });
        const product = await Product.findByPk(productId);
        if (!product) return res.status(404).json({ message: 'Product not found.' });
        const where = { guestSessionId, customerId: null, productId, variantId: variantId || null, selectedSubOption: selectedSubOption || null };
        const existing = await Wishlist.findOne({ where });
        if (existing) { await existing.destroy(); return res.json({ message: 'Removed from wishlist', action: 'removed' }); }
        const item = await Wishlist.create(where);
        res.status(201).json({ message: 'Added to wishlist', action: 'added', item });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.removeGuestFromWishlist = async (req, res) => {
    try {
        const { guestSessionId } = req.body || {};
        if (!validGuestSession(guestSessionId)) return res.status(400).json({ message: 'Invalid guest session.' });
        const deleted = await Wishlist.destroy({ where: { id: req.params.id, guestSessionId, customerId: null } });
        if (!deleted) return res.status(404).json({ message: 'Wishlist item not found.' });
        res.json({ message: 'Removed' });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.syncWishlist = async (req, res) => {
    try {
        const { wishlistItems } = req.body;
        const customerId = req.params.customerId;
        if (!isSameCustomer(req, customerId)) return res.status(403).json({ message: 'Forbidden' });

        for (const item of (wishlistItems || [])) {
            const productId = item.id || item.productId;
            const variantId = item.variantId || null;
            if (!productId) continue;
            const existing = await Wishlist.findOne({ where: { customerId, productId, variantId, selectedSubOption: item.selectedSubOption || null }});
            if (!existing) {
                await Wishlist.create({ customerId, productId, variantId, selectedSubOption: item.selectedSubOption || null });
            }
        }
        res.json({ message: 'Wishlist synced' });
    } catch (e) { res.status(500).json({ error: e.message }); }
};
