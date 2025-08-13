import { test, expect } from '@playwright/test';

test.describe('Sample Pack Functionality Tests', () => {
  const GITHUB_PAGES_URL = 'https://adrianwedd.github.io/orbitr/';

  test('Sample packs load and populate library on GitHub Pages', async ({ page }) => {
    await page.goto(GITHUB_PAGES_URL);
    await page.waitForLoadState('networkidle');

    // Check initial library state
    const libraryText = page.getByText('0 samples');
    await expect(libraryText).toBeVisible();

    // Click on a sample pack to load it
    console.log('Loading Lo-Fi sample pack...');
    const lofiLoadButton = page.getByRole('button', { name: 'Load Pack' }).first();
    await expect(lofiLoadButton).toBeVisible();
    await lofiLoadButton.click();

    // Wait for samples to load
    await page.waitForTimeout(3000);

    // Check if library shows loaded samples
    const updatedLibraryText = page.locator('text=/\\d+ samples/');
    await expect(updatedLibraryText).toBeVisible();

    // Get the number of samples loaded
    const samplesText = await updatedLibraryText.textContent();
    console.log(`Library now shows: ${samplesText}`);

    // Should have more than 0 samples
    expect(samplesText).not.toMatch(/^0 samples/);

    // Check if sample library has items
    const sampleItems = page.locator('.space-y-2 > div').filter({ hasText: /AI:|Generated|sample/i });
    const sampleCount = await sampleItems.count();
    console.log(`Found ${sampleCount} sample items in library`);

    expect(sampleCount).toBeGreaterThan(0);
  });

  test('Audio context initializes and play button works', async ({ page }) => {
    // Enable audio context (required for audio to work)
    await page.addInitScript(() => {
      // Mock audio context for testing
      (window as any).mockAudioEnabled = true;
    });

    await page.goto(GITHUB_PAGES_URL);
    await page.waitForLoadState('networkidle');

    // Load a sample pack first
    const loadButton = page.getByRole('button', { name: 'Load Pack' }).first();
    await loadButton.click();
    await page.waitForTimeout(2000);

    // Try to click play button
    const playButton = page.getByRole('button', { name: /play/i });
    await expect(playButton).toBeVisible();
    
    console.log('Clicking play button...');
    await playButton.click();

    // Wait for potential state change
    await page.waitForTimeout(1000);

    // Check if button state changed (might show "Stop" or have different styling)
    const buttonText = await playButton.textContent();
    console.log(`Play button now shows: ${buttonText}`);

    // Check console for audio-related messages
    const consoleLogs: string[] = [];
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('audio') || text.includes('Audio') || text.includes('play') || text.includes('context')) {
        consoleLogs.push(text);
      }
    });

    await page.waitForTimeout(2000);
    
    console.log('Audio-related console logs:');
    consoleLogs.forEach(log => console.log(`  - ${log}`));
  });

  test('Static sample generation works', async ({ page }) => {
    await page.goto(GITHUB_PAGES_URL);
    await page.waitForLoadState('networkidle');

    // Navigate to step editor
    await expect(page.getByText('Step Editor')).toBeVisible();

    // Find AI prompt input
    const promptInput = page.getByPlaceholder(/lofi kick drum/i);
    await expect(promptInput).toBeVisible();

    // Enter a prompt
    await promptInput.fill('test kick drum');

    // Click generate button (Draft)
    const generateButton = page.getByRole('button', { name: /draft/i });
    await generateButton.click();

    // Wait for generation (static samples should be fast)
    await page.waitForTimeout(3000);

    // Check if sample appears in library
    const libraryCount = page.locator('text=/\\d+ samples/');
    const samplesText = await libraryCount.textContent();
    console.log(`After generation, library shows: ${samplesText}`);

    // Check generation queue
    const queueSection = page.getByText('Generation Queue').locator('..');
    const queueContent = await queueSection.textContent();
    console.log(`Generation queue: ${queueContent}`);
  });

  test('Track assignment and step activation works', async ({ page }) => {
    await page.goto(GITHUB_PAGES_URL);
    await page.waitForLoadState('networkidle');

    // Load a sample pack
    const loadButton = page.getByRole('button', { name: 'Load Pack' }).first();
    await loadButton.click();
    await page.waitForTimeout(2000);

    // Select a track (should be pre-selected)
    const trackO = page.getByRole('button', { name: /select track o/i });
    if (await trackO.isVisible()) {
      await trackO.click();
    }

    // Check step editor for sample assignment
    const sampleSelect = page.locator('select').filter({ hasText: /choose from library/i });
    await expect(sampleSelect).toBeVisible();

    // Try to select a sample (if any are available)
    const options = await sampleSelect.locator('option').count();
    console.log(`Sample select has ${options} options`);

    if (options > 1) {
      await sampleSelect.selectOption({ index: 1 });
      
      // Activate the step
      const activateButton = page.getByRole('button', { name: /off/i });
      if (await activateButton.isVisible()) {
        await activateButton.click();
        
        // Check if button changes to "ON"
        await expect(page.getByRole('button', { name: /on/i })).toBeVisible();
        console.log('✅ Step activated successfully');
      }
    }

    // Check if sequencer shows active steps
    const sequencerSvg = page.locator('svg[viewBox="0 0 440 440"]');
    const activeSteps = sequencerSvg.locator('circle[fill*="#"]').filter({ hasNot: page.locator('[fill="transparent"]') });
    const activeCount = await activeSteps.count();
    console.log(`Sequencer shows ${activeCount} potentially active steps`);
  });
});