# راهنمای قابلیت State Persistence (ذخیره‌سازی وضعیت)

## خلاصه تغییرات

این راهنما توضیحاتی درباره قابلیت **State Persistence** (ذخیره‌سازی کامل وضعیت) پروژه termo ارائه می‌دهد که به کاربران امکان می‌دهد تا پس از انجام تحلیل‌ها و علامت‌گذاری‌ها، کار خود را ذخیره کرده و در جلسه بعدی دقیقاً از همان نقطه ادامه دهند.

## تغییرات اعمال شده

### 1. تغییرات Backend (سرور)

#### مدل‌های پایگاه داده (`server/app/models/project.py`)

فیلدهای جدید به مدل `Project` اضافه شده است:

```python
# State Persistence Fields
active_image_id: Optional[UUID] = None          # تصویر فعال
current_palette: str = "iron"                    # پالت رنگی انتخابی
custom_min_temp: Optional[float] = None          # حداقل دمای سفارشی
custom_max_temp: Optional[float] = None          # حداکثر دمای سفارشی

# Global Parameters - پارامترهای سراسری
global_parameters: Optional[Dict[str, Any]] = Field(default=None, sa_column=Column(JSON))
# ساختار: {"emissivity": 0.95, "ambientTemp": 20, "reflectedTemp": 20, "humidity": 0.5, "distance": 1.0}

# Display Settings - تنظیمات نمایش
display_settings: Optional[Dict[str, Any]] = Field(default=None, sa_column=Column(JSON))
# ساختار: {
#   "thermalView": {"zoom": 1, "panX": 0, "panY": 0},
#   "realView": {"zoom": 1, "panX": 0, "panY": 0},
#   "showGrid": false,
#   "showMarkers": true,
#   "showRegions": true,
#   "showTemperatureScale": true
# }

# Window Layout - چیدمان پنجره‌ها
window_layout: Optional[Dict[str, Any]] = Field(default=None, sa_column=Column(JSON))
# ساختار: {
#   "windows": [{"id": "thermal-viewer", "isOpen": true, "position": {...}, "size": {...}, ...}],
#   "gridCols": 3,
#   "gridRows": 2
# }
```

#### Schemas (`server/app/schemas/project.py`)

- `ProjectCreate`: فیلدهای state persistence اضافه شده
- `ProjectUpdate`: فیلدهای state persistence اضافه شده
- `ProjectResponse`: فیلدهای state persistence اضافه شده
- `BulkSaveRequest`: فیلدهای state persistence اضافه شده

#### API Endpoints (`server/app/api/routes/project.py`)

endpoint `/{project_id}/bulk-save` به‌روزرسانی شده تا:
- تمام فیلدهای state persistence را از request دریافت کند
- این فیلدها را در پایگاه داده ذخیره کند
- هم برای پروژه‌های جدید و هم پروژه‌های موجود کار کند

### 2. تغییرات Frontend (کلاینت)

#### API Service (`client/lib/api-service.ts`)

تابع `bulkSaveProject` به‌روزرسانی شده تا پارامتر `stateData` را بپذیرد:

```typescript
export async function bulkSaveProject(
  projectId: string | null,
  projectData: {...},
  images: [...],
  markers: [...],
  regions: [...],
  stateData?: {
    active_image_id?: string;
    current_palette?: string;
    custom_min_temp?: number | null;
    custom_max_temp?: number | null;
    global_parameters?: any;
    display_settings?: any;
    window_layout?: any;
  }
)
```

#### Project Service (`client/lib/project-service.ts`)

1. **تابع `saveProjectToAPI`**: پارامتر `stateData` اضافه شده
2. **تابع `scheduleAutoSave`**: پارامتر `stateData` اضافه شده
3. **تابع `loadProjectFromAPI`**: برگرداندن `stateData` از backend اضافه شده

#### Store (`client/lib/store.ts`)

1. **Helper Function**: `collectStateData(state)` برای جمع‌آوری state کامل
2. **به‌روزرسانی تمام فراخوانی‌های `scheduleAutoSave`** در:
   - `autoSaveProject`
   - `saveCurrentProject`
   - `addImage`
   - `updateImagePalettes`
   - `removeImage`
   - `addMarker`
   - `updateMarker`
   - `removeMarker`
   - `addRegion`
   - `updateRegion`
   - `removeRegion`

3. **به‌روزرسانی `loadProjectById`** برای restore کردن state کامل:
   - تصویر فعال
   - پالت رنگی
   - محدوده دمایی سفارشی
   - پارامترهای سراسری
   - تنظیمات نمایش (zoom, pan, show flags)
   - چیدمان پنجره‌ها

