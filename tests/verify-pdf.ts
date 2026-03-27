import { chromium } from 'playwright';
import * as path from 'path';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const pdfFile = path.join(__dirname, '..', 'reports', 'dashboard-report-2026-03-27.pdf');
  await page.goto(`file:///${pdfFile.replace(/\\/g, '/')}`);
  await page.waitForTimeout(5000);

  // PDF viewer - check how many pages
  const info = await page.evaluate(() => {
    return { url: window.location.href, title: document.title, bodyLen: document.body.innerText.length };
  });
  console.log('PDF info:', info);

  await page.screenshot({ path: path.join(__dirname, '..', 'reports', 'pdf_preview.png'), fullPage: false });
  console.log('PDF preview saved');

  await browser.close();
}
main().catch(console.error);
