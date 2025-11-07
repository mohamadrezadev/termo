using System;
using System.Drawing;
using System.IO;
using Testo.IRSoft.API.Image;
using Testo.Library.Measurement;
using System.Text.Json;
using System.Collections.Generic;

namespace ConsoleApp1
{
    internal class Program
    {
        // تعریف پالت‌های رنگی
        static Dictionary<string, Color[]> ColorPalettes = new Dictionary<string, Color[]>
        {
            { "iron", GenerateIronPalette() },
            { "rainbow", GenerateRainbowPalette() },
            { "grayscale", GenerateGrayscalePalette() },
            { "hot", GenerateHotPalette() },
            { "cold", GenerateColdPalette() },
            { "medical", GenerateMedicalPalette() },
            { "sepia", GenerateSepiaPalette() },
            { "arctic", GenerateArcticPalette() },
            { "lava", GenerateLavaPalette() }
        };

        static void Main(string[] args)
        {
            Console.OutputEncoding = System.Text.Encoding.UTF8;

            string filePath = args.Length > 0 ? args[0] : null;
            string palette = args.Length > 1 ? args[1] : "iron"; // Default palette

            if (string.IsNullOrWhiteSpace(filePath) || !File.Exists(filePath))
            {
                Console.WriteLine("{\"error\": \"File not found\"}");
                return;
            }

            try
            {
                ThermalImageApi thermalImage = new ThermalImageApi();

                // تلاش برای باز کردن فایل
                try
                {
                    thermalImage.Open(filePath);
                }
                catch (Exception openEx)
                {
                    Console.WriteLine(JsonSerializer.Serialize(new { error = $"Failed to open file: {openEx.Message}" }));
                    return;
                }

                string baseDir = Path.GetDirectoryName(filePath);
                string baseName = Path.GetFileNameWithoutExtension(filePath);

                // تصاویر
                string thermalPath = Path.Combine(baseDir, baseName + "_thermal.png");
                string visualPath = Path.Combine(baseDir, baseName + "_visual.png");
                string csvPath = Path.Combine(baseDir, baseName + "_temperature.csv");

                // دریافت تصویر حرارتی
                Bitmap thermalBmp = null;
                try
                {
                    thermalBmp = thermalImage.GetThermalImage(Unit.TempDiff);
                    thermalBmp.Save(thermalPath);
                }
                catch (Exception thermalEx)
                {
                    Console.WriteLine(JsonSerializer.Serialize(new { error = $"Failed to get thermal image: {thermalEx.Message}" }));
                    return;
                }

                // دریافت تصویر واقعی
                Bitmap visualBmp = null;
                try
                {
                    visualBmp = thermalImage.GetVisualImage();
                    if (visualBmp != null)
                        visualBmp.Save(visualPath);
                }
                catch (Exception visualEx)
                {
                    // Visual image is optional, just log but continue
                    Console.Error.WriteLine($"Warning: Failed to get visual image: {visualEx.Message}");
                }

                int width = thermalImage.Width;
                int height = thermalImage.Height;
                double[,] tempData = new double[height, width];

                // دریافت داده‌های دما
                try
                {
                    using (StreamWriter sw = new StreamWriter(csvPath))
                    {
                        for (int y = 0; y < height; y++)
                        {
                            for (int x = 0; x < width; x++)
                            {
                                double t = thermalImage.GetTemperature(x, y);

                                // بررسی مقدار معتبر
                                if (double.IsNaN(t) || double.IsInfinity(t))
                                {
                                    Console.WriteLine(JsonSerializer.Serialize(new {
                                        error = $"Invalid temperature value at ({x}, {y}): {t}"
                                    }));
                                    return;
                                }

                                tempData[y, x] = t;
                                sw.Write(t.ToString("F2"));
                                if (x < width - 1) sw.Write(",");
                            }
                            sw.WriteLine();
                        }
                    }
                }
                catch (Exception csvEx)
                {
                    Console.WriteLine(JsonSerializer.Serialize(new { error = $"Failed to write CSV: {csvEx.Message}" }));
                    return;
                }

                // آمار
                double min = double.MaxValue, max = double.MinValue, sum = 0;
                int validCount = 0;

                foreach (var t in tempData)
                {
                    if (!double.IsNaN(t) && !double.IsInfinity(t))
                    {
                        if (t < min) min = t;
                        if (t > max) max = t;
                        sum += t;
                        validCount++;
                    }
                }

                double avg = validCount > 0 ? sum / validCount : 0;

                // اعمال پالت رنگی انتخابی به تصویر حرارتی
                try
                {
                    thermalBmp?.Dispose(); // آزاد کردن تصویر قبلی
                    thermalBmp = ApplyColorPalette(tempData, width, height, min, max, palette);
                    thermalBmp.Save(thermalPath);
                }
                catch (Exception paletteEx)
                {
                    Console.WriteLine(JsonSerializer.Serialize(new { error = $"Failed to apply color palette: {paletteEx.Message}" }));
                    return;
                }

                var result = new
                {
                    device = thermalImage.DeviceName ?? "Unknown",
                    serial = thermalImage.SerialNumber ,
                    captured_at = thermalImage.CreationDateTime.ToString("yyyy-MM-ddTHH:mm:ss"),
                    emissivity = thermalImage.Emissivity,
                    reflected_temp = thermalImage.ReflectedTemperature,
                    stats = new { min, max, avg },
                    images = new
                    {
                        thermal = thermalPath,
                        visual = visualBmp != null ? visualPath : null
                    },
                    csv = csvPath
                };

                Console.WriteLine(JsonSerializer.Serialize(result));

                thermalImage.Dispose();
            }
            catch (Exception ex)
            {
                Console.WriteLine(JsonSerializer.Serialize(new {
                    error = ex.Message,
                    stackTrace = ex.StackTrace
                }));
            }
        }

