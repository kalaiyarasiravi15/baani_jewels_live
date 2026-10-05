const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const HomeCollection = sequelize.define('HomeCollection', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    name: { type: DataTypes.STRING, allowNull: false },
    image: { type: DataTypes.STRING, allowNull: false },
    sortOrder: { type: DataTypes.INTEGER, defaultValue: 0 },
    status: { type: DataTypes.BOOLEAN, defaultValue: true }
});

module.exports = HomeCollection;
