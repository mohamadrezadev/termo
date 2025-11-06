'use client';

import { useAppStore } from '@/lib/store';
import { COLOR_PALETTES } from '@/lib/thermal-utils';

interface TemperatureScaleProps {
  minTemp: number;
  maxTemp: number;
  className?: string;
}

export default function TemperatureScale({ minTemp, maxTemp, className = '' }: TemperatureScaleProps) {
  const { currentPalette } = useAppStore();
  const palette = COLOR_PALETTES[currentPalette];

  if (!palette) return null;

  // ایجاد gradient از پالت رنگی
  const gradient = `linear-gradient(to top, ${palette.colors.join(', ')})`;
  
  // محاسبه تعداد تیک‌ها (حداکثر 10 تیک)
  const tempRange = maxTemp - minTemp;
  const numTicks = Math.min(10, Math.max(5, Math.ceil(tempRange / 10)));
  const tickStep = tempRange / (numTicks - 1);
  
  const ticks = Array.from({ length: numTicks }, (_, i) => {
    const temp = minTemp + (i * tickStep);
    return {
      position: (i / (numTicks - 1)) * 100,
      value: temp
    };
  });

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Scale bar */}
      <div className="relative w-8 h-full min-h-[200px]">
        {/* Gradient background */}
        <div 
          className="absolute inset-0 rounded"
          style={{ background: gradient }}
        />
        
        {/* Border */}
        <div className="absolute inset-0 border border-gray-600 rounded pointer-events-none" />
      </div>

      {/* Ticks and labels */}
      <div className="relative h-full min-h-[200px] flex flex-col justify-between">
        {ticks.slice().reverse().map((tick, index) => (
          <div 
            key={index} 
            className="flex items-center gap-1"
          >
            <div className="w-2 h-px bg-gray-400" />
            <span className="text-xs text-gray-300 font-mono">
              {tick.value.toFixed(1)}°C
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}