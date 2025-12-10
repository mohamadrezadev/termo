'use client';

import { ReactNode, useEffect, Children, cloneElement, isValidElement } from 'react';
import { useAppStore } from '@/lib/store';

interface WindowManagerProps {
  children: ReactNode;
  mode?: 'floating' | 'grid';
}

export default function WindowManager({ children, mode = 'grid' }: WindowManagerProps) {
  const { windows, calculateGridLayout } = useAppStore();

  useEffect(() => {
    const handleResize = () => {
      calculateGridLayout();
    };

    window.addEventListener('resize', handleResize);
    calculateGridLayout();

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [calculateGridLayout]);

  // Floating mode - scrollable behavior
  if (mode === 'floating') {
    return (
      <div className="w-full h-full overflow-auto bg-background">
        <div className="relative min-w-[1400px] min-h-[900px] w-full h-full">
          {children}
        </div>
      </div>
    );
  }

  // Grid mode - tiled layout
  const openWindows = windows.filter(w => w.isOpen);
  const childrenArray = Children.toArray(children);
  
  console.log('[WindowManager] Grid mode:', {
    totalWindows: windows.length,
    openWindows: openWindows.map(w => ({ id: w.id, isOpen: w.isOpen })),
    childrenCount: childrenArray.length
  });
  
  // Calculate grid dimensions
  const windowCount = openWindows.length;
  if (windowCount === 0) {
    return (
      <div className="h-full w-full bg-background flex items-center justify-center">
        <p className="text-muted-foreground">No windows open</p>
      </div>
    );
  }
  
  const cols = windowCount === 1 ? 1 : windowCount === 2 ? 2 : windowCount <= 4 ? 2 : 3;
  const rows = Math.ceil(windowCount / cols);

  return (
    <div className="h-full w-full bg-background p-3 overflow-hidden">
      <div 
        className="grid gap-3 h-full w-full"
        style={{
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gridTemplateRows: `repeat(${rows}, 1fr)`
        }}
      >
        {childrenArray.map((child, index) => {
          if (!isValidElement(child)) {
            console.log('[WindowManager] Invalid child at index', index);
            return null;
          }
          
          const childId = child.props?.id;
          console.log('[WindowManager] Processing child:', childId);
          
          // Always render child with gridMode prop
          return (
            <div key={childId || index} className="min-h-0 min-w-0 overflow-hidden">
              {cloneElement(child as any, { gridMode: true })}
            </div>
          );
        })}
      </div>
    </div>
  );
}