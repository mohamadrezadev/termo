'use client';

import { ReactNode, useEffect } from 'react';
import { useAppStore } from '@/lib/store';

interface WindowManagerProps {
  children: ReactNode;
}

export default function WindowManager({ children }: WindowManagerProps) {
  const { calculateGridLayout } = useAppStore();

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

  return (
    <div className="absolute inset-0 overflow-auto bg-gray-900">
      {/* Container با حداقل ابعاد برای فعال کردن اسکرول */}
      <div className="relative min-w-[1400px] min-h-[900px] w-full h-full">
        {children}
      </div>
    </div>
  );
}