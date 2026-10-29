const { validatePromotion } = require('../utils/promotionValidation');
const { Op } = require('sequelize');
const Deal = require('../models/Deal');
const OfferBanner = require('../models/OfferBanner');
const { findLiveTargetConflict } = require('../utils/promotionConflict');

// GET: /api/deals/active
exports.getActiveDeal = async (req, res) => {
    try {
        const { audience } = req.query; // 'NEW_CUSTOMER' or 'REGULAR_CUSTOMER'
        const now = new Date();

        // Automatically deactivate expired active deals
        await Deal.update(
            { isActive: false },
            {
                where: {
                    isActive: true,
                    expiryDate: { [Op.lte]: now }
                }
            }
        );

        const Product = require('../models/Product');
        const deals = await Deal.findAll({
            where: { 
                isActive: true,
                expiryDate: { [Op.gt]: now },
                [Op.or]: [{ startDate: null }, { startDate: { [Op.lte]: now } }]
            },
            include: [
                { model: Product, as: 'targetProduct', attributes: ['id', 'name', 'mainImage', 'mrpPrice', 'salesPrice'], required: false }
            ],
            order: [['createdAt', 'DESC']]
        });

        const formattedDeals = deals.map(d => {
            const dealObj = d.toJSON();
            if (dealObj.targetProduct) {
                const mrp = Number(dealObj.targetProduct.mrpPrice) || 0;
                const dbSales = Number(dealObj.targetProduct.salesPrice) || 0;
                // Deal discount applies against salesPrice (selling price); falls back to mrp if salesPrice unavailable
                const basePrice = dbSales > 0 ? dbSales : (mrp > 0 ? mrp : 0);
                let dealPrice = basePrice;
                const val = Number(dealObj.discountValue || dealObj.discountPercentage || 0);

                if (dealObj.discountType === 'FLAT' && val > 0) {
                    dealPrice = Math.max(0, basePrice - val);
                } else if ((dealObj.discountType === 'PERCENTAGE' || !dealObj.discountType) && val > 0) {
                    dealPrice = Math.max(0, basePrice - (basePrice * val / 100));
                }

                dealObj.targetProduct.dealPrice = Math.round(dealPrice * 100) / 100;
                dealObj.targetProduct.salesPrice = Math.round(dealPrice * 100) / 100;
            }
            return dealObj;
        });

        res.status(200).json(formattedDeals);
    } catch (err) {
        res.status(500).json({ message: "Error fetching deal", error: err.message });
    }
};

