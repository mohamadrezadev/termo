'use client';

import { useState } from 'react';
import { useAppStore } from '@/lib/store';
import { translations } from '@/lib/translations';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FolderPlus, FolderOpen, FileText } from 'lucide-react';
import ProjectDialog from './dialogs/ProjectDialog';

export default function WelcomeScreen() {
  const { language, projects, isRTL } = useAppStore();
  const t = translations[language];
  const [projectDialogOpen, setProjectDialogOpen] = useState(false);
  const [projectDialogMode, setProjectDialogMode] = useState<'new' | 'open'>('new');

  const handleNewProject = () => {
    setProjectDialogMode('new');
    setProjectDialogOpen(true);
  };

  const handleOpenProject = () => {
    setProjectDialogMode('open');
    setProjectDialogOpen(true);
  };

  return (
    <>
      <ProjectDialog
        open={projectDialogOpen}
        onOpenChange={setProjectDialogOpen}
        mode={projectDialogMode}
      />

      <div className={`min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 ${isRTL ? 'rtl' : 'ltr'}`}>
        <div className="max-w-4xl w-full mx-auto p-8">
          <div className="text-center mb-12">
            <h1 className="text-5xl font-bold text-white mb-4">
              {t.appTitle}
            </h1>
            <p className="text-xl text-gray-400">
              {language === 'fa' ? 'نرم‌افزار تحلیل حرفه‌ای تصاویر حرارتی' : 'Professional thermal imaging analysis application'}
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <Card 
              className="bg-gray-800 border-gray-700 hover:bg-gray-750 transition-colors cursor-pointer group" 
              onClick={handleNewProject}
            >
              <CardHeader>
                <div className="w-16 h-16 bg-blue-500/10 rounded-lg flex items-center justify-center mb-4 group-hover:bg-blue-500/20 transition-colors">
                  <FolderPlus className="w-8 h-8 text-blue-500" />
                </div>
                <CardTitle className="text-2xl text-white">{t.newProject}</CardTitle>
                <CardDescription className="text-gray-400">
                  {language === 'fa' 
                    ? 'شروع یک پروژه تحلیل حرارتی جدید با تنظیمات دلخواه'
                    : 'Start a fresh thermal analysis project with custom settings'
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full" size="lg">
                  <FolderPlus className="w-5 h-5 mr-2" />
                  {t.newProject}
                </Button>
              </CardContent>
            </Card>

            <Card 
              className="bg-gray-800 border-gray-700 hover:bg-gray-750 transition-colors cursor-pointer group" 
              onClick={handleOpenProject}
            >
              <CardHeader>
                <div className="w-16 h-16 bg-green-500/10 rounded-lg flex items-center justify-center mb-4 group-hover:bg-green-500/20 transition-colors">
                  <FolderOpen className="w-8 h-8 text-green-500" />
                </div>
                <CardTitle className="text-2xl text-white">{t.openProject}</CardTitle>
                <CardDescription className="text-gray-400">
                  {projects.length > 0 
                    ? (language === 'fa' 
                        ? `ادامه کار روی یکی از ${projects.length} پروژه ذخیره شده`
                        : `Continue working on one of your ${projects.length} saved project(s)`
                      )
                    : (language === 'fa'
                        ? 'هنوز پروژه‌ای ذخیره نشده. اولین پروژه خود را ایجاد کنید'
                        : 'No saved projects yet. Create your first project to get started'
                      )
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  variant="outline" 
                  className="w-full" 
                  size="lg"
                  disabled={projects.length === 0}
                >
                  <FolderOpen className="w-5 h-5 mr-2" />
                  {t.openProject}
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="mt-12 text-center">
            <div className="inline-flex items-center gap-2 text-gray-500 text-sm">
              <FileText className="w-4 h-4" />
              <span>{t.supportedFormats}</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
