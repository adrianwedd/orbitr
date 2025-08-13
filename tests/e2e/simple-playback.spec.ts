import { test, expect } from '@playwright/test';

test('simple playback test with corrected selectors', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  
  console.log('Page loaded');
  
  // Find actual clickable step buttons (not the track rings)
  const redStepButtons = page.locator('svg circle[stroke="#ef4444"][role="button"]');
  const redButtonCount = await redStepButtons.count();
  console.log('Red step buttons found:', redButtonCount);
  
  if (redButtonCount > 0) {
    // Activate a step first
    const firstStep = redStepButtons.first();
    await firstStep.click();
    
    console.log('Step activated, fill:', await firstStep.getAttribute('fill'));
    
    // Try to play
    const playButton = page.getByText('▶ Play');
    console.log('Play button visible:', await playButton.isVisible());
    
    await playButton.click();
    
    // Check what happens after clicking play
    await page.waitForTimeout(1000);
    
    // Check if button text changed
    const buttonText = await playButton.textContent();
    console.log('Button text after click:', buttonText);
    
    // Check if there's a stop button elsewhere
    const stopSymbol = page.getByText('■');
    const stopVisible = await stopSymbol.isVisible();
    console.log('Stop symbol visible:', stopVisible);
    
    // Success if either button changed or stop symbol appeared
    const playbackStarted = buttonText !== '▶ Play' || stopVisible;
    console.log('Playback started:', playbackStarted);
    
    expect(playbackStarted).toBe(true);
  } else {
    throw new Error('No step buttons found');
  }
});