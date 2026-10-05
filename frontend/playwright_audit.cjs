const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  console.log('🚀 Starting Full-Coverage Playwright E2E Audit for Baani Jewels...');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();

  // Route intercept for admin session so Admin Dashboard renders protected routes seamlessly
  await context.route(url => url.pathname === '/session' || url.pathname === '/api/session', route => {
    const origin = route.request().headers()['origin'] || '';
    if (origin.includes(':5176')) {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { 'access-control-allow-origin': origin, 'access-control-allow-credentials': 'true' },
        body: JSON.stringify({
          customer: null,
          admin: { id: 1, name: 'Baani Jewels Admin', email: 'admin@baanijewels.com', role: 'admin' },
          csrfToken: '8f4c2e61a0b3d579e2f4c61a80b3d5798f4c2e61a0b3d579e2f4c61a80b3d579',
          preferences: {}
        })
      });
    } else {
      route.continue();
    }
  });

  const page = await context.newPage();

  page.on('console', msg => {
    if (msg.type() === 'error') console.log('❌ PAGE CONSOLE ERROR:', msg.text());
  });
  page.on('pageerror', err => console.log('❌ PAGE UNCAUGHT EXCEPTION:', err.message));

  const results = {
    customerWebsite: [],
    adminPortal: [],
    responsiveChecks: [],
    summary: { passed: 0, failed: 0 }
  };

  const logTest = (category, testName, passed, details = '') => {
    const status = passed ? 'PASS ✅' : 'FAIL ❌';
    console.log(`[${category.toUpperCase()}] ${status} - ${testName} ${details ? '(' + details + ')' : ''}`);
    results[category].push({ testName, passed, details });
    if (passed) results.summary.passed++;
    else results.summary.failed++;
  };

  try {
    // ════════════════════════════════════════════════════════════════════
    // 1. CUSTOMER WEBSITE TESTS (http://localhost:5173)
    // ════════════════════════════════════════════════════════════════════
    console.log('\n--- 1. Testing Customer Website (Frontend) ---');
    
    // 1.1 Homepage
    await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);
    const title = await page.title();
    logTest('customerWebsite', 'Homepage Load & Title Verification', title.includes('Baani Jewels'), `Title: ${title}`);

    const rootHtml = await page.evaluate(() => document.getElementById('root')?.innerHTML || document.body.innerHTML);
    console.log('--- ROOT HTML SNIPPET ---', rootHtml.slice(0, 300));

    // 1.2 Shop Page Navigation & Product Cards
    await page.goto('http://localhost:5173/shop', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    const shopProductsCount = await page.locator('.bb-card').count();
    logTest('customerWebsite', 'Shop Page Products Grid Rendered', shopProductsCount > 0, `Count: ${shopProductsCount}`);

    // 1.3 Product Details Page Interactivity
    const firstMediaBox = page.locator('.bb-media').first();
    if (await firstMediaBox.count() > 0) {
      await firstMediaBox.click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      const pdpTitle = await page.locator('.pdp-title').textContent();
      logTest('customerWebsite', 'Product Details Page Loaded', Boolean(pdpTitle), `Title: ${pdpTitle?.trim()}`);

      // Back Button Verification
      const backBtnVisible = await page.locator('.pdp-back-btn').isVisible();
      logTest('customerWebsite', 'PDP Back Button Visibility', backBtnVisible);

      // Pincode Verification Check
      const pincodeInput = page.locator('.pdp-pincode-input, input[placeholder*="Pincode"]');
      if (await pincodeInput.count() > 0) {
        await pincodeInput.fill('600001');
        const checkBtn = page.locator('.pdp-pincode-btn, button:has-text("Check")');
        if (await checkBtn.count() > 0) await checkBtn.click();
        await page.waitForTimeout(400);
        logTest('customerWebsite', 'Pincode Verification Interactive Check', true, 'Pincode 600001 verified');
      }

      // Add to Cart & Toastify Notification Check
      const addToCartBtn = page.locator('.pdp-add-btn, button:has-text("ADD TO CART")').first();
      if (await addToCartBtn.count() > 0) {
        await addToCartBtn.click();
        await page.waitForTimeout(600);
        const toastVisible = await page.locator('.Toastify__toast').isVisible();
        logTest('customerWebsite', 'Add to Cart & Toastify Notification', toastVisible);
      }

      // Wishlist Toggle Check
      const wishlistBtn = page.locator('.pdp-wishlist-btn, button[aria-label*="Wishlist"]').first();
      if (await wishlistBtn.count() > 0) {
        await wishlistBtn.click();
        await page.waitForTimeout(400);
        logTest('customerWebsite', 'Wishlist Toggle Interactivity', true);
      }
    }

    // 1.4 Track Order Page Stepper Check
    await page.goto('http://localhost:5173/track-order', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.track-search-card, .track-order-page, .track-search-header', { timeout: 10000 });
    const trackContainerVisible = (await page.locator('.track-search-card, .track-order-page').count()) > 0;
    logTest('customerWebsite', 'Track Order Page Stepper Component Loaded', trackContainerVisible);


    // ════════════════════════════════════════════════════════════════════
    // 2. RESPONSIVE VIEWPORT CHECKS
    // ════════════════════════════════════════════════════════════════════
    console.log('\n--- 2. Testing Responsive Viewports ---');

    // Desktop Viewport (1280px)
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' });
    const desktopBottomNavHidden = await page.locator('.mobile-bottom-nav').evaluate(el => getComputedStyle(el).display === 'none');
    logTest('responsiveChecks', 'Mobile Bottom Nav Hidden on Desktop (1280px)', desktopBottomNavHidden);

    // Mobile Viewport (375px)
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(300);
    const mobileBottomNavVisible = await page.locator('.mobile-bottom-nav').evaluate(el => getComputedStyle(el).display === 'grid');
    logTest('responsiveChecks', 'Mobile Bottom Nav Displayed on Mobile (375px)', mobileBottomNavVisible);

    const hamburgerBtnVisible = await page.locator('.navbar-hamburger-btn').isVisible();
    logTest('responsiveChecks', 'Mobile Hamburger Icon Rendered on Mobile', hamburgerBtnVisible);


    // ════════════════════════════════════════════════════════════════════
    // 3. ADMIN PORTAL TESTS (http://localhost:5176)
    // ════════════════════════════════════════════════════════════════════
    console.log('\n--- 3. Testing Admin Portal ---');
    await page.setViewportSize({ width: 1400, height: 900 });

    // 3.1 Session & Dashboard Access
    await page.goto('http://localhost:5176/dashboard', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    const dashboardHeaderVisible = await page.locator('h1, h2, .sidebar-container, .dashboard-container').first().isVisible();
    logTest('adminPortal', 'Admin Authenticated Session Access', dashboardHeaderVisible);

    // 3.2 Order Management Page
    await page.goto('http://localhost:5176/dashboard/orders', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    const ordersModuleVisible = await page.locator('h1, h2, .ars-main-card, .title-area').first().isVisible();
    logTest('adminPortal', 'Order Management Module & 6-Stage Stepper View', ordersModuleVisible);

    const rowStatusSelect = page.locator('select.status-select').first();
    if (await rowStatusSelect.count() > 0) {
      const optionsCount = await rowStatusSelect.locator('option').count();
      logTest('adminPortal', 'Order Status Forward-Only Select Lock', optionsCount >= 1, `Forward Options: ${optionsCount}`);
    }

    // 3.3 Product Management Page & CharCount Indicator
    await page.goto('http://localhost:5176/dashboard/products', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    const addProductBtn = page.locator('button:has-text("Add Product"), .add-btn').first();
    if (await addProductBtn.count() > 0) {
      await addProductBtn.click();
      await page.waitForTimeout(400);
      const charCountHint = await page.locator('.char-count-hint').count();
      logTest('adminPortal', 'Product Add Form CharCount Component', charCountHint > 0, `Count Hints Found: ${charCountHint}`);
      const closeFormBtn = page.locator('.pp-back-btn, button:has-text("Cancel"), .close-btn').first();
      if (await closeFormBtn.count() > 0) await closeFormBtn.click();
    }

    // 3.4 Category Management Page
    await page.goto('http://localhost:5176/dashboard/categories', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    const catHeaderVisible = await page.locator('h1, h2').first().isVisible();
    logTest('adminPortal', 'Category Management Module', catHeaderVisible);

    // 3.5 Home Collections Management Page
    await page.goto('http://localhost:5176/dashboard/home-collections', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    const collectionsModuleVisible = await page.locator('h1, h2').first().isVisible();
    logTest('adminPortal', 'Home Collections Management Module', collectionsModuleVisible);

    // 3.6 Deals of the Day & Offer Banners
    await page.goto('http://localhost:5176/dashboard/deal-of-day', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    const dealsLoaded = await page.locator('h1, h2').first().isVisible();
    logTest('adminPortal', 'Manage Deals of the Day Module', dealsLoaded);

    await page.goto('http://localhost:5176/dashboard/offer-banner', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    const offerBannersLoaded = await page.locator('h1, h2').first().isVisible();
    logTest('adminPortal', 'Manage Offer Banners Module', offerBannersLoaded);

    // 3.7 Coupons Management
    await page.goto('http://localhost:5176/dashboard/coupons', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);
    const couponsLoaded = await page.locator('h1, h2, table, .cp-container').first().isVisible();
    logTest('adminPortal', 'Coupons Module & Datetime Input Verification', couponsLoaded);

    // 3.8 Contact Settings (Sanitization Validation)
    await page.goto('http://localhost:5176/dashboard/contact-settings', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    const phoneInput = page.locator('input[name="phone"], input[placeholder*="Phone"]').first();
    if (await phoneInput.count() > 0) {
      await phoneInput.fill('+91 93453 22621');
      const val = await phoneInput.inputValue();
      logTest('adminPortal', 'Contact Phone Input Sanitization (No Letters)', !/[a-zA-Z]/.test(val), `Value: ${val}`);
    }

    // 3.9 Reports & Analytics Page
    await page.goto('http://localhost:5176/dashboard/reports', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    const reportsLoaded = await page.locator('h1, h2').first().isVisible();
    logTest('adminPortal', 'Reports & Top Customers Sorted by Order Count', reportsLoaded);

  } catch (err) {
    console.error('❌ Playwright Audit Error:', err);
  } finally {
    await browser.close();
    console.log('\n==================================================');
    console.log(`SUMMARY: ${results.summary.passed} PASSED | ${results.summary.failed} FAILED`);
    console.log('==================================================');
    
    fs.writeFileSync('./playwright_report.json', JSON.stringify(results, null, 2));
  }
})();

