@echo off
chcp 65001 >nul
cls
setlocal enabledelayedexpansion

REM ============================================
REM   Termo Thermal Analysis Client
REM   راه‌اندازی خودکار فرانت‌اند
REM ============================================

echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║   🚀 Termo Client - راه‌اندازی فرانت‌اند                  ║
echo ╚════════════════════════════════════════════════════════════╝
echo.

cd /d "%~dp0"

REM ============================================
REM گام 1: بررسی Node.js
REM ============================================
echo [1/5] 🔍 بررسی نصب Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js نصب نیست یا در PATH تعریف نشده!
    echo.
    echo 📥 لطفاً Node.js را از https://nodejs.org نصب کنید
    echo 💡 نسخه پیشنهادی: LTS (Long Term Support)
    echo.
    pause
    exit /b 1
)

for /f "tokens=1" %%i in ('node --version') do set NODE_VERSION=%%i
echo ✅ Node.js %NODE_VERSION% یافت شد
echo.

REM ============================================
REM گام 2: بررسی npm
REM ============================================
echo [2/5] 📦 بررسی npm...
npm --version >nul 2>&1
if errorlevel 1 (
    echo ❌ npm یافت نشد!
    pause
    exit /b 1
)

for /f "tokens=1" %%i in ('npm --version') do set NPM_VERSION=%%i
echo ✅ npm %NPM_VERSION% یافت شد
echo.

REM ============================================
REM گام 3: بررسی node_modules
REM ============================================
echo [3/5] 📚 بررسی وابستگی‌ها...
if not exist "node_modules" (
    echo ⚠️  پوشه node_modules یافت نشد
    echo 📦 نصب وابستگی‌ها...
    echo ⏳ این فرایند ممکن است چند دقیقه طول بکشد...
    echo.
    
    call npm install
    
    if errorlevel 1 (
        echo.
        echo ❌ خطا در نصب وابستگی‌ها!
        echo.
        echo 💡 راه‌حل‌های پیشنهادی:
        echo    1. اتصال اینترنت را بررسی کنید
        echo    2. دستور زیر را اجرا کنید:
        echo       npm cache clean --force
        echo       npm install
        echo.
        pause
        exit /b 1
    )
    
    echo ✅ وابستگی‌ها با موفقیت نصب شدند
) else (
    echo ✅ وابستگی‌ها از قبل نصب شده‌اند
)
echo.

REM ============================================
REM گام 4: بررسی فایل .env.local
REM ============================================
echo [4/5] ⚙️  بررسی تنظیمات...
if not exist ".env.local" (
    if exist ".env.local.example" (
        echo 📝 ایجاد فایل .env.local از example...
        copy .env.local.example .env.local >nul
        echo ✅ فایل .env.local ایجاد شد
    ) else (
        echo ⚠️  فایل .env.local یافت نشد (اختیاری)
    )
) else (
    echo ✅ فایل .env.local موجود است
)
echo.

REM ============================================
REM گام 5: راه‌اندازی سرور توسعه
REM ============================================
echo [5/5] 🚀 راه‌اندازی سرور Next.js...
echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║  ✨ سرور فرانت‌اند در حال اجرا است!                      ║
echo ║                                                            ║
echo ║  🌐 آدرس کلاینت:                                          ║
echo ║     http://localhost:5000                                 ║
echo ║     http://127.0.0.1:5000                                 ║
echo ║                                                            ║
echo ║  📱 دسترسی از شبکه:                                       ║
echo ║     http://[IP-شما]:5000                                  ║
echo ║                                                            ║
echo ║  🛑 برای توقف سرور: Ctrl+C                               ║
echo ╚════════════════════════════════════════════════════════════╝
echo.
echo ⏳ سرور در حال بارگذاری...
echo.

REM اجرای سرور توسعه
call npm run dev

REM اگر سرور متوقف شد
echo.
echo ════════════════════════════════════════════════════════════
echo سرور فرانت‌اند متوقف شد
echo ════════════════════════════════════════════════════════════
echo.

pause
