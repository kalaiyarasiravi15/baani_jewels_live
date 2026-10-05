const STATES = {
    LOCAL: ['Tamil Nadu'],
    ZONAL: ['Karnataka', 'Kerala', 'Andhra Pradesh', 'Telangana'],
    REGIONAL: ['Andaman and Nicobar Islands', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chandigarh', 'Chhattisgarh', 'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jammu and Kashmir', 'Jharkhand', 'Ladakh', 'Lakshadweep', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Puducherry', 'Punjab', 'Rajasthan', 'Sikkim', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal']
};
const DEFAULTS = { LOCAL: 85, ZONAL: 99, REGIONAL: 150 };
const normalize = value => String(value || '').toLowerCase().replace(/[^a-z]/g, '');
function getZoneType(state) {
    const key = normalize(state);
    const aliases = {
        pondicherry: 'puducherry',
        orissa: 'odisha',
        nctofdelhi: 'delhi',
        andamanandnicobar: 'andamanandnicobarislands',
        andamannicobarislands: 'andamanandnicobarislands',
        jammukashmir: 'jammuandkashmir',
        dadraandnagarhaveli: 'dadraandnagarhavelianddamananddiu',
        damananddiu: 'dadraandnagarhavelianddamananddiu'
    };
    const normalized = aliases[key] || key;
    const zone = Object.keys(STATES).find(type => STATES[type].some(s => normalize(s) === normalized));
    if (!zone) throw new Error('Please select a valid Indian state.');
    return zone;
}
async function getShippingRate(state, country = 'India') {
    if (!['india', 'in'].includes(String(country).toLowerCase())) throw new Error('International shipping is quoted manually through WhatsApp.');
    const zoneType = getZoneType(state);
    const { ShippingZone } = require('../models');
    const rows = await ShippingZone.findAll({ where: { zoneType, isActive: true }, order: [['updatedAt', 'DESC'], ['id', 'DESC']] });
    const rate = rows.find(row => normalize(row.stateName) === normalize(state)) || rows.find(row => row.stateName === 'DEFAULT');
    return { country: 'India', state, zoneType, zoneName: { LOCAL: 'Local (Tamil Nadu)', ZONAL: 'Zonal', REGIONAL: 'Regional (Pan India)' }[zoneType], amount: rate ? Number(rate.amount) : DEFAULTS[zoneType], configured: Boolean(rate) };
}

// The zone rate is always calculated first.  The free-shipping setting is an
// online-payment override of that rate, not a replacement for zone management.
async function applyFreeShippingRule(rate, subtotal, paymentMethod = 'Online') {
    const numericSubtotal = Number(subtotal);
    const isOnlinePayment = String(paymentMethod || '').trim().toLowerCase().startsWith('online');
    const baseRate = Number(rate.amount || 0);

    const { Setting } = require('../models');
    const settings = await Setting.findAll({
        where: { key: ['FREE_SHIPPING_ONLINE_ACTIVE', 'FREE_SHIPPING_ONLINE_THRESHOLD'] }
    });
    const config = Object.fromEntries(settings.map(setting => [setting.key, setting.value]));
    const enabled = String(config.FREE_SHIPPING_ONLINE_ACTIVE).toLowerCase() === 'true';
    const threshold = Number(config.FREE_SHIPPING_ONLINE_THRESHOLD);
    const hasValidThreshold = Number.isFinite(threshold) && threshold >= 0;
    const qualifies = isOnlinePayment && enabled && hasValidThreshold && Number.isFinite(numericSubtotal) && numericSubtotal >= threshold;

    return {
        ...rate,
        zoneAmount: baseRate,
        amount: qualifies ? 0 : baseRate,
        isFreeShipping: qualifies,
        freeShippingThreshold: hasValidThreshold ? threshold : null,
        freeShippingReason: qualifies ? `Free shipping on online orders of ₹${threshold} and above.` : null
    };
}
const pinCache = new Map();
async function resolvePincode(pincode) {
    const pin = String(pincode || '').trim();
    if (!/^[1-9]\d{5}$/.test(pin)) throw new Error('Enter a valid six-digit pincode.');
    const cached = pinCache.get(pin);
    if (cached && cached.expires > Date.now()) return cached.address;
    const response = await fetch(`https://api.postalpincode.in/pincode/${pin}`, { signal: AbortSignal.timeout(8000) });
    if (!response.ok) throw new Error('Pincode lookup unavailable. Please try again.');
    const data = (await response.json())?.[0];
    if (data?.Status !== 'Success' || !data.PostOffice?.length) throw new Error('Pincode not found. Please check your pincode.');
    const post = data.PostOffice[0];
    getZoneType(post.State);
    const address = { state: post.State, district: post.District, areas: [...new Set(data.PostOffice.map(p => p.Name))], pincode: pin };
    if (pinCache.size >= 1000) pinCache.delete(pinCache.keys().next().value);
    pinCache.set(pin, { address, expires: Date.now() + 3600000 });
    return address;
}
async function quotePincode(pincode, country = 'India', { subtotal, paymentMethod } = {}) {
    if (!['india', 'in'].includes(String(country).toLowerCase())) throw new Error('International shipping is quoted manually through WhatsApp.');
    const address = await resolvePincode(pincode);
    const rate = await getShippingRate(address.state, country);
    return { ...await applyFreeShippingRule(rate, subtotal, paymentMethod), ...address };
}
module.exports = { STATES, DEFAULTS, getZoneType, getShippingRate, resolvePincode, quotePincode, applyFreeShippingRule };
