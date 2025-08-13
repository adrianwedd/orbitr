import { test, expect } from '@playwright/test';

test.describe('Transport Controls', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should have play/stop functionality', async ({ page }) => {
    // Find the transport controls play button (not the SVG center button)
    const playButton = page.getByText('▶ Play');
    await expect(playButton).toBeVisible();
    
    // Click play
    await playButton.click();
    
    // Should change to stop button
    await expect(page.getByRole('button', { name: /Stop/ })).toBeVisible();
    
    // Click stop
    await page.getByRole('button', { name: /Stop/ }).click();
    
    // Should return to play
    await expect(page.getByRole('button', { name: /Play/ })).toBeVisible();
  });

  test('should control BPM with slider', async ({ page }) => {
    const bpmSlider = page.getByRole('slider', { name: /Tempo/ });
    const bpmDisplay = page.locator('text=120').last(); // BPM display
    
    // Check initial BPM
    await expect(bpmDisplay).toBeVisible();
    
    // Change BPM using slider
    await bpmSlider.fill('140');
    
    // Check that display updates
    await expect(page.locator('text=140')).toBeVisible();
    
    // Test BPM limits
    await bpmSlider.fill('200'); // Max
    await expect(page.locator('text=200')).toBeVisible();
    
    await bpmSlider.fill('40'); // Min
    await expect(page.locator('text=40')).toBeVisible();
  });

  test('should control swing with slider', async ({ page }) => {
    const swingSlider = page.getByRole('slider', { name: /Swing/ });
    const swingDisplay = page.locator('text=0%');
    
    // Check initial swing
    await expect(swingDisplay).toBeVisible();
    
    // Change swing
    await swingSlider.fill('0.3');
    
    // Check that display updates
    await expect(page.locator('text=30%')).toBeVisible();
    
    // Test swing limits
    await swingSlider.fill('1');
    await expect(page.locator('text=100%')).toBeVisible();
    
    await swingSlider.fill('0');
    await expect(page.locator('text=0%')).toBeVisible();
  });

  test('should control master volume with slider', async ({ page }) => {
    const masterSlider = page.getByRole('slider', { name: /Master volume/ });
    const masterDisplay = page.locator('text=90%');
    
    // Check initial master volume
    await expect(masterDisplay).toBeVisible();
    
    // Change master volume
    await masterSlider.fill('0.5');
    
    // Check that display updates
    await expect(page.locator('text=50%')).toBeVisible();
    
    // Test volume limits
    await masterSlider.fill('1');
    await expect(page.locator('text=100%')).toBeVisible();
    
    await masterSlider.fill('0');
    await expect(page.locator('text=0%')).toBeVisible();
  });

  test('should toggle reverse playback', async ({ page }) => {
    const reverseCheckbox = page.getByRole('checkbox', { name: /Toggle reverse playback/ });
    
    // Should be unchecked initially
    await expect(reverseCheckbox).not.toBeChecked();
    
    // Click to enable reverse
    await reverseCheckbox.check();
    await expect(reverseCheckbox).toBeChecked();
    
    // Click to disable reverse
    await reverseCheckbox.uncheck();
    await expect(reverseCheckbox).not.toBeChecked();
  });

  test('should respond to keyboard shortcuts', async ({ page }) => {
    // Test spacebar for play/stop
    const playButton = page.getByRole('button', { name: /Play/ });
    
    // Press spacebar to play
    await page.keyboard.press('Space');
    await expect(page.getByRole('button', { name: /Stop/ })).toBeVisible();
    
    // Press spacebar to stop
    await page.keyboard.press('Space');
    await expect(page.getByRole('button', { name: /Play/ })).toBeVisible();
  });

  test('should adjust BPM with arrow keys', async ({ page }) => {
    const bpmDisplay = page.locator('text=120').last();
    await expect(bpmDisplay).toBeVisible();
    
    // Increase BPM with right arrow
    await page.keyboard.press('ArrowRight');
    await expect(page.locator('text=125')).toBeVisible();
    
    // Decrease BPM with left arrow
    await page.keyboard.press('ArrowLeft');
    await expect(page.locator('text=120')).toBeVisible();
  });

  test('should show tooltips for controls', async ({ page }) => {
    // Hover over BPM label
    await page.getByText('BPM').hover();
    await expect(page.getByText('Beats per minute')).toBeVisible();
    
    // Hover over Swing label
    await page.getByText('Swing').hover();
    await expect(page.getByText('Rhythmic swing timing')).toBeVisible();
    
    // Hover over Master label  
    await page.getByText('Master').hover();
    await expect(page.getByText('Master volume control')).toBeVisible();
  });

  test('should maintain state during playback', async ({ page }) => {
    // Start playback
    await page.getByRole('button', { name: /Play/ }).click();
    
    // Change BPM during playback
    const bpmSlider = page.getByRole('slider', { name: /Tempo/ });
    await bpmSlider.fill('160');
    await expect(page.locator('text=160')).toBeVisible();
    
    // Change swing during playback
    const swingSlider = page.getByRole('slider', { name: /Swing/ });
    await swingSlider.fill('0.2');
    await expect(page.locator('text=20%')).toBeVisible();
    
    // Stop playback
    await page.getByRole('button', { name: /Stop/ }).click();
    
    // Settings should be maintained
    await expect(page.locator('text=160')).toBeVisible();
    await expect(page.locator('text=20%')).toBeVisible();
  });
});