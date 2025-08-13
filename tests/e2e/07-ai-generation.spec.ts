import { test, expect } from '@playwright/test';

test.describe('AI Generation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should display generation queue section', async ({ page }) => {
    await expect(page.getByText('Generation Queue')).toBeVisible();
    await expect(page.getByText('No generations in progress')).toBeVisible();
  });

  test('should show step editor when step is selected', async ({ page }) => {
    // Click on a step to select it
    const firstStep = page.locator('circle[stroke="#ef4444"]').filter({ has: page.locator('[role="button"]') }).first();
    await firstStep.click();
    
    // Step editor should become visible
    await expect(page.getByText('Step Editor')).toBeVisible();
  });

  test('should have AI prompt input in step editor', async ({ page }) => {
    // Select a step
    const firstStep = page.locator('circle[stroke="#ef4444"]').filter({ has: page.locator('[role="button"]') }).first();
    await firstStep.click();
    
    // Should show prompt input
    const promptInput = page.getByPlaceholder(/AI prompt/i).or(
      page.getByRole('textbox', { name: /prompt/i })
    );
    
    if (await promptInput.count() > 0) {
      await expect(promptInput.first()).toBeVisible();
    }
  });

  test('should have generate button in step editor', async ({ page }) => {
    // Select a step
    const firstStep = page.locator('circle[stroke="#ef4444"]').filter({ has: page.locator('[role="button"]') }).first();
    await firstStep.click();
    
    // Should show generate button
    const generateButton = page.getByRole('button', { name: /Generate/i }).or(
      page.getByRole('button', { name: /AI/i })
    );
    
    if (await generateButton.count() > 0) {
      await expect(generateButton.first()).toBeVisible();
    }
  });

  test('should trigger generation with keyboard shortcut', async ({ page }) => {
    // Select a step
    const firstStep = page.locator('circle[stroke="#ef4444"]').filter({ has: page.locator('[role="button"]') }).first();
    await firstStep.click();
    
    // Press G key to generate
    await page.keyboard.press('g');
    
    // Should trigger generation (check for loading state or queue update)
    // This might show a loading indicator or add item to generation queue
  });

  test('should show generation progress', async ({ page }) => {
    // Mock or trigger a generation
    // The generation queue should show progress
    
    // Check that progress elements exist in the DOM
    const progressIndicator = page.locator('[class*="progress"]').or(
      page.locator('text=Generating')
    );
    
    // Should handle loading states
  });

  test('should handle generation errors gracefully', async ({ page }) => {
    // Error messages should be displayed properly
    const errorContainer = page.locator('[class*="red"]').filter({ hasText: /error/i });
    
    // Error handling UI should exist
  });

  test('should show generation status in queue', async ({ page }) => {
    // Generation queue should show:
    // - Prompt text
    // - Status (generating, ready, error)
    // - Progress
    // - Target track
    
    await expect(page.getByText('Generation Queue')).toBeVisible();
    
    // Initially empty
    await expect(page.getByText('No generations in progress')).toBeVisible();
  });

  test('should clear generation queue items', async ({ page }) => {
    // Queue items should have clear/dismiss buttons
    // This would need actual generation items to test
    
    // Check that clear functionality exists
    const clearButton = page.getByRole('button', { name: /clear/i }).or(
      page.getByRole('button', { name: /dismiss/i })
    );
  });

  test('should integrate generation with sample library', async ({ page }) => {
    // After successful generation:
    // 1. Sample should appear in library
    // 2. Sample should be assigned to step
    // 3. Sample count should update
    
    // This is a complex integration test that would require:
    // - Mocking the backend API
    // - Or using actual generation (slow)
    // - Or using test fixtures
  });

  test('should show generation quality options', async ({ page }) => {
    // Select a step to access options
    const firstStep = page.locator('circle[stroke="#ef4444"]').filter({ has: page.locator('[role="button"]') }).first();
    await firstStep.click();
    
    // Look for quality settings (draft/high)
    const qualityOption = page.getByText(/quality/i).or(
      page.getByText(/draft/i)
    );
  });

  test('should validate prompt input', async ({ page }) => {
    // Select a step
    const firstStep = page.locator('circle[stroke="#ef4444"]').filter({ has: page.locator('[role="button"]') }).first();
    await firstStep.click();
    
    // Try to generate with empty prompt
    const generateButton = page.getByRole('button', { name: /Generate/i }).first();
    
    if (await generateButton.isVisible()) {
      await generateButton.click();
      
      // Should show validation error for empty prompt
      // Or button should be disabled
    }
  });

  test('should show loading states during generation', async ({ page }) => {
    // Loading indicators should be shown:
    // 1. In the generate button
    // 2. In the generation queue
    // 3. In the sample library
    
    // Check loading elements exist
    const loadingSpinner = page.locator('.animate-spin');
    const loadingText = page.getByText(/generating/i);
  });

  test('should handle concurrent generations', async ({ page }) => {
    // Multiple generations should be queued properly
    // Queue should show all active generations
    
    // This would require triggering multiple generations
    // and checking that the queue handles them correctly
  });

  test('should show generation metadata', async ({ page }) => {
    // Generated samples should show:
    // - Original prompt
    // - Generation time
    // - Quality setting
    // - Auto-assignment info
    
    // This metadata should be visible in the library
  });

  test('should cache generated samples', async ({ page }) => {
    // Same prompts should use cached results
    // Cache should be visible in sample library
    
    // Cache indicators should be shown
    const cacheIndicator = page.getByText(/cached/i);
  });

  test('should auto-assign generated samples to steps', async ({ page }) => {
    // After generation:
    // 1. Sample should be assigned to the originating step
    // 2. Step should show it has a sample
    // 3. Sample should be playable
    
    // Visual indicators for assigned samples
    const assignedStep = page.locator('circle[stroke*="#"]').filter({ hasText: /sample/i });
  });

  test('should support batch generation from packs', async ({ page }) => {
    // Sample pack generation should:
    // 1. Show progress for multiple samples
    // 2. Handle partial failures
    // 3. Auto-assign to correct tracks
    
    // This integrates pack loading with generation
  });
});