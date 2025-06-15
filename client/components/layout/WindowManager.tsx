'use client';

import { ReactNode, useEffect } from 'react';
import { useAppStore } from '@/lib/store';

interface WindowManagerProps {
  children: ReactNode;
}

export default function WindowManager({ children }: WindowManagerProps) {
  // Select the action directly to avoid re-renders when unrelated state changes
  const calculateGridLayout = useAppStore(state => state.calculateGridLayout);

  // Recalculate grid layout on window resize
  useEffect(() => {
    const handleResize = () => {
      calculateGridLayout();
    };

    window.addEventListener('resize', handleResize);
    
    // Initial calculation
    calculateGridLayout();

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [calculateGridLayout]);

  return (
    <div className="absolute inset-0 overflow-hidden bg-gray-900">
      {children}
    </div>
  );
}