@echo off
chcp 65001 >nul
REM ============================================
REM   Build ساده Electron (بدون Backend)
REM ============================================

echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║  Build ساده Electron - فقط Frontend                       ║
echo ╚════════════════════════════════════════════════════════════╝
echo.

cd /d "%~dp0"

REM 1. بستن پروسس‌های Electron
echo [1/5] بستن پروسس‌های Electron...
taskkill /F /IM electron.exe >nul 2>&1
taskkill /F /IM "Thermal Analyzer Pro.exe" >nul 2>&1
timeout /t 2 /nobreak >nul
echo [✓] پروسس‌ها بسته شدند
echo.

REM 2. پاک کردن فایل‌های قفل شده با robocopy
echo [2/5] پاک کردن build قبلی...
if exist "dist_electron_new" rmdir /s /q dist_electron_new >nul 2>&1
if exist "dist_electron" (
    echo استفاده از robocopy برای پاک کردن...
    mkdir dist_electron_new >nul 2>&1
    robocopy dist_electron_new dist_electron /MIR >nul 2>&1
    rmdir /s /q dist_electron >nul 2>&1
    rmdir /s /q dist_electron_new >nul 2>&1
)
echo [✓] فایل‌های قبلی پاک شدند
echo.

REM 3. چک کردن out
echo [3/5] بررسی فایل‌های static...
if not exist "out\index.html" (
    echo [خطا] پوشه out یافت نشد!
    echo لطفا ابتدا: npm run build
    pause
    exit /b 1
)
echo [✓] فایل‌های static موجود است
echo.

REM 4. Build portable (سریع‌تر)
echo [4/5] Build Portable Version...
echo این فرآیند 2-3 دقیقه طول می‌کشد...
echo.

call npx electron-builder build --win portable --x64
if errorlevel 1 (
    echo.
    echo [خطا] Build ناموفق بود!
    pause
    exit /b 1
)

echo.
echo [5/5] تست فایل خروجی...
if exist "dist_electron\*.exe" (
    echo.
    echo ╔════════════════════════════════════════════════════════════╗
    echo ║  ✓ Build موفقیت‌آمیز بود!                                 ║
    echo ╚════════════════════════════════════════════════════════════╝
    echo.
    echo فایل خروجی:
    dir /B dist_electron\*.exe
    echo.
) else (
    echo [خطا] فایل exe ایجاد نشد!
)

pause
