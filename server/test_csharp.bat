@echo off
REM ============================================
REM   Test C# BMT Extraction Application
REM ============================================

echo [INFO] Testing C# BMT Extractor...
echo.

REM چک کردن EXE
if not exist "ConsoleApp1\ConsoleApp1\bin\Debug\ConsoleApp1.exe" (
    echo [ERROR] ConsoleApp1.exe not found!
    echo.
    echo Please build the C# project first:
    echo 1. Open Visual Studio 2022
    echo 2. Open ConsoleApp1\ConsoleApp1.sln
    echo 3. Build ^> Rebuild Solution
    echo.
    pause
    exit /b 1
)

echo [OK] C# application found
echo.

REM چک کردن فایل sample
set "SAMPLE_FILE="
for %%F in (temp_uploads\*.bmt) do (
    set "SAMPLE_FILE=%%F"
    goto :found
)

:found
if "%SAMPLE_FILE%"=="" (
    echo [WARNING] No BMT file found in temp_uploads
    echo.
    echo Please provide a test BMT file:
    set /p SAMPLE_FILE="Enter full path to BMT file: "

    if not exist "%SAMPLE_FILE%" (
        echo [ERROR] File not found: %SAMPLE_FILE%
        pause
        exit /b 1
    )
) else (
    echo [INFO] Found sample file: %SAMPLE_FILE%
)

echo.
echo ============================================
echo   Running C# Extractor
echo ============================================
echo.

REM اجرای برنامه C#
"ConsoleApp1\ConsoleApp1\bin\Debug\ConsoleApp1.exe" "%SAMPLE_FILE%"

echo.
echo ============================================
echo   Test Complete
echo ============================================
echo.

REM چک کردن فایل‌های خروجی
echo Checking output files:
echo.

set "BASE_NAME=%~n1"
if exist "temp_uploads\*_thermal.png" (
    echo [OK] Thermal image created
) else (
    echo [MISSING] Thermal image
)

if exist "temp_uploads\*_visual.png" (
    echo [OK] Visual image created
) else (
    echo [MISSING] Visual image
)

if exist "temp_uploads\*_temperature.csv" (
    echo [OK] Temperature CSV created
) else (
    echo [MISSING] Temperature CSV
)

echo.
pause
