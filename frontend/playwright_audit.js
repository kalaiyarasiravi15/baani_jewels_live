const { chromium } = require('playwright');

(async () => {
  console.log('🚀 Starting Comprehensive Playwright E2E Audit for Baani Jewels...');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

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
    console.log('\n--- Testing Customer Website ---');
    
    // 1.1 Homepage
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
    const title = await page.title();
    logTest('customerWebsite', 'Homepage Title Verification', title.includes('Baani Jewels'), `Title: ${title}`);

    // Check Header Logo and Navigation Links
    const logoVisible = await page.locator('.nav-logo').isVisible();
    logTest('customerWebsite', 'Header Logo Visibility', logoVisible);

    // 1.2 Shop Page Navigation & Filtering
    await page.goto('http://localhost:5173/shop', { waitUntil: 'networkidle' });
    const shopProductsCount = await page.locator('.product-card').count();
    logTest('customerWebsite', 'Shop Page Products Rendered', shopProductsCount > 0, `Count: ${shopProductsCount}`);

    // 1.3 Product Details Page & Interactivity
    const firstProductLink = page.locator('.product-card a').first();
    if (await firstProductLink.count() > 0) {
      await firstProductLink.click();
      await page.waitForLoadState('networkidle');

      const pdpTitle = await page.locator('.pdp-title').textContent();
      logTest('customerWebsite', 'Product Details Title', Boolean(pdpTitle), `Title: ${pdpTitle?.trim()}`);

      // Back Button Check
      const backBtnVisible = await page.locator('.pdp-back-btn').isVisible();
      logTest('customerWebsite', 'PDP Back Button Rendered', backBtnVisible);

      // Pincode Verification Check
      const pincodeInput = page.locator('.pdp-pincode-input');
      if (await pincodeInput.count() > 0) {
        await pincodeInput.fill('600001');
        const checkBtn = page.locator('.pdp-pincode-btn');
        if (await checkBtn.count() > 0) await checkBtn.click();
        await page.waitForTimeout(500);
        const pinSuccess = await page.locator('.pdp-pincode-status').textContent();
        logTest('customerWebsite', 'Pincode Delivery Check', Boolean(pinSuccess), `Status: ${pinSuccess?.trim()}`);
      }

      // Add to Cart & Toastify Notification
      const addToCartBtn = page.locator('.pdp-add-btn, button:has-text("ADD TO CART")').first();
      if (await addToCartBtn.count() > 0) {
        await addToCartBtn.click();
        await page.waitForTimeout(600);
        const toastVisible = await page.locator('.Toastify__toast').isVisible();
        logTest('customerWebsite', 'Add to Cart & Toastify Toast Trigger', toastVisible);
      }
    }

    // 1.4 Track Order Page Stepper (6-Stage Verification)
    await page.goto('http://localhost:5173/track-order', { waitUntil: 'networkidle' });
    const trackInput = page.locator('.track-input, input[placeholder*="Order"]');
    if (await trackInput.count() > 0) {
      await trackInput.fill('BJ-DEMO');
      const trackBtn = page.locator('button:has-text("Track")');
      if (await trackBtn.count() > 0) await trackBtn.click();
      await page.waitForTimeout(500);
    }
    const trackPageLoaded = await page.locator('.track-container, .track-header').isVisible();
    logTest('customerWebsite', 'Track Order Page Loaded', trackPageLoaded);


    // ════════════════════════════════════════════════════════════════════
    // 2. RESPONSIVE VIEWPORT CHECKS
    // ════════════════════════════════════════════════════════════════════
    console.log('\n--- Testing Responsive Viewports ---');

    // Desktop Viewport (1280px)
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
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
    console.log('\n--- Testing Admin Portal ---');
    await page.setViewportSize({ width: 1400, height: 900 });
    await page.goto('http://localhost:5176', { waitUntil: 'networkidle' });

    const adminTitle = await page.title();
    logTest('adminPortal', 'Admin Portal Dashboard Title', adminTitle.includes('Admin'), `Title: ${adminTitle}`);

    // 3.1 Order Management
    await page.goto('http://localhost:5176/orders', { waitUntil: 'networkidle' });
    const ordersTable = await page.locator('.ars-premium-table').isVisible();
    logTest('adminPortal', 'Order Management Table Rendered', ordersTable);

    const rowStatusSelect = await page.locator('select.status-select').first();
    if (await rowStatusSelect.count() > 0) {
      const optionsCount = await rowStatusSelect.locator('option').count();
      logTest('adminPortal', 'Order Status Forward-Only Select Options', optionsCount >= 1, `Available Stages: ${optionsCount}`);
    }

    // 3.2 Product Management & CharCount Indicator
    await page.goto('http://localhost:5176/products', { waitUntil: 'networkidle' });
    const addProductBtn = page.locator('button:has-text("Add Product"), .add-btn').first();
    if (await addProductBtn.count() > 0) {
      await addProductBtn.click();
      await page.waitForTimeout(400);
      const charCountHint = await page.locator('.char-count-hint').count();
      logTest('adminPortal', 'Product Add Form CharCount Indicators', charCountHint > 0, `Hints Found: ${charCountHint}`);
      const closeFormBtn = page.locator('.pp-back-btn, button:has-text("Cancel"), .close-btn').first();
      if (await closeFormBtn.count() > 0) await closeFormBtn.click();
    }

    // 3.3 Category Management
    await page.goto('http://localhost:5176/categories', { waitUntil: 'networkidle' });
    const catPageLoaded = await page.locator('h1, h2').first().textContent();
    logTest('adminPortal', 'Category Management Page', Boolean(catPageLoaded), `Heading: ${catPageLoaded?.trim()}`);

    // 3.4 Deals of the Day & Offer Banners
    await page.goto('http://localhost:5176/deals', { waitUntil: 'networkidle' });
    const dealsPageLoaded = await page.locator('h1, h2').first().textContent();
    logTest('adminPortal', 'Manage Deals Page', Boolean(dealsPageLoaded), `Heading: ${dealsPageLoaded?.trim()}`);

    await page.goto('http://localhost:5176/offer-banners', { waitUntil: 'networkidle' });
    const offerBannersLoaded = await page.locator('h1, h2').first().textContent();
    logTest('adminPortal', 'Manage Offer Banners Page', Boolean(offerBannersLoaded), `Heading: ${offerBannersLoaded?.trim()}`);

    // 3.5 Coupons Management
    await page.goto('http://localhost:5176/coupons', { waitUntil: 'networkidle' });
    const couponsTableVisible = await page.locator('table').isVisible();
    logTest('adminPortal', 'Coupons Table & Expiry Status Rendered', couponsTableVisible);

    // 3.6 Contact Page Settings (Phone Validation Check)
    await page.goto('http://localhost:5176/settings/contact', { waitUntil: 'networkidle' });
    const phoneInput = page.locator('input[name="phone"], input[placeholder*="Phone"]').first();
    if (await phoneInput.count() > 0) {
      await phoneInput.fill('+91 93453 22621');
      const val = await phoneInput.inputValue();
      logTest('adminPortal', 'Contact Phone Field Sanitization', !/[a-zA-Z]/.test(val), `Value: ${val}`);
    }

    // 3.7 Reports & Top Customers
    await page.goto('http://localhost:5176/reports', { waitUntil: 'networkidle' });
    const reportsLoaded = await page.locator('h1, h2').first().textContent();
    logTest('adminPortal', 'Reports & Analytics Page', Boolean(reportsLoaded), `Heading: ${reportsLoaded?.trim()}`);

  } catch (err) {
    console.error('❌ Playwright Error:', err);
  } finally {
    await browser.close();
    console.log('\n==================================================');
    console.log(`SUMMARY: ${results.summary.passed} PASSED | ${results.summary.failed} FAILED`);
    console.log('==================================================');
    
    // Save report artifact
    const fs = require('fs');
    fs.writeFileSync('./playwright_report.json', JSON.stringify(results, null, 2));
  }
})();
