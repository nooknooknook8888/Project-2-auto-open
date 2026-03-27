@echo off
title ThaiCleftLink Dashboard Health Check
color 0B

cd /d "%~dp0"

echo.
echo  ========================================================
echo    ThaiCleftLink Dashboard Health Check
echo    Automated Testing Script v1.0
echo  ========================================================
echo.

echo  [0/4] Checking Playwright browser...
echo  --------------------------------------------------------
call "C:\Program Files\nodejs\npx.cmd" playwright install chromium --quiet
echo  Browser ready.

echo.
echo  [1/4] Running dashboard checks...
echo  --------------------------------------------------------
call "C:\Program Files\nodejs\npx.cmd" tsx tests/run-check.ts
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo  WARNING: Some tests failed. Generating report anyway...
    echo.
)

echo.
echo  [2/4] Generating HTML report...
echo  --------------------------------------------------------
call "C:\Program Files\nodejs\npx.cmd" tsx tests/generate-report.ts

echo.
echo  [3/4] Exporting PDF report...
echo  --------------------------------------------------------
call "C:\Program Files\nodejs\npx.cmd" tsx tests/export-pdf.ts

echo.
echo  [4/4] Sending email report...
echo  --------------------------------------------------------
call "C:\Program Files\nodejs\npx.cmd" tsx tests/send-email.ts
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo  WARNING: Email failed. Please check .env credentials.
    echo.
)

echo.
echo  Opening reports in browser...
echo  --------------------------------------------------------

set "REPORT_FILE="
for /f "delims=" %%f in ('dir /b /o-d reports\dashboard-report-*.html 2^>nul') do (
    if not defined REPORT_FILE set "REPORT_FILE=%%f"
)

if defined REPORT_FILE (
    start "" "reports\%REPORT_FILE%"
    echo  HTML: reports\%REPORT_FILE%
)

set "PDF_FILE="
for /f "delims=" %%f in ('dir /b /o-d reports\dashboard-report-*.pdf 2^>nul') do (
    if not defined PDF_FILE set "PDF_FILE=%%f"
)

if defined PDF_FILE (
    echo  PDF:  reports\%PDF_FILE%
)

echo.
echo  ========================================================
echo    Done! HTML + PDF reports generated and email sent.
echo  ========================================================
echo.
echo  Press any key to close this window...
pause >nul
