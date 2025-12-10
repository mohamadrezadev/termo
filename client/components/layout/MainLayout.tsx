'use client';

import { useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import { translations } from '@/lib/translations';
import TopMenuBar from './TopMenuBar';
import BottomNavBar from './BottomNavBar';
import WindowManager from './WindowManager';
import WelcomeScreen from '../WelcomeScreen';
import ThermalViewer from '../windows/ThermalViewer';
import RealImageViewer from '../windows/RealImageViewer';
import DataTable from '../windows/DataTable';
import Histogram from '../windows/Histogram';
import Parameters from '../windows/Parameters';
import Timeline from '../windows/Timeline';
import Reports from '../windows/Reports';

export default function MainLayout() {
  const { language, isRTL, currentProject, layoutMode, isFullscreen, setIsFullscreen } = useAppStore();
  const t = translations[language];

  // Listen for fullscreen changes (e.g., when user presses ESC)
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, [setIsFullscreen]);

  // اگر پروژه‌ای فعال نیست، صفحه خوش‌آمدگویی نمایش داده می‌شود
  if (!currentProject) {
    return <WelcomeScreen />;
  }

  return (
    <div className={`min-h-screen w-screen bg-background text-foreground transition-colors duration-300 flex flex-col ${isRTL ? 'rtl' : 'ltr'}`}>
      <TopMenuBar />
      
      <div className="relative flex-1 w-full min-h-0 pb-4">
        <WindowManager mode={layoutMode}>
          <ThermalViewer />
          <RealImageViewer />
          <DataTable />
          <Histogram />
          <Parameters />
          <Timeline />
          <Reports />
        </WindowManager>
      </div>

      <BottomNavBar />
    </div>
  );
}