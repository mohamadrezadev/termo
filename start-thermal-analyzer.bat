@echo off
chcp 65001 >nul
echo ╔══════════════════════════════════════════════════════════╗
echo ║          Thermal Analyzer Pro - راه‌انداز سیستم           ║
echo ╚══════════════════════════════════════════════════════════╝
echo.
echo در حال راه‌اندازی سرویس‌ها... / Starting services...
echo.

REM Check if server directory exists
if not exist "server\app\main.py" (
    echo خطا: پوشه سرور یافت نشد / Error: Server directory not found
    pause
    exit /b 1
)

REM Kill any existing server processes
echo بستن سرورهای قبلی... / Closing previous servers...
taskkill /F /IM python.exe /FI "WINDOWTITLE eq Thermal API Server*" 2>nul
timeout /t 1 /nobreak >nul

REM Start FastAPI server in background
echo راه‌اندازی سرور FastAPI... / Starting FastAPI server...
cd server
start "Thermal API Server" cmd /k "python app\main.py"
cd ..

REM Wait for server to start
echo منتظر راه‌اندازی سرور... / Waiting for server to start...
timeout /t 5 /nobreak >nul

REM Check if server is running
curl -s http://localhost:8000/health >nul 2>&1
if %errorlevel%==0 (
    echo ✓ سرور با موفقیت راه‌اندازی شد / Server started successfully
) else (
    echo تلاش برای اتصال به سرور... / Attempting to connect to server...
)

echo.
echo راه‌اندازی رابط کاربری... / Starting user interface...
cd client

REM Check if node_modules exists
if not exist "node_modules\" (
    echo نصب وابستگی‌ها... / Installing dependencies...
    call npm install
)

REM Start Next.js frontend
echo راه‌اندازی کلاینت Next.js... / Starting Next.js client...
start "Thermal Analyzer Client" cmd /k "npm run dev"

cd ..

echo.
echo ╔══════════════════════════════════════════════════════════╗
echo ║                   سیستم راه‌اندازی شد!                    ║
echo ║                   System Started!                        ║
echo ╠══════════════════════════════════════════════════════════╣
echo ║  سرور / Server:    http://localhost:8000                 ║
echo ║  کلاینت / Client:  http://localhost:5000                 ║
echo ╚══════════════════════════════════════════════════════════╝
echo.
echo برای بستن این پنجره، کلید هر دکمه‌ای را فشار دهید
echo Press any key to close this window...
pause >nul
