using System;
using System.Drawing;
using System.IO;
using System.Text.Json;
using System.Collections.Generic;
using System.Linq;
using Testo.IRSoft.API.Image;
using Testo.Library.Measurement;
using Testo.IRSoft.Image;

namespace BmtExtractor
{
    internal class Program
    {
        // تعریف پالت‌های رنگی بر اساس داکیومنت IrApi
        static Dictionary<string, Palette> TestoPalettes = new Dictionary<string, Palette>
        {
            { "iron", Palette.IronBow },
            { "rainbow", Palette.RainBow },
            { "grayscale", Palette.GreyScale },
            { "grayscale_inv", Palette.GreyScaleInv },
            { "sepia", Palette.Sepia },
            { "bluered", Palette.BlueRed },
            { "hotcold", Palette.HotCold },
            { "testo", Palette.Testo },
            { "dewpoint", Palette.DewPoint },
            { "hochtemp", Palette.Hochtemp },
            { "rainbowhc", Palette.RainbowHC }
        };

        static void Main(string[] args)
        {
            Console.OutputEncoding = System.Text.Encoding.UTF8;

            string defaultPath = @"C:\Users\Public\Documents\Testo\IRSoft\Examples\example12.bmt";
            string filePath = null;

            if (args.Length > 0 && File.Exists(args[0]))
            {
                filePath = args[0];
                Console.WriteLine($"📂 Using input file: {filePath}");
            }
            else
            {
                filePath = defaultPath;
                Console.WriteLine($"⚠️ No valid input provided. Using default test file: {filePath}");
            }

            if (!File.Exists(filePath))
            {
                Console.WriteLine("{\"error\": \"File not found\"}");
                return;
            }

            bool useFahrenheit = Array.Exists(args, a => a.Equals("--fahrenheit", StringComparison.OrdinalIgnoreCase));
            bool skipImages = Array.Exists(args, a => a.Equals("--skip-images", StringComparison.OrdinalIgnoreCase));

            ThermalImageApi image = null;
            try
            {
                image = new ThermalImageApi();
                image.Open(filePath);

                string baseDir = Path.GetDirectoryName(filePath);
                string baseName = Path.GetFileNameWithoutExtension(filePath);

                // فولدر خروجی به نام فایل اصلی
                string outputFolder = Path.Combine(baseDir, baseName);
                Directory.CreateDirectory(outputFolder);

                string csvPath = Path.Combine(outputFolder, baseName + "_temperature.csv");
                string jsonPath = Path.Combine(outputFolder, baseName + "_output.json");

                // استخراج تمام اطلاعات از فایل BMT
                Console.WriteLine("📡 Extracting BMT file data...");
                var bmtData = ExtractAllBmtData(image, useFahrenheit, filePath, outputFolder, baseName);

                // ذخیره داده‌های دما در CSV
                Console.WriteLine("💾 Saving temperature data to CSV...");
                SaveTemperatureDataToCsv(image, bmtData, csvPath, useFahrenheit);
                bmtData.CsvPath = csvPath;

                // تولید تصاویر (اختیاری)
                if (!skipImages)
                {
                    GeneratePaletteImages(image, bmtData, useFahrenheit);
                }
                else
                {
                    Console.WriteLine("⏭️ Skipping image generation as requested");
                }

                // JSON خروجی
                Console.WriteLine("📄 Generating JSON output...");
                string json = JsonSerializer.Serialize(bmtData, new JsonSerializerOptions { WriteIndented = true });
                File.WriteAllText(jsonPath, json);

                Console.WriteLine($"\n✅ All output saved in folder: {outputFolder}");
                Console.WriteLine($"📊 Statistics: Min={bmtData.TemperatureStats.Min:F2}, Max={bmtData.TemperatureStats.Max:F2}, Avg={bmtData.TemperatureStats.Average:F2}");
                Console.WriteLine($"📸 Generated {bmtData.Images.Count} images");

                // پاکسازی حافظه
                image.Dispose();
                image = null;
                GC.Collect();
            }
            catch (Exception ex)
            {
                Console.WriteLine(JsonSerializer.Serialize(new
                {
                    error = ex.Message,
                    stack = ex.StackTrace
                }));
            }
            finally
            {
                image?.Dispose();
            }
        }

