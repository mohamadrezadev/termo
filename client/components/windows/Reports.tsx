'use client';

import { useState, useEffect, useRef } from 'react';
import { useAppStore } from '@/lib/store';
import { translations, Language } from '@/lib/translations';
import Window from './Window';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  FileText,
  Download,
  ChevronLeft,
  ChevronRight,
  FileType,
  Eye,
  Settings,
  FileImage,
  Cloud
} from 'lucide-react';
import { toast } from 'sonner';
import { ReportSettings, ImageData } from '@/lib/report-generator';
import { saveAs } from 'file-saver';
import { generateReport, generateBilingualReport } from '@/lib/api-service';

type WizardStep = 'settings' | 'sections' | 'content' | 'preview';

export default function ReportWizard() {
  const {
    language,
    currentProject,
    images,
    markers,
    regions,
    globalParameters
  } = useAppStore();

  const t = translations[language];
  const [currentStep, setCurrentStep] = useState<WizardStep>('settings');
  const [reportSettings, setReportSettings] = useState<ReportSettings>({
    title: 'Thermal Analysis Report',
    reportLanguage: language as Language,

    // Sections to include
    includeCompanyInfo: true,
    includeDeviceInfo: true,
    includeCustomerInfo: true,
    includeMeasuringSite: true,
    includeTask: true,
    includeBuildingDescription: true,
    includeWeatherConditions: true,
    includeImages: true,
    includeMarkers: true,
    includeRegions: true,
    includeParameters: true,

    // Custom fields
    company: currentProject?.company || '',
    device: 'testo 882',
    serialNumber: '1970326',
    lens: '32° x 23°',
    customer: currentProject?.operator || '',
    measuringSite: '',
    task: 'This examination was carried out according to EN 13187 using a thermal imager.',
    buildingDescription: '',
    construction: '',
    orientation: '',
    vicinity: '',

    // Weather conditions
    outerTempMin24h: '',
    outerTempMax24h: '',
    outerTempMinWhile: '',
    outerTempMaxWhile: '',
    solarRadiation12h: '',
    solarRadiationWhile: '',
    precipitation: '',
    windVelocity: '',
    windDirection: '',
    innerAirTemp: '',
    tempDifference: '',
    pressureDifference: '',
    furtherFactors: '',
    deviations: '',

    notes: ''
  });

  const [imagesBase64, setImagesBase64] = useState<{ [key: string]: string }>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const convertImagesToBase64 = async () => {
      const base64Images: { [key: string]: string } = {};

      for (const img of images) {
        try {
          if (img.realImage) {
            if (img.realImage.startsWith('data:')) {
              base64Images[img.id] = img.realImage;
            } else {
              const response = await fetch(img.realImage);
              const blob = await response.blob();
              const base64 = await new Promise<string>((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.readAsDataURL(blob);
              });
              base64Images[img.id] = base64;
            }
          }

          if (img.canvas) {
            base64Images[`${img.id}_thermal`] = img.canvas.toDataURL('image/png');
          }

          if (img.serverRenderedThermalUrl) {
            try {
              const response = await fetch(img.serverRenderedThermalUrl);
              const blob = await response.blob();
              const base64 = await new Promise<string>((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.readAsDataURL(blob);
              });
              base64Images[`${img.id}_server`] = base64;
            } catch (error) {
              console.error('Error converting server image:', error);
            }
          }
        } catch (error) {
          console.error(`Error converting image ${img.id}:`, error);
        }
      }

      setImagesBase64(base64Images);
    };

    if (images.length > 0) {
      convertImagesToBase64();
    }
  }, [images]);

  const handleGenerateReport = async (format: 'pdf' | 'docx') => {
    if (!currentProject) {
      toast.error(language === 'fa' ? 'لطفاً ابتدا یک پروژه ایجاد کنید' : 'Please create a project first');
      return;
    }

    if (reportSettings.includeImages && Object.keys(imagesBase64).length === 0) {
      toast.error(language === 'fa' ? 'لطفاً منتظر بمانید تا تصاویر آماده شوند...' : 'Please wait for images to load...');
      return;
    }

    setIsGenerating(true);

    try {
      toast.info(language === 'fa' ? `در حال تولید گزارش ${format.toUpperCase()}...` : `Generating ${format.toUpperCase()} report...`);

      // Prepare image data for API
      const imagesData = images.map(img => ({
        id: img.id,
        name: img.name,
        thermalBase64: imagesBase64[`${img.id}_thermal`] || imagesBase64[`${img.id}_server`],
        realBase64: imagesBase64[img.id],
        csvUrl: img.csvUrl // Add CSV URL for histogram
      }));

      // Prepare markers data
      const markersData = markers.map(marker => ({
        id: marker.id,
        imageId: marker.imageId,
        label: marker.label,
        x: marker.x,
        y: marker.y,
        temperature: marker.temperature || 0
      }));

      // Prepare regions data
      const regionsData = regions.map(region => ({
        id: region.id,
        imageId: region.imageId,
        label: region.label,
        type: region.type,
        points: region.points,
        minTemp: region.minTemp || 0,
        maxTemp: region.maxTemp || 0,
        avgTemp: region.avgTemp || 0
      }));

      // Call API to generate report
      const requestPayload = {
        projectId: currentProject.id,
        projectName: currentProject.name,
        operator: currentProject.operator,
        company: currentProject.company,
        settings: reportSettings,
        images: imagesData,
        markers: markersData,
        regions: regionsData,
        globalParameters: globalParameters,
        format: format
      };

      console.log('[DEBUG] Sending report request:', requestPayload);
      
      const blob = await generateReport(requestPayload);

      // Download the file
      const filename = `${reportSettings.title.replace(/\s+/g, '_')}.${format}`;
      saveAs(blob, filename);

      toast.success(language === 'fa' ? `گزارش ${format.toUpperCase()} با موفقیت ایجاد شد` : `${format.toUpperCase()} report generated successfully`);
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error(language === 'fa' ? 'خطا در تولید گزارش' : 'Error generating report');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateBilingualReport = async (format: 'pdf' | 'docx') => {
    if (!currentProject) {
      toast.error(language === 'fa' ? 'لطفاً ابتدا یک پروژه ایجاد کنید' : 'Please create a project first');
      return;
    }

    if (reportSettings.includeImages && Object.keys(imagesBase64).length === 0) {
      toast.error(language === 'fa' ? 'لطفاً منتظر بمانید تا تصاویر آماده شوند...' : 'Please wait for images to load...');
      return;
    }

    setIsGenerating(true);

    try {
      toast.info(language === 'fa' ? 'در حال تولید گزارش‌های دو زبانه...' : 'Generating bilingual reports...');

      // Prepare data (same as single report)
      const imagesData = images.map(img => ({
        id: img.id,
        name: img.name,
        thermalBase64: imagesBase64[`${img.id}_thermal`] || imagesBase64[`${img.id}_server`],
        realBase64: imagesBase64[img.id],
        csvUrl: img.csvUrl
      }));

      const markersData = markers.map(marker => ({
        id: marker.id,
        imageId: marker.imageId,
        label: marker.label,
        x: marker.x,
        y: marker.y,
        temperature: marker.temperature || 0
      }));

      const regionsData = regions.map(region => ({
        id: region.id,
        imageId: region.imageId,
        label: region.label,
        type: region.type,
        points: region.points,
        minTemp: region.minTemp || 0,
        maxTemp: region.maxTemp || 0,
        avgTemp: region.avgTemp || 0
      }));

      const requestPayload = {
        projectId: currentProject.id,
        projectName: currentProject.name,
        operator: currentProject.operator,
        company: currentProject.company,
        settings: reportSettings,
        images: imagesData,
        markers: markersData,
        regions: regionsData,
        globalParameters: globalParameters,
        format: format
      };

      console.log('[DEBUG] Sending bilingual report request:', requestPayload);
      
      const blob = await generateBilingualReport(requestPayload);

      // Download the ZIP file
      const filename = `${reportSettings.title.replace(/\s+/g, '_')}_Reports.zip`;
      saveAs(blob, filename);

      toast.success(language === 'fa' ? 'گزارش‌های فارسی و انگلیسی با موفقیت ایجاد شد' : 'Persian and English reports generated successfully');
    } catch (error) {
      console.error('Error generating bilingual reports:', error);
      toast.error(language === 'fa' ? 'خطا در تولید گزارش‌ها' : 'Error generating reports');
    } finally {
      setIsGenerating(false);
    }
  };

  const renderStepIndicator = () => {
    const steps = [
      { id: 'settings', label: language === 'fa' ? 'تنظیمات' : 'Settings', icon: Settings },
      { id: 'sections', label: language === 'fa' ? 'بخش‌ها' : 'Sections', icon: FileText },
      { id: 'content', label: language === 'fa' ? 'محتوا' : 'Content', icon: FileImage },
      { id: 'preview', label: language === 'fa' ? 'پیش‌نمایش' : 'Preview', icon: Eye }
    ];

    const currentIndex = steps.findIndex(s => s.id === currentStep);

    return (
      <div className="flex items-center justify-between mb-4 px-2">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isActive = step.id === currentStep;
          const isCompleted = index < currentIndex;

          return (
            <div key={step.id} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    isActive
                      ? 'bg-blue-500 text-white'
                      : isCompleted
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-600 text-gray-400'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <div className={`text-xs mt-1 ${isActive ? 'font-bold' : ''}`}>
                  {step.label}
                </div>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={`h-0.5 flex-1 mx-2 ${
                    isCompleted ? 'bg-green-500' : 'bg-gray-600'
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const renderSettingsStep = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-sm">{language === 'fa' ? 'عنوان گزارش' : 'Report Title'}</Label>
        <Input
          value={reportSettings.title}
          onChange={(e) => setReportSettings(prev => ({ ...prev, title: e.target.value }))}
          className="h-8"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-sm">{language === 'fa' ? 'زبان گزارش' : 'Report Language'}</Label>
        <Select
          value={reportSettings.reportLanguage}
          onValueChange={(value) => setReportSettings(prev => ({ ...prev, reportLanguage: value as Language }))}
        >
          <SelectTrigger className="h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="en">English</SelectItem>
            <SelectItem value="fa">فارسی</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label className="text-sm">{language === 'fa' ? 'شرکت' : 'Company'}</Label>
          <Input
            value={reportSettings.company}
            onChange={(e) => setReportSettings(prev => ({ ...prev, company: e.target.value }))}
            className="h-8"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-sm">{language === 'fa' ? 'دستگاه' : 'Device'}</Label>
          <Input
            value={reportSettings.device}
            onChange={(e) => setReportSettings(prev => ({ ...prev, device: e.target.value }))}
            className="h-8"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-sm">{language === 'fa' ? 'شماره سریال' : 'Serial Number'}</Label>
          <Input
            value={reportSettings.serialNumber}
            onChange={(e) => setReportSettings(prev => ({ ...prev, serialNumber: e.target.value }))}
            className="h-8"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-sm">{language === 'fa' ? 'لنز' : 'Lens'}</Label>
          <Input
            value={reportSettings.lens}
            onChange={(e) => setReportSettings(prev => ({ ...prev, lens: e.target.value }))}
            className="h-8"
          />
        </div>
      </div>
    </div>
  );

  const renderSectionsStep = () => (
    <div className="space-y-3">
      <Label className="text-sm font-bold">{language === 'fa' ? 'بخش‌های گزارش' : 'Report Sections'}</Label>
      <div className="space-y-2">
        {[
          { id: 'includeCompanyInfo', label: language === 'fa' ? 'اطلاعات شرکت' : 'Company Information' },
          { id: 'includeDeviceInfo', label: language === 'fa' ? 'اطلاعات دستگاه' : 'Device Information' },
          { id: 'includeCustomerInfo', label: language === 'fa' ? 'اطلاعات مشتری' : 'Customer Information' },
          { id: 'includeTask', label: language === 'fa' ? 'شرح وظیفه' : 'Task Description' },
          { id: 'includeBuildingDescription', label: language === 'fa' ? 'توصیف ساختمان' : 'Building Description' },
          { id: 'includeWeatherConditions', label: language === 'fa' ? 'شرایط آب و هوایی' : 'Weather Conditions' },
          { id: 'includeImages', label: `${language === 'fa' ? 'تصاویر' : 'Images'} (${images.length})` },
          { id: 'includeMarkers', label: `${language === 'fa' ? 'نشانگرها' : 'Markers'} (${markers.length})` },
          { id: 'includeRegions', label: `${language === 'fa' ? 'نواحی' : 'Regions'} (${regions.length})` },
          { id: 'includeParameters', label: language === 'fa' ? 'پارامترهای اندازه‌گیری' : 'Measurement Parameters' }
        ].map(item => (
          <div key={item.id} className="flex items-center space-x-2">
            <Checkbox
              id={item.id}
              checked={reportSettings[item.id as keyof ReportSettings] as boolean}
              onCheckedChange={(checked) =>
                setReportSettings(prev => ({ ...prev, [item.id]: !!checked }))
              }
            />
            <Label htmlFor={item.id} className="text-sm cursor-pointer">{item.label}</Label>
          </div>
        ))}
      </div>
    </div>
  );

  const renderContentStep = () => (
    <div className="space-y-4 max-h-[400px] overflow-y-auto">
      {reportSettings.includeCustomerInfo && (
        <div className="space-y-2">
          <Label className="text-sm font-bold">{language === 'fa' ? 'اطلاعات مشتری' : 'Customer Info'}</Label>
          <Input
            placeholder={language === 'fa' ? 'نام مشتری' : 'Customer Name'}
            value={reportSettings.customer}
            onChange={(e) => setReportSettings(prev => ({ ...prev, customer: e.target.value }))}
            className="h-8"
          />
          <Input
            placeholder={language === 'fa' ? 'محل اندازه‌گیری' : 'Measuring Site'}
            value={reportSettings.measuringSite}
            onChange={(e) => setReportSettings(prev => ({ ...prev, measuringSite: e.target.value }))}
            className="h-8"
          />
        </div>
      )}

      {reportSettings.includeTask && (
        <div className="space-y-2">
          <Label className="text-sm font-bold">{language === 'fa' ? 'شرح وظیفه' : 'Task Description'}</Label>
          <Textarea
            value={reportSettings.task}
            onChange={(e) => setReportSettings(prev => ({ ...prev, task: e.target.value }))}
            className="h-20 text-sm"
          />
        </div>
      )}

      {reportSettings.includeBuildingDescription && (
        <div className="space-y-2">
          <Label className="text-sm font-bold">{language === 'fa' ? 'توصیف ساختمان' : 'Building Description'}</Label>
          <Textarea
            placeholder={language === 'fa' ? 'توصیف ساختمان' : 'Building Description'}
            value={reportSettings.buildingDescription}
            onChange={(e) => setReportSettings(prev => ({ ...prev, buildingDescription: e.target.value }))}
            className="h-16 text-sm"
          />
          <Input
            placeholder={language === 'fa' ? 'ساخت' : 'Construction'}
            value={reportSettings.construction}
            onChange={(e) => setReportSettings(prev => ({ ...prev, construction: e.target.value }))}
            className="h-8"
          />
          <Input
            placeholder={language === 'fa' ? 'جهت' : 'Orientation'}
            value={reportSettings.orientation}
            onChange={(e) => setReportSettings(prev => ({ ...prev, orientation: e.target.value }))}
            className="h-8"
          />
        </div>
      )}

      {reportSettings.includeWeatherConditions && (
        <div className="space-y-2">
          <Label className="text-sm font-bold">{language === 'fa' ? 'شرایط آب و هوایی' : 'Weather Conditions'}</Label>
          <div className="grid grid-cols-2 gap-2">
            <Input
              placeholder={language === 'fa' ? 'دمای خارج حداقل (24h)' : 'Outer Temp Min (24h)'}
              value={reportSettings.outerTempMin24h}
              onChange={(e) => setReportSettings(prev => ({ ...prev, outerTempMin24h: e.target.value }))}
              className="h-8 text-xs"
            />
            <Input
              placeholder={language === 'fa' ? 'دمای خارج حداکثر (24h)' : 'Outer Temp Max (24h)'}
              value={reportSettings.outerTempMax24h}
              onChange={(e) => setReportSettings(prev => ({ ...prev, outerTempMax24h: e.target.value }))}
              className="h-8 text-xs"
            />
            <Input
              placeholder={language === 'fa' ? 'بارندگی' : 'Precipitation'}
              value={reportSettings.precipitation}
              onChange={(e) => setReportSettings(prev => ({ ...prev, precipitation: e.target.value }))}
              className="h-8 text-xs"
            />
            <Input
              placeholder={language === 'fa' ? 'سرعت باد' : 'Wind Velocity'}
              value={reportSettings.windVelocity}
              onChange={(e) => setReportSettings(prev => ({ ...prev, windVelocity: e.target.value }))}
              className="h-8 text-xs"
            />
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label className="text-sm font-bold">{language === 'fa' ? 'یادداشت‌های اضافی' : 'Additional Notes'}</Label>
        <Textarea
          value={reportSettings.notes}
          onChange={(e) => setReportSettings(prev => ({ ...prev, notes: e.target.value }))}
          placeholder={language === 'fa' ? 'یادداشت‌ها...' : 'Notes...'}
          className="h-20 text-sm"
        />
      </div>
    </div>
  );

  const renderPreviewStep = () => (
    <div className="space-y-4">
      <div className="text-sm bg-gray-800 p-4 rounded space-y-2">
        <div><strong>{language === 'fa' ? 'عنوان:' : 'Title:'}</strong> {reportSettings.title}</div>
        <div><strong>{language === 'fa' ? 'زبان:' : 'Language:'}</strong> {reportSettings.reportLanguage === 'fa' ? 'فارسی' : 'English'}</div>
        <div><strong>{language === 'fa' ? 'تعداد تصاویر:' : 'Images:'}</strong> {reportSettings.includeImages ? images.length : 0}</div>
        <div><strong>{language === 'fa' ? 'نشانگرها:' : 'Markers:'}</strong> {reportSettings.includeMarkers ? markers.length : 0}</div>
        <div><strong>{language === 'fa' ? 'نواحی:' : 'Regions:'}</strong> {reportSettings.includeRegions ? regions.length : 0}</div>
      </div>

      {reportSettings.includeImages && Object.keys(imagesBase64).length === 0 && (
        <div className="text-xs text-yellow-500">
          {language === 'fa' ? '⏳ در حال آماده‌سازی تصاویر...' : '⏳ Preparing images...'}
        </div>
      )}
      {reportSettings.includeImages && Object.keys(imagesBase64).length > 0 && (
        <div className="text-xs text-green-500">
          {language === 'fa' ? `✓ ${Object.keys(imagesBase64).length} تصویر آماده` : `✓ ${Object.keys(imagesBase64).length} images ready`}
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <Button
          size="sm"
          onClick={() => handleGenerateReport('pdf')}
          className="h-10"
          disabled={isGenerating || (reportSettings.includeImages && Object.keys(imagesBase64).length === 0)}
        >
          <Download className="w-4 h-4 mr-2" />
          {language === 'fa' ? 'دانلود PDF' : 'Download PDF'}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => handleGenerateReport('docx')}
          className="h-10"
          disabled={isGenerating || (reportSettings.includeImages && Object.keys(imagesBase64).length === 0)}
        >
          <FileType className="w-4 h-4 mr-2" />
          {language === 'fa' ? 'دانلود Word' : 'Download Word'}
        </Button>
      </div>

      {/* Bilingual Reports Section */}
      <div className="mt-4 pt-4 border-t border-gray-600">
        <h4 className="text-xs font-medium mb-2 text-gray-400">
          {language === 'fa' ? 'گزارش دو زبانه (فارسی + انگلیسی)' : 'Bilingual Reports (Persian + English)'}
        </h4>
        <div className="grid grid-cols-2 gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => handleGenerateBilingualReport('pdf')}
            className="h-10"
            disabled={isGenerating || (reportSettings.includeImages && Object.keys(imagesBase64).length === 0)}
          >
            <Download className="w-4 h-4 mr-2" />
            {language === 'fa' ? 'دو PDF' : '2 PDFs (ZIP)'}
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => handleGenerateBilingualReport('docx')}
            className="h-10"
            disabled={isGenerating || (reportSettings.includeImages && Object.keys(imagesBase64).length === 0)}
          >
            <FileType className="w-4 h-4 mr-2" />
            {language === 'fa' ? 'دو Word' : '2 Words (ZIP)'}
          </Button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          {language === 'fa' 
            ? 'دانلود فایل ZIP شامل گزارش فارسی و انگلیسی' 
            : 'Download ZIP file containing Persian and English reports'}
        </p>
      </div>
    </div>
  );

  return (
    <Window id="reports" title={t.reports} minWidth={450} minHeight={500}>
      <div className="flex flex-col h-full">
        <div className="p-3 bg-gray-750 border-b border-gray-600">
          <h3 className="text-sm font-medium flex items-center">
            <FileText className="w-4 h-4 mr-2" />
            {language === 'fa' ? 'ویزارد گزارش‌گیری' : 'Report Wizard'}
          </h3>
        </div>

        <div className="p-4">
          {renderStepIndicator()}
        </div>

        <div className="flex-1 px-4 pb-4 overflow-auto">
          {currentStep === 'settings' && renderSettingsStep()}
          {currentStep === 'sections' && renderSectionsStep()}
          {currentStep === 'content' && renderContentStep()}
          {currentStep === 'preview' && renderPreviewStep()}
        </div>

        <div className="p-3 bg-gray-750 border-t border-gray-600 flex justify-between">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              const steps: WizardStep[] = ['settings', 'sections', 'content', 'preview'];
              const currentIndex = steps.indexOf(currentStep);
              if (currentIndex > 0) {
                setCurrentStep(steps[currentIndex - 1]);
              }
            }}
            disabled={currentStep === 'settings'}
            className="h-8"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            {language === 'fa' ? 'قبلی' : 'Previous'}
          </Button>

          <Button
            size="sm"
            onClick={() => {
              const steps: WizardStep[] = ['settings', 'sections', 'content', 'preview'];
              const currentIndex = steps.indexOf(currentStep);
              if (currentIndex < steps.length - 1) {
                setCurrentStep(steps[currentIndex + 1]);
              }
            }}
            disabled={currentStep === 'preview'}
            className="h-8"
          >
            {language === 'fa' ? 'بعدی' : 'Next'}
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>

        {/* Hidden Report Template for PDF */}
        <div
          ref={reportRef}
          style={{
            position: 'absolute',
            left: '-9999px',
            top: 0,
            width: '210mm',
            minHeight: '297mm',
            padding: '15mm',
            background: 'white',
            fontFamily: reportSettings.reportLanguage === 'fa' ? 'Tahoma, Arial' : 'Arial, sans-serif',
            fontSize: '11px',
            color: '#000',
            direction: reportSettings.reportLanguage === 'fa' ? 'rtl' : 'ltr',
            textAlign: reportSettings.reportLanguage === 'fa' ? 'right' : 'left'
          }}
        >
          {/* PDF content - similar to existing Reports.tsx */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            borderBottom: '2px solid #000',
            paddingBottom: '10px',
            marginBottom: '15px'
          }}>
            <h1 style={{ margin: 0, fontSize: '18px' }}>{reportSettings.title}</h1>
            <div style={{ fontSize: '10px' }}>
              <div>{new Date().toLocaleDateString(reportSettings.reportLanguage === 'fa' ? 'fa-IR' : 'en-US')}</div>
            </div>
          </div>

          {reportSettings.includeCompanyInfo && (
            <div style={{ marginBottom: '20px' }}>
              <h2 style={{ fontSize: '14px', borderBottom: '1px solid #666', paddingBottom: '5px' }}>
                {reportSettings.reportLanguage === 'fa' ? 'شرکت' : 'Company'}
              </h2>
              <p>{reportSettings.company}</p>
            </div>
          )}

          {/* Add more sections based on settings... */}
        </div>
      </div>
    </Window>
  );
}
