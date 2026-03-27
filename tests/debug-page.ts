import { chromium } from 'playwright';

const BASE_URL = 'https://www.thaicleftlink.org';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();

  // Login
  console.log('Logging in...');
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    const l = document.querySelector('#login') as HTMLInputElement;
    const p = document.querySelector('#password') as HTMLInputElement;
    if (l) l.value = 'siriwat';
    if (p) p.value = 'Siriwat98';
    l?.closest('form')?.submit();
  });
  await page.waitForURL('**/home**', { timeout: 15000 });
  console.log('Login OK');

  // Go to Operation Milestone
  console.log('\nGoing to Operation Milestone...');
  await page.goto(`${BASE_URL}/dashboard/operation_milestone`, { waitUntil: 'domcontentloaded' });

  // Check at intervals what's on the page
  for (let sec = 1; sec <= 30; sec++) {
    await page.waitForTimeout(1000);
    const info = await page.evaluate(() => {
      const tables = document.querySelectorAll('table');
      const trs = document.querySelectorAll('table tr');
      const tds = document.querySelectorAll('table td');
      const btns = document.querySelectorAll('.btn, button');
      const bodyLen = document.body.innerText.length;
      const hasCheckmarks = document.querySelectorAll('.fa-check, .fa-times, .glyphicon, [class*="check"], [class*="close"]').length;
      const firstTrText = trs.length > 1 ? (trs[1] as HTMLElement).innerText.substring(0, 100) : 'none';
      return {
        tables: tables.length,
        trs: trs.length,
        tds: tds.length,
        btns: btns.length,
        bodyLen,
        hasCheckmarks,
        firstTrText,
      };
    });
    console.log(`  ${sec}s: tables=${info.tables} rows=${info.trs} cells=${info.tds} bodyLen=${info.bodyLen} checks=${info.hasCheckmarks}`);
    if (info.trs > 5) {
      console.log(`  First data row: ${info.firstTrText}`);
    }
    if (info.tds > 10 && info.trs > 5) {
      console.log(`  -> Data appears loaded at ${sec}s!`);

      // Take screenshot to verify
      await page.screenshot({ path: 'reports/screenshots/debug_operation.png', fullPage: true });
      console.log('  -> Debug screenshot saved');
      break;
    }
  }

  // Also check Loss to Follow-Up
  console.log('\nGoing to Loss to Follow-Up...');
  await page.goto(`${BASE_URL}/dashboard/loss_follow_up`, { waitUntil: 'domcontentloaded' });

  for (let sec = 1; sec <= 30; sec++) {
    await page.waitForTimeout(1000);
    const info = await page.evaluate(() => {
      const canvas = document.querySelectorAll('canvas');
      const svg = document.querySelectorAll('svg');
      const bodyLen = document.body.innerText.length;
      const hasNumbers = /Active.*\d+|Total.*\d+|Loss.*\d+/.test(document.body.innerText);
      return { canvas: canvas.length, svg: svg.length, bodyLen, hasNumbers };
    });
    console.log(`  ${sec}s: canvas=${info.canvas} svg=${info.svg} bodyLen=${info.bodyLen} hasNumbers=${info.hasNumbers}`);
    if (info.hasNumbers && info.bodyLen > 500) {
      console.log(`  -> Data loaded at ${sec}s!`);
      await page.screenshot({ path: 'reports/screenshots/debug_loss.png', fullPage: true });
      console.log('  -> Debug screenshot saved');
      break;
    }
  }

  await browser.close();
}

main().catch(console.error);
