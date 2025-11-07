# 🔥 Termo Thermal Analysis Server

سرور پردازش فایل‌های BMT و تحلیل تصاویر حرارتی

---

## 📋 **پیش‌نیازها**

### 1️⃣ **Python 3.8+**
```bash
python --version
# باید Python 3.8 یا بالاتر باشه
```

### 2️⃣ **Visual Studio 2022**
- برای build کردن برنامه C#
- با workload ".NET desktop development"

### 3️⃣ **کتابخانه‌های Testo**
- `Testo.IRSoft.API.Image.dll`
- `Testo.Library.Measurement.dll`

این کتابخانه‌ها باید در پروژه C# موجود باشن.

---

## 🚀 **راه‌اندازی سریع**

### **روش 1: استفاده از اسکریپت خودکار (توصیه می‌شه)**

```cmd
cd server
start_server.bat
```

این اسکریپت به صورت خودکار:
- ✅ Python رو چک می‌کنه
- ✅ برنامه C# رو چک می‌کنه
- ✅ Virtual environment ایجاد/فعال می‌کنه
- ✅ Dependencies رو نصب می‌کنه
- ✅ سرور رو اجرا می‌کنه

### **روش 2: راه‌اندازی دستی**

#### مرحله 1: Build کردن برنامه C#

```cmd
# باز کردن Visual Studio
start ConsoleApp1\ConsoleApp1.sln

# در Visual Studio:
# Build > Rebuild Solution
```

یا از Command Line:

```cmd
cd ConsoleApp1
"C:\Program Files\Microsoft Visual Studio\2022\Community\Common7\Tools\VsDevCmd.bat"
msbuild ConsoleApp1.sln /p:Configuration=Debug /t:Rebuild
```

#### مرحله 2: ایجاد Virtual Environment

```cmd
python -m venv venv
venv\Scripts\activate
```

#### مرحله 3: نصب Dependencies

```cmd
pip install fastapi uvicorn python-multipart
```

#### مرحله 4: اجرای سرور

```cmd
python main.py
```

سرور روی `http://127.0.0.1:8080` اجرا می‌شه.

---

## 🧪 **تست سرور**

### **تست برنامه C#:**

```cmd
test_csharp.bat
```

یا دستی:

```cmd
ConsoleApp1\ConsoleApp1\bin\Debug\ConsoleApp1.exe "path\to\file.bmt"
```

**خروجی مورد انتظار:**

```json
{
  "device": "testo 868",
  "serial": "12345678",
  "captured_at": "2025-01-07T10:30:00",
  "emissivity": 0.95,
  "reflected_temp": 20.5,
  "stats": {
    "min": 12.47,
    "max": 41.41,
    "avg": 18.23
  },
  "images": {
    "thermal": "D:\\...\\temp_uploads\\xxx_thermal.png",
    "visual": "D:\\...\\temp_uploads\\xxx_visual.png"
  },
  "csv": "D:\\...\\temp_uploads\\xxx_temperature.csv"
}
```

### **تست API سرور:**

```bash
# با curl
curl -F "file=@example.bmt" http://127.0.0.1:8080/api/extract-bmt

# با PowerShell
$file = Get-Item "example.bmt"
$form = @{file=$file}
Invoke-RestMethod -Uri "http://127.0.0.1:8080/api/extract-bmt" -Method Post -Form $form
```

---

## 📁 **ساختار پروژه**

```
server/
├── main.py                    # سرور Python (FastAPI)
├── start_server.bat          # اسکریپت راه‌اندازی
├── test_csharp.bat           # اسکریپت تست C#
├── ConsoleApp1/              # پروژه C#
│   └── ConsoleApp1/
│       ├── Program.cs        # برنامه اصلی
│       ├── bin/Debug/
│       │   └── ConsoleApp1.exe
│       └── BmtExtract.csproj
├── temp_uploads/             # فایل‌های آپلود شده (موقت)
├── extracted_images/         # تصاویر و CSV استخراج شده
└── venv/                     # Python virtual environment
```

---

## 🔄 **جریان کاری**

