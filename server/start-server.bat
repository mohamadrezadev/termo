@echo off
chcp 65001 >nul
REM ============================================
REM   Termo Thermal Analysis Server - Startup
REM   نصب از پکیج‌های آفلاین و راه‌اندازی سرور
REM ============================================

echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║     Termo Thermal Analysis Server - راه‌اندازی سرور      ║
echo ╚════════════════════════════════════════════════════════════╝
echo.

REM 1. چک کردن Python
echo [1/6] بررسی نصب Python...
python --version >nul 2>&1
if errorlevel 1 (
    echo [خطا] Python نصب نیست یا در PATH تعریف نشده!
    echo لطفا Python 3.8 یا بالاتر از https://www.python.org نصب کنید
    pause
    exit /b 1
)
for /f "tokens=2" %%i in ('python --version') do set PYTHON_VERSION=%%i
echo [✓] Python %PYTHON_VERSION% شناسایی شد
echo.

REM 2. چک کردن C# Application (BmtExtract)
echo [2/6] بررسی وجود C# Application...
if not exist "..\BmtExtract\BmtExteract\bin\Debug\BmtExteract.exe" (
    echo [هشدار] فایل BmtExteract.exe یافت نشد!
    echo مسیر: ..\BmtExtract\BmtExteract\bin\Debug\BmtExteract.exe
    echo.
    echo برای ساخت پروژه C#:
    echo 1. فایل ..\BmtExtract\BmtExtract.sln را در Visual Studio باز کنید
    echo 2. Build ^> Rebuild Solution را اجرا کنید
    echo.
    set /p CONTINUE="آیا می‌خواهید بدون C# Application ادامه دهید? (Y/N): "
    if /i not "%CONTINUE%"=="Y" (
        pause
        exit /b 1
    )
    echo.
) else (
    echo [✓] C# Application آماده است
    echo.
)

REM 3. ایجاد/فعال‌سازی Virtual Environment
echo [3/6] راه‌اندازی محیط مجازی Python...
if not exist "venv" (
    echo ایجاد محیط مجازی جدید...
    python -m venv venv
    if errorlevel 1 (
        echo [خطا] ایجاد محیط مجازی با شکست مواجه شد!
        pause
        exit /b 1
    )
    echo [✓] محیط مجازی ایجاد شد
) else (
    echo [✓] محیط مجازی موجود است
)

echo فعال‌سازی محیط مجازی...
call venv\Scripts\activate.bat
if errorlevel 1 (
    echo [خطا] فعال‌سازی محیط مجازی با شکست مواجه شد!
    pause
    exit /b 1
)
echo [✓] محیط مجازی فعال شد
echo.

REM 4. نصب پکیج‌ها از wheelhouse (آفلاین)
echo [4/6] نصب پکیج‌های Python از فایل‌های آفلاین...
if exist "wheelhouse" (
    echo نصب از wheelhouse...
    python -m pip install --upgrade pip --no-index --find-links=wheelhouse
    pip install --no-index --find-links=wheelhouse -r requirements.txt
    if errorlevel 1 (
        echo [هشدار] برخی پکیج‌ها از wheelhouse نصب نشدند
        echo تلاش برای نصب از اینترنت...
        pip install -r requirements.txt
    ) else (
        echo [✓] همه پکیج‌ها با موفقیت از wheelhouse نصب شدند
    )
) else (
    echo [هشدار] پوشه wheelhouse یافت نشد
    echo نصب پکیج‌ها از اینترنت...
    pip install --upgrade pip
    pip install -r requirements.txt
)
echo.

REM 5. ایجاد پوشه‌های مورد نیاز
echo [5/6] ایجاد پوشه‌های مورد نیاز...
if not exist "temp_uploads" mkdir temp_uploads
if not exist "extracted_images" mkdir extracted_images
if not exist "projects" mkdir projects
if not exist "data" mkdir data
echo [✓] پوشه‌ها آماده شدند
echo.

REM 6. اجرای سرور
echo [6/6] راه‌اندازی سرور FastAPI...
echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║  سرور در حال اجرا است:                                    ║
echo ║  آدرس: http://127.0.0.1:8000                              ║
echo ║  مستندات API: http://127.0.0.1:8000/docs                 ║
echo ║                                                            ║
echo ║  برای توقف سرور: Ctrl+C                                  ║
echo ╚════════════════════════════════════════════════════════════╝
echo.

python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

pause
