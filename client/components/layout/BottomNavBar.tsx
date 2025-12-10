'use client';

import { useAppStore } from '@/lib/store';
import { translations } from '@/lib/translations';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import {
  Thermometer,
  Image as ImageIcon,
  BarChart3,
  Settings,
  Clock,
  FileText,
  Table,
  ChevronUp,
  ChevronDown
} from 'lucide-react';

export default function BottomNavBar() {
  const { language, windows, toggleWindow, bringWindowToFront, layoutMode } = useAppStore();
  const t = translations[language];
  const [isExpanded, setIsExpanded] = useState(false);

  const windowIcons = {
    'thermal-viewer': Thermometer,
    'real-image-viewer': ImageIcon,
    'histogram': BarChart3,
    'parameters': Settings,
    'timeline': Clock,
    'reports': FileText,
    'data-table': Table,
    'report-editor': FileText
  };

  const windowLabels = {
    'thermal-viewer': 'حرارتی',
    'real-image-viewer': 'تصویر',
    'histogram': 'هیستوگرام',
    'parameters': 'تنظیمات',
    'timeline': 'زمانبندی',
    'reports': 'گزارشات',
    'data-table': 'جدول',
    'report-editor': 'ویرایشگر'
  };

  const handleWindowClick = (windowId: string) => {
    const window = windows.find(w => w.id === windowId);
    if (!window) return;

    if (window.isOpen) {
      // If open, bring to front (only in floating mode)
      if (layoutMode === 'floating') {
        bringWindowToFront(windowId);
      }
    } else {
      // If closed, open it
      toggleWindow(windowId);
    }
  };

  return (
    <div 
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50 transition-transform duration-300 ease-in-out",
        !isExpanded && "translate-y-[calc(100%-16px)]"
      )}
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
    >
      {/* Expand/Collapse Handle */}
      <div className="flex justify-center">
        <div className="bg-gradient-to-r from-primary/90 to-secondary/90 backdrop-blur-md px-6 py-1 rounded-t-lg shadow-glow cursor-pointer">
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-primary-foreground" />
          ) : (
            <ChevronUp className="w-4 h-4 text-primary-foreground animate-bounce" />
          )}
        </div>
      </div>

      {/* Navigation Bar */}
      <div className="bg-gradient-to-r from-card/98 to-card/95 border-t-2 border-primary/20 backdrop-blur-md shadow-2xl">
        <div className="h-14 flex items-center justify-center gap-1 px-4">
          {windows.map((window) => {
            const Icon = windowIcons[window.id as keyof typeof windowIcons] || Settings;
            const label = windowLabels[window.id as keyof typeof windowLabels] || window.title;
            
            return (
              <Button
                key={window.id}
                variant={window.isOpen ? 'default' : 'ghost'}
                size="sm"
                className={cn(
                  'flex flex-col items-center gap-1 h-12 px-3 transition-all duration-200',
                  window.isOpen 
                    ? 'bg-gradient-to-r from-primary to-secondary text-primary-foreground shadow-glow' 
                    : 'hover:bg-primary/10 hover:text-primary hover:scale-105'
                )}
                onClick={() => handleWindowClick(window.id)}
              >
                <Icon className={cn(
                  'w-5 h-5 transition-transform',
                  window.isOpen && 'scale-110'
                )} />
                <span className="text-xs font-medium">{label}</span>
              </Button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
