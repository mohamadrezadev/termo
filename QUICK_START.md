# 🚀 راهنمای سریع اجرای پروژه Termo Thermal Analyzer

این راهنما به شما کمک می‌کند پروژه را به سرعت راه‌اندازی کنید.

---

## ⚡ اجرای سریع (Quick Start)

### 1️⃣ اجرای بکند (Backend)

**گزینه A: استفاده از فایل BAT (توصیه می‌شود)**
```bash
cd server
start_server_modern.bat
```

**گزینه B: دستور دستی**
```bash
cd server
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

✅ بکند باید روی `http://127.0.0.1:8000` اجرا شود

### 2️⃣ اجرای فرانت (Frontend)

**Terminal جدید باز کنید:**
```bash
cd client
npm install    # فقط بار اول
npm run dev
```

✅ فرانت باید روی `http://localhost:3000` اجرا شود

### 3️⃣ باز کردن برنامه

مرورگر را باز کنید و به آدرس زیر بروید:
```
http://localhost:3000
```

---

## 📋 پیش‌نیازها

### نرم‌افزارهای مورد نیاز:

1. **Python 3.8+** 
   - دانلود: https://www.python.org/downloads/
   - حتماً گزینه "Add Python to PATH" را فعال کنید

2. **Node.js 18+**
   - دانلود: https://nodejs.org/
   - LTS version را نصب کنید

3. **Visual Studio** (برای C# extractor)
   - Visual Studio 2019 یا بالاتر
   - .NET Framework 4.7.2 یا بالاتر

---

## 🔧 تنظیمات اولیه

### بکند (Backend)

#### 1. نصب Python Dependencies
```bash
cd server
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

#### 2. Build کردن C# Extractor
1. باز کنید: `BmtExtract\BmtExtract.sln`
2. کلیک کنید: `Build > Rebuild Solution`
3. فایل `.exe` در `BmtExtract\BmtExteract\bin\Debug\` ایجاد می‌شود

#### 3. چک کردن مسیر C# Extractor
فایل `server/app/core/config.py` را باز کنید و مسیر را چک کنید:
```python
CSHARP_EXTRACTOR_PATH: str = os.getenv(
    "CSHARP_EXTRACTOR_PATH",
    r"D:\پروژه های دانش بنیان\termo2\termo\BmtExtract\BmtExtract\bin\Debug\net8.0\BmtExtract.exe"
)
```

### فرانت (Frontend)

#### 1. نصب Node Dependencies
```bash
cd client
npm install
```

#### 2. چک کردن `.env.local`
فایل `client/.env.local` را باز کنید و مطمئن شوید:
```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

---

## 🗺️ ساختار پروژه

```
termo/
├── server/                          # بکند FastAPI
│   ├── app/
│   │   ├── main.py                 # ✅ فایل اصلی (Modern System)
│   │   ├── api/
│   │   │   ├── v1/
│   │   │   │   └── router.py      # Router اصلی
│   │   │   └── routes/            # Endpoint ها
│   │   │       ├── thermal.py     # آپلود BMT
│   │   │       ├── projects.py    # مدیریت پروژه
│   │   │       ├── markers.py     # مارکرها
│   │   │       ├── regions.py     # مناطق
│   │   │       └── reports.py     # گزارش‌ها
│   │   ├── core/
│   │   │   └── config.py          # تنظیمات
│   │   └── db/
│   │       └── persistence.py     # دیتابیس
│   ├── main2.py                    # ⚠️ سیستم قدیمی (Standalone)
│   ├── requirements.txt
│   ├── start_server_modern.bat    # ✅ اجرای سیستم جدید
│   └── start_server.bat            # ⚠️ اجرای سیستم قدیمی
│
├── client/                          # فرانت Next.js
│   ├── app/                        # صفحات
│   ├── components/                 # کامپوننت‌ها
│   ├── lib/
│   │   ├── api-service.ts         # توابع API
│   │   └── axios-config.ts        # تنظیمات Axios
│   ├── .env.local                 # ⚙️ تنظیمات محیطی
│   └── package.json
│
├── BmtExtract/                     # C# Extractor
│   └── BmtExtract.sln
│
├── projects/                       # پروژه‌های ذخیره شده
│
└── API_ENDPOINTS_GUIDE.md         # 📚 راهنمای کامل API
```

---

## 🌐 Endpoint های مهم

### بکند API:
- **Base URL**: `http://localhost:8000/api/v1`
- **API Docs**: `http://localhost:8000/docs` (Swagger UI)
- **Health Check**: `http://localhost:8000/health`

### فرانت:
- **صفحه اصلی**: `http://localhost:3000`

---

## 🔍 عیب‌یابی (Troubleshooting)

### ❌ خطا: "Network Error" یا "Failed to connect"

**علت**: بکند در حال اجرا نیست یا روی پورت اشتباه است

**راه حل**:
1. چک کنید بکند روی پورت 8000 اجرا شده باشد
2. در terminal بکند باید ببینید: `Uvicorn running on http://127.0.0.1:8000`
3. `.env.local` فرانت را چک کنید

### ❌ خطا: "404 Not Found" برای endpoint ها

**علت**: از `main2.py` استفاده می‌کنید که endpoint های کامل ندارد

**راه حل**: از `start_server_modern.bat` یا `uvicorn app.main:app` استفاده کنید

### ❌ تصاویر بارگذاری نمی‌شوند

**علت**: C# extractor پیدا نمی‌شود یا مسیر اشتباه است

**راه حل**:
1. C# project را build کنید
2. مسیر در `server/app/core/config.py` را چک کنید
3. دسترسی‌های اجرا (execute permissions) را چک کنید

### ❌ خطا: "Module not found"

**علت**: Dependencies نصب نشده‌اند

**راه حل**:
```bash
# برای بکند
cd server
pip install -r requirements.txt

# برای فرانت
cd client
npm install
```

---

## 📖 مستندات بیشتر

- **راهنمای کامل API**: `API_ENDPOINTS_GUIDE.md`
- **گزارش اتصال**: `CONNECTION_REPORT.md`
- **راهنمای فارسی**: `راهنمای_کامل_فارسی.md`

---

## 🎯 نکات مهم

1. **همیشه از `start_server_modern.bat` استفاده کنید** نه `start_server.bat`
2. **پورت پیش‌فرض بکند 8000 است** (نه 8080)
3. **قبل از اجرا، C# extractor را build کنید**
4. **`.env.local` فرانت را چک کنید** تا با پورت بکند مطابقت داشته باشد

---

## 💡 دستورات مفید

### چک کردن نسخه‌ها:
```bash
python --version
node --version
npm --version
```

### پاک کردن و نصب مجدد:
```bash
# بکند
cd server
rm -rf venv
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt

# فرانت
cd client
rm -rf node_modules
npm install
```

### دیدن لاگ‌های بیشتر:
```bash
# بکند با لاگ کامل
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000 --log-level debug

# فرانت با لاگ کامل
npm run dev -- --debug
```

---

## 📞 پشتیبانی

اگر مشکلی پیش آمد:
1. Console مرورگر را چک کنید (F12)
2. Terminal بکند را چک کنید
3. فایل‌های log را بررسی کنید
4. مستندات API را مطالعه کنید

---

**موفق باشید! 🚀**
