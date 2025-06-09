'use client';

import { ReactNode } from 'react';
import { useAppStore } from '@/lib/store';

interface WindowManagerProps {
  children: ReactNode;
}

export default function WindowManager({ children }: WindowManagerProps) {
  const { windows } = useAppStore();

  return (
    <div className="absolute inset-0 overflow-hidden">
      {children}
    </div>
  );
}