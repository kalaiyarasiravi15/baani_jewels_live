const { Op } = require('sequelize');
const { Deal, OfferBanner, Coupon } = require('../models');
async function expirePromotions() {
    const now = new Date();
    await Promise.all([
        Deal.update({ isActive: false }, { where: { isActive: true, expiryDate: { [Op.lte]: now } } }),
        OfferBanner.update({ status: false }, { where: { status: true, expiryDate: { [Op.lte]: now } } }),
        Coupon.update({ status: false }, { where: { status: true, endDate: { [Op.lte]: now } } })
    ]);
}
function startPromotionExpiry() {
    let running = false;
    const tick = async () => {
        if (running) return;
        running = true;
        try { await expirePromotions(); } catch (error) { console.error('Promotion expiry failed:', error.message); }
        finally { running = false; }
    };
    tick();
    const timer = setInterval(tick, 1000);
    timer.unref();
    return timer;
}
module.exports = { expirePromotions, startPromotionExpiry };
