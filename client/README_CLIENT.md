# 🖥️ Termo Thermal Analysis Client

کلاینت React/Next.js برای تحلیل و نمایش تصاویر حرارتی

---

## 📋 **پیش‌نیازها**

- **Node.js 18+**
- **npm یا yarn**
- **سرور Termo** (در حال اجرا روی `http://127.0.0.1:8080`)

---

## 🚀 **راه‌اندازی**

### مرحله 1: نصب Dependencies

```bash
cd client
npm install
# یا
yarn install
```

### مرحله 2: اجرای کلاینت (Development)

```bash
npm run dev
# یا
yarn dev
```

کلاینت روی `http://localhost:3000` اجرا می‌شه.

### مرحله 3: Build برای Production

```bash
npm run build
npm run start
```

---

## 🎯 **ویژگی‌های جدید**

### ✅ **1. پردازش CSV دقیق**

کلاینت حالا داده‌های دما رو مستقیماً از فایل CSV سرور می‌خونه به جای استفاده از پیکسل‌های تصویر.

**فایل:** `lib/thermal-utils.ts`

```typescript
export async function processThermalDataFromCSV(
  csvUrl: string,
  metadata?: Partial<ThermalMetadata>
): Promise<ThermalData>
```

**مزایا:**
- ✅ دقت بالاتر (2 رقم اعشار)
- ✅ داده‌های واقعی دما
- ✅ پشتیبانی از metadata کامل

### ✅ **2. Metadata واقعی از سرور**

همه اطلاعات metadata از سرور دریافت می‌شه:

```typescript
const metadata = {
  emissivity: thermalResult.metadata?.emissivity ?? 0.95,
  ambientTemp: thermalResult.metadata?.reflected_temp ?? 20,
  reflectedTemp: thermalResult.metadata?.reflected_temp ?? 20,
  cameraModel: thermalResult.metadata?.device || 'Thermal Camera',
  timestamp: new Date(thermalResult.metadata?.captured_at)
};
```

### ✅ **3. Tooltip بهبود یافته**

Tooltip حالا اطلاعات کامل نشون میده:

- **Position:** (X, Y)
- **Temperature:** با دقت 0.01°C
- **Data Source:** CSV یا BMP
- **Emissivity:** 3 رقم اعشار
- **Ambient/Reflected Temperature**
- **Humidity & Distance**
- **Min/Max Range**
- **Camera Model & Date**

### ✅ **4. Color Palette Selector**

9 پالت رنگی مختلف:
- Iron (آهنی) - پیش‌فرض
- Rainbow (رنگین‌کمان)
- Grayscale (سیاه و سفید)
- Hot (داغ)
- Cold (سرد)
- Medical (پزشکی)
- Sepia (سپیا)
- Arctic (قطبی)
- Lava (گدازه)

### ✅ **5. Fallback هوشمند**

اگه CSV موجود نباشه، خودکار به BMP fallback می‌کنه:

```typescript
if (thermalResult?.csv_url) {
  // استفاده از CSV
  thermalData = await processThermalDataFromCSV(csvUrl, metadata);
} else if (thermalResult?.url) {
  // Fallback به BMP
  thermalData = await processThermalBmpFromServer(url);
}
```

---

## 📁 **فایل‌های کلیدی**

### `lib/thermal-utils.ts`
توابع پردازش تصاویر حرارتی:
- `processThermalDataFromCSV()` - پردازش CSV (جدید)
- `processThermalBmpFromServer()` - پردازش BMP (fallback)
- `renderThermalCanvas()` - رندر با پالت رنگی
- `getTemperatureAtPixel()` - دریافت دما در یک پیکسل

### `components/windows/ThermalViewer.tsx`
کامپوننت اصلی نمایش تصویر حرارتی:
- Upload handler بهبود یافته
- Tooltip پیشرفته
- Palette selector
- Drawing tools (marker, region)

### `lib/store.ts`
State management با Zustand:
- مدیریت تصاویر
- مدیریت markers و regions
- تنظیمات نمایش (zoom, pan, palette)

### `lib/project-service.ts`
مدیریت پروژه‌ها:
- ذخیره/بارگذاری پروژه
- Serialization تصاویر
- Auto-save

---

## 🔄 **جریان کاری کلاینت**

