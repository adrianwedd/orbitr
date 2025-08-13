import { test, expect } from '@playwright/test';

test('debug what is actually in the DOM', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  
  console.log('Page loaded');
  
  // Check for React errors
  const logs: string[] = [];
  page.on('console', msg => {
    console.log('Console:', msg.type(), msg.text());
    if (msg.type() === 'error') {
      logs.push(msg.text());
    }
  });
  
  // Wait extra time for React to render
  await page.waitForTimeout(5000);
  
  // Check if ORBITR text is there
  const orbitrVisible = await page.getByText('ORBITR').isVisible();
  console.log('ORBITR visible:', orbitrVisible);
  
  // Check if SVG is there
  const svgCount = await page.locator('svg').count();
  console.log('SVG count:', svgCount);
  
  // Check for any circles in SVG
  const circleCount = await page.locator('svg circle').count();
  console.log('Total circles:', circleCount);
  
  // Check for circles with role attribute
  const roleCircleCount = await page.locator('svg circle[role]').count();
  console.log('Role circles:', roleCircleCount);
  
  // Check for circles with stroke
  const strokeCircleCount = await page.locator('svg circle[stroke]').count();
  console.log('Stroke circles:', strokeCircleCount);
  
  // Get some attributes of first circle if it exists
  const firstCircle = page.locator('svg circle').first();
  const firstCircleCount = await page.locator('svg circle').count();
  if (firstCircleCount > 0) {
    const stroke = await firstCircle.getAttribute('stroke');
    const role = await firstCircle.getAttribute('role');
    const fill = await firstCircle.getAttribute('fill');
    console.log('First circle - stroke:', stroke, 'role:', role, 'fill:', fill);
  }
  
  // Check page title and other basic elements
  const title = await page.title();
  console.log('Page title:', title);
  
  // Log any console errors
  if (logs.length > 0) {
    console.log('Console errors found:', logs);
  }
});