'use client';

import { ReactNode, useRef, useEffect } from 'react';
import { Rnd } from 'react-rnd';
import { useAppStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { X, Minus, Maximize2 } from 'lucide-react';

interface WindowProps {
  id: string;
  title: string;
  children: ReactNode;
  minWidth?: number;
  minHeight?: number;
}

export default function Window({ 
  id, 
  title, 
  children, 
  minWidth = 300, 
  minHeight = 200 
}: WindowProps) {
  const { 
    windows, 
    updateWindow, 
    bringWindowToFront, 
    toggleWindow 
  } = useAppStore();
  
  const windowRef = useRef<HTMLDivElement>(null);
  const window = windows.find(w => w.id === id);

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
      className="bg-gray-800 border border-gray-600 rounded-lg shadow-2xl overflow-hidden"
      style={{ zIndex: window.zIndex }}
    >
      <div className="flex flex-col h-full">
        {/* Window Header */}
        <div className="window-header flex items-center justify-between h-8 bg-gray-700 border-b border-gray-600 px-2 cursor-move">
          <span className="text-sm font-medium text-gray-200 truncate">
            {title}
          </span>
          <div className="flex items-center space-x-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 hover:bg-gray-600"
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