```
1. کلاینت → POST /api/extract-bmt (فایل BMT)
   ↓
2. Python → ذخیره در temp_uploads/
   ↓
3. Python → اجرای ConsoleApp1.exe با مسیر فایل
   ↓
4. C# Application:
   - باز کردن فایل BMT با API تستو
   - استخراج تصویر حرارتی (PNG)
   - استخراج تصویر واقعی (PNG)
   - ساخت ماتریس دما (CSV)
   - استخراج metadata (JSON)
   ↓
5. C# → خروجی JSON به stdout
   ↓
6. Python:
   - Parse کردن JSON
   - انتقال فایل‌ها به extracted_images/
   - ساخت URL برای هر فایل
   ↓
7. Python → Response به کلاینت:
   {
     "success": true,
     "images": [
       {
         "type": "thermal",
         "url": "http://.../static_images/xxx_thermal.png",
         "csv_url": "http://.../static_images/xxx_temperature.csv",
         "metadata": { ... }
       },
       {
         "type": "real",
         "url": "http://.../static_images/xxx_visual.png"
       }
     ]
   }
```

---

## 🐛 **عیب‌یابی**

### ❌ **خطا: "Invalid temperature value!"**

**علت:** برنامه C# نمی‌تونه دماها رو از فایل BMT بخونه.

**راه‌حل:**
1. مطمئن شو فایل BMT معتبره (با نرم‌افزار Testo باز میشه)
2. برنامه C# رو دوباره build کن
3. کتابخانه‌های Testo رو چک کن

### ❌ **خطا: "Failed to open file"**

**علت:** فایل BMT خراب است یا فرمت اشتباه.

**راه‌حل:**
- فایل رو با نرم‌افزار اصلی Testo تست کن
- مطمئن شو پسوند فایل `.bmt` است

### ❌ **خطا: "File not found"**

**علت:** مسیر فایل اشتباه است.

**راه‌حل:**
- مسیر `CSHARP_APP` در `main.py` خط 19 رو چک کن
- مطمئن شو `ConsoleApp1.exe` وجود داره

### ❌ **خطا: "Module not found: fastapi"**

**علت:** Virtual environment فعال نیست.

**راه‌حل:**
```cmd
venv\Scripts\activate
pip install fastapi uvicorn python-multipart
```

---

## 🔧 **تنظیمات**

### تغییر پورت سرور:

**در `main.py` خط 142:**

```python
uvicorn.run(app, host="127.0.0.1", port=8080)
#                                        ^^^^
#                                    پورت دلخواه
```

### تغییر مسیر برنامه C#:

**در `main.py` خط 19:**

```python
CSHARP_APP = r"D:\path\to\ConsoleApp1.exe"
```

---

## 📊 **API Endpoints**

### `POST /api/extract-bmt`

**آپلود و پردازش فایل BMT**

**Request:**
```http
POST /api/extract-bmt HTTP/1.1
Content-Type: multipart/form-data

file: [binary BMT file]
```

**Response (Success):**
```json
{
  "success": true,
  "message": "BMT file processed successfully",
  "images": [
    {
      "type": "thermal",
      "url": "http://127.0.0.1:8080/static_images/xxx_thermal.png",
      "csv_url": "http://127.0.0.1:8080/static_images/xxx_temperature.csv",
      "metadata": {
        "device": "testo 868",
        "serial": "12345678",
        "captured_at": "2025-01-07T10:30:00",
        "emissivity": 0.95,
        "reflected_temp": 20.5,
        "stats": {
          "min": 12.47,
          "max": 41.41,
          "avg": 18.23
        }
      }
    },
    {
      "type": "real",
      "url": "http://127.0.0.1:8080/static_images/xxx_visual.png"
    }
  ]
}
```

**Response (Error):**
```json
{
  "detail": "Invalid temperature value!"
}
```

### `GET /static_images/{filename}`

**دانلود فایل استخراج شده**

**Request:**
```http
GET /static_images/xxx_thermal.png HTTP/1.1
```

**Response:**
```
[Binary file content]
Content-Type: image/png
```

---

## 📝 **لاگ‌ها**

سرور لاگ‌های مفیدی تولید می‌کنه:

```
INFO:     Started server process
INFO:     Uvicorn running on http://127.0.0.1:8080
INFO:__main__:C# Output: {"device":"testo 868",...}
INFO:__main__:CSV file moved and URL created: http://...
INFO:__main__:Response data prepared: 2 images
```

برای دیباگ بیشتر، لاگ‌های C# در console نمایش داده می‌شه.

---

## 🆘 **پشتیبانی**

اگه مشکلی داشتی:

1. **لاگ‌های سرور رو چک کن**
2. **تست C# رو اجرا کن:** `test_csharp.bat`
3. **فایل BMT رو با Testo باز کن** (اطمینان از معتبر بودن)
4. **برنامه C# رو دوباره build کن**

---

## 📄 **مجوز**

این پروژه برای استفاده داخلی است.
کتابخانه‌های Testo تحت مجوز مالکیت معنوی Testo SE & Co. هستند.
