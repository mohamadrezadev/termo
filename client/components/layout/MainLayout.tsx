'use client';

import { useAppStore } from '@/lib/store';
import { translations } from '@/lib/translations';
import TopMenuBar from './TopMenuBar';
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
  const { language, isRTL, currentProject } = useAppStore();
  const t = translations[language];

  // اگر پروژه‌ای فعال نیست، صفحه خوش‌آمدگویی نمایش داده می‌شود
  if (!currentProject) {
    return <WelcomeScreen />;
  }

  return (
    <div className={`min-h-screen bg-gray-900 text-white ${isRTL ? 'rtl' : 'ltr'}`}>
      <TopMenuBar />
      
      <div className="relative h-[calc(100vh-40px)] overflow-hidden">
        <WindowManager>
          <ThermalViewer />
          <RealImageViewer />
          <DataTable />
          <Histogram />
          <Parameters />
          <Timeline />
          <Reports />
        </WindowManager>
      </div>
    </div>
  );
}