import { test, expect } from '@playwright/test';

test('debug SVG structure', async ({ page }) => {
  await page.goto('http://localhost:3003');
  await page.waitForLoadState('networkidle');
  
  // Get the SVG content to understand the structure
  const svgHTML = await page.locator('svg').innerHTML();
  console.log('SVG HTML:', svgHTML);
  
  // Count all circles
  const allCircles = page.locator('svg circle');
  const circleCount = await allCircles.count();
  console.log('Total circles:', circleCount);
  
  // Check for text elements
  const textElements = page.locator('svg text');
  const textCount = await textElements.count();
  console.log('Text elements:', textCount);
  
  if (textCount > 0) {
    const textContents = await textElements.allTextContents();
    console.log('Text contents:', textContents);
  }
  
  // Check for specific track colors
  const redCircles = page.locator('svg circle[stroke="#ef4444"]');
  const redCount = await redCircles.count();
  console.log('Red circles (Track O):', redCount);
  
  // Check if circles have role="button"
  const buttonCircles = page.locator('svg circle[role="button"]');
  const buttonCount = await buttonCircles.count();
  console.log('Button circles:', buttonCount);
});