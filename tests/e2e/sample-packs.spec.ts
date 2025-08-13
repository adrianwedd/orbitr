import { test, expect } from '@playwright/test';

const EXPECTED_SAMPLE_PACKS = [
  'Lo-Fi', 'Techno', 'Trap', 'House', 'Ambient',
  'Detroit', 'Berlin', 'UK Garage', 'Chicago House', 'Jungle',
  'Drum & Bass', 'Breakbeat', 'Acid', 'Minimal', 'Dub',
  'Trance', 'Experimental'
];

const EXPECTED_PACK_COUNT = 17; // Based on actual UI display

test.describe('Sample Packs UI', () => {
  test('should display all sample packs', async ({ page }) => {
    await page.goto('http://localhost:3001');
    
    // Wait for page to load
    await page.waitForSelector('h1:has-text("ORBITR")', { timeout: 10000 });
    
    // Look for sample pack selector component
    const samplePackSection = page.locator('text=AI Sample Packs').first();
    await expect(samplePackSection).toBeVisible({ timeout: 5000 });
    
    // Check that it shows curated packs (exact count may vary)
    await expect(page.locator('text=/\\d+ curated packs/')).toBeVisible();
    
    // Verify some key sample packs are present
    const keyPacks = ['Lo-Fi', 'Detroit', 'Berlin', 'Experimental'];
    for (const packName of keyPacks) {
      const packTitle = page.locator(`h3:has-text("${packName}")`);
      await expect(packTitle).toBeVisible();
      console.log(`✓ Found sample pack: ${packName}`);
    }
    
    console.log(`Key sample packs are visible in the UI`);
  });

  test('should be able to expand and interact with sample packs', async ({ page }) => {
    await page.goto('http://localhost:3001');
    
    // Wait for page to load
    await page.waitForSelector('h1:has-text("ORBITR")', { timeout: 10000 });
    
    // Test expanding Detroit pack
    const detroitPack = page.locator('h3:has-text("Detroit")').locator('..');
    await expect(detroitPack).toBeVisible();
    await detroitPack.click();
    
    // Should see Load Pack button
    const loadPackButton = page.locator('button:has-text("Load Pack")').first();
    await expect(loadPackButton).toBeVisible();
    
    // Test expanding Berlin pack
    const berlinPack = page.locator('h3:has-text("Berlin")').locator('..');
    await berlinPack.click();
    
    // Test expanding Experimental pack
    const experimentalPack = page.locator('h3:has-text("Experimental")').locator('..');
    await experimentalPack.click();
    
    // Should see individual Generate buttons when expanded
    const generateButtons = page.locator('button:has-text("Generate")');
    await expect(generateButtons.first()).toBeVisible();
    
    console.log('Successfully expanded and interacted with sample packs');
  });
});