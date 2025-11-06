'use client';

import { useMemo, useState } from 'react';
import { useAppStore } from '@/lib/store';
import { translations } from '@/lib/translations';
import { COLOR_PALETTES, interpolateColor } from '@/lib/thermal-utils';
import Window from './Window';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { RotateCcw, ChevronDown, ChevronUp } from 'lucide-react';
import TemperatureScale from './TemperatureScale';

export default function Histogram() {
  const {
    language,
    images,
    activeImageId,
    currentPalette,
    customMinTemp,
    customMaxTemp,
    setTemperatureRange
  } = useAppStore();

  const t = translations[language];
  const activeImage = images.find(img => img.id === activeImageId);
  const palette = COLOR_PALETTES[currentPalette];
  
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [tempInputMin, setTempInputMin] = useState<string>('');
  const [tempInputMax, setTempInputMax] = useState<string>('');

  // محاسبه داده‌های هیستوگرام
  const histogramData = useMemo(() => {
    if (!activeImage?.thermalData) return null;

    const { temperatureMatrix, minTemp, maxTemp } = activeImage.thermalData;
    const effectiveMin = customMinTemp ?? minTemp;
    const effectiveMax = customMaxTemp ?? maxTemp;
    const bins = 50;
    const binSize = (effectiveMax - effectiveMin) / bins;
    
    const histogram = new Array(bins).fill(0);
    let totalPixels = 0;
    let sum = 0;
    let min = Infinity;
    let max = -Infinity;

    // محاسبه هیستوگرام و آمار
    for (const row of temperatureMatrix) {
      for (const temp of row) {
        totalPixels++;
        sum += temp;
        min = Math.min(min, temp);
        max = Math.max(max, temp);
        
        const binIndex = Math.floor((temp - effectiveMin) / binSize);
        const clampedIndex = Math.max(0, Math.min(bins - 1, binIndex));
        histogram[clampedIndex]++;
      }
    }

    const mean = sum / totalPixels;
    
    // محاسبه انحراف معیار
    const variance = temperatureMatrix.flat()
      .reduce((acc, temp) => acc + Math.pow(temp - mean, 2), 0) / totalPixels;
    const stdDev = Math.sqrt(variance);

    // محاسبه مدیان
    const sortedTemps = temperatureMatrix.flat().sort((a, b) => a - b);
    const median = totalPixels % 2 === 0
      ? (sortedTemps[totalPixels / 2 - 1] + sortedTemps[totalPixels / 2]) / 2
      : sortedTemps[Math.floor(totalPixels / 2)];

    // تبدیل به داده‌های نمودار با رنگ‌بندی
    const data = histogram.map((count, index) => {
      const temp = effectiveMin + (index + 0.5) * binSize;
      const color = palette ? interpolateColor(temp, effectiveMin, effectiveMax, palette) : '#3b82f6';
      return {
        temperature: temp.toFixed(1),
        count,
        fill: color,
        temp: temp // برای tooltip
      };
    });

    return {
      data,
      stats: {
        mean: mean.toFixed(2),
        median: median.toFixed(2),
        stdDev: stdDev.toFixed(2),
        min: min.toFixed(2),
        max: max.toFixed(2),
        range: (max - min).toFixed(2),
        totalPixels,
        effectiveMin: effectiveMin.toFixed(2),
        effectiveMax: effectiveMax.toFixed(2)
      }
    };
  }, [activeImage, customMinTemp, customMaxTemp, palette]);

  // هندلر تغییر محدوده دما با Slider
  const handleSliderChange = (values: number[]) => {
    if (!activeImage?.thermalData) return;
    const [min, max] = values;
    setTemperatureRange(min, max);
    setTempInputMin(min.toFixed(1));
    setTempInputMax(max.toFixed(1));
  };

  // هندلر تغییر محدوده دما با Input
  const handleInputChange = () => {
    const min = parseFloat(tempInputMin);
    const max = parseFloat(tempInputMax);
    
    if (!isNaN(min) && !isNaN(max) && min < max) {
      setTemperatureRange(min, max);
    }
  };

  // ریست به محدوده پیش‌فرض
  const handleReset = () => {
    if (!activeImage?.thermalData) return;
    setTemperatureRange(null, null);
    setTempInputMin('');
    setTempInputMax('');
  };

  // تنظیم مقادیر اولیه input
  useMemo(() => {
    if (activeImage?.thermalData) {
      setTempInputMin((customMinTemp ?? activeImage.thermalData.minTemp).toFixed(1));
      setTempInputMax((customMaxTemp ?? activeImage.thermalData.maxTemp).toFixed(1));
    }
  }, [activeImage, customMinTemp, customMaxTemp]);

  // Custom Tooltip برای نمودار
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-gray-800 border border-gray-600 rounded p-2 shadow-lg">
          <p className="text-xs text-gray-300">
            <strong>دما:</strong> {data.temp.toFixed(2)}°C
          </p>
          <p className="text-xs text-gray-300">
            <strong>تعداد پیکسل:</strong> {data.count}
          </p>
          <p className="text-xs text-gray-300">
            <strong>درصد:</strong> {((data.count / (histogramData?.stats.totalPixels || 1)) * 100).toFixed(2)}%
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Window id="histogram" title={t.histogram} minWidth={400} minHeight={350}>
      <div className="flex flex-col h-full">
        {activeImage?.thermalData ? (
          <>
            {/* Histogram Chart */}
            <div className="flex-1 min-h-0 p-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={histogramData?.data || []}>
                  <XAxis 
                    dataKey="temperature" 
                    tick={{ fontSize: 10, fill: '#9ca3af' }}
                    interval="preserveStartEnd"
                    label={{ 
                      value: 'دما (°C)', 
                      position: 'insideBottom', 
                      offset: -5,
                      style: { fontSize: 12, fill: '#9ca3af' }
                    }}
                  />
                  <YAxis 
                    tick={{ fontSize: 10, fill: '#9ca3af' }}
                    width={50}
                    label={{ 
                      value: 'تعداد', 
                      angle: -90, 
                      position: 'insideLeft',
                      style: { fontSize: 12, fill: '#9ca3af' }
                    }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" stroke="none">
                    {histogramData?.data.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Temperature Range Control */}
            <div className="border-t border-gray-600 p-3 space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">محدوده دمایی</Label>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="h-7 px-2"
                  >
                    {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    <span className="text-xs ml-1">پیشرفته</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleReset}
                    className="h-7 px-2"
                  >
                    <RotateCcw className="w-3 h-3 mr-1" />
                    <span className="text-xs">ریست</span>
                  </Button>
                </div>
              </div>

              {/* Dual Range Slider */}
              {activeImage.thermalData && (
                <div className="space-y-2">
                  <Slider
                    min={activeImage.thermalData.minTemp}
                    max={activeImage.thermalData.maxTemp}
                    step={0.1}
                    value={[
                      customMinTemp ?? activeImage.thermalData.minTemp,
                      customMaxTemp ?? activeImage.thermalData.maxTemp
                    ]}
                    onValueChange={handleSliderChange}
                    className="w-full"
                  />
                  
                  <div className="flex items-center justify-between text-xs text-gray-400">
                    <span>{tempInputMin}°C</span>
                    <span>{tempInputMax}°C</span>
                  </div>
                </div>
              )}

              {/* Advanced Controls */}
              {showAdvanced && (
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-700">
                  <div className="space-y-1">
                    <Label className="text-xs">حداقل (°C)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={tempInputMin}
                      onChange={(e) => setTempInputMin(e.target.value)}
                      onBlur={handleInputChange}
                      className="h-7 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">حداکثر (°C)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={tempInputMax}
                      onChange={(e) => setTempInputMax(e.target.value)}
                      onBlur={handleInputChange}
                      className="h-7 text-xs"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Statistics */}
            <div className="border-t border-gray-600 p-3">
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-400">میانگین:</span>
                  <span className="font-mono">{histogramData?.stats.mean}°C</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">میانه:</span>
                  <span className="font-mono">{histogramData?.stats.median}°C</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">انحراف معیار:</span>
                  <span className="font-mono">{histogramData?.stats.stdDev}°C</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">محدوده:</span>
                  <span className="font-mono">{histogramData?.stats.range}°C</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">حداقل:</span>
                  <span className="font-mono text-blue-400">{histogramData?.stats.min}°C</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">حداکثر:</span>
                  <span className="font-mono text-red-400">{histogramData?.stats.max}°C</span>
                </div>
              </div>
            </div>

            {/* Color Scale */}
            <div className="border-t border-gray-600 p-3">
              <Label className="text-xs text-gray-400 mb-2 block">مقیاس رنگی</Label>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-6 rounded border border-gray-600" style={{
                  background: `linear-gradient(to right, ${palette?.colors.join(', ')})`
                }} />
                <TemperatureScale
                  minTemp={parseFloat(histogramData?.stats.effectiveMin || '0')}
                  maxTemp={parseFloat(histogramData?.stats.effectiveMax || '100')}
                  className="h-24"
                />
              </div>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400">
            <div className="text-center">
              <BarChart className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>بدون داده حرارتی</p>
              <p className="text-sm">برای مشاهده هیستوگرام یک تصویر بارگذاری کنید</p>
            </div>
          </div>
        )}
      </div>
    </Window>
  );
}