const validatePromotion = (data, coupon = false) => {
    const type = coupon ? data.type : data.discountType;
    const value = Number(data.discountValue);
    if (!(coupon ? ['percentage', 'flat'] : ['PERCENTAGE', 'FLAT']).includes(type)) throw new Error('Select a valid discount type.');
    if (!Number.isFinite(value) || value <= 0 || (type.toLowerCase() === 'percentage' && value > 100)) throw new Error('Percentage must be greater than 0 and at most 100; flat discount must be positive.');
    const start = new Date(data.startDate).getTime();
    const end = new Date(coupon ? data.endDate : data.expiryDate).getTime();
    if (!data.startDate || !(coupon ? data.endDate : data.expiryDate) || !Number.isFinite(start) || !Number.isFinite(end) || end <= start) throw new Error('Valid start and expiry times are required; expiry must be after start.');
    if (coupon) {
        for (const key of ['minOrderAmount', 'maxOrderAmount', 'maxDiscount']) {
            if (data[key] != null && data[key] !== '' && (!Number.isFinite(Number(data[key])) || Number(data[key]) < 0)) throw new Error('Coupon amounts must be non-negative numbers.');
        }
        if (Number(data.maxOrderAmount) > 0 && Number(data.minOrderAmount) > Number(data.maxOrderAmount)) throw new Error('Maximum order amount must be at least the minimum.');
        if (!Number.isSafeInteger(Number(data.usageLimit)) || Number(data.usageLimit) < 1) throw new Error('Usage limit must be a positive integer.');
    }
};
module.exports = { validatePromotion };
