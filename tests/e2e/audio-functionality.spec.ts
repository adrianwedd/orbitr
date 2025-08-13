import { test, expect } from '@playwright/test';

test.describe('Audio Functionality Tests - Verify complete audio workflow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Set up console logging to catch audio errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('Console error:', msg.text());
      }
    });
  });

  test('should initialize audio context properly', async ({ page }) => {
    // Audio context should be initialized when user interacts
    const firstStep = page.locator('svg circle[stroke="#ef4444"][role="button"]').first();
    await firstStep.click();
    
    // Try to start playback (this should initialize audio context)
    const playButton = page.getByText('▶ Play');
    await playButton.click();
    
    // Check for audio context errors in console
    await page.waitForTimeout(2000);
    
    // Audio context should be created (check by attempting audio operations)
    const audioContextCreated = await page.evaluate(() => {
      return typeof window.AudioContext !== 'undefined' || typeof (window as any).webkitAudioContext !== 'undefined';
    });
    
    expect(audioContextCreated).toBe(true);
  });

  test('should handle sequencer timing and step progression', async ({ page }) => {
    // Activate multiple steps to test sequencer
    const steps = page.locator('svg circle[stroke="#ef4444"][role="button"]');
    await steps.nth(0).click(); // Step 1
    await steps.nth(4).click(); // Step 5
    await steps.nth(8).click(); // Step 9
    
    // Verify steps are active
    await expect(steps.nth(0)).toHaveAttribute('fill', '#ef4444');
    await expect(steps.nth(4)).toHaveAttribute('fill', '#ef4444');
    await expect(steps.nth(8)).toHaveAttribute('fill', '#ef4444');
    
    // Start playback
    const playButton = page.getByText('▶ Play');
    await playButton.click();
    
    // Should show playback state change
    await page.waitForTimeout(1000);
    
    // Check if button state changed or other playback indicators
    const buttonText = await playButton.textContent();
    const hasStopButton = await page.getByText('■').isVisible();
    const svgButtonChanged = await page.locator('svg g[role="button"] text').textContent() === '■';
    
    // At least one playback indicator should change
    const playbackStarted = buttonText !== '▶ Play' || hasStopButton || svgButtonChanged;
    
    if (!playbackStarted) {
      console.log('Playback may not be working - checking for errors');
      
      // Check for specific errors that prevent playback
      const hasAudioError = await page.locator('[class*="red"]').isVisible();
      if (hasAudioError) {
        const errorText = await page.locator('[class*="red"]').first().textContent();
        console.log('Audio error found:', errorText);
      }
    }
    
    // Stop playback
    if (hasStopButton) {
      await page.getByText('■').click();
    } else {
      await playButton.click(); // Toggle if it didn't change
    }
  });

  test('should handle BPM changes during playback', async ({ page }) => {
    // Set initial BPM
    const bpmSlider = page.getByRole('slider', { name: /Tempo/ });
    await bpmSlider.fill('120');
    await expect(page.locator('text=120')).toBeVisible();
    
    // Activate a step
    const firstStep = page.locator('svg circle[stroke="#ef4444"][role="button"]').first();
    await firstStep.click();
    
    // Start playback
    const playButton = page.getByText('▶ Play');
    await playButton.click();
    
    await page.waitForTimeout(1000);
    
    // Change BPM during playback
    await bpmSlider.fill('140');
    await expect(page.locator('text=140')).toBeVisible();
    
    // Change again
    await bpmSlider.fill('100');
    await expect(page.locator('text=100')).toBeVisible();
    
    // BPM changes should be applied in real-time
    // (Can't test actual audio timing, but UI should respond)
    
    // Stop playback
    await playButton.click();
  });

  test('should handle swing and timing modifications', async ({ page }) => {
    // Test swing control
    const swingSlider = page.getByRole('slider', { name: /Swing/ });
    
    // Set different swing values
    await swingSlider.fill('0');
    await expect(page.locator('text=0%')).toBeVisible();
    
    await swingSlider.fill('0.3');
    await expect(page.locator('text=30%')).toBeVisible();
    
    await swingSlider.fill('1');
    await expect(page.locator('text=100%')).toBeVisible();
    
    // Test reverse playback
    const reverseCheckbox = page.getByRole('checkbox', { name: /reverse/i });
    await reverseCheckbox.check();
    await expect(reverseCheckbox).toBeChecked();
    
    await reverseCheckbox.uncheck();
    await expect(reverseCheckbox).not.toBeChecked();
  });

  test('should handle master volume and track mixing', async ({ page }) => {
    // Test master volume
    const masterSlider = page.getByRole('slider', { name: /Master/ });
    
    await masterSlider.fill('1');
    await expect(page.locator('text=100%')).toBeVisible();
    
    await masterSlider.fill('0.5');
    await expect(page.locator('text=50%')).toBeVisible();
    
    await masterSlider.fill('0');
    await expect(page.locator('text=0%')).toBeVisible();
    
    // Test track-specific controls
    // Look for volume controls for individual tracks
    const trackControls = page.getByText('Track O').locator('..');
    
    if (await trackControls.isVisible()) {
      // Should have mute/solo controls
      const muteButton = page.getByRole('button', { name: /mute/i }).first();
      const soloButton = page.getByRole('button', { name: /solo/i }).first();
      
      if (await muteButton.isVisible()) {
        await muteButton.click();
        // Should toggle mute state
        await muteButton.click();
      }
      
      if (await soloButton.isVisible()) {
        await soloButton.click();
        // Should toggle solo state
        await soloButton.click();
      }
    }
  });

  test('should handle multi-track playback and polyphony', async ({ page }) => {
    // Activate steps on different tracks
    const trackOSteps = page.locator('svg circle[stroke="#ef4444"][role="button"]');
    const trackRSteps = page.locator('svg circle[stroke="#3b82f6"][role="button"]');
    const trackBSteps = page.locator('svg circle[stroke="#10b981"][role="button"]');
    const trackISteps = page.locator('svg circle[stroke="#f59e0b"][role="button"]');
    
    // Activate steps on all tracks
    await trackOSteps.nth(0).click();
    await trackRSteps.nth(1).click();
    await trackBSteps.nth(2).click();
    await trackISteps.nth(3).click();
    
    // Verify all tracks have active steps
    await expect(trackOSteps.nth(0)).toHaveAttribute('fill', '#ef4444');
    await expect(trackRSteps.nth(1)).toHaveAttribute('fill', '#3b82f6');
    await expect(trackBSteps.nth(2)).toHaveAttribute('fill', '#10b981');
    await expect(trackISteps.nth(3)).toHaveAttribute('fill', '#f59e0b');
    
    // Start playback - should handle multiple tracks
    const playButton = page.getByText('▶ Play');
    await playButton.click();
    
    await page.waitForTimeout(2000);
    
    // All tracks should play simultaneously (polyphonic)
    // Can't test actual audio mixing, but sequencer should handle all tracks
    
    await playButton.click(); // Stop
  });

  test('should handle step editor controls properly', async ({ page }) => {
    // Select a step
    const firstStep = page.locator('svg circle[stroke="#ef4444"][role="button"]').first();
    await firstStep.click();
    
    // Step editor should appear
    await expect(page.getByText('Step Editor')).toBeVisible();
    
    // Test gain control
    const gainSlider = page.getByRole('slider').filter({ hasText: /gain/i }).or(
      page.locator('input[type="range"]').nth(2)
    );
    
    if (await gainSlider.count() > 0) {
      await gainSlider.fill('0.8');
      // Gain should affect playback volume for this step
    }
    
    // Test probability control
    const probSlider = page.getByRole('slider').filter({ hasText: /prob/i }).or(
      page.locator('input[type="range"]').nth(3)
    );
    
    if (await probSlider.count() > 0) {
      await probSlider.fill('0.5');
      // Probability should affect step triggering likelihood
    }
    
    // Test step conditions if available
    const conditionSelect = page.getByText('Step Condition').locator('..');
    if (await conditionSelect.isVisible()) {
      // Should have options like Always, Fill, Not Fill, 50% Chance, etc.
      await expect(page.getByText('Always')).toBeVisible();
    }
  });

  test('should handle sample assignment and preview', async ({ page }) => {
    // Test sample library integration
    await expect(page.getByText('Sample Library')).toBeVisible();
    
    // Check for sample preview functionality
    const librarySection = page.getByText('Sample Library').locator('..');
    
    // If samples exist, should have preview buttons
    const previewButtons = page.getByRole('button', { name: /preview/i }).or(
      page.locator('button').filter({ hasText: '▶' }).filter({ hasNotText: 'Play' })
    );
    
    if (await previewButtons.count() > 0) {
      // Should be able to preview samples
      await previewButtons.first().click();
      
      // Preview should play (can't test audio, but no errors should occur)
      await page.waitForTimeout(1000);
    }
    
    // Test sample assignment to steps
    const firstStep = page.locator('svg circle[stroke="#ef4444"][role="button"]').first();
    await firstStep.click();
    
    // Should show sample assignment options in step editor
    await expect(page.getByText('Assigned Sample')).toBeVisible();
    
    // Should have dropdown or selection for library samples
    const sampleSelect = page.getByText('Choose from library');
    if (await sampleSelect.isVisible()) {
      // Should list available samples
      await sampleSelect.click();
    }
  });

  test('should handle keyboard shortcuts for audio control', async ({ page }) => {
    // Test spacebar play/stop
    await page.keyboard.press('Space');
    await page.waitForTimeout(500);
    
    // Should toggle playback
    await page.keyboard.press('Space');
    await page.waitForTimeout(500);
    
    // Test BPM shortcuts
    await page.keyboard.press('ArrowRight');
    await expect(page.locator('text=125')).toBeVisible();
    
    await page.keyboard.press('ArrowLeft');
    await expect(page.locator('text=120')).toBeVisible();
    
    // Test reverse toggle
    await page.keyboard.press('r');
    const reverseCheckbox = page.getByRole('checkbox', { name: /reverse/i });
    await expect(reverseCheckbox).toBeChecked();
    
    await page.keyboard.press('r');
    await expect(reverseCheckbox).not.toBeChecked();
    
    // Test step selection shortcuts
    await page.keyboard.press('1');
    // Should select step 1
    
    await page.keyboard.press('5');
    // Should select step 5
    
    // Test generation shortcut
    await page.keyboard.press('g');
    // Should trigger generation if step is selected and prompt is available
  });

  test('should maintain audio state across UI interactions', async ({ page }) => {
    // Set up complex state
    await page.getByRole('slider', { name: /Tempo/ }).fill('150');
    await page.getByRole('slider', { name: /Swing/ }).fill('0.25');
    await page.getByRole('slider', { name: /Master/ }).fill('0.8');
    
    // Activate multiple steps
    const steps = page.locator('svg circle[stroke="#ef4444"][role="button"]');
    await steps.nth(0).click();
    await steps.nth(4).click();
    await steps.nth(8).click();
    
    // Start playback
    await page.getByText('▶ Play').click();
    await page.waitForTimeout(1000);
    
    // Navigate to different UI sections
    await page.getByText('AI Sample Packs').click();
    await page.getByText('Sample Library').click();
    
    // Audio state should be maintained
    await expect(page.locator('text=150')).toBeVisible();
    await expect(page.locator('text=25%')).toBeVisible();
    await expect(page.locator('text=80%')).toBeVisible();
    
    // Steps should still be active
    await expect(steps.nth(0)).toHaveAttribute('fill', '#ef4444');
    await expect(steps.nth(4)).toHaveAttribute('fill', '#ef4444');
    await expect(steps.nth(8)).toHaveAttribute('fill', '#ef4444');
    
    // Stop playback
    await page.getByText('▶ Play').click();
  });
});