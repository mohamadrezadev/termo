'use client';

import { useMemo } from 'react';
import { useAppStore } from '@/lib/store';
import { translations } from '@/lib/translations';
import { COLOR_PALETTES, interpolateColor, ColorPalette, formatTemperatureDual } from '@/lib/thermal-utils';
import Window from './Window';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell } from 'recharts';

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
        data: [],
        stats: {
          mean: 0,
          stdDev: 0,
          min: 0,
          max: 0,
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

    const mean = totalPixels > 0 ? sum / totalPixels : 0;
    const variance = temperatureMatrix.flat()
      .reduce((acc, temp) => acc + Math.pow(temp - mean, 2), 0) / (totalPixels || 1);
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
        min: min === Infinity ? '0.0' : min.toFixed(1),
        max: max === -Infinity ? '0.0' : max.toFixed(1),
        totalPixels
      }
    };
  }, [activeImage, customMinTemp, customMaxTemp, palette]);

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
                  <span>{formatTemperatureDual(histogramData.stats?.mean || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Std Dev:</span>
                  <span>{formatTemperatureDual(histogramData.stats?.stdDev || 0)}</span>
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-400">Min:</span>
                  <span>{formatTemperatureDual(histogramData.stats?.min || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Max:</span>
                  <span>{formatTemperatureDual(histogramData.stats?.max || 0)}</span>
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
                    interval={Math.max(0, Math.floor(histogramData.data.length / 10))}
                  />
                  <YAxis 
                    tick={{ fontSize: 10, fill: '#9ca3af' }}
                    width={40}
                  />
                  <Bar 
                    dataKey="count" 
                    stroke="none"
                  >
                    {histogramData.data?.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Color Scale */}
            <div className="mt-2">
              {palette ? (
                <div>
                  <div className="h-4 rounded" style={{
                    background: `linear-gradient(to right, ${palette.colors.map((c, i) => `${c} ${(i / (palette.colors.length - 1)) * 100}%`).join(', ')})`
                  }} />
                  <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>{formatTemperatureDual(customMinTemp ?? activeImage.thermalData.minTemp)}</span>
                    <span>{formatTemperatureDual(customMaxTemp ?? activeImage.thermalData.maxTemp)}</span>
                  </div>
                </div>
              ) : (
                <div className="h-4 bg-gradient-to-r from-blue-500 to-blue-600 rounded" />
              )}
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