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
        static void Main(string[] args)
        {
            Console.OutputEncoding = System.Text.Encoding.UTF8;

            string filePath = args.Length > 0 ? args[0] : null;
            if (string.IsNullOrWhiteSpace(filePath) || !File.Exists(filePath))
            {
                Console.WriteLine("{\"error\": \"File not found\"}");
                return;
            }

            try
            {
                ThermalImageApi thermalImage = new ThermalImageApi();
                thermalImage.Open(filePath);

                string baseDir = Path.GetDirectoryName(filePath);
                string baseName = Path.GetFileNameWithoutExtension(filePath);

                // تصاویر
                string thermalPath = Path.Combine(baseDir, baseName + "_thermal.png");
                string visualPath = Path.Combine(baseDir, baseName + "_visual.png");
                string csvPath = Path.Combine(baseDir, baseName + "_temperature.csv");

                Bitmap thermalBmp = thermalImage.GetThermalImage(Unit.TempDiff);
                thermalBmp.Save(thermalPath);

                Bitmap visualBmp = thermalImage.GetVisualImage();
                if (visualBmp != null)
                    visualBmp.Save(visualPath);

                int width = thermalImage.Width;
                int height = thermalImage.Height;
                double[,] tempData = new double[height, width];

                using (StreamWriter sw = new StreamWriter(csvPath))
                {
                    for (int y = 0; y < height; y++)
                    {
                        for (int x = 0; x < width; x++)
                        {
                            double t = thermalImage.GetTemperature(x, y);
                            tempData[y, x] = t;
                            sw.Write(t.ToString("F2"));
                            if (x < width - 1) sw.Write(",");
                        }
                        sw.WriteLine();
                    }
                }

                thermalImage.Dispose();

                // آمار
                double min = double.MaxValue, max = double.MinValue, sum = 0;
                foreach (var t in tempData)
                {
                    if (t < min) min = t;
                    if (t > max) max = t;
                    sum += t;
                }

                double avg = sum / (width * height);

                var result = new
                {
                    device = thermalImage.DeviceName,
                    serial = thermalImage.SerialNumber,
                    captured_at = thermalImage.CreationDateTime.ToString(),
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
            }
            catch (Exception ex)
            {
                Console.WriteLine(JsonSerializer.Serialize(new { error = ex.Message }));
            }
        }
    }
}
