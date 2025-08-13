import { test, expect } from '@playwright/test';

test('check for JavaScript errors', async ({ page }) => {
  const jsErrors: string[] = [];
  const consoleMessages: string[] = [];
  
  // Capture JavaScript errors
  page.on('pageerror', error => {
    jsErrors.push(`JavaScript error: ${error.message}\n${error.stack}`);
  });
  
  // Capture all console messages
  page.on('console', msg => {
    consoleMessages.push(`${msg.type()}: ${msg.text()}`);
  });
  
  // Go to page
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  
  // Wait a bit more for any late-loading errors
  await page.waitForTimeout(3000);
  
  console.log('JavaScript errors found:', jsErrors.length);
  jsErrors.forEach((error, index) => {
    console.log(`JS Error ${index + 1}:`, error);
  });
  
  console.log('Console messages:', consoleMessages.length);
  const errorMessages = consoleMessages.filter(msg => 
    msg.includes('error') || msg.includes('Error') || msg.includes('failed') || msg.includes('Failed')
  );
  
  console.log('Error-related console messages:', errorMessages.length);
  errorMessages.forEach((msg, index) => {
    console.log(`Console Error ${index + 1}:`, msg);
  });
  
  // Check if React is even loaded
  const reactLoaded = await page.evaluate(() => {
    return typeof window.React !== 'undefined' || document.querySelector('[data-reactroot]') !== null;
  });
  console.log('React appears to be loaded:', reactLoaded);
  
  // Check if any event listeners are attached
  const eventListenerTest = await page.evaluate(() => {
    const buttons = document.querySelectorAll('button');
    let hasListeners = false;
    buttons.forEach(button => {
      // React attaches event listeners to the document, not individual elements
      // So check if click events work at all
      try {
        const event = new MouseEvent('click', { bubbles: true });
        button.dispatchEvent(event);
      } catch (e) {
        console.log('Error dispatching event:', e);
      }
    });
    return buttons.length;
  });
  console.log('Buttons found for event test:', eventListenerTest);
});