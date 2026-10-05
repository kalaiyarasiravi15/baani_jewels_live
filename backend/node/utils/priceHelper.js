const { Op } = require('sequelize');
const { Deal, OfferBanner, Product, ProductVariant, Coupon } = require('../models');

/**
 * Fetches active promotions once. Targets may be shop-wide, product, category, or collection.
 */
const getActiveDiscountContext = async () => {
    try {
        const now = new Date();
        const activeDateWhere = {
            [Op.or]: [
                { startDate: null },
                { startDate: { [Op.lte]: now } }
            ]
        };
        
        // 1. Fetch active global deals
        const activeDeals = await Deal.findAll({
            where: {
                isActive: true,
                expiryDate: { [Op.gt]: now },
                ...activeDateWhere
            },
            order: [['createdAt', 'DESC']]
        });

        // 2. Fetch active offer banners that target a specific product
        const activeOffers = await OfferBanner.findAll({
            where: {
                status: true,
                [Op.and]: [{ [Op.or]: [{ expiryDate: null }, { expiryDate: { [Op.gt]: now } }] }],
                ...activeDateWhere
            }
        });

        return { activeDeals, activeOffers };
    } catch (err) {
        console.error('[getActiveDiscountContext Error]', err.message);
        throw new Error('Unable to verify current promotions. Please retry.');
    }
};

const formatProductWithDiscounts = (productJSON, context) => {
    if (!context) return productJSON;
    const { activeDeals = [], activeOffers = [] } = context;

    const mrp = productJSON.mrpPrice !== null ? Number(productJSON.mrpPrice) : null;
    const dbSales = productJSON.salesPrice !== null ? Number(productJSON.salesPrice) : null;
    const promotionBasePrice = mrp > 0 ? mrp : dbSales;
    
    let salesPrice = dbSales !== null ? dbSales : mrp;
    let discountPercentage = 0;
    let discountType = 'None';
    
    const matchesTarget = (promotion) => {
        const type = promotion.targetType || (promotion.productId ? 'PRODUCT' : 'SHOP');
        return (type === 'PRODUCT' && Number(promotion.productId || promotion.targetProductId) === Number(productJSON.id))
          || (type === 'CATEGORY' && Number(promotion.targetCategoryId) === Number(productJSON.categoryId))
          || (type === 'COLLECTION' && Number(promotion.targetCollectionId) === Number(productJSON.collectionId))
          || type === 'SHOP';
    };
    const priority = { PRODUCT: 4, CATEGORY: 3, COLLECTION: 2, SHOP: 1 };
    let appliedDiscountSource = null;
    let appliedDiscountType = null;
    let appliedDiscountValue = 0;
    let appliedPromotionLabel = null;

    const calculateDiscount = (basePrice, type, value) => {
        if (!basePrice || basePrice <= 0) return null;
        if (!Number.isFinite(value) || (type === 'PERCENTAGE' && value > 100)) return null;
        let discounted = basePrice;
        let calcPerc = 0;
        
        if (type === 'FLAT' && value > 0) {
            discounted = basePrice - value;
            calcPerc = Math.round((value / basePrice) * 100);
        } else if ((type === 'PERCENTAGE' || !type) && value > 0) {
            discounted = basePrice - (basePrice * value / 100);
            calcPerc = value;
        } else {
            return null;
        }
        
        if (discounted < 0) discounted = 0;
        return { price: Math.round(discounted * 100) / 100, percentage: calcPerc };
    };

    // Promotions never change the product record. Pick one applicable promotion:
    // product > category > collection > entire shop; at the same scope the
    // customer receives the lower final price. Deals and offers do not stack.
    const candidates = [
        ...activeOffers.map(p => ({ promotion: p, source: 'Offer Banner' })),
        ...activeDeals.map(p => ({ promotion: p, source: 'Deal of the Day' }))
    ].filter(({ promotion }) => matchesTarget(promotion)).map(({ promotion, source }) => {
        const type = promotion.discountType || 'PERCENTAGE';
        const value = Number(promotion.discountValue || promotion.discountPercentage || 0);
        return { promotion, source, type, value, result: calculateDiscount(promotionBasePrice, type, value) };
    }).filter(candidate => candidate.result);

    if (candidates.length && promotionBasePrice > 0) {
        candidates.sort((a, b) => {
            const scope = (priority[b.promotion.targetType || 'SHOP'] || 0) - (priority[a.promotion.targetType || 'SHOP'] || 0);
            if (scope) return scope;
            return a.result.price - b.result.price;
        });
        const winner = candidates[0];
        salesPrice = winner.result.price;
        discountPercentage = winner.result.percentage;
        discountType = winner.source;
        appliedDiscountSource = winner.source;
        appliedDiscountType = winner.type;
        appliedDiscountValue = winner.value;
        appliedPromotionLabel = winner.source === 'Offer Banner'
            ? (winner.promotion.discountTag || winner.promotion.title || 'Offer')
            : (winner.promotion.title || 'Deal of the Day');
    }

    // Format variants if they exist
    let variants = productJSON.variants;
    if (variants && variants.length > 0) {
        variants = variants.map(v => {
            const vmrp = v.mrpPrice !== null ? Number(v.mrpPrice) : null;
            const vdbSales = v.salesPrice !== null ? Number(v.salesPrice) : null;
            let vsalesPrice = vdbSales !== null ? vdbSales : vmrp;
            const variantPromotionBase = vmrp > 0 ? vmrp : vdbSales;

            if (appliedDiscountSource && variantPromotionBase > 0) {
                const result = calculateDiscount(variantPromotionBase, appliedDiscountType, appliedDiscountValue);
                if (result) {
                    vsalesPrice = result.price;
                }
            }
            return {
                ...v,
                salesPrice: vsalesPrice !== null ? Number(vsalesPrice) : null,
                mrpPrice: vmrp
            };
        });
    }

    return {
        ...productJSON,
        salesPrice: salesPrice !== null ? Number(salesPrice) : null,
        mrpPrice: mrp,
        discountPercentage,
        discountType,
        promotionSource: appliedDiscountSource,
        promotionLabel: appliedPromotionLabel,
        promotionDiscountType: appliedDiscountType,
        promotionDiscountValue: appliedDiscountValue,
        originalPrice: promotionBasePrice !== null ? Number(promotionBasePrice) : null,
        variants
    };
};

