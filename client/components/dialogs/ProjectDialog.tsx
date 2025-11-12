'use client';

import { useState, useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import { translations } from '@/lib/translations';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import {
  FolderPlus,
  FolderOpen,
  Trash2,
  Calendar,
  Building2,
  User,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { generateId } from '@/lib/utils';
import { Project } from '@/lib/store';

interface ProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode?: 'new' | 'open' | 'save';
}

export default function ProjectDialog({
  open,
  onOpenChange,
  mode = 'new'
}: ProjectDialogProps) {
  const { 
    language, 
    currentProject, 
    projects,
    isLoadingProjects,
    images,
    markers,
    regions,
    setCurrentProject,
    addProject,
    removeProject,
    saveCurrentProject,
    loadProjectById,
    loadAllProjects
  } = useAppStore();
  
  const t = translations[language];

  const [currentMode, setCurrentMode] = useState<'new' | 'open' | 'save'>(mode);
  const [projectName, setProjectName] = useState('');
  const [operator, setOperator] = useState('');
  const [company, setCompany] = useState('');
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // بارگذاری پروژه‌ها هنگام باز شدن تب "open"
  useEffect(() => {
    if (open && currentMode === 'open') {
      console.log('[PROJECT_DIALOG] Loading projects for open tab');
      loadAllProjects();
    }
  }, [open, currentMode, loadAllProjects]);

  // تنظیم مقادیر فیلدها هنگام تغییر حالت
  useEffect(() => {
    if (open) {
      setCurrentMode(mode);
      if (mode === 'save' && currentProject) {
        setProjectName(currentProject.name);
        setOperator(currentProject.operator);
        setCompany(currentProject.company);
        setNotes(currentProject.notes);
      } else {
        setProjectName('');
        setOperator('');
        setCompany('');
        setNotes('');
      }
    }
  }, [open, mode, currentProject]);

  const handleCreateProject = () => {
    if (!projectName.trim()) {
      toast.error(t.enterProjectName);
      return;
    }

    const newProject: Project = {
      id: generateId(),
      name: projectName,
      operator: operator || 'Unknown',
      company: company || '',
      date: new Date(),
      notes: notes || '',
      images: [],
      markers: [],
      regions: [],
      hasUnsavedChanges: false
    };

    console.log('[PROJECT_DIALOG] Creating new project:', newProject.name);
    console.log('[PROJECT_DIALOG] This will clear all existing images, markers, and regions');

    addProject(newProject);
    setCurrentProject(newProject);

    // Save project name to localStorage for upload
    if (typeof window !== 'undefined') {
      localStorage.setItem('currentProjectName', newProject.name);
    }

    toast.success(t.projectCreated);
    onOpenChange(false);
  };

  const handleSaveProject = async () => {
    if (!currentProject) {
      toast.error(t.noActiveProject);
      return;
    }

    if (!projectName.trim()) {
      toast.error(t.enterProjectName);
      return;
    }

    setIsLoading(true);
    try {
      console.log('[PROJECT_DIALOG] Starting save...');
      
      const updatedProject: Project = {
        ...currentProject,
        name: projectName,
        operator: operator || currentProject.operator,
        company: company || currentProject.company,
        notes: notes || currentProject.notes,
        images: images,
        markers: markers,
        regions: regions,
        hasUnsavedChanges: false
      };

      console.log('[PROJECT_DIALOG] Calling saveCurrentProject with:', {
        projectName: updatedProject.name,
        imagesCount: images.length,
        markersCount: markers.length,
        regionsCount: regions.length
      });

      await saveCurrentProject(updatedProject);
      
      console.log('[PROJECT_DIALOG] Save completed');
      onOpenChange(false);
    } catch (error) {
      console.error('[PROJECT_DIALOG] Error saving project:', error);
      toast.error('خطا در ذخیره پروژه');
    } finally {
      setIsLoading(false);
    }
  };
 
  const handleOpenProject = async (project: Project) => {
    setIsLoading(true);
    try {
      console.log('[PROJECT_DIALOG] Opening project:', project.id, project.name);
      await loadProjectById(project.id);

      // Save project name to localStorage for upload
      if (typeof window !== 'undefined') {
        localStorage.setItem('currentProjectName', project.name);
      }

      onOpenChange(false);
    } catch (error) {
      console.error('[PROJECT_DIALOG] Error opening project:', error);
      toast.error(t.error || 'Failed to load project');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteProject = async (projectId: string, projectName: string) => {
    if (confirm(`${t.confirmDelete} "${projectName}"?`)) {
      setIsLoading(true);
      try {
        await removeProject(projectId);
      } catch (error) {
        console.error('[PROJECT_DIALOG] Error deleting project:', error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleRefreshProjects = async () => {
    console.log('[PROJECT_DIALOG] Refreshing projects list');
    await loadAllProjects();
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString(language === 'fa' ? 'fa-IR' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>
            {currentMode === 'new' && t.newProject}
            {currentMode === 'open' && t.openProject}
            {currentMode === 'save' && t.saveProject}
          </DialogTitle>
          <DialogDescription>
            {currentMode === 'new' && (language === 'fa' ? 'ایجاد یک پروژه تحلیل حرارتی جدید' : 'Create a new thermal analysis project')}
            {currentMode === 'open' && (language === 'fa' ? 'باز کردن یک پروژه موجود' : 'Open an existing project')}
            {currentMode === 'save' && (language === 'fa' ? 'ذخیره کار فعلی شما' : 'Save your current work')}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={currentMode} onValueChange={(v) => setCurrentMode(v as any)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="new">
              <FolderPlus className="w-4 h-4 mr-2" />
              {t.newProject}
            </TabsTrigger>
            <TabsTrigger value="open">
              <FolderOpen className="w-4 h-4 mr-2" />
              {t.openProject}
            </TabsTrigger>
            <TabsTrigger value="save">
              <FolderOpen className="w-4 h-4 mr-2" />
              {t.saveProject}
            </TabsTrigger>
          </TabsList>

          {/* تب ایجاد پروژه جدید */}
          <TabsContent value="new" className="space-y-4 mt-4">
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="project-name">{t.projectName}</Label>
                <Input
                  id="project-name"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder={language === 'fa' ? 'بازرسی ساختمان - سالن اصلی' : 'Building Inspection - Main Hall'}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="operator">
                  <User className="w-4 h-4 inline mr-2" />
                  {t.operator}
                </Label>
                <Input
                  id="operator"
                  value={operator}
                  onChange={(e) => setOperator(e.target.value)}
                  placeholder={language === 'fa' ? 'نام اپراتور' : 'John Doe'}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="company">
                  <Building2 className="w-4 h-4 inline mr-2" />
                  {t.company}
                </Label>
                <Input
                  id="company"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder={language === 'fa' ? 'نام شرکت' : 'ABC Inspection Services'}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">{t.notes}</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={language === 'fa' ? 'یادداشت‌های اضافی درباره پروژه...' : 'Additional notes about the project...'}
                  rows={4}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                {t.cancel}
              </Button>
              <Button onClick={handleCreateProject}>
                <FolderPlus className="w-4 h-4 mr-2" />
                {t.newProject}
              </Button>
            </DialogFooter>
          </TabsContent>

          {/* تب باز کردن پروژه */}
          <TabsContent value="open" className="mt-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium">{language === 'fa' ? 'پروژه‌های موجود' : 'Available Projects'}</h3>
              <Button
                size="sm"
                variant="outline"
                onClick={handleRefreshProjects}
                disabled={isLoadingProjects || isLoading}
              >
                <RefreshCw className={`w-4 h-4 ${isLoadingProjects ? 'animate-spin' : ''}`} />
              </Button>
            </div>

            <ScrollArea className="h-[400px] pr-4">
              {isLoadingProjects || isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <Loader2 className="animate-spin h-12 w-12 text-primary mx-auto mb-4" />
                    <p className="text-sm text-gray-400">{t.processing}</p>
                  </div>
                </div>
              ) : projects.length > 0 ? (
                <div className="space-y-3">
                  {projects.map((project) => (
                    <div
                      key={project.id}
                      className="border rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h4 className="font-medium text-lg mb-1">{project.name}</h4>
                          <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                            <span className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              {project.operator}
                            </span>
                            {project.company && (
                              <span className="flex items-center gap-1">
                                <Building2 className="w-3 h-3" />
                                {project.company}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {formatDate(project.date)}
                            </span>
                          </div>
                          {project.notes && (
                            <p className="text-sm text-gray-500 mt-2 line-clamp-2">
                              {project.notes}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between mt-3 pt-3 border-t">
                        <div className="text-xs text-gray-500">
                          {project.images?.length || 0} {language === 'fa' ? 'تصویر' : 'image(s)'} • 
                          {project.markers?.length || 0} {language === 'fa' ? 'نشانگر' : 'marker(s)'} • 
                          {project.regions?.length || 0} {language === 'fa' ? 'ناحیه' : 'region(s)'}
                          {project.hasUnsavedChanges && (
                            <span className="ml-2 text-yellow-500">● {t.unsavedChanges}</span>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleOpenProject(project)}
                            disabled={isLoading}
                          >
                            <FolderOpen className="w-4 h-4 mr-1" />
                            {language === 'fa' ? 'باز کردن' : 'Open'}
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDeleteProject(project.id, project.name)}
                            disabled={isLoading}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-gray-400">
                  <FolderOpen className="w-16 h-16 mb-4" />
                  <p>{language === 'fa' ? 'پروژه‌ای یافت نشد' : 'No projects found'}</p>
                  <p className="text-sm">{language === 'fa' ? 'برای شروع یک پروژه جدید ایجاد کنید' : 'Create a new project to get started'}</p>
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          {/* تب ذخیره پروژه */}
          <TabsContent value="save" className="space-y-4 mt-4">
            {currentProject ? (
              <>
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="save-project-name">{t.projectName}</Label>
                    <Input
                      id="save-project-name"
                      value={projectName}
                      onChange={(e) => setProjectName(e.target.value)}
                      disabled={isLoading}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="save-operator">
                      <User className="w-4 h-4 inline mr-2" />
                      {t.operator}
                    </Label>
                    <Input
                      id="save-operator"
                      value={operator}
                      onChange={(e) => setOperator(e.target.value)}
                      disabled={isLoading}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="save-company">
                      <Building2 className="w-4 h-4 inline mr-2" />
                      {t.company}
                    </Label>
                    <Input
                      id="save-company"
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                      disabled={isLoading}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="save-notes">{t.notes}</Label>
                    <Textarea
                      id="save-notes"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={4}
                      disabled={isLoading}
                    />
                  </div>

                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                    <div className="text-sm">
                      <div className="font-medium mb-1">{language === 'fa' ? 'وضعیت پروژه فعلی:' : 'Current Project Status:'}</div>
                      <div className="text-gray-600 dark:text-gray-400">
                        • {images.length} {language === 'fa' ? 'تصویر حرارتی' : 'thermal image(s)'}<br/>
                        • {markers.length} {language === 'fa' ? 'نقطه اندازه‌گیری' : 'measurement point(s)'}<br/>
                        • {regions.length} {language === 'fa' ? 'ناحیه تحلیل' : 'analysis region(s)'}
                      </div>
                    </div>
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
                    {t.cancel}
                  </Button>
                  <Button onClick={handleSaveProject} disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        {language === 'fa' ? 'در حال ذخیره...' : 'Saving...'}
                      </>
                    ) : (
                      t.save
                    )}
                  </Button>
                </DialogFooter>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full py-12 text-gray-400">
                <FolderOpen className="w-16 h-16 mb-4" />
                <p>{language === 'fa' ? 'پروژه فعالی وجود ندارد' : 'No active project'}</p>
                <p className="text-sm">{language === 'fa' ? 'ابتدا یک پروژه جدید ایجاد کنید' : 'Create a new project first'}</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}