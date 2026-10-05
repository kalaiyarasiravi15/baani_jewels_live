const path = require('path');
const fs = require('fs');
const { Op } = require('sequelize');
const {
    sequelize, Category, Review, Product, OrderSlot, ProductVariant,
    Cart, Wishlist, BestSeller, TrendingProduct, NewArrival, TopRatedProduct,
    Thumbnail, ProductSpecification
} = require('../models');

// Helper to safely delete file from uploads directory
const safeUnlink = (filename) => {
    if (!filename) return;
    const p = path.join(__dirname, '../uploads', filename);
    if (fs.existsSync(p)) {
        try {
            fs.unlinkSync(p);
        } catch (e) {
            console.error('Error deleting file:', p, e.message);
        }
    }
};

// 1. Add Category
exports.addCategory = async (req, res) => {
    try {
        const { name, status, description } = req.body || {};
        if (!name || !name.trim()) {
            return res.status(400).json({ error: "Category name is required" });
        }
        const image = req.file ? req.file.filename : null;
        let activeStatus = true;
        if (status !== undefined) {
            activeStatus = (status === 'true' || status === true);
        }
        const category = await Category.create({
            name: name.trim(),
            image,
            description: description || null,
            status: activeStatus
        });
        res.status(201).json(category);
    } catch (error) { 
        res.status(500).json({ error: error.message }); 
    }
};

// 2. Get All Categories 
exports.getAllCategories = async (req, res) => {
    try {
        const isAdmin = Boolean(req.adminId);
        const page = parseInt(req.query.page, 10);
        const limit = parseInt(req.query.limit, 10) || 10;

        const categories = await Category.findAll({
            attributes: ['id', 'name', 'image', 'description', 'status', 'createdAt'],
            order: [['createdAt', 'DESC']]
        });

        const productCounts = await Product.findAll({
            attributes: [
                'categoryId',
                [sequelize.fn('COUNT', sequelize.col('id')), 'productCount']
            ],
            where: isAdmin ? {} : { status: true },
            group: ['categoryId'],
            raw: true
        });

        const countByCategoryId = new Map(
            productCounts.map(row => [Number(row.categoryId), Number(row.productCount)])
        );

        const result = categories.map(category => ({
            ...category.toJSON(),
            productCount: countByCategoryId.get(Number(category.id)) || 0
        }));

        if (page) {
            const totalCount = result.length;
            const offset = (page - 1) * limit;
            return res.status(200).json({
                success: true,
                categories: result.slice(offset, offset + limit),
                totalCount,
                totalPages: Math.ceil(totalCount / limit)
            });
        }

        res.status(200).json(result);
    } catch (error) {
        console.error('Error fetching categories:', error);
        res.status(500).json({ error: error.message });
    }
};

// 3. Get Category By ID
exports.getCategoryById = async (req, res) => {
    try {
        const cat = await Category.findByPk(req.params.id);
        if (!cat) {
            return res.status(404).json({ message: 'Category not found' });
        }
        const productCount = await Product.count({ where: { categoryId: cat.id } });
        res.status(200).json({
            ...cat.toJSON(),
            productCount
        });
    } catch (error) {
        console.error('Error fetching category by ID:', error);
        res.status(500).json({ error: error.message });
    }
};

// 4. Update Category
exports.updateCategory = async (req, res) => {
    try {
        const cat = await Category.findByPk(req.params.id);
        if (!cat) {
            return res.status(404).json({ message: 'Category not found' });
        }

        const { name, description, status } = req.body || {};
        const updateData = {};

        if (name !== undefined) updateData.name = name.trim();
        if (description !== undefined) updateData.description = description;
        if (status !== undefined) {
            updateData.status = (status === 'true' || status === true);
        }

        if (req.file) {
            safeUnlink(cat.image);
            updateData.image = req.file.filename;
        }

        await cat.update(updateData);
        res.status(200).json(cat);
    } catch (error) {
        console.error('Error updating category:', error);
        res.status(500).json({ error: error.message });
    }
};

// 5. Delete Category
exports.deleteCategory = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const cat = await Category.findByPk(req.params.id, { transaction: t });
        if (!cat) {
            await t.rollback();
            return res.status(404).json({ message: 'Category not found' });
        }

        const products = await Product.findAll({
            where: { categoryId: cat.id },
            transaction: t
        });
        const productIds = products.map(p => p.id);

        let thumbnails = [];
        let hasOrderHistory = false;
        if (productIds.length > 0) {
            const variants = await ProductVariant.findAll({
                where: { productId: { [Op.in]: productIds } },
                transaction: t
            });
            const variantIds = variants.map(v => v.id);

            thumbnails = await Thumbnail.findAll({
                where: { productId: { [Op.in]: productIds } },
                transaction: t
            });

            const slots = await OrderSlot.findAll({
                where: {
                    [Op.or]: [
                        { productId: { [Op.in]: productIds } },
                        ...(variantIds.length ? [{ variantId: { [Op.in]: variantIds } }] : [])
                    ]
                },
                transaction: t
            });
            hasOrderHistory = slots.length > 0;

            for (const slot of slots) {
                const product = products.find(p => p.id === slot.productId);
                const variant = (variants || []).find(v => v.id === slot.variantId);
                await slot.update({
                    productName:  slot.productName  || (product ? product.name      : null) || null,
                    productImage: slot.productImage || (product ? product.mainImage : null) || null,
                    variantLabel: slot.variantLabel || [variant?.variantType, variant?.variantValue].filter(Boolean).join(': ') || null,
                }, { transaction: t });
            }

            const allReviews = await Review.findAll({
                where: { productId: { [Op.in]: productIds } },
                transaction: t
            });
            for (const review of allReviews) {
                if (review.orderId) await review.update({ orderId: null }, { transaction: t });
                await review.destroy({ transaction: t });
            }

            // Explicitly destroy referencing records in Cart, Wishlist, and collections
            await Cart.destroy({ where: { productId: { [Op.in]: productIds } }, transaction: t });
            await Wishlist.destroy({ where: { productId: { [Op.in]: productIds } }, transaction: t });
            await BestSeller.destroy({ where: { productId: { [Op.in]: productIds } }, transaction: t });
            await TrendingProduct.destroy({ where: { productId: { [Op.in]: productIds } }, transaction: t });
            await NewArrival.destroy({ where: { productId: { [Op.in]: productIds } }, transaction: t });
            await TopRatedProduct.destroy({ where: { productId: { [Op.in]: productIds } }, transaction: t });

            // Explicitly destroy child records
            await Thumbnail.destroy({ where: { productId: { [Op.in]: productIds } }, transaction: t });
            await ProductVariant.destroy({ where: { productId: { [Op.in]: productIds } }, transaction: t });
            await ProductSpecification.destroy({ where: { productId: { [Op.in]: productIds } }, transaction: t });

            // Destroy products
            await Product.destroy({ where: { categoryId: cat.id }, transaction: t });
        }

        // Destroy category inside the transaction
        await cat.destroy({ transaction: t });

        await t.commit();

        // Safe disk deletion after successful database commit
        safeUnlink(cat.image);
        // Keep all product media when there is order history. Product/variant
        // rows are deleted, but order snapshots still need these image files.
        if (!hasOrderHistory) {
            for (const thumb of thumbnails) {
                safeUnlink(thumb.image);
            }
            for (const product of products) safeUnlink(product.mainImage);
        }

        res.json({
            message: 'Category and its products deleted successfully. Order history is preserved.',
        });
    } catch (error) {
        if (t) await t.rollback();
        console.error('Error deleting category:', error);
        res.status(500).json({ error: error.message });
    }
};
