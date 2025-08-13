import { test, expect } from '@playwright/test';

test('check for console logs from togglePlayback', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  
  // Capture all console messages
  const consoleMessages: string[] = [];
  page.on('console', msg => {
    consoleMessages.push(`${msg.type()}: ${msg.text()}`);
    console.log(`${msg.type()}: ${msg.text()}`);
  });
  
  const transportButton = page.locator('button').filter({ hasText: '▶ Play' });
  
  console.log('Clicking button...');
  await transportButton.click();
  
  // Wait for any async operations
  await page.waitForTimeout(3000);
  
  console.log('All console messages:');
  consoleMessages.forEach(msg => console.log('  -', msg));
  
  // Look specifically for our debug logs
  const togglePlaybackLogs = consoleMessages.filter(msg => msg.includes('togglePlayback'));
  const startPlaybackLogs = consoleMessages.filter(msg => msg.includes('startPlayback'));
  const errorLogs = consoleMessages.filter(msg => msg.includes('error') || msg.includes('Error'));
  
  console.log('Toggle playback logs:', togglePlaybackLogs.length);
  console.log('Start playback logs:', startPlaybackLogs.length);
  console.log('Error logs:', errorLogs.length);
  
  if (errorLogs.length > 0) {
    console.log('Errors found:');
    errorLogs.forEach(log => console.log('  ERROR:', log));
  }
});