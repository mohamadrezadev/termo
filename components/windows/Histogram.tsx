'use client';

import { useMemo } from 'react';
import { useAppStore } from '@/lib/store';
import { translations } from '@/lib/translations';
import { COLOR_PALETTES } from '@/lib/thermal-utils';
import Window from './Window';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from 'recharts';

export default function Histogram() {
  const {
    language,
    images,
    activeImageId,
    currentPalette,
    customMinTemp,
    customMaxTemp
  } = useAppStore();

  const t = translations[language];
  const activeImage = images.find(img => img.id === activeImageId);
  const palette = COLOR_PALETTES[currentPalette];

  const histogramData = useMemo(() => {
    if (!activeImage?.thermalData) {
      return {
        data: [] as { temperature: string; count: number; fill: string }[],
        stats: {
          mean: '0',
          stdDev: '0',
          min: '0',
          max: '0',
          totalPixels: 0
        }
      };
    }

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

    // Calculate histogram and statistics
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
    const variance = temperatureMatrix.flat()
      .reduce((acc, temp) => acc + Math.pow(temp - mean, 2), 0) / totalPixels;
    const stdDev = Math.sqrt(variance);

    // Convert to chart data with colors
    return {
      data: histogram.map((count, index) => {
        const temp = effectiveMin + (index + 0.5) * binSize;
        const color = palette ? interpolateColor(temp, effectiveMin, effectiveMax, palette) : '#3b82f6';
        return {
          temperature: temp.toFixed(1),
          count,
          fill: color
        };
      }),
      stats: {
        mean: mean.toFixed(1),
        stdDev: stdDev.toFixed(1),
        min: min.toFixed(1),
        max: max.toFixed(1),
        totalPixels
      }
    };
  }, [activeImage, customMinTemp, customMaxTemp, palette]);

  // Simple color interpolation function
  function interpolateColor(value: number, min: number, max: number, palette: any): string {
    if (max === min) return palette.colors[0];
    
    const normalized = Math.max(0, Math.min(1, (value - min) / (max - min)));
    const index = normalized * (palette.colors.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    
    if (lower === upper) return palette.colors[lower];
    
    return palette.colors[lower]; // Simplified for now
  }

  return (
    <Window id="histogram" title={t.histogram} minWidth={300} minHeight={250}>
      <div className="flex flex-col h-full p-4">
        {activeImage?.thermalData ? (
          <>
            {/* Statistics */}
            <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-400">Mean:</span>
                  <span>{histogramData.stats?.mean}°C</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Std Dev:</span>
                  <span>{histogramData.stats?.stdDev}°C</span>
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-400">Min:</span>
                  <span>{histogramData.stats?.min}°C</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Max:</span>
                  <span>{histogramData.stats?.max}°C</span>
                </div>
              </div>
            </div>

            {/* Histogram Chart */}
            <div className="flex-1 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={histogramData.data}>
                  <XAxis 
                    dataKey="temperature" 
                    tick={{ fontSize: 10, fill: '#9ca3af' }}
                    interval="preserveStartEnd"
                  />
                  <YAxis 
                    tick={{ fontSize: 10, fill: '#9ca3af' }}
                    width={40}
                  />
                  <Bar 
                    dataKey="count" 
                    stroke="none"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Color Scale */}
            <div className="mt-2">
              <div className="h-4 rounded" style={{
                background: `linear-gradient(to right, ${palette?.colors.join(', ')})`
              }} />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>{customMinTemp ?? activeImage.thermalData.minTemp.toFixed(1)}°C</span>
                <span>{customMaxTemp ?? activeImage.thermalData.maxTemp.toFixed(1)}°C</span>
              </div>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400">
            <div className="text-center">
              <BarChart className="w-12 h-12 mx-auto mb-2" />
              <p>No thermal data</p>
              <p className="text-sm">Load an image to view histogram</p>
            </div>
          </div>
        )}
      </div>
    </Window>
  );
}