// POST: /api/deals/add
exports.addDeal = async (req, res) => {
    try {
        try { validatePromotion(req.body, false); } catch (error) { return res.status(400).json({ error: error.message, message: error.message }); }

        const { title, description, startDate, expiryDate, buttonText, buttonLink, discountPercentage, isActive, discountType, discountValue, targetAudience, targetType, targetProductId, targetCategoryId, targetCollectionId } = req.body || {};

        const activeStatus = isActive !== undefined ? (isActive === 'true' || isActive === true) : true;
        const type = ['SHOP', 'PRODUCT', 'CATEGORY', 'COLLECTION'].includes(targetType) ? targetType : 'SHOP';
        const prodId = (targetProductId && targetProductId !== 'null' && targetProductId !== '') ? parseInt(targetProductId) : null;
        const categoryId = type === 'CATEGORY' && targetCategoryId ? parseInt(targetCategoryId) : null;
        const collectionId = type === 'COLLECTION' && targetCollectionId ? parseInt(targetCollectionId) : null;
        if (type === 'PRODUCT' && !Number.isInteger(prodId)) {
            return res.status(400).json({ message: 'Select a product for this deal.' });
        }
        const Product = require('../models/Product');
        const targetProd = type === 'PRODUCT' ? await Product.findByPk(prodId) : null;
        if (type === 'PRODUCT' && !targetProd) {
            return res.status(400).json({ message: 'Selected product was not found.' });
        }
        if ((type === 'CATEGORY' && !Number.isInteger(categoryId)) || (type === 'COLLECTION' && !Number.isInteger(collectionId))) return res.status(400).json({ message: `Select a ${type.toLowerCase()} for this deal.` });

        if (activeStatus) {
            const offerConflict = await findLiveTargetConflict(OfferBanner, 'status', { type, productId: prodId, categoryId, collectionId });
            if (offerConflict) return res.status(409).json({ message: `A live offer already applies to this ${type.toLowerCase()} target. Deactivate it before creating this deal.` });
            const dealConflict = await findLiveTargetConflict(Deal, 'isActive', { type, productId: prodId, categoryId, collectionId });
            if (dealConflict) return res.status(409).json({ message: `A live deal already applies to this ${type.toLowerCase()} target. Deactivate it before creating another deal.` });
        }

        let bannerImage = req.file ? req.file.filename : null;

        // Fallback: If no custom banner uploaded, check if product has a mainImage
        if (!bannerImage && targetProd?.mainImage) {
            bannerImage = targetProd.mainImage;
        }

        if (!bannerImage) {
            bannerImage = 'default_banner.png';
        }

        const newDeal = await Deal.create({
            title: title || "Deal of the Day",
            description,
            startDate,
            expiryDate,
            buttonText: buttonText || "SHOP NOW",
            buttonLink: type === 'PRODUCT' ? `/product/${prodId}` : type === 'CATEGORY' ? `/shop?categoryId=${categoryId}` : type === 'COLLECTION' ? `/shop?collectionId=${collectionId}` : (buttonLink || '/shop'),
            discountPercentage: discountPercentage ? parseInt(discountPercentage) : 0,
            discountType: discountType || 'PERCENTAGE',
            discountValue: discountValue ? parseFloat(discountValue) : 0.00,
            targetAudience: targetAudience || 'ALL',
            targetType: type,
            targetProductId: prodId,
            targetCategoryId: categoryId,
            targetCollectionId: collectionId,
            image: bannerImage, 
            isActive: activeStatus
        });

        res.status(201).json({
            success: true,
            message: "New Deal of the Day activated successfully!",
            data: newDeal
        });
    } catch (err) {
        console.error("Add Deal Error:", err);
        res.status(500).json({ message: "Internal Server Error", error: err.message });
    }
};

