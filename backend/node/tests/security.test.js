const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const tag = 'security-test-' + crypto.randomUUID();
process.env.SECURITY_RATE_NAMESPACE = tag;
const models = require('../models');
const { Session, Challenge, OrderAccess, Preference, RateBucket, syncSecurityTables } = require('../models/securityModels');
const security = require('../utils/sessionSecurity');
const mailer = require('../utils/mailer');
let sentOtp = '';
mailer.sendMail = async message => { sentOtp = String(message.text || message.html).match(/\b\d{6}\b/)?.[0] || ''; return { accepted: ['test@example.invalid'], rejected: [], messageId: 'test' }; };
const sms = require('../utils/smsService');
for (const key of Object.keys(sms)) if (typeof sms[key] === 'function') sms[key] = async () => ({ success: true });
const { app } = require('../server');
test('database sessions, CSRF, permissions, OTP persistence, guest privacy and logout', async () => {
 await syncSecurityTables();
 const password = 'TestPassword123!';
 const customer = await models.Customer.create({ name: 'Security Test', email: tag + '@example.invalid', phone: '0000000000', password: await bcrypt.hash(password, 10) });
 const admin = await models.Admin.create({ email: 'admin-' + tag + '@example.invalid', password: await bcrypt.hash(password, 10), role: 'admin' });
 const orderId = tag;
 await models.Order.create({ orderId, customerType: 'GUEST', guestEmail: tag + '@example.invalid', totalAmount: 100, orderStatus: 'Delivered', snapName: 'Test Guest' });
 const server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.on('listening', resolve));
 const base = 'http://127.0.0.1:' + server.address().port;
 const sessions = new Set(), rates = new Set();
 function browser(channel = 'store') {
  return { channel, cookie: '', csrf: '', async call(url, method = 'GET', data, extra = {}) {
   const path = url.split('?')[0];
   if (!['GET','HEAD'].includes(method)) rates.add(security.digest(tag + '127.0.0.1:' + path.replace(/^\/api/, '').toLowerCase() + ':' + Math.floor(Date.now() / 900000)));
   const headers = { Cookie: this.cookie, 'X-Client-Type': channel, 'X-CSRF-Token': this.csrf, ...extra };
   if (data) headers['Content-Type'] = 'application/json';
   const response = await fetch(base + url, { method, headers, body: data ? JSON.stringify(data) : undefined });
   const cookie = response.headers.get('set-cookie');
   if (cookie) { this.cookie = cookie.split(';')[0]; const raw = this.cookie.split('=')[1]; sessions.add(security.digest(raw)); }
   if (response.headers.get('x-csrf-token')) this.csrf = response.headers.get('x-csrf-token');
   let body; try { body = await response.json(); } catch { body = null; }
   if (body?.csrfToken) this.csrf = body.csrfToken;
   return { status: response.status, body, cookie, headers: response.headers };
  } };
 }
 try {
  const guest = browser(), other = browser(), owner = browser(), panel = browser('admin');
  const init = await guest.call('/api/session'); assert.equal(init.status, 200); assert.match(init.cookie, /HttpOnly/i); assert.match(init.cookie, /SameSite=Lax/i); assert.equal(init.body.customer, null);
  const rawCookie = guest.cookie.split('=')[1]; assert.equal(await Session.findByPk(rawCookie), null); assert.ok(await Session.findByPk(security.digest(rawCookie)));
  assert.equal((await guest.call('/api/admin/all', 'GET', null, { 'x-admin-request': 'true' })).status, 401);
  assert.equal((await guest.call('/api/orders/all')).status, 401);
  assert.equal((await guest.call('/api/customers/all')).status, 401);
  assert.equal((await guest.call('/api/admin/seed-default')).status, 401);
  assert.equal((await guest.call('/api/settings', 'PUT', { PRIVATE_KEY: 'test' }, { 'X-CSRF-Token': '' })).status, 403);
  assert.equal((await guest.call('/api/session/preferences', 'PUT', { dealDismissed: true }, { 'X-CSRF-Token': '?'.repeat(64) })).status, 403);
  assert.equal((await guest.call('/api/session/preferences', 'PUT', { dealDismissed: true })).status, 200);
  assert.equal((await guest.call('/api/session')).body.preferences.dealDismissed, true);
  const denied = await guest.call('/api/orders/track/' + orderId); assert.equal(denied.status, 401); assert.equal(denied.body.verificationRequired, true); assert.equal(denied.body.order, undefined);
  await other.call('/api/session');
  await guest.call('/api/session/order/request-access', 'POST', { orderId });
  assert.ok(sentOtp); const otp = sentOtp;
  const challengeRows = await Challenge.findAll({ where: { scope: 'order-access' } });
  assert.ok(challengeRows.some(row => row.codeHash.length === 64)); assert.ok(challengeRows.every(row => !JSON.stringify(row.toJSON()).includes('"otp"')));
  assert.equal((await other.call('/api/session/order/verify-access','POST',{ orderId, otp })).status, 400);
  assert.equal((await guest.call('/api/session/order/verify-access','POST',{ orderId, otp })).status, 200);
  assert.equal((await guest.call('/api/orders/track/' + orderId)).status, 200);
  assert.equal((await other.call('/api/orders/track/' + orderId)).status, 401);
  assert.equal((await guest.call('/api/session/order/verify-access','POST',{ orderId, otp })).status, 400);
  assert.equal((await guest.call('/api/session/guest-orders')).body[0].orderId, orderId);
  await owner.call('/api/session'); const old = owner.cookie;
  const login = await owner.call('/api/customers/login','POST',{ email: customer.email, password }); assert.equal(login.status,200); assert.notEqual(owner.cookie,old); assert.equal(login.body.token,undefined); assert.equal(login.body.customer.password,undefined);
  assert.equal((await owner.call('/api/customers/' + customer.id)).status,200);
  assert.equal((await guest.call('/api/customers/' + customer.id)).status,401);
  assert.equal((await owner.call('/api/customers/' + (customer.id + 100000))).status,403);
  assert.equal((await owner.call('/api/admin/all')).status,401);
  await panel.call('/api/session'); assert.equal((await panel.call('/api/admin/login','POST',{ email: admin.email,password })).status,200);
  assert.equal((await panel.call('/api/admin/all')).status,200);
  const stolenCustomerHeader = { Authorization: 'Bearer forged', 'x-admin-request': 'true' }; assert.equal((await owner.call('/api/admin/all','GET',null,stolenCustomerHeader)).status,401);
  assert.equal((await owner.call('/api/orders/guest-place','POST',{ isGuestCheckout:true,guestDetails:{ name:'Test',email:customer.email,phone:'0000000000' },items:[],totalAmount:100,paymentStatus:'Paid' })).status,400);
  const beforeLogout=owner.cookie; await owner.call('/api/session/logout','POST'); assert.equal((await owner.call('/api/session')).body.customer,null);
  assert.equal((await Session.findByPk(security.digest(beforeLogout.split('=')[1]))),null);
  const otpStore = require('../utils/otpStore')('security-test'); await otpStore.set(tag,{otp:'654321',expiresAt:Date.now()+60000});
  for(let i=0;i<5;i++) assert.equal(await otpStore.check(tag,'000000'),false);
  assert.equal(await otpStore.check(tag,'654321'),false); await otpStore.delete(tag);
  const expired=await Session.findByPk(security.digest(other.cookie.split('=')[1])); await expired.update({expiresAt:new Date(0)}); assert.equal((await other.call('/api/orders/track/'+orderId)).status,401);
 } finally {
  await new Promise(resolve => server.close(resolve));
  await OrderAccess.destroy({where:{orderId}});
  await models.Order.destroy({where:{orderId},force:true});
  await Session.destroy({where:{id:[...sessions]}});
  await Preference.destroy({where:{id:[...sessions].map(id=>'session:'+id).concat(['customer:'+customer.id,'admin:'+admin.id])}});
  const challenges=await Challenge.findAll(); for(const row of challenges) if(row.scope==='order-access' && sessions.size && row.data?.sentAt && Date.now()-row.data.sentAt<60000) { /* Consumed challenge is already deleted. */ }
  await RateBucket.destroy({where:{id:[...rates]}});
  await models.Customer.destroy({where:{id:customer.id},force:true});
  await models.Admin.destroy({where:{id:admin.id}});
  await models.sequelize.close();
 }
});
