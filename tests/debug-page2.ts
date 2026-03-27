import { chromium } from 'playwright';

const BASE_URL = 'https://www.thaicleftlink.org';

async function main() {
  // Try with headed mode and check what's different
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();

  // Listen to console messages
  page.on('console', msg => {
    if (msg.type() === 'error') console.log(`  [CONSOLE ERROR] ${msg.text()}`);
  });

  // Listen to failed requests
  page.on('requestfailed', request => {
    console.log(`  [REQUEST FAILED] ${request.url()} - ${request.failure()?.errorText}`);
  });

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
  console.log('Login OK, URL:', page.url());

  // Check cookies
  const cookies = await context.cookies();
  console.log('Cookies:', cookies.map(c => `${c.name}=${c.value.substring(0, 20)}...`).join(', '));

  // Go to Operation Milestone
  console.log('\nGoing to Operation Milestone...');
  await page.goto(`${BASE_URL}/dashboard/operation_milestone`, { waitUntil: 'load' });

  // Check page HTML structure
  await page.waitForTimeout(3000);
  const pageInfo = await page.evaluate(() => {
    const html = document.documentElement.outerHTML;
    // Check for DataTables, Vue, React, Angular
    const hasDataTable = html.includes('DataTable') || html.includes('datatable');
    const hasVue = html.includes('__vue__') || html.includes('v-if') || html.includes('vue');
    const hasReact = html.includes('_reactRoot') || html.includes('react');
    const hasJQuery = typeof (window as any).$ !== 'undefined' || typeof (window as any).jQuery !== 'undefined';
    const hasAjax = html.includes('ajax') || html.includes('axios') || html.includes('fetch');

    // Get all script sources
    const scripts = Array.from(document.querySelectorAll('script[src]')).map(s => (s as HTMLScriptElement).src);

    // Check iframes
    const iframes = document.querySelectorAll('iframe');

    // Get body text length and table info
    const bodyText = document.body.innerText;
    const tables = document.querySelectorAll('table');
    const tableHTML = tables.length > 0 ? tables[0].outerHTML.substring(0, 500) : 'no table';

    return {
      hasDataTable, hasVue, hasReact, hasJQuery, hasAjax,
      scripts: scripts.slice(0, 10),
      iframes: iframes.length,
      bodyLen: bodyText.length,
      tableHTML,
      title: document.title,
    };
  });

  console.log('Page info:', JSON.stringify(pageInfo, null, 2));

  // Wait longer and check again
  console.log('\nWaiting 10 more seconds...');
  await page.waitForTimeout(10000);

  const info2 = await page.evaluate(() => {
    const tables = document.querySelectorAll('table');
    const trs = document.querySelectorAll('table tr');
    return { tables: tables.length, rows: trs.length, bodyLen: document.body.innerText.length };
  });
  console.log('After 10s:', info2);

  await page.screenshot({ path: 'reports/screenshots/debug_headed.png', fullPage: true });
  console.log('Debug screenshot saved');

  await page.waitForTimeout(5000);
  await browser.close();
}

main().catch(console.error);
