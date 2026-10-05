const { test } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
process.env.JWT_SECRET = 'review-test-secret';
let rows = [], sentCode = '', emailFails = false;
const orders = {
    registered: { orderId: 'registered', customerId: 1, customerType: 'REGISTERED', orderStatus: 'Delivered', snapName: 'Buyer' },
    guest: { orderId: 'guest', customerId: null, customerType: 'GUEST', orderStatus: 'Delivered', guestEmail: 'test@example.com', snapName: 'Guest Buyer' },
    pending: { orderId: 'pending', customerId: 1, customerType: 'REGISTERED', orderStatus: 'Shipped' }
};
const matches = (row, where = {}) => Object.entries(where).every(([key, value]) => String(row[key]) === String(value));
const decorate = row => ({ ...row, toJSON() { return { ...row, customerInfo: row.customerId ? { name: 'Buyer' } : null, orderInfo: { snapName: orders[row.orderId]?.snapName } }; }, async update(values) { Object.assign(row, values); return decorate(row); }, async destroy() { rows = rows.filter(item => item.id !== row.id); } });
let transactionQueue = Promise.resolve();
const models = {
    Customer: { findByPk: async id => Number(id) === 1 ? { id: 1 } : null },
    Admin: { findByPk: async id => Number(id) === 1 ? { id: 1 } : null }, Product: {},
    Order: { findByPk: async id => orders[id] || null },
    OrderSlot: { findOne: async ({ where }) => Number(where.productId) >= 1 && Number(where.productId) <= 10 ? where : null },
    Review: {
        findAll: async ({ where } = {}) => rows.filter(row => matches(row, where)).map(decorate),
        findOne: async ({ where }) => { const row = rows.find(row => matches(row, where)); return row ? decorate(row) : null; },
        findByPk: async id => { const row = rows.find(row => row.id === Number(id)); return row ? decorate(row) : null; },
        create: async values => { const row = { id: Math.max(0, ...rows.map(item => item.id)) + 1, ...values }; rows.push(row); return decorate(row); }
    },
    sequelize: { transaction: fn => { const next = transactionQueue.then(() => fn({ LOCK: { UPDATE: 'UPDATE' } })); transactionQueue = next.catch(() => {}); return next; } }
};
function mock(name, exports) { const id = require.resolve(name); require.cache[id] = { id, filename: id, loaded: true, exports }; }
mock('../models', models);
mock('../utils/mailer', { sendMail: async message => { if (emailFails) throw Error('SMTP failed'); sentCode = message.text.match(/\d{6}/)[0]; return { accepted: ['test@example.com'] }; } });
mock('../models/securityModels', { OrderAccess: { findOne: async ({ where }) => where.sessionId === 'guest-session' && where.orderId === 'guest' ? where : null } });
const app = express(); app.use(express.json());
// Test-only session resolver. The real database cookie resolver is exercised by test:security.
app.use((req, res, next) => {
 if (req.headers.cookie === 'test-session=customer') req.customerId = 1;
 if (req.headers.cookie === 'test-session=admin') req.adminId = 1;
 if (req.headers.cookie === 'test-session=guest') req.sessionRecord = { id: 'guest-session' };
 next();
});
app.use('/reviews', require('../routes/reviewRoutes'));
const userHeaders = { Cookie: 'test-session=customer' };
const adminHeaders = { Cookie: 'test-session=admin' };
const guestHeaders = { Cookie: 'test-session=guest' };
const badHeaders = { Authorization: 'Bearer ' + jwt.sign({ id: 2 }, process.env.JWT_SECRET) };
const uploaded = [];
test('delivered product reviews, ownership, moderation and optional media', async () => {
    const server = app.listen(0, '127.0.0.1');
    await new Promise(resolve => server.on('listening', resolve));
    const base = 'http://127.0.0.1:' + server.address().port + '/reviews';
    async function request(url, { method = 'GET', headers = {}, body } = {}) {
        const multipart = body instanceof FormData;
        const response = await fetch(base + url, { method, headers: { ...headers, ...(!multipart && body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? multipart ? body : JSON.stringify(body) : undefined });
        return { status: response.status, data: await response.json() };
    }
    try {
        assert.equal((await request('/all')).status, 401);
        assert.equal((await request('/all', { headers: userHeaders })).status, 401);
        assert.equal((await request('/all', { headers: { 'x-admin-request': 'true' } })).status, 401);
        assert.equal((await request('/order/registered', { headers: badHeaders })).status, 401);
        assert.equal((await request('/order/registered', { headers: guestHeaders })).status, 401);
        const body = { rating: 4, feedback: 'A lovely product' };
        assert.equal((await request('/order/pending/product/1', { method: 'POST', headers: userHeaders, body })).status, 400);
        assert.equal((await request('/order/registered/product/99', { method: 'POST', headers: userHeaders, body })).status, 400);
        assert.equal((await request('/order/registered/product/1', { method: 'POST', headers: userHeaders, body: { ...body, rating: 6 } })).status, 400);
        for (let product = 1; product <= 10; product++) assert.equal((await request('/order/registered/product/' + product, { method: 'POST', headers: userHeaders, body })).status, 201);
        assert.equal((await request('/order/registered', { headers: userHeaders })).data.length, 10);
        assert.equal((await request('/order/registered/product/1', { method: 'POST', headers: userHeaders, body })).status, 409);
        assert.equal((await request('/product/1')).data.length, 0);
        const reviewId = rows.find(row => row.orderId === 'registered' && String(row.productId) === '1').id;
        assert.equal((await request('/update/' + reviewId, { method: 'PUT', headers: userHeaders, body: { status: 'published' } })).status, 401);
        assert.equal((await request('/update/' + reviewId, { method: 'PUT', headers: adminHeaders, body: { status: 'published', rating: 5, feedback: 'Edited review' } })).status, 200);
        let published = (await request('/product/1')).data;
        assert.equal(published.length, 1); assert.equal(published[0].rating, 5); assert.equal(published[0].orderId, undefined);
        assert.equal((await request('/order/registered/product/1', { method: 'PUT', headers: userHeaders, body })).status, 200);
        assert.equal((await request('/product/1')).data.length, 0);
        assert.equal((await request('/update/' + reviewId, { method: 'PUT', headers: adminHeaders, body: { status: 'rejected' } })).status, 200);
        assert.equal((await request('/product/1')).data.length, 0);
        assert.equal((await request('/order/registered/product/1', { method: 'DELETE', headers: badHeaders })).status, 401);
        assert.equal((await request('/order/registered/product/1', { method: 'DELETE', headers: userHeaders })).status, 200);
        const form = new FormData(); form.set('rating', '5'); form.set('feedback', 'Guest photo and video review');
        form.append('images', new Blob([new Uint8Array([255,216,255,217])], { type: 'image/jpeg' }), 'photo.jpg');
        form.append('images', new Blob(['video test'], { type: 'video/mp4' }), 'video.mp4');
        const guest = await request('/order/guest/product/1', { method: 'POST', headers: guestHeaders, body: form });
        assert.equal(guest.status, 201); assert.equal(guest.data.customerId, null);
        uploaded.push(...JSON.parse(guest.data.images)); assert.equal(uploaded.length, 2);
        assert.equal((await request('/order/guest/product/1', { method: 'PUT', headers: guestHeaders, body: { ...body, retainedMedia: '["someone-elses-file.jpg"]' } })).status, 400);
        await request('/update/' + guest.data.id, { method: 'PUT', headers: adminHeaders, body: { status: 'published' } });
        published = (await request('/product/1')).data; assert.equal(published[0].reviewerName, 'Guest Buyer'); assert.equal(JSON.parse(published[0].images).length, 2);
        const badFile = new FormData(); badFile.set('rating', '4'); badFile.set('feedback', 'Bad file'); badFile.append('images', new Blob(['html'], { type: 'text/html' }), 'file.html');
        assert.equal((await request('/order/guest/product/2', { method: 'POST', headers: guestHeaders, body: badFile })).status, 400);
        const results = await Promise.all([1,2].map(() => request('/order/guest/product/2', { method: 'POST', headers: guestHeaders, body })));
        assert.deepEqual(results.map(result => result.status).sort(), [201,409]);
        await request('/order/guest/product/1', { method: 'DELETE', headers: guestHeaders });
        assert.equal((await request('/product/1')).data.length, 0);
        assert.ok(uploaded.every(file => !fs.existsSync(path.join(__dirname, '..', 'uploads', file))));
    } finally {
        for (const file of uploaded) { try { fs.unlinkSync(path.join(__dirname, '..', 'uploads', file)); } catch (_) {} }
        await new Promise(resolve => server.close(resolve));
    }
});
