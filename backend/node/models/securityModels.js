const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const jsonData = () => ({ type: DataTypes.JSON, allowNull: false, defaultValue: {}, get() { const value = this.getDataValue('data'); if (typeof value === 'string') { try { return JSON.parse(value); } catch { return {}; } } return value || {}; } });
const Session = sequelize.define('SecuritySession', {
 id: { type: DataTypes.STRING(64), primaryKey: true },
 channel: { type: DataTypes.STRING(12), allowNull: false },
 customerId: { type: DataTypes.INTEGER, allowNull: true },
 adminId: { type: DataTypes.INTEGER, allowNull: true },
 csrf: { type: DataTypes.STRING(64), allowNull: false },
 expiresAt: { type: DataTypes.DATE, allowNull: false },
 data: jsonData()
}, { tableName: 'security_sessions' });
const Challenge = sequelize.define('SecurityChallenge', {
 id: { type: DataTypes.STRING(64), primaryKey: true },
 scope: { type: DataTypes.STRING(64), allowNull: false },
 codeHash: { type: DataTypes.STRING(64), allowNull: false },
 attempts: { type: DataTypes.INTEGER, defaultValue: 0 },
 verified: { type: DataTypes.BOOLEAN, defaultValue: false },
 expiresAt: { type: DataTypes.DATE, allowNull: false },
 data: jsonData()
}, { tableName: 'security_challenges' });
const OrderAccess = sequelize.define('OrderAccess', {
 id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
 sessionId: { type: DataTypes.STRING(64), allowNull: false },
 orderId: { type: DataTypes.STRING, allowNull: false }
}, { tableName: 'security_order_access', indexes: [{ unique: true, fields: ['sessionId', 'orderId'] }] });
const Preference = sequelize.define('SecurityPreference', {
 id: { type: DataTypes.STRING(100), primaryKey: true },
 data: jsonData()
}, { tableName: 'security_preferences' });
const RateBucket = sequelize.define('SecurityRateBucket', {
 id: { type: DataTypes.STRING(64), primaryKey: true },
 count: { type: DataTypes.INTEGER, defaultValue: 0 },
 expiresAt: { type: DataTypes.DATE, allowNull: false }
}, { tableName: 'security_rate_buckets' });
const PaymentIntent = sequelize.define('PaymentIntent', {
 id: { type: DataTypes.STRING, primaryKey: true },
 sessionId: { type: DataTypes.STRING(64), allowNull: false },
 amount: { type: DataTypes.INTEGER, allowNull: false },
 paymentId: { type: DataTypes.STRING, allowNull: true },
 verified: { type: DataTypes.BOOLEAN, defaultValue: false },
 consumed: { type: DataTypes.BOOLEAN, defaultValue: false }
}, { tableName: 'security_payment_intents' });
const LegacyCredential = sequelize.define('LegacyCredential', {
 id: { type: DataTypes.STRING(64), primaryKey: true },
 expiresAt: { type: DataTypes.DATE, allowNull: false }
}, { tableName: 'security_legacy_credentials' });
async function syncSecurityTables() { for (const model of [Session, Challenge, OrderAccess, Preference, RateBucket, PaymentIntent, LegacyCredential]) await model.sync(); }
module.exports = { Session, Challenge, OrderAccess, Preference, RateBucket, PaymentIntent, LegacyCredential, syncSecurityTables };
