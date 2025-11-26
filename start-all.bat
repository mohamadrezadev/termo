@echo off
chcp 65001 >nul
cls

REM ============================================
REM   راه‌اندازی کامل پروژه Termo
REM   سرور + کلاینت
REM ============================================

echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║   🚀 راه‌اندازی کامل سیستم Termo                          ║
echo ║   (سرور Backend + کلاینت Frontend)                       ║
echo ╚════════════════════════════════════════════════════════════╝
echo.

cd /d "%~dp0"

REM ============================================
REM بررسی پیش‌نیازها
REM ============================================
echo 🔍 بررسی پیش‌نیازها...
echo.

REM بررسی Python
echo [1/2] Python...
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Python نصب نیست!
    echo 📥 دانلود: https://python.org
    pause
    exit /b 1
)
for /f "tokens=2" %%i in ('python --version 2^>^&1') do echo ✅ Python %%i

REM بررسی Node.js
echo [2/2] Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js نصب نیست!
    echo 📥 دانلود: https://nodejs.org
    pause
    exit /b 1
)
for /f "tokens=1" %%i in ('node --version') do echo ✅ Node.js %%i

echo.
echo ════════════════════════════════════════════════════════════
echo.

REM ============================================
REM راه‌اندازی Backend
REM ============================================
echo 📡 راه‌اندازی Backend Server...
cd server
start "Termo Backend Server" cmd /k "echo ╔════════════════════════════════════╗ & echo ║   Termo Backend Server             ║ & echo ╚════════════════════════════════════╝ & echo. & setup-offline.bat"
cd ..

echo ✅ Backend Server در حال راه‌اندازی است...
echo.

REM صبر 3 ثانیه تا سرور بکند شروع شود
echo ⏳ منتظر راه‌اندازی سرور...
timeout /t 3 /nobreak >nul
echo.

REM ============================================
REM راه‌اندازی Frontend
REM ============================================
echo 🖥️  راه‌اندازی Frontend Client...
cd client
start "Termo Frontend Client" cmd /k "echo ╔════════════════════════════════════╗ & echo ║   Termo Frontend Client            ║ & echo ╚════════════════════════════════════╝ & echo. & start-client.bat"
cd ..

echo ✅ Frontend Client در حال راه‌اندازی است...
echo.

REM ============================================
REM اطلاعات نهایی
REM ============================================
echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║  ✨ سیستم Termo در حال راه‌اندازی است!                   ║
echo ║                                                            ║
echo ║  🔧 Backend (API Server):                                 ║
echo ║     http://127.0.0.1:8000                                 ║
echo ║     http://127.0.0.1:8000/docs                            ║
echo ║                                                            ║
echo ║  🖥️  Frontend (Client):                                   ║
echo ║     http://127.0.0.1:5000                                 ║
echo ║                                                            ║
echo ║  💡 دو پنجره جداگانه باز شده‌اند                         ║
echo ║  🛑 برای توقف: Ctrl+C در هر پنجره                       ║
echo ╚════════════════════════════════════════════════════════════╝
echo.
echo ⏳ منتظر راه‌اندازی کامل بمانید...
echo.
echo صبر 10 ثانیه سپس مرورگر باز می‌شود...
timeout /t 10 /nobreak

REM باز کردن مرورگر
echo.
echo 🌐 باز کردن مرورگر...
start http://127.0.0.1:5000

echo.
echo ✅ مرورگر باز شد!
echo.
echo این پنجره را نبندید، دو سرور در پنجره‌های جداگانه اجرا می‌شوند.
echo.

pause
