'use client';

import { useAppStore } from '@/lib/store';
import { translations } from '@/lib/translations';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from '@/components/ui/dropdown-menu';
import {
  File,
  FolderOpen,
  Save,
  Upload,
  Download,
  FileText,
  Eye,
  Settings,
  Monitor,
  RotateCcw,
  Languages,
  Grid3X3
} from 'lucide-react';

export default function TopMenuBar() {
  const { 
    language, 
    setLanguage, 
    windows, 
    toggleWindow, 
    resetLayout,
    calculateGridLayout,
    currentProject 
  } = useAppStore();
  const t = translations[language];

  const handleFileUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.bmt,.bmp,.jpg,.jpeg,.png,.tiff,.tif';
    input.multiple = true;
    input.onchange = (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (files) {
        // Handle file upload logic here
        console.log('Files selected:', files);
      }
    };
    input.click();
  };

  const handleAutoArrange = () => {
    calculateGridLayout();
  };

  return (
    <div className="h-10 bg-gray-800 border-b border-gray-700 flex items-center px-2 text-sm">
      <div className="flex items-center space-x-1">
        {/* File Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 px-2">
              {t.file}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem>
              <File className="w-4 h-4 mr-2" />
              {t.newProject}
            </DropdownMenuItem>
            <DropdownMenuItem>
              <FolderOpen className="w-4 h-4 mr-2" />
              {t.openProject}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <Save className="w-4 h-4 mr-2" />
              {t.saveProject}
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Save className="w-4 h-4 mr-2" />
              {t.saveProjectAs}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleFileUpload}>
              <Upload className="w-4 h-4 mr-2" />
              {t.importImage}
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Download className="w-4 h-4 mr-2" />
              {t.exportData}
            </DropdownMenuItem>
            <DropdownMenuItem>
              <FileText className="w-4 h-4 mr-2" />
              {t.generateReport}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* View Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 px-2">
              {t.view}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem>
              <Eye className="w-4 h-4 mr-2" />
              {t.fullscreen}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <Settings className="w-4 h-4 mr-2" />
                {t.palette}
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuItem>{t.iron}</DropdownMenuItem>
                <DropdownMenuItem>{t.rainbow}</DropdownMenuItem>
                <DropdownMenuItem>{t.grayscale}</DropdownMenuItem>
                <DropdownMenuItem>{t.sepia}</DropdownMenuItem>
                <DropdownMenuItem>{t.medical}</DropdownMenuItem>
                <DropdownMenuItem>{t.coldHot}</DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Window Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 px-2">
              {t.window}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {windows.map((window) => (
              <DropdownMenuItem
                key={window.id}
                onClick={() => toggleWindow(window.id)}
              >
                <Monitor className="w-4 h-4 mr-2" />
                <span className={window.isOpen ? 'font-semibold' : ''}>
                  {t[window.id as keyof typeof t] || window.title}
                </span>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleAutoArrange}>
              <Grid3X3 className="w-4 h-4 mr-2" />
              Auto Arrange
            </DropdownMenuItem>
            <DropdownMenuItem onClick={resetLayout}>
              <RotateCcw className="w-4 h-4 mr-2" />
              {t.resetLayout}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Right side - Project info and language */}
      <div className="flex-1" />
      
      <div className="flex items-center space-x-4 text-xs text-gray-400">
        {currentProject && (
          <span>{currentProject.name}</span>
        )}
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 px-2">
              <Languages className="w-4 h-4 mr-1" />
              {language.toUpperCase()}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setLanguage('en')}>
              <span className={language === 'en' ? 'font-semibold' : ''}>
                English
              </span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setLanguage('fa')}>
              <span className={language === 'fa' ? 'font-semibold' : ''}>
                فارسی
              </span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}