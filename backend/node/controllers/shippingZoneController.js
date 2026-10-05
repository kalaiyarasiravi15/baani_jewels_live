const { ShippingZone } = require('../models/index');

const { STATES, DEFAULTS, getZoneType, getShippingRate, quotePincode, applyFreeShippingRule } = require('../utils/shippingPolicy');
const validAmount = a => a !== '' && a !== null && Number.isFinite(Number(a)) && Number(a) >= 0 && Number(a) <= 99999999.99;

// Admin: Get all zones
exports.getAll = async (req, res) => {
    try {
        const zones = await ShippingZone.findAll({ order: [['zoneType', 'ASC'], ['stateName', 'ASC']] });
        res.json({ success: true, data: zones, states: STATES, defaults: DEFAULTS });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};

// Admin: Add zone
exports.create = async (req, res) => {
    try {
        const { zoneType, amount, country = 'India' } = req.body;
        const stateName = String(req.body.stateName || '').trim();
        if (country !== 'India' || !STATES[zoneType] || !stateName || !validAmount(amount) || (stateName !== 'DEFAULT' && !STATES[zoneType].includes(stateName))) {
            return res.status(400).json({ success: false, message: 'Choose an Indian zone, matching state and a non-negative amount.' });
        }
        const existing = await ShippingZone.findOne({ where: { zoneType, stateName } });
        if (existing) return res.status(409).json({ success: false, message: 'Rate already exists. Edit the existing rate.' });
        const zone = await ShippingZone.create({ zoneType, stateName: stateName.trim(), amount: Number(amount), isActive: true });
        res.json({ success: true, data: zone });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};

// Admin: Update zone
exports.update = async (req, res) => {
    try {
        const { id } = req.params;
        const { amount, isActive } = req.body;
        if ((amount !== undefined && !validAmount(amount)) || (isActive !== undefined && typeof isActive !== 'boolean')) return res.status(400).json({ success: false, message: 'Invalid amount or active status.' });
        const zone = await ShippingZone.findByPk(id);
        if (!zone) return res.status(404).json({ success: false, message: 'Zone not found' });
        await zone.update({ amount: amount !== undefined ? Number(amount) : zone.amount, isActive: isActive !== undefined ? isActive : zone.isActive });
        res.json({ success: true, data: zone });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};

// Admin: Delete zone
exports.remove = async (req, res) => {
    try {
        const { id } = req.params;
        const zone = await ShippingZone.findByPk(id);
        if (!zone) return res.status(404).json({ success: false, message: 'Zone not found' });
        await zone.destroy();
        res.json({ success: true, message: 'Deleted' });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};

exports.getRateByState = async (req, res) => {
    try {
        const quoteOptions = { subtotal: req.query.subtotal, paymentMethod: req.query.paymentMethod || 'Online' };
        const rate = req.query.pincode
            ? await quotePincode(req.query.pincode, req.query.country, quoteOptions)
            : await applyFreeShippingRule(
                await getShippingRate(req.query.state, req.query.country),
                quoteOptions.subtotal,
                quoteOptions.paymentMethod
            );
        res.json({ success: true, ...rate });
    } catch (e) { res.status(400).json({ success: false, message: e.message }); }
};
exports.getZoneType = getZoneType;