        static BmtFileData ExtractAllBmtData(ThermalImageApi image, bool useFahrenheit, string filePath, string outputFolder, string baseName)
        {
            var data = new BmtFileData();

            try
            {
                // اطلاعات اصلی فایل
                data.FileInfo = new FileInformation
                {
                    FilePath = filePath,
                    FileName = Path.GetFileName(filePath),
                    FileSize = new FileInfo(filePath).Length,
                    OutputFolder = outputFolder
                };

                // اطلاعات دستگاه
                data.DeviceInfo = new DeviceInformation
                {
                    DeviceName = image.DeviceName ?? "Unknown",
                    SerialNumber = image.SerialNumber,
                    FieldOfView = image.FoV
                };

                // اطلاعات تصویر
                data.ImageInfo = new ImageInformation
                {
                    Width = image.Width,
                    Height = image.Height,
                    CreationDateTime = image.CreationDateTime,
                    OriginalPalette = image.Palette.ToString()
                };

                // اطلاعات دما و اندازه‌گیری
                data.MeasurementInfo = new MeasurementInformation
                {
                    Emissivity = image.Emissivity,
                    ReflectedTemperature = image.ReflectedTemperature,
                    Humidity = image.Humidity,
                    TemperatureUnit = useFahrenheit ? "°F" : "°C"
                };

                // محدوده اندازه‌گیری
                float minRange = 0, maxRange = 0;
                image.GetMeasurementRange(ref minRange, ref maxRange);
                data.MeasurementInfo.MeasurementRangeMin = minRange;
                data.MeasurementInfo.MeasurementRangeMax = maxRange;

                // تنظیمات مقیاس
                data.ScaleSettings = new ScaleSettings
                {
                    MinScaleTemperature = image.MinScaleTemperature,
                    MaxScaleTemperature = image.MaxScaleTemperature
                };

                // تنظیمات هایلایت
                data.HighlightSettings = new HighlightSettings
                {
                    UseLimits = image.UseLimits,
                    UseIsotherm = image.UseIsotherm,
                    LowerIsothermTemperature = image.LowerIsoTemperature,
                    UpperIsothermTemperature = image.UpperIsoTemperature,
                    LowerLimitTemperature = image.LowerLimitTemperature,
                    UpperLimitTemperature = image.UpperLimitTemperature
                };

                // استخراج آمار دمایی
                ExtractTemperatureStats(image, data, useFahrenheit);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"⚠️ Error extracting BMT data: {ex.Message}");
                throw;
            }

            return data;
        }

        static void ExtractTemperatureStats(ThermalImageApi image, BmtFileData data, bool useFahrenheit)
        {
            int width = data.ImageInfo.Width;
            int height = data.ImageInfo.Height;

            // برای تصاویر بسیار بزرگ، نمونه‌گیری انجام می‌دهیم
            bool useSampling = (width * height) > 1000000; // اگر بیش از 1M پیکسل
            int samplingStep = useSampling ? 4 : 1;

            double min = double.MaxValue, max = double.MinValue, sum = 0;
            int count = 0;

            Console.WriteLine($"📊 Analyzing temperature data ({(useSampling ? "sampling mode" : "full analysis")})...");

            var samplePoints = new List<TemperaturePoint>();
            int totalPixels = width * height;
            int processedPixels = 0;

            for (int y = 0; y < height; y += samplingStep)
            {
                for (int x = 0; x < width; x += samplingStep)
                {
                    double t = image.GetTemperature(x, y);
                    if (useFahrenheit) t = t * 9 / 5 + 32;

                    if (t < min) min = t;
                    if (t > max) max = t;
                    sum += t;
                    count++;
                    processedPixels++;

                    // ذخیره چند نقطه نمونه
                    if (samplePoints.Count < 20 && (x % (width / 4) == 0) && (y % (height / 4) == 0))
                    {
                        samplePoints.Add(new TemperaturePoint { X = x, Y = y, Temperature = t });
                    }
                }

                // نمایش پیشرفت
                if (y % 10 == 0)
                {
                    double progress = (double)processedPixels / totalPixels * 100;
                    Console.Write($"\r📈 Progress: {progress:F1}%");
                }
            }

            Console.WriteLine("\n✅ Temperature analysis completed.");

            data.TemperatureStats = new TemperatureStatistics
            {
                Min = min,
                Max = max,
                Average = count > 0 ? sum / count : 0,
                PointCount = totalPixels,
                SamplePoints = samplePoints,
                AnalysisMode = useSampling ? "sampled" : "full"
            };
        }

