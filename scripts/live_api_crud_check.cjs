const http = require('http');
const { Admin } = require('../backend/node/models');
const bcrypt = require('../backend/node/node_modules/bcryptjs');
const { formatProductWithDiscounts } = require('../backend/node/utils/priceHelper');

const BASE_URL = 'http://localhost:8001';
const ORIGIN = 'http://localhost:5176';

function request(options, data = null, cookies = null, csrfToken = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(options.url || options.path, BASE_URL);
    const headers = {
      'Accept': 'application/json',
      'Origin': ORIGIN,
      ...(options.headers || {})
    };

    if (cookies) {
      headers['Cookie'] = cookies;
    }
    if (csrfToken) {
      headers['X-CSRF-Token'] = csrfToken;
    }
    if (data && !(data instanceof Buffer)) {
      headers['Content-Type'] = 'application/json';
    }

    const reqOptions = {
      method: options.method || 'GET',
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers
    };

    const req = http.request(reqOptions, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        let parsed = null;
        try {
          parsed = JSON.parse(body);
        } catch (_) {
          parsed = body;
        }
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: parsed,
          setCookies: res.headers['set-cookie'] || []
        });
      });
    });

    req.on('error', reject);
    if (data) {
      req.write(typeof data === 'string' ? data : JSON.stringify(data));
    }
    req.end();
  });
}

function parseCookies(setCookies) {
  return setCookies.map(c => c.split(';')[0]).join('; ');
}

