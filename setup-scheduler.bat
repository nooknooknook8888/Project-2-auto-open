@echo off
title Setup Task Scheduler
cd /d "%~dp0"

echo  Setting up daily scheduled task at 08:30...

schtasks /create /tn "ThaiCleftLink Dashboard Check" /tr "\"%~dp0run-dashboard-check.bat\"" /sc daily /st 08:30 /f

if %ERRORLEVEL% EQU 0 (
    echo.
    echo  ========================================================
    echo    Scheduled Task Created Successfully!
    echo    Name: ThaiCleftLink Dashboard Check
    echo    Time: 08:30 every day
    echo  ========================================================
) else (
    echo.
    echo  ERROR: Could not create task. Try running as Administrator.
)

echo.
echo  Press any key to close...
pause >nul
