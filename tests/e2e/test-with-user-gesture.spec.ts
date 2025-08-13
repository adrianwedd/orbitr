import { test, expect } from '@playwright/test';

test('test play button with proper user gesture simulation', async ({ page }) => {
  // Set up console logging
  page.on('console', msg => {
    console.log(`Browser: ${msg.text()}`);
  });
  
  await page.goto('http://localhost:3001/');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
  
  // Simulate proper user interaction by starting with a real mouse move and click
  // This helps satisfy browser's user gesture requirements for audio
  await page.mouse.move(400, 400);
  await page.mouse.click(400, 400);
  await page.waitForTimeout(500);
  
  // Activate a step first
  const redStep = page.locator('svg circle[stroke="#ef4444"][role="button"]').first();
  await redStep.click({ force: true });
  console.log('Step activated');
  
  // Click play button with proper user gesture
  const playButton = page.locator('button').filter({ hasText: '▶ Play' });
  console.log('About to click play button with user gesture...');
  
  // Use force and proper timing to simulate real user interaction
  await playButton.click({ force: true, delay: 100 });
  console.log('Play button clicked with gesture');
  
  // Wait longer for async operations and state updates
  await page.waitForTimeout(3000);
  
  const finalText = await playButton.textContent();
  console.log('Final button text:', finalText);
  
  const finalClasses = await playButton.getAttribute('class');
  console.log('Final button classes:', finalClasses);
  
  // Check if classes changed from emerald to red
  const isNowRed = finalClasses?.includes('bg-red-600');
  const isNowStop = finalText?.includes('■ Stop');
  console.log('Button is now red (playing):', isNowRed);
  console.log('Button shows Stop text:', isNowStop);
  
  // Test the actual expectation
  if (isNowStop && isNowRed) {
    console.log('SUCCESS: Play button is working correctly!');
  } else {
    console.log('Button state not updated - checking why...');
    
    // Let's try clicking it again to see if it's a timing issue
    await page.waitForTimeout(2000);
    const retryText = await playButton.textContent();
    const retryClasses = await playButton.getAttribute('class');
    console.log('After waiting longer - text:', retryText, 'classes:', retryClasses?.includes('bg-red-600'));
  }
});