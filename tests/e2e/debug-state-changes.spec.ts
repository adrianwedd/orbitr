import { test, expect } from '@playwright/test';

test('debug state changes during playback', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  
  // Add console logging to track state changes
  await page.addInitScript(() => {
    const originalConsoleLog = console.log;
    console.log = (...args) => {
      if (args[0]?.includes?.('setIsPlaying') || args[0]?.includes?.('togglePlayback') || args[0]?.includes?.('startPlayback')) {
        originalConsoleLog('STATE DEBUG:', ...args);
      }
      originalConsoleLog(...args);
    };
  });
  
  // Listen for console messages
  page.on('console', msg => {
    if (msg.text().includes('STATE DEBUG') || msg.text().includes('error') || msg.text().includes('Error')) {
      console.log(`Browser log: ${msg.type()}: ${msg.text()}`);
    }
  });
  
  const transportButton = page.locator('button').filter({ hasText: '▶ Play' });
  
  console.log('Initial button text:', await transportButton.textContent());
  
  console.log('Clicking button...');
  await transportButton.click();
  
  // Wait a bit for async operations
  await page.waitForTimeout(2000);
  
  const finalButtonText = await transportButton.textContent();
  console.log('Final button text:', finalButtonText);
  
  // Check if the button classes changed (should indicate state change)
  const finalClasses = await transportButton.getAttribute('class');
  console.log('Final button classes:', finalClasses);
  
  // Look for any error elements on the page
  const errorElements = await page.locator('[class*="error"], [class*="Error"]').count();
  console.log('Error elements found:', errorElements);
});