// DELETE: /api/deals/:id
exports.deleteDeal = async (req, res) => {
    try {
        const { id } = req.params;
        await Deal.destroy({ where: { id } });
        res.status(200).json({ message: "Deal removed successfully" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// PUT: /api/deals/update/:id
exports.updateDeal = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, startDate, expiryDate, buttonText, buttonLink, discountPercentage, isActive, discountType, discountValue, targetAudience } = req.body;

        const deal = await Deal.findByPk(id); 
        if (!deal) return res.status(404).json({ message: "Deal not found" });

        try { validatePromotion({ ...deal.toJSON(), ...req.body }, false); } catch (error) { return res.status(400).json({ error: error.message, message: error.message }); }
        deal.title = title !== undefined ? title : deal.title;
        deal.description = description !== undefined ? description : deal.description;
        deal.startDate = startDate !== undefined ? startDate : deal.startDate;
        deal.expiryDate = expiryDate !== undefined ? expiryDate : deal.expiryDate;
        deal.buttonText = buttonText !== undefined ? buttonText : deal.buttonText;
        deal.buttonLink = buttonLink !== undefined ? buttonLink : deal.buttonLink;
        deal.discountPercentage = discountPercentage !== undefined ? parseInt(discountPercentage) : deal.discountPercentage;
        deal.discountType = discountType !== undefined ? discountType : deal.discountType;
        deal.discountValue = discountValue !== undefined ? parseFloat(discountValue) : deal.discountValue;
        deal.targetAudience = targetAudience !== undefined ? targetAudience : deal.targetAudience;
        const nextTargetType = ['SHOP', 'PRODUCT', 'CATEGORY', 'COLLECTION'].includes(req.body.targetType) ? req.body.targetType : deal.targetType;
        const parsedTargetId = nextTargetType === 'PRODUCT'
            ? (req.body.targetProductId !== undefined
                ? (req.body.targetProductId === 'null' || !req.body.targetProductId ? null : parseInt(req.body.targetProductId))
                : Number(deal.targetProductId))
            : null;
        const parsedCategoryId = nextTargetType === 'CATEGORY' ? (req.body.targetCategoryId ? parseInt(req.body.targetCategoryId) : Number(deal.targetCategoryId)) : null;
        const parsedCollectionId = nextTargetType === 'COLLECTION' ? (req.body.targetCollectionId ? parseInt(req.body.targetCollectionId) : Number(deal.targetCollectionId)) : null;
        if (nextTargetType === 'PRODUCT' && !Number.isInteger(parsedTargetId)) {
            return res.status(400).json({ message: 'Select a product for this deal.' });
        }
        if ((nextTargetType === 'CATEGORY' && !Number.isInteger(parsedCategoryId)) || (nextTargetType === 'COLLECTION' && !Number.isInteger(parsedCollectionId))) return res.status(400).json({ message: `Select a ${nextTargetType.toLowerCase()} for this deal.` });
        const Product = require('../models/Product');
        const targetProduct = nextTargetType === 'PRODUCT' ? await Product.findByPk(parsedTargetId) : null;
        if (nextTargetType === 'PRODUCT' && !targetProduct) {
            return res.status(400).json({ message: 'Selected product was not found.' });
        }
        deal.targetType = nextTargetType;
        deal.targetProductId = parsedTargetId;
        deal.targetCategoryId = parsedCategoryId;
        deal.targetCollectionId = parsedCollectionId;
        deal.buttonLink = nextTargetType === 'PRODUCT' ? `/product/${parsedTargetId}` : nextTargetType === 'CATEGORY' ? `/shop?categoryId=${parsedCategoryId}` : nextTargetType === 'COLLECTION' ? `/shop?collectionId=${parsedCollectionId}` : (buttonLink || '/shop');
        
        if (isActive !== undefined) {
            deal.isActive = isActive === 'true' || isActive === true;
        }

        const type = deal.targetType;

        if (deal.isActive) {
            const sameTargetDeal = await findLiveTargetConflict(Deal, 'isActive', {
                type, productId: deal.targetProductId, categoryId: deal.targetCategoryId, collectionId: deal.targetCollectionId
            }, deal.id);
            if (sameTargetDeal) return res.status(409).json({ message: `A live deal already applies to this ${type.toLowerCase()} target. Deactivate it before activating this deal.` });
        }

        if (deal.isActive) {
            const offerConflict = await findLiveTargetConflict(OfferBanner, 'status', {
                type, productId: deal.targetProductId, categoryId: deal.targetCategoryId, collectionId: deal.targetCollectionId
            });
            if (offerConflict) return res.status(409).json({ message: `A live offer already applies to this ${type.toLowerCase()} target. Deactivate it before activating this deal.` });
        }

        if (req.file) deal.image = req.file.filename;

        await deal.save();

        res.status(200).json({
            success: true,
            message: "Deal updated successfully!",
            data: deal
        });
    } catch (err) {
        res.status(500).json({ message: "Update failed", error: err.message });
    }
};

// GET: /api/deals/all (Admin)
exports.getAllDeals = async (req, res) => {
    try {
        const now = new Date();
        // Automatically deactivate expired active deals
        await Deal.update(
            { isActive: false },
            {
                where: {
                    isActive: true,
                    expiryDate: { [Op.lte]: now }
                }
            }
        );

        const deals = await Deal.findAll({
            order: [['createdAt', 'DESC']]
        });
        res.status(200).json(deals);
    } catch (err) {
        res.status(500).json({ message: "Error fetching all deals", error: err.message });
    }
};
