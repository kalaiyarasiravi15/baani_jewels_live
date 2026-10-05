const { Deal, OfferBanner, Coupon } = require('../models');
const crypto = require('crypto');
exports.getClock = async (req, res) => {
    try {
        const now = new Date();
        const groups = await Promise.all([
            Deal.findAll({ where: { isActive: true }, attributes: ['id', 'startDate', 'expiryDate', 'updatedAt'], raw: true }),
            OfferBanner.findAll({ where: { status: true }, attributes: ['id', 'startDate', 'expiryDate', 'updatedAt'], raw: true }),
            Coupon.findAll({ where: { status: true }, attributes: ['id', 'startDate', 'endDate', 'updatedAt'], raw: true })
        ]);
        const active = [], future = [];
        groups.forEach((rows, group) => rows.forEach(row => {
            const start = row.startDate ? new Date(row.startDate).getTime() : 0;
            const end = row.expiryDate || row.endDate;
            const expiry = end ? new Date(end).getTime() : Infinity;
            if (start <= now.getTime() && expiry > now.getTime()) active.push(`${group}:${row.id}:${new Date(row.updatedAt).getTime()}`);
            for (const time of [start, expiry]) if (Number.isFinite(time) && time > now.getTime()) future.push(time);
        }));
        // No coupon codes, customer data or future campaign details leave this endpoint.
        res.json({ serverTime: now.toISOString(), nextChange: future.length ? new Date(Math.min(...future)).toISOString() : null, signature: crypto.createHash('sha256').update(active.sort().join('|')).digest('hex') });
    } catch { res.status(503).json({ message: 'Unable to refresh promotions.' }); }
};
