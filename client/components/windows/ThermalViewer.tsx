'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { useAppStore } from '@/lib/store';
import { translations } from '@/lib/translations';
import { useToast } from '@/hooks/use-toast';
import {
  getTemperatureAtPixel,
  COLOR_PALETTES,
  ThermalData, // Added for prop typing
  processThermalBmpFromServer,
  processThermalDataFromCSV, // New import for CSV processing
  ThermalImage, // For constructing the new image object
  renderThermalCanvas, // Ensure this is imported
  formatTemperature, // For temperature formatting
  celsiusToFahrenheit, // For temperature conversion
  formatTemperatureDual // For dual temperature display (C and F)
} from '@/lib/thermal-utils';
import Window from './Window';
// import ThermalImageRenderer from './ThermalImageRenderer'; // Import the new component
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
  Upload,
  Eraser,
  Check
} from 'lucide-react';
import { cn, generateId } from '@/lib/utils';
import { post, getAbsoluteUrl, rerenderPalette } from '@/lib/api-service';

export default function ThermalViewer() {
  const { toast } = useToast();
  const {
    language,
    images,
    activeImageId,
    currentPalette,
    customMinTemp,
    customMaxTemp,
    thermalView,
    activeTool,
    markers,
    regions,
    showMarkers,
    showRegions,
    setThermalZoom,
    setThermalPan,
    setActiveTool,
    setPalette,
    addImage,
    addMarker,
    addRegion,
    removeMarker,
    removeRegion,
    setActiveImage,
    updateImagePalettes,
    updateGlobalParameters
  } = useAppStore();
  
  const { zoom, panX, panY } = thermalView;

  const t = translations[language];
  const mainCanvasRef = useRef<HTMLCanvasElement>(null); // Added this line
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null); // New overlay canvas
  const containerRef = useRef<HTMLDivElement>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 }); // Will store image coordinates
  const [currentTemp, setCurrentTemp] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentRegion, setCurrentRegion] = useState<{ points: { x: number; y: number }[] } | null>(null);
  const [isLoading, setIsLoading] = useState(false); // Loading state for image upload/processing
  const [imageLoading, setImageLoading] = useState(false); // Loading state for image rendering

  const activeImage = images.find(img => img.id === activeImageId);
  const palette = COLOR_PALETTES[currentPalette];

