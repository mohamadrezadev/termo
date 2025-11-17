@echo off
chcp 65001 >nul
REM ============================================
REM   Thermal Analyzer Pro - راه‌اندازی کامل
REM   سرور + کلاینت (توسعه)
REM ============================================

echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║  Thermal Analyzer Pro - راه‌اندازی برنامه                 ║
echo ╚════════════════════════════════════════════════════════════╝
echo.

cd /d "%~dp0"

REM چک کردن Python و Node.js
echo [INFO] بررسی نیازمندی‌ها...
python --version >nul 2>&1
if errorlevel 1 (
    echo [خطا] Python نصب نیست!
    pause
    exit /b 1
)

node --version >nul 2>&1
if errorlevel 1 (
    echo [خطا] Node.js نصب نیست!
    pause
    exit /b 1
)
echo [✓] Python و Node.js آماده هستند
echo.

REM راه‌اندازی سرور در پس‌زمینه
echo [1/2] راه‌اندازی سرور Backend...
cd server
start "Termo Server" /MIN cmd /c start-server.bat
echo [✓] سرور در حال راه‌اندازی است...
timeout /t 5 /nobreak >nul
cd ..
echo.

REM راه‌اندازی کلاینت
echo [2/2] راه‌اندازی کلاینت Frontend...
cd client

REM چک کردن node_modules
if not exist "node_modules" (
    echo نصب dependencies...
    call npm install
)

echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║  برنامه در حال اجرا است:                                  ║
echo ║                                                            ║
echo ║  Backend:  http://127.0.0.1:8000                          ║
echo ║  Frontend: http://127.0.0.1:5000                          ║
echo ║  API Docs: http://127.0.0.1:8000/docs                     ║
echo ║                                                            ║
echo ║  برای توقف: Ctrl+C در هر دو ترمینال                      ║
echo ╚════════════════════════════════════════════════════════════╝
echo.

call npm run dev

cd ..
