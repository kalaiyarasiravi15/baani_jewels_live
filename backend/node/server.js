const path = require('path');
require('./config/envLoader');

const express = require('express');
const cors = require('cors');
const { sequelize } = require('./models/index');

const app = express();
if (process.env.TRUST_PROXY_HOPS) app.set('trust proxy', Number(process.env.TRUST_PROXY_HOPS));

const allowedOrigins = [...new Set([process.env.FRONTEND_URL || 'https://baanijewels.com', process.env.ADMIN_URL || 'https://baanidashboard.baanijewels.com', 'https://www.baanijewels.com', 'https://baanijewelsapi.com', 'https://baaniapi.baanijewels.com', ...(process.env.CORS_ORIGINS || '').split(',')].filter(Boolean).map(value => value.trim()))];
if (process.env.NODE_ENV === 'production' && (!allowedOrigins.length || !process.env.JWT_SECRET)) throw new Error('Production origins and JWT_SECRET must be configured.');

const isAllowedOrigin = (origin) => {
    if (!origin) return true;
    if (allowedOrigins.includes(origin)) return true;
    if (process.env.NODE_ENV !== 'production' && /^https?:\/\/(localhost|127\.0\.0\.1|172\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+)(:\d+)?$/.test(origin)) return true;
    return false;
};

app.use(cors({ origin: (origin, callback) => callback(null, isAllowedOrigin(origin)), credentials: true, exposedHeaders: ['X-CSRF-Token'] }));
app.use((req, res, next) => {
 if (req.headers.origin && !isAllowedOrigin(req.headers.origin)) return res.status(403).json({ message: 'Origin not allowed.' });
 res.setHeader('X-Content-Type-Options', 'nosniff');
 res.setHeader('Referrer-Policy', 'same-origin');
 if (!req.path.startsWith('/uploads')) {
  res.setHeader('Cache-Control', 'no-store');
 }
 next();
});
app.use((req, res, next) => {
    res.setHeader('Charset', 'utf-8');
    next();
});
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
const security = require('./utils/sessionSecurity');
app.use(security.loadSession);
app.use('/api', security.csrfGuard, security.rateLimit, require('./middleware/apiPermissions'));
app.use('/api/session', require('./routes/sessionRoutes'));
// Never serialize password hashes to a customer or admin browser.
app.use((req, res, next) => {
 const json = res.json.bind(res);
 res.json = data => json(JSON.parse(JSON.stringify(data, (key, value) => /^(password|passwordHash|codeHash|key_secret)$/i.test(key) ? undefined : value)));
 next();
});

const fs = require('fs');
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', require('./middleware/privateMedia'), express.static(uploadsDir, {
    maxAge: '7d',
    immutable: true,
    etag: true,
    lastModified: true
}));

// ── Routes ──────────────────────────────────────────────────────────────────
app.use('/api/admin',            require('./routes/adminRoutes'));
app.use('/api/categories',       require('./routes/categoryRoutes'));
app.use('/api/subcategories',    require('./routes/subCategoryRoutes'));
app.use('/api/brands',           require('./routes/brandRoutes'));
app.use('/api/banners',          require('./routes/bannerRoutes'));
app.use('/api/home-collections', require('./routes/homeCollectionRoutes'));
app.use('/api/offer-banners',    require('./routes/offerBannerRoutes'));
app.use('/api/contact',          require('./routes/contactRoutes'));
app.use('/api/coupons',          require('./routes/couponRoutes'));
app.use('/api/products',         require('./routes/productRoutes'));
app.use('/api/variants',         require('./routes/variantRoutes'));
app.use('/api/thumbnails',       require('./routes/thumbRoutes'));
app.use('/api/customers',        require('./routes/customerRoutes'));
app.use('/api/orders',           require('./routes/orderRoutes'));
app.use('/api/reviews',          require('./routes/reviewRoutes'));
app.use('/api/dashboard',        require('./routes/dashboardRoutes'));
app.use('/api/collections',      require('./routes/collectionRoutes'));
app.use('/api/deals',            require('./routes/dealRoutes'));
app.use('/api/Cart',             require('./routes/cartRoutes'));
app.use('/api/cart',             require('./routes/cartRoutes'));
app.use('/api/wishlist',         require('./routes/whislistRoutes'));
app.use('/api/payment',          require('./routes/paymentRoutes'));
app.use('/api/shipping',         require('./routes/shippingZoneRoutes'));
app.use('/api/settings',         require('./routes/settingRoutes'));
app.use('/api/testimonials',     require('./routes/testimonialRoutes'));
app.use('/api/cancellations',    require('./routes/cancellationRoutes'));

app.get('/', (req, res) => res.send('Baani Jewels API Running'));

const PORT = process.env.PORT || 30019;

process.on('uncaughtException', (err) => {
    console.error('CRITICAL: Uncaught Exception:', err.message, err.stack);
});

process.on('unhandledRejection', (reason) => {
    console.error('CRITICAL: Unhandled Rejection:', reason);
});

const { runAllMigrations } = require('./utils/migrations');

async function start() {
 await require('./models/securityModels').syncSecurityTables();
 await runAllMigrations();
 const expiryTimer = require('./utils/promotionExpiry').startPromotionExpiry();
 const server = app.listen(PORT, () => console.log('Baani Jewels API listening on port ' + PORT));
 server.on('close', () => clearInterval(expiryTimer));
 return server;
}
if (require.main === module) start().catch(error => { console.error('Startup failed:', error.message); process.exitCode = 1; });
module.exports = { app, start };
