import { chromium } from 'playwright';

const BASE_URL = 'https://www.thaicleftlink.org';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  });
  const page = await context.newPage();

  // Method 1: Try using the VISIBLE form (#email) instead of hidden form (#login)
  console.log('=== Method: Fill visible form with email field ===');
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'load' });
  await page.waitForTimeout(2000);

  // Fill the visible form (second form with #email)
  await page.evaluate(() => {
    const emailInput = document.querySelector('#email') as HTMLInputElement;
    const passInput = document.querySelector('#password_') as HTMLInputElement;
    if (emailInput) emailInput.value = 'siriwat';
    if (passInput) passInput.value = 'Siriwat98';
    console.log('email:', emailInput?.value, 'pass:', passInput?.value);
    const form = emailInput?.closest('form');
    if (form) form.submit();
  });

  await page.waitForURL('**/home**', { timeout: 15000 }).catch(() => {
    console.log('  Did not redirect to /home');
  });
  console.log('URL after login:', page.url());

  // Check cookies
  const cookies = await context.cookies();
  console.log('Cookies:', cookies.map(c => `${c.name}`).join(', '));

  // Try dashboard
  console.log('\nGoing to Operation Milestone...');
  await page.goto(`${BASE_URL}/dashboard/operation_milestone`, { waitUntil: 'load' });
  await page.waitForTimeout(5000);

  const info = await page.evaluate(() => {
    return {
      rows: document.querySelectorAll('table tr').length,
      bodyLen: document.body.innerText.length,
      url: window.location.href,
    };
  });
  console.log('Result:', info);

  if (info.rows > 2) {
    console.log('SUCCESS! Data loaded with visible form login');
    await page.screenshot({ path: 'reports/screenshots/debug_method1.png', fullPage: true });
  } else {
    console.log('FAILED - trying another method...');

    // Method 2: Navigate via clicks like a real user
    console.log('\n=== Method 2: Click-based login ===');
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'load' });
    await page.waitForTimeout(2000);

    // Try clicking on input and typing
    const inputs = await page.$$('input[type="text"]:visible, input[type="email"]:visible');
    const passwordInputs = await page.$$('input[type="password"]:visible');

    console.log(`Visible text inputs: ${inputs.length}, password inputs: ${passwordInputs.length}`);

    if (inputs.length > 0 && passwordInputs.length > 0) {
      await inputs[0].fill('siriwat');
      await passwordInputs[0].fill('Siriwat98');

      const submitBtns = await page.$$('button[type="submit"]:visible');
      console.log(`Submit buttons: ${submitBtns.length}`);
      if (submitBtns.length > 0) {
        await submitBtns[0].click();
      }

      await page.waitForURL('**/home**', { timeout: 15000 }).catch(() => {});
      console.log('URL after click login:', page.url());

      // Try dashboard again
      await page.goto(`${BASE_URL}/dashboard/operation_milestone`, { waitUntil: 'load' });
      await page.waitForTimeout(8000);

      const info2 = await page.evaluate(() => {
        return {
          rows: document.querySelectorAll('table tr').length,
          bodyLen: document.body.innerText.length,
        };
      });
      console.log('Result:', info2);

      if (info2.rows > 2) {
        console.log('SUCCESS! Data loaded with click login');
        await page.screenshot({ path: 'reports/screenshots/debug_method2.png', fullPage: true });
      }
    }

    // Method 3: Use POST request directly
    console.log('\n=== Method 3: POST login request ===');
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'load' });
    await page.waitForTimeout(1000);

    // Get CSRF token
    const token = await page.evaluate(() => {
      const meta = document.querySelector('meta[name="csrf-token"]');
      const input = document.querySelector('input[name="_token"]');
      return (meta as HTMLMetaElement)?.content || (input as HTMLInputElement)?.value || '';
    });
    console.log('CSRF token:', token.substring(0, 20) + '...');

    // Submit via fetch within the page context
    const loginResult = await page.evaluate(async (csrf) => {
      const formData = new FormData();
      formData.append('_token', csrf);
      formData.append('login', 'siriwat');
      formData.append('password', 'Siriwat98');

      const resp = await fetch('/login', {
        method: 'POST',
        body: formData,
        credentials: 'same-origin',
        redirect: 'follow',
      });
      return { status: resp.status, url: resp.url, redirected: resp.redirected };
    }, token);
    console.log('Login POST result:', loginResult);

    // Navigate to dashboard
    await page.goto(`${BASE_URL}/dashboard/operation_milestone`, { waitUntil: 'load' });
    await page.waitForTimeout(8000);

    const info3 = await page.evaluate(() => {
      return {
        rows: document.querySelectorAll('table tr').length,
        bodyLen: document.body.innerText.length,
      };
    });
    console.log('Result:', info3);

    if (info3.rows > 2) {
      console.log('SUCCESS! Data loaded with POST login');
      await page.screenshot({ path: 'reports/screenshots/debug_method3.png', fullPage: true });
    }
  }

  await browser.close();
}

main().catch(console.error);
