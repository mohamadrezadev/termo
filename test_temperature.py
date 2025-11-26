"""
تست ساده برای بررسی دقت دماها
این اسکریپت یک فایل CSV حرارتی را می‌خواند و آمار آن را نمایش می‌دهد
"""
import sys
import csv
from pathlib import Path

def analyze_thermal_csv(csv_path):
    """تحلیل فایل CSV حرارتی و نمایش آمار"""
    
    if not Path(csv_path).exists():
        print(f"❌ فایل یافت نشد: {csv_path}")
        return
    
    print(f"📄 در حال تحلیل: {csv_path}\n")
    
    temperatures = []
    
    with open(csv_path, 'r', encoding='utf-8') as f:
        # Skip header lines (start with #)
        lines = [line for line in f if not line.strip().startswith('#')]
        
        reader = csv.DictReader(lines)
        
        for row in reader:
            try:
                temp = float(row['Temperature'])
                if temp != float('nan'):
                    temperatures.append(temp)
            except (ValueError, KeyError):
                continue
    
    if not temperatures:
        print("❌ هیچ داده دمایی معتبر یافت نشد!")
        return
    
    # محاسبه آمار
    min_temp = min(temperatures)
    max_temp = max(temperatures)
    avg_temp = sum(temperatures) / len(temperatures)
    
    # پیدا کردن دماهای غیرمعمول
    suspicious = [t for t in temperatures if t < -50 or t > 200]
    
    print("📊 آمار دمایی:")
    print(f"  🔵 حداقل: {min_temp:.2f}°C")
    print(f"  🔴 حداکثر: {max_temp:.2f}°C")
    print(f"  📈 میانگین: {avg_temp:.2f}°C")
    print(f"  📉 تعداد نقاط: {len(temperatures):,}")
    print(f"  ⚠️  دماهای مشکوک: {len(suspicious)}")
    
    if suspicious:
        print(f"\n⚠️  نمونه دماهای غیرعادی:")
        for temp in suspicious[:10]:
            print(f"    {temp:.2f}°C")
    
    # بررسی محدوده معقول
    if min_temp < -273.15:
        print(f"\n❌ خطا: دمای حداقل زیر صفر مطلق است! ({min_temp}°C)")
    elif min_temp < -50:
        print(f"\n⚠️  هشدار: دمای حداقل بسیار پایین است ({min_temp}°C)")
    
    if max_temp > 1000:
        print(f"\n❌ خطا: دمای حداکثر غیرمعمول است! ({max_temp}°C)")
    elif max_temp > 200:
        print(f"\n⚠️  هشدار: دمای حداکثر بالا است ({max_temp}°C)")
    
    # تبدیل به فارنهایت
    min_f = min_temp * 9/5 + 32
    max_f = max_temp * 9/5 + 32
    avg_f = avg_temp * 9/5 + 32
    
    print(f"\n🌡️  معادل فارنهایت:")
    print(f"  حداقل: {min_f:.2f}°F")
    print(f"  حداکثر: {max_f:.2f}°F")
    print(f"  میانگین: {avg_f:.2f}°F")
    
    print("\n✅ تحلیل کامل شد!")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("❌ استفاده:")
        print("  python test_temperature.py <path_to_csv_file>")
        print("\nمثال:")
        print('  python test_temperature.py "server\\extracted_images\\thermal_001_temperature.csv"')
        sys.exit(1)
    
    csv_path = sys.argv[1]
    analyze_thermal_csv(csv_path)
