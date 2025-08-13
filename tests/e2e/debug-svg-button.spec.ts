import { test, expect } from '@playwright/test';

test('test SVG center play button', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  
  // Set up console logging
  page.on('console', msg => {
    if (msg.type() !== 'log') return;
    console.log(`Browser: ${msg.text()}`);
  });
  
  // Find the SVG center button (with ▶ symbol)
  const svgPlayButton = page.locator('svg text').filter({ hasText: '▶' });
  const svgPlayButtonExists = await svgPlayButton.count() > 0;
  console.log('SVG play button exists:', svgPlayButtonExists);
  
  if (svgPlayButtonExists) {
    console.log('SVG button text:', await svgPlayButton.textContent());
    
    // Click the SVG button
    await svgPlayButton.click();
    await page.waitForTimeout(1000);
    
    const newText = await svgPlayButton.textContent();
    console.log('SVG button text after click:', newText);
    
    // Also check the transport button
    const transportButton = page.locator('button').filter({ hasText: /▶ Play|■ Stop/ });
    const transportText = await transportButton.textContent();
    console.log('Transport button text after SVG click:', transportText);
  }
});