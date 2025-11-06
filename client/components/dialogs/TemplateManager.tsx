'use client';

import { useState, useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import { translations } from '@/lib/translations';
import {
  saveTemplate,
  loadTemplates,
  deleteTemplate,
  updateTemplate,
  incrementUsageCount,
  Template
} from '@/lib/template-service';
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
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import {
  Save,
  Download,
  Trash2,
  Globe,
  Lock,
  Clock,
  TrendingUp,
  FileText
} from 'lucide-react';

interface TemplateManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode?: 'save' | 'load';
}

export default function TemplateManager({
  open,
  onOpenChange,
  mode = 'load'
}: TemplateManagerProps) {
  const { language, getCurrentTemplateData, applyTemplate, setTemplates, templates, addTemplate, removeTemplate } = useAppStore();
  const t = translations[language];

  const [currentMode, setCurrentMode] = useState<'save' | 'load'>(mode);
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      loadAllTemplates();
      setCurrentMode(mode);
    }
  }, [open, mode]);

  const loadAllTemplates = async () => {
    setIsLoading(true);
    const result = await loadTemplates(true);
    if (result.success && result.templates) {
      setTemplates(result.templates);
    } else {
      toast.error(result.error || 'Failed to load templates');
    }
    setIsLoading(false);
  };

  const handleSaveTemplate = async () => {
    if (!templateName.trim()) {
      toast.error('Please enter a template name');
      return;
    }

    setIsSaving(true);
    const templateData = getCurrentTemplateData();
    const result = await saveTemplate(
      templateName,
      templateDescription,
      templateData,
      isPublic
    );

    if (result.success && result.template) {
      addTemplate(result.template);
      toast.success(t.templateSaved);
      setTemplateName('');
      setTemplateDescription('');
      setIsPublic(false);
      setCurrentMode('load');
    } else {
      toast.error(result.error || 'Failed to save template');
    }
    setIsSaving(false);
  };

  const handleLoadTemplate = async (template: Template) => {
    await incrementUsageCount(template.id);
    applyTemplate(template.template_data);
    toast.success(t.templateLoaded);
    onOpenChange(false);
  };

  const handleDeleteTemplate = async () => {
    if (!templateToDelete) return;

    const result = await deleteTemplate(templateToDelete);
    if (result.success) {
      removeTemplate(templateToDelete);
      toast.success(t.templateDeleted);
    } else {
      toast.error(result.error || 'Failed to delete template');
    }
    setDeleteDialogOpen(false);
    setTemplateToDelete(null);
  };

  const handleTogglePublic = async (template: Template) => {
    const result = await updateTemplate(template.id, {
      is_public: !template.is_public
    });

    if (result.success) {
      await loadAllTemplates();
      toast.success(!template.is_public ? t.makePublic : t.makePrivate);
    } else {
      toast.error(result.error || 'Failed to update template');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(language === 'fa' ? 'fa-IR' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const myTemplates = templates.filter(t => !t.is_public);
  const publicTemplates = templates.filter(t => t.is_public);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>{t.manageTemplates}</DialogTitle>
            <DialogDescription>
              {currentMode === 'save'
                ? 'Save current settings as a template'
                : 'Load a saved template or create a new one'
              }
            </DialogDescription>
          </DialogHeader>

          <Tabs value={currentMode} onValueChange={(v) => setCurrentMode(v as 'save' | 'load')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="save">
                <Save className="w-4 h-4 mr-2" />
                {t.saveTemplate}
              </TabsTrigger>
              <TabsTrigger value="load">
                <Download className="w-4 h-4 mr-2" />
                {t.loadTemplate}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="save" className="space-y-4">
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="template-name">{t.templateName}</Label>
                  <Input
                    id="template-name"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    placeholder="e.g., Industrial Inspection"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="template-description">{t.templateDescription}</Label>
                  <Textarea
                    id="template-description"
                    value={templateDescription}
                    onChange={(e) => setTemplateDescription(e.target.value)}
                    placeholder="Optional description..."
                    rows={3}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="is-public"
                    checked={isPublic}
                    onChange={(e) => setIsPublic(e.target.checked)}
                    className="rounded"
                  />
                  <Label htmlFor="is-public" className="cursor-pointer">
                    {t.makePublic}
                  </Label>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  {t.cancel}
                </Button>
                <Button onClick={handleSaveTemplate} disabled={isSaving}>
                  {isSaving ? 'Saving...' : t.save}
                </Button>
              </DialogFooter>
            </TabsContent>

            <TabsContent value="load" className="space-y-4">
              <ScrollArea className="h-[400px] pr-4">
                {isLoading ? (
                  <div className="text-center py-8 text-gray-400">
                    {t.processing}
                  </div>
                ) : (
                  <div className="space-y-6">
                    {myTemplates.length > 0 && (
                      <div className="space-y-3">
                        <h3 className="text-sm font-semibold text-gray-400">
                          {t.myTemplates}
                        </h3>
                        <div className="space-y-2">
                          {myTemplates.map((template) => (
                            <TemplateCard
                              key={template.id}
                              template={template}
                              onLoad={() => handleLoadTemplate(template)}
                              onDelete={() => {
                                setTemplateToDelete(template.id);
                                setDeleteDialogOpen(true);
                              }}
                              onTogglePublic={() => handleTogglePublic(template)}
                              formatDate={formatDate}
                              language={language}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {publicTemplates.length > 0 && (
                      <div className="space-y-3">
                        <h3 className="text-sm font-semibold text-gray-400">
                          {t.publicTemplates}
                        </h3>
                        <div className="space-y-2">
                          {publicTemplates.map((template) => (
                            <TemplateCard
                              key={template.id}
                              template={template}
                              onLoad={() => handleLoadTemplate(template)}
                              onDelete={() => {
                                setTemplateToDelete(template.id);
                                setDeleteDialogOpen(true);
                              }}
                              onTogglePublic={() => handleTogglePublic(template)}
                              formatDate={formatDate}
                              language={language}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {templates.length === 0 && (
                      <div className="text-center py-8 text-gray-400">
                        <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p>{t.noTemplates}</p>
                      </div>
                    )}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.deleteTemplate}</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this template? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteTemplate}>
              {t.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

interface TemplateCardProps {
  template: Template;
  onLoad: () => void;
  onDelete: () => void;
  onTogglePublic: () => void;
  formatDate: (date: string) => string;
  language: string;
}

function TemplateCard({
  template,
  onLoad,
  onDelete,
  onTogglePublic,
  formatDate,
  language
}: TemplateCardProps) {
  const t = translations[language as keyof typeof translations];

  return (
    <div className="border rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-medium">{template.name}</h4>
            <Badge variant={template.is_public ? 'default' : 'secondary'} className="text-xs">
              {template.is_public ? (
                <>
                  <Globe className="w-3 h-3 mr-1" />
                  Public
                </>
              ) : (
                <>
                  <Lock className="w-3 h-3 mr-1" />
                  Private
                </>
              )}
            </Badge>
          </div>
          {template.description && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              {template.description}
            </p>
          )}
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatDate(template.updated_at)}
            </span>
            <span className="flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              {template.usage_count} {t.usageCount}
            </span>
          </div>
        </div>
      </div>

      <Separator className="my-3" />

      <div className="flex items-center gap-2">
        <Button size="sm" onClick={onLoad} className="flex-1">
          <Download className="w-4 h-4 mr-2" />
          {t.applyTemplate}
        </Button>
        <Button size="sm" variant="outline" onClick={onTogglePublic}>
          {template.is_public ? <Lock className="w-4 h-4" /> : <Globe className="w-4 h-4" />}
        </Button>
        <Button size="sm" variant="destructive" onClick={onDelete}>
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
