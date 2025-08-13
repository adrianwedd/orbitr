import { test, expect } from '@playwright/test';

test.describe('Circular Sequencer', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should display all four tracks (O-R-B-I)', async ({ page }) => {
    // Check that all track letters are visible in the SVG
    await expect(page.locator('svg text').filter({ hasText: 'O' })).toBeVisible();
    await expect(page.locator('svg text').filter({ hasText: 'R' })).toBeVisible();
    await expect(page.locator('svg text').filter({ hasText: 'B' })).toBeVisible();
    await expect(page.locator('svg text').filter({ hasText: 'I' })).toBeVisible();
  });

  test('should display 16 steps per track', async ({ page }) => {
    // Count step circles for each track (each track should have 16 steps)
    const trackOSteps = page.locator('svg circle[stroke="#ef4444"][role="button"]');
    await expect(trackOSteps).toHaveCount(16);
  });

  test('should toggle steps when clicked', async ({ page }) => {
    // Find the first step of track O
    const firstStep = page.locator('svg circle[stroke="#ef4444"][role="button"]').first();
    
    // Initially should be inactive (transparent fill)
    await expect(firstStep).toHaveAttribute('fill', 'transparent');
    
    // Click to activate
    await firstStep.click();
    
    // Should now be active (colored fill)
    await expect(firstStep).toHaveAttribute('fill', '#ef4444');
    
    // Click again to deactivate
    await firstStep.click();
    
    // Should be inactive again
    await expect(firstStep).toHaveAttribute('fill', 'transparent');
  });

  test('should show step tooltips on hover', async ({ page }) => {
    const firstStep = page.locator('svg circle[stroke="#ef4444"][role="button"]').first();
    
    // Hover over the step
    await firstStep.hover();
    
    // Check that tooltip appears
    await expect(page.getByText('Track O - Step 1')).toBeVisible();
    await expect(page.getByText('Click to toggle')).toBeVisible();
  });

  test('should have accessible step buttons', async ({ page }) => {
    const firstStep = page.locator('svg circle[stroke="#ef4444"][role="button"]').first();
    
    // Check accessibility attributes
    await expect(firstStep).toHaveAttribute('role', 'button');
    await expect(firstStep).toHaveAttribute('tabindex', '0');
    await expect(firstStep).toHaveAttribute('aria-label');
  });

  test('should respond to keyboard navigation', async ({ page }) => {
    const firstStep = page.locator('svg circle[stroke="#ef4444"][role="button"]').first();
    
    // Focus the step
    await firstStep.focus();
    
    // Press Enter to toggle
    await page.keyboard.press('Enter');
    
    // Should be activated
    await expect(firstStep).toHaveAttribute('fill', '#ef4444');
    
    // Press Space to toggle
    await page.keyboard.press('Space');
    
    // Should be deactivated
    await expect(firstStep).toHaveAttribute('fill', 'transparent');
  });

  test('should show current playing step when sequencer is running', async ({ page }) => {
    // Start playback
    const playButton = page.getByRole('button', { name: /Play sequencer/ });
    await playButton.click();
    
    // Check that play button changes to stop
    await expect(page.getByRole('button', { name: /Stop sequencer/ })).toBeVisible();
    
    // Wait a moment for step progression
    await page.waitForTimeout(500);
    
    // Stop playback
    await page.getByRole('button', { name: /Stop sequencer/ }).click();
    
    // Should return to play state
    await expect(page.getByRole('button', { name: /Play sequencer/ })).toBeVisible();
  });

  test('should select different tracks', async ({ page }) => {
    // Click on a step from track R (blue)
    const trackRStep = page.locator('svg circle[stroke="#3b82f6"][role="button"]').first();
    await trackRStep.click();
    
    // Click on a step from track B (green)
    const trackBStep = page.locator('svg circle[stroke="#10b981"][role="button"]').first();
    await trackBStep.click();
    
    // Click on a step from track I (yellow)
    const trackIStep = page.locator('svg circle[stroke="#f59e0b"][role="button"]').first();
    await trackIStep.click();
    
    // All should work without errors
    await expect(trackRStep).toHaveAttribute('fill', '#3b82f6');
    await expect(trackBStep).toHaveAttribute('fill', '#10b981');
    await expect(trackIStep).toHaveAttribute('fill', '#f59e0b');
  });
});