        static void SaveTemperatureDataToCsv(ThermalImageApi image, BmtFileData data, string csvPath, bool useFahrenheit)
        {
            int width = data.ImageInfo.Width;
            int height = data.ImageInfo.Height;

            // برای فایل‌های بسیار بزرگ، CSV با دقت کمتر ایجاد می‌کنیم
            bool reduceResolution = (width * height) > 500000;
            int step = reduceResolution ? 2 : 1;

            if (reduceResolution)
            {
                Console.WriteLine("⚠️ Large image detected, reducing CSV resolution for performance");
            }

            using (StreamWriter sw = new StreamWriter(csvPath))
            {
                // هدر ساده‌تر
                sw.WriteLine("# Temperature Data Export");
                sw.WriteLine($"# Device: {data.DeviceInfo.DeviceName}");
                sw.WriteLine($"# Size: {width}x{height}");
                sw.WriteLine($"# Unit: {(useFahrenheit ? "°F" : "°C")}");
                sw.WriteLine($"# Timestamp: {DateTime.Now:yyyy-MM-dd HH:mm:ss}");
                sw.WriteLine("Y,X,Temperature");

                int totalPixels = (width / step) * (height / step);
                int processedPixels = 0;

                for (int y = 0; y < height; y += step)
                {
                    for (int x = 0; x < width; x += step)
                    {
                        double t = image.GetTemperature(x, y);
                        if (useFahrenheit) t = t * 9 / 5 + 32;

                        sw.WriteLine($"{y},{x},{t:F2}");
                        processedPixels++;

                        // نمایش پیشرفت
                        if (processedPixels % 10000 == 0)
                        {
                            double progress = (double)processedPixels / totalPixels * 100;
                            Console.Write($"\r💾 CSV Progress: {progress:F1}%");
                        }
                    }
                }

                sw.WriteLine($"\n# Statistics: Min={data.TemperatureStats.Min:F2}, Max={data.TemperatureStats.Max:F2}, Avg={data.TemperatureStats.Average:F2}");
                if (reduceResolution)
                {
                    sw.WriteLine($"# Note: CSV resolution reduced by factor of {step} for performance");
                }
            }

            Console.WriteLine("\n✅ CSV file saved.");
        }

        static void GeneratePaletteImages(ThermalImageApi image, BmtFileData data, bool useFahrenheit)
        {
            Console.WriteLine("🎨 Generating palette images...");

            // فقط پالت‌های اصلی را تولید می‌کنیم
            var essentialPalettes = new Dictionary<string, Palette>
            {
                { "iron", Palette.IronBow },
                { "rainbow", Palette.RainBow },
                { "grayscale", Palette.GreyScale },
                { "hotcold", Palette.HotCold }
            };

            Palette originalPalette = image.Palette;

            foreach (var kv in essentialPalettes)
            {
                string palName = kv.Key;
                try
                {
                    image.Palette = kv.Value;

                    using (Bitmap thermalBmp = image.GetThermalImage(useFahrenheit ? Unit.GradF : Unit.GradC))
                    {
                        string thermalPath = Path.Combine(data.FileInfo.OutputFolder,
                            $"{Path.GetFileNameWithoutExtension(data.FileInfo.FileName)}_thermal_{palName}.png");
                        thermalBmp.Save(thermalPath);
                        data.Images[palName] = thermalPath;
                    }

                    Console.WriteLine($"✅ Generated: {palName}");

                    // آزادسازی حافظه
                    GC.Collect();
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"⚠️ Failed to generate {palName}: {ex.Message}");
                }
            }

