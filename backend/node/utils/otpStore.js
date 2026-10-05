const crypto = require('crypto');
const { Challenge } = require('../models/securityModels');
const { sequelize } = require('../models');
const hash = value => crypto.createHmac('sha256', process.env.JWT_SECRET).update(value).digest('hex');
function otpStore(scope) {
 const id = key => crypto.createHash('sha256').update(scope + ':' + key).digest('hex');
 return {
  async set(key, values) {
   const { otp, ...data } = values;
   await Challenge.upsert({ id: id(key), scope, codeHash: hash(id(key) + ':' + otp), attempts: 0, verified: Boolean(data.verified), expiresAt: new Date(data.expiresAt || Date.now() + 600000), data });
  },
  async get(key) {
   const row = await Challenge.findByPk(id(key));
   if (!row || row.expiresAt < new Date() || row.attempts >= 5) return null;
   return { ...row.data, verified: row.verified, expiresAt: +row.expiresAt };
  },
  async check(key, otp, consume = false) {
   return sequelize.transaction(async transaction => {
    const row = await Challenge.findByPk(id(key), { transaction, lock: transaction.LOCK.UPDATE });
    if (!row || row.expiresAt < new Date() || row.attempts >= 5) return false;
    const expected = hash(id(key) + ':' + String(otp));
    if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(row.codeHash))) {
     await row.increment('attempts', { transaction }); return false;
    }
    if (consume) await row.destroy({ transaction });
    else await row.update({ verified: true }, { transaction });
    return true;
   });
  },
  async delete(key) { await Challenge.destroy({ where: { id: id(key) } }); },
  async verify(key) { await Challenge.update({ verified: true }, { where: { id: id(key) } }); }
 };
}
module.exports = otpStore;
