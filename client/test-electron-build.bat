@echo off
chcp 65001 >nul
REM ============================================
REM   تست Build Electron - ساده شده
REM ============================================

echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║  تست Build Electron                                        ║
echo ╚════════════════════════════════════════════════════════════╝
echo.

cd /d "%~dp0"

REM 1. چک کردن فایل‌های ضروری
echo [1/4] بررسی فایل‌های مورد نیاز...

if not exist "main.js" (
    echo [خطا] main.js یافت نشد!
    pause
    exit /b 1
)
echo [✓] main.js موجود است

if not exist "package.json" (
    echo [خطا] package.json یافت نشد!
    pause
    exit /b 1
)
echo [✓] package.json موجود است

if not exist "out" (
    echo [خطا] پوشه out یافت نشد!
    echo لطفا ابتدا: npm run build
    pause
    exit /b 1
)
echo [✓] پوشه out موجود است
echo.

REM 2. ایجاد پوشه backend ساختگی (برای تست)
echo [2/4] آماده‌سازی ساختار Backend...
if not exist "dist_backend_temp\thermal_api" mkdir dist_backend_temp\thermal_api
echo. > dist_backend_temp\thermal_api\placeholder.txt
echo [✓] ساختار Backend آماده است
echo.

REM 3. چک کردن electron-builder
echo [3/4] بررسی electron-builder...
call npm list electron-builder >nul 2>&1
if errorlevel 1 (
    echo [هشدار] electron-builder نصب نیست، در حال نصب...
    call npm install --save-dev electron-builder
)
echo [✓] electron-builder آماده است
echo.

REM 4. اجرای Build
echo [4/4] شروع Build Electron...
echo این مرحله ممکن است 5-10 دقیقه طول بکشد...
echo.

call npx electron-builder build --win --x64
if errorlevel 1 (
    echo.
    echo [خطا] Build با شکست مواجه شد!
    echo.
    echo رایج‌ترین مشکلات:
    echo 1. فایل آیکون یافت نشد (حل شده - از آیکون پیش‌فرض استفاده می‌شود)
    echo 2. حافظه کم - حداقل 4GB RAM نیاز است
    echo 3. فضای دیسک کم - حداقل 2GB فضا نیاز است
    echo.
    pause
    exit /b 1
)

echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║  Build موفقیت‌آمیز بود!                                   ║
echo ╚════════════════════════════════════════════════════════════╝
echo.
echo فایل‌های خروجی در: dist_electron\
echo.

if exist "dist_electron" (
    echo لیست فایل‌ها:
    dir /B dist_electron\*.exe
)

pause
