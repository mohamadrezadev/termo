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

      <div className={`min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 ${isRTL ? 'rtl' : 'ltr'}`}>
        <div className="max-w-4xl w-full mx-auto p-8">
          <div className="text-center mb-12 space-y-4">
            <h1 className="text-6xl font-bold bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent animate-pulse">
              {t.appTitle}
            </h1>
            <p className="text-xl text-muted-foreground">
              {language === 'fa' ? 'نرم‌افزار تحلیل حرفه‌ای تصاویر حرارتی' : 'Professional thermal imaging analysis application'}
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <Card 
              className="border-2 border-primary/20 hover:border-primary/50 transition-all duration-300 cursor-pointer group shadow-glow hover:shadow-glow-lg bg-card/80 backdrop-blur-sm" 
              onClick={handleNewProject}
            >
              <CardHeader>
                <div className="w-16 h-16 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-xl flex items-center justify-center mb-4 group-hover:from-primary/30 group-hover:to-secondary/30 transition-all duration-300 shadow-lg">
                  <FolderPlus className="w-8 h-8 text-primary group-hover:scale-110 transition-transform" />
                </div>
                <CardTitle className="text-2xl bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">{t.newProject}</CardTitle>
                <CardDescription className="text-muted-foreground">
                  {language === 'fa' 
                    ? 'شروع یک پروژه تحلیل حرارتی جدید با تنظیمات دلخواه'
                    : 'Start a fresh thermal analysis project with custom settings'
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full shadow-lg hover:shadow-xl" size="lg">
                  <FolderPlus className="w-5 h-5 mr-2" />
                  {t.newProject}
                </Button>
              </CardContent>
            </Card>

            <Card 
              className="border-2 border-secondary/20 hover:border-secondary/50 transition-all duration-300 cursor-pointer group shadow-glow hover:shadow-glow-lg bg-card/80 backdrop-blur-sm" 
              onClick={handleOpenProject}
            >
              <CardHeader>
                <div className="w-16 h-16 bg-gradient-to-br from-secondary/20 to-accent/20 rounded-xl flex items-center justify-center mb-4 group-hover:from-secondary/30 group-hover:to-accent/30 transition-all duration-300 shadow-lg">
                  <FolderOpen className="w-8 h-8 text-secondary group-hover:scale-110 transition-transform" />
                </div>
                <CardTitle className="text-2xl bg-gradient-to-r from-secondary to-accent bg-clip-text text-transparent">{t.openProject}</CardTitle>
                <CardDescription className="text-muted-foreground">
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
                  className="w-full shadow-lg hover:shadow-xl" 
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
            <div className="inline-flex items-center gap-2 text-muted-foreground text-sm bg-muted/30 px-4 py-2 rounded-full backdrop-blur-sm border border-primary/10">
              <FileText className="w-4 h-4 text-primary" />
              <span>{t.supportedFormats}</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
