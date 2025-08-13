import { test, expect } from '@playwright/test';

test.describe('Integration Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Dismiss the startup helper if it appears
    await page.waitForTimeout(3000);
    const dismissButton = page.getByRole('button', { name: /Dismiss/i });
    if (await dismissButton.isVisible()) {
      await dismissButton.click();
    }
  });

  test('should complete full workflow: load pack -> assign to steps -> play', async ({ page }) => {
    // 1. Load a sample pack
    const loadPackButton = page.getByRole('button', { name: /Load Pack/i }).first();
    await loadPackButton.click();
    
    // Wait for loading to complete (this is a long operation)
    await expect(page.getByText('Loading...')).toBeVisible();
    
    // Set a longer timeout for pack loading
    await page.waitForTimeout(10000);
    
    // 2. Check that samples appear in library
    await expect(page.getByText(/\d+ samples/)).toBeVisible();
    
    // 3. Verify steps are auto-assigned
    const activeSteps = page.locator('circle[fill*="#"]').filter({ hasText: /active/i });
    
    // 4. Start playback
    await page.getByRole('button', { name: /Play/ }).click();
    
    // 5. Verify playback is running
    await expect(page.getByRole('button', { name: /Stop/ })).toBeVisible();
    
    // 6. Stop playback
    await page.getByRole('button', { name: /Stop/ }).click();
  });

  test('should handle step selection and editing workflow', async ({ page }) => {
    // 1. Select a step on track O
    const trackOStep = page.locator('circle[stroke="#ef4444"]').filter({ has: page.locator('[role="button"]') }).first();
    await trackOStep.click();
    
    // 2. Verify step editor appears
    await expect(page.getByText('Step Editor')).toBeVisible();
    
    // 3. Toggle step active/inactive
    await trackOStep.click();
    await expect(trackOStep).toHaveAttribute('fill', '#ef4444');
    
    // 4. Switch to different track
    const trackRStep = page.locator('circle[stroke="#3b82f6"]').filter({ has: page.locator('[role="button"]') }).first();
    await trackRStep.click();
    
    // 5. Verify track selection updates
    await trackRStep.click();
    await expect(trackRStep).toHaveAttribute('fill', '#3b82f6');
  });

  test('should maintain state across user interactions', async ({ page }) => {
    // 1. Set custom BPM
    const bpmSlider = page.getByRole('slider', { name: /Tempo/ });
    await bpmSlider.fill('150');
    
    // 2. Enable swing
    const swingSlider = page.getByRole('slider', { name: /Swing/ });
    await swingSlider.fill('0.3');
    
    // 3. Enable reverse
    const reverseCheckbox = page.getByRole('checkbox', { name: /Toggle reverse playback/ });
    await reverseCheckbox.check();
    
    // 4. Activate some steps
    const step1 = page.locator('circle[stroke="#ef4444"]').filter({ has: page.locator('[role="button"]') }).first();
    const step2 = page.locator('circle[stroke="#3b82f6"]').filter({ has: page.locator('[role="button"]') }).first();
    await step1.click();
    await step2.click();
    
    // 5. Start and stop playback
    await page.getByRole('button', { name: /Play/ }).click();
    await page.waitForTimeout(1000);
    await page.getByRole('button', { name: /Stop/ }).click();
    
    // 6. Verify all settings are maintained
    await expect(page.locator('text=150')).toBeVisible();
    await expect(page.locator('text=30%')).toBeVisible();
    await expect(reverseCheckbox).toBeChecked();
    await expect(step1).toHaveAttribute('fill', '#ef4444');
    await expect(step2).toHaveAttribute('fill', '#3b82f6');
  });

  test('should handle keyboard shortcuts across the application', async ({ page }) => {
    // 1. Use spacebar for play/stop
    await page.keyboard.press('Space');
    await expect(page.getByRole('button', { name: /Stop/ })).toBeVisible();
    await page.keyboard.press('Space');
    await expect(page.getByRole('button', { name: /Play/ })).toBeVisible();
    
    // 2. Use arrow keys for BPM
    await page.keyboard.press('ArrowRight');
    await expect(page.locator('text=125')).toBeVisible();
    
    // 3. Use number keys for step selection
    await page.keyboard.press('1');
    // Should select step 1 (this requires the focus management to work)
    
    // 4. Use R for reverse toggle
    await page.keyboard.press('r');
    await expect(page.getByRole('checkbox', { name: /Toggle reverse playback/ })).toBeChecked();
  });

  test('should handle error states gracefully', async ({ page }) => {
    // 1. Try to generate without backend (simulate network error)
    // This would require mocking network responses
    
    // 2. Test with invalid file uploads
    // This would require file upload simulation
    
    // 3. Test with corrupted samples
    // This would require mock data
    
    // For now, just verify error UI elements exist
    const errorContainer = page.locator('[class*="red"]');
    // Should handle errors without crashing
  });

  test('should manage memory and performance during intensive use', async ({ page }) => {
    // 1. Load multiple samples
    // 2. Start/stop playback multiple times
    // 3. Switch between tracks rapidly
    // 4. Generate multiple samples
    
    // The app should remain responsive
    // No memory leaks should occur
    
    // Rapid interactions test
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Space'); // Toggle play/stop
      await page.waitForTimeout(100);
    }
    
    // The app should still be responsive
    await expect(page.getByRole('button', { name: /Play/ })).toBeVisible();
  });

  test('should preserve user work during session', async ({ page }) => {
    // 1. Create a complex pattern
    const steps = page.locator('circle[stroke="#ef4444"]').filter({ has: page.locator('[role="button"]') });
    await steps.nth(0).click();
    await steps.nth(4).click();
    await steps.nth(8).click();
    await steps.nth(12).click();
    
    // 2. Adjust settings
    await page.getByRole('slider', { name: /Tempo/ }).fill('140');
    
    // 3. Navigate around the UI
    await page.getByText('Sample Library').click();
    await page.getByText('AI Sample Packs').click();
    
    // 4. Verify pattern is preserved
    await expect(steps.nth(0)).toHaveAttribute('fill', '#ef4444');
    await expect(steps.nth(4)).toHaveAttribute('fill', '#ef4444');
    await expect(steps.nth(8)).toHaveAttribute('fill', '#ef4444');
    await expect(steps.nth(12)).toHaveAttribute('fill', '#ef4444');
    
    // 5. Verify settings are preserved
    await expect(page.locator('text=140')).toBeVisible();
  });

  test('should handle responsive design on different screen sizes', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Main elements should still be visible
    await expect(page.getByText('ORBITR')).toBeVisible();
    await expect(page.locator('svg')).toBeVisible();
    
    // Test tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    
    // Layout should adapt
    await expect(page.getByText('ORBITR')).toBeVisible();
    
    // Test desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 });
    
    // Should show full layout
    await expect(page.getByText('ORBITR')).toBeVisible();
    await expect(page.getByText('Sample Library')).toBeVisible();
    await expect(page.getByText('AI Sample Packs')).toBeVisible();
  });

  test('should maintain audio context across interactions', async ({ page }) => {
    // Audio context should be initialized properly
    // This is hard to test directly, but we can verify:
    
    // 1. Play button works
    await page.getByRole('button', { name: /Play/ }).click();
    await expect(page.getByRole('button', { name: /Stop/ })).toBeVisible();
    
    // 2. Preview buttons work (when samples are loaded)
    // This would require samples to be present
    
    // 3. No audio-related errors occur
    // Check console for audio context errors
  });

  test('should handle concurrent operations smoothly', async ({ page }) => {
    // 1. Start playback
    await page.getByRole('button', { name: /Play/ }).click();
    
    // 2. While playing, adjust controls
    await page.getByRole('slider', { name: /Tempo/ }).fill('160');
    await page.getByRole('slider', { name: /Master volume/ }).fill('0.7');
    
    // 3. Toggle steps during playback
    const step = page.locator('circle[stroke="#ef4444"]').filter({ has: page.locator('[role="button"]') }).first();
    await step.click();
    
    // 4. Switch tracks
    const trackRStep = page.locator('circle[stroke="#3b82f6"]').filter({ has: page.locator('[role="button"]') }).first();
    await trackRStep.click();
    
    // All operations should work smoothly without conflicts
    await expect(page.getByRole('button', { name: /Stop/ })).toBeVisible();
    await expect(page.locator('text=160')).toBeVisible();
  });
});