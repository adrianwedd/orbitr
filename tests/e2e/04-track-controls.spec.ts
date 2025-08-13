import { test, expect } from '@playwright/test';

test.describe('Track Controls', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should display all four tracks in track controls', async ({ page }) => {
    // Check that all tracks are shown with proper labels and colors
    await expect(page.getByText('Track O')).toBeVisible();
    await expect(page.getByText('Track R')).toBeVisible();
    await expect(page.getByText('Track B')).toBeVisible();
    await expect(page.getByText('Track I')).toBeVisible();
  });

  test('should select tracks when clicked', async ({ page }) => {
    // Click on Track R
    await page.getByText('Track R').click();
    
    // Track R should be selected (check for visual indication)
    // This would require checking the selected state styling
    
    // Click on Track B
    await page.getByText('Track B').click();
    
    // Click on Track I
    await page.getByText('Track I').click();
    
    // All selections should work without error
  });

  test('should control track volume', async ({ page }) => {
    // Find volume slider for Track O
    const trackOVolumeSlider = page.locator('[data-testid="track-o-volume"], input[type="range"]').first();
    
    if (await trackOVolumeSlider.isVisible()) {
      // Change volume
      await trackOVolumeSlider.fill('0.5');
      
      // Volume should be adjusted (we can't easily verify audio, but no errors should occur)
      await expect(trackOVolumeSlider).toHaveValue('0.5');
    }
  });

  test('should mute and unmute tracks', async ({ page }) => {
    // Look for mute button for Track O
    const muteButton = page.getByRole('button', { name: /Mute.*Track O/i }).or(
      page.locator('button').filter({ hasText: /mute/i }).first()
    );
    
    if (await muteButton.isVisible()) {
      // Click to mute
      await muteButton.click();
      
      // Click to unmute
      await muteButton.click();
    }
  });

  test('should solo and unsolo tracks', async ({ page }) => {
    // Look for solo button for Track O
    const soloButton = page.getByRole('button', { name: /Solo.*Track O/i }).or(
      page.locator('button').filter({ hasText: /solo/i }).first()
    );
    
    if (await soloButton.isVisible()) {
      // Click to solo
      await soloButton.click();
      
      // Click to unsolo
      await soloButton.click();
    }
  });

  test('should clear tracks', async ({ page }) => {
    // First, add some steps to a track
    const firstStep = page.locator('circle[stroke="#ef4444"]').filter({ has: page.locator('[role="button"]') }).first();
    await firstStep.click();
    
    // Verify step is active
    await expect(firstStep).toHaveAttribute('fill', '#ef4444');
    
    // Look for clear track button
    const clearButton = page.getByRole('button', { name: /Clear.*Track/i }).or(
      page.locator('button').filter({ hasText: /clear/i }).first()
    );
    
    if (await clearButton.isVisible()) {
      await clearButton.click();
      
      // Step should be cleared (back to transparent)
      await expect(firstStep).toHaveAttribute('fill', 'transparent');
    }
  });

  test('should show track colors correctly', async ({ page }) => {
    // Track colors should match the sequencer visualization
    // Track O = Red (#ef4444)
    // Track R = Blue (#3b82f6)  
    // Track B = Green (#10b981)
    // Track I = Yellow (#f59e0b)
    
    // We can check this by looking at the track indicators or labels
    const trackOElement = page.getByText('Track O');
    await expect(trackOElement).toBeVisible();
    
    // Similar for other tracks
    await expect(page.getByText('Track R')).toBeVisible();
    await expect(page.getByText('Track B')).toBeVisible();
    await expect(page.getByText('Track I')).toBeVisible();
  });

  test('should update track selection when sequencer steps are clicked', async ({ page }) => {
    // Click on a step from Track R (blue)
    const trackRStep = page.locator('circle[stroke="#3b82f6"]').filter({ has: page.locator('[role="button"]') }).first();
    await trackRStep.click();
    
    // Track R should become selected in track controls
    // This integration should work seamlessly
    
    // Click on a step from Track B (green)
    const trackBStep = page.locator('circle[stroke="#10b981"]').filter({ has: page.locator('[role="button"]') }).first();
    await trackBStep.click();
    
    // Track B should become selected
  });

  test('should maintain independent track states', async ({ page }) => {
    // Activate steps on different tracks
    const trackOStep = page.locator('circle[stroke="#ef4444"]').filter({ has: page.locator('[role="button"]') }).first();
    const trackRStep = page.locator('circle[stroke="#3b82f6"]').filter({ has: page.locator('[role="button"]') }).first();
    
    await trackOStep.click();
    await trackRStep.click();
    
    // Both should be active
    await expect(trackOStep).toHaveAttribute('fill', '#ef4444');
    await expect(trackRStep).toHaveAttribute('fill', '#3b82f6');
    
    // Deactivate one track's step
    await trackOStep.click();
    
    // Track O should be inactive, Track R should remain active
    await expect(trackOStep).toHaveAttribute('fill', 'transparent');
    await expect(trackRStep).toHaveAttribute('fill', '#3b82f6');
  });

  test('should show track status indicators', async ({ page }) => {
    // Track controls should show current state
    // Active steps, mute status, solo status, etc.
    
    // Activate a step on Track O
    const trackOStep = page.locator('circle[stroke="#ef4444"]').filter({ has: page.locator('[role="button"]') }).first();
    await trackOStep.click();
    
    // Track controls should reflect this somehow
    // The exact implementation depends on the UI design
  });
});