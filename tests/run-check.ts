import { chromium } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

const BASE_URL = 'https://www.thaicleftlink.org';
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

async function main() {
  const reportsDir = path.join(__dirname, '..', 'reports');
  const screenshotsDir = path.join(reportsDir, 'screenshots');

  // Create directories
  fs.mkdirSync(screenshotsDir, { recursive: true });

  console.log('');
  console.log('  ========================================================');
  console.log('  ThaiCleftLink Dashboard Health Check');
  console.log('  ========================================================');
  console.log('');

  // Launch browser
  console.log('  Launching browser...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
  });
  const page = await context.newPage();

  // Step 1: Login (use click-based login on the visible form)
  console.log('  [Login] Logging in as ' + USERNAME + '...');
  try {
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'load', timeout: 30000 });
    await page.waitForTimeout(2000);

    // Fill the visible form fields and click submit
    const textInputs = await page.$$('input[type="text"]:visible');
    const passInputs = await page.$$('input[type="password"]:visible');
    const submitBtns = await page.$$('button[type="submit"]:visible');

    if (textInputs.length > 0 && passInputs.length > 0 && submitBtns.length > 0) {
      await textInputs[0].fill(USERNAME);
      await passInputs[0].fill(PASSWORD);
      await submitBtns[0].click();
    } else {
      throw new Error('Login form elements not found');
    }

    await page.waitForURL('**/home**', { timeout: 15000 });
    console.log('  [Login] Success!\n');
  } catch (error: any) {
    console.error('  [Login] FAILED: ' + error.message);
    await browser.close();
    process.exit(1);
  }

  // Step 2: Check each dashboard
  const results: DashboardResult[] = [];
  let passCount = 0;
  let failCount = 0;

  for (let i = 0; i < DASHBOARDS.length; i++) {
    const dashboard = DASHBOARDS[i];
    const num = `${i + 1}/${DASHBOARDS.length}`;
    const screenshotFile = `${dashboard.name.replace(/\s+/g, '_').toLowerCase()}.png`;

    const result: DashboardResult = {
      name: dashboard.name,
      nameTh: dashboard.nameTh,
      url: `${BASE_URL}${dashboard.path}`,
      status: 'fail',
      httpStatus: null,
      loadTimeMs: 0,
      screenshotFile,
      errorMessage: null,
      timestamp: new Date().toISOString(),
    };

    try {
      process.stdout.write(`  [${num}] ${dashboard.name}... `);
      const startTime = Date.now();

      const response = await page.goto(`${BASE_URL}${dashboard.path}`, {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      });

      result.httpStatus = response?.status() ?? null;

      // Wait for dashboard data to fully render
      // 1. Wait for AJAX data to load and DOM to update
      await page.waitForFunction(() => {
        const text = document.body.innerText;
        // Page must have substantial content with numbers
        return text.length > 300 && /\d{1,}/.test(text);
      }, { timeout: 15000 }).catch(() => {});

      // 2. Generous fixed wait for charts, animations, and late AJAX to complete
      await page.waitForTimeout(15000);

      result.loadTimeMs = Date.now() - startTime;

      // Check for errors
      const url = page.url();
      if (url.includes('/login')) {
        throw new Error('Redirected to login page');
      }
      if (result.httpStatus !== 200) {
        throw new Error(`HTTP ${result.httpStatus}`);
      }

      // Take screenshot
      await page.screenshot({
        path: path.join(screenshotsDir, screenshotFile),
        fullPage: true,
      });

      result.status = 'pass';
      passCount++;
      console.log(`PASS (${result.loadTimeMs}ms)`);
    } catch (error: any) {
      result.status = 'fail';
      result.errorMessage = error.message || 'Unknown error';
      failCount++;
      console.log(`FAIL - ${result.errorMessage}`);

      // Try to take screenshot even on failure
      try {
        await page.screenshot({
          path: path.join(screenshotsDir, screenshotFile),
          fullPage: true,
        });
      } catch {
        // ignore
      }
    }

    results.push(result);
  }

  await browser.close();

  // Step 3: Save results JSON
  const reportData = {
    reportTitle: 'ThaiCleftLink - Treatment Dashboard Health Check Report',
    website: BASE_URL,
    module: 'แดชบอร์ดการรักษา (Treatment Dashboard)',
    testedBy: 'Automated Script (Playwright)',
    testedAt: new Date().toISOString(),
    totalDashboards: DASHBOARDS.length,
    passed: passCount,
    failed: failCount,
    results,
  };

  fs.writeFileSync(
    path.join(reportsDir, 'test-results.json'),
    JSON.stringify(reportData, null, 2),
    'utf-8'
  );

  // Summary
  console.log('');
  console.log('  ========================================================');
  console.log(`  Results: ${passCount} PASSED / ${failCount} FAILED / ${DASHBOARDS.length} TOTAL`);
  console.log('  ========================================================');
  console.log('');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