async function runLiveAudit() {
  console.log('================================================================================');
  console.log('   BAANI JEWELS — LIVE API & CRUD SYSTEM AUDIT REPORT');
  console.log('   Target: ' + BASE_URL);
  console.log('   Timestamp: ' + new Date().toISOString());
  console.log('================================================================================\n');

  const results = [];
  const record = (group, name, passed, detail) => {
    results.push({ group, name, passed, detail });
    console.log(`[${passed ? 'PASS' : 'FAIL'}] [${group}] ${name} -> ${detail}`);
  };

  let sessionCookies = '';
  let csrfToken = '';

  try {
    // -------------------------------------------------------------------------
    // 1. Session Bootstrap & CSRF Security
    // -------------------------------------------------------------------------
    console.log('\n--- 1. Session & Security Bootstrap ---');
    const bootRes = await request({ path: '/api/session' });
    if (bootRes.status === 200 && bootRes.body?.csrfToken) {
      csrfToken = bootRes.body.csrfToken;
      sessionCookies = parseCookies(bootRes.setCookies);
      record('Security', 'Session Bootstrap', true, `Session initialized with valid CSRF token (${csrfToken.slice(0, 10)}...)`);
    } else {
      record('Security', 'Session Bootstrap', false, `Bootstrap failed with status ${bootRes.status}`);
    }

    // -------------------------------------------------------------------------
    // 2. Public Storefront Catalog APIs
    // -------------------------------------------------------------------------
    console.log('\n--- 2. Public Storefront Catalog APIs ---');

    // Products
    const prodsRes = await request({ path: '/api/products/all' }, null, sessionCookies);
    const prodList = Array.isArray(prodsRes.body) ? prodsRes.body : [];
    record('Catalog', 'Products: GetAll', prodsRes.status === 200 && prodList.length > 0, `Returned ${prodList.length} active products (Status ${prodsRes.status})`);

    if (prodList.length > 0) {
      const sample = prodList[0];
      const singleRes = await request({ path: `/api/products/${sample.id}` }, null, sessionCookies);
      record('Catalog', 'Products: GetById', singleRes.status === 200 && singleRes.body?.id === sample.id, `Product #${sample.id} "${sample.name}" returned 200 OK`);

      if (sample.slug) {
        const slugRes = await request({ path: `/api/products/slug/${sample.slug}` }, null, sessionCookies);
        record('Catalog', 'Products: GetBySlug', slugRes.status === 200, `Slug "${sample.slug}" returned 200 OK`);
      }
    }

    // Categories
    const catsRes = await request({ path: '/api/categories/all' }, null, sessionCookies);
    const catList = Array.isArray(catsRes.body) ? catsRes.body : [];
    record('Catalog', 'Categories: GetAll', catsRes.status === 200 && catList.length > 0, `Returned ${catList.length} categories (Status ${catsRes.status})`);

    // Collections
    const colsRes = await request({ path: '/api/collections/all' }, null, sessionCookies);
    record('Catalog', 'Collections: GetAll', colsRes.status === 200, `Collections count: ${colsRes.body?.length || 0} (Status ${colsRes.status})`);

    const bestSellersRes = await request({ path: '/api/collections/best-sellers' }, null, sessionCookies);
    record('Catalog', 'Collections: BestSellers', bestSellersRes.status === 200, `Best sellers status ${bestSellersRes.status}`);

    const trendingRes = await request({ path: '/api/collections/trending' }, null, sessionCookies);
    record('Catalog', 'Collections: Trending', trendingRes.status === 200, `Trending products status ${trendingRes.status}`);

    const newArrivalsRes = await request({ path: '/api/collections/new-arrivals' }, null, sessionCookies);
    record('Catalog', 'Collections: NewArrivals', newArrivalsRes.status === 200, `New arrivals status ${newArrivalsRes.status}`);

    const topRatedRes = await request({ path: '/api/collections/top-rated' }, null, sessionCookies);
    record('Catalog', 'Collections: TopRated', topRatedRes.status === 200, `Top rated status ${topRatedRes.status}`);

    // Home Collections
    const homeColsRes = await request({ path: '/api/home-collections/all' }, null, sessionCookies);
    record('Catalog', 'HomeCollections: GetAll', homeColsRes.status === 200, `Home collections status ${homeColsRes.status}`);

    // -------------------------------------------------------------------------
    // 3. Promotions & Content APIs
    // -------------------------------------------------------------------------
    console.log('\n--- 3. Promotions & Store Content APIs ---');

    const dealsRes = await request({ path: '/api/deals/active' }, null, sessionCookies);
    record('Promotions', 'Deals: GetActive', dealsRes.status === 200, `Active deals status ${dealsRes.status}`);

    const clockRes = await request({ path: '/api/deals/clock' }, null, sessionCookies);
    record('Promotions', 'Deals: ClockSync', clockRes.status === 200, `Promotion clock status ${clockRes.status}`);

    const offersRes = await request({ path: '/api/offer-banners/all' }, null, sessionCookies);
    record('Promotions', 'OfferBanners: GetAll', offersRes.status === 200, `Offer banners status ${offersRes.status}`);

    const bannersRes = await request({ path: '/api/banners/all' }, null, sessionCookies);
    record('Content', 'Banners: GetAll', bannersRes.status === 200, `Hero banners status ${bannersRes.status}`);

    const testRes = await request({ path: '/api/testimonials/active' }, null, sessionCookies);
    record('Content', 'Testimonials: GetActive', testRes.status === 200, `Testimonials status ${testRes.status}`);

    const shipRes = await request({ path: '/api/shipping/rate?state=Tamil+Nadu' }, null, sessionCookies);
    record('Shipping', 'ShippingRates: GetByState', shipRes.status === 200, `Shipping rate status ${shipRes.status}`);

    const settingsRes = await request({ path: '/api/settings' }, null, sessionCookies);
    record('Settings', 'Settings: GetPublic', settingsRes.status === 200, `Store settings status ${settingsRes.status}`);

    const couponsRes = await request({ path: '/api/coupons/list' }, null, sessionCookies);
    record('Promotions', 'Coupons: GetPublicList', couponsRes.status === 200, `Public coupons status ${couponsRes.status}`);

    // -------------------------------------------------------------------------
    // 4. Deal & Offer Calculation Logic Verification
    // -------------------------------------------------------------------------
    console.log('\n--- 4. Deal Calculation Logic Verification ---');
    const testProduct = {
      id: 8888,
      name: 'Sample Diamond Kada',
      mrpPrice: 1000,
      salesPrice: 800,
      variants: [
        { id: 991, status: true, variantType: 'Size', variantValue: '2.4', mrpPrice: 2000, salesPrice: 1600 }
      ]
    };

    // Case A: 10% percentage discount
    const deal10 = { targetType: 'PRODUCT', targetProductId: 8888, discountType: 'PERCENTAGE', discountValue: 10 };
    const formatted10 = formatProductWithDiscounts(testProduct, { activeDeals: [deal10], activeOffers: [] });
    const isPctCorrect = (formatted10.salesPrice === 720 && formatted10.mrpPrice === 1000);
    record('PricingLogic', 'Deal: 10% Off SalesPrice', isPctCorrect, `MRP 1000, Sales 800 -> Calculated: ₹${formatted10.salesPrice} (Expected ₹720, MRP ₹1000)`);

    // Case B: Flat ₹150 discount
    const dealFlat = { targetType: 'PRODUCT', targetProductId: 8888, discountType: 'FLAT', discountValue: 150 };
    const formattedFlat = formatProductWithDiscounts(testProduct, { activeDeals: [dealFlat], activeOffers: [] });
    const isFlatCorrect = (formattedFlat.salesPrice === 650 && formattedFlat.mrpPrice === 1000);
    record('PricingLogic', 'Deal: Flat ₹150 Off SalesPrice', isFlatCorrect, `MRP 1000, Sales 800 -> Calculated: ₹${formattedFlat.salesPrice} (Expected ₹650, MRP ₹1000)`);

    // Case C: Variant discount (25% off variant salesPrice 1600)
    const dealVariant = { targetType: 'PRODUCT', targetProductId: 8888, discountType: 'PERCENTAGE', discountValue: 25 };
    const formattedVar = formatProductWithDiscounts(testProduct, { activeDeals: [dealVariant], activeOffers: [] });
    const vPrice = formattedVar.variants[0].salesPrice;
    const isVarCorrect = (vPrice === 1200 && formattedVar.variants[0].mrpPrice === 2000);
    record('PricingLogic', 'Variant Deal: 25% Off Variant SalesPrice', isVarCorrect, `Variant MRP 2000, Sales 1600 -> Calculated: ₹${vPrice} (Expected ₹1200, MRP ₹2000)`);

    // -------------------------------------------------------------------------
    // 5. Admin Authentication & Live CRUD Lifecycle
    // -------------------------------------------------------------------------
    console.log('\n--- 5. Admin Authentication & Live CRUD Lifecycle ---');
    const testAdminEmail = `temp-audit-${Date.now()}@baani.internal`;
    const testAdminPassword = 'AuditSecret2026!';
    const hashed = await bcrypt.hash(testAdminPassword, 10);

    const tempAdmin = await Admin.create({
      email: testAdminEmail,
      password: hashed,
      role: 'admin'
    });

    try {
      // Login via API
      const loginRes = await request({
        path: '/api/admin/login',
        method: 'POST'
      }, {
        email: testAdminEmail,
        password: testAdminPassword
      }, sessionCookies, csrfToken);

      const loginOk = loginRes.status === 200;
      record('AdminCRUD', 'Admin: Login API', loginOk, `Status ${loginRes.status}: ${loginRes.body?.message || 'Login failed'}`);

      let adminAuthCookie = sessionCookies;
      if (loginRes.setCookies?.length) {
        adminAuthCookie = parseCookies(loginRes.setCookies);
      }

      // Live CRUD on Categories:
      // A. CREATE
      const testCatName = `Audit Category ${Date.now()}`;
      const createRes = await request({
        path: '/api/categories/add',
        method: 'POST'
      }, {
        name: testCatName,
        description: 'Temporary category for end-to-end verification',
        status: true
      }, adminAuthCookie, csrfToken);

      const createdCat = createRes.body;
      const createdId = createdCat?.id || createdCat?.category?.id;
      record('AdminCRUD', 'Category: CREATE (POST /api/categories/add)', createRes.status === 200 || createRes.status === 201, `Created Category ID #${createdId || 'N/A'} (Status ${createRes.status})`);

      if (createdId) {
        // B. READ
        const readRes = await request({ path: `/api/categories/${createdId}` }, null, adminAuthCookie);
        record('AdminCRUD', 'Category: READ (GET /api/categories/:id)', readRes.status === 200 && (readRes.body?.id === createdId || readRes.body?.category?.id === createdId), `Fetched category ID #${createdId} (Status ${readRes.status})`);

        // C. UPDATE
        const updatedName = `${testCatName} - UPDATED`;
        const updateRes = await request({
          path: `/api/categories/update/${createdId}`,
          method: 'PUT'
        }, {
          name: updatedName,
          description: 'Updated description'
        }, adminAuthCookie, csrfToken);

        record('AdminCRUD', 'Category: UPDATE (PUT /api/categories/update/:id)', updateRes.status === 200, `Updated category #${createdId} (Status ${updateRes.status})`);

        // D. DELETE
        const deleteRes = await request({
          path: `/api/categories/delete/${createdId}`,
          method: 'DELETE'
        }, null, adminAuthCookie, csrfToken);

        record('AdminCRUD', 'Category: DELETE (DELETE /api/categories/delete/:id)', deleteRes.status === 200, `Deleted category #${createdId} (Status ${deleteRes.status})`);

        // E. VERIFY DELETED
        const verifyDeleted = await request({ path: `/api/categories/${createdId}` }, null, adminAuthCookie);
        record('AdminCRUD', 'Category: VERIFY DELETED', verifyDeleted.status === 404, `Category #${createdId} verified non-existent (Status ${verifyDeleted.status})`);
      }

      // Admin Protected Reads:
      const adminDeals = await request({ path: '/api/deals/all' }, null, adminAuthCookie);
      record('AdminCRUD', 'Admin: Deals GetAll Protected', adminDeals.status === 200, `Admin deals count: ${adminDeals.body?.length || 0} (Status ${adminDeals.status})`);

      const adminOffers = await request({ path: '/api/offer-banners/admin/all' }, null, adminAuthCookie);
      record('AdminCRUD', 'Admin: Offers GetAll Protected', adminOffers.status === 200, `Admin offers count: ${adminOffers.body?.length || 0} (Status ${adminOffers.status})`);

      const adminOrders = await request({ path: '/api/orders/all' }, null, adminAuthCookie);
      record('AdminCRUD', 'Admin: Orders GetAll Protected', adminOrders.status === 200, `Admin orders status ${adminOrders.status}`);

      const adminCusts = await request({ path: '/api/customers/all' }, null, adminAuthCookie);
      record('AdminCRUD', 'Admin: Customers GetAll Protected', adminCusts.status === 200, `Admin customers status ${adminCusts.status}`);

    } finally {
      // Clean up temporary test admin
      await tempAdmin.destroy();
      console.log('Cleaned up temporary audit admin account.');
    }

    // -------------------------------------------------------------------------
    // 6. Frontend & Admin Dashboard HTTP Health
    // -------------------------------------------------------------------------
    console.log('\n--- 6. UI Dashboards Health Check ---');
    const checkUi = (url, name) => {
      return new Promise((resolve) => {
        const u = new URL(url);
        const req = http.request({ hostname: u.hostname, port: u.port, path: '/', method: 'GET' }, (res) => {
          record('UI', name, res.statusCode === 200, `Port ${u.port} returned HTTP ${res.statusCode} OK`);
          resolve();
        });
        req.on('error', (e) => {
          record('UI', name, false, `Port ${u.port} failed: ${e.message}`);
          resolve();
        });
        req.end();
      });
    };

    await checkUi('http://localhost:5175', 'Storefront UI (Port 5175)');
    await checkUi('http://localhost:5176', 'Admin Dashboard UI (Port 5176)');

    // -------------------------------------------------------------------------
    // SUMMARY
    // -------------------------------------------------------------------------
    console.log('\n================================================================================');
    const total = results.length;
    const passed = results.filter(r => r.passed).length;
    const failed = total - passed;
    console.log(`  FINAL RESULT: ${passed} / ${total} CHECKS PASSED (${failed} FAILED)`);
    console.log(`  SUCCESS RATE: ${Math.round((passed / total) * 100)}%`);
    console.log('================================================================================\n');

  } catch (err) {
    console.error('Fatal audit failure:', err);
  }
}

runLiveAudit();
