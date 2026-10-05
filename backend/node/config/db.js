const { Sequelize } = require('sequelize');
const path = require('path');
require('./envLoader');

const DB_NAME = process.env.DB_NAME || 'stsforce_baanidb';
const DB_USER = process.env.DB_USER || 'stsforce_baaniuser';
const DB_PASSWORD = process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : 'ypZm#vx0P&';
const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = process.env.DB_PORT || 3306;

const sequelize = new Sequelize(
    DB_NAME,
    DB_USER,
    DB_PASSWORD,
    {
        host: DB_HOST,
        port: DB_PORT,
        dialect: 'mysql',
        logging: false
    }
);

// Enforce lowercase table names globally for Linux case-sensitivity compatibility
const modelToTable = {
    'Admin': 'admins',
    'Banner': 'banners',
    'BestSeller': 'bestsellers',
    'Brand': 'brands',
    'Cart': 'carts',
    'Category': 'categories',
    'ContactMessage': 'contactmessages',
    'Coupon': 'coupons',
    'CustomerAddress': 'customeraddresses',
    'Customer': 'customers',
    'Deal': 'deals',
    'NewArrival': 'newarrivals',
    'Newsletter': 'newsletters',
    'OfferBanner': 'offerbanners',
    'Order': 'orders',
    'OrderSlot': 'orderslots',
    'Product': 'products',
    'ProductSpecification': 'productspecifications',
    'ProductVariant': 'productvariants',
    'Review': 'reviews',
    'Setting': 'settings',
    'ShippingAddress': 'shippingaddresses',
    'SubCategory': 'subcategories',
    'Thumbnail': 'thumbnails',
    'TopRatedProduct': 'topratedproducts',
    'TrendingProduct': 'trendingproducts',
    'Wishlist': 'wishlists'
};

const originalDefine = sequelize.define;
sequelize.define = function (modelName, attributes, options = {}) {
    const tableName = modelToTable[modelName] || (modelName.toLowerCase() + 's');
    options.tableName = tableName;
    options.freezeTableName = true;
    return originalDefine.call(this, modelName, attributes, options);
};

module.exports = sequelize;
