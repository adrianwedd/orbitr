import { test, expect } from '@playwright/test';

test('test debug button vs play button', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  
  // Set up console logging
  page.on('console', msg => {
    console.log(`Browser: ${msg.text()}`);
  });
  
  // Test the debug button first
  const testButton = page.getByText('Test');
  const testButtonExists = await testButton.count() > 0;
  console.log('Test button exists:', testButtonExists);
  
  if (testButtonExists) {
    console.log('Clicking test button...');
    await testButton.click();
    
    // Handle alert if it appears
    page.on('dialog', async dialog => {
      console.log('Alert appeared:', dialog.message());
      await dialog.accept();
    });
    
    await page.waitForTimeout(1000);
  }
  
  // Now test the play button
  const playButton = page.locator('button').filter({ hasText: '▶ Play' });
  console.log('Clicking play button...');
  await playButton.click();
  
  await page.waitForTimeout(2000);
  
  const finalPlayButtonText = await playButton.textContent();
  console.log('Final play button text:', finalPlayButtonText);
});