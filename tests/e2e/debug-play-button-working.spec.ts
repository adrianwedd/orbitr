import { test, expect } from '@playwright/test';

test('test play button with working React', async ({ page }) => {
  // Set up console logging
  page.on('console', msg => {
    console.log(`Browser: ${msg.text()}`);
  });
  
  await page.goto('http://localhost:3001/');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
  
  // Activate a step first
  const redStep = page.locator('svg circle[stroke="#ef4444"][role="button"]').first();
  await redStep.click();
  console.log('Step activated');
  
  // Click play button
  const playButton = page.locator('button').filter({ hasText: '▶ Play' });
  console.log('About to click play button...');
  
  await playButton.click();
  console.log('Play button clicked');
  
  // Wait for state to update
  await page.waitForTimeout(3000);
  
  const finalText = await playButton.textContent();
  console.log('Final button text:', finalText);
  
  const finalClasses = await playButton.getAttribute('class');
  console.log('Final button classes:', finalClasses);
  
  // Check if classes changed from emerald to red
  const isNowRed = finalClasses?.includes('bg-red-600');
  console.log('Button is now red (playing):', isNowRed);
});