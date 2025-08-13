import { test, expect } from '@playwright/test';

test('basic page load test', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  
  // Check if main heading is visible
  await expect(page.getByText('ORBITR')).toBeVisible();
  
  // Check if sequencer SVG is present
  await expect(page.locator('svg')).toBeVisible();
  
  // Log number of step buttons found
  const stepButtons = page.locator('svg circle[role="button"]');
  const count = await stepButtons.count();
  console.log('Step buttons found:', count);
  
  // Check for any console errors
  const logs: string[] = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      logs.push(msg.text());
    }
  });
  
  await page.waitForTimeout(3000);
  
  if (logs.length > 0) {
    console.log('Console errors:', logs);
  }
});