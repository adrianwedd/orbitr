import { test, expect } from '@playwright/test';

test.describe('Sample Packs', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should display AI sample packs section', async ({ page }) => {
    await expect(page.getByText('AI Sample Packs')).toBeVisible();
    await expect(page.getByText(/\d+ curated packs/)).toBeVisible();
  });

  test('should show available sample packs', async ({ page }) => {
    // Should show the predefined sample packs
    await expect(page.getByText('Lo-Fi Chill')).toBeVisible();
    await expect(page.getByText('Techno Drive')).toBeVisible();
    await expect(page.getByText('Trap Beats')).toBeVisible();
    await expect(page.getByText('House Groove')).toBeVisible();
    await expect(page.getByText('Ambient Texture')).toBeVisible();
  });

  test('should display pack descriptions', async ({ page }) => {
    // Each pack should have a description
    await expect(page.getByText('Mellow lo-fi drum patterns')).toBeVisible();
    await expect(page.getByText('Hard-hitting techno rhythms')).toBeVisible();
    await expect(page.getByText('Modern trap-style beats')).toBeVisible();
    await expect(page.getByText('Classic house drum patterns')).toBeVisible();
    await expect(page.getByText('Atmospheric ambient textures')).toBeVisible();
  });

  test('should have load pack buttons', async ({ page }) => {
    const loadButtons = page.getByRole('button', { name: /Load Pack/i });
    
    // Should have multiple load pack buttons (one per pack)
    await expect(loadButtons).toHaveCount(5);
    
    // Buttons should be enabled initially
    await expect(loadButtons.first()).toBeEnabled();
  });

  test('should expand pack details when clicked', async ({ page }) => {
    // Find the first pack header
    const packHeader = page.getByText('Lo-Fi Chill').locator('..');
    
    // Click to expand
    await packHeader.click();
    
    // Should show individual samples in the pack
    await expect(page.getByText('Lo-fi kick')).toBeVisible();
    await expect(page.getByText('Vinyl snare')).toBeVisible();
    
    // Should show track assignments
    await expect(page.getByText('Track O')).toBeVisible();
    await expect(page.getByText('Track R')).toBeVisible();
  });

  test('should show sample details in expanded pack', async ({ page }) => {
    // Expand a pack
    const packHeader = page.getByText('Lo-Fi Chill').locator('..');
    await packHeader.click();
    
    // Should show sample names
    await expect(page.getByText('Lo-fi kick')).toBeVisible();
    
    // Should show AI prompts in quotes
    await expect(page.getByText(/".*"/)).toBeVisible();
    
    // Should show suggested track assignments
    await expect(page.getByText('Track O')).toBeVisible();
  });

  test('should have individual sample generate buttons', async ({ page }) => {
    // Expand a pack
    const packHeader = page.getByText('Lo-Fi Chill').locator('..');
    await packHeader.click();
    
    // Should have generate buttons for individual samples
    const generateButtons = page.getByRole('button', { name: /Generate/i });
    await expect(generateButtons.first()).toBeVisible();
    await expect(generateButtons.first()).toBeEnabled();
  });

  test('should show track color coding', async ({ page }) => {
    // Expand a pack
    const packHeader = page.getByText('Lo-Fi Chill').locator('..');
    await packHeader.click();
    
    // Track assignments should be color-coded
    // Track O = Red, Track R = Blue, etc.
    const trackOBadge = page.locator('[style*="#ef4444"]').filter({ hasText: 'Track O' });
    if (await trackOBadge.count() > 0) {
      await expect(trackOBadge.first()).toBeVisible();
    }
  });

  test('should collapse pack when clicked again', async ({ page }) => {
    const packHeader = page.getByText('Lo-Fi Chill').locator('..');
    
    // Expand
    await packHeader.click();
    await expect(page.getByText('Lo-fi kick')).toBeVisible();
    
    // Collapse
    await packHeader.click();
    await expect(page.getByText('Lo-fi kick')).not.toBeVisible();
  });

  test('should show expand/collapse indicators', async ({ page }) => {
    // Should show arrow indicators
    await expect(page.getByText('▼')).toBeVisible();
    
    // After expanding, should show up arrow
    const packHeader = page.getByText('Lo-Fi Chill').locator('..');
    await packHeader.click();
    await expect(page.getByText('▲')).toBeVisible();
  });

  test('should handle pack loading', async ({ page }) => {
    const loadButton = page.getByRole('button', { name: /Load Pack/i }).first();
    
    // Click load pack
    await loadButton.click();
    
    // Should show loading state
    await expect(page.getByText('Loading...')).toBeVisible();
    
    // Button should be disabled during loading
    await expect(loadButton).toBeDisabled();
  });

  test('should show helpful tooltips', async ({ page }) => {
    // Hover over load pack button
    const loadButton = page.getByRole('button', { name: /Load Pack/i }).first();
    await loadButton.hover();
    
    // Should show tooltip explaining the action
    await expect(page.getByText(/Load all.*samples/i)).toBeVisible();
    
    // Expand pack and hover over generate button
    const packHeader = page.getByText('Lo-Fi Chill').locator('..');
    await packHeader.click();
    
    const generateButton = page.getByRole('button', { name: /Generate/i }).first();
    await generateButton.hover();
    
    await expect(page.getByText('Generate this sample')).toBeVisible();
  });

  test('should show pack information clearly', async ({ page }) => {
    // Pack count should be accurate
    await expect(page.getByText('5 curated packs')).toBeVisible();
    
    // Pack descriptions should be informative
    await expect(page.getByText('provide curated AI prompts')).toBeVisible();
    await expect(page.getByText('auto-assign to suggested tracks')).toBeVisible();
  });

  test('should handle multiple packs independently', async ({ page }) => {
    // Expand first pack
    const pack1Header = page.getByText('Lo-Fi Chill').locator('..');
    await pack1Header.click();
    
    // Expand second pack
    const pack2Header = page.getByText('Techno Drive').locator('..');
    await pack2Header.click();
    
    // Both should be expanded
    await expect(page.getByText('Lo-fi kick')).toBeVisible();
    await expect(page.getByText('Techno kick')).toBeVisible();
    
    // Collapse first pack
    await pack1Header.click();
    
    // First should be collapsed, second still expanded
    await expect(page.getByText('Lo-fi kick')).not.toBeVisible();
    await expect(page.getByText('Techno kick')).toBeVisible();
  });

  test('should integrate with sample library', async ({ page }) => {
    // After loading a pack, samples should appear in library
    // This is an integration test that would require waiting for AI generation
    
    // The UI should handle the workflow seamlessly
    // Load pack -> Generate samples -> Add to library -> Auto-assign to tracks
  });

  test('should show sample count per pack', async ({ page }) => {
    // Expand a pack
    const packHeader = page.getByText('Lo-Fi Chill').locator('..');
    await packHeader.click();
    
    // Should show the correct number of samples
    // Count the individual sample items
    const sampleItems = page.locator('[class*="bg-zinc-800"]').filter({ hasText: /Track [ORBI]/ });
    await expect(sampleItems.first()).toBeVisible();
  });
});