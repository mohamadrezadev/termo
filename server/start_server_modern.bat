@echo off
REM ============================================
REM   Termo Thermal Analysis - بکند جدید (Modular)
REM ============================================

echo ========================================
echo   Termo Backend Server - Modern FastAPI
echo ========================================
echo.

REM تغییر به دایرکتوری server
cd /d "%~dp0"

REM چک کردن Python
echo [1/3] بررسی نصب Python...
python --version >nul 2>&1
if errorlevel 1 (
    echo [خطا] Python نصب نشده یا در PATH قرار ندارد!
    echo لطفا Python 3.8+ را از https://www.python.org/ نصب کنید
    pause
    exit /b 1
)
python --version
echo.

REM ایجاد/فعال‌سازی Virtual Environment
echo [2/3] راه‌اندازی محیط مجازی Python...
if not exist "venv" (
    echo ایجاد محیط مجازی جدید...
    python -m venv venv
    if errorlevel 1 (
        echo [خطا] ایجاد محیط مجازی ناموفق بود!
        pause
        exit /b 1
    )
)

echo فعال‌سازی محیط مجازی...
call venv\Scripts\activate.bat
if errorlevel 1 (
    echo [خطا] فعال‌سازی محیط مجازی ناموفق بود!
    pause
    exit /b 1
)
echo [OK] محیط مجازی فعال شد
echo.

REM نصب Dependencies
echo [3/3] نصب وابستگی‌های Python...
echo این ممکن است چند لحظه طول بکشد...
pip install --upgrade pip >nul 2>&1
pip install -r requirements.txt
if errorlevel 1 (
    echo [هشدار] ممکن است برخی پکیج‌ها نصب نشده باشند
)
echo [OK] وابستگی‌ها نصب شدند
echo.

REM ایجاد پوشه‌های مورد نیاز
if not exist "data" mkdir data
if not exist "projects" mkdir projects

REM اجرای سرور
echo ========================================
echo   سرور در حال اجراست:
echo   http://127.0.0.1:8000
echo   API Docs: http://127.0.0.1:8000/docs
echo ========================================
echo.
echo برای توقف سرور Ctrl+C را فشار دهید
echo.

uvicorn app.main:app --reload --host 127.0.0.1 --port 8000

pause
