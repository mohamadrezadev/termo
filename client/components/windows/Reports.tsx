'use client';

import { useRef, useState, useEffect } from 'react';
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
  Eye
} from 'lucide-react';
import { toast } from 'sonner';

export default function Reports() {
  const {
    language,
    isRTL,
    currentProject,
    images,
    activeImageId,
    markers,
    regions,
    globalParameters
  } = useAppStore();

  const t = translations[language];
  const [reportSettings, setReportSettings] = useState({
    title: 'Thermal Analysis Report',
    reportLanguage: language as Language,
    includeImages: true,
    includeMarkers: true,
    includeRegions: true,
    includeParameters: true,
    includeStatistics: true,
    notes: ''
  });

  const [imagesBase64, setImagesBase64] = useState<{ [key: string]: string }>({});
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

  const handleGenerateReport = async (format: 'pdf' | 'html') => {
    if (!reportRef.current) return;
    
    if (reportSettings.includeImages && Object.keys(imagesBase64).length === 0) {
      toast.error(language === 'fa' ? 'لطفاً منتظر بمانید تا تصاویر آماده شوند...' : 'Please wait for images to load...');
      return;
    }

    const el = reportRef.current;
    const reportLang = reportSettings.reportLanguage;
    const isReportRTL = reportLang === 'fa';

    el.style.position = 'static';
    el.style.visibility = 'visible';

    await new Promise((resolve) => setTimeout(resolve, 500));

    try {
      if (format === 'pdf') {
        toast.info(language === 'fa' ? 'در حال تولید PDF...' : 'Generating PDF...');
        const html2pdf = (await import('html2pdf.js')).default;
        const options = {
          margin: [10, 10, 10, 10],
          filename: `${reportSettings.title.replace(/\s+/g, '_')}.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { 
            scale: 2,
            useCORS: true,
            allowTaint: true,
            logging: false,
            letterRendering: true
          },
          jsPDF: { 
            unit: 'mm', 
            format: 'a4', 
            orientation: 'portrait',
            compress: true
          },
          pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
        };
        
        await html2pdf().set(options).from(el).save();
        toast.success(language === 'fa' ? 'گزارش PDF با موفقیت ایجاد شد' : 'PDF report generated successfully');
      } else {
        const htmlContent = `
          <!DOCTYPE html>
          <html lang="${reportLang}" dir="${isReportRTL ? 'rtl' : 'ltr'}">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${reportSettings.title}</title>
            <style>
              body {
                font-family: ${isReportRTL ? 'Tahoma, Arial, sans-serif' : 'Arial, sans-serif'};
                direction: ${isReportRTL ? 'rtl' : 'ltr'};
                text-align: ${isReportRTL ? 'right' : 'left'};
                margin: 20px;
                background: white;
                color: black;
                font-size: 11px;
              }
              h1 { 
                border-bottom: 2px solid #000; 
                padding-bottom: 10px;
                margin-bottom: 20px;
                font-size: 18px;
              }
              h2 { 
                border-bottom: 1px solid #ccc; 
                padding-bottom: 5px;
                margin-top: 25px;
                margin-bottom: 10px;
                font-size: 14px;
              }
              table { 
                width: 100%; 
                border-collapse: collapse; 
                margin: 15px 0;
                font-size: 11px;
              }
              th, td { 
                border: 1px solid #666; 
                padding: 6px 8px; 
                text-align: ${isReportRTL ? 'right' : 'left'};
              }
              th { 
                background: #e0e0e0; 
                font-weight: bold;
              }
              img { 
                max-width: 100%; 
                height: auto; 
                margin: 10px 0;
                border: 1px solid #999;
                display: block;
              }
              .section { 
                margin-bottom: 25px; 
                page-break-inside: avoid;
              }
              .image-info {
                font-size: 10px;
                color: #555;
                margin-top: 5px;
              }
            </style>
          </head>
          <body>
            ${el.innerHTML}
          </body>
          </html>
        `;
        
        const blob = new Blob([htmlContent], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${reportSettings.title.replace(/\s+/g, '_')}.html`;
        link.click();
        URL.revokeObjectURL(url);
        toast.success(language === 'fa' ? 'گزارش HTML با موفقیت ایجاد شد' : 'HTML report generated successfully');
      }
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error(language === 'fa' ? 'خطا در تولید گزارش' : 'Error generating report');
    }

    el.style.left = '-9999px';
    el.style.visibility = 'hidden';
  };

  return (
    <Window id="reports" title={t.reports} minWidth={350} minHeight={400}>
      <div className="flex flex-col h-full">
        <div className="p-3 bg-gray-750 border-b border-gray-600">
          <h3 className="text-sm font-medium flex items-center">
            <FileText className="w-4 h-4 mr-2" />
            {t.reportWizard}
          </h3>
        </div>

        <div className="flex-1 p-4 space-y-4 overflow-auto">
          <div className="space-y-2">
            <Label className="text-sm">{language === 'fa' ? 'عنوان گزارش' : 'Report Title'}</Label>
            <Input
              value={reportSettings.title}
              onChange={(e) => setReportSettings(prev => ({ ...prev, title: e.target.value }))}
              className="h-8"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm">{t.reportLanguage}</Label>
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

          <div className="space-y-3">
            <Label className="text-sm">{language === 'fa' ? 'شامل در گزارش' : 'Include in Report'}</Label>
            <div className="space-y-2">
              {[
                { id: 'include-images', label: `${language === 'fa' ? 'تصاویر حرارتی و واقعی' : 'Thermal & Real Images'} (${images.length})`, key: 'includeImages' },
                { id: 'include-markers', label: `${language === 'fa' ? 'نشانگرهای دما' : 'Temperature Markers'} (${markers.length})`, key: 'includeMarkers' },
                { id: 'include-regions', label: `${language === 'fa' ? 'نواحی تحلیل' : 'Analysis Regions'} (${regions.length})`, key: 'includeRegions' },
                { id: 'include-parameters', label: language === 'fa' ? 'پارامترهای اندازه‌گیری' : 'Measurement Parameters', key: 'includeParameters' },
                { id: 'include-statistics', label: language === 'fa' ? 'تحلیل آماری' : 'Statistical Analysis', key: 'includeStatistics' }
              ].map(item => (
                <div key={item.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={item.id}
                    checked={reportSettings[item.key as keyof typeof reportSettings] as boolean}
                    onCheckedChange={(checked) =>
                      setReportSettings(prev => ({ ...prev, [item.key]: !!checked }))
                    }
                  />
                  <Label htmlFor={item.id} className="text-sm">{item.label}</Label>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm">{language === 'fa' ? 'یادداشت‌های اضافی' : 'Additional Notes'}</Label>
            <Textarea
              value={reportSettings.notes}
              onChange={(e) => setReportSettings(prev => ({ ...prev, notes: e.target.value }))}
              placeholder={language === 'fa' ? 'یادداشت‌ها یا مشاهدات اضافی...' : 'Enter any additional notes or observations...'}
              className="h-20 text-sm"
            />
          </div>

          {reportSettings.includeImages && images.length > 0 && (
            <div className="text-xs text-gray-400">
              {Object.keys(imagesBase64).length === 0 
                ? (language === 'fa' ? '⏳ در حال آماده‌سازی تصاویر...' : '⏳ Preparing images...')
                : (language === 'fa' ? `✓ ${Object.keys(imagesBase64).length} تصویر آماده` : `✓ ${Object.keys(imagesBase64).length} images ready`)
              }
            </div>
          )}
        </div>

        <div className="p-3 bg-gray-750 border-t border-gray-600 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Button 
              size="sm" 
              onClick={() => handleGenerateReport('pdf')} 
              className="h-8"
              disabled={reportSettings.includeImages && Object.keys(imagesBase64).length === 0}
            >
              <Download className="w-3 h-3 mr-1" />
              PDF
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => handleGenerateReport('html')} 
              className="h-8"
              disabled={reportSettings.includeImages && Object.keys(imagesBase64).length === 0}
            >
              <FileText className="w-3 h-3 mr-1" />
              HTML
            </Button>
          </div>
        </div>

        {/* Hidden Report Template */}
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
          {/* Header */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            borderBottom: '2px solid #000',
            paddingBottom: '10px',
            marginBottom: '15px'
          }}>
            <div>
              <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold' }}>{reportSettings.title}</h1>
            </div>
            <div style={{ fontSize: '10px', textAlign: reportSettings.reportLanguage === 'fa' ? 'left' : 'right' }}>
              <div style={{ fontWeight: 'bold', marginBottom: '3px' }}>
                {reportSettings.reportLanguage === 'fa' ? 'تاریخ گزارش:' : 'Report Date:'}
              </div>
              <div>{new Date().toLocaleDateString(reportSettings.reportLanguage === 'fa' ? 'fa-IR' : 'en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}</div>
              <div style={{ marginTop: '5px' }}>{new Date().toLocaleTimeString(reportSettings.reportLanguage === 'fa' ? 'fa-IR' : 'en-US')}</div>
            </div>
          </div>

          {/* Section 1: Project Info */}
          <div style={{ marginBottom: '20px' }}>
            <h2 style={{ 
              fontSize: '14px', 
              fontWeight: 'bold',
              borderBottom: '1px solid #666',
              paddingBottom: '5px',
              marginBottom: '10px'
            }}>
              {reportSettings.reportLanguage === 'fa' ? '۱. اطلاعات پروژه' : '1. Project Information'}
            </h2>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
              <tbody>
                <tr>
                  <td style={{ border: '1px solid #666', padding: '6px 8px', width: '25%', fontWeight: 'bold', background: '#f0f0f0' }}>
                    {reportSettings.reportLanguage === 'fa' ? 'نام پروژه:' : 'Project Name:'}
                  </td>
                  <td style={{ border: '1px solid #666', padding: '6px 8px', width: '25%' }}>
                    {currentProject?.name || '—'}
                  </td>
                  <td style={{ border: '1px solid #666', padding: '6px 8px', width: '25%', fontWeight: 'bold', background: '#f0f0f0' }}>
                    {reportSettings.reportLanguage === 'fa' ? 'اپراتور:' : 'Operator:'}
                  </td>
                  <td style={{ border: '1px solid #666', padding: '6px 8px', width: '25%' }}>
                    {currentProject?.operator || '—'}
                  </td>
                </tr>
                <tr>
                  <td style={{ border: '1px solid #666', padding: '6px 8px', fontWeight: 'bold', background: '#f0f0f0' }}>
                    {reportSettings.reportLanguage === 'fa' ? 'شرکت:' : 'Company:'}
                  </td>
                  <td style={{ border: '1px solid #666', padding: '6px 8px' }}>
                    {currentProject?.company || '—'}
                  </td>
                  <td style={{ border: '1px solid #666', padding: '6px 8px', fontWeight: 'bold', background: '#f0f0f0' }}>
                    {reportSettings.reportLanguage === 'fa' ? 'تاریخ بازرسی:' : 'Inspection Date:'}
                  </td>
                  <td style={{ border: '1px solid #666', padding: '6px 8px' }}>
                    {currentProject?.date ? new Date(currentProject.date).toLocaleDateString(reportSettings.reportLanguage === 'fa' ? 'fa-IR' : 'en-US') : '—'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Section 2: Measurement Parameters */}
          {reportSettings.includeParameters && (
            <div style={{ marginBottom: '20px', pageBreakInside: 'avoid' }}>
              <h2 style={{ 
                fontSize: '14px', 
                fontWeight: 'bold',
                borderBottom: '1px solid #666',
                paddingBottom: '5px',
                marginBottom: '10px'
              }}>
                {reportSettings.reportLanguage === 'fa' ? '۲. پارامترهای اندازه‌گیری' : '2. Measurement Parameters'}
              </h2>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                <tbody>
                  <tr>
                    <td style={{ border: '1px solid #666', padding: '6px 8px', fontWeight: 'bold', background: '#f0f0f0' }}>Emissivity</td>
                    <td style={{ border: '1px solid #666', padding: '6px 8px' }}>{globalParameters.emissivity.toFixed(2)}</td>
                    <td style={{ border: '1px solid #666', padding: '6px 8px', fontWeight: 'bold', background: '#f0f0f0' }}>Reflected Temp</td>
                    <td style={{ border: '1px solid #666', padding: '6px 8px' }}>{globalParameters.reflectedTemp.toFixed(1)}°C</td>
                  </tr>
                  <tr>
                    <td style={{ border: '1px solid #666', padding: '6px 8px', fontWeight: 'bold', background: '#f0f0f0' }}>Ambient Temp</td>
                    <td style={{ border: '1px solid #666', padding: '6px 8px' }}>{globalParameters.ambientTemp.toFixed(1)}°C</td>
                    <td style={{ border: '1px solid #666', padding: '6px 8px', fontWeight: 'bold', background: '#f0f0f0' }}>Humidity</td>
                    <td style={{ border: '1px solid #666', padding: '6px 8px' }}>{globalParameters.humidity.toFixed(0)}%</td>
                  </tr>
                  <tr>
                    <td style={{ border: '1px solid #666', padding: '6px 8px', fontWeight: 'bold', background: '#f0f0f0' }}>Distance</td>
                    <td style={{ border: '1px solid #666', padding: '6px 8px' }}>{globalParameters.distance.toFixed(1)}m</td>
                    <td style={{ border: '1px solid #666', padding: '6px 8px' }} colSpan={2}></td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* Section 3: Thermal Images */}
          {reportSettings.includeImages && images.length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <h2 style={{ 
                fontSize: '14px', 
                fontWeight: 'bold',
                borderBottom: '1px solid #666',
                paddingBottom: '5px',
                marginBottom: '10px',
                pageBreakBefore: 'always'
              }}>
                {reportSettings.reportLanguage === 'fa' ? '۳. تصاویر حرارتی' : '3. Thermal Images'}
              </h2>

              {images.map((img, idx) => (
                <div key={img.id} style={{ marginBottom: '25px', pageBreakInside: 'avoid' }}>
                  <div style={{ fontWeight: 'bold', marginBottom: '8px', fontSize: '12px' }}>
                    {reportSettings.reportLanguage === 'fa' ? `تصویر ${idx + 1}:` : `Image ${idx + 1}:`} {img.name}
                  </div>
                  
                  {/* Thermal Image */}
                  {(imagesBase64[`${img.id}_thermal`] || imagesBase64[`${img.id}_server`]) && (
                    <div style={{ marginBottom: '10px' }}>
                      <img 
                        src={imagesBase64[`${img.id}_thermal`] || imagesBase64[`${img.id}_server`]} 
                        alt={`${img.name}-thermal`} 
                        style={{ 
                          width: '100%', 
                          maxWidth: '180mm',
                          border: '1px solid #999', 
                          display: 'block'
                        }} 
                      />
                    </div>
                  )}
                  
                  {/* Real Image */}
                  {imagesBase64[img.id] && (
                    <div style={{ marginBottom: '10px' }}>
                      <img 
                        src={imagesBase64[img.id]} 
                        alt={img.name} 
                        style={{ 
                          width: '100%', 
                          maxWidth: '180mm',
                          border: '1px solid #999',
                          display: 'block'
                        }} 
                      />
                    </div>
                  )}
                  
                  {/* Temperature Info */}
                  {img.thermalData && (
                    <div style={{ fontSize: '10px', color: '#333', marginTop: '5px' }}>
                      <strong>{reportSettings.reportLanguage === 'fa' ? 'دمای حداکثر:' : 'Max Temp:'}</strong> {img.thermalData.maxTemp.toFixed(1)}°C
                      {' | '}
                      <strong>{reportSettings.reportLanguage === 'fa' ? 'دمای حداقل:' : 'Min Temp:'}</strong> {img.thermalData.minTemp.toFixed(1)}°C
                      {' | '}
                      <strong>{reportSettings.reportLanguage === 'fa' ? 'اختلاف:' : 'Delta:'}</strong> {(img.thermalData.maxTemp - img.thermalData.minTemp).toFixed(1)}°C
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Section 4: Temperature Markers */}
          {reportSettings.includeMarkers && markers.length > 0 && (
            <div style={{ marginBottom: '20px', pageBreakInside: 'avoid' }}>
              <h2 style={{ 
                fontSize: '14px', 
                fontWeight: 'bold',
                borderBottom: '1px solid #666',
                paddingBottom: '5px',
                marginBottom: '10px'
              }}>
                {reportSettings.reportLanguage === 'fa' ? '۴. نقاط اندازه‌گیری دما' : '4. Temperature Measurement Points'}
              </h2>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                <thead>
                  <tr style={{ background: '#e0e0e0' }}>
                    <th style={{ border: '1px solid #666', padding: '6px 8px', fontWeight: 'bold' }}>#</th>
                    <th style={{ border: '1px solid #666', padding: '6px 8px', fontWeight: 'bold' }}>
                      {reportSettings.reportLanguage === 'fa' ? 'برچسب' : 'Label'}
                    </th>
                    <th style={{ border: '1px solid #666', padding: '6px 8px', fontWeight: 'bold' }}>X</th>
                    <th style={{ border: '1px solid #666', padding: '6px 8px', fontWeight: 'bold' }}>Y</th>
                    <th style={{ border: '1px solid #666', padding: '6px 8px', fontWeight: 'bold' }}>
                      {reportSettings.reportLanguage === 'fa' ? 'دما (°C)' : 'Temperature (°C)'}
                    </th>
                    <th style={{ border: '1px solid #666', padding: '6px 8px', fontWeight: 'bold' }}>
                      {reportSettings.reportLanguage === 'fa' ? 'گسیل‌پذیری' : 'Emissivity'}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {markers.map((m, i) => (
                    <tr key={m.id}>
                      <td style={{ border: '1px solid #666', padding: '6px 8px', textAlign: 'center' }}>{i + 1}</td>
                      <td style={{ border: '1px solid #666', padding: '6px 8px' }}>{m.label}</td>
                      <td style={{ border: '1px solid #666', padding: '6px 8px', textAlign: 'center' }}>{Math.round(m.x)}</td>
                      <td style={{ border: '1px solid #666', padding: '6px 8px', textAlign: 'center' }}>{Math.round(m.y)}</td>
                      <td style={{ border: '1px solid #666', padding: '6px 8px', textAlign: 'center', fontWeight: 'bold' }}>
                        {m.temperature?.toFixed(2) || '—'}
                      </td>
                      <td style={{ border: '1px solid #666', padding: '6px 8px', textAlign: 'center' }}>{m.emissivity.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Section 5: Analysis Regions */}
          {reportSettings.includeRegions && regions.length > 0 && (
            <div style={{ marginBottom: '20px', pageBreakInside: 'avoid' }}>
              <h2 style={{ 
                fontSize: '14px', 
                fontWeight: 'bold',
                borderBottom: '1px solid #666',
                paddingBottom: '5px',
                marginBottom: '10px'
              }}>
                {reportSettings.reportLanguage === 'fa' ? '۵. نواحی تحلیل' : '5. Analysis Regions'}
              </h2>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                <thead>
                  <tr style={{ background: '#e0e0e0' }}>
                    <th style={{ border: '1px solid #666', padding: '6px 8px', fontWeight: 'bold' }}>#</th>
                    <th style={{ border: '1px solid #666', padding: '6px 8px', fontWeight: 'bold' }}>
                      {reportSettings.reportLanguage === 'fa' ? 'برچسب' : 'Label'}
                    </th>
                    <th style={{ border: '1px solid #666', padding: '6px 8px', fontWeight: 'bold' }}>
                      {reportSettings.reportLanguage === 'fa' ? 'نوع' : 'Type'}
                    </th>
                    <th style={{ border: '1px solid #666', padding: '6px 8px', fontWeight: 'bold' }}>
                      {reportSettings.reportLanguage === 'fa' ? 'حداقل (°C)' : 'Min (°C)'}
                    </th>
                    <th style={{ border: '1px solid #666', padding: '6px 8px', fontWeight: 'bold' }}>
                      {reportSettings.reportLanguage === 'fa' ? 'حداکثر (°C)' : 'Max (°C)'}
                    </th>
                    <th style={{ border: '1px solid #666', padding: '6px 8px', fontWeight: 'bold' }}>
                      {reportSettings.reportLanguage === 'fa' ? 'میانگین (°C)' : 'Avg (°C)'}
                    </th>
                    <th style={{ border: '1px solid #666', padding: '6px 8px', fontWeight: 'bold' }}>
                      {reportSettings.reportLanguage === 'fa' ? 'مساحت' : 'Area'}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {regions.map((r, i) => (
                    <tr key={r.id}>
                      <td style={{ border: '1px solid #666', padding: '6px 8px', textAlign: 'center' }}>{i + 1}</td>
                      <td style={{ border: '1px solid #666', padding: '6px 8px' }}>{r.label}</td>
                      <td style={{ border: '1px solid #666', padding: '6px 8px', textTransform: 'capitalize' }}>{r.type}</td>
                      <td style={{ border: '1px solid #666', padding: '6px 8px', textAlign: 'center' }}>{r.minTemp.toFixed(2)}</td>
                      <td style={{ border: '1px solid #666', padding: '6px 8px', textAlign: 'center' }}>{r.maxTemp.toFixed(2)}</td>
                      <td style={{ border: '1px solid #666', padding: '6px 8px', textAlign: 'center', fontWeight: 'bold' }}>{r.avgTemp.toFixed(2)}</td>
                      <td style={{ border: '1px solid #666', padding: '6px 8px', textAlign: 'center' }}>{r.area ? r.area.toFixed(1) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Section 6: Additional Notes */}
          {reportSettings.notes && (
            <div style={{ marginBottom: '20px', pageBreakInside: 'avoid' }}>
              <h2 style={{ 
                fontSize: '14px', 
                fontWeight: 'bold',
                borderBottom: '1px solid #666',
                paddingBottom: '5px',
                marginBottom: '10px'
              }}>
                {reportSettings.reportLanguage === 'fa' ? '۶. یادداشت‌ها و مشاهدات' : '6. Notes and Observations'}
              </h2>
              <div style={{ 
                whiteSpace: 'pre-wrap', 
                padding: '10px',
                background: '#f9f9f9',
                border: '1px solid #ddd',
                borderRadius: '3px',
                fontSize: '10px',
                lineHeight: '1.6'
              }}>
                {reportSettings.notes}
              </div>
            </div>
          )}

          {/* Footer */}
          <div style={{
            marginTop: '30px',
            paddingTop: '15px',
            borderTop: '1px solid #ccc',
            fontSize: '9px',
            color: '#666',
            textAlign: 'center'
          }}>
            <div style={{ marginBottom: '5px' }}>
              {reportSettings.reportLanguage === 'fa'
                ? 'این گزارش توسط نرم‌افزار Thermal Analyzer Pro تولید شده است'
                : 'This report was generated by Thermal Analyzer Pro'}
            </div>
            <div>
              {reportSettings.reportLanguage === 'fa'
                ? `صفحه 1 از 1 | تولید شده در: ${new Date().toLocaleString(reportSettings.reportLanguage === 'fa' ? 'fa-IR' : 'en-US')}`
                : `Page 1 of 1 | Generated on: ${new Date().toLocaleString(reportSettings.reportLanguage === 'fa' ? 'fa-IR' : 'en-US')}`}
            </div>
          </div>
        </div>
      </div>
    </Window>
  );
}


// 'use client';

// import { useRef, useState, useEffect } from 'react';
// import { useAppStore } from '@/lib/store';
// import { translations, Language } from '@/lib/translations';
// import Window from './Window';
// import { Button } from '@/components/ui/button';
// import { Input } from '@/components/ui/input';
// import { Label } from '@/components/ui/label';
// import { Textarea } from '@/components/ui/textarea';
// import { Checkbox } from '@/components/ui/checkbox';
// import {
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
//   SelectValue,
// } from '@/components/ui/select';
// import {
//   FileText,
//   Download,
//   Eye
// } from 'lucide-react';
// import { toast } from 'sonner';

// export default function Reports() {
//   const {
//     language,
//     isRTL,
//     currentProject,
//     images,
//     activeImageId,
//     markers,
//     regions
//   } = useAppStore();

//   const t = translations[language];
//   const [reportSettings, setReportSettings] = useState({
//     title: 'Thermal Analysis Report',
//     reportLanguage: language as Language,
//     includeImages: true,
//     includeMarkers: true,
//     includeRegions: true,
//     includeParameters: true,
//     includeStatistics: true,
//     notes: ''
//   });

//   const [imagesBase64, setImagesBase64] = useState<{ [key: string]: string }>({});
//   const reportRef = useRef<HTMLDivElement>(null);

//   // تبدیل تصاویر به base64 هنگام تغییر images
//   useEffect(() => {
//     const convertImagesToBase64 = async () => {
//       const base64Images: { [key: string]: string } = {};
      
//       for (const img of images) {
//         try {
//           // اگر تصویر واقعی دارد
//           if (img.realImage) {
//             // اگر از قبل base64 است
//             if (img.realImage.startsWith('data:')) {
//               base64Images[img.id] = img.realImage;
//             } else {
//               // تبدیل URL به base64
//               const response = await fetch(img.realImage);
//               const blob = await response.blob();
//               const base64 = await new Promise<string>((resolve) => {
//                 const reader = new FileReader();
//                 reader.onloadend = () => resolve(reader.result as string);
//                 reader.readAsDataURL(blob);
//               });
//               base64Images[img.id] = base64;
//             }
//           }
          
//           // اگر canvas حرارتی دارد
//           if (img.canvas) {
//             base64Images[`${img.id}_thermal`] = img.canvas.toDataURL('image/png');
//           }
          
//           // اگر URL سرور دارد
//           if (img.serverRenderedThermalUrl) {
//             try {
//               const response = await fetch(img.serverRenderedThermalUrl);
//               const blob = await response.blob();
//               const base64 = await new Promise<string>((resolve) => {
//                 const reader = new FileReader();
//                 reader.onloadend = () => resolve(reader.result as string);
//                 reader.readAsDataURL(blob);
//               });
//               base64Images[`${img.id}_server`] = base64;
//             } catch (error) {
//               console.error('Error converting server image:', error);
//             }
//           }
//         } catch (error) {
//           console.error(`Error converting image ${img.id}:`, error);
//         }
//       }
      
//       setImagesBase64(base64Images);
//     };

//     if (images.length > 0) {
//       convertImagesToBase64();
//     }
//   }, [images]);

//   const handleGenerateReport = async (format: 'pdf' | 'html') => {
//     if (!reportRef.current) return;
    
//     if (reportSettings.includeImages && Object.keys(imagesBase64).length === 0) {
//       toast.error(language === 'fa' ? 'لطفاً منتظر بمانید تا تصاویر آماده شوند...' : 'Please wait for images to load...');
//       return;
//     }

//     const el = reportRef.current;
//     const reportLang = reportSettings.reportLanguage;
//     const isReportRTL = reportLang === 'fa';
//     const rt = translations[reportLang];

//     el.style.position = 'static';
//     el.style.visibility = 'visible';

//     await new Promise((resolve) => setTimeout(resolve, 500));

//     try {
//       if (format === 'pdf') {
//         toast.info(language === 'fa' ? 'در حال تولید PDF...' : 'Generating PDF...');
//         const html2pdf = (await import('html2pdf.js')).default;
//         const options = {
//           margin: 10,
//           filename: `${reportSettings.title.replace(/\s+/g, '_')}.pdf`,
//           image: { type: 'jpeg', quality: 0.95 },
//           html2canvas: { 
//             scale: 2,
//             useCORS: true,
//             allowTaint: true,
//             logging: false
//           },
//           jsPDF: { 
//             unit: 'mm', 
//             format: 'a4', 
//             orientation: 'portrait',
//             compress: true
//           },
//           pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
//         };
        
//         await html2pdf().set(options).from(el).save();
//         toast.success(language === 'fa' ? 'گزارش PDF با موفقیت ایجاد شد' : 'PDF report generated successfully');
//       } else {
//         const htmlContent = `
//           <!DOCTYPE html>
//           <html lang="${reportLang}" dir="${isReportRTL ? 'rtl' : 'ltr'}">
//           <head>
//             <meta charset="UTF-8">
//             <meta name="viewport" content="width=device-width, initial-scale=1.0">
//             <title>${reportSettings.title}</title>
//             <style>
//               body {
//                 font-family: ${isReportRTL ? 'Tahoma, Arial, sans-serif' : 'Arial, sans-serif'};
//                 direction: ${isReportRTL ? 'rtl' : 'ltr'};
//                 text-align: ${isReportRTL ? 'right' : 'left'};
//                 margin: 20px;
//                 background: white;
//                 color: black;
//               }
//               h1 { 
//                 border-bottom: 2px solid #000; 
//                 padding-bottom: 10px;
//                 margin-bottom: 20px;
//               }
//               h2 { 
//                 border-bottom: 1px solid #ccc; 
//                 padding-bottom: 5px;
//                 margin-top: 30px;
//               }
//               table { 
//                 width: 100%; 
//                 border-collapse: collapse; 
//                 margin: 20px 0;
//               }
//               th, td { 
//                 border: 1px solid #999; 
//                 padding: 8px; 
//                 text-align: ${isReportRTL ? 'right' : 'left'};
//               }
//               th { background: #f0f0f0; }
//               img { 
//                 max-width: 100%; 
//                 height: auto; 
//                 margin: 10px 0;
//                 border: 1px solid #ccc;
//               }
//               .section { margin-bottom: 30px; }
//             </style>
//           </head>
//           <body>
//             ${el.innerHTML}
//           </body>
//           </html>
//         `;
        
//         const blob = new Blob([htmlContent], { type: 'text/html' });
//         const url = URL.createObjectURL(blob);
//         const link = document.createElement('a');
//         link.href = url;
//         link.download = `${reportSettings.title.replace(/\s+/g, '_')}.html`;
//         link.click();
//         URL.revokeObjectURL(url);
//         toast.success(language === 'fa' ? 'گزارش HTML با موفقیت ایجاد شد' : 'HTML report generated successfully');
//       }
//     } catch (error) {
//       console.error('Error generating report:', error);
//       toast.error(language === 'fa' ? 'خطا در تولید گزارش' : 'Error generating report');
//     }

//     el.style.left = '-9999px';
//     el.style.visibility = 'hidden';
//   };

//   return (
//     <Window id="reports" title={t.reports} minWidth={350} minHeight={400}>
//       <div className="flex flex-col h-full">
//         <div className="p-3 bg-gray-750 border-b border-gray-600">
//           <h3 className="text-sm font-medium flex items-center">
//             <FileText className="w-4 h-4 mr-2" />
//             {t.reportWizard}
//           </h3>
//         </div>

//         <div className="flex-1 p-4 space-y-4 overflow-auto">
//           <div className="space-y-2">
//             <Label className="text-sm">{language === 'fa' ? 'عنوان گزارش' : 'Report Title'}</Label>
//             <Input
//               value={reportSettings.title}
//               onChange={(e) => setReportSettings(prev => ({ ...prev, title: e.target.value }))}
//               className="h-8"
//             />
//           </div>

//           <div className="space-y-2">
//             <Label className="text-sm">{t.reportLanguage}</Label>
//             <Select
//               value={reportSettings.reportLanguage}
//               onValueChange={(value) => setReportSettings(prev => ({ ...prev, reportLanguage: value as Language }))}
//             >
//               <SelectTrigger className="h-8">
//                 <SelectValue />
//               </SelectTrigger>
//               <SelectContent>
//                 <SelectItem value="en">English</SelectItem>
//                 <SelectItem value="fa">فارسی</SelectItem>
//               </SelectContent>
//             </Select>
//           </div>

//           <div className="space-y-3">
//             <Label className="text-sm">{language === 'fa' ? 'شامل در گزارش' : 'Include in Report'}</Label>
//             <div className="space-y-2">
//               {[
//                 { id: 'include-images', label: `${language === 'fa' ? 'تصاویر حرارتی و واقعی' : 'Thermal & Real Images'} (${images.length})`, key: 'includeImages' },
//                 { id: 'include-markers', label: `${language === 'fa' ? 'نشانگرهای دما' : 'Temperature Markers'} (${markers.length})`, key: 'includeMarkers' },
//                 { id: 'include-regions', label: `${language === 'fa' ? 'نواحی تحلیل' : 'Analysis Regions'} (${regions.length})`, key: 'includeRegions' },
//                 { id: 'include-parameters', label: language === 'fa' ? 'پارامترهای اندازه‌گیری' : 'Measurement Parameters', key: 'includeParameters' },
//                 { id: 'include-statistics', label: language === 'fa' ? 'تحلیل آماری' : 'Statistical Analysis', key: 'includeStatistics' }
//               ].map(item => (
//                 <div key={item.id} className="flex items-center space-x-2">
//                   <Checkbox
//                     id={item.id}
//                     checked={reportSettings[item.key as keyof typeof reportSettings] as boolean}
//                     onCheckedChange={(checked) =>
//                       setReportSettings(prev => ({ ...prev, [item.key]: !!checked }))
//                     }
//                   />
//                   <Label htmlFor={item.id} className="text-sm">{item.label}</Label>
//                 </div>
//               ))}
//             </div>
//           </div>

//           <div className="space-y-2">
//             <Label className="text-sm">{language === 'fa' ? 'یادداشت‌های اضافی' : 'Additional Notes'}</Label>
//             <Textarea
//               value={reportSettings.notes}
//               onChange={(e) => setReportSettings(prev => ({ ...prev, notes: e.target.value }))}
//               placeholder={language === 'fa' ? 'یادداشت‌ها یا مشاهدات اضافی...' : 'Enter any additional notes or observations...'}
//               className="h-20 text-sm"
//             />
//           </div>

//           {reportSettings.includeImages && images.length > 0 && (
//             <div className="text-xs text-gray-400">
//               {Object.keys(imagesBase64).length === 0 
//                 ? (language === 'fa' ? '⏳ در حال آماده‌سازی تصاویر...' : '⏳ Preparing images...')
//                 : (language === 'fa' ? `✓ ${Object.keys(imagesBase64).length} تصویر آماده` : `✓ ${Object.keys(imagesBase64).length} images ready`)
//               }
//             </div>
//           )}
//         </div>

//         <div className="p-3 bg-gray-750 border-t border-gray-600 space-y-3">
//           <div className="grid grid-cols-2 gap-2">
//             <Button 
//               size="sm" 
//               onClick={() => handleGenerateReport('pdf')} 
//               className="h-8"
//               disabled={reportSettings.includeImages && Object.keys(imagesBase64).length === 0}
//             >
//               <Download className="w-3 h-3 mr-1" />
//               PDF
//             </Button>
//             <Button 
//               size="sm" 
//               variant="outline" 
//               onClick={() => handleGenerateReport('html')} 
//               className="h-8"
//               disabled={reportSettings.includeImages && Object.keys(imagesBase64).length === 0}
//             >
//               <FileText className="w-3 h-3 mr-1" />
//               HTML
//             </Button>
//           </div>
//         </div>

//         {/* Hidden Report Template */}
//         <div
//   ref={reportRef}
//   style={{
//     position: 'absolute',
//     left: '-9999px',
//     top: 0,
//     width: '210mm',
//     minHeight: '297mm',
//     padding: '15mm',
//     background: 'white',
//     fontFamily: reportSettings.reportLanguage === 'fa' ? 'Tahoma' : 'Arial Narrow, Arial, sans-serif',
//     fontSize: '11px',
//     color: '#000',
//     direction: reportSettings.reportLanguage === 'fa' ? 'rtl' : 'ltr',
//     textAlign: reportSettings.reportLanguage === 'fa' ? 'right' : 'left'
//   }}
// >
//   {/* Header */}
//   <div style={{
//     display: 'flex',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     borderBottom: '2px solid #000',
//     paddingBottom: '8px',
//     marginBottom: '12px'
//   }}>
//     <h2 style={{ fontWeight: 'bold', fontSize: '16px' }}>{reportSettings.title}</h2>
//     <div style={{ fontSize: '10px' }}>
//       <p>{reportSettings.reportLanguage === 'fa' ? 'گزارش حرارتی' : 'Thermal Analysis Report'}</p>
//       <p>{new Date().toLocaleDateString(reportSettings.reportLanguage === 'fa' ? 'fa-IR' : 'en-US')}</p>
//     </div>
//   </div>

//   {/* Section 1: Project Info */}
//   <h3 style={{ borderBottom: '1px solid #000', marginBottom: '5px', fontSize: '13px' }}>
//     {reportSettings.reportLanguage === 'fa' ? '۱. اطلاعات پروژه' : '1. Project Information'}
//   </h3>
//   <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '12px' }}>
//     <tbody>
//       <tr>
//         <td><strong>{reportSettings.reportLanguage === 'fa' ? 'نام پروژه:' : 'Project Name:'}</strong></td>
//         <td>{currentProject?.name || '—'}</td>
//         <td><strong>{reportSettings.reportLanguage === 'fa' ? 'اپراتور:' : 'Operator:'}</strong></td>
//         <td>{currentProject?.operator || '—'}</td>
//       </tr>
//       <tr>
//         <td><strong>{reportSettings.reportLanguage === 'fa' ? 'شرکت:' : 'Company:'}</strong></td>
//         <td>{currentProject?.company || '—'}</td>
//         <td><strong>{reportSettings.reportLanguage === 'fa' ? 'تاریخ:' : 'Date:'}</strong></td>
//         <td>{currentProject?.date ? new Date(currentProject.date).toLocaleDateString(reportSettings.reportLanguage === 'fa' ? 'fa-IR' : 'en-US') : '—'}</td>
//       </tr>
//     </tbody>
//   </table>

//   {/* Section 2: Measurement Parameters */}
//   {reportSettings.includeParameters && (
//     <>
//       <h3 style={{ borderBottom: '1px solid #000', marginBottom: '5px', fontSize: '13px' }}>
//         {reportSettings.reportLanguage === 'fa' ? '۲. پارامترهای اندازه‌گیری' : '2. Measurement Parameters'}
//       </h3>
//       <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '12px' }}>
//         <tbody>
//           <tr><td>Emissivity:</td><td>0.95</td><td>Reflected Temp:</td><td>20°C</td></tr>
//           <tr><td>Ambient Temp:</td><td>20°C</td><td>Humidity:</td><td>50%</td></tr>
//           <tr><td>Distance:</td><td>1.0m</td><td></td><td></td></tr>
//         </tbody>
//       </table>
//     </>
//   )}

//   {/* Section 3: Images */}
//   {reportSettings.includeImages && images.length > 0 && (
//     <>
//       <h3 style={{ borderBottom: '1px solid #000', marginBottom: '5px', fontSize: '13px', pageBreakBefore: 'always' }}>
//         {reportSettings.reportLanguage === 'fa' ? '۳. تصاویر حرارتی' : '3. Thermal Images'}
//       </h3>

//       {images.map((img, idx) => (
//         <div key={img.id} style={{ marginBottom: '20px' }}>
//           <strong>{reportSettings.reportLanguage === 'fa' ? `تصویر ${idx + 1}:` : `Image ${idx + 1}:`} {img.name}</strong>
//           {imagesBase64[img.id] && (
//             <img src={imagesBase64[img.id]} alt={img.name} style={{ width: '100%', border: '1px solid #999', marginTop: '5px' }} />
//           )}
//           {(imagesBase64[`${img.id}_thermal`] || imagesBase64[`${img.id}_server`]) && (
//             <img src={imagesBase64[`${img.id}_thermal`] || imagesBase64[`${img.id}_server`]} alt={`${img.name}-thermal`} style={{ width: '100%', border: '1px solid #999', marginTop: '5px' }} />
//           )}
//           {img.thermalData && (
//             <p style={{ fontSize: '10px', marginTop: '4px' }}>
//               {reportSettings.reportLanguage === 'fa'
//                 ? `حداکثر: ${img.thermalData.maxTemp.toFixed(1)}°C | حداقل: ${img.thermalData.minTemp.toFixed(1)}°C`
//                 : `Max: ${img.thermalData.maxTemp.toFixed(1)}°C | Min: ${img.thermalData.minTemp.toFixed(1)}°C`}
//             </p>
//           )}
//         </div>
//       ))}
//     </>
//   )}

//   {/* Section 4: Markers */}
//   {reportSettings.includeMarkers && markers.length > 0 && (
//     <>
//       <h3 style={{ borderBottom: '1px solid #000', marginBottom: '5px', fontSize: '13px' }}>
//         {reportSettings.reportLanguage === 'fa' ? '۴. نقاط دما' : '4. Temperature Markers'}
//       </h3>
//       <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '12px' }}>
//         <thead>
//           <tr style={{ background: '#eee' }}>
//             <th>#</th>
//             <th>{reportSettings.reportLanguage === 'fa' ? 'برچسب' : 'Label'}</th>
//             <th>X</th>
//             <th>Y</th>
//             <th>{reportSettings.reportLanguage === 'fa' ? 'دما (°C)' : 'Temp (°C)'}</th>
//           </tr>
//         </thead>
//         <tbody>
//           {markers.map((m, i) => (
//             <tr key={m.id}>
//               <td>{i + 1}</td>
//               <td>{m.label}</td>
//               <td>{m.x.toFixed(1)}</td>
//               <td>{m.y.toFixed(1)}</td>
//               <td>{m.temperature?.toFixed(1) || '—'}</td>
//             </tr>
//           ))}
//         </tbody>
//       </table>
//     </>
//   )}

//   {/* Notes */}
//   {reportSettings.notes && (
//     <>
//       <h3 style={{ borderBottom: '1px solid #000', marginBottom: '5px', fontSize: '13px' }}>
//         {reportSettings.reportLanguage === 'fa' ? 'یادداشت‌ها' : 'Notes'}
//       </h3>
//       <p style={{ whiteSpace: 'pre-wrap', marginBottom: '10px' }}>{reportSettings.notes}</p>
//     </>
//   )}

//   {/* Footer */}
//   <div style={{
//     position: 'absolute',
//     bottom: '15mm',
//     width: '100%',
//     textAlign: 'center',
//     fontSize: '9px',
//     color: '#777'
//   }}>
//     {reportSettings.reportLanguage === 'fa'
//       ? 'گزارش تولید شده توسط Directhub Thermal Analyzer'
//       : 'Report generated by Directhub Thermal Analyzer'}
//   </div>
// </div>

//       </div>
//     </Window>
//   );
// }