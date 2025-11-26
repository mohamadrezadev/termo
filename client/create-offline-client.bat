@echo off
chcp 65001 >nul
cls

REM ============================================
REM   ساخت بسته آفلاین Client
REM ============================================

echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║   📦 آماده‌سازی بسته نصب آفلاین Termo Client             ║
echo ╚════════════════════════════════════════════════════════════╝
echo.
echo این ابزار تمام پکیج‌های npm را دانلود می‌کند
echo تا بتوانید بدون اینترنت کلاینت را نصب کنید.
echo.
echo ⚠️  نیاز به اتصال اینترنت دارد!
echo.

cd /d "%~dp0"

REM بررسی Node.js
echo [1/3] بررسی Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js یافت نشد!
    pause
    exit /b 1
)
echo ✅ Node.js یافت شد
echo.

REM بررسی npm
echo [2/3] بررسی npm...
npm --version >nul 2>&1
if errorlevel 1 (
    echo ❌ npm یافت نشد!
    pause
    exit /b 1
)
echo ✅ npm یافت شد
echo.

REM نصب وابستگی‌ها و کش کردن
echo [3/3] دانلود و کش کردن پکیج‌ها...
echo ⏳ این فرایند ممکن است 5-10 دقیقه طول بکشد...
echo.

REM پاک کردن cache قبلی
echo 🧹 پاک کردن cache قبلی...
call npm cache clean --force
echo.

REM نصب پکیج‌ها (این کار آن‌ها را در npm cache ذخیره می‌کند)
echo 📥 دانلود پکیج‌ها...
call npm install

if errorlevel 1 (
    echo.
    echo ❌ خطا در دانلود پکیج‌ها!
    pause
    exit /b 1
)

echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║  ✅ بسته آفلاین آماده شد!                                 ║
echo ╚════════════════════════════════════════════════════════════╝
echo.

REM نمایش اطلاعات
echo 📊 اطلاعات:

REM شمارش فایل‌ها در node_modules
for /f %%i in ('dir /s /b node_modules 2^>nul ^| find /c "\"') do set COUNT=%%i
if defined COUNT echo    تعداد فایل‌ها: %COUNT%

REM محاسبه حجم
for /f "tokens=3" %%a in ('dir /s node_modules 2^>nul ^| find "bytes"') do set SIZE=%%a
if defined SIZE (
    set /a SIZE_MB=!SIZE:~0,-3! / 1024 / 1024
    echo    حجم کل: !SIZE_MB! MB تقریباً
)

echo.
echo 📦 پکیج‌ها در پوشه "node_modules" ذخیره شدند
echo.
echo 🚀 مراحل بعدی:
echo    1. کل پوشه client را کپی کنید (همراه با node_modules)
echo    2. روی سیستم هدف (بدون اینترنت):
echo       - فایل start-client.bat را اجرا کنید
echo.
echo 💡 نکته: حجم node_modules حدود 500MB-1GB است
echo.

pause
