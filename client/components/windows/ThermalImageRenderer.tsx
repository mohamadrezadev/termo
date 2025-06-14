'use client';

import { useRef, useEffect, useCallback } from 'react';
import { ThermalData, ColorPalette, renderThermalCanvas, getTemperatureAtPixel } from '@/lib/thermal-utils';

interface ThermalImageRendererProps {
  thermalData: ThermalData | null;
  colorPalette: ColorPalette;
  temperatureScale?: { min: number; max: number };
  onPixelHover?: (x: number, y: number, temperature: number | null) => void;
  onPixelClick?: (x: number, y: number, temperature: number | null) => void;
  canvasRef?: React.RefObject<HTMLCanvasElement>; // Allow parent to pass a ref
}

export default function ThermalImageRenderer({
  thermalData,
  colorPalette,
  temperatureScale,
  onPixelHover,
  onPixelClick,
  canvasRef: parentCanvasRef
}: ThermalImageRendererProps) {
  const localCanvasRef = useRef<HTMLCanvasElement>(null);
  const canvasRef = parentCanvasRef || localCanvasRef;

  console.log(`[THERMAL_RENDERER] Component received props: thermalData (Width=${thermalData?.width}, Height=${thermalData?.height}, MinT=${thermalData?.minTemp}, MaxT=${thermalData?.maxTemp}), Palette=${colorPalette?.name}, TempScale (Min=${temperatureScale?.min}, Max=${temperatureScale?.max})`);

  const drawThermalImage = useCallback(() => {
    console.log('[THERMAL_RENDERER] drawThermalImage called.');
    const canvas = canvasRef.current;
    if (!canvas) {
      console.error('[THERMAL_RENDERER] drawThermalImage: Canvas ref is not available.');
      return;
    }
    if (!thermalData) {
      console.log('[THERMAL_RENDERER] drawThermalImage: No thermalData, clearing canvas.');
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      } else {
        console.error('[THERMAL_RENDERER] drawThermalImage: Failed to get 2D context for clearing.');
      }
      return;
    }

    // Basic check for context before calling renderThermalCanvas, though renderThermalCanvas also checks.
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.error('[THERMAL_RENDERER] drawThermalImage: Failed to get 2D context before calling renderThermalCanvas.');
      return;
    }

    console.log('[THERMAL_RENDERER] drawThermalImage: Calling renderThermalCanvas...');
    renderThermalCanvas(
      canvas,
      thermalData,
      colorPalette,
      temperatureScale?.min,
      temperatureScale?.max
    );
    console.log('[THERMAL_RENDERER] drawThermalImage: renderThermalCanvas call completed.');
  }, [thermalData, colorPalette, temperatureScale, canvasRef]);

  useEffect(() => {
    drawThermalImage();
  }, [drawThermalImage]);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!onPixelHover || !canvasRef.current || !thermalData) return;

    const rect = canvasRef.current.getBoundingClientRect();
    // These coordinates are relative to the canvas, not scaled by zoom/pan yet
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // To get temperature, we need coordinates relative to the original image data
    // Assuming the canvas is rendered at 1:1 scale of the thermal data for this component
    const temp = getTemperatureAtPixel(thermalData, x, y);
    onPixelHover(x, y, temp);
  };

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!onPixelClick || !canvasRef.current || !thermalData) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const temp = getTemperatureAtPixel(thermalData, x, y);
    onPixelClick(x, y, temp);
  };

  if (!thermalData) {
    // Optionally, render a placeholder or nothing if no data
    return null;
  }

  return (
    <canvas
      ref={canvasRef}
      onMouseMove={onPixelHover ? handleMouseMove : undefined}
      onClick={onPixelClick ? handleClick : undefined}
      style={{ display: 'block' }} // Ensure canvas doesn't have extra space
      // Width and height will be set by renderThermalCanvas based on thermalData
    />
  );
}
