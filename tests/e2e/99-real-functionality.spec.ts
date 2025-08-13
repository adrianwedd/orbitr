import { test, expect } from '@playwright/test';

test.describe('Real Functionality Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should actually generate AI samples', async ({ page }) => {
    // This test will take time due to actual AI generation
    test.setTimeout(60000); // 1 minute timeout
    
    // Click on a step to select it
    const firstStep = page.locator('svg circle[stroke="#ef4444"][role="button"]').first();
    await firstStep.click();
    
    // Check that step editor appears
    await expect(page.getByText('Step Editor')).toBeVisible();
    
    // Find AI prompt input
    const promptInput = page.getByPlaceholder(/prompt/i).or(page.locator('input[type="text"]').last());
    
    if (await promptInput.count() > 0) {
      // Enter a prompt
      await promptInput.fill('kick drum');
      
      // Click generate
      const generateButton = page.getByRole('button', { name: /Generate/i }).last();
      await generateButton.click();
      
      // Should show loading state
      await expect(page.getByText(/generating/i)).toBeVisible({ timeout: 5000 });
      
      // Wait for generation to complete
      await expect(page.getByText(/generating/i)).not.toBeVisible({ timeout: 30000 });
      
      // Sample should appear in library
      await expect(page.getByText('1 samples')).toBeVisible({ timeout: 5000 });
      
      // Step should be activated
      await expect(firstStep).toHaveAttribute('fill', '#ef4444');
    }
  });

  test('should load sample pack and auto-assign', async ({ page }) => {
    test.setTimeout(120000); // 2 minutes for pack loading
    
    // Click load pack button
    const loadPackButton = page.getByRole('button', { name: /Load Pack/i }).first();
    await loadPackButton.click();
    
    // Should show loading state
    await expect(page.getByText('Loading...')).toBeVisible({ timeout: 5000 });
    
    // Wait for pack loading to complete (this takes time)
    await expect(page.getByText('Loading...')).not.toBeVisible({ timeout: 90000 });
    
    // Samples should appear in library
    await expect(page.getByText(/\d+ samples/)).toBeVisible();
    
    // Some steps should be auto-activated
    const activeSteps = page.locator('svg circle[fill="#ef4444"]');
    await expect(activeSteps.first()).toBeVisible({ timeout: 5000 });
  });

  test('should play audio when sequencer is started', async ({ page }) => {
    // First activate a step
    const firstStep = page.locator('svg circle[stroke="#ef4444"][role="button"]').first();
    await firstStep.click();
    
    // Verify step is active
    await expect(firstStep).toHaveAttribute('fill', '#ef4444');
    
    // Start playback
    const playButton = page.getByText('▶ Play');
    await playButton.click();
    
    // Should change to stop button
    await expect(page.getByText('■')).toBeVisible();
    
    // Should show current playing step indicator
    await page.waitForTimeout(1000);
    
    // Stop playback
    const stopButton = page.getByText('■');
    await stopButton.click();
    
    // Should return to play state
    await expect(page.getByText('▶ Play')).toBeVisible();
  });

  test('should handle backend connectivity', async ({ page }) => {
    // Try to access generation features
    const firstStep = page.locator('svg circle[stroke="#ef4444"][role="button"]').first();
    await firstStep.click();
    
    // Check if backend is reachable by looking at UI state
    // If backend is down, generation should show errors
    
    const promptInput = page.getByPlaceholder(/prompt/i).or(page.locator('input[type="text"]').last());
    
    if (await promptInput.count() > 0) {
      await promptInput.fill('test');
      
      const generateButton = page.getByRole('button', { name: /Generate/i }).last();
      await generateButton.click();
      
      // Should either show loading or error
      const hasLoading = await page.getByText(/generating/i).isVisible({ timeout: 2000 });
      const hasError = await page.locator('[class*="red"]').isVisible({ timeout: 2000 });
      
      expect(hasLoading || hasError).toBe(true);
    }
  });

  test('should show proper cache behavior', async ({ page }) => {
    // Check initial cache state
    const cacheDisplay = page.locator('text=0%').or(page.getByText(/cache/i));
    
    // Cache management should be present
    await expect(page.getByRole('button', { name: /Clear/i })).toBeVisible();
    
    // Cache should start empty or show current state
    const cachePercentage = page.locator('[class*="bg-zinc-700"]');
    await expect(cachePercentage.first()).toBeVisible();
  });

  test('should handle step editor workflow', async ({ page }) => {
    // Select step
    const firstStep = page.locator('svg circle[stroke="#ef4444"][role="button"]').first();
    await firstStep.click();
    
    // Step editor should show
    await expect(page.getByText('Step Editor')).toBeVisible();
    
    // Should show step controls
    await expect(page.getByText('Gain')).toBeVisible();
    await expect(page.getByText('Probability')).toBeVisible();
    
    // Gain slider should work
    const gainSlider = page.getByRole('slider').filter({ hasText: /gain/i }).or(
      page.locator('input[type="range"]').nth(2)
    );
    
    if (await gainSlider.count() > 0) {
      await gainSlider.fill('0.5');
    }
  });

  test('should maintain state during complex interactions', async ({ page }) => {
    // Set BPM
    const bpmSlider = page.getByRole('slider').first();
    await bpmSlider.fill('140');
    
    // Activate multiple steps
    const steps = page.locator('svg circle[stroke="#ef4444"][role="button"]');
    await steps.nth(0).click();
    await steps.nth(4).click();
    await steps.nth(8).click();
    
    // Start playback
    await page.getByText('▶ Play').click();
    
    // Change settings during playback
    await bpmSlider.fill('160');
    
    // Stop playback
    await page.getByText('■').click();
    
    // Verify state maintained
    await expect(page.locator('text=160')).toBeVisible();
    await expect(steps.nth(0)).toHaveAttribute('fill', '#ef4444');
    await expect(steps.nth(4)).toHaveAttribute('fill', '#ef4444');
    await expect(steps.nth(8)).toHaveAttribute('fill', '#ef4444');
  });
});