```
1. کاربر فایل BMT آپلود می‌کنه
   ↓
2. handleFileUpload() → POST به /api/extract-bmt
   ↓
3. دریافت response با URLs:
   - thermal image URL
   - visual image URL
   - CSV URL
   - metadata
   ↓
4. processThermalDataFromCSV() → دانلود و parse CSV
   ↓
5. ساخت ThermalImage object با:
   - thermalData (از CSV)
   - realImage
   - metadata
   ↓
6. addImage() → اضافه به store
   ↓
7. renderThermalCanvas() → رندر با پالت انتخابی
   ↓
8. نمایش در ThermalViewer با:
   - Zoom/Pan
   - Hover tooltip
   - Drawing tools
   - Palette selector
```

---

## 🎨 **استفاده از Color Palettes**

```typescript
import { COLOR_PALETTES, renderThermalCanvas } from '@/lib/thermal-utils';

// دریافت لیست پالت‌ها
const palettes = Object.entries(COLOR_PALETTES);

// رندر با پالت خاص
const canvas = canvasRef.current;
const palette = COLOR_PALETTES['iron'];

renderThermalCanvas(
  canvas,
  thermalData,
  palette,
  customMinTemp,
  customMaxTemp
);
```

---

## 🐛 **عیب‌یابی**

### ❌ **خطا: CORS Error**

**علت:** سرور روی پورت دیگه‌ای اجراست.

**راه‌حل:**
```typescript
// در ThermalViewer.tsx خط 197-199
const serverUrl = process.env.NODE_ENV === 'development'
  ? 'http://localhost:8080'  // تغییر پورت
  : 'http://127.0.0.1:8080';
```

### ❌ **خطا: "Failed to fetch CSV"**

**علت:** CSV از سرور دریافت نشده.

**راه‌حل:**
1. Console سرور رو چک کن
2. مطمئن شو برنامه C# CSV تولید می‌کنه
3. URL CSV رو در Network tab چک کن

### ❌ **تصویر نمایش داده نمیشه**

**علت:** thermalData null است.

**راه‌حل:**
```javascript
// چک کردن console logs:
[UPLOAD] Processing thermal data from CSV: ...
[THERMAL_UTILS] CSV loaded, size: ...
[THERMAL_UTILS] CSV parsed: 320x240 pixels
[UPLOAD] Thermal data processed from CSV successfully
```

---

## 📊 **Console Logs مفید**

### موفق:
```
[UPLOAD] Uploading file to: http://localhost:8080/api/extract-bmt
[UPLOAD] Server response: {success: true, images: [...]}
[UPLOAD] Processing thermal data from CSV: http://...
[THERMAL_UTILS] CSV loaded, size: 450.20 KB
[THERMAL_UTILS] CSV parsed: 320x240 pixels
[THERMAL_UTILS] Temperature range: 12.47°C - 41.41°C
[UPLOAD] Thermal data processed from CSV successfully
[UPLOAD] Adding new image to store: {...}
```

### ناموفق (با fallback):
```
[UPLOAD] Failed to process CSV, falling back to BMP: ...
[THERMAL_UTILS] Processing thermal BMP from server (fallback mode): ...
[THERMAL_UTILS] BMP processed (fallback)
```

---

## 🔧 **تنظیمات**

### تغییر آدرس سرور:

```typescript
// ThermalViewer.tsx
const serverUrl = 'http://your-server:8080';
```

### تغییر پالت پیش‌فرض:

```typescript
// store.ts
currentPalette: 'iron', // rainbow, grayscale, hot, etc.
```

### غیرفعال کردن CSV (استفاده از BMP):

```typescript
// ThermalViewer.tsx خط 236
if (false && thermalResult?.csv_url) { // غیرفعال کردن CSV
  // ...
}
```

---

## 📦 **Build و Deploy**

### Development:
```bash
npm run dev
```

### Production Build:
```bash
npm run build
npm run start
```

### Static Export:
```bash
npm run build
npm run export
```

---

## 🆘 **پشتیبانی**

مشکل داری؟

1. **Console browser رو چک کن** (F12 → Console)
2. **Network tab رو چک کن** (F12 → Network)
3. **لاگ‌های سرور رو ببین**
4. **مطمئن شو سرور روی پورت 8080 اجراست**

---

## 📄 **مجوز**

این پروژه برای استفاده داخلی است.
