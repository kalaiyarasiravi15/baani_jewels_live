const { chromium } = require('playwright');

(async () => {
  console.log('🚀 Checking International Customer Section on Mobile Viewport (375px)...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 375, height: 667 } });
  const page = await context.newPage();

  try {
    // Add product to cart to enable checkout
    await page.goto('http://localhost:5173/shop', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    const media = page.locator('.bb-media').first();
    if (await media.count() > 0) {
      await media.click();
      await page.waitForLoadState('networkidle');
      const addBtn = page.locator('.pdp-add-btn, button:has-text("ADD TO CART")').first();
      if (await addBtn.count() > 0) await addBtn.click();
      await page.waitForTimeout(600);
    }

    // Check Checkout International Concierge Card
    await page.goto('http://localhost:5173/checkout', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    const intlTab = page.locator('.dest-card-option', { hasText: 'International' });
    if (await intlTab.count() > 0) {
      await intlTab.click();
      await page.waitForTimeout(500);
      const cardVisible = await page.locator('.intl-concierge-card').isVisible();
      const btnVisible = await page.locator('.btn-intl-whatsapp').isVisible();
      console.log('International Concierge Card Visible:', cardVisible);
      console.log('WhatsApp Concierge Button Visible:', btnVisible);
    }
  } catch (err) {
    console.error('Test Error:', err);
  } finally {
    await browser.close();
  }
})();
