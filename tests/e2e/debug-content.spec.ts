import { test, expect } from '@playwright/test';

test('debug content', async ({ page }) => {
  await page.goto('http://localhost:3003');
  await page.waitForLoadState('networkidle');
  
  // Take a screenshot to see what's actually on the page
  await page.screenshot({ path: 'debug-screenshot.png', fullPage: true });
  
  // Get all text content to see what's available
  const bodyText = await page.locator('body').textContent();
  console.log('Page content:', bodyText);
  
  // Check for specific elements
  const elements = await page.locator('h1, h2, h3, button, label').allTextContents();
  console.log('Elements found:', elements);
});