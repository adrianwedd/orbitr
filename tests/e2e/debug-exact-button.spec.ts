import { test, expect } from '@playwright/test';

test('find exact button being clicked', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  
  // Add click debugging to all buttons on the page
  await page.evaluate(() => {
    const allButtons = document.querySelectorAll('button');
    console.log('Total buttons found on page:', allButtons.length);
    
    allButtons.forEach((button, index) => {
      const text = button.textContent || '';
      console.log(`Button ${index}: "${text}"`);
      
      if (text.includes('▶ Play')) {
        console.log('Found play button at index', index);
        
        // Add event listener
        button.addEventListener('click', (event) => {
          console.log('ACTUAL BUTTON CLICKED:', button.textContent, 'at index', index);
          console.log('Button classes:', button.className);
          console.log('Button parent:', button.parentElement?.tagName);
          console.log('Button onclick:', button.onclick);
        });
      }
    });
  });
  
  // Set up console logging
  page.on('console', msg => {
    console.log(`Browser: ${msg.text()}`);
  });
  
  const transportButton = page.locator('button').filter({ hasText: '▶ Play' });
  
  console.log('About to click transport button...');
  await transportButton.click();
  
  await page.waitForTimeout(2000);
});