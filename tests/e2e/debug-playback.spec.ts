import { test, expect } from '@playwright/test';

test('debug playback issue', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  
  // Activate a step first
  const firstStep = page.locator('svg circle[stroke="#ef4444"][role="button"]').first();
  await firstStep.click();
  
  console.log('Step activated, fill:', await firstStep.getAttribute('fill'));
  
  // Try to play
  const playButton = page.getByText('▶ Play');
  console.log('Play button visible:', await playButton.isVisible());
  
  await playButton.click();
  
  // Check what happens after clicking play
  await page.waitForTimeout(2000);
  
  // Check if button text changed
  const buttonText = await playButton.textContent();
  console.log('Button text after click:', buttonText);
  
  // Check if there's a stop button elsewhere
  const stopSymbol = page.getByText('■');
  const stopVisible = await stopSymbol.isVisible();
  console.log('Stop symbol visible:', stopVisible);
  
  // Check the SVG center button
  const svgPlayButton = page.locator('svg g[role="button"]');
  const svgButtonText = await svgPlayButton.locator('text').textContent();
  console.log('SVG button text:', svgButtonText);
  
  // Look for any errors
  const errorElements = page.locator('[class*="red"]');
  const errorCount = await errorElements.count();
  console.log('Error elements found:', errorCount);
  
  if (errorCount > 0) {
    const errorText = await errorElements.first().textContent();
    console.log('Error text:', errorText);
  }
  
  // Check console for any audio errors
  const logs: string[] = [];
  page.on('console', msg => logs.push(msg.text()));
  
  await page.waitForTimeout(1000);
  console.log('Console logs:', logs);
});