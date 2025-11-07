@echo off
REM ============================================
REM   Termo Thermal Analysis Server Startup
REM ============================================

echo [INFO] Starting Termo Server...
echo.

REM 1. چک کردن Python
echo [1/5] Checking Python installation...
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python is not installed or not in PATH!
    echo Please install Python 3.8+ from https://www.python.org/
    pause
    exit /b 1
)
python --version
echo.

REM 2. چک کردن C# Application
echo [2/5] Checking C# application...
if not exist "ConsoleApp1\ConsoleApp1\bin\Debug\ConsoleApp1.exe" (
    echo [ERROR] C# application not found!
    echo Please build the C# project in Visual Studio first:
    echo 1. Open ConsoleApp1\ConsoleApp1.sln in Visual Studio
    echo 2. Click Build ^> Rebuild Solution
    pause
    exit /b 1
)
echo [OK] C# application found
echo.

REM 3. ایجاد/فعال‌سازی Virtual Environment
echo [3/5] Setting up Python virtual environment...
if not exist "venv" (
    echo Creating new virtual environment...
    python -m venv venv
    if errorlevel 1 (
        echo [ERROR] Failed to create virtual environment!
        pause
        exit /b 1
    )
)

echo Activating virtual environment...
call venv\Scripts\activate.bat
if errorlevel 1 (
    echo [ERROR] Failed to activate virtual environment!
    pause
    exit /b 1
)
echo [OK] Virtual environment activated
echo.

REM 4. نصب Dependencies
echo [4/5] Installing Python dependencies...
pip install --upgrade pip >nul 2>&1
pip install fastapi uvicorn python-multipart >nul 2>&1
if errorlevel 1 (
    echo [WARNING] Some packages might have failed to install
)
echo [OK] Dependencies installed
echo.

REM 5. ایجاد پوشه‌های مورد نیاز
echo [5/5] Creating required directories...
if not exist "temp_uploads" mkdir temp_uploads
if not exist "extracted_images" mkdir extracted_images
echo [OK] Directories ready
echo.

REM اجرای سرور
echo ============================================
echo   Server is starting on http://127.0.0.1:8080
echo ============================================
echo.
echo Press Ctrl+C to stop the server
echo.

python main.py

pause
