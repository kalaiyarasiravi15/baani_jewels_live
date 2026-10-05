const { validatePromotion } = require('../utils/promotionValidation');
const { Op } = require('sequelize');
const OfferBanner = require('../models/OfferBanner');
const Deal = require('../models/Deal');
const { findLiveTargetConflict } = require('../utils/promotionConflict');
const fs = require('fs');
const path = require('path');

// 1. ADD
exports.addOfferBanner = async (req, res) => {
    try {
        try { validatePromotion(req.body, false); } catch (error) { return res.status(400).json({ error: error.message, message: error.message }); }

        const { title, subtitle, buttonText, link, discountTag, productId, targetCategoryId, targetCollectionId, discountPercentage, startDate, expiryDate, status, discountType, discountValue, targetAudience, targetType } = req.body;
        const image = req.file ? req.file.filename : null;
        if (!image) return res.status(400).json({ message: "Image required!" });

        const type = ['SHOP', 'PRODUCT', 'CATEGORY', 'COLLECTION'].includes(targetType) ? targetType : 'PRODUCT';
        const pid = type === 'PRODUCT' && productId && productId !== 'null' && productId !== '' ? parseInt(productId) : null;
        const categoryId = type === 'CATEGORY' && targetCategoryId ? parseInt(targetCategoryId) : null;
        const collectionId = type === 'COLLECTION' && targetCollectionId ? parseInt(targetCollectionId) : null;
        if (type === 'PRODUCT' && !Number.isInteger(pid)) {
            return res.status(400).json({ message: 'Select a product for this offer banner.' });
        }
        const Product = require('../models/Product');
        const targetProduct = await Product.findByPk(pid);
        if (type === 'PRODUCT' && !targetProduct) {
            return res.status(400).json({ message: 'Selected product was not found.' });
        }
        const pct = discountPercentage ? parseInt(discountPercentage) : 0;
        const start = startDate && startDate !== 'null' && startDate !== '' ? new Date(startDate) : null;
        const exp = expiryDate && expiryDate !== 'null' && expiryDate !== '' ? new Date(expiryDate) : null;
        const activeStatus = status !== undefined ? (status === 'true' || status === true) : true;

        if (activeStatus) {
            const dealConflict = await findLiveTargetConflict(Deal, 'isActive', { type, productId: pid, categoryId, collectionId });
            if (dealConflict) return res.status(409).json({ message: `A live deal already applies to this ${type.toLowerCase()} target. Deactivate it before creating this offer.` });
            const offerConflict = await findLiveTargetConflict(OfferBanner, 'status', { type, productId: pid, categoryId, collectionId });
            if (offerConflict) return res.status(409).json({ message: `A live offer banner already applies to this ${type.toLowerCase()} target. Disable it before creating another offer for the same target.` });
        }

        if ((type === 'CATEGORY' && !Number.isInteger(categoryId)) || (type === 'COLLECTION' && !Number.isInteger(collectionId))) return res.status(400).json({ message: `Select a ${type.toLowerCase()} for this offer banner.` });
        const dType = discountType || 'PERCENTAGE';
        const dValue = discountValue ? parseFloat(discountValue) : 0.00;
        const tAudience = targetAudience || 'ALL';

        const ob = await OfferBanner.create({ 
            title, subtitle, buttonText, image, link: type === 'SHOP' ? (link || '/shop') : type === 'PRODUCT' ? `/product/${pid}` : type === 'CATEGORY' ? `/shop?categoryId=${categoryId}` : `/shop?collectionId=${collectionId}`, discountTag,
            productId: pid,
            targetCategoryId: categoryId,
            targetCollectionId: collectionId,
            targetType: type,
            discountPercentage: pct,
            startDate: start,
            expiryDate: exp,
            status: activeStatus,
            discountType: dType,
            discountValue: dValue,
            targetAudience: tAudience
        });
        res.status(201).json({ message: "Offer Banner Added!", offerBanner: ob });
    } catch (e) {
        if (req.file) fs.unlinkSync(path.join(process.cwd(), 'uploads', req.file.filename));
        res.status(500).json({ error: e.message });
    }
};

// 2. GET ALL (Public Active)
exports.getOfferBanners = async (req, res) => {
    try {
        const { audience } = req.query;
        const now = new Date();

        // Auto de-activate expired ones
        await OfferBanner.update(
            { status: false },
            {
                where: {
                    status: true,
                    expiryDate: { [Op.lte]: now, [Op.ne]: null }
                }
            }
        );

        const obs = await OfferBanner.findAll({ 
            where: { 
                status: true,
                [Op.or]: [
                    { expiryDate: null },
                    { expiryDate: { [Op.gt]: now } }
                ],
                [Op.and]: [{
                    [Op.or]: [{ startDate: null }, { startDate: { [Op.lte]: now } }]
                }]
            }, 
            order: [['createdAt', 'DESC']] 
        });
        res.json(obs);
    } catch (e) { res.status(500).json({ error: e.message }); }
};

// 2b. GET ALL (Admin)
exports.getAllOfferBanners = async (req, res) => {
    try {
        const now = new Date();
        await OfferBanner.update(
            { status: false },
            {
                where: {
                    status: true,
                    expiryDate: { [Op.lte]: now, [Op.ne]: null }
                }
            }
        );

        const obs = await OfferBanner.findAll({ order: [['createdAt', 'DESC']] });
        res.json(obs);
    } catch (e) { res.status(500).json({ error: e.message }); }
};

// 3. GET SINGLE
exports.getSingleOfferBanner = async (req, res) => {
    try {
        const ob = await OfferBanner.findByPk(req.params.id);
        if (!ob) return res.status(404).json({ message: "Not found" });
        res.json(ob);
    } catch (e) { res.status(500).json({ error: e.message }); }
};

