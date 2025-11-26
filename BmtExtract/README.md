# 🔨 راهنمای BmtExtract - C# Application

برنامه **BmtExtract** برای استخراج تصاویر حرارتی و واقعی از فایل‌های BMT استفاده می‌شود.

---

## 📋 پیش‌نیازها

### نصب Visual Studio یا Build Tools

یکی از موارد زیر را نصب کنید:

#### گزینه 1: Visual Studio (پیشنهادی)
- **Visual Studio 2019** یا **2022**
- نسخه Community (رایگان) کافی است
- 📥 دانلود: [visualstudio.microsoft.com](https://visualstudio.microsoft.com/downloads/)

در زمان نصب، Workload های زیر را انتخاب کنید:
- ✅ `.NET desktop development`
- ✅ `Desktop development with C++` (اختیاری)

#### گزینه 2: Build Tools
- **Build Tools for Visual Studio**
- برای سیستم‌هایی که فقط به build نیاز دارند
- 📥 دانلود: [Build Tools](https://visualstudio.microsoft.com/downloads/#build-tools-for-visual-studio-2022)

### نصب .NET Framework
- **.NET Framework 4.7.2** یا بالاتر
- معمولاً همراه با Visual Studio نصب می‌شود

---

## 🔨 Build کردن پروژه

### روش 1: استفاده از فایل خودکار (ساده‌ترین)

```
دوبار کلیک روی: build.bat
```

این فایل **خودکار**:
- ✅ MSBuild را پیدا می‌کند
- ✅ NuGet packages را بازیابی می‌کند
- ✅ پروژه را build می‌کند
- ✅ مسیر فایل exe را نمایش می‌دهد

### روش 2: با Visual Studio

1. فایل `BmtExtract.sln` را با Visual Studio باز کنید
2. از منوی **Build** گزینه **Rebuild Solution** را انتخاب کنید
3. فایل exe در مسیر زیر ایجاد می‌شود:
   ```
   BmtExteract\bin\Release\BmtExteract.exe
   ```

### روش 3: با MSBuild (دستی)

```cmd
"C:\Program Files\Microsoft Visual Studio\2022\Community\MSBuild\Current\Bin\MSBuild.exe" BmtExtract.sln /p:Configuration=Release
```

---

## 🚀 استفاده از برنامه

### سینتکس پایه

```cmd
BmtExteract.exe <input.bmt> [palette]
```

### پارامترها

| پارامتر | توضیحات | مثال |
|---------|---------|------|
| `input.bmt` | فایل ورودی BMT | `example.bmt` |
| `palette` | پالت رنگی (اختیاری) | `iron`, `rainbow`, `grayscale` |

### پالت‌های رنگی موجود

| نام | توضیحات |
|-----|---------|
| `iron` | آهنی (پیش‌فرض) |
| `rainbow` | رنگین‌کمانی |
| `grayscale` | سیاه و سفید |
| `sepia` | قهوه‌ای |
| `bluered` | آبی-قرمز |
| `hotcold` | گرم-سرد |
| `testo` | پالت Testo |
| `dewpoint` | نقطه شبنم |

---

## 📝 مثال‌های استفاده

### مثال 1: استخراج ساده
```cmd
BmtExteract.exe "C:\Images\thermal_001.bmt"
```

### مثال 2: با پالت رنگی
```cmd
BmtExteract.exe "C:\Images\thermal_001.bmt" rainbow
```

### مثال 3: فراخوانی از Python
```python
import subprocess
import json

result = subprocess.run(
    ["BmtExteract.exe", "thermal.bmt", "iron"],
    capture_output=True,
    text=True
)

data = json.loads(result.stdout)
print(data)
```

---

## 📤 خروجی برنامه

برنامه یک JSON با ساختار زیر برمی‌گرداند:

```json
{
  "success": true,
  "device": "Testo 868",
  "serial": "12345678",
  "captured_at": "2025-11-26T10:30:00",
  "emissivity": 0.95,
  "reflected_temp": 20.0,
  "images": {
    "thermal": "path/to/thermal.bmp",
    "visual": "path/to/visual.bmp"
  },
  "csv": "path/to/temperature_data.csv",
  "stats": {
    "min_temp": 15.5,
    "max_temp": 85.2,
    "avg_temp": 32.1
  }
}
```

### فایل‌های ایجاد شده

1. **Thermal BMP**: تصویر حرارتی رنگی شده
2. **Visual BMP**: تصویر واقعی (اگر موجود باشد)
3. **CSV File**: داده‌های دمای هر پیکسل

---

## 📂 ساختار پروژه

```
BmtExtract/
├── build.bat                  ⭐ فایل build خودکار
├── BmtExtract.sln            📋 Solution file
├── BmtExteract/
│   ├── Program.cs            📝 کد اصلی
│   ├── BmtExteract.csproj    🔧 فایل پروژه
│   └── bin/
│       └── Release/
│           └── BmtExteract.exe  ✅ فایل اجرایی
└── packages/                 📦 NuGet packages
```

---

## 🔧 رفع مشکلات

### ❌ MSBuild یافت نشد
**راه‌حل:**
- Visual Studio 2019/2022 را نصب کنید
- یا Build Tools for Visual Studio را دانلود کنید

### ❌ NuGet packages بازیابی نشدند
**راه‌حل:**
```cmd
# دانلود nuget.exe
curl -o nuget.exe https://dist.nuget.org/win-x86-commandline/latest/nuget.exe

# بازیابی packages
nuget.exe restore BmtExtract.sln
```

### ❌ خطای "Missing Testo DLLs"
**راه‌حل:**
- فایل‌های DLL مورد نیاز باید در پوشه `packages` موجود باشند
- اگر مشکل دارد، solution را در Visual Studio باز کنید
- از منوی **Tools > NuGet Package Manager > Restore NuGet Packages**

### ❌ خطا در اجرا: "Could not load file or assembly"
**راه‌حل:**
- مطمئن شوید .NET Framework 4.7.2 نصب شده است
- همه DLL های مورد نیاز را در کنار exe کپی کنید

---

## 🔄 به‌روزرسانی

### تغییر کد
1. فایل `Program.cs` را ویرایش کنید
2. دوباره build کنید:
   ```
   build.bat
   ```

### اضافه کردن پالت جدید
در `Program.cs`:
```csharp
static Dictionary<string, Palette> TestoPalettes = new Dictionary<string, Palette>
{
    { "mynewpalette", Palette.YourNewPalette }
};
```

---

## 🧪 تست برنامه

### تست دستی
```cmd
cd BmtExteract\bin\Release
BmtExteract.exe "path\to\test.bmt" iron
```

### بررسی خروجی
```cmd
type output.json
```

---

## 📦 توزیع

برای استفاده در سرور یا سیستم‌های دیگر:

1. کپی کردن فایل‌های زیر:
   ```
   BmtExteract\bin\Release\
   ├── BmtExteract.exe
   ├── Testo.IRSoft.API.Image.dll
   ├── Testo.Library.Measurement.dll
   ├── Testo.IRSoft.Image.dll
   └── سایر DLL های مورد نیاز
   ```

2. نصب .NET Framework 4.7.2 روی سیستم هدف

3. تست اجرا

---

## 🔗 یکپارچگی با Backend

برنامه BmtExtract در سرور Python به صورت زیر فراخوانی می‌شود:

```python
# در server/main2.py
CSHARP_APP = r"path\to\BmtExteract.exe"

process = subprocess.run(
    [CSHARP_APP, temp_path, palette],
    capture_output=True,
    text=True,
    encoding="utf-8"
)

result = json.loads(process.stdout)
```

برای تغییر مسیر، فایل `server/main2.py` را ویرایش کنید.

---

## 📊 خلاصه دستورات

```cmd
# Build پروژه
build.bat

# یا با Visual Studio
"Build > Rebuild Solution"

# استفاده
BmtExteract.exe input.bmt [palette]
```

---

**نسخه:** 1.0.0  
**زبان:** C# (.NET Framework 4.7.2)  
**لایبرری:** Testo IRSoft API

موفق باشید! 🔨