//    برای رندر کردن تصویر حرارتی

  useEffect(() => {
    const canvas = mainCanvasRef.current;
    if (!canvas) {
      return;
    }

    // Log the check
    console.log('[THERMAL_VIEWER] Effect triggered:', {
      activeImageId: activeImage?.id,
      currentPalette,
      hasServerPalettes: !!activeImage?.serverPalettes,
      serverPalettesKeys: activeImage?.serverPalettes ? Object.keys(activeImage.serverPalettes) : [],
      hasThermalData: !!activeImage?.thermalData,
      hasServerRenderedUrl: !!activeImage?.serverRenderedThermalUrl,
      serverRenderedUrl: activeImage?.serverRenderedThermalUrl?.substring(0, 100),
      customMinTemp,
      customMaxTemp
    });

    // Check if we need to use custom temperature range or client-side rendering
    const needsCustomRendering = activeImage?.thermalData && palette && (
      customMinTemp !== null ||
      customMaxTemp !== null
    );

    // Check if we have a server palette for the current selection
    const serverPaletteUrl = activeImage?.serverPalettes?.[currentPalette];

    if (serverPaletteUrl && !needsCustomRendering) {
      // Use server-rendered palette image (FAST!)
      console.log('[THERMAL_VIEWER] Using server palette:', currentPalette, 'URL:', serverPaletteUrl);
      setImageLoading(true);

      // Add cache-busting parameter only for URL paths, not for base64 images
      const urlWithCacheBuster = serverPaletteUrl.startsWith('data:')
        ? serverPaletteUrl
        : `${serverPaletteUrl.split('?')[0]}?t=${Date.now()}`;

      const img = new Image();
      img.crossOrigin = "anonymous";

      img.onload = () => {
        console.log('[THERMAL_VIEWER] Image loaded successfully');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, img.width, img.height);
        }
        setImageLoading(false);
      };

      img.onerror = (e) => {
        console.error('[THERMAL_VIEWER] Error loading server palette image:', urlWithCacheBuster, e);
        setImageLoading(false);
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
      };

      console.log('[THERMAL_VIEWER] Loading image from:', urlWithCacheBuster);
      img.src = urlWithCacheBuster;
    } else if (activeImage?.thermalData && palette) {
      // Client-side rendering with custom palette/temperature range (SLOWER)
      console.log('[THERMAL_VIEWER] Client-side rendering with palette:', currentPalette);
      setImageLoading(true);

      // Use setTimeout to allow UI to update
      setTimeout(() => {
        renderThermalCanvas(
          canvas,
          activeImage.thermalData!,
          palette,
          customMinTemp ?? activeImage.thermalData!.minTemp,
          customMaxTemp ?? activeImage.thermalData!.maxTemp
        );
        setImageLoading(false);
      }, 0);
    } else if (activeImage?.serverRenderedThermalUrl) {
      // Last fallback: if no palette available and no thermalData, use the default server rendered image
      console.log('[THERMAL_VIEWER] No matching palette or thermal data, using default serverRenderedThermalUrl');
      setImageLoading(true);

      const img = new Image();
      img.crossOrigin = "anonymous";

      img.onload = () => {
        console.log('[THERMAL_VIEWER] Default thermal image loaded');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, img.width, img.height);
        }
        setImageLoading(false);
      };

      img.onerror = (e) => {
        console.error('[THERMAL_VIEWER] Error loading default thermal image:', e);
        setImageLoading(false);
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
      };

      img.src = activeImage.serverRenderedThermalUrl;
    } else {
      // Clear canvas if no data at all
      console.log('[THERMAL_VIEWER] No thermal data to render, clearing canvas.');
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
      setImageLoading(false);
    }
  }, [activeImage, palette, customMinTemp, customMaxTemp, currentPalette]);

  // Effect for logging active image changes
  useEffect(() => {
    if (activeImage) {
      console.log(`[THERMAL_VIEWER_STATE] Active image changed: ID=${activeImage.id}, Name=${activeImage.name}`);
      console.log(`[THERMAL_VIEWER_STATE] RealImage URL: ${activeImage.realImage}`);
      console.log(`[THERMAL_VIEWER_STATE] ServerRenderedThermalUrl: ${activeImage.serverRenderedThermalUrl}`);
      if (activeImage.serverPalettes) {
        console.log(`[THERMAL_VIEWER_STATE] Server Palettes:`, Object.keys(activeImage.serverPalettes));
        const currentPaletteUrl = activeImage.serverPalettes[currentPalette];
        if (currentPaletteUrl) {
          console.log(`[THERMAL_VIEWER_STATE] Current palette '${currentPalette}' URL is base64: ${currentPaletteUrl.startsWith('data:')}, Length: ${currentPaletteUrl.length}`);
        }
      }
      if (activeImage.thermalData) {
        console.log(`[THERMAL_VIEWER_STATE] ThermalData: Width=${activeImage.thermalData.width}, Height=${activeImage.thermalData.height}, MinT=${activeImage.thermalData.minTemp}, MaxT=${activeImage.thermalData.maxTemp}`);
      } else {
        console.log('[THERMAL_VIEWER_STATE] Active image has no thermalData.');
      }
    } else {
      console.log('[THERMAL_VIEWER_STATE] No active image.');
    }
  }, [activeImage, currentPalette]);

  // Effect to update overlay canvas size when main canvas size changes
  useEffect(() => {
    const mainCanvas = mainCanvasRef.current;
    const overlayCanvas = overlayCanvasRef.current;
    
    if (mainCanvas && overlayCanvas && (mainCanvas.width > 0 || mainCanvas.height > 0)) {
      // Update overlay canvas size to match main canvas
      if (overlayCanvas.width !== mainCanvas.width || overlayCanvas.height !== mainCanvas.height) {
        console.log('[THERMAL_VIEWER] Updating overlay canvas size:', {
          width: mainCanvas.width,
          height: mainCanvas.height
        });
        overlayCanvas.width = mainCanvas.width;
        overlayCanvas.height = mainCanvas.height;
      }
    }
  }, [activeImage, mainCanvasRef.current?.width, mainCanvasRef.current?.height]);

  // Effect for rendering markers and regions on overlay canvas
  useEffect(() => {
    const overlayCanvas = overlayCanvasRef.current;
    if (!overlayCanvas || !activeImage) {
      console.log('[THERMAL_VIEWER] Overlay render skipped:', {
        hasOverlayCanvas: !!overlayCanvas,
        hasActiveImage: !!activeImage
      });
      return;
    }

    const ctx = overlayCanvas.getContext('2d');
    if (!ctx) {
      console.log('[THERMAL_VIEWER] Failed to get overlay context');
      return;
    }

    // Clear overlay canvas
    ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);

    // Get markers and regions for current image
    const imageMarkers = markers.filter(m => m.imageId === activeImage.id);
    const imageRegions = regions.filter(r => r.imageId === activeImage.id);

    console.log(`[THERMAL_VIEWER] Rendering overlay for ${activeImage.name}:`, {
      markersCount: imageMarkers.length,
      regionsCount: imageRegions.length,
      showMarkers,
      showRegions,
      canvasSize: { width: overlayCanvas.width, height: overlayCanvas.height }
    });

    // Draw regions first (behind markers)
    if (showRegions) {
      imageRegions.forEach(region => {
        ctx.strokeStyle = region.color || '#00ff00';
        ctx.lineWidth = 2;
        ctx.fillStyle = (region.color || '#00ff00') + '33'; // Semi-transparent fill

        if (region.type === 'rectangle' && region.points.length === 2) {
          const [p1, p2] = region.points;
          const x = Math.min(p1.x, p2.x);
          const y = Math.min(p1.y, p2.y);
          const width = Math.abs(p2.x - p1.x);
          const height = Math.abs(p2.y - p1.y);
          
          ctx.fillRect(x, y, width, height);
          ctx.strokeRect(x, y, width, height);
        } else if (region.type === 'polygon' && region.points.length >= 3) {
          ctx.beginPath();
          ctx.moveTo(region.points[0].x, region.points[0].y);
          for (let i = 1; i < region.points.length; i++) {
            ctx.lineTo(region.points[i].x, region.points[i].y);
          }
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        } else if (region.type === 'circle' && region.points.length === 2) {
          const [center, edge] = region.points;
          const radius = Math.sqrt(
            Math.pow(edge.x - center.x, 2) + Math.pow(edge.y - center.y, 2)
          );
          ctx.beginPath();
          ctx.arc(center.x, center.y, radius, 0, 2 * Math.PI);
          ctx.fill();
          ctx.stroke();
        } else if (region.type === 'line' && region.points.length === 2) {
          const [p1, p2] = region.points;
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.stroke();
        }

        // Draw region label
        if (region.label) {
          const centerX = region.points.reduce((sum, p) => sum + p.x, 0) / region.points.length;
          const centerY = region.points.reduce((sum, p) => sum + p.y, 0) / region.points.length;
          
          ctx.fillStyle = '#ffffff';
          ctx.font = '12px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(region.label, centerX, centerY - 10);
          
          // Draw temperature info
          if (region.avgTemp) {
            ctx.fillText(`${region.avgTemp.toFixed(1)}°C`, centerX, centerY + 5);
          }
        }
      });
    }

    // Draw markers (on top of regions)
    if (showMarkers) {
      imageMarkers.forEach(marker => {
        // Draw marker point
        ctx.fillStyle = '#ff0000';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        
        ctx.beginPath();
        ctx.arc(marker.x, marker.y, 5, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();

        // Draw marker label and temperature
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'left';
        
        const labelX = marker.x + 10;
        const labelY = marker.y - 10;
        
        // Draw background for label
        const labelText = `${marker.label || 'Point'}`;
        const tempText = marker.temperature ? `${marker.temperature.toFixed(1)}°C` : '';
        const labelWidth = Math.max(
          ctx.measureText(labelText).width,
          ctx.measureText(tempText).width
        ) + 8;
        
        ctx.fillStyle = '#000000aa';
        ctx.fillRect(labelX - 4, labelY - 14, labelWidth, tempText ? 30 : 16);
        
        // Draw text
        ctx.fillStyle = '#ffffff';
        ctx.fillText(labelText, labelX, labelY);
        if (tempText) {
          ctx.fillStyle = '#ffff00';
          ctx.fillText(tempText, labelX, labelY + 14);
        }
      });
    }

    // Draw current drawing region (preview)
    if (isDrawing && currentRegion && currentRegion.points.length > 0) {
      ctx.strokeStyle = '#ffff00'; // Yellow for preview
      ctx.lineWidth = 2;
      ctx.fillStyle = 'rgba(255, 255, 0, 0.1)'; // Semi-transparent yellow

      if (activeTool === 'rectangle' && currentRegion.points.length === 2) {
        const [p1, p2] = currentRegion.points;
        const x = Math.min(p1.x, p2.x);
        const y = Math.min(p1.y, p2.y);
        const width = Math.abs(p2.x - p1.x);
        const height = Math.abs(p2.y - p1.y);
        
        ctx.fillRect(x, y, width, height);
        ctx.strokeRect(x, y, width, height);
      } else if (activeTool === 'circle' && currentRegion.points.length === 2) {
        const [center, edge] = currentRegion.points;
        const radius = Math.sqrt(
          Math.pow(edge.x - center.x, 2) + Math.pow(edge.y - center.y, 2)
        );
        ctx.beginPath();
        ctx.arc(center.x, center.y, radius, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();
      } else if (activeTool === 'polygon' && currentRegion.points.length >= 2) {
        ctx.beginPath();
        ctx.moveTo(currentRegion.points[0].x, currentRegion.points[0].y);
        for (let i = 1; i < currentRegion.points.length; i++) {
          ctx.lineTo(currentRegion.points[i].x, currentRegion.points[i].y);
        }
        // Don't close path for polygon preview (still drawing)
        ctx.stroke();
        
        // Draw points as small circles
        currentRegion.points.forEach((point, index) => {
          ctx.fillStyle = index === 0 ? '#ff0000' : '#ffff00';
          ctx.beginPath();
          ctx.arc(point.x, point.y, 4, 0, 2 * Math.PI);
          ctx.fill();
        });
      }
    }
  }, [activeImage, markers, regions, showMarkers, showRegions, isDrawing, currentRegion, activeTool]);

  // renderThermal and its useEffect will be removed, handled by ThermalImageRenderer

  // Note: Removed the second rendering effect (line 188+) as it was conflicting with the main palette rendering effect
  // The main effect (above) now handles both serverPalettes and client-side rendering
  // سازمان دهنده پروژه از LocalStorage یا store فعلی
  const getProjectName = useCallback((): string => {
    // First try to get from current project in store
    const { currentProject } = useAppStore.getState();
    if (currentProject && currentProject.name) {
      console.log('[UPLOAD] Using project name from current project:', currentProject.name);
      return currentProject.name;
    }

    // Fallback to localStorage
    const storedName = localStorage.getItem('currentProjectName');
    if (storedName) {
      console.log('[UPLOAD] Using project name from localStorage:', storedName);
      return storedName;
    }

    // Last resort: try app_state
    try {
      const storedData = localStorage.getItem('thermal-analyzer-storage');
      if (storedData) {
        const parsed = JSON.parse(storedData);
        if (parsed.state?.projects && parsed.state.projects.length > 0) {
          const projectName = parsed.state.projects[0].name;
          if (projectName) {
            console.log('[UPLOAD] Using project name from stored state:', projectName);
            return projectName;
          }
        }
      }
    } catch (err) {
      console.error('[UPLOAD] Failed to parse stored state:', err);
    }

    console.log('[UPLOAD] No project found, using default');
    return 'default_project';
  }, []);

  // Handler for palette change - requests from server if not available
  const handlePaletteChange = useCallback(async (newPalette: string) => {
    if (!activeImage) {
      // No active image, just change the palette setting
      setPalette(newPalette);
      return;
    }

    // Check if the palette is already available from server
    if (activeImage.serverPalettes?.[newPalette]) {
      console.log(`[PALETTE] Palette '${newPalette}' already available from server`);
      setPalette(newPalette);
      return;
    }

    // Check if we have thermal data for client-side rendering
    if (activeImage.thermalData) {
      console.log(`[PALETTE] Has thermal data, checking if should request from server or render client-side`);
      
      // اگر پروژه ذخیره شده است، ممکن است پالت در سرور موجود باشد
      // بهتر است اول از سرور درخواست کنیم (سریعتر از client-side rendering)
      const currentProject = useAppStore.getState().currentProject;
      if (currentProject?.id) {
        try {
          console.log(`[PALETTE] Requesting palette '${newPalette}' from server (faster than client-side)`);
          const projectName = getProjectName();
          const resp = await rerenderPalette(null, projectName, newPalette);
          console.log('[PALETTE] Rerender response:', resp);

          if (resp?.status === 'success' && resp.thermal_url) {
            // سرور پالت را تولید کرده یا از کش برگردانده
            const absoluteUrl = getAbsoluteUrl(resp.thermal_url);
            if (absoluteUrl) {
              // به‌روزرسانی serverPalettes برای این تصویر
              const updatedPalettes = {
                ...activeImage.serverPalettes,
                [newPalette]: absoluteUrl
              };
              updateImagePalettes(activeImage.id, updatedPalettes);
              
              console.log(`[PALETTE] Server provided palette '${newPalette}' (from_cache: ${resp.from_cache})`);
              setPalette(newPalette);
              return;
            }
          }
        } catch (err) {
          console.warn('[PALETTE] Server request failed, falling back to client-side rendering:', err);
        }
      }
      
      // Fallback: استفاده از client-side rendering
      console.log(`[PALETTE] Using client-side rendering for palette '${newPalette}'`);
      setPalette(newPalette);
      return;
    }

    // آخرین حالت: نه serverPalettes داریم، نه thermalData
    // باید حتماً از سرور درخواست کنیم
    try {
      console.log(`[PALETTE] No thermal data, must request palette '${newPalette}' from server`);
      const projectName = getProjectName();
      const resp = await rerenderPalette(null, projectName, newPalette);
      console.log('[PALETTE] Rerender response:', resp);

      if (resp?.status === 'success' && resp.thermal_url) {
        const absoluteUrl = getAbsoluteUrl(resp.thermal_url);
        if (absoluteUrl) {
          const updatedPalettes = {
            ...activeImage.serverPalettes,
            [newPalette]: absoluteUrl
          };
          updateImagePalettes(activeImage.id, updatedPalettes);
          setPalette(newPalette);
          return;
        }
      }

      console.warn(`[PALETTE] Server could not provide palette '${newPalette}'`);
      setPalette(newPalette);
    } catch (err) {
      console.error('[PALETTE] Error requesting palette from server:', err);
      setPalette(newPalette);
    }
  }, [activeImage, setPalette, getProjectName, updateImagePalettes]);

  // Helper function to check if a point is inside a polygon (ray casting algorithm)
  const isPointInPolygon = useCallback((point: { x: number; y: number }, polygon: { x: number; y: number }[]) => {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].x, yi = polygon[i].y;
      const xj = polygon[j].x, yj = polygon[j].y;
      
      const intersect = ((yi > point.y) !== (yj > point.y))
        && (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  }, []);

  const calculateRegionTemperatures = useCallback((thermalData: any, points: { x: number; y: number }[], type: string) => {
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
    } else if (type === 'circle' && points.length === 2) {
      const [center, edge] = points;
      const radius = Math.sqrt(Math.pow(edge.x - center.x, 2) + Math.pow(edge.y - center.y, 2));
      const minX = Math.floor(center.x - radius);
      const maxX = Math.ceil(center.x + radius);
      const minY = Math.floor(center.y - radius);
      const maxY = Math.ceil(center.y + radius);

      for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
          // Check if point is inside circle
          const distance = Math.sqrt(Math.pow(x - center.x, 2) + Math.pow(y - center.y, 2));
          if (distance <= radius) {
            const temp = getTemperatureAtPixel(thermalData, x, y);
            if (temp !== null) temps.push(temp);
          }
        }
      }
    } else if (type === 'polygon' && points.length >= 3) {
      // For polygon, find bounding box first
      const minX = Math.floor(Math.min(...points.map(p => p.x)));
      const maxX = Math.ceil(Math.max(...points.map(p => p.x)));
      const minY = Math.floor(Math.min(...points.map(p => p.y)));
      const maxY = Math.ceil(Math.max(...points.map(p => p.y)));

      // Check each point in bounding box if it's inside polygon
      for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
          if (isPointInPolygon({ x, y }, points)) {
            const temp = getTemperatureAtPixel(thermalData, x, y);
            if (temp !== null) temps.push(temp);
          }
        }
      }
    }

    if (temps.length === 0) return { min: 0, max: 0, avg: 0 };

    return {
      min: Math.min(...temps),
      max: Math.max(...temps),
      avg: temps.reduce((sum, temp) => sum + temp, 0) / temps.length
    };
  }, [isPointInPolygon]);

  const calculateRectangleArea = useCallback((points: { x: number; y: number }[]) => {
    if (points.length !== 2) return 0;
    const [p1, p2] = points;
    return Math.abs((p2.x - p1.x) * (p2.y - p1.y));
  }, []);

  const calculatePolygonArea = useCallback((points: { x: number; y: number }[]) => {
    if (points.length < 3) return 0;
    let area = 0;
    for (let i = 0; i < points.length; i++) {
      const j = (i + 1) % points.length;
      area += points[i].x * points[j].y;
      area -= points[j].x * points[i].y;
    }
    return Math.abs(area) / 2;
  }, []);

  // Keyboard event handler for polygon completion
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Enter or Space to complete polygon
      if ((e.key === 'Enter' || e.key === ' ') && activeTool === 'polygon' && isDrawing && currentRegion && currentRegion.points.length >= 3 && activeImage) {
        e.preventDefault();
        
        console.log('[THERMAL_VIEWER] Completing polygon with Enter/Space key');
        
        // Remove the last point (temporary mouse position)
        let finalPoints = currentRegion.points.slice(0, -1);
        
        if (finalPoints.length < 3) {
          console.log('[THERMAL_VIEWER] Not enough points for polygon');
          setIsDrawing(false);
          setCurrentRegion(null);
          return;
        }

        const region = {
          id: generateId(),
          type: 'polygon' as const,
          points: finalPoints,
          minTemp: 0,
          maxTemp: 0,
          avgTemp: 0,
          area: 0,
          label: `Polygon ${regions.length + 1}`,
          emissivity: 0.95,
          imageId: activeImage.id
        };

        // Calculate temperature statistics
        if (activeImage.thermalData) {
          const temps = calculateRegionTemperatures(activeImage.thermalData, finalPoints, 'polygon');
          region.minTemp = temps.min;
          region.maxTemp = temps.max;
          region.avgTemp = temps.avg;
          region.area = calculatePolygonArea(finalPoints);
        }

        addRegion(region);
        console.log('[THERMAL_VIEWER] Polygon region completed with keyboard:', region);
        setIsDrawing(false);
        setCurrentRegion(null);
      }
      
      // Escape to cancel drawing
      if (e.key === 'Escape' && isDrawing) {
        console.log('[THERMAL_VIEWER] Drawing cancelled with Escape');
        setIsDrawing(false);
        setCurrentRegion(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeTool, isDrawing, currentRegion, activeImage, regions.length, addRegion, calculateRegionTemperatures, calculatePolygonArea]);

  const handleFileUpload = useCallback(async (files: FileList) => {
    const projectName = getProjectName();
    const projectId = useAppStore.getState().currentProject?.id;
    
    if (!projectId) {
      toast({
        title: "خطا",
        description: "لطفاً ابتدا یک پروژه ایجاد کنید",
        variant: "destructive"
      });
      return;
    }
    
    console.log(`[UPLOAD] Starting file upload for project: ${projectName} (ID: ${projectId})`);

    setIsLoading(true); // Start loading

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      try {
        
        const formData = new FormData();
        formData.append('file', file);
        formData.append('project_id', projectId); // استفاده از project_id به جای project_name
        console.log(`[UPLOAD] Uploading file: ${file.name} to project ${projectId}`);

        // Use the centralized post function from api-service
        const result = await post('/thermal/upload', formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });
        
        console.log('[UPLOAD] Server response:', result);

        if (result.status !== 'success') {
          throw new Error(result.message || 'Server processing failed');
        }

        // Log the images array for debugging
        console.log('[UPLOAD] All images from server:', result.images);
        
      const thermalResult = result.images?.find((img: any) => img.type === 'thermal');
      const realResult = result.images?.find((img: any) => img.type === 'real');
      console.log('[UPLOAD] Thermal result from server:', thermalResult);
      console.log('[UPLOAD] Real result from server:', realResult);

      // Validate that we got at least a thermal result
      if (!thermalResult) {
        console.error('[UPLOAD] Server did not generate thermal images. Check extractor output.');
        console.error('[UPLOAD] Validation from server:', result.validation);
        throw new Error(`Server did not generate thermal images for ${file.name}. Check file format.`);
      }

      // استخراج URL تصویر thermal از palettes (استفاده از iron به عنوان پیش‌فرض)
      const thermalImageRelativeUrl = thermalResult?.palettes?.iron ||
                                      thermalResult?.palettes?.rainbow ||
                                      Object.values(thermalResult?.palettes || {})[0] as string | undefined;

      const thermalImageUrl = getAbsoluteUrl(thermalImageRelativeUrl);
      const csvUrl = getAbsoluteUrl(thermalResult?.csv_url);
      const realImageUrl = getAbsoluteUrl(realResult?.url);

      console.log('[UPLOAD] Extracted thermal image URL:', thermalImageUrl);
      console.log('[UPLOAD] CSV URL:', csvUrl);
      console.log('[UPLOAD] Real image URL:', realImageUrl);

      // Proceed if either a thermal or a real image URL is found
      if (thermalImageUrl || realImageUrl) {
        let thermalData: ThermalData | null = null;

        // Extract metadata once
        const metadata = {
          emissivity: thermalResult.metadata?.emissivity ?? 0.95,
          ambientTemp: 20,
          reflectedTemp: thermalResult.metadata?.reflected_temp ?? 20,
          humidity: thermalResult.metadata?.humidity ?? 0.5,
          distance: 1.0,
          cameraModel: thermalResult.metadata?.device || 'Thermal Camera',
          timestamp: thermalResult.metadata?.captured_at
            ? new Date(thermalResult.metadata.captured_at)
            : new Date()
        };

        console.log('[UPLOAD] Metadata extracted:', metadata);

        // استفاده از CSV برای دقت بالاتر
        if (csvUrl) {
          try {
            console.log(`[UPLOAD] Processing thermal data from CSV: ${csvUrl}`);
            thermalData = await processThermalDataFromCSV(csvUrl, metadata);
            console.log('[UPLOAD] Thermal data processed from CSV successfully');
          } catch (csvErr) {
            console.error(`[UPLOAD] Failed to process CSV, falling back to BMP:`, csvErr);
            // Fallback به BMP/PNG از palette
            if (thermalImageUrl) {
              try {
                thermalData = await processThermalBmpFromServer(thermalImageUrl);
                console.log('[UPLOAD] Thermal data processed from palette image successfully');
              } catch (bmpErr) {
                console.error(`[UPLOAD] BMP fallback also failed:`, bmpErr);
              }
            }
          }
        } else if (thermalImageUrl) {
          // اگر CSV نیست، از تصویر palette استفاده کن
          try {
            console.log(`[UPLOAD] Processing thermal image from palette: ${thermalImageUrl}`);
            thermalData = await processThermalBmpFromServer(thermalImageUrl);
          } catch (thermalErr) {
            console.error(`[UPLOAD] Failed to process thermal image:`, thermalErr);
          }
        } else {
          console.log('[UPLOAD] No thermal data source found (neither CSV nor palette image).');
        }

        if (!realImageUrl) {
            console.log('[UPLOAD] No real image URL found in server response.');
        }

        const newImageId = generateId();

        // Convert relative palette URLs to absolute URLs
        const absolutePalettes: Record<string, string> = {};
        if (thermalResult?.palettes) {
          Object.entries(thermalResult.palettes).forEach(([paletteName, relativeUrl]) => {
            const absUrl = getAbsoluteUrl(relativeUrl as string);
            if (absUrl) {
              absolutePalettes[paletteName] = absUrl;
            }
          });
        }

        const newImage: ThermalImage = {
          id: newImageId,
          name: file.name,
          thermalData: thermalData,
          realImage: realImageUrl,
          serverRenderedThermalUrl: thermalImageUrl ?? null,
          serverPalettes: absolutePalettes, // Store all server palette URLs
          csvUrl: csvUrl,
          metadata: metadata // Include metadata in image object
        };

        console.log('[UPLOAD] Adding new image to store:', {
          id: newImage.id,
          name: newImage.name,
          hasThermalData: !!newImage.thermalData,
          hasRealImage: !!newImage.realImage,
          serverPalettes: Object.keys(absolutePalettes),
          hasMetadata: !!newImage.metadata,
          thermalDataSource: thermalResult?.csv_url ? 'CSV' : 'BMP'
        });

        addImage(newImage);
        setActiveImage(newImage.id);
        
        // Update global parameters with camera model from first uploaded image
        if (metadata.cameraModel) {
          updateGlobalParameters({ 
            cameraModel: metadata.cameraModel,
            emissivity: metadata.emissivity,
            ambientTemp: metadata.ambientTemp,
            reflectedTemp: metadata.reflectedTemp,
            humidity: metadata.humidity,
            distance: metadata.distance
          });
        }

      } else {
        console.warn('[UPLOAD] Server response did not contain thermal or real image URLs for file:', file.name, result);
        throw new Error('Server did not return valid image URLs.');
      }
    } catch (err: any) {
      console.error('[UPLOAD] File upload or processing failed for file:', file.name, err);
      
      // نمایش پیام خطای فارسی
      let errorMessage = 'آپلود فایل با خطا مواجه شد';
      
      if (err.response?.data?.detail) {
        errorMessage = err.response.data.detail;
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      toast({
        title: "خطا در آپلود فایل",
        description: errorMessage,
        variant: "destructive"
      });
    }
  }

    setIsLoading(false); // End loading after all files processed
  }, [addImage, setActiveImage, getProjectName, toast]);
 
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

  // Listen for upload events from TopMenuBar
  useEffect(() => {
    const handleUploadEvent = () => {
      console.log('[THERMAL_VIEWER] Received upload event from TopMenuBar');
      handleFileSelect();
    };

    window.addEventListener('thermalViewerUpload', handleUploadEvent);
    return () => {
      window.removeEventListener('thermalViewerUpload', handleUploadEvent);
    };
  }, [handleFileSelect]);

  // Combined event handler for container (panning, and initial drawing clicks)
  const handleContainerMouseMove = useCallback((e: React.MouseEvent) => {
    if (!activeImage?.thermalData) return;

    if (isDragging && activeTool === 'cursor') {
      const deltaX = e.clientX - dragStart.x;
      const deltaY = e.clientY - dragStart.y;
      setThermalPan(panX + deltaX, panY + deltaY);
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
  }, [activeImage, zoom, panX, panY, isDragging, dragStart, activeTool, setThermalPan, isDrawing, currentRegion, setCurrentRegion]); // Added setCurrentRegion to dependencies


  // const handlePixelHoverFromRenderer = useCallback((imgX: number, imgY: number, temp: number | null) => {
  //   setMousePos({ x: imgX, y: imgY }); // Store true image coordinates
  //   setCurrentTemp(temp);

  //   // If actively drawing a region, update the currentRegion's last point
  //   // This ensures smooth drawing even if mouse leaves the renderer canvas but is still over the general area
  //   // Note: This might be redundant if handleContainerMouseMove covers it, but good for precision.
  //   if (isDrawing && currentRegion && (activeTool === 'rectangle' || activeTool === 'polygon')) {
  //     setCurrentRegion({
  //       points: [...currentRegion.points.slice(0, -1), { x: imgX, y: imgY }]
  //     });
  //   }
  // }, [isDrawing, currentRegion, activeTool]);


  const handleContainerMouseDown = useCallback((e: React.MouseEvent) => {
    if (!activeImage?.thermalData || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const eventX = e.clientX - rect.left;
    const eventY = e.clientY - rect.top;
    // These are coordinates relative to the container, need to be scaled and panned inversely
    const imgX = (eventX - panX) / zoom;
    const imgY = (eventY - panY) / zoom;

    if (activeTool === 'cursor') {
      setIsDragging(true);
      setDragStart({ x: e.clientX, y: e.clientY });
    } else if (activeTool === 'rectangle' && !isDrawing) {
      setIsDrawing(true);
      // Initial point for rectangle, second point will be updated by mouse move
      setCurrentRegion({ points: [{ x: imgX, y: imgY }, { x: imgX, y: imgY }] });
    } else if (activeTool === 'circle' && !isDrawing) {
      setIsDrawing(true);
      // Circle: first point is center, second point defines radius
      setCurrentRegion({ points: [{ x: imgX, y: imgY }, { x: imgX, y: imgY }] });
    } else if (activeTool === 'polygon') {
      if (!isDrawing) {
        setIsDrawing(true);
        // First point of polygon
        setCurrentRegion({ points: [{ x: imgX, y: imgY }] });
      }
      // Subsequent points for polygon are added by handleMainCanvasClick
      // No need to add points here for polygon after the first one
    }
  }, [activeTool, activeImage, zoom, panX, panY, isDrawing, setDragStart, setIsDragging, setCurrentRegion]); // Removed currentRegion from deps as it's not used for decision making here directly for polygon point addition

  // const handlePixelClickFromRenderer = useCallback((imgX: number, imgY: number, temp: number | null) => {
  //   if (!activeImage?.thermalData) return;

  //   if (activeTool === 'point' && temp !== null) {
  //     const marker = {
  //       id: generateId(),
  //       type: 'point' as const,
  //       x: imgX, // Use direct image coordinates
  //       y: imgY,
  //       temperature: temp,
  //       label: `Point ${markers.length + 1}`,
  //       emissivity: 0.95 // Or from global/local settings
  //     };
  //     addMarker(marker);
  //   } else if (activeTool === 'polygon' && isDrawing && currentRegion) {
  //     // Add point to polygon
  //      setCurrentRegion({
  //        points: [...currentRegion.points, { x: imgX, y: imgY }]
  //      });
  //   }
  //   // Other click-based tool logic can be added here
  // }, [activeTool, activeImage, markers, addMarker, isDrawing, currentRegion, setCurrentRegion]);

  const handleMainCanvasMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!mainCanvasRef.current || !activeImage?.thermalData) {
      setCurrentTemp(null); // Clear temp if no canvas or data
      return;
    }

    const canvas = mainCanvasRef.current;
    const rect = canvas.getBoundingClientRect();

    const scaleX = canvas.width / rect.width;    // relationship of actual canvas width to displayed width
    const scaleY = canvas.height / rect.height;  // relationship of actual canvas height to displayed height

    const canvasX = (e.clientX - rect.left) * scaleX;
    const canvasY = (e.clientY - rect.top) * scaleY;

    setMousePos({ x: canvasX, y: canvasY });

    const temp = getTemperatureAtPixel(activeImage.thermalData, canvasX, canvasY);
    
    // Debug: بررسی دمای خام
    if (temp !== null && (temp < -100 || temp > 500)) {
      console.warn('[THERMAL_VIEWER] Suspicious temperature detected:', {
        temp,
        position: { x: canvasX, y: canvasY },
        min: activeImage.thermalData.minTemp,
        max: activeImage.thermalData.maxTemp
      });
    }
    
    setCurrentTemp(temp);

    if (isDrawing && currentRegion && (activeTool === 'rectangle' || activeTool === 'circle' || activeTool === 'polygon')) {
      setCurrentRegion((prevRegion) => {
        if (!prevRegion) return null;
        const updatedPoints = [...prevRegion.points.slice(0, -1), { x: canvasX, y: canvasY }];
        return { ...prevRegion, points: updatedPoints };
      });
    }
  }, [activeImage, activeTool, isDrawing, currentRegion, setCurrentTemp, setMousePos, setCurrentRegion]); // Cleaned dependencies

  const handleMainCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!mainCanvasRef.current || !activeImage?.thermalData) return;

    const canvas = mainCanvasRef.current;
    const rect = canvas.getBoundingClientRect();

    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const canvasX = (e.clientX - rect.left) * scaleX;
    const canvasY = (e.clientY - rect.top) * scaleY;

    if (activeTool === 'point') {
      const temp = getTemperatureAtPixel(activeImage.thermalData, canvasX, canvasY);
      if (temp !== null) {
        const marker = {
          id: generateId(),
          type: 'point' as const,
          x: canvasX,
          y: canvasY,
          temperature: temp,
          label: `Point ${markers.length + 1}`,
          emissivity: 0.95,
          imageId: activeImage.id,
        };
        addMarker(marker);
      }
    } else if (activeTool === 'eraser') {
      // Eraser: check if click is near any marker or inside any region
      const clickThreshold = 10; // pixels
      
      // Check markers
      const clickedMarker = markers.find(m => 
        m.imageId === activeImage.id &&
        Math.sqrt(Math.pow(m.x - canvasX, 2) + Math.pow(m.y - canvasY, 2)) < clickThreshold
      );
      
      if (clickedMarker) {
        removeMarker(clickedMarker.id);
        console.log('[THERMAL_VIEWER] Marker removed:', clickedMarker.id);
        return;
      }
      
      // Check regions
      const clickedRegion = regions.find(r => {
        if (r.imageId !== activeImage.id) return false;
        
        if (r.type === 'rectangle' && r.points.length === 2) {
          const [p1, p2] = r.points;
          const minX = Math.min(p1.x, p2.x);
          const maxX = Math.max(p1.x, p2.x);
          const minY = Math.min(p1.y, p2.y);
          const maxY = Math.max(p1.y, p2.y);
          return canvasX >= minX && canvasX <= maxX && canvasY >= minY && canvasY <= maxY;
        } else if (r.type === 'circle' && r.points.length === 2) {
          const [center, edge] = r.points;
          const radius = Math.sqrt(Math.pow(edge.x - center.x, 2) + Math.pow(edge.y - center.y, 2));
          const distance = Math.sqrt(Math.pow(canvasX - center.x, 2) + Math.pow(canvasY - center.y, 2));
          return distance <= radius;
        } else if (r.type === 'polygon' && r.points.length >= 3) {
          return isPointInPolygon({ x: canvasX, y: canvasY }, r.points);
        }
        return false;
      });
      
      if (clickedRegion) {
        removeRegion(clickedRegion.id);
        console.log('[THERMAL_VIEWER] Region removed:', clickedRegion.id);
        return;
      }
    } else if (activeTool === 'polygon' && isDrawing && currentRegion) {
      // This adds a new point to the polygon for each click on the canvas
      // The very first point is initiated by handleContainerMouseDown
      setCurrentRegion((prevRegion) => {
        if (!prevRegion) return null;
        // Add the new click point, and also a new point for the mouse to continue drawing the "rubber band"
        return { ...prevRegion, points: [...prevRegion.points, { x: canvasX, y: canvasY }] };
      });
    }
  }, [activeImage, activeTool, markers, regions, addMarker, removeMarker, removeRegion, isDrawing, currentRegion, setCurrentRegion, isPointInPolygon]);

  const handleMainCanvasMouseLeave = useCallback(() => {
      setCurrentTemp(null);
      // setMousePos({ x: 0, y: 0 }); // Optional: reset mousePos if needed
  }, [setCurrentTemp]);

  const handleContainerMouseUp = useCallback(() => {
    setIsDragging(false);

    if (activeTool === 'rectangle' && isDrawing && currentRegion && currentRegion.points.length === 2 && activeImage) {
      // Validate points to ensure width/height > 0 before finalizing
      if (currentRegion.points[0].x === currentRegion.points[1].x || currentRegion.points[0].y === currentRegion.points[1].y) {
          setIsDrawing(false);
          setCurrentRegion(null);
          return; // Ignore zero-area rectangles
      }
      const region = {
        id: generateId(),
        type: 'rectangle'as const,
        points: currentRegion.points, // These are already image coordinates
        minTemp: 0,
        maxTemp: 0,
        avgTemp: 0,
        area: 0,
        label: `Rectangle ${regions.length + 1}`,
        emissivity: 0.95,
        imageId: activeImage.id // Associate region with the active image
      };

      // Calculate temperature statistics for the region
      if (activeImage.thermalData) {
        const temps = calculateRegionTemperatures(activeImage.thermalData, currentRegion.points, 'rectangle');
        region.minTemp = temps.min;
        region.maxTemp = temps.max;
        region.avgTemp = temps.avg;
        region.area = calculateRectangleArea(currentRegion.points);
      }

      addRegion(region);
      setIsDrawing(false);
      setCurrentRegion(null);
    } else if (activeTool === 'circle' && isDrawing && currentRegion && currentRegion.points.length === 2 && activeImage) {
      // Validate circle has non-zero radius
      const [center, edge] = currentRegion.points;
      const radius = Math.sqrt(Math.pow(edge.x - center.x, 2) + Math.pow(edge.y - center.y, 2));
      
      if (radius < 1) {
        setIsDrawing(false);
        setCurrentRegion(null);
        return; // Ignore zero-radius circles
      }

      const region = {
        id: generateId(),
        type: 'circle' as const,
        points: currentRegion.points,
        minTemp: 0,
        maxTemp: 0,
        avgTemp: 0,
        area: 0,
        label: `Circle ${regions.length + 1}`,
        emissivity: 0.95,
        imageId: activeImage.id
      };

      // Calculate temperature statistics for the circle
      if (activeImage.thermalData) {
        const temps = calculateRegionTemperatures(activeImage.thermalData, currentRegion.points, 'circle');
        region.minTemp = temps.min;
        region.maxTemp = temps.max;
        region.avgTemp = temps.avg;
        region.area = Math.PI * radius * radius; // πr²
      }

      addRegion(region);
      console.log('[THERMAL_VIEWER] Circle region added:', region);
      setIsDrawing(false);
      setCurrentRegion(null);
    }
    // Note: Point marker placement is now in handlePixelClickFromRenderer

  }, [activeTool, activeImage, regions, addRegion, isDrawing, currentRegion, calculateRegionTemperatures, calculateRectangleArea]);

  const handleContainerDoubleClick = useCallback(() => {
    if (activeTool === 'polygon' && isDrawing && currentRegion && currentRegion.points.length >= 3 && activeImage) {
      // Validate points before finalizing. For polygons, the last point is a temporary "rubber-band" point from mouse move.
      // The actual click that adds a persistent point is handleMainCanvasClick.
      // Double click finalizes, so we might have one extra point from the move before double click.
      let finalPoints = currentRegion.points;
      if (finalPoints.length > 1 && (activeTool === 'polygon')) { // For polygon, the last point is often the moving cursor pos
         // Check if the last point is very close to the second to last; if so, it might be a byproduct of click + move
         // However, a simpler approach is to rely on the user having clicked to place the points they want.
         // The double click itself doesn't add a point, it finalizes the existing ones.
         // If handleMainCanvasClick adds a point and then handleContainerMouseMove adds one before dblclick,
         // we might have an extra point. The logic in handleMainCanvasClick for polygon adds a point.
         // The logic in handleContainerMouseMove for polygon updates the *last* point.
         // The logic in handleContainerMouseDown for polygon adds the *first* point, or if already drawing, it used to add subsequent points.
         // Now, subsequent points for polygon are primarily added by handleMainCanvasClick.
         // Let's assume points in currentRegion are the ones to save, potentially removing the last if it's a duplicate from drawing.
         // A robust way is to remove the last point if it was just for "rubber-banding"
         // The prompt suggests `currentRegion.points.slice(0, -1)`. This implies the last point is always temporary.
         // This needs to be consistent with how points are added.
         // If `handleMainCanvasClick` adds point `N` and `handleMainCanvasMouseMove` updates point `N+1` (temporary)
         // then `slice(0,-1)` would remove the temporary point.
         // If `handleContainerMouseDown` adds point 1.
         // `handleMainCanvasClick` adds point 2. `currentRegion` is {P1, P2}. MouseMove updates P3. `currentRegion` is {P1, P2, P_move}.
         // `handleMainCanvasClick` adds point 3. `currentRegion` is {P1, P2, P3}. MouseMove updates P4. `currentRegion` is {P1, P2, P3, P_move}.
         // Double click: `finalPoints = currentRegion.points.slice(0, -1)` would be {P1, P2, P3}. This seems correct.
         finalPoints = currentRegion.points.slice(0, -1);
      }


      if (finalPoints.length < 3) { // Ensure at least 3 points for a polygon
          setIsDrawing(false);
          setCurrentRegion(null);
          return;
      }

      const region = {
        id: generateId(),
        type: 'polygon' as const,
        points: finalPoints,
        minTemp: 0,
        maxTemp: 0,
        avgTemp: 0,
        area: 0,
        label: `Polygon ${regions.length + 1}`,
        emissivity: 0.95,
        imageId: activeImage.id // Associate region with the active image
      };

      // Calculate temperature statistics for the region
      if (activeImage.thermalData) {
        const temps = calculateRegionTemperatures(activeImage.thermalData, currentRegion.points, 'polygon');
        region.minTemp = temps.min;
        region.maxTemp = temps.max;
        region.avgTemp = temps.avg;
        region.area = calculatePolygonArea(currentRegion.points);
      }

      addRegion(region);
      console.log('[THERMAL_VIEWER] Polygon region added:', region);
      setIsDrawing(false);
      setCurrentRegion(null);
    }
  }, [activeTool, isDrawing, currentRegion, regions.length, addRegion, activeImage, calculateRegionTemperatures, calculatePolygonArea]);

  const handleZoomIn = () => setThermalZoom(Math.min(zoom * 1.2, 5));
  const handleZoomOut = () => setThermalZoom(Math.max(zoom / 1.2, 0.1));
  const handleResetView = () => {
    setThermalZoom(1);
    setThermalPan(0, 0);
  };

  const tools = [
    { id: 'cursor', icon: MousePointer, name: t.cursor },
    { id: 'point', icon: MapPin, name: t.point },
    { id: 'line', icon: Minus, name: t.line },
    { id: 'rectangle', icon: Square, name: t.rectangle },
    { id: 'circle', icon: Circle, name: t.circle },
    { id: 'polygon', icon: Pentagon, name: t.polygon },
    { id: 'eraser', icon: Eraser, name: 'پاک‌کن' },
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

          <div className="flex items-center space-x-2">
            {/* Loading Indicator */}
            {(isLoading || imageLoading) && (
              <div className="flex items-center space-x-2 px-2 border-r border-gray-600">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent"></div>
                <span className="text-xs text-gray-400">
                  {isLoading ? 'Loading...' : 'Rendering...'}
                </span>
              </div>
            )}

            {/* Color Palette Selector - Show server palettes if available, otherwise show all */}
            {activeImage && (
              <div className="flex items-center space-x-1 px-2 border-r border-gray-600">
                <Thermometer className="w-3 h-3 text-gray-400" />
                <select
                  value={currentPalette}
                  onChange={(e) => handlePaletteChange(e.target.value)}
                  className="text-xs bg-gray-700 text-gray-300 border border-gray-600 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  title="Color Palette"
                  disabled={isLoading || imageLoading}
                >
                  {activeImage.serverPalettes && Object.keys(activeImage.serverPalettes).length > 0 ? (
                    // Show only server-available palettes (FAST rendering)
                    Object.keys(activeImage.serverPalettes).map((key) => {
                      const paletteInfo = COLOR_PALETTES[key];
                      return (
                        <option key={key} value={key}>
                          {paletteInfo?.name || key} {paletteInfo ? '⚡' : ''}
                        </option>
                      );
                    })
                  ) : (
                    // Fallback: show all palettes (will use client-side rendering)
                    Object.entries(COLOR_PALETTES).map(([key, palette]) => (
                      <option key={key} value={key}>
                        {palette.name}
                      </option>
                    ))
                  )}
                </select>
                {activeImage.serverPalettes && Object.keys(activeImage.serverPalettes).length > 0 && (
                  <span className="text-xs text-green-400" title="Server-rendered palettes (fast)">
                    ⚡
                  </span>
                )}
              </div>
            )}

            {/* Zoom Controls */}
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
          {activeImage && (activeImage.thermalData || activeImage.serverRenderedThermalUrl) ? (
            <div // This div will be scaled and panned
              className={cn(
                  activeTool === 'cursor' ? 'cursor-grab' : 'cursor-crosshair',
                  isDragging && activeTool === 'cursor' && 'cursor-grabbing'
              )}
              style={{
                width: activeImage.thermalData?.width || mainCanvasRef.current?.width || 640,
                height: activeImage.thermalData?.height || mainCanvasRef.current?.height || 480,
                transform: `scale(${zoom}) translate(${panX / zoom}px, ${panY / zoom}px)`,
                transformOrigin: '0 0',
                position: 'relative', // For absolute positioning of overlays
              }}
            >
              {/* The main canvas for thermal image rendering */}
              <canvas
                ref={mainCanvasRef}
                // The style for width/height of the canvas itself will be set via canvas.width/height attributes
                // It should be positioned absolutely or relatively within its parent div as needed
                // Add mouse move/click handlers for temperature reading and marker placement later in step 2
                style={{
                  display: 'block', // Good practice for canvas
                  width: '100%', // Display size (CSS pixels)
                  height: '100%', // Display size (CSS pixels)
                  // The actual rendering resolution is set by canvas.width and canvas.height in the effect
                }}
                onMouseMove={handleMainCanvasMouseMove} // New handler
                onClick={handleMainCanvasClick}       // New handler
                onMouseLeave={handleMainCanvasMouseLeave} // New handler
              />
              {/* Keep the overlayCanvas for markers/regions if it's separate */}
              <canvas
                ref={overlayCanvasRef}
                className="absolute top-0 left-0 pointer-events-none"
                style={{
                  display: 'block',
                  width: '100%',
                  height: '100%',
                }}
              />

              {/* Loading Overlay on Canvas */}
              {imageLoading && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center pointer-events-none z-20">
                  <div className="flex flex-col items-center space-y-3">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
                    <span className="text-white text-sm font-medium">Rendering thermal image...</span>
                  </div>
                </div>
              )}
              
              {/* Enhanced Temperature Tooltip - shows detailed CSV data */}
              {currentTemp !== null && mousePos.x > 0 && mousePos.y > 0 && ( // also check mousePos is valid
                <div
                  className="absolute bg-black/95 text-white text-xs px-3 py-2 rounded-lg pointer-events-none z-10 shadow-xl border border-gray-500"
                  style={{
                    // Position based on image coordinates (mousePos) then apply container's transform
                    left: mousePos.x + 15 / zoom, // Adjust offset based on zoom for consistent appearance
                    top: mousePos.y - 100 / zoom,
                    minWidth: '220px',
                    backdropFilter: 'blur(4px)',
                    // The parent div is scaled, so tooltip is positioned relative to unscaled image, then scaled with parent
                  }}
                >
                  <div className="space-y-1">
                    {/* Header with Camera Model */}
                    <div className="font-bold text-yellow-400 border-b border-gray-600 pb-1 mb-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">{activeImage?.thermalData?.metadata?.cameraModel || 'Thermal Camera'}</span>
                        <span className="text-[9px] text-gray-400 font-normal">
                          {activeImage?.thermalData ? 'CSV' : 'BMP'}
                        </span>
                      </div>
                      {activeImage?.thermalData?.metadata?.timestamp && (
                        <div className="text-[10px] text-gray-500 font-normal mt-0.5">
                          {new Date(activeImage.thermalData.metadata.timestamp).toLocaleString()}
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                      {/* Current Temperature - Primary Display */}
                      <span className="text-gray-300 font-semibold">{t.temperature || 'Temperature'}:</span>
                      <span className="font-mono text-yellow-300 font-bold text-base">
                        {formatTemperature(currentTemp, 'F')}
                      </span>

                      {/* Position */}
                      <span className="text-gray-400 text-xs">Position:</span>
                      <span className="font-mono text-xs text-gray-400">({Math.round(mousePos.x)}, {Math.round(mousePos.y)})</span>

                      {/* Temperature Range - Show Min and Max separately */}
                      {activeImage?.thermalData && (
                        <>
                          <span className="col-span-2 h-px bg-gray-700 my-0.5"></span>

                          <span className="text-blue-300">Min Temp:</span>
                          <span className="font-mono text-blue-300 font-semibold">
                            {formatTemperature(activeImage.thermalData.minTemp, 'F')}
                          </span>

                          <span className="text-red-300">Max Temp:</span>
                          <span className="font-mono text-red-300 font-semibold">
                            {formatTemperature(activeImage.thermalData.maxTemp, 'F')}
                          </span>

                          <span className="text-gray-400 text-xs">Range:</span>
                          <span className="font-mono text-xs text-gray-400">
                            {(activeImage.thermalData.maxTemp - activeImage.thermalData.minTemp).toFixed(1)}°C
                          </span>
                        </>
                      )}

                      {/* Metadata */}
                      {activeImage?.thermalData?.metadata && (
                        <>
                          <span className="col-span-2 h-px bg-gray-700 my-0.5"></span>

                          <span className="text-gray-400 text-xs">{t.emissivity || 'Emissivity'}:</span>
                          <span className="font-mono text-xs">{activeImage.thermalData.metadata.emissivity.toFixed(3)}</span>

                          {activeImage.thermalData.metadata.ambientTemp !== undefined && (
                            <>
                              <span className="text-gray-400 text-xs">{t.ambientTemp || 'Ambient'}:</span>
                              <span className="font-mono text-xs">{formatTemperature(activeImage.thermalData.metadata.ambientTemp, 'F')}</span>
                            </>
                          )}

                          {activeImage.thermalData.metadata.reflectedTemp !== undefined && (
                            <>
                              <span className="text-gray-400 text-xs">Reflected:</span>
                              <span className="font-mono text-xs">{formatTemperature(activeImage.thermalData.metadata.reflectedTemp, 'F')}</span>
                            </>
                          )}

                          {activeImage.thermalData.metadata.humidity !== undefined && (
                            <>
                              <span className="text-gray-400 text-xs">{t.humidity || 'Humidity'}:</span>
                              <span className="font-mono text-xs">{(activeImage.thermalData.metadata.humidity * 100).toFixed(0)}%</span>
                            </>
                          )}

                          {activeImage.thermalData.metadata.distance !== undefined && (
                            <>
                              <span className="text-gray-400 text-xs">{t.distance || 'Distance'}:</span>
                              <span className="font-mono text-xs">{activeImage.thermalData.metadata.distance.toFixed(1)}m</span>
                            </>
                          )}
                        </>
                      )}
                    </div>

                    {/* Data Source Footer */}
                    <div className="text-gray-500 text-[9px] mt-1 pt-1 border-t border-gray-700 text-center">
                      {activeImage?.csvUrl ? 'High Precision CSV Data' : 'Image-based Data'}
                    </div>
                  </div>
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
              <span>{t.temperature}: {formatTemperatureDual(currentTemp)}</span>
            )}
            {activeImage?.thermalData && ( // Only show coords if there's an image
              <span>X: {Math.round(mousePos.x)}, Y: {Math.round(mousePos.y)}</span>
            )}
            {isDrawing && activeTool === 'polygon' && currentRegion && currentRegion.points.length >= 3 && (
              <span className="text-yellow-400 font-bold">
                🔷 چندضلعی: {currentRegion.points.length - 1} نقطه | Enter یا دوبار کلیک برای اتمام | Esc برای لغو
              </span>
            )}
            {isDrawing && activeTool !== 'polygon' && activeImage?.thermalData && ( // Only show drawing status if there's an image
              <span className="text-yellow-400">Drawing {activeTool}...</span>
            )}
            {/* Show emissivity and reflected temperature from metadata */}
            {activeImage?.thermalData?.metadata && (
              <>
                <span className="text-blue-400">
                  ε: {activeImage.thermalData.metadata.emissivity?.toFixed(3) || '0.950'}
                </span>
                {activeImage.thermalData.metadata.reflectedTemp !== undefined && (
                  <span className="text-orange-400">
                    Refl: {formatTemperatureDual(activeImage.thermalData.metadata.reflectedTemp)}
                  </span>
                )}
              </>
            )}
          </div>
          <div className="flex items-center space-x-4">
            <span>{t.palette}: {palette?.name}</span>
            {activeImage?.thermalData && (
              <span>
                Min: {formatTemperatureDual(customMinTemp ?? activeImage.thermalData.minTemp)} -
                Max: {formatTemperatureDual(customMaxTemp ?? activeImage.thermalData.maxTemp)}
              </span>
            )}
          </div>
        </div>
      </div>
    </Window>
  );

}
// 'use client';

// import { useRef, useEffect, useState, useCallback } from 'react';
// import { useAppStore } from '@/lib/store';
// import { translations } from '@/lib/translations';
// import {
//   getTemperatureAtPixel,
//   COLOR_PALETTES,
//   ThermalData, // Added for prop typing
//   processThermalBmpFromServer,
//   processThermalDataFromCSV, // New import for CSV processing
//   ThermalImage, // For constructing the new image object
//   renderThermalCanvas // Ensure this is imported
// } from '@/lib/thermal-utils';
// import Window from './Window';
// // import ThermalImageRenderer from './ThermalImageRenderer'; // Import the new component
// import { Button } from '@/components/ui/button';
// import { 
//   MousePointer, 
//   MapPin, 
//   Minus, 
//   Square, 
//   Circle, 
//   Pentagon, 
//   Thermometer,
//   ZoomIn,
//   ZoomOut,
//   RotateCcw,
//   Upload
// } from 'lucide-react';
// import { cn, generateId } from '@/lib/utils';

// export default function ThermalViewer() {
//   const {
//     language,
//     images,
//     activeImageId,
//     currentPalette,
//     customMinTemp,
//     customMaxTemp,
//     thermalView,
//     activeTool,
//     markers,
//     regions,
//     setThermalZoom,
//     setThermalPan,
//     setActiveTool,
//     setPalette,
//     addImage,
//     addMarker,
//     addRegion,
//     setActiveImage
//   } = useAppStore();
  
//   const { zoom, panX, panY } = thermalView;

//   const t = translations[language];
//   const mainCanvasRef = useRef<HTMLCanvasElement>(null); // Added this line
//   const overlayCanvasRef = useRef<HTMLCanvasElement>(null); // New overlay canvas
//   const containerRef = useRef<HTMLDivElement>(null);
//   const [mousePos, setMousePos] = useState({ x: 0, y: 0 }); // Will store image coordinates
//   const [currentTemp, setCurrentTemp] = useState<number | null>(null);
//   const [isDragging, setIsDragging] = useState(false);
//   const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
//   const [isDrawing, setIsDrawing] = useState(false);
//   const [currentRegion, setCurrentRegion] = useState<{ points: { x: number; y: number }[] } | null>(null);

//   const activeImage = images.find(img => img.id === activeImageId);
//   const palette = COLOR_PALETTES[currentPalette];

// //    برای رندر کردن تصویر حرارتی  

//   useEffect(() => {
//     const canvas = mainCanvasRef.current;
//     if (!canvas) {
//       return;
//     }

//     // اگر تصویر از سرور آمده، ولی پالت یا محدوده دما تغییر کرده، دوباره رندر کن
//     const shouldRerender = activeImage?.thermalData && palette && (
//       customMinTemp !== null || 
//       customMaxTemp !== null || 
//       currentPalette !== 'iron' // اگر پالت تغییر کرده
//     );

//     if (activeImage?.serverRenderedThermalUrl && !shouldRerender) {
//       // استفاده از تصویر از پیش رندر شده سرور
//       console.log('[THERMAL_VIEWER] Using server-rendered thermal image.');
//       const img = new Image();
//       img.crossOrigin = "anonymous";
//       img.onload = () => {
//         canvas.width = img.width;
//         canvas.height = img.height;
//         const ctx = canvas.getContext('2d');
//         if (ctx) {
//           ctx.drawImage(img, 0, 0, img.width, img.height);
//         }
//       };
//       img.onerror = () => {
//         console.error('[THERMAL_VIEWER] Error loading server-provided thermal image.');
//         const ctx = canvas.getContext('2d');
//         if (ctx) {
//           ctx.clearRect(0, 0, canvas.width, canvas.height);
//         }
//       };
//       img.src = activeImage.serverRenderedThermalUrl;
//     } else if (activeImage?.thermalData && palette) {
//       // رندر کلاینت‌ساید با پالت و محدوده دمای انتخابی
//       console.log('[THERMAL_VIEWER] Client-side rendering with palette:', currentPalette);
//       renderThermalCanvas(
//         canvas,
//         activeImage.thermalData,
//         palette,
//         customMinTemp ?? activeImage.thermalData.minTemp,
//         customMaxTemp ?? activeImage.thermalData.maxTemp
//       );
//     } else {
//       // پاک کردن canvas اگر هیچ داده‌ای نیست
//       console.log('[THERMAL_VIEWER] No thermal data to render, clearing canvas.');
//       const ctx = canvas.getContext('2d');
//       if (ctx) {
//         ctx.clearRect(0, 0, canvas.width, canvas.height);
//       }
//     }
//   }, [activeImage, palette, customMinTemp, customMaxTemp, currentPalette]);

//   // Effect for logging active image changes
//   useEffect(() => {
//     if (activeImage) {
//       console.log(`[THERMAL_VIEWER_STATE] Active image changed: ID=${activeImage.id}, Name=${activeImage.name}`);
//       console.log(`[THERMAL_VIEWER_STATE] RealImage URL: ${activeImage.realImage}`);
//       if (activeImage.thermalData) {
//         console.log(`[THERMAL_VIEWER_STATE] ThermalData: Width=${activeImage.thermalData.width}, Height=${activeImage.thermalData.height}, MinT=${activeImage.thermalData.minTemp}, MaxT=${activeImage.thermalData.maxTemp}`);
//       } else {
//         console.log('[THERMAL_VIEWER_STATE] Active image has no thermalData.');
//       }
//     } else {
//       console.log('[THERMAL_VIEWER_STATE] No active image.');
//     }
//   }, [activeImage]);

//   // renderThermal and its useEffect will be removed, handled by ThermalImageRenderer

//   useEffect(() => {
//     const canvas = mainCanvasRef.current;
//     if (!canvas) {
//       return;
//     }

//     if (activeImage?.serverRenderedThermalUrl) {
//       console.log('[THERMAL_VIEWER] Rendering server-provided thermal image.');
//       const img = new Image();
//       img.crossOrigin = "anonymous"; // Good practice for cross-origin images
//       img.onload = () => {
//         canvas.width = img.width;
//         canvas.height = img.height;
//         const ctx = canvas.getContext('2d');
//         if (ctx) {
//           ctx.drawImage(img, 0, 0, img.width, img.height);
//         }
//       };
//       img.onerror = () => {
//         console.error('[THERMAL_VIEWER] Error loading server-provided thermal image.');
//         // Optionally, clear canvas or fall back to client rendering if desired
//         const ctx = canvas.getContext('2d');
//         if (ctx) {
//           ctx.clearRect(0, 0, canvas.width, canvas.height);
//         }
//       };
//       img.src = activeImage.serverRenderedThermalUrl;
//     } else if (activeImage?.thermalData && palette) {
//       console.log('[THERMAL_VIEWER] Rendering thermal image with client-side palette.');
//       renderThermalCanvas(
//         canvas,
//         activeImage.thermalData,
//         palette, // This is COLOR_PALETTES[currentPalette]
//         customMinTemp ?? activeImage.thermalData.minTemp,
//         customMaxTemp ?? activeImage.thermalData.maxTemp
//       );
//     } else {
//       // Clear canvas if no image data or server URL
//       console.log('[THERMAL_VIEWER] No thermal data to render, clearing canvas.');
//       const ctx = canvas.getContext('2d');
//       if (ctx) {
//         ctx.clearRect(0, 0, canvas.width, canvas.height);
//       }
//     }
//   }, [activeImage, palette, customMinTemp, customMaxTemp]); // Dependencies: activeImage, palette, and temp overrides

//   const handleFileUpload = useCallback(async (files: FileList) => {
//   for (let i = 0; i < files.length; i++) {
//     const file = files[i];

//     try {
//       const formData = new FormData();
//       formData.append('file', file);

//       // Use dynamic server URL for desktop app
//       const serverUrl = process.env.NODE_ENV === 'development'
//         ? 'http://localhost:8080'
//         : 'http://127.0.0.1:8080';

//       console.log(`[UPLOAD] Uploading file to: ${serverUrl}/api/thermal`);

//       const res = await fetch(`${serverUrl}/api/thermal`, {
//         method: 'POST',
//         body: formData,
//         mode: 'cors',
//         credentials: 'omit'
//       });

//       // It's good practice to check for res.ok before calling res.json()
//       if (!res.ok) {
//         // Try to get error message from server response body if possible
//         let errorMsg = `Server error: ${res.status} ${res.statusText}`;
//         try {
//             const errorResult = await res.json();
//             errorMsg = errorResult.message || errorMsg;
//         } catch (jsonError) {
//             // Could not parse JSON body, stick with status text
//         }
//         throw new Error(errorMsg);
//       }

//       const result = await res.json();
//       console.log('[UPLOAD] Server response:', result);

//       if (!result.success) {
//         throw new Error(result.message || 'Server processing failed');
//       }

//       const thermalResult = result.images?.find((img: any) => img.type === 'thermal');
//       const realResult = result.images?.find((img: any) => img.type === 'real');

//       // Proceed if either a thermal or a real image URL is found
//       if (thermalResult?.url || realResult?.url) {
//         let thermalData: ThermalData | null = null;

//         // استفاده از CSV برای دقت بالاتر
//         if (thermalResult?.csv_url) {
//           try {
//             console.log(`[UPLOAD] Processing thermal data from CSV: ${thermalResult.csv_url}`);

//             // ساخت metadata از اطلاعات سرور
//             const metadata = {
//               emissivity: thermalResult.metadata?.emissivity ?? 0.95,
//               ambientTemp: thermalResult.metadata?.reflected_temp ?? 20,
//               reflectedTemp: thermalResult.metadata?.reflected_temp ?? 20,
//               humidity: 0.5,
//               distance: 1.0,
//               cameraModel: thermalResult.metadata?.device || 'Thermal Camera',
//               timestamp: thermalResult.metadata?.captured_at
//                 ? new Date(thermalResult.metadata.captured_at)
//                 : new Date()
//             };

//             thermalData = await processThermalDataFromCSV(thermalResult.csv_url, metadata);
//             console.log('[UPLOAD] Thermal data processed from CSV successfully');
//           } catch (csvErr) {
//             console.error(`[UPLOAD] Failed to process CSV, falling back to BMP:`, csvErr);
//             // Fallback به BMP
//             if (thermalResult?.url) {
//               try {
//                 thermalData = await processThermalBmpFromServer(thermalResult.url);
//               } catch (bmpErr) {
//                 console.error(`[UPLOAD] BMP fallback also failed:`, bmpErr);
//               }
//             }
//           }
//         } else if (thermalResult?.url) {
//           // اگر CSV نیست، از BMP استفاده کن
//           try {
//             console.log(`[UPLOAD] Processing thermal image from BMP: ${thermalResult.url}`);
//             thermalData = await processThermalBmpFromServer(thermalResult.url);
//           } catch (thermalErr) {
//             console.error(`[UPLOAD] Failed to process thermal BMP:`, thermalErr);
//           }
//         } else {
//           console.log('[UPLOAD] No thermal data source found (neither CSV nor BMP).');
//         }

//         const realImageUrl = realResult?.url ?? null;
//         if (!realImageUrl) {
//             console.log('[UPLOAD] No real image URL found in server response.');
//         } else {
//             console.log(`[UPLOAD] Real image URL from server: ${realImageUrl}`);
//         }

//         const newImageId = generateId();
//         const newImage: ThermalImage = {
//           id: newImageId,
//           name: file.name,
//           thermalData: thermalData,
//           realImage: realImageUrl,
//           serverRenderedThermalUrl: thermalResult?.url ?? null,
//         };

//         console.log('[UPLOAD] Adding new image to store:', {
//           id: newImage.id,
//           name: newImage.name,
//           hasThermalData: !!newImage.thermalData,
//           hasRealImage: !!newImage.realImage,
//           thermalDataSource: thermalResult?.csv_url ? 'CSV' : 'BMP'
//         });

//         addImage(newImage);
//         setActiveImage(newImage.id);

//       } else {
//         console.warn('[UPLOAD] Server response did not contain thermal or real image URLs for file:', file.name, result);
//         throw new Error('Server did not return valid image URLs.');
//       }
//     } catch (err: any) {
//       console.error('[UPLOAD] File upload or processing failed for file:', file.name, err);
//       // TODO: Show error toast to user
//       alert(`Upload failed for ${file.name}: ${err.message}`);
//     }
//   }
// }, [addImage, setActiveImage]);
 
//   const handleDrop = useCallback((e: React.DragEvent) => {
//     e.preventDefault();
//     const files = e.dataTransfer.files;
//     if (files.length > 0) {
//       handleFileUpload(files);
//     }
//   }, [handleFileUpload]);

//   const handleFileSelect = useCallback(() => {
//     const input = document.createElement('input');
//     input.type = 'file';
//     input.accept = '.bmt,.bmp,.jpg,.jpeg,.png,.tiff,.tif';
//     input.multiple = true;
//     input.onchange = (e) => {
//       const files = (e.target as HTMLInputElement).files;
//       if (files) {
//         handleFileUpload(files);
//       }
//     };
//     input.click();
//   }, [handleFileUpload]);

//   // Combined event handler for container (panning, and initial drawing clicks)
//   const handleContainerMouseMove = useCallback((e: React.MouseEvent) => {
//     if (!activeImage?.thermalData) return;

//     if (isDragging && activeTool === 'cursor') {
//       const deltaX = e.clientX - dragStart.x;
//       const deltaY = e.clientY - dragStart.y;
//       setThermalPan(panX + deltaX, panY + deltaY);
//       setDragStart({ x: e.clientX, y: e.clientY });
//       return; // Panning should not update mousePos for temperature or drawing
//     }

//     // For drawing tools, calculate image coordinates from container event
//     // This is used when drawing starts or continues outside ThermalImageRenderer's direct callbacks
//     // (e.g. dragging to define a rectangle)
//     if (containerRef.current && (isDrawing || activeTool !== 'cursor')) {
//         const rect = containerRef.current.getBoundingClientRect();
//         // These are coordinates relative to the container, need to be scaled and panned inversely
//         const eventX = e.clientX - rect.left;
//         const eventY = e.clientY - rect.top;

//         // Transform container coordinates to image coordinates
//         const imgX = (eventX - panX) / zoom;
//         const imgY = (eventY - panY) / zoom;

//         setMousePos({ x: imgX, y: imgY }); // Update mousePos for tooltips, status bar

//         // If actively drawing a region, update the currentRegion's last point
//         if (isDrawing && currentRegion && (activeTool === 'rectangle' || activeTool === 'polygon')) {
//             setCurrentRegion({
//                 points: [...currentRegion.points.slice(0, -1), { x: imgX, y: imgY }]
//             });
//         }
//     }
//   }, [activeImage, zoom, panX, panY, isDragging, dragStart, activeTool, setThermalPan, isDrawing, currentRegion, setCurrentRegion]); // Added setCurrentRegion to dependencies


//   // const handlePixelHoverFromRenderer = useCallback((imgX: number, imgY: number, temp: number | null) => {
//   //   setMousePos({ x: imgX, y: imgY }); // Store true image coordinates
//   //   setCurrentTemp(temp);

//   //   // If actively drawing a region, update the currentRegion's last point
//   //   // This ensures smooth drawing even if mouse leaves the renderer canvas but is still over the general area
//   //   // Note: This might be redundant if handleContainerMouseMove covers it, but good for precision.
//   //   if (isDrawing && currentRegion && (activeTool === 'rectangle' || activeTool === 'polygon')) {
//   //     setCurrentRegion({
//   //       points: [...currentRegion.points.slice(0, -1), { x: imgX, y: imgY }]
//   //     });
//   //   }
//   // }, [isDrawing, currentRegion, activeTool]);


//   const handleContainerMouseDown = useCallback((e: React.MouseEvent) => {
//     if (!activeImage?.thermalData || !containerRef.current) return;

//     const rect = containerRef.current.getBoundingClientRect();
//     const eventX = e.clientX - rect.left;
//     const eventY = e.clientY - rect.top;
//     // These are coordinates relative to the container, need to be scaled and panned inversely
//     const imgX = (eventX - panX) / zoom;
//     const imgY = (eventY - panY) / zoom;

//     if (activeTool === 'cursor') {
//       setIsDragging(true);
//       setDragStart({ x: e.clientX, y: e.clientY });
//     } else if (activeTool === 'rectangle' && !isDrawing) {
//       setIsDrawing(true);
//       // Initial point for rectangle, second point will be updated by mouse move
//       setCurrentRegion({ points: [{ x: imgX, y: imgY }, { x: imgX, y: imgY }] });
//     } else if (activeTool === 'polygon') {
//       if (!isDrawing) {
//         setIsDrawing(true);
//         // First point of polygon
//         setCurrentRegion({ points: [{ x: imgX, y: imgY }] });
//       }
//       // Subsequent points for polygon are added by handleMainCanvasClick
//       // No need to add points here for polygon after the first one
//     }
//   }, [activeTool, activeImage, zoom, panX, panY, isDrawing, setDragStart, setIsDragging, setCurrentRegion]); // Removed currentRegion from deps as it's not used for decision making here directly for polygon point addition

//   // const handlePixelClickFromRenderer = useCallback((imgX: number, imgY: number, temp: number | null) => {
//   //   if (!activeImage?.thermalData) return;

//   //   if (activeTool === 'point' && temp !== null) {
//   //     const marker = {
//   //       id: generateId(),
//   //       type: 'point' as const,
//   //       x: imgX, // Use direct image coordinates
//   //       y: imgY,
//   //       temperature: temp,
//   //       label: `Point ${markers.length + 1}`,
//   //       emissivity: 0.95 // Or from global/local settings
//   //     };
//   //     addMarker(marker);
//   //   } else if (activeTool === 'polygon' && isDrawing && currentRegion) {
//   //     // Add point to polygon
//   //      setCurrentRegion({
//   //        points: [...currentRegion.points, { x: imgX, y: imgY }]
//   //      });
//   //   }
//   //   // Other click-based tool logic can be added here
//   // }, [activeTool, activeImage, markers, addMarker, isDrawing, currentRegion, setCurrentRegion]);

//   const handleMainCanvasMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
//     if (!mainCanvasRef.current || !activeImage?.thermalData) {
//       setCurrentTemp(null); // Clear temp if no canvas or data
//       return;
//     }

//     const canvas = mainCanvasRef.current;
//     const rect = canvas.getBoundingClientRect();

//     const scaleX = canvas.width / rect.width;    // relationship of actual canvas width to displayed width
//     const scaleY = canvas.height / rect.height;  // relationship of actual canvas height to displayed height

//     const canvasX = (e.clientX - rect.left) * scaleX;
//     const canvasY = (e.clientY - rect.top) * scaleY;

//     setMousePos({ x: canvasX, y: canvasY });

//     const temp = getTemperatureAtPixel(activeImage.thermalData, canvasX, canvasY);
//     setCurrentTemp(temp);

//     if (isDrawing && currentRegion && (activeTool === 'rectangle' || activeTool === 'polygon')) {
//       setCurrentRegion((prevRegion) => {
//         if (!prevRegion) return null;
//         const updatedPoints = [...prevRegion.points.slice(0, -1), { x: canvasX, y: canvasY }];
//         return { ...prevRegion, points: updatedPoints };
//       });
//     }
//   }, [activeImage, activeTool, isDrawing, currentRegion, setCurrentTemp, setMousePos, getTemperatureAtPixel, setCurrentRegion]); // Added setCurrentRegion

//   const handleMainCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
//     if (!mainCanvasRef.current || !activeImage?.thermalData) return;

//     const canvas = mainCanvasRef.current;
//     const rect = canvas.getBoundingClientRect();

//     const scaleX = canvas.width / rect.width;
//     const scaleY = canvas.height / rect.height;

//     const canvasX = (e.clientX - rect.left) * scaleX;
//     const canvasY = (e.clientY - rect.top) * scaleY;

//     if (activeTool === 'point') {
//       const temp = getTemperatureAtPixel(activeImage.thermalData, canvasX, canvasY);
//       if (temp !== null) {
//         const marker = {
//           id: generateId(),
//           type: 'point' as const,
//           x: canvasX,
//           y: canvasY,
//           temperature: temp,
//           label: `Point ${markers.length + 1}`,
//           emissivity: 0.95,
//           imageId: activeImage.id,
//         };
//         addMarker(marker);
//       }
//     } else if (activeTool === 'polygon' && isDrawing && currentRegion) {
//       // This adds a new point to the polygon for each click on the canvas
//       // The very first point is initiated by handleContainerMouseDown
//       setCurrentRegion((prevRegion) => {
//         if (!prevRegion) return null;
//         // Add the new click point, and also a new point for the mouse to continue drawing the "rubber band"
//         return { ...prevRegion, points: [...prevRegion.points, { x: canvasX, y: canvasY }] };
//       });
//     }
//   }, [activeImage, activeTool, markers, addMarker, isDrawing, currentRegion, setCurrentRegion, getTemperatureAtPixel, generateId]); // Added getTemperatureAtPixel, generateId

//   const handleMainCanvasMouseLeave = useCallback(() => {
//       setCurrentTemp(null);
//       // setMousePos({ x: 0, y: 0 }); // Optional: reset mousePos if needed
//   }, [setCurrentTemp]);

//   const calculateRegionTemperatures = (thermalData: any, points: { x: number; y: number }[], type: string) => {
//     const temps: number[] = [];

//     if (type === 'rectangle' && points.length === 2) {
//       const [p1, p2] = points;
//       const minX = Math.floor(Math.min(p1.x, p2.x));
//       const maxX = Math.ceil(Math.max(p1.x, p2.x));
//       const minY = Math.floor(Math.min(p1.y, p2.y));
//       const maxY = Math.ceil(Math.max(p1.y, p2.y));

//       for (let y = minY; y <= maxY; y++) {
//         for (let x = minX; x <= maxX; x++) {
//           const temp = getTemperatureAtPixel(thermalData, x, y);
//           if (temp !== null) temps.push(temp);
//         }
//       }
//     }

//     if (temps.length === 0) return { min: 0, max: 0, avg: 0 };

//     return {
//       min: Math.min(...temps),
//       max: Math.max(...temps),
//       avg: temps.reduce((sum, temp) => sum + temp, 0) / temps.length
//     };
//   };

//   const calculateRectangleArea = (points: { x: number; y: number }[]) => {
//     if (points.length !== 2) return 0;
//     const [p1, p2] = points;
//     return Math.abs((p2.x - p1.x) * (p2.y - p1.y));
//   };

//   const calculatePolygonArea = (points: { x: number; y: number }[]) => {
//     if (points.length < 3) return 0;
//     let area = 0;
//     for (let i = 0; i < points.length; i++) {
//       const j = (i + 1) % points.length;
//       area += points[i].x * points[j].y;
//       area -= points[j].x * points[i].y;
//     }
//     return Math.abs(area) / 2;
//   };

//   const handleContainerMouseUp = useCallback(() => {
//     setIsDragging(false);

//     if (activeTool === 'rectangle' && isDrawing && currentRegion && currentRegion.points.length === 2 && activeImage) {
//       // Validate points to ensure width/height > 0 before finalizing
//       if (currentRegion.points[0].x === currentRegion.points[1].x || currentRegion.points[0].y === currentRegion.points[1].y) {
//           setIsDrawing(false);
//           setCurrentRegion(null);
//           return; // Ignore zero-area rectangles
//       }
//       const region = {
//         id: generateId(),
//         type: 'rectangle'as const,
//         points: currentRegion.points, // These are already image coordinates
//         minTemp: 0,
//         maxTemp: 0,
//         avgTemp: 0,
//         area: 0,
//         label: `Rectangle ${regions.length + 1}`,
//         emissivity: 0.95,
//         imageId: activeImage.id // Associate region with the active image
//       };

//       // Calculate temperature statistics for the region
//       if (activeImage.thermalData) {
//         const temps = calculateRegionTemperatures(activeImage.thermalData, currentRegion.points, 'rectangle');
//         region.minTemp = temps.min;
//         region.maxTemp = temps.max;
//         region.avgTemp = temps.avg;
//         region.area = calculateRectangleArea(currentRegion.points);
//       }

//       addRegion(region);
//       setIsDrawing(false);
//       setCurrentRegion(null);
//     }
//     // Note: Point marker placement is now in handlePixelClickFromRenderer

//   }, [activeTool, activeImage, regions, addRegion, isDrawing, currentRegion, calculateRegionTemperatures, calculateRectangleArea]);

//   const handleContainerDoubleClick = useCallback(() => {
//     if (activeTool === 'polygon' && isDrawing && currentRegion && currentRegion.points.length >= 3 && activeImage) {
//       // Validate points before finalizing. For polygons, the last point is a temporary "rubber-band" point from mouse move.
//       // The actual click that adds a persistent point is handleMainCanvasClick.
//       // Double click finalizes, so we might have one extra point from the move before double click.
//       let finalPoints = currentRegion.points;
//       if (finalPoints.length > 1 && (activeTool === 'polygon')) { // For polygon, the last point is often the moving cursor pos
//          // Check if the last point is very close to the second to last; if so, it might be a byproduct of click + move
//          // However, a simpler approach is to rely on the user having clicked to place the points they want.
//          // The double click itself doesn't add a point, it finalizes the existing ones.
//          // If handleMainCanvasClick adds a point and then handleContainerMouseMove adds one before dblclick,
//          // we might have an extra point. The logic in handleMainCanvasClick for polygon adds a point.
//          // The logic in handleContainerMouseMove for polygon updates the *last* point.
//          // The logic in handleContainerMouseDown for polygon adds the *first* point, or if already drawing, it used to add subsequent points.
//          // Now, subsequent points for polygon are primarily added by handleMainCanvasClick.
//          // Let's assume points in currentRegion are the ones to save, potentially removing the last if it's a duplicate from drawing.
//          // A robust way is to remove the last point if it was just for "rubber-banding"
//          // The prompt suggests `currentRegion.points.slice(0, -1)`. This implies the last point is always temporary.
//          // This needs to be consistent with how points are added.
//          // If `handleMainCanvasClick` adds point `N` and `handleMainCanvasMouseMove` updates point `N+1` (temporary)
//          // then `slice(0,-1)` would remove the temporary point.
//          // If `handleContainerMouseDown` adds point 1.
//          // `handleMainCanvasClick` adds point 2. `currentRegion` is {P1, P2}. MouseMove updates P3. `currentRegion` is {P1, P2, P_move}.
//          // `handleMainCanvasClick` adds point 3. `currentRegion` is {P1, P2, P3}. MouseMove updates P4. `currentRegion` is {P1, P2, P3, P_move}.
//          // Double click: `finalPoints = currentRegion.points.slice(0, -1)` would be {P1, P2, P3}. This seems correct.
//          finalPoints = currentRegion.points.slice(0, -1);
//       }


//       if (finalPoints.length < 3) { // Ensure at least 3 points for a polygon
//           setIsDrawing(false);
//           setCurrentRegion(null);
//           return;
//       }

//       const region = {
//         id: generateId(),
//         type: 'polygon' as const,
//         points: finalPoints,
//         minTemp: 0,
//         maxTemp: 0,
//         avgTemp: 0,
//         area: 0,
//         label: `Polygon ${regions.length + 1}`,
//         emissivity: 0.95,
//         imageId: activeImage.id // Associate region with the active image
//       };

//       // Calculate temperature statistics for the region
//       if (activeImage.thermalData) {
//         const temps = calculateRegionTemperatures(activeImage.thermalData, currentRegion.points, 'polygon');
//         region.minTemp = temps.min;
//         region.maxTemp = temps.max;
//         region.avgTemp = temps.avg;
//         region.area = calculatePolygonArea(currentRegion.points);
//       }

//       addRegion(region);
//       setIsDrawing(false);
//       setCurrentRegion(null);
//     }
//   }, [activeTool, isDrawing, currentRegion, regions.length, addRegion, activeImage, calculateRegionTemperatures, calculatePolygonArea]);

//   const handleZoomIn = () => setThermalZoom(Math.min(zoom * 1.2, 5));
//   const handleZoomOut = () => setThermalZoom(Math.max(zoom / 1.2, 0.1));
//   const handleResetView = () => {
//     setThermalZoom(1);
//     setThermalPan(0, 0);
//   };

//   const tools = [
//     { id: 'cursor', icon: MousePointer, name: t.cursor },
//     { id: 'point', icon: MapPin, name: t.point },
//     { id: 'line', icon: Minus, name: t.line },
//     { id: 'rectangle', icon: Square, name: t.rectangle },
//     { id: 'circle', icon: Circle, name: t.circle },
//     { id: 'polygon', icon: Pentagon, name: t.polygon },
//     { id: 'isotherm', icon: Thermometer, name: t.isotherm },
//   ];

//   return (
//     <Window id="thermal-viewer" title={t.thermalViewer}>
//       <div className="flex flex-col h-full">
//         {/* Toolbar */}
//         <div className="flex items-center justify-between p-2 bg-gray-750 border-b border-gray-600">
//           <div className="flex items-center space-x-1">
//             {tools.map((tool) => (
//               <Button
//                 key={tool.id}
//                 variant={activeTool === tool.id ? "default" : "ghost"}
//                 size="sm"
//                 className="h-8 w-8 p-0"
//                 onClick={() => setActiveTool(tool.id)}
//                 title={tool.name}
//               >
//                 <tool.icon className="w-4 h-4" />
//               </Button>
//             ))}
//           </div>

//           <div className="flex items-center space-x-2">
//             {/* Color Palette Selector */}
//             {activeImage?.thermalData && (
//               <div className="flex items-center space-x-1 px-2 border-r border-gray-600">
//                 <Thermometer className="w-3 h-3 text-gray-400" />
//                 <select
//                   value={currentPalette}
//                   onChange={(e) => setPalette(e.target.value)}
//                   className="text-xs bg-gray-700 text-gray-300 border border-gray-600 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
//                   title="Color Palette"
//                 >
//                   {Object.entries(COLOR_PALETTES).map(([key, palette]) => (
//                     <option key={key} value={key}>
//                       {palette.name}
//                     </option>
//                   ))}
//                 </select>
//               </div>
//             )}

//             {/* Zoom Controls */}
//             <Button
//               variant="ghost"
//               size="sm"
//               className="h-8 w-8 p-0"
//               onClick={handleZoomOut}
//               title={t.zoomOut}
//             >
//               <ZoomOut className="w-4 h-4" />
//             </Button>
//             <span className="text-xs text-gray-400 min-w-[3rem] text-center">
//               {Math.round(zoom * 100)}%
//             </span>
//             <Button
//               variant="ghost"
//               size="sm"
//               className="h-8 w-8 p-0"
//               onClick={handleZoomIn}
//               title={t.zoomIn}
//             >
//               <ZoomIn className="w-4 h-4" />
//             </Button>
//             <Button
//               variant="ghost"
//               size="sm"
//               className="h-8 w-8 p-0"
//               onClick={handleResetView}
//               title={t.resetZoom}
//             >
//               <RotateCcw className="w-4 h-4" />
//             </Button>
//           </div>
//         </div>

//         {/* Canvas Container */}
//         <div 
//           ref={containerRef}
//           className="flex-1 relative overflow-hidden bg-gray-900"
//           onDrop={handleDrop}
//           onDragOver={(e) => e.preventDefault()}
//           // Mouse events for panning and initiating drawing are on this container
//           onMouseMove={handleContainerMouseMove}
//           onMouseDown={handleContainerMouseDown}
//           onMouseUp={handleContainerMouseUp}
//           onDoubleClick={handleContainerDoubleClick}
//           onMouseLeave={() => {
//             // setIsDragging(false); // Keep dragging if mouse leaves container but button is still pressed
//             // setCurrentTemp(null); // Temperature is now tied to renderer hover
//           }}
//         >
//           {activeImage?.thermalData ? (
//             <div // This div will be scaled and panned
//               className={cn(
//                   activeTool === 'cursor' ? 'cursor-grab' : 'cursor-crosshair',
//                   isDragging && activeTool === 'cursor' && 'cursor-grabbing'
//               )}
//               style={{
//                 width: activeImage.thermalData.width,
//                 height: activeImage.thermalData.height,
//                 transform: `scale(${zoom}) translate(${panX / zoom}px, ${panY / zoom}px)`,
//                 transformOrigin: '0 0',
//                 position: 'relative', // For absolute positioning of overlays
//               }}
//             >
//               {/* The main canvas for thermal image rendering */}
//               <canvas
//                 ref={mainCanvasRef}
//                 // The style for width/height of the canvas itself will be set via canvas.width/height attributes
//                 // It should be positioned absolutely or relatively within its parent div as needed
//                 // Add mouse move/click handlers for temperature reading and marker placement later in step 2
//                 style={{
//                   display: 'block', // Good practice for canvas
//                   width: '100%', // Display size (CSS pixels)
//                   height: '100%', // Display size (CSS pixels)
//                   // The actual rendering resolution is set by canvas.width and canvas.height in the effect
//                 }}
//                 onMouseMove={handleMainCanvasMouseMove} // New handler
//                 onClick={handleMainCanvasClick}       // New handler
//                 onMouseLeave={handleMainCanvasMouseLeave} // New handler
//               />
//               {/* Keep the overlayCanvas for markers/regions if it's separate */}
//               <canvas
//                 ref={overlayCanvasRef}
//                 width={activeImage.thermalData.width} // This should be fine, it's for overlay
//                 height={activeImage.thermalData.height} // This should be fine, it's for overlay
//                 className="absolute top-0 left-0 pointer-events-none"
//               />
              
//               {/* Enhanced Temperature Tooltip - shows detailed CSV data */}
//               {currentTemp !== null && mousePos.x > 0 && mousePos.y > 0 && ( // also check mousePos is valid
//                 <div
//                   className="absolute bg-black/95 text-white text-xs px-3 py-2 rounded-lg pointer-events-none z-10 shadow-xl border border-gray-500"
//                   style={{
//                     // Position based on image coordinates (mousePos) then apply container's transform
//                     left: mousePos.x + 15 / zoom, // Adjust offset based on zoom for consistent appearance
//                     top: mousePos.y - 100 / zoom,
//                     minWidth: '220px',
//                     backdropFilter: 'blur(4px)',
//                     // The parent div is scaled, so tooltip is positioned relative to unscaled image, then scaled with parent
//                   }}
//                 >
//                   <div className="space-y-1">
//                     <div className="font-bold text-yellow-400 border-b border-gray-600 pb-1 mb-1 flex items-center justify-between">
//                       <span>{t.thermalData || 'Thermal Data'}</span>
//                       <span className="text-[9px] text-gray-400 font-normal">
//                         {activeImage?.thermalData ? 'CSV' : 'BMP'}
//                       </span>
//                     </div>
//                     <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
//                       <span className="text-gray-300">Position:</span>
//                       <span className="font-mono text-xs">({Math.round(mousePos.x)}, {Math.round(mousePos.y)})</span>

//                       <span className="text-gray-300 font-semibold">{t.temperature || 'Temp'}:</span>
//                       <span className="font-mono text-yellow-300 font-bold">{currentTemp.toFixed(2)}°C</span>

//                       {activeImage?.thermalData?.metadata && (
//                         <>
//                           <span className="col-span-2 h-px bg-gray-700 my-0.5"></span>

//                           <span className="text-gray-300">{t.emissivity || 'Emissivity'}:</span>
//                           <span className="font-mono">{activeImage.thermalData.metadata.emissivity.toFixed(3)}</span>

//                           {activeImage.thermalData.metadata.ambientTemp !== undefined && (
//                             <>
//                               <span className="text-gray-300">{t.ambientTemp || 'Ambient'}:</span>
//                               <span className="font-mono">{activeImage.thermalData.metadata.ambientTemp.toFixed(1)}°C</span>
//                             </>
//                           )}

//                           {activeImage.thermalData.metadata.reflectedTemp !== undefined && (
//                             <>
//                               <span className="text-gray-300">Reflected:</span>
//                               <span className="font-mono">{activeImage.thermalData.metadata.reflectedTemp.toFixed(1)}°C</span>
//                             </>
//                           )}

//                           {activeImage.thermalData.metadata.humidity !== undefined && (
//                             <>
//                               <span className="text-gray-300">{t.humidity || 'Humidity'}:</span>
//                               <span className="font-mono">{(activeImage.thermalData.metadata.humidity * 100).toFixed(0)}%</span>
//                             </>
//                           )}

//                           {activeImage.thermalData.metadata.distance !== undefined && (
//                             <>
//                               <span className="text-gray-300">{t.distance || 'Distance'}:</span>
//                               <span className="font-mono">{activeImage.thermalData.metadata.distance.toFixed(1)}m</span>
//                             </>
//                           )}
//                         </>
//                       )}

//                       {/* Temperature Range */}
//                       {activeImage?.thermalData && (
//                         <>
//                           <span className="col-span-2 h-px bg-gray-700 my-0.5"></span>
//                           <span className="text-gray-300">Min/Max:</span>
//                           <span className="font-mono text-xs">
//                             {activeImage.thermalData.minTemp.toFixed(1)}°C / {activeImage.thermalData.maxTemp.toFixed(1)}°C
//                           </span>
//                         </>
//                       )}
//                     </div>
//                     {activeImage?.thermalData?.metadata?.cameraModel && (
//                       <div className="text-gray-400 text-[10px] mt-1 pt-1 border-t border-gray-700 flex items-center justify-between">
//                         <span>{activeImage.thermalData.metadata.cameraModel}</span>
//                         {activeImage.thermalData.metadata.timestamp && (
//                           <span className="text-gray-500">
//                             {new Date(activeImage.thermalData.metadata.timestamp).toLocaleDateString()}
//                           </span>
//                         )}
//                       </div>
//                     )}
//                   </div>
//                 </div>
//               )}

//               {/* Markers Overlay - positioned relative to the scaled/panned container */}
//               {markers.filter(m => m.imageId === activeImageId).map((marker) => (
//                 <div
//                   key={marker.id}
//                   className="absolute w-3 h-3 bg-red-500 border-2 border-white rounded-full pointer-events-none"
//                   style={{
//                     left: marker.x - 6 / zoom, // Adjust for marker size relative to zoom
//                     top: marker.y - 6 / zoom,
//                     // transform: `scale(${1/zoom})`, // Optionally counter-scale marker size
//                   }}
//                 />
//               ))}

//               {/* Regions Overlay - positioned relative to the scaled/panned container */}
//               {regions.filter(r => r.imageId === activeImageId).map((region) => {
//                 if (region.type === 'rectangle' && region.points.length === 2) {
//                   const [p1, p2] = region.points; // These are image coordinates
//                   const left = Math.min(p1.x, p2.x);
//                   const top = Math.min(p1.y, p2.y);
//                   const width = Math.abs(p2.x - p1.x);
//                   const height = Math.abs(p2.y - p1.y);
                  
//                   return (
//                     <div
//                       key={region.id}
//                       className="absolute border-2 border-blue-500 pointer-events-none"
//                       style={{
//                         left,
//                         top,
//                         width,
//                         height,
//                         backgroundColor: 'rgba(59, 130, 246, 0.1)'
//                       }}
//                     />
//                   );
//                 }
//                 // TODO: Add rendering for polygon regions if needed
//                 return null;
//               })}

//               {/* Current Drawing Region - positioned relative to the scaled/panned container */}
//               {isDrawing && currentRegion && activeTool === 'rectangle' && currentRegion.points.length === 2 && (
//                 <div
//                   className="absolute border-2 border-yellow-500 pointer-events-none"
//                   style={{
//                     left: Math.min(currentRegion.points[0].x, currentRegion.points[1].x),
//                     top: Math.min(currentRegion.points[0].y, currentRegion.points[1].y),
//                     width: Math.abs(currentRegion.points[1].x - currentRegion.points[0].x),
//                     height: Math.abs(currentRegion.points[1].y - currentRegion.points[0].y),
//                     backgroundColor: 'rgba(234, 179, 8, 0.1)'
//                   }}
//                 />
//               )}
//               {/* TODO: Add rendering for current polygon drawing if needed */}
//             </div>
//           ) : (
//             /* Upload Area - remains unchanged, displayed when no activeImage.thermalData */
//             <div
//                 className="flex flex-col items-center justify-center h-full text-gray-400"
//                 // Ensure drop/dragOver handlers are also on this placeholder
//                 onDrop={handleDrop}
//                 onDragOver={(e) => e.preventDefault()}
//             >
//               <Upload className="w-16 h-16 mb-4" />
//               <p className="text-lg mb-2">{t.uploadImage}</p>
//               <p className="text-sm mb-4">{t.dragDropHere}</p>
//               <p className="text-xs mb-4">{t.supportedFormats}</p>
//               <Button onClick={handleFileSelect} variant="outline">
//                 <Upload className="w-4 h-4 mr-2" />
//                 {t.importImage}
//               </Button>
//             </div>
//           )}
//         </div>

//         {/* Status Bar */}
//         <div className="h-6 bg-gray-750 border-t border-gray-600 flex items-center justify-between px-2 text-xs text-gray-400">
//           <div className="flex items-center space-x-4">
//             {currentTemp !== null && activeImage?.thermalData && ( // Only show temp if there's an image
//               <span>{t.temperature}: {currentTemp.toFixed(1)}°C</span>
//             )}
//             {activeImage?.thermalData && ( // Only show coords if there's an image
//               <span>X: {Math.round(mousePos.x)}, Y: {Math.round(mousePos.y)}</span>
//             )}
//             {isDrawing && activeImage?.thermalData && ( // Only show drawing status if there's an image
//               <span className="text-yellow-400">Drawing {activeTool}...</span>
//             )}
//           </div>
//           <div className="flex items-center space-x-4">
//             <span>{t.palette}: {palette?.name}</span>
//             {activeImage?.thermalData && (
//               <span>
//                 Min: {(customMinTemp ?? activeImage.thermalData.minTemp).toFixed(1)}°C -
//                 Max: {(customMaxTemp ?? activeImage.thermalData.maxTemp).toFixed(1)}°C
//               </span>
//             )}
//           </div>
//         </div>
//       </div>
//     </Window>
//   );

// }