/**
 * Calculates the exact final order total securely on the server-side.
 * Used for mitigating Request Amount Tampering vulnerabilities.
 */
const calculateServerOrderTotal = async (items, shippingAmount, couponId, giftWrap = false) => {
    if (!Array.isArray(items) || !items.length || items.length > 100) throw new Error('A valid cart is required.');
    if (!Number.isFinite(Number(shippingAmount)) || Number(shippingAmount) < 0) throw new Error('Invalid delivery charge.');
    if (typeof giftWrap !== 'boolean') throw new Error('Invalid gift wrap selection.');
    let subTotal = 0;
    const lineItems = [];
    
    // 1. Get discount context
    const context = await getActiveDiscountContext();

    // 2. Loop through items and fetch prices
    for (let item of items) {
        if (!Number.isSafeInteger(Number(item?.productId)) || Number(item.productId) < 1) throw new Error('Invalid product.');
        if (!Number.isSafeInteger(Number(item.quantity)) || Number(item.quantity) < 1 || Number(item.quantity) > 1000) throw new Error('Quantity must be a positive whole number, at most 1000.');
        
        const product = await Product.findByPk(item.productId, {
            include: [{ model: ProductVariant, as: 'variants' }]
        });
        
        if (!product || !product.status) throw new Error(`Product unavailable: ${item.productId}`);
        
        // Format product to get applicable active deals/banners
        const formattedProduct = formatProductWithDiscounts(product.toJSON(), context);
        
        let unitPrice = formattedProduct.salesPrice;
        let mrpPrice = formattedProduct.mrpPrice ?? unitPrice;
        const selectable = (formattedProduct.variants || []).filter(v => v.status && v.variantType && v.variantValue);
        if (!item.variantId && selectable.length) {
            // Resolve the same default variant for pricing and inventory, using DB data only.
            item.variantId = (selectable.find(v => Number(v.stock) >= Number(item.quantity)) || selectable[0]).id;
        }
        
        // If variant is selected, fetch variant's discounted price
        if (item.variantId) {
            const formattedVariant = formattedProduct.variants?.find(v => Number(v.id) === Number(item.variantId));
            if (formattedVariant && formattedVariant.status) {
                unitPrice = formattedVariant.salesPrice;
                mrpPrice = formattedVariant.mrpPrice ?? unitPrice;
            } else {
                throw new Error('The selected variant is unavailable or belongs to another product.');
            }
        }
        if (unitPrice == null || !Number.isFinite(Number(unitPrice)) || Number(unitPrice) < 0) throw new Error('Invalid product price.');
        unitPrice = Number(unitPrice);
        const quantity = Number(item.quantity);
        subTotal += unitPrice * quantity;
        lineItems.push({
            unitPrice, mrpPrice, quantity,
            promotionSource: formattedProduct.promotionSource || null,
            promotionLabel: formattedProduct.promotionLabel || null,
            promotionDiscountType: formattedProduct.promotionDiscountType || null,
            promotionDiscountValue: formattedProduct.promotionDiscountValue || null
        });
    }
    
    let total = subTotal + Number(shippingAmount || 0);

    // Add gift wrap charge if selected
    const giftWrapFee = Boolean(giftWrap) ? 30 : 0;
    total += giftWrapFee;
    
    // 3. Apply coupon if any
    let discountAmount = 0;
    if (couponId) {
        const coupon = await Coupon.findByPk(couponId);
        const now = new Date();
        const minOrder = Number(coupon?.minOrderAmount || 0);
        const rawMaxOrder = coupon?.maxOrderAmount;
        const maxOrder = rawMaxOrder === null || rawMaxOrder === undefined || Number(rawMaxOrder) === 0 ? null : Number(rawMaxOrder);
        const isCouponValid = coupon && coupon.status
            && now >= new Date(coupon.startDate)
            && now < new Date(coupon.endDate)
            && subTotal >= minOrder
            && (maxOrder === null || subTotal <= maxOrder);

        if (!isCouponValid) throw new Error('Coupon is expired, inactive, or not valid for this subtotal.');
        if (isCouponValid) {
            discountAmount = coupon.type === 'percentage'
                ? (subTotal * Number(coupon.discountValue || 0)) / 100
                : Number(coupon.discountValue || 0);
            if (Number(coupon.maxDiscount) > 0 && discountAmount > Number(coupon.maxDiscount)) {
                discountAmount = Number(coupon.maxDiscount);
            }
            discountAmount = Math.round(Math.min(discountAmount, subTotal) * 100) / 100;
            total -= discountAmount;
        }
    }
    
    return {
        subTotal: Math.round(Math.max(0, subTotal) * 100) / 100,
        discountAmount: Math.max(0, discountAmount),
        shippingAmount: Number(shippingAmount || 0),
        giftWrapFee,
        totalAmount: Math.round(Math.max(0, total) * 100) / 100,
        lineItems
    };
};

module.exports = {
    getActiveDiscountContext,
    formatProductWithDiscounts,
    calculateServerOrderTotal
};
