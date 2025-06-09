'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { useAppStore } from '@/lib/store';
import { translations } from '@/lib/translations';
import { 
  renderThermalCanvas, 
  getTemperatureAtPixel, 
  extractThermalData,
  COLOR_PALETTES 
} from '@/lib/thermal-utils';
import Window from './Window';
import { Button } from '@/components/ui/button';
import { 
  MousePointer, 
  MapPin, 
  Minus, 
  Square, 
  Circle, 
  Pentagon, 
  Thermometer,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Upload
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ThermalViewer() {
  const {
    language,
    images,
    activeImageId,
    currentPalette,
    customMinTemp,
    customMaxTemp,
    zoom,
    panX,
    panY,
    activeTool,
    markers,
    regions,
    setZoom,
    setPan,
    setActiveTool,
    addImage,
    addMarker,
    addRegion
  } = useAppStore();

  const t = translations[language];
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [currentTemp, setCurrentTemp] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const activeImage = images.find(img => img.id === activeImageId);
  const palette = COLOR_PALETTES[currentPalette];

  const renderThermal = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !activeImage?.thermalData) return;

    renderThermalCanvas(
      canvas,
      activeImage.thermalData,
      palette,
      customMinTemp || undefined,
      customMaxTemp || undefined
    );

    // Apply zoom and pan
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.save();
      ctx.scale(zoom, zoom);
      ctx.translate(panX / zoom, panY / zoom);
      ctx.restore();
    }
  }, [activeImage, palette, customMinTemp, customMaxTemp, zoom, panX, panY]);

  useEffect(() => {
    renderThermal();
  }, [renderThermal]);

  const handleFileUpload = useCallback(async (files: FileList) => {
    for (let i = 0; i < files.length; i++) {
      try {
        const thermalImage = await extractThermalData(files[i]);
        addImage(thermalImage);
      } catch (error) {
        console.error('Failed to process file:', files[i].name, error);
      }
    }
  }, [addImage]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileUpload(files);
    }
  }, [handleFileUpload]);

  const handleFileSelect = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.bmt,.bmp,.jpg,.jpeg,.png,.tiff,.tif';
    input.multiple = true;
    input.onchange = (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (files) {
        handleFileUpload(files);
      }
    };
    input.click();
  }, [handleFileUpload]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas || !activeImage?.thermalData) return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left - panX) / zoom;
    const y = (e.clientY - rect.top - panY) / zoom;

    setMousePos({ x, y });

    const temp = getTemperatureAtPixel(activeImage.thermalData, x, y);
    setCurrentTemp(temp);

    if (isDragging && activeTool === 'cursor') {
      const deltaX = e.clientX - dragStart.x;
      const deltaY = e.clientY - dragStart.y;
      setPan(panX + deltaX, panY + deltaY);
      setDragStart({ x: e.clientX, y: e.clientY });
    }
  }, [activeImage, zoom, panX, panY, isDragging, dragStart, activeTool, setPan]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (activeTool === 'cursor') {
      setIsDragging(true);
      setDragStart({ x: e.clientX, y: e.clientY });
    }
  }, [activeTool]);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    setIsDragging(false);

    if (activeTool === 'point' && activeImage?.thermalData && currentTemp !== null) {
      const marker = {
        id: Math.random().toString(36).substr(2, 9),
        type: 'point' as const,
        x: mousePos.x,
        y: mousePos.y,
        temperature: currentTemp,
        label: `Point ${markers.length + 1}`,
        emissivity: 0.95
      };
      addMarker(marker);
    }
  }, [activeTool, activeImage, currentTemp, mousePos, markers.length, addMarker]);

  const handleZoomIn = () => setZoom(Math.min(zoom * 1.2, 5));
  const handleZoomOut = () => setZoom(Math.max(zoom / 1.2, 0.1));
  const handleResetView = () => {
    setZoom(1);
    setPan(0, 0);
  };

  const tools = [
    { id: 'cursor', icon: MousePointer, name: t.cursor },
    { id: 'point', icon: MapPin, name: t.point },
    { id: 'line', icon: Minus, name: t.line },
    { id: 'rectangle', icon: Square, name: t.rectangle },
    { id: 'circle', icon: Circle, name: t.circle },
    { id: 'polygon', icon: Pentagon, name: t.polygon },
    { id: 'isotherm', icon: Thermometer, name: t.isotherm },
  ];

  return (
    <Window id="thermal-viewer" title={t.thermalViewer}>
      <div className="flex flex-col h-full">
        {/* Toolbar */}
        <div className="flex items-center justify-between p-2 bg-gray-750 border-b border-gray-600">
          <div className="flex items-center space-x-1">
            {tools.map((tool) => (
              <Button
                key={tool.id}
                variant={activeTool === tool.id ? "default" : "ghost"}
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setActiveTool(tool.id)}
                title={tool.name}
              >
                <tool.icon className="w-4 h-4" />
              </Button>
            ))}
          </div>

          <div className="flex items-center space-x-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={handleZoomOut}
              title={t.zoomOut}
            >
              <ZoomOut className="w-4 h-4" />
            </Button>
            <span className="text-xs text-gray-400 min-w-[3rem] text-center">
              {Math.round(zoom * 100)}%
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={handleZoomIn}
              title={t.zoomIn}
            >
              <ZoomIn className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={handleResetView}
              title={t.resetZoom}
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Canvas Container */}
        <div 
          ref={containerRef}
          className="flex-1 relative overflow-hidden bg-gray-900"
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
        >
          {activeImage?.thermalData ? (
            <>
              <canvas
                ref={canvasRef}
                className={cn(
                  "absolute top-0 left-0",
                  activeTool === 'cursor' ? 'cursor-move' : 'cursor-crosshair'
                )}
                style={{
                  transform: `scale(${zoom}) translate(${panX / zoom}px, ${panY / zoom}px)`,
                  transformOrigin: '0 0'
                }}
                onMouseMove={handleMouseMove}
                onMouseDown={handleMouseDown}
                onMouseUp={handleMouseUp}
                onMouseLeave={() => setIsDragging(false)}
              />
              
              {/* Temperature Tooltip */}
              {currentTemp !== null && (
                <div
                  className="absolute bg-black/80 text-white text-xs px-2 py-1 rounded pointer-events-none z-10"
                  style={{
                    left: mousePos.x * zoom + panX + 10,
                    top: mousePos.y * zoom + panY - 30
                  }}
                >
                  {currentTemp.toFixed(1)}°C
                </div>
              )}

              {/* Markers Overlay */}
              {markers.map((marker) => (
                <div
                  key={marker.id}
                  className="absolute w-3 h-3 bg-red-500 border-2 border-white rounded-full pointer-events-none"
                  style={{
                    left: marker.x * zoom + panX - 6,
                    top: marker.y * zoom + panY - 6,
                  }}
                />
              ))}
            </>
          ) : (
            /* Upload Area */
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <Upload className="w-16 h-16 mb-4" />
              <p className="text-lg mb-2">{t.uploadImage}</p>
              <p className="text-sm mb-4">{t.dragDropHere}</p>
              <p className="text-xs mb-4">{t.supportedFormats}</p>
              <Button onClick={handleFileSelect} variant="outline">
                <Upload className="w-4 h-4 mr-2" />
                {t.importImage}
              </Button>
            </div>
          )}
        </div>

        {/* Status Bar */}
        <div className="h-6 bg-gray-750 border-t border-gray-600 flex items-center justify-between px-2 text-xs text-gray-400">
          <div className="flex items-center space-x-4">
            {currentTemp !== null && (
              <span>{t.temperature}: {currentTemp.toFixed(1)}°C</span>
            )}
            <span>X: {Math.round(mousePos.x)}, Y: {Math.round(mousePos.y)}</span>
          </div>
          <div className="flex items-center space-x-4">
            <span>{t.palette}: {palette?.name}</span>
            {activeImage?.thermalData && (
              <span>
                {activeImage.thermalData.minTemp.toFixed(1)}°C - 
                {activeImage.thermalData.maxTemp.toFixed(1)}°C
              </span>
            )}
          </div>
        </div>
      </div>
    </Window>
  );
}