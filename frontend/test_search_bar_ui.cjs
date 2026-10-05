const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  console.log('Logging into Admin Dashboard...');
  await page.goto('http://localhost:5176/login', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('input[type="email"]', { timeout: 8000 });
  await page.fill('input[type="email"]', 'baanijeweladmin2026@gmail.com');
  await page.fill('input[type="password"]', 'baani@admin2026');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(2000);

  console.log('Navigating to Dashboard and focusing search bar...');
  await page.goto('http://localhost:5176/dashboard', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.nav-search-input', { timeout: 8000 });
  
  // Focus the search bar
  await page.click('.nav-search-input');
  await page.waitForTimeout(600);

  // Take screenshot of open search bar with quick navigation
  const ssDir = path.join(__dirname, 'test_screenshots');
  const ssPath = path.join(ssDir, 'search_bar_quick_nav_perfect.png');
  await page.screenshot({ path: ssPath });
  console.log(`Saved screenshot to ${ssPath}`);

  // Test typing a query
  await page.fill('.nav-search-input', 'gold');
  await page.waitForTimeout(600);
  const searchResultsPath = path.join(ssDir, 'search_bar_results_dropdown.png');
  await page.screenshot({ path: searchResultsPath });
  console.log(`Saved results screenshot to ${searchResultsPath}`);

  await browser.close();
  console.log('✅ Search bar UI verification complete!');
})();
