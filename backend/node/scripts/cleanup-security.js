const { Op } = require('sequelize');
const { sequelize } = require('../models');
const { Session, Challenge, RateBucket, OrderAccess, Preference } = require('../models/securityModels');
(async () => {
 try {
  const expired = await Session.findAll({ where: { expiresAt: { [Op.lt]: new Date() } }, attributes: ['id'] });
  const ids = expired.map(row => row.id);
  await OrderAccess.destroy({ where: { sessionId: { [Op.in]: ids } } });
  await Preference.destroy({ where: { id: { [Op.in]: ids.map(id => 'session:' + id) } } });
  await Session.destroy({ where: { id: { [Op.in]: ids } } });
  await Challenge.destroy({ where: { expiresAt: { [Op.lt]: new Date() } } });
  await RateBucket.destroy({ where: { expiresAt: { [Op.lt]: new Date() } } });
  console.log('Expired security records cleaned. Business records were not changed.');
 } finally { await sequelize.close(); }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
