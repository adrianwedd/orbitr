import { test, expect } from '@playwright/test';

test('debug which play button is being clicked', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  
  // Find all elements with play text
  const allPlayButtons = await page.locator('text="▶ Play"').all();
  console.log('Number of "▶ Play" buttons found:', allPlayButtons.length);
  
  for (let i = 0; i < allPlayButtons.length; i++) {
    const button = allPlayButtons[i];
    const tagName = await button.evaluate(el => el.tagName);
    const classes = await button.getAttribute('class');
    const parentTag = await button.evaluate(el => el.parentElement?.tagName);
    console.log(`Button ${i + 1}: <${tagName}> with class="${classes}", parent: <${parentTag}>`);
  }
  
  // Find the transport controls button specifically
  const transportButton = page.locator('button').filter({ hasText: '▶ Play' });
  const transportButtonCount = await transportButton.count();
  console.log('Transport button count:', transportButtonCount);
  
  if (transportButtonCount > 0) {
    const classes = await transportButton.getAttribute('class');
    console.log('Transport button classes:', classes);
  }
  
  // Find the center SVG button specifically  
  const svgButton = page.locator('svg text').filter({ hasText: '▶' });
  const svgButtonCount = await svgButton.count();
  console.log('SVG center button count:', svgButtonCount);
  
  // Try clicking the transport controls button specifically
  if (transportButtonCount > 0) {
    console.log('Clicking transport button...');
    await transportButton.click();
    await page.waitForTimeout(500);
    
    const buttonTextAfter = await transportButton.textContent();
    console.log('Transport button text after click:', buttonTextAfter);
  }
});