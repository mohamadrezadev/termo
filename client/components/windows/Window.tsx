'use client';

import { ReactNode, useRef, useEffect, useState } from 'react';
import { Rnd } from 'react-rnd';
import { useAppStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { X, Minimize2, Maximize2, Shrink } from 'lucide-react';

interface WindowProps {
  id: string;
  title: string;
  children: ReactNode;
  minWidth?: number;
  minHeight?: number;
  gridMode?: boolean;
}

export default function Window({ 
  id, 
  title, 
  children, 
  minWidth = 300, 
  minHeight = 200,
  gridMode = false
}: WindowProps) {
  const { 
    windows, 
    updateWindow, 
    bringWindowToFront, 
    toggleWindow 
  } = useAppStore();
  
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  const windowRef = useRef<HTMLDivElement>(null);
  const window = windows.find(w => w.id === id);

  console.log('[Window]', id, {
    found: !!window,
    isOpen: window?.isOpen,
    gridMode,
    windowsCount: windows.length
  });

  useEffect(() => {
    if (windowRef.current && window && windowRef.current.style) {
      windowRef.current.style.zIndex = window.zIndex.toString();
    }
  }, [window?.zIndex, windowRef.current]);

  if (!window || !window.isOpen) {
    return null;
  }

  const handleMouseDown = () => {
    bringWindowToFront(id);
  };

  const handleClose = () => {
    toggleWindow(id);
  };

  const handleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  // Grid mode rendering (non-draggable, tiled layout)
  if (gridMode) {
    return (
      <div 
        className={`bg-card border-2 border-primary/20 rounded-xl shadow-glow overflow-hidden h-full flex flex-col transition-all duration-300 hover:shadow-glow-lg hover:border-primary/40 ${
          isFullscreen ? 'fixed inset-0 z-[9999] rounded-none' : ''
        }`}
        style={isFullscreen ? {} : { zIndex: window.zIndex }}
      >
        {/* Window Header */}
        <div className="flex items-center justify-between h-8 bg-gradient-to-r from-primary/10 to-secondary/10 border-b border-primary/20 px-2 backdrop-blur-sm">
          <span className="text-sm font-semibold truncate bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            {title}
          </span>
          <div className="flex items-center space-x-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 hover:bg-primary/20 rounded-md transition-colors"
              onClick={handleFullscreen}
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? <Shrink className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 hover:bg-destructive/20 rounded-md transition-colors"
              onClick={handleClose}
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
        </div>
        
        {/* Window Content */}
        <div className="flex-1 overflow-hidden">
          {children}
        </div>
      </div>
    );
  }

  // Floating mode rendering (draggable, resizable)
  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-[9999] bg-card flex flex-col">
        {/* Window Header */}
        <div className="flex items-center justify-between h-8 bg-muted/50 border-b border-border px-2">
          <span className="text-sm font-medium truncate">
            {title}
          </span>
          <div className="flex items-center space-x-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 hover:bg-accent"
              onClick={handleFullscreen}
              title="Exit Fullscreen"
            >
              <Shrink className="w-3 h-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 hover:bg-accent"
              onClick={handleClose}
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
        </div>
        
        {/* Window Content */}
        <div className="flex-1 overflow-hidden">
          {children}
        </div>
      </div>
    );
  }

  return (
    <Rnd
      ref={windowRef}
      size={window.size}
      position={window.position}
      minWidth={minWidth}
      minHeight={minHeight}
      bounds="parent"
      dragHandleClassName="window-header"
      onDragStop={(e, d) => {
        updateWindow(id, { position: { x: d.x, y: d.y } });
      }}
      onResizeStop={(e, direction, ref, delta, position) => {
        updateWindow(id, {
          size: {
            width: parseInt(ref.style.width),
            height: parseInt(ref.style.height)
          },
          position
        });
      }}
      onMouseDown={handleMouseDown}
      className="bg-card border-2 border-primary/20 rounded-xl shadow-glow overflow-hidden transition-all duration-300 hover:shadow-glow-lg hover:border-primary/40"
      style={{ zIndex: window.zIndex }}
      enableResizing={{
        top: true,
        right: true,
        bottom: true,
        left: true,
        topRight: true,
        bottomRight: true,
        bottomLeft: true,
        topLeft: true,
      }}
      resizeHandleStyles={{
        bottomRight: {
          width: '20px',
          height: '20px',
          background: 'transparent',
          cursor: 'se-resize'
        }
      }}
    >
      <div className="flex flex-col h-full">
        {/* Window Header */}
        <div className="window-header flex items-center justify-between h-8 bg-gradient-to-r from-primary/10 to-secondary/10 border-b border-primary/20 px-2 cursor-move backdrop-blur-sm">
          <span className="text-sm font-semibold truncate bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            {title}
          </span>
          <div className="flex items-center space-x-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 hover:bg-primary/20 rounded-md transition-colors"
              onClick={handleFullscreen}
              title="Fullscreen"
            >
              {isFullscreen ? <Shrink className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 hover:bg-destructive/20 rounded-md transition-colors"
              onClick={handleClose}
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
        </div>
        
        {/* Window Content */}
        <div className="flex-1 overflow-hidden">
          {children}
        </div>
      </div>
    </Rnd>
  );
}