## نحوه استفاده

### ذخیره‌سازی خودکار

هنگامی که کاربر تغییراتی در پروژه ایجاد می‌کند (مانند اضافه کردن marker، تغییر palette، zoom کردن)، سیستم به صورت خودکار بعد از 5 ثانیه state کامل را ذخیره می‌کند.

### ذخیره‌سازی دستی

کاربر می‌تواند با استفاده از دکمه "Save Project" state فعلی را به صورت دستی ذخیره کند.

```typescript
// در کامپوننت
const { saveCurrentProject, currentProject } = useAppStore();

const handleSave = async () => {
  if (currentProject) {
    await saveCurrentProject(currentProject);
  }
};
```

### بازیابی State

هنگام باز کردن یک پروژه، تمام state از جمله:
- تصویر فعال
- تنظیمات zoom و pan
- پالت رنگی انتخابی
- محدوده دمایی سفارشی
- نمایش/پنهان کردن markers، regions، grid
- موقعیت و اندازه پنجره‌ها

به صورت خودکار بازیابی می‌شود.

```typescript
// در کامپوننت
const { loadProjectById } = useAppStore();

const handleLoadProject = async (projectId: string) => {
  await loadProjectById(projectId);
  // همه چیز بازیابی شده است!
};
```

## Migration پایگاه داده

برای پروژه‌های موجود، پایگاه داده به صورت خودکار فیلدهای جدید را با مقادیر پیش‌فرض اضافه می‌کند:

- `active_image_id`: NULL
- `current_palette`: "iron"
- `custom_min_temp`: NULL
- `custom_max_temp`: NULL
- `global_parameters`: NULL
- `display_settings`: NULL
- `window_layout`: NULL

### SQLModel Auto-Migration

از آنجایی که از SQLModel استفاده می‌شود، هنگام راه‌اندازی سرور، تغییرات مدل به صورت خودکار اعمال می‌شود. در صورت نیاز به migration دستی:

```python
# در server/app/db/session.py یا جایی که create_db_and_tables فراخوانی می‌شود
from sqlmodel import SQLModel, create_engine

engine = create_engine(database_url)
SQLModel.metadata.create_all(engine)  # ایجاد/به‌روزرسانی جداول
```

## تست

برای تست قابلیت State Persistence:

1. یک پروژه جدید ایجاد کنید
2. چند تصویر حرارتی اضافه کنید
3. چند marker و region ایجاد کنید
4. پالت رنگی را تغییر دهید
5. zoom و pan کنید
6. محدوده دمایی سفارشی تنظیم کنید
7. پروژه را ذخیره کنید
8. برنامه را ببندید و دوباره باز کنید
9. پروژه را بارگذاری کنید
10. بررسی کنید که همه تنظیمات بازیابی شده‌اند

## فواید

✅ **کاربر می‌تواند دقیقاً از جایی که کار را رها کرده بود ادامه دهد**
✅ **تمام تنظیمات نمایش حفظ می‌شوند**
✅ **چیدمان workspace بازیابی می‌شود**
✅ **پارامترهای تحلیلی ذخیره می‌شوند**
✅ **تجربه کاربری بهتر و حرفه‌ای‌تر**

## نکات مهم

1. **Auto-save**: پس از هر تغییر، state به صورت خودکار با 5 ثانیه تأخیر ذخیره می‌شود
2. **Backward Compatibility**: پروژه‌های قدیمی بدون state persistence همچنان کار می‌کنند
3. **Performance**: ذخیره‌سازی state به صورت غیرهمزمان انجام می‌شود و UI را مسدود نمی‌کند
4. **Data Integrity**: تمام داده‌ها قبل از ارسال به backend validate می‌شوند

## مشکلات احتمالی و راه‌حل

### مشکل: State بازیابی نمی‌شود

**راه‌حل**: بررسی کنید که:
- سرور در حال اجرا است
- endpoint `/projects/{project_id}/bulk-save` به درستی کار می‌کند
- response از backend شامل فیلدهای state persistence است

### مشکل: Auto-save کار نمی‌کند

**راه‌حل**: بررسی کنید که:
- `currentProject` در store تنظیم شده است
- تغییرات `hasUnsavedChanges` را `true` می‌کنند
- console logs نشان‌دهنده فراخوانی `scheduleAutoSave` هستند

## پشتیبانی

برای هرگونه سؤال یا مشکل، لطفاً به مستندات API در `API_ENDPOINTS_GUIDE.md` مراجعه کنید.
