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
    addRegion,
    setActiveImage
  } = useAppStore();

  const t = translations[language];
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [currentTemp, setCurrentTemp] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentRegion, setCurrentRegion] = useState<{ points: { x: number; y: number }[] } | null>(null);

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

    // Store canvas reference in the image for other components
    activeImage.canvas = canvas;
  }, [activeImage, palette, customMinTemp, customMaxTemp]);

  useEffect(() => {
    renderThermal();
  }, [renderThermal]);

  const handleFileUpload = useCallback(async (files: FileList) => {
    for (let i = 0; i < files.length; i++) {
      try {
        const thermalImage = await extractThermalData(files[i]);
        addImage(thermalImage);
        // Set the newly uploaded image as active
        setActiveImage(thermalImage.id);
      } catch (error) {
        console.error('Failed to process file:', files[i].name, error);
      }
    }
  }, [addImage, setActiveImage]);

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

    // Handle region drawing
    if (isDrawing && currentRegion && (activeTool === 'rectangle' || activeTool === 'polygon')) {
      setCurrentRegion({
        points: [...currentRegion.points.slice(0, -1), { x, y }]
      });
    }
  }, [activeImage, zoom, panX, panY, isDragging, dragStart, activeTool, setPan, isDrawing, currentRegion]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas || !activeImage?.thermalData) return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left - panX) / zoom;
    const y = (e.clientY - rect.top - panY) / zoom;

    if (activeTool === 'cursor') {
      setIsDragging(true);
      setDragStart({ x: e.clientX, y: e.clientY });
    } else if (activeTool === 'rectangle' && !isDrawing) {
      setIsDrawing(true);
      setCurrentRegion({ points: [{ x, y }, { x, y }] });
    } else if (activeTool === 'polygon') {
      if (!isDrawing) {
        setIsDrawing(true);
        setCurrentRegion({ points: [{ x, y }] });
      } else if (currentRegion) {
        setCurrentRegion({
          points: [...currentRegion.points, { x, y }]
        });
      }
    }
  }, [activeTool, activeImage, zoom, panX, panY, isDrawing, currentRegion]);

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
    } else if (activeTool === 'rectangle' && isDrawing && currentRegion && currentRegion.points.length === 2) {
      // Complete rectangle
      const region = {
        id: Math.random().toString(36).substr(2, 9),
        type: 'rectangle' as const,
        points: currentRegion.points,
        minTemp: 0,
        maxTemp: 0,
        avgTemp: 0,
        label: `Rectangle ${regions.length + 1}`,
        emissivity: 0.95
      };
      
      // Calculate temperature statistics for the region
      if (activeImage?.thermalData) {
        const temps = calculateRegionTemperatures(activeImage.thermalData, currentRegion.points, 'rectangle');
        region.minTemp = temps.min;
        region.maxTemp = temps.max;
        region.avgTemp = temps.avg;
        region.area = calculateRectangleArea(currentRegion.points);
      }
      
      addRegion(region);
      setIsDrawing(false);
      setCurrentRegion(null);
    }
  }, [activeTool, activeImage, currentTemp, mousePos, markers.length, regions.length, addMarker, addRegion, isDrawing, currentRegion]);

  const handleDoubleClick = useCallback(() => {
    if (activeTool === 'polygon' && isDrawing && currentRegion && currentRegion.points.length >= 3) {
      // Complete polygon
      const region = {
        id: Math.random().toString(36).substr(2, 9),
        type: 'polygon' as const,
        points: currentRegion.points,
        minTemp: 0,
        maxTemp: 0,
        avgTemp: 0,
        label: `Polygon ${regions.length + 1}`,
        emissivity: 0.95
      };
      
      // Calculate temperature statistics for the region
      if (activeImage?.thermalData) {
        const temps = calculateRegionTemperatures(activeImage.thermalData, currentRegion.points, 'polygon');
        region.minTemp = temps.min;
        region.maxTemp = temps.max;
        region.avgTemp = temps.avg;
        region.area = calculatePolygonArea(currentRegion.points);
      }
      
      addRegion(region);
      setIsDrawing(false);
      setCurrentRegion(null);
    }
  }, [activeTool, isDrawing, currentRegion, regions.length, addRegion, activeImage]);

  const calculateRegionTemperatures = (thermalData: any, points: { x: number; y: number }[], type: string) => {
    const temps: number[] = [];
    
    if (type === 'rectangle' && points.length === 2) {
      const [p1, p2] = points;
      const minX = Math.floor(Math.min(p1.x, p2.x));
      const maxX = Math.ceil(Math.max(p1.x, p2.x));
      const minY = Math.floor(Math.min(p1.y, p2.y));
      const maxY = Math.ceil(Math.max(p1.y, p2.y));
      
      for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
          const temp = getTemperatureAtPixel(thermalData, x, y);
          if (temp !== null) temps.push(temp);
        }
      }
    }
    
    if (temps.length === 0) return { min: 0, max: 0, avg: 0 };
    
    return {
      min: Math.min(...temps),
      max: Math.max(...temps),
      avg: temps.reduce((sum, temp) => sum + temp, 0) / temps.length
    };
  };

  const calculateRectangleArea = (points: { x: number; y: number }[]) => {
    if (points.length !== 2) return 0;
    const [p1, p2] = points;
    return Math.abs((p2.x - p1.x) * (p2.y - p1.y));
  };

  const calculatePolygonArea = (points: { x: number; y: number }[]) => {
    if (points.length < 3) return 0;
    let area = 0;
    for (let i = 0; i < points.length; i++) {
      const j = (i + 1) % points.length;
      area += points[i].x * points[j].y;
      area -= points[j].x * points[i].y;
    }
    return Math.abs(area) / 2;
  };

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
                onDoubleClick={handleDoubleClick}
                onMouseLeave={() => {
                  setIsDragging(false);
                  setCurrentTemp(null);
                }}
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

              {/* Regions Overlay */}
              {regions.map((region) => {
                if (region.type === 'rectangle' && region.points.length === 2) {
                  const [p1, p2] = region.points;
                  const left = Math.min(p1.x, p2.x) * zoom + panX;
                  const top = Math.min(p1.y, p2.y) * zoom + panY;
                  const width = Math.abs(p2.x - p1.x) * zoom;
                  const height = Math.abs(p2.y - p1.y) * zoom;
                  
                  return (
                    <div
                      key={region.id}
                      className="absolute border-2 border-blue-500 pointer-events-none"
                      style={{
                        left,
                        top,
                        width,
                        height,
                        backgroundColor: 'rgba(59, 130, 246, 0.1)'
                      }}
                    />
                  );
                }
                return null;
              })}

              {/* Current Drawing Region */}
              {isDrawing && currentRegion && activeTool === 'rectangle' && currentRegion.points.length === 2 && (
                <div
                  className="absolute border-2 border-yellow-500 pointer-events-none"
                  style={{
                    left: Math.min(currentRegion.points[0].x, currentRegion.points[1].x) * zoom + panX,
                    top: Math.min(currentRegion.points[0].y, currentRegion.points[1].y) * zoom + panY,
                    width: Math.abs(currentRegion.points[1].x - currentRegion.points[0].x) * zoom,
                    height: Math.abs(currentRegion.points[1].y - currentRegion.points[0].y) * zoom,
                    backgroundColor: 'rgba(234, 179, 8, 0.1)'
                  }}
                />
              )}
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
            {isDrawing && (
              <span className="text-yellow-400">Drawing {activeTool}...</span>
            )}
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