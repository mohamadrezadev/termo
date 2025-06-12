'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { useAppStore } from '@/lib/store';
import { translations } from '@/lib/translations';
import {
  getTemperatureAtPixel,
  extractThermalData,
  COLOR_PALETTES,
  ThermalData // Added for prop typing
} from '@/lib/thermal-utils';
import Window from './Window';
import ThermalImageRenderer from './ThermalImageRenderer'; // Import the new component
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
  // const canvasRef = useRef<HTMLCanvasElement>(null); // Will be removed
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null); // New overlay canvas
  const containerRef = useRef<HTMLDivElement>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 }); // Will store image coordinates
  const [currentTemp, setCurrentTemp] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentRegion, setCurrentRegion] = useState<{ points: { x: number; y: number }[] } | null>(null);

  const activeImage = images.find(img => img.id === activeImageId);
  const palette = COLOR_PALETTES[currentPalette];

  // renderThermal and its useEffect will be removed, handled by ThermalImageRenderer

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

  // Combined event handler for container (panning, and initial drawing clicks)
  const handleContainerMouseMove = useCallback((e: React.MouseEvent) => {
    if (!activeImage?.thermalData) return;

    if (isDragging && activeTool === 'cursor') {
      const deltaX = e.clientX - dragStart.x;
      const deltaY = e.clientY - dragStart.y;
      setPan(panX + deltaX, panY + deltaY);
      setDragStart({ x: e.clientX, y: e.clientY });
      return; // Panning should not update mousePos for temperature or drawing
    }

    // For drawing tools, calculate image coordinates from container event
    // This is used when drawing starts or continues outside ThermalImageRenderer's direct callbacks
    // (e.g. dragging to define a rectangle)
    if (containerRef.current && (isDrawing || activeTool !== 'cursor')) {
        const rect = containerRef.current.getBoundingClientRect();
        // These are coordinates relative to the container, need to be scaled and panned inversely
        const eventX = e.clientX - rect.left;
        const eventY = e.clientY - rect.top;

        // Transform container coordinates to image coordinates
        const imgX = (eventX - panX) / zoom;
        const imgY = (eventY - panY) / zoom;

        setMousePos({ x: imgX, y: imgY }); // Update mousePos for tooltips, status bar

        // If actively drawing a region, update the currentRegion's last point
        if (isDrawing && currentRegion && (activeTool === 'rectangle' || activeTool === 'polygon')) {
            setCurrentRegion({
                points: [...currentRegion.points.slice(0, -1), { x: imgX, y: imgY }]
            });
        }
    }
  }, [activeImage, zoom, panX, panY, isDragging, dragStart, activeTool, setPan, isDrawing, currentRegion]);


  const handlePixelHoverFromRenderer = useCallback((imgX: number, imgY: number, temp: number | null) => {
    setMousePos({ x: imgX, y: imgY }); // Store true image coordinates
    setCurrentTemp(temp);

    // If actively drawing a region, update the currentRegion's last point
    // This ensures smooth drawing even if mouse leaves the renderer canvas but is still over the general area
    // Note: This might be redundant if handleContainerMouseMove covers it, but good for precision.
    if (isDrawing && currentRegion && (activeTool === 'rectangle' || activeTool === 'polygon')) {
      setCurrentRegion({
        points: [...currentRegion.points.slice(0, -1), { x: imgX, y: imgY }]
      });
    }
  }, [isDrawing, currentRegion, activeTool]);


  const handleContainerMouseDown = useCallback((e: React.MouseEvent) => {
    if (!activeImage?.thermalData || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const eventX = e.clientX - rect.left;
    const eventY = e.clientY - rect.top;
    const imgX = (eventX - panX) / zoom;
    const imgY = (eventY - panY) / zoom;

    if (activeTool === 'cursor') {
      setIsDragging(true);
      setDragStart({ x: e.clientX, y: e.clientY });
    } else if (activeTool === 'rectangle' && !isDrawing) {
      setIsDrawing(true);
      setCurrentRegion({ points: [{ x: imgX, y: imgY }, { x: imgX, y: imgY }] });
    } else if (activeTool === 'polygon') {
      if (!isDrawing) {
        setIsDrawing(true);
        setCurrentRegion({ points: [{ x: imgX, y: imgY }] });
      } else if (currentRegion) {
        // For polygon, clicks add points. This is handled by handlePixelClickFromRenderer
        // or here if click is outside the renderer but on the container
         setCurrentRegion({
           points: [...currentRegion.points, { x: imgX, y: imgY }]
         });
      }
    }
  }, [activeTool, activeImage, zoom, panX, panY, isDrawing, currentRegion, setDragStart, setIsDragging, setCurrentRegion]);

  const handlePixelClickFromRenderer = useCallback((imgX: number, imgY: number, temp: number | null) => {
    if (!activeImage?.thermalData) return;

    if (activeTool === 'point' && temp !== null) {
      const marker = {
        id: Math.random().toString(36).substr(2, 9),
        type: 'point' as const,
        x: imgX, // Use direct image coordinates
        y: imgY,
        temperature: temp,
        label: `Point ${markers.length + 1}`,
        emissivity: 0.95 // Or from global/local settings
      };
      addMarker(marker);
    } else if (activeTool === 'polygon' && isDrawing && currentRegion) {
      // Add point to polygon
       setCurrentRegion({
         points: [...currentRegion.points, { x: imgX, y: imgY }]
       });
    }
    // Other click-based tool logic can be added here
  }, [activeTool, activeImage, markers, addMarker, isDrawing, currentRegion, setCurrentRegion]);


  const handleContainerMouseUp = useCallback(() => {
    setIsDragging(false);

    if (activeTool === 'rectangle' && isDrawing && currentRegion && currentRegion.points.length === 2) {
      // Validate points to ensure width/height > 0 before finalizing
      if (currentRegion.points[0].x === currentRegion.points[1].x || currentRegion.points[0].y === currentRegion.points[1].y) {
          setIsDrawing(false);
          setCurrentRegion(null);
          return; // Ignore zero-area rectangles
      }
      const region = {
        id: Math.random().toString(36).substr(2, 9),
        type: 'rectangle'as const,
        points: currentRegion.points, // These are already image coordinates
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
    // Note: Point marker placement is now in handlePixelClickFromRenderer
  }, [activeTool, activeImage, regions, addRegion, isDrawing, currentRegion, calculateRegionTemperatures, calculateRectangleArea]);

  const handleContainerDoubleClick = useCallback(() => {
    if (activeTool === 'polygon' && isDrawing && currentRegion && currentRegion.points.length >= 3) {
      // Validate points before finalizing
      if (currentRegion.points.length < 3) { // Ensure at least 3 points for a polygon
          setIsDrawing(false);
          setCurrentRegion(null);
          return;
      }
      // Remove the last point if it's the same as the one added by mouse move for current drawing
      const finalPoints = currentRegion.points.slice(0, -1);
      if (finalPoints.length < 3) {
        setIsDrawing(false);
        setCurrentRegion(null);
        return;
      }

      const region = {
        id: Math.random().toString(36).substr(2, 9),
        type: 'polygon' as const,
        points: finalPoints, // These are already image coordinates
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
          // Mouse events for panning and initiating drawing are on this container
          onMouseMove={handleContainerMouseMove}
          onMouseDown={handleContainerMouseDown}
          onMouseUp={handleContainerMouseUp}
          onDoubleClick={handleContainerDoubleClick}
          onMouseLeave={() => {
            // setIsDragging(false); // Keep dragging if mouse leaves container but button is still pressed
            // setCurrentTemp(null); // Temperature is now tied to renderer hover
          }}
        >
          {activeImage?.thermalData ? (
            <div // This div will be scaled and panned
              className={cn(
                  activeTool === 'cursor' ? 'cursor-grab' : 'cursor-crosshair',
                  isDragging && activeTool === 'cursor' && 'cursor-grabbing'
              )}
              style={{
                width: activeImage.thermalData.width,
                height: activeImage.thermalData.height,
                transform: `scale(${zoom}) translate(${panX / zoom}px, ${panY / zoom}px)`,
                transformOrigin: '0 0',
                position: 'relative', // For absolute positioning of overlays
              }}
            >
              <ThermalImageRenderer
                thermalData={activeImage.thermalData}
                colorPalette={palette}
                temperatureScale={{
                  min: customMinTemp ?? activeImage.thermalData.minTemp,
                  max: customMaxTemp ?? activeImage.thermalData.maxTemp,
                }}
                onPixelHover={handlePixelHoverFromRenderer}
                onPixelClick={handlePixelClickFromRenderer}
              />
              <canvas
                ref={overlayCanvasRef}
                width={activeImage.thermalData.width}
                height={activeImage.thermalData.height}
                className="absolute top-0 left-0 pointer-events-none"
                // Drawing on this canvas will be implemented later if needed for dynamic shapes
              />
              
              {/* Temperature Tooltip - uses mousePos (image coordinates) scaled and panned */}
              {currentTemp !== null && mousePos.x > 0 && mousePos.y > 0 && ( // also check mousePos is valid
                <div
                  className="absolute bg-black/80 text-white text-xs px-2 py-1 rounded pointer-events-none z-10"
                  style={{
                    // Position based on image coordinates (mousePos) then apply container's transform
                    left: mousePos.x + 10 / zoom, // Adjust offset based on zoom for consistent appearance
                    top: mousePos.y - 30 / zoom,
                    // The parent div is scaled, so tooltip is positioned relative to unscaled image, then scaled with parent
                  }}
                >
                  {currentTemp.toFixed(1)}°C
                </div>
              )}

              {/* Markers Overlay - positioned relative to the scaled/panned container */}
              {markers.filter(m => m.imageId === activeImageId).map((marker) => (
                <div
                  key={marker.id}
                  className="absolute w-3 h-3 bg-red-500 border-2 border-white rounded-full pointer-events-none"
                  style={{
                    left: marker.x - 6 / zoom, // Adjust for marker size relative to zoom
                    top: marker.y - 6 / zoom,
                    // transform: `scale(${1/zoom})`, // Optionally counter-scale marker size
                  }}
                />
              ))}

              {/* Regions Overlay - positioned relative to the scaled/panned container */}
              {regions.filter(r => r.imageId === activeImageId).map((region) => {
                if (region.type === 'rectangle' && region.points.length === 2) {
                  const [p1, p2] = region.points; // These are image coordinates
                  const left = Math.min(p1.x, p2.x);
                  const top = Math.min(p1.y, p2.y);
                  const width = Math.abs(p2.x - p1.x);
                  const height = Math.abs(p2.y - p1.y);
                  
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
                // TODO: Add rendering for polygon regions if needed
                return null;
              })}

              {/* Current Drawing Region - positioned relative to the scaled/panned container */}
              {isDrawing && currentRegion && activeTool === 'rectangle' && currentRegion.points.length === 2 && (
                <div
                  className="absolute border-2 border-yellow-500 pointer-events-none"
                  style={{
                    left: Math.min(currentRegion.points[0].x, currentRegion.points[1].x),
                    top: Math.min(currentRegion.points[0].y, currentRegion.points[1].y),
                    width: Math.abs(currentRegion.points[1].x - currentRegion.points[0].x),
                    height: Math.abs(currentRegion.points[1].y - currentRegion.points[0].y),
                    backgroundColor: 'rgba(234, 179, 8, 0.1)'
                  }}
                />
              )}
              {/* TODO: Add rendering for current polygon drawing if needed */}
            </div>
          ) : (
            /* Upload Area - remains unchanged, displayed when no activeImage.thermalData */
            <div
                className="flex flex-col items-center justify-center h-full text-gray-400"
                // Ensure drop/dragOver handlers are also on this placeholder
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
            >
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
            {currentTemp !== null && activeImage?.thermalData && ( // Only show temp if there's an image
              <span>{t.temperature}: {currentTemp.toFixed(1)}°C</span>
            )}
            {activeImage?.thermalData && ( // Only show coords if there's an image
              <span>X: {Math.round(mousePos.x)}, Y: {Math.round(mousePos.y)}</span>
            )}
            {isDrawing && activeImage?.thermalData && ( // Only show drawing status if there's an image
              <span className="text-yellow-400">Drawing {activeTool}...</span>
            )}
          </div>
          <div className="flex items-center space-x-4">
            <span>{t.palette}: {palette?.name}</span>
            {activeImage?.thermalData && (
              <span>
                Min: {(customMinTemp ?? activeImage.thermalData.minTemp).toFixed(1)}°C -
                Max: {(customMaxTemp ?? activeImage.thermalData.maxTemp).toFixed(1)}°C
              </span>
            )}
          </div>
        </div>
      </div>
    </Window>
  );
}