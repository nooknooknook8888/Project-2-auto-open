import * as fs from 'fs';
import * as path from 'path';

const reportsDir = path.join(__dirname, '..', 'reports');
const screenshotsDir = path.join(reportsDir, 'screenshots');
const resultsFile = path.join(reportsDir, 'test-results.json');

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

interface ReportData {
  reportTitle: string;
  website: string;
  module: string;
  testedBy: string;
  testedAt: string;
  totalDashboards: number;
  passed: number;
  failed: number;
  results: DashboardResult[];
}

function imageToBase64(filePath: string): string {
  try {
    const data = fs.readFileSync(filePath);
    return `data:image/png;base64,${data.toString('base64')}`;
  } catch {
    return '';
  }
}

function formatDate(isoString: string): string {
  const date = new Date(isoString);
  const buddhistYear = date.getFullYear() + 543;
  const months = [
    'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
    'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.',
  ];
  const day = date.getDate();
  const month = months[date.getMonth()];
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${day} ${month} ${buddhistYear} เวลา ${hours}:${minutes} น.`;
}

function generateHTML(data: ReportData, dateStr: string): string {
  const passRate = ((data.passed / data.totalDashboards) * 100).toFixed(1);
  const avgLoadTime =
    data.results.length > 0
      ? (data.results.reduce((sum, r) => sum + r.loadTimeMs, 0) / data.results.length).toFixed(0)
      : '0';

  const resultRows = data.results
    .map((r, i) => {
      const statusBadge =
        r.status === 'pass'
          ? '<span class="badge badge-pass">PASS</span>'
          : '<span class="badge badge-fail">FAIL</span>';

      const screenshotPath = path.join(screenshotsDir, r.screenshotFile);
      const screenshotBase64 = imageToBase64(screenshotPath);
      const screenshotImg = screenshotBase64
        ? `<img src="${screenshotBase64}" alt="${r.name}" class="screenshot" onclick="openModal(this.src, '${r.name}')" />`
        : '<span class="no-screenshot">ไม่มีภาพ</span>';

      return `
      <div class="dashboard-card">
        <div class="card-header">
          <div class="card-title">
            <span class="card-number">${i + 1}</span>
            <div>
              <h3>${r.name}</h3>
              <p class="card-subtitle">${r.nameTh}</p>
            </div>
          </div>
          ${statusBadge}
        </div>
        <div class="card-body">
          <div class="card-stats">
            <div class="stat">
              <span class="stat-label">URL</span>
              <span class="stat-value"><a href="${r.url}" target="_blank">${r.url}</a></span>
            </div>
            <div class="stat">
              <span class="stat-label">HTTP Status</span>
              <span class="stat-value">${r.httpStatus ?? 'N/A'}</span>
            </div>
            <div class="stat">
              <span class="stat-label">Load Time</span>
              <span class="stat-value">${r.loadTimeMs} ms</span>
            </div>
            ${r.errorMessage ? `<div class="stat error"><span class="stat-label">Error</span><span class="stat-value">${r.errorMessage}</span></div>` : ''}
          </div>
          <div class="screenshot-container">
            ${screenshotImg}
          </div>
        </div>
      </div>`;
    })
    .join('\n');

  return `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${data.reportTitle}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background: linear-gradient(135deg, #0f0c29, #302b63, #24243e);
      color: #e0e0e0;
      min-height: 100vh;
    }

    .container { max-width: 1200px; margin: 0 auto; padding: 20px; }

    /* Header */
    .report-header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 16px;
      padding: 40px;
      margin-bottom: 30px;
      text-align: center;
      box-shadow: 0 10px 40px rgba(102, 126, 234, 0.3);
    }
    .report-header h1 {
      font-size: 28px;
      color: #fff;
      margin-bottom: 8px;
    }
    .report-header .subtitle {
      color: rgba(255,255,255,0.8);
      font-size: 16px;
      margin-bottom: 20px;
    }
    .report-meta {
      display: flex;
      justify-content: center;
      gap: 30px;
      flex-wrap: wrap;
      color: rgba(255,255,255,0.9);
      font-size: 14px;
    }
    .report-meta span { display: flex; align-items: center; gap: 6px; }

    /* Summary Cards */
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      margin-bottom: 30px;
    }
    .summary-card {
      background: rgba(255,255,255,0.05);
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 12px;
      padding: 24px;
      text-align: center;
    }
    .summary-card .number {
      font-size: 42px;
      font-weight: 700;
      line-height: 1;
    }
    .summary-card .label {
      font-size: 14px;
      color: #aaa;
      margin-top: 8px;
    }
    .summary-card.total .number { color: #667eea; }
    .summary-card.pass .number { color: #4ade80; }
    .summary-card.fail .number { color: #f87171; }
    .summary-card.time .number { color: #fbbf24; font-size: 32px; }

    /* Dashboard Cards */
    .dashboard-card {
      background: rgba(255,255,255,0.05);
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 12px;
      margin-bottom: 20px;
      overflow: hidden;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .dashboard-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 30px rgba(0,0,0,0.3);
    }
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 24px;
      border-bottom: 1px solid rgba(255,255,255,0.05);
    }
    .card-title { display: flex; align-items: center; gap: 16px; }
    .card-number {
      background: linear-gradient(135deg, #667eea, #764ba2);
      color: #fff;
      width: 36px;
      height: 36px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 14px;
      flex-shrink: 0;
    }
    .card-header h3 { font-size: 18px; color: #fff; }
    .card-subtitle { font-size: 13px; color: #999; margin-top: 2px; }

    .badge {
      padding: 6px 16px;
      border-radius: 20px;
      font-size: 13px;
      font-weight: 600;
      letter-spacing: 0.5px;
    }
    .badge-pass { background: rgba(74,222,128,0.15); color: #4ade80; border: 1px solid rgba(74,222,128,0.3); }
    .badge-fail { background: rgba(248,113,113,0.15); color: #f87171; border: 1px solid rgba(248,113,113,0.3); }

    .card-body { padding: 20px 24px; }
    .card-stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 12px;
      margin-bottom: 16px;
    }
    .stat { display: flex; flex-direction: column; gap: 4px; }
    .stat-label { font-size: 12px; color: #888; text-transform: uppercase; letter-spacing: 0.5px; }
    .stat-value { font-size: 14px; color: #ddd; }
    .stat-value a { color: #667eea; text-decoration: none; }
    .stat-value a:hover { text-decoration: underline; }
    .stat.error .stat-value { color: #f87171; font-size: 13px; }

    .screenshot-container { margin-top: 12px; }
    .screenshot {
      width: 100%;
      max-height: 400px;
      object-fit: contain;
      border-radius: 8px;
      border: 1px solid rgba(255,255,255,0.1);
      cursor: pointer;
      transition: opacity 0.2s;
    }
    .screenshot:hover { opacity: 0.9; }
    .no-screenshot { color: #666; font-style: italic; }

    /* Summary Table */
    .summary-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 30px;
      background: rgba(255,255,255,0.03);
      border-radius: 12px;
      overflow: hidden;
    }
    .summary-table th {
      background: rgba(102,126,234,0.2);
      color: #b4bfff;
      padding: 14px 16px;
      text-align: left;
      font-size: 13px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .summary-table td {
      padding: 12px 16px;
      border-bottom: 1px solid rgba(255,255,255,0.05);
      font-size: 14px;
    }
    .summary-table tr:last-child td { border-bottom: none; }
    .summary-table tr:hover { background: rgba(255,255,255,0.03); }

    /* Modal */
    .modal-overlay {
      display: none;
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0,0,0,0.9);
      z-index: 1000;
      justify-content: center;
      align-items: center;
      padding: 20px;
    }
    .modal-overlay.active { display: flex; }
    .modal-content {
      max-width: 95vw;
      max-height: 95vh;
    }
    .modal-content img {
      max-width: 100%;
      max-height: 90vh;
      border-radius: 8px;
    }
    .modal-title {
      text-align: center;
      color: #fff;
      margin-bottom: 12px;
      font-size: 18px;
    }
    .modal-close {
      position: fixed;
      top: 20px;
      right: 30px;
      color: #fff;
      font-size: 36px;
      cursor: pointer;
      z-index: 1001;
    }

    /* Footer */
    .report-footer {
      text-align: center;
      padding: 24px;
      color: #666;
      font-size: 13px;
      border-top: 1px solid rgba(255,255,255,0.05);
      margin-top: 30px;
    }

    /* Export PDF Button */
    .export-btn {
      position: fixed;
      bottom: 30px;
      right: 30px;
      background: linear-gradient(135deg, #667eea, #764ba2);
      color: #fff;
      border: none;
      padding: 14px 28px;
      border-radius: 50px;
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
      z-index: 999;
      display: flex;
      align-items: center;
      gap: 8px;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .export-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 30px rgba(102, 126, 234, 0.6);
    }
    .export-btn svg { width: 18px; height: 18px; fill: currentColor; }

    @media (max-width: 768px) {
      .report-header h1 { font-size: 22px; }
      .report-meta { flex-direction: column; gap: 8px; }
      .summary-grid { grid-template-columns: repeat(2, 1fr); }
      .card-stats { grid-template-columns: 1fr; }
      .export-btn { bottom: 16px; right: 16px; padding: 10px 20px; font-size: 13px; }
    }

    /* Print / PDF Styles */
    @media print {
      * {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        color-adjust: exact !important;
      }
      html, body {
        background: #fff !important;
        color: #222 !important;
        font-size: 11px;
        width: 100%;
        margin: 0;
        padding: 0;
      }
      .container { max-width: 100%; padding: 10px; }
      .export-btn, .modal-overlay, .modal-close { display: none !important; }

      /* Header */
      .report-header {
        background: #667eea !important;
        color: #fff !important;
        padding: 20px;
        margin-bottom: 12px;
        border-radius: 8px;
      }
      .report-header h1 { font-size: 18px; color: #fff !important; }
      .report-header .subtitle { font-size: 12px; color: #e0e0ff !important; }
      .report-meta { font-size: 10px; color: #e0e0ff !important; }
      .report-meta span { color: #e0e0ff !important; }

      /* Summary Cards */
      .summary-grid {
        display: grid !important;
        grid-template-columns: repeat(4, 1fr) !important;
        gap: 8px;
        margin-bottom: 12px;
      }
      .summary-card {
        background: #f8f9fa !important;
        border: 1px solid #ddd;
        padding: 10px;
        border-radius: 6px;
      }
      .summary-card .number { font-size: 24px; }
      .summary-card.total .number { color: #4a5568 !important; }
      .summary-card.pass .number { color: #22863a !important; }
      .summary-card.fail .number { color: #d73a49 !important; }
      .summary-card.time .number { color: #b08800 !important; font-size: 18px; }
      .summary-card .label { color: #666 !important; font-size: 10px; }

      /* Summary Table */
      .summary-table {
        background: #fff !important;
        border: 1px solid #ccc;
        margin-bottom: 12px;
        border-radius: 0;
      }
      .summary-table th {
        background: #667eea !important;
        color: #fff !important;
        padding: 6px 8px;
        font-size: 9px;
      }
      .summary-table td {
        padding: 5px 8px;
        border-bottom: 1px solid #eee;
        color: #333 !important;
        font-size: 10px;
      }

      /* Dashboard Cards - allow page breaks WITHIN cards so content is not cut */
      .dashboard-card {
        background: #fff !important;
        border: 1px solid #ccc;
        margin-bottom: 10px;
        page-break-inside: auto;
        overflow: visible !important;
        border-radius: 6px;
      }
      .card-header {
        border-bottom: 1px solid #eee;
        padding: 8px 12px;
        page-break-after: avoid;
      }
      .card-header h3 { color: #333 !important; font-size: 13px; }
      .card-subtitle { color: #666 !important; }
      .card-title { gap: 8px; }
      .card-number {
        background: #667eea !important;
        font-size: 10px;
        width: 24px; height: 24px;
        color: #fff !important;
      }

      .badge { font-size: 10px; padding: 3px 10px; }
      .badge-pass { background: #dcffe4 !important; color: #22863a !important; border: 1px solid #34d058 !important; }
      .badge-fail { background: #ffeef0 !important; color: #d73a49 !important; border: 1px solid #f97583 !important; }

      .card-body { padding: 8px 12px; }
      .card-stats {
        display: grid !important;
        grid-template-columns: repeat(3, 1fr) !important;
        gap: 6px;
        margin-bottom: 8px;
      }
      .stat-label { color: #888 !important; font-size: 9px; }
      .stat-value { color: #333 !important; font-size: 10px; }
      .stat-value a { color: #667eea !important; }
      .stat.error .stat-value { color: #d73a49 !important; }

      /* Screenshots - key fix: allow full display without max-height cutting */
      .screenshot-container {
        page-break-before: auto;
        overflow: visible !important;
      }
      .screenshot {
        max-height: none !important;
        width: 100%;
        height: auto;
        border: 1px solid #ddd;
        border-radius: 4px;
      }

      .report-footer {
        color: #999 !important;
        border-top: 1px solid #eee;
        margin-top: 12px;
        padding: 10px;
        font-size: 9px;
      }

      h2 { color: #333 !important; font-size: 16px; margin-bottom: 10px !important; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="report-header">
      <h1>${data.reportTitle}</h1>
      <p class="subtitle">${data.module}</p>
      <div class="report-meta">
        <span>Website: ${data.website}</span>
        <span>Tested: ${formatDate(data.testedAt)}</span>
        <span>By: ${data.testedBy}</span>
      </div>
    </div>

    <div class="summary-grid">
      <div class="summary-card total">
        <div class="number">${data.totalDashboards}</div>
        <div class="label">Total Dashboards</div>
      </div>
      <div class="summary-card pass">
        <div class="number">${data.passed}</div>
        <div class="label">Passed</div>
      </div>
      <div class="summary-card fail">
        <div class="number">${data.failed}</div>
        <div class="label">Failed</div>
      </div>
      <div class="summary-card time">
        <div class="number">${avgLoadTime} ms</div>
        <div class="label">Avg Load Time</div>
      </div>
    </div>

    <table class="summary-table">
      <thead>
        <tr>
          <th>#</th>
          <th>Dashboard</th>
          <th>Status</th>
          <th>HTTP</th>
          <th>Load Time</th>
        </tr>
      </thead>
      <tbody>
        ${data.results
          .map(
            (r, i) => `
        <tr>
          <td>${i + 1}</td>
          <td>${r.name}</td>
          <td>${r.status === 'pass' ? '<span class="badge badge-pass">PASS</span>' : '<span class="badge badge-fail">FAIL</span>'}</td>
          <td>${r.httpStatus ?? 'N/A'}</td>
          <td>${r.loadTimeMs} ms</td>
        </tr>`
          )
          .join('')}
      </tbody>
    </table>

    <h2 style="color: #fff; margin-bottom: 20px; font-size: 22px;">Dashboard Details</h2>
    ${resultRows}

    <div class="report-footer">
      <p>Pass Rate: ${passRate}% | Generated by ThaiCleftLink Dashboard Checker v1.0</p>
      <p>Report generated at ${formatDate(new Date().toISOString())}</p>
    </div>
  </div>

  <div class="modal-overlay" id="modal" onclick="closeModal()">
    <span class="modal-close">&times;</span>
    <div class="modal-content">
      <p class="modal-title" id="modal-title"></p>
      <img id="modal-img" src="" alt="" />
    </div>
  </div>

  <div style="position:fixed; bottom:30px; right:30px; z-index:999;">
    <a class="export-btn" href="dashboard-report-${dateStr}.pdf" title="Open PDF Report" style="position:static; text-decoration:none;">
      <svg viewBox="0 0 24 24"><path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20M10,19L8,17.5L9.5,16L8,14.5L10,13L11.5,14.5L13,13L15,14.5L13.5,16L15,17.5L13,19L11.5,17.5L10,19Z"/></svg>
      Export PDF
    </a>
  </div>

  <script>
    function openModal(src, title) {
      document.getElementById('modal').classList.add('active');
      document.getElementById('modal-img').src = src;
      document.getElementById('modal-title').textContent = title;
    }
    function closeModal() {
      document.getElementById('modal').classList.remove('active');
    }
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });
  </script>
</body>
</html>`;
}

// Main
function main() {
  if (!fs.existsSync(resultsFile)) {
    console.error('Error: test-results.json not found. Run tests first with: npm run test');
    process.exit(1);
  }

  const rawData = fs.readFileSync(resultsFile, 'utf-8');
  const data: ReportData = JSON.parse(rawData);

  const now = new Date();
  const dateStr = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;
  const outputFile = path.join(reportsDir, `dashboard-report-${dateStr}.html`);

  const html = generateHTML(data, dateStr);

  fs.writeFileSync(outputFile, html, 'utf-8');

  console.log('========================================');
  console.log('  Report Generated Successfully!');
  console.log('========================================');
  console.log(`  File: ${outputFile}`);
  console.log(`  Total: ${data.totalDashboards} dashboards`);
  console.log(`  Passed: ${data.passed}`);
  console.log(`  Failed: ${data.failed}`);
  console.log('========================================');
}

main();