        // تابع برای اعمال پالت رنگی به تصویر حرارتی
        static Bitmap ApplyColorPalette(double[,] tempData, int width, int height, double minTemp, double maxTemp, string paletteName)
        {
            Color[] palette = ColorPalettes.ContainsKey(paletteName) ? ColorPalettes[paletteName] : ColorPalettes["iron"];
            Bitmap result = new Bitmap(width, height);

            for (int y = 0; y < height; y++)
            {
                for (int x = 0; x < width; x++)
                {
                    double temp = tempData[y, x];
                    double normalized = (temp - minTemp) / (maxTemp - minTemp);
                    normalized = Math.Max(0, Math.Min(1, normalized)); // Clamp to [0, 1]

                    int colorIndex = (int)(normalized * (palette.Length - 1));
                    Color color = palette[colorIndex];
                    result.SetPixel(x, y, color);
                }
            }

            return result;
        }

        // پالت‌های رنگی
        static Color[] GenerateIronPalette()
        {
            Color[] palette = new Color[256];
            for (int i = 0; i < 256; i++)
            {
                double t = i / 255.0;
                int r = (int)(255 * Math.Min(1, Math.Max(0, 1.5 * t - 0.5)));
                int g = (int)(255 * Math.Min(1, Math.Max(0, 1.5 * t - 0.25)));
                int b = (int)(255 * Math.Min(1, Math.Max(0, 1.5 * t)));
                palette[i] = Color.FromArgb(r, g, b);
            }
            return palette;
        }

        static Color[] GenerateRainbowPalette()
        {
            Color[] palette = new Color[256];
            for (int i = 0; i < 256; i++)
            {
                double t = i / 255.0;
                double r = Math.Sin(Math.PI * t);
                double g = Math.Sin(Math.PI * (t + 0.33));
                double b = Math.Sin(Math.PI * (t + 0.66));
                palette[i] = Color.FromArgb((int)(r * 255), (int)(g * 255), (int)(b * 255));
            }
            return palette;
        }

        static Color[] GenerateGrayscalePalette()
        {
            Color[] palette = new Color[256];
            for (int i = 0; i < 256; i++)
            {
                palette[i] = Color.FromArgb(i, i, i);
            }
            return palette;
        }

        static Color[] GenerateHotPalette()
        {
            Color[] palette = new Color[256];
            for (int i = 0; i < 256; i++)
            {
                double t = i / 255.0;
                int r = (int)(255 * Math.Min(1, 3 * t));
                int g = (int)(255 * Math.Min(1, Math.Max(0, 3 * t - 1)));
                int b = (int)(255 * Math.Min(1, Math.Max(0, 3 * t - 2)));
                palette[i] = Color.FromArgb(r, g, b);
            }
            return palette;
        }

        static Color[] GenerateColdPalette()
        {
            Color[] palette = new Color[256];
            for (int i = 0; i < 256; i++)
            {
                double t = i / 255.0;
                int r = (int)(255 * Math.Min(1, Math.Max(0, 3 * t - 2)));
                int g = (int)(255 * Math.Min(1, Math.Max(0, 3 * t - 1)));
                int b = (int)(255 * Math.Min(1, 3 * t));
                palette[i] = Color.FromArgb(r, g, b);
            }
            return palette;
        }

        static Color[] GenerateMedicalPalette()
        {
            Color[] palette = new Color[256];
            for (int i = 0; i < 256; i++)
            {
                double t = i / 255.0;
                int r = (int)(255 * (0.2 + 0.8 * t));
                int g = (int)(255 * (0.4 + 0.6 * Math.Pow(t, 0.7)));
                int b = (int)(255 * (0.6 + 0.4 * Math.Pow(t, 1.3)));
                palette[i] = Color.FromArgb(r, g, b);
            }
            return palette;
        }

        static Color[] GenerateSepiaPalette()
        {
            Color[] palette = new Color[256];
            for (int i = 0; i < 256; i++)
            {
                double t = i / 255.0;
                int r = (int)(255 * Math.Min(1, 0.4 + 0.6 * t));
                int g = (int)(255 * Math.Min(1, 0.3 + 0.5 * t));
                int b = (int)(255 * Math.Min(1, 0.2 + 0.3 * t));
                palette[i] = Color.FromArgb(r, g, b);
            }
            return palette;
        }

        static Color[] GenerateArcticPalette()
        {
            Color[] palette = new Color[256];
            for (int i = 0; i < 256; i++)
            {
                double t = i / 255.0;
                int r = (int)(255 * (0.8 + 0.2 * t));
                int g = (int)(255 * (0.9 + 0.1 * t));
                int b = (int)(255 * Math.Min(1, 0.95 + 0.05 * t));
                palette[i] = Color.FromArgb(r, g, b);
            }
            return palette;
        }

        static Color[] GenerateLavaPalette()
        {
            Color[] palette = new Color[256];
            for (int i = 0; i < 256; i++)
            {
                double t = i / 255.0;
                int r = (int)(255 * Math.Min(1, 0.5 + 1.5 * t));
                int g = (int)(255 * Math.Min(1, Math.Max(0, 2 * t - 0.5)));
                int b = (int)(255 * Math.Max(0, Math.Min(1, 4 * t - 3)));
                palette[i] = Color.FromArgb(r, g, b);
            }
            return palette;
        }
    }
}