// 4. UPDATE
exports.updateOfferBanner = async (req, res) => {
    try {
        const ob = await OfferBanner.findByPk(req.params.id);
        if (!ob) return res.status(404).json({ message: "Not found" });

        const { title, subtitle, buttonText, link, discountTag, productId, targetCategoryId, targetCollectionId, discountPercentage, startDate, expiryDate, status, discountType, discountValue, targetAudience, targetType } = req.body;
        try { validatePromotion({ ...ob.toJSON(), ...req.body }, false); } catch (error) { return res.status(400).json({ error: error.message, message: error.message }); }
        let image = ob.image;

        if (req.file) {
            const oldImgPath = path.join(process.cwd(), 'uploads', ob.image);
            if (fs.existsSync(oldImgPath)) fs.unlinkSync(oldImgPath);
            image = req.file.filename;
        }

        const type = ['SHOP', 'PRODUCT', 'CATEGORY', 'COLLECTION'].includes(targetType) ? targetType : (ob.targetType || 'PRODUCT');
        const pid = type === 'PRODUCT' ? (productId !== undefined ? (productId && productId !== 'null' && productId !== '' ? parseInt(productId) : null) : Number(ob.productId)) : null;
        const categoryId = type === 'CATEGORY' ? (targetCategoryId ? parseInt(targetCategoryId) : Number(ob.targetCategoryId)) : null;
        const collectionId = type === 'COLLECTION' ? (targetCollectionId ? parseInt(targetCollectionId) : Number(ob.targetCollectionId)) : null;
        if (type === 'PRODUCT' && !Number.isInteger(pid)) {
            return res.status(400).json({ message: 'Select a product for this offer banner.' });
        }
        const Product = require('../models/Product');
        const targetProduct = await Product.findByPk(pid);
        if (type === 'PRODUCT' && !targetProduct) {
            return res.status(400).json({ message: 'Selected product was not found.' });
        }
        if ((type === 'CATEGORY' && !Number.isInteger(categoryId)) || (type === 'COLLECTION' && !Number.isInteger(collectionId))) return res.status(400).json({ message: `Select a ${type.toLowerCase()} for this offer banner.` });
        const pct = discountPercentage !== undefined ? parseInt(discountPercentage) : ob.discountPercentage;
        const start = startDate !== undefined ? (startDate && startDate !== 'null' && startDate !== '' ? new Date(startDate) : null) : ob.startDate;
        const exp = expiryDate !== undefined ? (expiryDate && expiryDate !== 'null' && expiryDate !== '' ? new Date(expiryDate) : null) : ob.expiryDate;
        const activeStatus = status !== undefined ? (status === 'false' || status === false ? false : true) : ob.status;

        const dType = discountType !== undefined ? discountType : ob.discountType;
        const dValue = discountValue !== undefined ? parseFloat(discountValue) : ob.discountValue;

        const nextStatus = status !== undefined ? (status === 'true' || status === true) : ob.status;
        if (nextStatus) {
            const dealConflict = await findLiveTargetConflict(Deal, 'isActive', { type, productId: pid, categoryId, collectionId });
            if (dealConflict) return res.status(409).json({ message: `A live deal already applies to this ${type.toLowerCase()} target. Deactivate it before activating this offer.` });
            const offerConflict = await findLiveTargetConflict(OfferBanner, 'status', { type, productId: pid, categoryId, collectionId }, ob.id);
            if (offerConflict) return res.status(409).json({ message: `A live offer banner already applies to this ${type.toLowerCase()} target. Disable it before activating this offer.` });
        }
        const tAudience = targetAudience !== undefined ? targetAudience : ob.targetAudience;

        const updateData = { image };
        if (title !== undefined) updateData.title = title;
        if (subtitle !== undefined) updateData.subtitle = subtitle;
        if (buttonText !== undefined) updateData.buttonText = buttonText;
        updateData.link = type === 'SHOP' ? (link || '/shop') : type === 'PRODUCT' ? `/product/${pid}` : type === 'CATEGORY' ? `/shop?categoryId=${categoryId}` : `/shop?collectionId=${collectionId}`;
        if (discountTag !== undefined) updateData.discountTag = discountTag;
        updateData.productId = pid;
        updateData.targetCategoryId = categoryId;
        updateData.targetCollectionId = collectionId;
        updateData.targetType = type;
        if (discountPercentage !== undefined) updateData.discountPercentage = pct;
        if (startDate !== undefined) updateData.startDate = start;
        if (expiryDate !== undefined) updateData.expiryDate = exp;
        if (status !== undefined) updateData.status = activeStatus;
        if (discountType !== undefined) updateData.discountType = dType;
        if (discountValue !== undefined) updateData.discountValue = dValue;
        if (targetAudience !== undefined) updateData.targetAudience = tAudience;

        await ob.update(updateData);
        res.json({ message: "Offer Banner Updated!", offerBanner: ob });
    } catch (e) {
        if (req.file) fs.unlinkSync(path.join(process.cwd(), 'uploads', req.file.filename));
        res.status(500).json({ error: e.message });
    }
};

// 5. DELETE
exports.deleteOfferBanner = async (req, res) => {
    try {
        const ob = await OfferBanner.findByPk(req.params.id);
        if (!ob) return res.status(404).json({ message: "Not found" });
        
        const imgPath = path.join(process.cwd(), 'uploads', ob.image);
        if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
        
        await ob.destroy();
        res.json({ message: "Offer Banner Deleted!" });
    } catch (e) { res.status(500).json({ error: e.message }); }
};