            // بازگردانی پالت اصلی
            image.Palette = originalPalette;

            // تصویر Visual (اگر موجود باشد)
            try
            {
                using (Bitmap visual = image.GetVisualImage())
                {
                    if (visual != null)
                    {
                        string visualPath = Path.Combine(data.FileInfo.OutputFolder,
                            Path.GetFileNameWithoutExtension(data.FileInfo.FileName) + "_visual.png");
                        visual.Save(visualPath);
                        data.Images["visual"] = visualPath;
                        Console.WriteLine("✅ Generated: visual image");
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"⚠️ Failed to get visual image: {ex.Message}");
            }
        }
    }

    // کلاس‌های مدل (بدون تغییر)
    public class BmtFileData
    {
        public FileInformation FileInfo { get; set; } = new FileInformation();
        public DeviceInformation DeviceInfo { get; set; } = new DeviceInformation();
        public ImageInformation ImageInfo { get; set; } = new ImageInformation();
        public MeasurementInformation MeasurementInfo { get; set; } = new MeasurementInformation();
        public ScaleSettings ScaleSettings { get; set; } = new ScaleSettings();
        public HighlightSettings HighlightSettings { get; set; } = new HighlightSettings();
        public TemperatureStatistics TemperatureStats { get; set; } = new TemperatureStatistics();
        public Dictionary<string, string> Images { get; set; } = new Dictionary<string, string>();
        public string CsvPath { get; set; }
    }

    public class FileInformation
    {
        public string FilePath { get; set; }
        public string FileName { get; set; }
        public long FileSize { get; set; }
        public string OutputFolder { get; set; }
    }

    public class DeviceInformation
    {
        public string DeviceName { get; set; }
        public uint SerialNumber { get; set; }
        public int FieldOfView { get; set; }
    }

    public class ImageInformation
    {
        public int Width { get; set; }
        public int Height { get; set; }
        public DateTime CreationDateTime { get; set; }
        public string OriginalPalette { get; set; }
    }

    public class MeasurementInformation
    {
        public double Emissivity { get; set; }
        public double ReflectedTemperature { get; set; }
        public double Humidity { get; set; }
        public string TemperatureUnit { get; set; }
        public float MeasurementRangeMin { get; set; }
        public float MeasurementRangeMax { get; set; }
    }

    public class ScaleSettings
    {
        public float MinScaleTemperature { get; set; }
        public float MaxScaleTemperature { get; set; }
    }

    public class HighlightSettings
    {
        public bool UseLimits { get; set; }
        public bool UseIsotherm { get; set; }
        public float LowerIsothermTemperature { get; set; }
        public float UpperIsothermTemperature { get; set; }
        public float LowerLimitTemperature { get; set; }
        public float UpperLimitTemperature { get; set; }
    }

    public class TemperatureStatistics
    {
        public double Min { get; set; }
        public double Max { get; set; }
        public double Average { get; set; }
        public int PointCount { get; set; }
        public List<TemperaturePoint> SamplePoints { get; set; } = new List<TemperaturePoint>();
        public string AnalysisMode { get; set; } = "full";
    }

    public class TemperaturePoint
    {
        public int X { get; set; }
        public int Y { get; set; }
        public double Temperature { get; set; }
    }
}