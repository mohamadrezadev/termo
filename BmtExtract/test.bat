@echo off
chcp 65001 >nul
cls

REM ============================================
REM   تست BmtExtract
REM ============================================

echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║   🧪 تست BmtExtract Application                          ║
echo ╚════════════════════════════════════════════════════════════╝
echo.

cd /d "%~dp0"

REM مسیر فایل اجرایی
set EXE_PATH=BmtExteract\bin\Release\BmtExteract.exe

REM بررسی وجود فایل
if not exist "%EXE_PATH%" (
    set EXE_PATH=BmtExteract\bin\Debug\BmtExteract.exe
)

if not exist "%EXE_PATH%" (
    echo ❌ فایل BmtExteract.exe یافت نشد!
    echo.
    echo 💡 ابتدا پروژه را build کنید:
    echo    دوبار کلیک روی: build.bat
    echo.
    pause
    exit /b 1
)

echo ✅ فایل اجرایی یافت شد:
echo    %EXE_PATH%
echo.

REM تست ساده - نمایش راهنما
echo 📝 تست 1: نمایش راهنما...
echo ────────────────────────────────────────────────────────────
"%EXE_PATH%"
echo ────────────────────────────────────────────────────────────
echo.

REM بررسی فایل تست
echo 📝 تست 2: بررسی فایل‌های نمونه...

REM جستجو برای فایل‌های BMT
set TEST_FILE=

REM جستجو در پوشه‌های احتمالی
for %%d in (. ..\data ..\test_data ..\server\temp_uploads) do (
    if exist "%%d\*.bmt" (
        for %%f in ("%%d\*.bmt") do (
            set TEST_FILE=%%f
            goto :found_file
        )
    )
)

:found_file
if defined TEST_FILE (
    echo ✅ فایل تست یافت شد: %TEST_FILE%
    echo.
    echo 📝 تست 3: پردازش فایل با پالت iron...
    echo ────────────────────────────────────────────────────────────
    "%EXE_PATH%" "%TEST_FILE%" iron
    echo ────────────────────────────────────────────────────────────
    echo.
    echo ✅ تست کامل شد!
    echo    خروجی را بررسی کنید.
) else (
    echo ⚠️  فایل BMT تستی یافت نشد
    echo.
    echo 💡 برای تست دستی:
    echo    %EXE_PATH% "path\to\file.bmt" iron
)

echo.
echo 📋 دستورات تست:
echo.
echo    تست با پالت iron:
echo    "%EXE_PATH%" file.bmt iron
echo.
echo    تست با پالت rainbow:
echo    "%EXE_PATH%" file.bmt rainbow
echo.
echo    تست با پالت grayscale:
echo    "%EXE_PATH%" file.bmt grayscale
echo.

pause
