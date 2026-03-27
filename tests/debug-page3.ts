import { chromium } from 'playwright';

const BASE_URL = 'https://www.thaicleftlink.org';

async function main() {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  });
  const page = await context.newPage();

  // Track network requests
  const requests: string[] = [];
  page.on('request', req => {
    if (req.url().includes('thaicleftlink')) {
      requests.push(`${req.method()} ${req.url()}`);
    }
  });
  page.on('requestfailed', req => {
    console.log(`  [FAIL] ${req.method()} ${req.url()} - ${req.failure()?.errorText}`);
  });
  page.on('console', msg => {
    if (msg.type() === 'error') console.log(`  [JS ERROR] ${msg.text()}`);
  });

  // Login
  console.log('Logging in...');
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'load' });
  await page.evaluate(() => {
    const l = document.querySelector('#login') as HTMLInputElement;
    const p = document.querySelector('#password') as HTMLInputElement;
    if (l) l.value = 'siriwat';
    if (p) p.value = 'Siriwat98';
    l?.closest('form')?.submit();
  });
  await page.waitForURL('**/home**', { timeout: 15000 });
  console.log('Login OK\n');

  // Go to Operation Milestone
  console.log('Going to Operation Milestone...');
  requests.length = 0;

  await page.goto(`${BASE_URL}/dashboard/operation_milestone`, { waitUntil: 'load' });
  await page.waitForTimeout(5000);

  console.log('\nNetwork requests:');
  requests.forEach(r => console.log(`  ${r}`));

  // Check table HTML
  const tableInfo = await page.evaluate(() => {
    const tables = document.querySelectorAll('table');
    const result: string[] = [];
    tables.forEach((t, i) => {
      result.push(`Table ${i}: rows=${t.rows.length}, HTML=${t.outerHTML.substring(0, 300)}`);
    });

    // Check for DataTables
    const dtElements = document.querySelectorAll('.dataTables_wrapper, .dataTable, [id*="DataTable"]');

    // Check all divs with data content
    const contentDivs = document.querySelectorAll('[class*="content"], [class*="container"], [id*="content"]');

    // Check for Vue/Livewire/AJAX frameworks
    const livewire = document.querySelectorAll('[wire\\:id], [x-data], [v-if], [v-for]');

    return {
      tables: result,
      dtElements: dtElements.length,
      contentDivs: contentDivs.length,
      livewire: livewire.length,
      bodyHTML: document.body.innerHTML.substring(0, 2000),
    };
  });

  console.log('\nTable info:');
  tableInfo.tables.forEach(t => console.log(`  ${t}`));
  console.log(`DataTables: ${tableInfo.dtElements}`);
  console.log(`Livewire/Vue elements: ${tableInfo.livewire}`);
  console.log(`\nBody HTML (first 2000 chars):\n${tableInfo.bodyHTML}`);

  await browser.close();
}

main().catch(console.error);
