import { chromium } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

const reportsDir = path.join(__dirname, '..', 'reports');

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const htmlFile = path.join(reportsDir, 'dashboard-report-2026-03-27.html');

  await page.goto(`file:///${htmlFile.replace(/\\/g, '/')}`, { waitUntil: 'load' });
  await page.waitForTimeout(3000);

  // Check images
  const imgInfo = await page.evaluate(() => {
    const imgs = document.querySelectorAll('img');
    return Array.from(imgs).map((img, i) => ({
      index: i,
      complete: img.complete,
      naturalWidth: img.naturalWidth,
      naturalHeight: img.naturalHeight,
      srcLen: img.src.length,
      srcStart: img.src.substring(0, 50),
    }));
  });

  console.log('Images in page:');
  imgInfo.forEach(img => {
    console.log(`  [${img.index}] complete=${img.complete} size=${img.naturalWidth}x${img.naturalHeight} srcLen=${img.srcLen}`);
  });

  // Take a screenshot of the page itself to verify rendering
  await page.screenshot({ path: path.join(reportsDir, 'debug_pdf_page.png'), fullPage: true });
  console.log('\nPage screenshot saved to debug_pdf_page.png');

  // Try PDF with different settings
  await page.pdf({
    path: path.join(reportsDir, 'debug_test.pdf'),
    format: 'A4',
    printBackground: true,
    margin: { top: '10mm', bottom: '10mm', left: '10mm', right: '10mm' },
    preferCSSPageSize: false,
  });

  const size = (fs.statSync(path.join(reportsDir, 'debug_test.pdf')).size / 1024 / 1024).toFixed(2);
  console.log(`\nPDF size: ${size} MB`);

  await browser.close();
}

main().catch(console.error);
