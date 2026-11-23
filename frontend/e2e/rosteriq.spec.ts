import { test, expect } from '@playwright/test';

test.describe('RosterIQ SaaS Application E2E Suite', () => {
  test('1. Page Title & Dashboard KPIs load cleanly', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/RosterIQ/);

    // Verify main header and dashboard headline
    await expect(page.locator('h1')).toContainText('Operational Dashboard');
    await expect(page.locator('h2')).toContainText('Workforce Optimization & Roster Intelligence');

    // Verify KPI cards are visible in main dashboard
    const main = page.getByRole('main');
    await expect(main.getByText('Employees', { exact: true })).toBeVisible();
    await expect(main.getByText('Brands', { exact: true })).toBeVisible();
    await expect(main.getByText('Pods', { exact: true })).toBeVisible();
    await expect(main.getByText('Processes', { exact: true })).toBeVisible();
    await expect(main.getByText('Coverage', { exact: true })).toBeVisible();
  });

  test('2. Sidebar Navigation works across all core pages', async ({ page }) => {
    await page.goto('/');

    // Navigate to Monthly Roster
    await page.click('text=Monthly Roster');
    await expect(page.locator('h2')).toContainText('ROSTER MANAGEMENT');

    // Navigate to Coverage Analysis
    await page.click('text=Coverage Analysis');
    await expect(page.locator('h2')).toContainText('STAFFING COVERAGE ANALYSIS');

    // Navigate to Conflicts Center
    await page.click('text=Conflicts Center');
    await expect(page.locator('h2')).toContainText('SCHEDULING CONFLICTS CENTER');

    // Navigate to Employees
    await page.click('text=Employees');
    await expect(page.locator('h2')).toContainText('EMPLOYEE DIRECTORY');

    // Navigate to Operational Pods
    await page.click('text=Operational Pods');
    await expect(page.locator('h2')).toContainText('OPERATIONAL PODS');

    // Navigate to Client Brands
    await page.click('text=Client Brands');
    await expect(page.locator('h2')).toContainText('CLIENT BRANDS MANAGEMENT');

    // Navigate to Business Processes
    await page.click('text=Processes');
    await expect(page.locator('h2')).toContainText('OPERATIONAL PROCESSES');

    // Navigate to Role Assignments
    await page.click('text=Role Assignments');
    await expect(page.locator('h2')).toContainText('EMPLOYEE ROLE ASSIGNMENTS');

    // Navigate to Leaves & Holidays
    await page.click('text=Leaves & Holidays');
    await expect(page.locator('h2')).toContainText('LEAVES & PUBLIC HOLIDAYS');

    // Navigate to Settings & Rules
    await page.click('text=Rules & Shifts');
    await expect(page.locator('h2')).toContainText('SYSTEM SETTINGS & RULES');
  });

  test('3. Roster Management matrix view toggles work', async ({ page }) => {
    await page.goto('/roster');
    await expect(page.locator('h2')).toContainText('ROSTER MANAGEMENT');

    // Verify view toggle buttons
    await page.click('button:has-text("Pod-Wise")');
    await expect(page.locator('button:has-text("Pod-Wise")')).toHaveClass(/bg-indigo-600/);

    await page.click('button:has-text("Brand-Wise")');
    await expect(page.locator('button:has-text("Brand-Wise")')).toHaveClass(/bg-indigo-600/);

    await page.click('button:has-text("Company-Wide")');
    await expect(page.locator('button:has-text("Company-Wide")')).toHaveClass(/bg-indigo-600/);
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

    // Filter by pod
    const podSelect = page.locator('select:has-text("All Operational Pods")');
    await expect(podSelect).toBeVisible();
  });
});
