import { test, expect } from '@playwright/test';

test.describe('RosterIQ Shift Timetable E2E Suite', () => {
  test('1. Page Title, Sample Roster & Workforce Ledger load cleanly', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/RosterIQ/);

    await expect(page.locator('h1')).toContainText('Operational Dashboard');
    await expect(page.locator('h2')).toContainText('Fill every shift. Catch clashes before Monday.');

    const main = page.getByRole('main');
    await expect(main.getByText('Sample roster')).toBeVisible();
    await expect(main.getByText('Employees', { exact: true })).toBeVisible();
    await expect(main.getByText('Brands', { exact: true })).toBeVisible();
    await expect(main.getByText('Pods', { exact: true })).toBeVisible();
    await expect(main.getByText('Processes', { exact: true })).toBeVisible();
    await expect(main.getByText('Coverage', { exact: true })).toBeVisible();
  });

  test('2. Sidebar Navigation works across all core pages', async ({ page }) => {
    await page.goto('/');

    await page.click('text=Monthly Roster');
    await expect(page.locator('h2')).toContainText('ROSTER MANAGEMENT');

    await page.click('text=Coverage Analysis');
    await expect(page.locator('h2')).toContainText('STAFFING COVERAGE ANALYSIS');

    await page.click('text=Conflicts Center');
    await expect(page.locator('h2')).toContainText('SCHEDULING CONFLICTS CENTER');

    await page.click('text=Employees');
    await expect(page.locator('h2')).toContainText('EMPLOYEE DIRECTORY');

    await page.click('text=Operational Pods');
    await expect(page.locator('h2')).toContainText('OPERATIONAL PODS');

    await page.click('text=Client Brands');
    await expect(page.locator('h2')).toContainText('CLIENT BRANDS MANAGEMENT');

    await page.click('text=Processes');
    await expect(page.locator('h2')).toContainText('OPERATIONAL PROCESSES');

    await page.click('text=Role Assignments');
    await expect(page.locator('h2')).toContainText('EMPLOYEE ROLE ASSIGNMENTS');

    await page.click('text=Leaves & Holidays');
    await expect(page.locator('h2')).toContainText('LEAVES & PUBLIC HOLIDAYS');

    await page.click('text=Rules & Shifts');
    await expect(page.locator('h2')).toContainText('SYSTEM SETTINGS & RULES');
  });

  test('3. Roster Management matrix view toggles work', async ({ page }) => {
    await page.goto('/roster');
    await expect(page.locator('h2')).toContainText('ROSTER MANAGEMENT');

    await page.click('button:has-text("Pod-Wise")');
    await expect(page.locator('button:has-text("Pod-Wise")')).toHaveClass(/bg-\[#164B78\]/);

    await page.click('button:has-text("Brand-Wise")');
    await expect(page.locator('button:has-text("Brand-Wise")')).toHaveClass(/bg-\[#164B78\]/);

    await page.click('button:has-text("Company-Wide")');
    await expect(page.locator('button:has-text("Company-Wide")')).toHaveClass(/bg-\[#164B78\]/);
  });

  test('4. RBAC Role Switcher updates user session', async ({ page }) => {
    await page.goto('/');

    const roleSelect = page.locator('select[title="Switch Session Role to test RBAC"]');
    await expect(roleSelect).toBeVisible();

    await roleSelect.selectOption('Pod Lead');
    await expect(roleSelect).toHaveValue('Pod Lead');

    await roleSelect.selectOption('Employee');
    await expect(roleSelect).toHaveValue('Employee');

    await roleSelect.selectOption('Operations Manager');
    await expect(roleSelect).toHaveValue('Operations Manager');
  });

  test('5. Employee search & filtering functionality', async ({ page }) => {
    await page.goto('/employees');
    await expect(page.locator('h2')).toContainText('EMPLOYEE DIRECTORY');

    const searchInput = page.locator('input[placeholder="Search by name, code, email..."]');
    await expect(searchInput).toBeVisible();
    await searchInput.fill('Aarav');
    await page.waitForTimeout(300);

    const podSelect = page.locator('select:has-text("All Operational Pods")');
    await expect(podSelect).toBeVisible();
  });
});
