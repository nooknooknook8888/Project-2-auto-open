import { chromium } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';
import PDFDocument from 'pdfkit';

const reportsDir = path.join(__dirname, '..', 'reports');

async function main() {
  // Find latest report HTML
  const files = fs.readdirSync(reportsDir)
    .filter(f => f.startsWith('dashboard-report-') && f.endsWith('.html'))
    .sort()
    .reverse();

  if (files.length === 0) {
    console.error('No HTML report found. Run tests first.');
    process.exit(1);
  }

  const htmlFile = path.join(reportsDir, files[0]);
  const pdfFile = htmlFile.replace('.html', '.pdf');

  console.log(`  Converting: ${files[0]}`);
  console.log(`  Output: ${path.basename(pdfFile)}`);

  // A3 portrait in PDF points: 841.89 x 1190.55 pt
  const pageWidthPt  = 841.89;
  const pageHeightPt = 1190.55;
  const margin       = 20; // pt

  const contentWidth  = pageWidthPt  - margin * 2;
  const contentHeight = pageHeightPt - margin * 2;

  // Pixel width of viewport
  const viewportWidth = 1400;

  // How many pixels correspond to one content-height page?
  const pageHeightPx = Math.round(contentHeight * (viewportWidth / contentWidth));

  // --- Step 1: Load page and measure total height ---
  const browser = await chromium.launch({ headless: true });
  const page    = await browser.newPage();

  await page.setViewportSize({ width: viewportWidth, height: 900 });
  await page.goto(`file:///${htmlFile.replace(/\\/g, '/')}`, { waitUntil: 'load' });

  // Wait for all base64 images to fully render
  await page.waitForFunction(() => {
    const imgs = document.querySelectorAll('img');
    if (imgs.length === 0) return true;
    return Array.from(imgs).every(img => img.complete && img.naturalHeight > 0);
  }, { timeout: 30000 }).catch(() => {});

  // Expand screenshots & hide UI elements
  await page.evaluate(() => {
    document.querySelectorAll<HTMLImageElement>('.screenshot').forEach(img => {
      img.style.maxHeight = 'none';
      img.style.height    = 'auto';
    });
    const modal = document.getElementById('modal');
    if (modal) modal.style.display = 'none';
    document.querySelectorAll<HTMLElement>('.export-btn').forEach(el => {
      el.style.display = 'none';
    });
  });

  await page.waitForTimeout(1500);

  // Get full page height in pixels
  const totalHeight: number = await page.evaluate(() => document.body.scrollHeight);
  const numPages = Math.ceil(totalHeight / pageHeightPx);

  console.log(`  Page height: ${totalHeight}px → ${numPages} PDF page(s)`);

  // --- Step 2: Scroll to each section and take viewport screenshot ---
  const pageBuffers: Buffer[] = [];

  for (let i = 0; i < numPages; i++) {
    const y     = i * pageHeightPx;
    const clipH = Math.min(pageHeightPx, totalHeight - y);

    // Resize viewport to match this page's height, then scroll to position
    await page.setViewportSize({ width: viewportWidth, height: clipH });
    await page.evaluate((scrollY: number) => window.scrollTo(0, scrollY), y);
    await page.waitForTimeout(150);

    const buf = await page.screenshot({ type: 'jpeg', quality: 85 });
    pageBuffers.push(buf);
    process.stdout.write(`  Screenshot page ${i + 1}/${numPages}\r`);
  }

  await browser.close();
  console.log(`\n  All ${numPages} page screenshot(s) captured`);

  // --- Step 3: Build PDF — one image per page ---
  const doc = new PDFDocument({
    size: 'A3',
    margin: 0,
    autoFirstPage: false,
    info: {
      Title:  path.basename(files[0], '.html'),
      Author: 'ThaiCleftLink Dashboard Checker',
    },
  });

  const stream = fs.createWriteStream(pdfFile);
  doc.pipe(stream);

  for (let i = 0; i < pageBuffers.length; i++) {
    doc.addPage({ size: 'A3', margin: 0 });

    // Each page: fit image to content area, top-left at margin
    doc.image(pageBuffers[i], margin, margin, { width: contentWidth });

    // Footer: page number
    doc.font('Helvetica').fontSize(8).fillColor('#999999')
      .text(
        `Page ${i + 1} of ${pageBuffers.length}`,
        0,
        pageHeightPt - margin + 4,
        { align: 'center', width: pageWidthPt },
      );
  }

  doc.end();

  await new Promise<void>((resolve, reject) => {
    stream.on('finish', resolve);
    stream.on('error', reject);
  });

  const pdfSize = (fs.statSync(pdfFile).size / 1024 / 1024).toFixed(2);
  console.log('');
  console.log('  ========================================================');
  console.log('  PDF Export Successful!');
  console.log('  ========================================================');
  console.log(`  File: ${pdfFile}`);
  console.log(`  Size: ${pdfSize} MB`);
  console.log('  ========================================================');
}

main().catch((err) => {
  console.error('PDF export failed:', err);
  process.exit(1);
});
