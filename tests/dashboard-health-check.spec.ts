import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const BASE_URL = 'https://www.thaicleftlink.org';
const LOGIN_URL = `${BASE_URL}/login`;
const USERNAME = 'siriwat';
const PASSWORD = 'Siriwat98';

const DASHBOARDS = [
  { name: 'Operation Milestone', path: '/dashboard/operation_milestone', nameTh: 'Operation Milestone' },
  { name: 'Dental Milestone', path: '/dashboard/dental_milestone', nameTh: 'Dental Milestone' },
  { name: 'Loss to Follow-Up', path: '/dashboard/loss_follow_up', nameTh: 'Loss to Follow-Up' },
  { name: 'Treatment', path: '/dashboard/treatment', nameTh: 'Treatment' },
  { name: 'Dental', path: '/dashboard/dental', nameTh: 'คณะทันตแพทยศาสตร์' },
  { name: 'AMS', path: '/dashboard/ams', nameTh: 'คณะเทคนิคการแพทย์' },
  { name: 'OC', path: '/dashboard/oc', nameTh: 'OC' },
  { name: 'User Actions', path: '/dashboard/useraction', nameTh: 'สถิติจำนวนการใช้งาน' },
  { name: 'Good Speech', path: '/dashboard/goodspeech', nameTh: 'ผลการพิจารณา Good Speech' },
  { name: 'Cross Hospital', path: '/dashboard/cross_hospital', nameTh: 'รักษาร่วมโรงพยาบาล' },
  { name: 'Cross AMS', path: '/dashboard/cross_ams', nameTh: 'รักษาร่วม คณะเทคนิคการแพทย์' },
];

interface DashboardResult {
  name: string;
  nameTh: string;
  url: string;
  status: 'pass' | 'fail';
  httpStatus: number | null;
  loadTimeMs: number;
  screenshotFile: string;
  errorMessage: string | null;
  timestamp: string;
}

const screenshotsDir = path.join(__dirname, '..', 'reports', 'screenshots');
const reportsDir = path.join(__dirname, '..', 'reports');

test.describe('ThaiCleftLink - Treatment Dashboard Health Check', () => {
  const results: DashboardResult[] = [];

  test.beforeAll(async () => {
    if (!fs.existsSync(screenshotsDir)) {
      fs.mkdirSync(screenshotsDir, { recursive: true });
    }
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }
  });

  test('Login to ThaiCleftLink', async ({ page }) => {
    await page.goto(LOGIN_URL, { waitUntil: 'networkidle' });

    // The login page has two forms - the first form (#login) is hidden on some viewports
    // Use JavaScript to fill and submit the first form directly
    await page.evaluate(({ username, password }) => {
      const loginInput = document.querySelector('#login') as HTMLInputElement;
      const passwordInput = document.querySelector('#password') as HTMLInputElement;
      if (loginInput) loginInput.value = username;
      if (passwordInput) passwordInput.value = password;
      const form = loginInput?.closest('form');
      if (form) form.submit();
    }, { username: USERNAME, password: PASSWORD });

    await page.waitForURL('**/home**', { timeout: 15000 });
    expect(page.url()).toContain('/home');

    // Save storage state for reuse
    await page.context().storageState({ path: path.join(reportsDir, 'auth-state.json') });
  });

  for (const dashboard of DASHBOARDS) {
    test(`Check dashboard: ${dashboard.name}`, async ({ browser }) => {
      const context = await browser.newContext({
        storageState: path.join(reportsDir, 'auth-state.json'),
      });
      const page = await context.newPage();

      const result: DashboardResult = {
        name: dashboard.name,
        nameTh: dashboard.nameTh,
        url: `${BASE_URL}${dashboard.path}`,
        status: 'fail',
        httpStatus: null,
        loadTimeMs: 0,
        screenshotFile: `${dashboard.name.replace(/\s+/g, '_').toLowerCase()}.png`,
        errorMessage: null,
        timestamp: new Date().toISOString(),
      };

      try {
        const startTime = Date.now();

        const response = await page.goto(`${BASE_URL}${dashboard.path}`, {
          waitUntil: 'networkidle',
          timeout: 30000,
        });

        result.loadTimeMs = Date.now() - startTime;
        result.httpStatus = response?.status() ?? null;

        // Check HTTP status
        expect(response?.status()).toBe(200);

        // Check page is not redirected to login
        expect(page.url()).not.toContain('/login');

        // Check no server error displayed
        const bodyText = await page.textContent('body');
        const hasError =
          bodyText?.includes('500') && bodyText?.includes('Server Error') ||
          bodyText?.includes('404') && bodyText?.includes('Not Found') ||
          bodyText?.includes('403') && bodyText?.includes('Forbidden');
        expect(hasError).toBeFalsy();

        // Wait for dashboard content to fully render
        // 1. Wait for DOM to be fully loaded
        await page.waitForLoadState('domcontentloaded');

        // 2. Wait a generous fixed time for all AJAX data, charts, and tables to render
        //    Some dashboards load large datasets via AJAX which takes time
        await page.waitForTimeout(10000);

        // Take screenshot
        await page.screenshot({
          path: path.join(screenshotsDir, result.screenshotFile),
          fullPage: true,
        });

        result.status = 'pass';
      } catch (error: any) {
        result.status = 'fail';
        result.errorMessage = error.message || 'Unknown error';

        // Still try to take screenshot on failure
        try {
          await page.screenshot({
            path: path.join(screenshotsDir, result.screenshotFile),
            fullPage: true,
          });
        } catch {
          // ignore screenshot error
        }
      }

      results.push(result);
      await context.close();
    });
  }

  test.afterAll(async () => {
    // Save results to JSON
    const reportData = {
      reportTitle: 'ThaiCleftLink - Treatment Dashboard Health Check Report',
      website: BASE_URL,
      module: 'แดชบอร์ดการรักษา (Treatment Dashboard)',
      testedBy: 'Automated Script (Playwright)',
      testedAt: new Date().toISOString(),
      totalDashboards: DASHBOARDS.length,
      passed: results.filter((r) => r.status === 'pass').length,
      failed: results.filter((r) => r.status === 'fail').length,
      results,
    };

    fs.writeFileSync(
      path.join(reportsDir, 'test-results.json'),
      JSON.stringify(reportData, null, 2),
      'utf-8'
    );
  });
});
