const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const ARTIFACT_DIR = path.resolve('C:/Users/Kalaiyarasi/.gemini/antigravity/brain/d787b497-523d-43c5-89fd-f83845993b7e');
const LOCAL_SCREENSHOTS = path.resolve('k:/bani jewellery/frontend/test_screenshots');

(async () => {
  const browser = await chromium.launch();

  const copyToBoth = (srcPath, filename) => {
    const localDest = path.join(LOCAL_SCREENSHOTS, filename);
    fs.copyFileSync(srcPath, localDest);
    console.log(`📸 Screenshot saved: ${srcPath}`);
    console.log(`   Copied to: ${localDest}`);
  };

  // 1. MOBILE CART VIEW (390x844 - iPhone 14)
  console.log('Testing Mobile Cart (390x844)...');
  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
  });
  const mobilePage = await mobileContext.newPage();
  await mobilePage.goto('http://localhost:5175/shop', { waitUntil: 'networkidle' });
  await mobilePage.waitForTimeout(1500);
  await mobilePage.locator('.bb-media, .bb-card, a[href*="/product/"]').first().click();
  await mobilePage.waitForTimeout(1500);
  const variant = mobilePage.locator('.pdp-variant-option').first();
  if (await variant.count() > 0) await variant.click();
  await mobilePage.locator('.pdp-btn-cart, button:has-text("Add to Cart")').first().click();
  await mobilePage.waitForTimeout(1000);
  await mobilePage.goto('http://localhost:5175/cart', { waitUntil: 'networkidle' });
  await mobilePage.waitForTimeout(1500);

  // Increase qty to 2 so (₹199 each) is visible
  await mobilePage.locator('.qty-inc').first().click();
  await mobilePage.waitForTimeout(600);

  const mobileCartImg = path.join(ARTIFACT_DIR, 'mobile_cart_qty_verified.png');
  await mobilePage.screenshot({ path: mobileCartImg, fullPage: true });
  copyToBoth(mobileCartImg, 'mobile_cart_qty_verified.png');

  // Also take a focused crop/clip of the cart item card on mobile
  const cartCardEl = await mobilePage.locator('.cart-item').first();
  const mobileCardClipImg = path.join(ARTIFACT_DIR, 'mobile_cart_card_focused.png');
  await cartCardEl.screenshot({ path: mobileCardClipImg });
  copyToBoth(mobileCardClipImg, 'mobile_cart_card_focused.png');

  // 2. DESKTOP CART VIEW (1280x800)
  console.log('Testing Desktop Cart (1280x800)...');
  const desktopContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const desktopPage = await desktopContext.newPage();
  await desktopPage.goto('http://localhost:5175/shop', { waitUntil: 'networkidle' });
  await desktopPage.waitForTimeout(1500);
  await desktopPage.locator('.bb-media, .bb-card, a[href*="/product/"]').first().click();
  await desktopPage.waitForTimeout(1500);
  const deskVariant = desktopPage.locator('.pdp-variant-option').first();
  if (await deskVariant.count() > 0) await deskVariant.click();
  await desktopPage.locator('.pdp-btn-cart, button:has-text("Add to Cart")').first().click();
  await desktopPage.waitForTimeout(1000);
  await desktopPage.goto('http://localhost:5175/cart', { waitUntil: 'networkidle' });
  await desktopPage.waitForTimeout(1500);

  // Increase qty to 2
  await desktopPage.locator('.qty-inc').first().click();
  await desktopPage.waitForTimeout(600);

  const desktopCartImg = path.join(ARTIFACT_DIR, 'desktop_cart_qty_verified.png');
  await desktopPage.screenshot({ path: desktopCartImg, fullPage: true });
  copyToBoth(desktopCartImg, 'desktop_cart_qty_verified.png');

  await browser.close();
  console.log('Done!');
})();
