'use client';

import { useState } from 'react';
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
  Settings,
  Monitor,
  RotateCcw,
  Languages,
  Grid3X3,
  BookTemplate,
  FolderPlus,
  Maximize2,
  Minimize2
} from 'lucide-react';
import TemplateManager from '@/components/dialogs/TemplateManager';
import ProjectDialog from '@/components/dialogs/ProjectDialog';
import { toast } from 'sonner';

export default function TopMenuBar() {
  const {
    language,
    setLanguage,
    windows,
    toggleWindow,
    resetLayout,
    calculateGridLayout,
    currentProject,
    isFullscreen,
    toggleFullscreen
  } = useAppStore();
  const t = translations[language];

  const [templateManagerOpen, setTemplateManagerOpen] = useState(false);
  const [templateMode, setTemplateMode] = useState<'save' | 'load'>('load');
  const [projectDialogOpen, setProjectDialogOpen] = useState(false);
  const [projectDialogMode, setProjectDialogMode] = useState<'new' | 'open' | 'save'>('new');

  const handleFileUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.bmt,.bmp,.jpg,.jpeg,.png,.tiff,.tif';
    input.multiple = true;
    input.onchange = (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (files) {
        console.log('Files selected:', files);
      }
    };
    input.click();
  };

  const handleAutoArrange = () => {
    calculateGridLayout();
    toast.success(t.windowsArranged);
  };

  const handleOpenTemplateManager = (mode: 'save' | 'load') => {
    setTemplateMode(mode);
    setTemplateManagerOpen(true);
  };

  const handleOpenProjectDialog = (mode: 'new' | 'open' | 'save') => {
    setProjectDialogMode(mode);
    setProjectDialogOpen(true);
  };

  return (
    <>
      <TemplateManager
        open={templateManagerOpen}
        onOpenChange={setTemplateManagerOpen}
        mode={templateMode}
      />
      
      <ProjectDialog
        open={projectDialogOpen}
        onOpenChange={setProjectDialogOpen}
        mode={projectDialogMode}
      />

      <div className="h-10 bg-gray-800 border-b border-gray-700 flex items-center px-2 text-sm">
        <div className="flex items-center space-x-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 px-2">
                {t.file}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => handleOpenProjectDialog('new')}>
                <FolderPlus className="w-4 h-4 mr-2" />
                {t.newProject}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleOpenProjectDialog('open')}>
                <FolderOpen className="w-4 h-4 mr-2" />
                {t.openProject}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => handleOpenProjectDialog('save')}
                disabled={!currentProject}
              >
                <Save className="w-4 h-4 mr-2" />
                {t.saveProject}
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

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 px-2">
                <BookTemplate className="w-4 h-4 mr-2" />
                {t.templates}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => handleOpenTemplateManager('save')}>
                <Save className="w-4 h-4 mr-2" />
                {t.saveTemplate}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleOpenTemplateManager('load')}>
                <Download className="w-4 h-4 mr-2" />
                {t.loadTemplate}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleOpenTemplateManager('load')}>
                <Settings className="w-4 h-4 mr-2" />
                {t.manageTemplates}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 px-2">
                {t.view}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={toggleFullscreen}>
                {isFullscreen ? <Minimize2 className="w-4 h-4 mr-2" /> : <Maximize2 className="w-4 h-4 mr-2" />}
                {isFullscreen ? t.exitFullscreen : t.fullscreen}
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

        <div className="flex-1" />
        
        <div className="flex items-center space-x-4 text-xs text-gray-400">
          {currentProject && (
            <div className="flex items-center space-x-2">
              <File className="w-3 h-3" />
              <span className="font-medium text-gray-300">{currentProject.name}</span>
              {currentProject.hasUnsavedChanges && (
                <span className="text-yellow-500" title={t.unsavedChanges}>●</span>
              )}
            </div>
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
    </>
  );
}