@echo off
chcp 65001 >nul
REM ============================================
REM   Thermal Analyzer Pro - Windows Build
REM   ساخت نسخه Windows از اپلیکیشن
REM ============================================

echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║  Thermal Analyzer Pro - ساخت نسخه Windows                ║
echo ╚════════════════════════════════════════════════════════════╝
echo.

cd /d "%~dp0"

REM 1. چک کردن Node.js
echo [1/7] بررسی نصب Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo [خطا] Node.js نصب نیست!
    echo لطفا از https://nodejs.org دانلود کنید
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo [✓] Node.js %NODE_VERSION% شناسایی شد
echo.

REM 2. چک کردن Python
echo [2/7] بررسی نصب Python...
python --version >nul 2>&1
if errorlevel 1 (
    echo [خطا] Python نصب نیست!
    pause
    exit /b 1
)
for /f "tokens=2" %%i in ('python --version') do set PYTHON_VERSION=%%i
echo [✓] Python %PYTHON_VERSION% شناسایی شد
echo.

REM 3. نصب dependencies در کلاینت
echo [3/7] نصب dependencies کلاینت...
cd client
if not exist "node_modules" (
    echo نصب npm packages...
    call npm install
    if errorlevel 1 (
        echo [خطا] نصب dependencies با شکست مواجه شد!
        cd ..
        pause
        exit /b 1
    )
) else (
    echo [✓] node_modules موجود است
)
echo.

REM 4. Build کردن Next.js
echo [4/7] ساخت اپلیکیشن Next.js...
echo این فرآیند ممکن است چند دقیقه طول بکشد...
call npm run build
if errorlevel 1 (
    echo [خطا] Build اپلیکیشن با شکست مواجه شد!
    cd ..
    pause
    exit /b 1
)
echo [✓] Build اپلیکیشن موفق بود
echo.

REM 5. ساخت پوشه out از Next.js build
echo [5/7] آماده‌سازی Static Files...
if not exist "out" (
    echo ایجاد پوشه out...
    mkdir out
)
echo [✓] Static files آماده است
echo.

REM 6. آماده‌سازی Backend
echo [6/7] آماده‌سازی سرور Backend...

REM ایجاد ساختار پوشه برای backend
if not exist "dist_backend_temp\thermal_api" mkdir dist_backend_temp\thermal_api

REM کپی فایل‌های backend به صورت مستقیم (بدون PyInstaller)
echo کپی کردن فایل‌های سرور...
cd ..
xcopy /E /I /Y server\app client\dist_backend_temp\thermal_api\app\
xcopy /E /I /Y server\requirements.txt client\dist_backend_temp\thermal_api\
copy server\main2.py client\dist_backend_temp\thermal_api\main.py >nul 2>&1
if not exist "client\dist_backend_temp\thermal_api\main.py" (
    echo [هشدار] main2.py یافت نشد، از ساختار app استفاده می‌شود
)

cd client
echo [✓] فایل‌های سرور آماده شد
echo.

REM 7. ساخت Electron Package
echo [7/7] ساخت پکیج نهایی Windows...
echo این مرحله ممکن است 5-10 دقیقه طول بکشد...
call npm run build:electron
if errorlevel 1 (
    echo [خطا] ساخت پکیج Electron با شکست مواجه شد!
    cd ..
    pause
    exit /b 1
)
echo.

echo ╔════════════════════════════════════════════════════════════╗
echo ║  ساخت با موفقیت انجام شد!                                 ║
echo ╚════════════════════════════════════════════════════════════╝
echo.
echo فایل‌های خروجی در مسیر زیر:
echo client\dist_electron\
echo.
echo نوع فایل‌ها:
echo   - ThermalAnalyzerPro-Setup-*.exe  (نصب‌کننده)
echo   - ThermalAnalyzerPro-Portable-*.exe  (نسخه Portable)
echo.

REM نمایش اندازه فایل‌ها
cd dist_electron
for %%F in (*.exe) do (
    echo   %%~nxF - %%~zF bytes
)

cd ..\..
pause
