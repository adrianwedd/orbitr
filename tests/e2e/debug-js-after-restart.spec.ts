import { test, expect } from '@playwright/test';

test('check JavaScript loading after frontend restart', async ({ page }) => {
  const jsErrors: string[] = [];
  const consoleMessages: string[] = [];
  
  // Capture JavaScript errors
  page.on('pageerror', error => {
    jsErrors.push(`JavaScript error: ${error.message}`);
  });
  
  // Capture all console messages
  page.on('console', msg => {
    consoleMessages.push(`${msg.type()}: ${msg.text()}`);
  });
  
  // Go to page with new port
  await page.goto('http://localhost:3001/');
  await page.waitForLoadState('networkidle');
  
  // Wait for React to load
  await page.waitForTimeout(3000);
  
  console.log('JavaScript errors found:', jsErrors.length);
  jsErrors.forEach((error, index) => {
    console.log(`JS Error ${index + 1}:`, error);
  });
  
  const errorMessages = consoleMessages.filter(msg => 
    msg.includes('error') || msg.includes('Error') || msg.includes('404')
  );
  console.log('404/Error console messages:', errorMessages.length);
  errorMessages.forEach((msg, index) => {
    console.log(`Console Error ${index + 1}:`, msg);
  });
  
  // Check if React is loaded now
  const reactLoaded = await page.evaluate(() => {
    return typeof window.React !== 'undefined' || 
           document.querySelector('[data-reactroot]') !== null ||
           document.querySelector('script[src*="main-app"]') !== null ||
           typeof window.__NEXT_DATA__ !== 'undefined';
  });
  console.log('React/Next.js appears to be loaded:', reactLoaded);
  
  // Test if the debug button works now
  const testButton = page.getByText('Test');
  const testButtonExists = await testButton.count() > 0;
  console.log('Test button exists:', testButtonExists);
  
  if (testButtonExists) {
    console.log('Clicking test button...');
    
    // Set up dialog handler first
    page.on('dialog', async dialog => {
      console.log('Alert appeared:', dialog.message());
      await dialog.accept();
    });
    
    await testButton.click();
    await page.waitForTimeout(1000);
  }
});