@echo off
chcp 65001 >nul
cls

REM ============================================
REM   ساخت پروژه C# BmtExtract
REM ============================================

echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║   🔨 Build BmtExtract - C# Application                    ║
echo ╚════════════════════════════════════════════════════════════╝
echo.

cd /d "%~dp0"

REM ============================================
REM گام 1: بررسی MSBuild
REM ============================================
echo [1/3] 🔍 بررسی MSBuild...

REM جستجو در مسیرهای معمول Visual Studio
set MSBUILD_PATH=

REM VS 2022
if exist "C:\Program Files\Microsoft Visual Studio\2022\Community\MSBuild\Current\Bin\MSBuild.exe" (
    set MSBUILD_PATH=C:\Program Files\Microsoft Visual Studio\2022\Community\MSBuild\Current\Bin\MSBuild.exe
)
if exist "C:\Program Files\Microsoft Visual Studio\2022\Professional\MSBuild\Current\Bin\MSBuild.exe" (
    set MSBUILD_PATH=C:\Program Files\Microsoft Visual Studio\2022\Professional\MSBuild\Current\Bin\MSBuild.exe
)
if exist "C:\Program Files\Microsoft Visual Studio\2022\Enterprise\MSBuild\Current\Bin\MSBuild.exe" (
    set MSBUILD_PATH=C:\Program Files\Microsoft Visual Studio\2022\Enterprise\MSBuild\Current\Bin\MSBuild.exe
)

REM VS 2019
if not defined MSBUILD_PATH (
    if exist "C:\Program Files (x86)\Microsoft Visual Studio\2019\Community\MSBuild\Current\Bin\MSBuild.exe" (
        set MSBUILD_PATH=C:\Program Files (x86)\Microsoft Visual Studio\2019\Community\MSBuild\Current\Bin\MSBuild.exe
    )
)
if not defined MSBUILD_PATH (
    if exist "C:\Program Files (x86)\Microsoft Visual Studio\2019\Professional\MSBuild\Current\Bin\MSBuild.exe" (
        set MSBUILD_PATH=C:\Program Files (x86)\Microsoft Visual Studio\2019\Professional\MSBuild\Current\Bin\MSBuild.exe
    )
)

REM بررسی PATH
if not defined MSBUILD_PATH (
    where msbuild >nul 2>&1
    if not errorlevel 1 (
        set MSBUILD_PATH=msbuild
    )
)

if not defined MSBUILD_PATH (
    echo ❌ MSBuild یافت نشد!
    echo.
    echo 💡 لطفاً Visual Studio را نصب کنید:
    echo    - Visual Studio 2019 یا بالاتر
    echo    - یا Build Tools for Visual Studio
    echo.
    echo 📥 دانلود از:
    echo    https://visualstudio.microsoft.com/downloads/
    echo.
    pause
    exit /b 1
)

echo ✅ MSBuild یافت شد
echo    مسیر: %MSBUILD_PATH%
echo.

REM ============================================
REM گام 2: بازیابی NuGet Packages
REM ============================================
echo [2/3] 📦 بازیابی NuGet packages...

REM جستجو برای nuget.exe
set NUGET_PATH=

if exist "nuget.exe" (
    set NUGET_PATH=nuget.exe
)

if exist "..\nuget.exe" (
    set NUGET_PATH=..\nuget.exe
)

if exist "C:\nuget\nuget.exe" (
    set NUGET_PATH=C:\nuget\nuget.exe
)

if not defined NUGET_PATH (
    where nuget >nul 2>&1
    if not errorlevel 1 (
        set NUGET_PATH=nuget
    )
)

if defined NUGET_PATH (
    echo ✅ NuGet.exe یافت شد
    "%NUGET_PATH%" restore BmtExtract.sln
) else (
    echo ⚠️  nuget.exe یافت نشد، تلاش با MSBuild...
    "%MSBUILD_PATH%" /t:Restore BmtExtract.sln
)

if errorlevel 1 (
    echo ⚠️  هشدار: ممکن است برخی packages بازیابی نشده باشند
    echo.
)
echo.

REM ============================================
REM گام 3: Build پروژه
REM ============================================
echo [3/3] 🔨 Build پروژه...

"%MSBUILD_PATH%" BmtExtract.sln /p:Configuration=Release /p:Platform="Any CPU" /v:m

if errorlevel 1 (
    echo.
    echo ❌ خطا در Build پروژه!
    echo.
    echo 💡 راه‌حل‌های پیشنهادی:
    echo    1. فایل BmtExtract.sln را در Visual Studio باز کنید
    echo    2. Build ^> Rebuild Solution را اجرا کنید
    echo    3. خطاهای موجود را بررسی کنید
    echo.
    pause
    exit /b 1
)

echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║  ✅ Build موفقیت‌آمیز بود!                                ║
echo ╚════════════════════════════════════════════════════════════╝
echo.

REM نمایش مسیر خروجی
if exist "BmtExteract\bin\Release\BmtExteract.exe" (
    echo 📁 فایل اجرایی:
    echo    BmtExteract\bin\Release\BmtExteract.exe
    echo.
    echo 🎯 استفاده:
    echo    BmtExteract.exe ^<input.bmt^> [palette]
    echo.
    echo    پالت‌های موجود:
    echo    - iron (پیش‌فرض)
    echo    - rainbow
    echo    - grayscale
    echo    - sepia
    echo    - bluered
    echo    - hotcold
    echo.
) else if exist "BmtExteract\bin\Debug\BmtExteract.exe" (
    echo 📁 فایل اجرایی (Debug):
    echo    BmtExteract\bin\Debug\BmtExteract.exe
    echo.
) else (
    echo ⚠️  فایل اجرایی یافت نشد!
    echo    لطفاً مسیر خروجی را بررسی کنید.
    echo.
)

pause
