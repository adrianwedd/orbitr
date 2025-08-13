import { test, expect } from '@playwright/test';

test('verify click handler is called', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  
  // Inject a script to override the onClick handler and track calls
  await page.evaluate(() => {
    // Find the play button and add logging
    const buttons = document.querySelectorAll('button');
    buttons.forEach((button, index) => {
      if (button.textContent?.includes('▶ Play')) {
        console.log('Found play button:', index, button.textContent);
        
        const originalOnClick = button.onclick;
        button.onclick = function(event) {
          console.log('Play button clicked!', event);
          if (originalOnClick) {
            originalOnClick.call(this, event);
          }
        };
        
        // Also add event listener
        button.addEventListener('click', (event) => {
          console.log('Play button event listener triggered!', event);
        });
      }
    });
  });
  
  // Set up console logging
  page.on('console', msg => {
    console.log(`Browser: ${msg.text()}`);
  });
  
  const transportButton = page.locator('button').filter({ hasText: '▶ Play' });
  
  console.log('About to click...');
  await transportButton.click();
  console.log('Click completed');
  
  await page.waitForTimeout(1000);
  
  const finalText = await transportButton.textContent();
  console.log('Final button text:', finalText);
});