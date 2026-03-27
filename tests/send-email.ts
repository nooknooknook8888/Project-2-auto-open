import * as nodemailer from 'nodemailer';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load credentials from .env
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const reportsDir = path.join(__dirname, '..', 'reports');

interface DashboardResult {
  name: string;
  nameTh: string;
  url: string;
  status: 'pass' | 'fail';
  httpStatus: number | null;
  loadTimeMs: number;
  errorMessage: string | null;
}

interface ReportData {
  reportTitle: string;
  website: string;
  testedAt: string;
  totalDashboards: number;
  passed: number;
  failed: number;
  results: DashboardResult[];
}

function formatDate(isoString: string): string {
  const date = new Date(isoString);
  const buddhistYear = date.getFullYear() + 543;
  const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
    'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  const day = date.getDate();
  const month = months[date.getMonth()];
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${day} ${month} ${buddhistYear} เวลา ${hours}:${minutes} น.`;
}

function buildEmailHTML(data: ReportData, dateStr: string): string {
  const passRate = ((data.passed / data.totalDashboards) * 100).toFixed(1);
  const statusColor = data.failed === 0 ? '#22863a' : '#d73a49';
  const statusText = data.failed === 0 ? 'ผ่านทั้งหมด' : `ไม่ผ่าน ${data.failed} รายการ`;

  const rows = data.results.map((r, i) => {
    const badgeColor = r.status === 'pass' ? '#22863a' : '#d73a49';
    const badgeBg = r.status === 'pass' ? '#dcffe4' : '#ffeef0';
    const badgeText = r.status === 'pass' ? 'PASS' : 'FAIL';
    return `
      <tr style="border-bottom:1px solid #eee;">
        <td style="padding:10px 12px; color:#666;">${i + 1}</td>
        <td style="padding:10px 12px; font-weight:600; color:#333;">${r.name}</td>
        <td style="padding:10px 12px; color:#555;">${r.nameTh}</td>
        <td style="padding:10px 12px;">
          <span style="background:${badgeBg}; color:${badgeColor}; border:1px solid ${badgeColor}; padding:3px 10px; border-radius:12px; font-size:12px; font-weight:600;">${badgeText}</span>
        </td>
        <td style="padding:10px 12px; color:#555;">${r.httpStatus ?? 'N/A'}</td>
        <td style="padding:10px 12px; color:#555;">${r.loadTimeMs} ms</td>
      </tr>`;
  }).join('');

  return `
<!DOCTYPE html>
<html lang="th">
<head><meta charset="UTF-8"/></head>
<body style="font-family:'Segoe UI',Tahoma,sans-serif; background:#f4f6fb; margin:0; padding:20px;">
  <div style="max-width:700px; margin:0 auto; background:#fff; border-radius:12px; overflow:hidden; box-shadow:0 4px 20px rgba(0,0,0,0.1);">

    <!-- Header -->
    <div style="background:linear-gradient(135deg,#667eea,#764ba2); padding:32px 36px; text-align:center;">
      <h1 style="color:#fff; margin:0 0 8px; font-size:22px;">ThaiCleftLink Dashboard Health Check</h1>
      <p style="color:rgba(255,255,255,0.85); margin:0; font-size:14px;">รายงานผลการตรวจสอบอัตโนมัติ</p>
    </div>

    <!-- Summary bar -->
    <div style="background:#f8f9ff; border-bottom:1px solid #e8ecf8; padding:20px 36px; display:flex; gap:24px;">
      <div style="text-align:center; flex:1;">
        <div style="font-size:32px; font-weight:700; color:#4a5568;">${data.totalDashboards}</div>
        <div style="font-size:12px; color:#888; margin-top:4px;">Total</div>
      </div>
      <div style="text-align:center; flex:1;">
        <div style="font-size:32px; font-weight:700; color:#22863a;">${data.passed}</div>
        <div style="font-size:12px; color:#888; margin-top:4px;">Passed</div>
      </div>
      <div style="text-align:center; flex:1;">
        <div style="font-size:32px; font-weight:700; color:#d73a49;">${data.failed}</div>
        <div style="font-size:12px; color:#888; margin-top:4px;">Failed</div>
      </div>
      <div style="text-align:center; flex:1; border-left:1px solid #dde; padding-left:24px;">
        <div style="font-size:20px; font-weight:700; color:${statusColor};">${statusText}</div>
        <div style="font-size:12px; color:#888; margin-top:4px;">Pass Rate ${passRate}%</div>
      </div>
    </div>

    <!-- Body -->
    <div style="padding:28px 36px;">
      <p style="color:#555; font-size:14px; margin:0 0 20px;">
        ตรวจสอบเมื่อ: <strong>${formatDate(data.testedAt)}</strong><br/>
        เว็บไซต์: <a href="${data.website}" style="color:#667eea;">${data.website}</a>
      </p>

      <!-- Results table -->
      <table style="width:100%; border-collapse:collapse; font-size:14px;">
        <thead>
          <tr style="background:#667eea;">
            <th style="padding:10px 12px; color:#fff; text-align:left; font-weight:600;">#</th>
            <th style="padding:10px 12px; color:#fff; text-align:left; font-weight:600;">Dashboard</th>
            <th style="padding:10px 12px; color:#fff; text-align:left; font-weight:600;">ชื่อไทย</th>
            <th style="padding:10px 12px; color:#fff; text-align:left; font-weight:600;">Status</th>
            <th style="padding:10px 12px; color:#fff; text-align:left; font-weight:600;">HTTP</th>
            <th style="padding:10px 12px; color:#fff; text-align:left; font-weight:600;">Load Time</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>

    </div>

    <!-- Footer -->
    <div style="background:#f8f9ff; border-top:1px solid #e8ecf8; padding:16px 36px; text-align:center;">
      <p style="color:#999; font-size:12px; margin:0;">
        ส่งโดยอัตโนมัติ — ThaiCleftLink Dashboard Checker v1.0
      </p>
    </div>
  </div>
</body>
</html>`;
}

async function main() {
  const gmailUser = process.env.GMAIL_USER;
  const gmailPass = process.env.GMAIL_APP_PASSWORD;
  const emailTo = process.env.EMAIL_TO || 'siriwat.at@cmu.ac.th';

  if (!gmailUser || gmailUser === 'your_gmail@gmail.com') {
    console.error('ERROR: กรุณาแก้ไข GMAIL_USER ใน .env ก่อน');
    process.exit(1);
  }
  if (!gmailPass || gmailPass.includes('xxxx')) {
    console.error('ERROR: กรุณาแก้ไข GMAIL_APP_PASSWORD ใน .env ก่อน');
    process.exit(1);
  }

  // Find latest HTML and PDF reports
  const allFiles = fs.readdirSync(reportsDir);
  const htmlFiles = allFiles.filter(f => f.startsWith('dashboard-report-') && f.endsWith('.html')).sort().reverse();
  const pdfFiles = allFiles.filter(f => f.startsWith('dashboard-report-') && f.endsWith('.pdf')).sort().reverse();

  if (htmlFiles.length === 0) {
    console.error('ERROR: ไม่พบ HTML report กรุณา run test ก่อน');
    process.exit(1);
  }

  const htmlFile = path.join(reportsDir, htmlFiles[0]);
  const pdfFile = pdfFiles.length > 0 ? path.join(reportsDir, pdfFiles[0]) : null;
  const resultsFile = path.join(reportsDir, 'test-results.json');

  // Read test results for email body
  let data: ReportData | null = null;
  if (fs.existsSync(resultsFile)) {
    data = JSON.parse(fs.readFileSync(resultsFile, 'utf-8'));
  }

  // Extract date string from filename e.g. dashboard-report-2026-03-27.html
  const dateStr = htmlFiles[0].replace('dashboard-report-', '').replace('.html', '');

  // Build email HTML body
  const emailBody = data ? buildEmailHTML(data, dateStr) : `<p>Dashboard Health Check Report — ${dateStr}</p>`;
  const subject = data
    ? `[ThaiCleftLink] Dashboard Report ${dateStr} — ${data.passed}/${data.totalDashboards} Pass`
    : `[ThaiCleftLink] Dashboard Report ${dateStr}`;

  // Attach HTML and PDF files
  const attachments: { filename: string; path: string }[] = [];
  attachments.push({ filename: htmlFiles[0], path: htmlFile });
  if (pdfFile && fs.existsSync(pdfFile)) {
    attachments.push({ filename: pdfFiles[0], path: pdfFile });
  }
  const totalMB = attachments.reduce((sum, a) => sum + fs.statSync(a.path).size / 1024 / 1024, 0);
  console.log(`  Attachments: ${attachments.map(a => a.filename).join(', ')} (${totalMB.toFixed(1)} MB total)`);

  // Setup Gmail transporter
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: gmailUser,
      pass: gmailPass,
    },
  });

  console.log(`  Sending email to: ${emailTo}`);
  console.log(`  Subject: ${subject}`);

  await transporter.sendMail({
    from: `"ThaiCleftLink Dashboard Checker" <${gmailUser}>`,
    to: emailTo,
    subject,
    html: emailBody,
    attachments,
  });

  console.log('');
  console.log('  ========================================================');
  console.log('  Email Sent Successfully!');
  console.log('  ========================================================');
  console.log(`  To: ${emailTo}`);
  console.log('  ========================================================');
}

main().catch((err) => {
  console.error('Email failed:', err.message);
  process.exit(1);
});
