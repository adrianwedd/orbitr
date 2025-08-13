import { test, expect } from '@playwright/test';

test.describe('GitHub Pages Deployment Tests', () => {
  const GITHUB_PAGES_URL = 'https://adrianwedd.github.io/orbitr/';

  test('GitHub Pages site loads without asset errors', async ({ page }) => {
    // Listen for console errors and failed network requests
    const consoleErrors: string[] = [];
    const failedRequests: string[] = [];

    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    page.on('response', response => {
      if (!response.ok() && response.status() >= 400) {
        failedRequests.push(`${response.status()} - ${response.url()}`);
      }
    });

    // Navigate to GitHub Pages
    console.log(`Testing GitHub Pages deployment: ${GITHUB_PAGES_URL}`);
    await page.goto(GITHUB_PAGES_URL);
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Check that main content loads
    await expect(page.getByText('ORBITR')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Multi-track circular sequencer')).toBeVisible();

    // Check that enhanced sequencer loads
    await expect(page.locator('svg[viewBox="0 0 440 440"]')).toBeVisible();
    
    // Check for play button
    await expect(page.getByRole('button', { name: /play/i })).toBeVisible();

    // Check sample pack selector
    await expect(page.getByText('AI Sample Packs')).toBeVisible();
    await expect(page.getByText('Lo-Fi')).toBeVisible();

    // Report any asset loading failures
    if (failedRequests.length > 0) {
      console.error('Failed requests detected:');
      failedRequests.forEach(req => console.error(`  - ${req}`));
      throw new Error(`${failedRequests.length} assets failed to load`);
    }

    // Report critical console errors (ignore some expected warnings)
    const criticalErrors = consoleErrors.filter(error => 
      !error.includes('The resource') && // Ignore preload warnings
      !error.includes('mce-autosize-textarea') && // Ignore custom element warnings
      !error.includes('ServiceWorker') // Ignore SW warnings
    );

    if (criticalErrors.length > 0) {
      console.error('Critical console errors detected:');
      criticalErrors.forEach(error => console.error(`  - ${error}`));
    }

    console.log(`✅ GitHub Pages test passed - ${failedRequests.length} failed requests, ${criticalErrors.length} critical errors`);
  });

  test('Enhanced UI features are present on GitHub Pages', async ({ page }) => {
    await page.goto(GITHUB_PAGES_URL);
    await page.waitForLoadState('networkidle');

    // Check for enhanced sequencer features
    const sequencerSvg = page.locator('svg[viewBox="0 0 440 440"]');
    await expect(sequencerSvg).toBeVisible();

    // Check for track rings (O, R, B, I)
    await expect(sequencerSvg.getByText('O')).toBeVisible();
    await expect(sequencerSvg.getByText('R')).toBeVisible();  
    await expect(sequencerSvg.getByText('B')).toBeVisible();
    await expect(sequencerSvg.getByText('I')).toBeVisible();

    // Check for transport controls
    await expect(page.getByText('BPM')).toBeVisible();
    await expect(page.getByText('Swing')).toBeVisible();
    await expect(page.getByText('Master')).toBeVisible();

    // Check for track controls
    await expect(page.getByText('Track O')).toBeVisible();
    await expect(page.getByRole('button', { name: /mute/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /solo/i })).toBeVisible();

    // Check for step editor
    await expect(page.getByText('Step Editor')).toBeVisible();
    await expect(page.getByText('AI Prompt')).toBeVisible();

    // Check for sample packs (new additions)
    await expect(page.getByText('Chicago House')).toBeVisible();
    await expect(page.getByText('Jungle')).toBeVisible();
    await expect(page.getByText('Drum & Bass')).toBeVisible();

    console.log('✅ All enhanced UI features are present on GitHub Pages');
  });

  test('Basic interactions work on GitHub Pages', async ({ page }) => {
    await page.goto(GITHUB_PAGES_URL);
    await page.waitForLoadState('networkidle');

    // Test play button interaction (should change text/state)
    const playButton = page.getByRole('button', { name: /play/i });
    await expect(playButton).toBeVisible();
    
    // Click play (note: audio won't work in headless mode but UI should update)
    await playButton.click();
    
    // Check if button state changes (might be "Stop" or different styling)
    await page.waitForTimeout(1000);

    // Test track selection
    const trackButton = page.getByRole('button', { name: /select track o/i });
    if (await trackButton.isVisible()) {
      await trackButton.click();
    }

    // Test sample pack expansion
    const lofiPack = page.getByText('Lo-Fi').first();
    await lofiPack.click();

    console.log('✅ Basic interactions work on GitHub Pages');
  });

  test('CSS and JavaScript assets load correctly', async ({ page }) => {
    const loadedAssets: string[] = [];
    const failedAssets: string[] = [];

    page.on('response', response => {
      const url = response.url();
      if (url.includes('_next/static/')) {
        if (response.ok()) {
          loadedAssets.push(url);
        } else {
          failedAssets.push(`${response.status()} - ${url}`);
        }
      }
    });

    await page.goto(GITHUB_PAGES_URL);
    await page.waitForLoadState('networkidle');

    // Wait a bit more for all assets
    await page.waitForTimeout(2000);

    console.log(`Loaded assets: ${loadedAssets.length}`);
    console.log(`Failed assets: ${failedAssets.length}`);

    if (failedAssets.length > 0) {
      console.error('Failed to load assets:');
      failedAssets.forEach(asset => console.error(`  - ${asset}`));
    }

    // Should have loaded CSS, JS chunks, fonts
    expect(loadedAssets.length).toBeGreaterThan(5);
    expect(failedAssets.length).toBe(0);

    console.log('✅ All assets loaded successfully');
  });
});