'use client';

import { useRef, useState, useCallback } from 'react';
import { useAppStore } from '@/lib/store';
import { translations } from '@/lib/translations';
import Window from './Window';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { 
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Eye,
  EyeOff,
  Layers,
  Image as ImageIcon
} from 'lucide-react';

export default function RgbImageViewer() {
  const {
    language,
    images,
    activeImageId,
    zoom,
    panX,
    panY,
    setZoom,
    setPan
  } = useAppStore();

  const t = translations[language];
  const imageRef = useRef<HTMLImageElement>(null);
  const [fusionMode, setFusionMode] = useState<'thermal' | 'visual' | 'overlay' | 'edge'>('visual');
  const [overlayOpacity, setOverlayOpacity] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const activeImage = images.find(img => img.id === activeImageId);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging) {
      const deltaX = e.clientX - dragStart.x;
      const deltaY = e.clientY - dragStart.y;
      setPan(panX + deltaX, panY + deltaY);
      setDragStart({ x: e.clientX, y: e.clientY });
    }
  }, [isDragging, dragStart, panX, panY, setPan]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  }, []);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleZoomIn = () => setZoom(Math.min(zoom * 1.2, 5));
  const handleZoomOut = () => setZoom(Math.max(zoom / 1.2, 0.1));
  const handleResetView = () => {
    setZoom(1);
    setPan(0, 0);
  };

  const fusionModes = [
    { id: 'thermal', icon: Eye, name: 'Thermal Only' },
    { id: 'visual', icon: Eye, name: 'Visual Only' },
    { id: 'overlay', icon: Layers, name: 'Overlay' },
    { id: 'edge', icon: EyeOff, name: 'Edge Fusion' },
  ];

  return (
    <Window id="rgb-image-viewer" title={t.rgbImageViewer} minWidth={400} minHeight={300}>
      <div className="flex flex-col h-full">
        {/* Toolbar */}
        <div className="flex items-center justify-between p-2 bg-gray-750 border-b border-gray-600">
          <div className="flex items-center space-x-1">
            {fusionModes.map((mode) => (
              <Button
                key={mode.id}
                variant={fusionMode === mode.id ? "default" : "ghost"}
                size="sm"
                className="h-8 px-2"
                onClick={() => setFusionMode(mode.id as any)}
              >
                <mode.icon className="w-4 h-4 mr-1" />
                {mode.name}
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

        {/* Overlay Controls */}
        {fusionMode === 'overlay' && (
          <div className="flex items-center space-x-2 p-2 bg-gray-750 border-b border-gray-600">
            <span className="text-xs text-gray-400">Opacity:</span>
            <Slider
              value={[overlayOpacity]}
              onValueChange={(value) => setOverlayOpacity(value[0])}
              max={100}
              step={1}
              className="flex-1 max-w-32"
            />
            <span className="text-xs text-gray-400 min-w-[3rem]">
              {overlayOpacity}%
            </span>
          </div>
        )}

        {/* Image Container */}
        <div className="flex-1 relative overflow-hidden bg-gray-900">
          {activeImage ? (
            <div
              className="absolute inset-0 cursor-move"
              onMouseMove={handleMouseMove}
              onMouseDown={handleMouseDown}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              {/* Show RGB image if available, otherwise show thermal */}
              {(fusionMode === 'visual' || fusionMode === 'overlay') && activeImage.rgbImage ? (
                <img
                  ref={imageRef}
                  src={activeImage.rgbImage}
                  alt="RGB Image"
                  className="absolute top-0 left-0 max-w-none"
                  style={{
                    transform: `scale(${zoom}) translate(${panX / zoom}px, ${panY / zoom}px)`,
                    transformOrigin: '0 0',
                    opacity: fusionMode === 'overlay' ? overlayOpacity / 100 : 1
                  }}
                  draggable={false}
                />
              ) : null}
              
              {/* Show thermal image */}
              {(fusionMode === 'thermal' || fusionMode === 'overlay') && activeImage.canvas && (
                <canvas
                  className="absolute top-0 left-0 max-w-none pointer-events-none"
                  style={{
                    transform: `scale(${zoom}) translate(${panX / zoom}px, ${panY / zoom}px)`,
                    transformOrigin: '0 0',
                    opacity: fusionMode === 'overlay' ? (100 - overlayOpacity) / 100 : 1,
                    mixBlendMode: fusionMode === 'overlay' ? 'multiply' : 'normal'
                  }}
                  width={activeImage.canvas.width}
                  height={activeImage.canvas.height}
                  ref={(canvas) => {
                    if (canvas && activeImage.canvas) {
                      const ctx = canvas.getContext('2d');
                      const sourceCtx = activeImage.canvas.getContext('2d');
                      if (ctx && sourceCtx) {
                        canvas.width = activeImage.canvas.width;
                        canvas.height = activeImage.canvas.height;
                        ctx.drawImage(activeImage.canvas, 0, 0);
                      }
                    }
                  }}
                />
              )}

              {/* Fallback if no RGB image */}
              {!activeImage.rgbImage && fusionMode === 'visual' && (
                <div className="flex items-center justify-center h-full text-gray-400">
                  <div className="text-center">
                    <ImageIcon className="w-16 h-16 mx-auto mb-4" />
                    <p className="text-lg mb-2">No RGB Image Available</p>
                    <p className="text-sm">This thermal image doesn&apos;t contain an embedded RGB photo</p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400">
              <div className="text-center">
                <ImageIcon className="w-16 h-16 mx-auto mb-4" />
                <p className="text-lg mb-2">No Image Selected</p>
                <p className="text-sm">Upload a thermal image to view it here</p>
              </div>
            </div>
          )}
        </div>

        {/* Status Bar */}
        <div className="h-6 bg-gray-750 border-t border-gray-600 flex items-center justify-between px-2 text-xs text-gray-400">
          <div className="flex items-center space-x-4">
            <span>Mode: {fusionMode}</span>
            {fusionMode === 'overlay' && (
              <span>Opacity: {overlayOpacity}%</span>
            )}
          </div>
          <div className="flex items-center space-x-4">
            <span>Zoom: {Math.round(zoom * 100)}%</span>
            {activeImage && (
              <span>Image: {activeImage.name}</span>
            )}
          </div>
        </div>
      </div>
    </Window>
  );
}