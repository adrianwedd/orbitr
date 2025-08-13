import { test, expect } from '@playwright/test';

test('final test - playback button should work correctly', async ({ page }) => {
  await page.goto('http://localhost:3001/');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
  
  // Activate a step first
  const redStep = page.locator('svg circle[stroke="#ef4444"][role="button"]').first();
  await redStep.click();
  console.log('Step activated');
  
  // Find play button
  const playButton = page.locator('button').filter({ hasText: '▶ Play' });
  const initialText = await playButton.textContent();
  console.log('Initial button text:', initialText);
  
  const initialClasses = await playButton.getAttribute('class');
  const initiallyGreen = initialClasses?.includes('bg-emerald-500');
  console.log('Initially green (play state):', initiallyGreen);
  
  // Click play button
  await playButton.click();
  console.log('Clicked play button');
  
  // Wait for state update
  await page.waitForTimeout(2000);
  
  // Check for stop button (text changed)
  const stopButton = page.locator('button').filter({ hasText: '■ Stop' });
  const stopButtonExists = await stopButton.count() > 0;
  console.log('Stop button exists:', stopButtonExists);
  
  if (stopButtonExists) {
    const stopClasses = await stopButton.getAttribute('class');
    const nowRed = stopClasses?.includes('bg-red-600');
    console.log('Now red (stop/playing state):', nowRed);
    console.log('✅ SUCCESS: Play button correctly changed to Stop button!');
    
    // Test clicking stop
    await stopButton.click();
    await page.waitForTimeout(1000);
    
    const playButtonBack = page.locator('button').filter({ hasText: '▶ Play' });
    const playButtonBackExists = await playButtonBack.count() > 0;
    console.log('Play button returned after clicking stop:', playButtonBackExists);
    
    expect(stopButtonExists).toBe(true);
    expect(nowRed).toBe(true);
  } else {
    console.log('❌ FAILED: Button did not change to Stop');
    const finalText = await playButton.textContent();
    const finalClasses = await playButton.getAttribute('class');
    console.log('Final text:', finalText);
    console.log('Final classes:', finalClasses);
    expect(stopButtonExists).toBe(true);
  }
});