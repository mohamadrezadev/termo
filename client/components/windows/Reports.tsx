'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAppStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { FileDown, Eye, Edit, Loader2, ChevronRight, ChevronLeft, CheckCircle2, Settings, Image as ImageIcon, FileText } from 'lucide-react';
import Window from './Window';
import { translations } from '@/lib/translations';

// Dynamic import for browser-only library
let html2pdf: any = null;
if (typeof window !== 'undefined') {
  import('html2pdf.js').then(module => {
    html2pdf = module.default;
  });
}

// Types
interface WizardStep {
  id: number;
  title: { fa: string; en: string };
  icon: React.ReactNode;
}

interface ReportSettings {
  operator: string;
  company: string;
  language: 'fa' | 'en';
  includeHistogram: boolean;
  includeStatistics: boolean;
  includeImages: boolean;
  includeMarkers: boolean;
  includeRegions: boolean;
}

interface ReportData {
  settings: ReportSettings;
  selectedImages: string[];
  selectedMarkers: string[];
  selectedRegions: string[];
  selectedHistograms: string[]; // imageId for histograms
  customNotes: string;
  htmlContent: string;
}

const WIZARD_STEPS: WizardStep[] = [
  { 
    id: 1, 
    title: { fa: 'تنظیمات اولیه', en: 'Initial Settings' },
    icon: <Settings className="w-5 h-5" />
  },
  { 
    id: 2, 
    title: { fa: 'انتخاب داده‌ها', en: 'Select Data' },
    icon: <ImageIcon className="w-5 h-5" />
  },
  { 
    id: 3, 
    title: { fa: 'پیش‌نمایش و ویرایش', en: 'Preview & Edit' },
    icon: <Eye className="w-5 h-5" />
  },
  { 
    id: 4, 
    title: { fa: 'خروجی', en: 'Export' },
    icon: <FileDown className="w-5 h-5" />
  }
];

// Helper: Convert image to base64
const getImageAsBase64 = async (url: string): Promise<string> => {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Error converting image:', error);
    return '';
  }
};

// Helper: Generate temperature distribution chart (Area Chart)
const generateHistogram = (temperatures: number[]): string => {
  if (temperatures.length === 0) return '';
  
  const min = Math.min(...temperatures);
  const max = Math.max(...temperatures);
  const bins = 20; // More bins for smoother curve
  const binSize = (max - min) / bins || 1;
  const histogram = new Array(bins).fill(0);
  
  temperatures.forEach(temp => {
    const binIndex = Math.min(Math.floor((temp - min) / binSize), bins - 1);
    histogram[binIndex]++;
  });
  
  const maxCount = Math.max(...histogram) || 1;
  const width = 600;  // Reduced from 800
  const height = 180;  // Reduced from 250
  const padding = { top: 15, right: 30, bottom: 35, left: 50 };  // Reduced padding
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const pointSpacing = chartWidth / (bins - 1);
  
  // Create smooth curve points
  const points: Array<{x: number, y: number}> = [];
  histogram.forEach((count, i) => {
    const x = padding.left + i * pointSpacing;
    const y = padding.top + chartHeight - (count / maxCount) * chartHeight;
    points.push({ x, y });
  });
  
  // Create SVG path for area chart
  let pathData = `M ${padding.left} ${padding.top + chartHeight}`;
  points.forEach((point, i) => {
    if (i === 0) {
      pathData += ` L ${point.x} ${point.y}`;
    } else {
      // Smooth curve using quadratic bezier
      const prevPoint = points[i - 1];
      const midX = (prevPoint.x + point.x) / 2;
      pathData += ` Q ${prevPoint.x} ${prevPoint.y}, ${midX} ${(prevPoint.y + point.y) / 2}`;
      pathData += ` Q ${point.x} ${point.y}, ${point.x} ${point.y}`;
    }
  });
  pathData += ` L ${padding.left + chartWidth} ${padding.top + chartHeight} Z`;
  
  // Create line path (top border of area)
  let linePath = `M ${points[0].x} ${points[0].y}`;
  points.forEach((point, i) => {
    if (i > 0) {
      const prevPoint = points[i - 1];
      const midX = (prevPoint.x + point.x) / 2;
      linePath += ` Q ${prevPoint.x} ${prevPoint.y}, ${midX} ${(prevPoint.y + point.y) / 2}`;
      linePath += ` Q ${point.x} ${point.y}, ${point.x} ${point.y}`;
    }
  });
  
  let svg = `<svg width="${width}" height="${height}" style="margin: 10px auto; display: block; background: white; border-radius: 6px; max-width: 100%;">`;
  
  // Add gradient
  svg += `
    <defs>
      <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" style="stop-color:#3b82f6;stop-opacity:0.8" />
        <stop offset="100%" style="stop-color:#3b82f6;stop-opacity:0.1" />
      </linearGradient>
    </defs>
  `;
  
  // Draw grid lines
  for (let i = 0; i <= 5; i++) {
    const y = padding.top + (chartHeight / 5) * i;
    svg += `
      <line x1="${padding.left}" y1="${y}" x2="${padding.left + chartWidth}" y2="${y}" 
            stroke="#e5e7eb" stroke-width="1" stroke-dasharray="3,3"/>
    `;
  }
  
  // Draw area
  svg += `<path d="${pathData}" fill="url(#areaGradient)" opacity="0.9"/>`;
  
  // Draw line
  svg += `<path d="${linePath}" fill="none" stroke="#1e40af" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`;
  
  // Draw points
  points.forEach((point, i) => {
    const count = histogram[i];
    if (count > 0) {
      svg += `
        <circle cx="${point.x}" cy="${point.y}" r="3" fill="#1e40af" stroke="white" stroke-width="1.5"/>
        <title>${(min + i * binSize).toFixed(1)}°C: ${count} نقطه</title>
      `;
    }
  });
  
  // Draw axes
  svg += `
    <line x1="${padding.left}" y1="${padding.top}" x2="${padding.left}" y2="${padding.top + chartHeight}" 
          stroke="#374151" stroke-width="1.5"/>
    <line x1="${padding.left}" y1="${padding.top + chartHeight}" x2="${padding.left + chartWidth}" y2="${padding.top + chartHeight}" 
          stroke="#374151" stroke-width="1.5"/>
  `;
  
  // Add temperature labels
  for (let i = 0; i <= 5; i++) {
    const temp = min + ((max - min) / 5) * i;
    const x = padding.left + (chartWidth / 5) * i;
    svg += `
      <text x="${x}" y="${padding.top + chartHeight + 20}" 
            text-anchor="middle" font-size="10" fill="#374151" font-weight="500">
        ${temp.toFixed(1)}°C
      </text>
    `;
  }
  
  // Add count labels
  for (let i = 0; i <= 5; i++) {
    const count = Math.round((maxCount / 5) * (5 - i));
    const y = padding.top + (chartHeight / 5) * i;
    svg += `
      <text x="${padding.left - 8}" y="${y + 4}" 
            text-anchor="end" font-size="9" fill="#64748b">
        ${count}
      </text>
    `;
  }
  
  // Add axis labels
  svg += `
    <text x="${width / 2}" y="${height - 3}" 
          text-anchor="middle" font-size="11" fill="#1e293b" font-weight="600">
      دما (Temperature)
    </text>
    <text x="${padding.left - 38}" y="${height / 2}" 
          text-anchor="middle" font-size="11" fill="#1e293b" font-weight="600"
          transform="rotate(-90, ${padding.left - 38}, ${height / 2})">
      تعداد (Count)
    </text>
  `;
  
  svg += '</svg>';
  return svg;
};

export default function Reports() {
  const currentProject = useAppStore((state) => state.currentProject);
  const images = useAppStore((state) => state.images);
  const markers = useAppStore((state) => state.markers);
  const regions = useAppStore((state) => state.regions);
  const language = useAppStore((state) => state.language);
  const t = translations[language];

  // Wizard state
  const [currentStep, setCurrentStep] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Report data
  const [reportData, setReportData] = useState<ReportData>({
    settings: {
      operator: '',
      company: '',
      language: language,  // Use current language from store
      includeHistogram: true,
      includeStatistics: true,
      includeImages: true,
      includeMarkers: true,
      includeRegions: true
    },
    selectedImages: Array.from(new Set(images.map(img => img.id))),
    selectedMarkers: markers.map(m => m.id),
    selectedRegions: regions.map(r => r.id),
    selectedHistograms: Array.from(new Set(images.map(img => img.id))),
    customNotes: '',
    htmlContent: ''
  });

  // Initialize selected data when images/markers/regions change
  useEffect(() => {
    // Get unique image IDs only
    const uniqueImageIds = Array.from(new Set(images.map(img => img.id)));
    const markerIds = markers.map(m => m.id);
    const regionIds = regions.map(r => r.id);
    
    console.log('[REPORT] Data changed:', {
      images: images.length,
      uniqueImages: uniqueImageIds.length,
      markers: markers.length,
      markerIds: markerIds.length,
      regions: regions.length,
      regionIds: regionIds.length,
      regionsData: regions.map(r => ({ id: r.id, imageId: r.imageId, label: r.label }))
    });
    
    setReportData(prev => ({
      ...prev,
      selectedImages: uniqueImageIds,
      selectedMarkers: markerIds,
      selectedRegions: regionIds,
      selectedHistograms: uniqueImageIds
    }));
  }, [images, markers, regions]);

  // Update report language when global language changes
  useEffect(() => {
    setReportData(prev => ({
      ...prev,
      settings: {
        ...prev.settings,
        language: language
      }
    }));
  }, [language]);

  // Filtered data based on selections
  const filteredImages = useMemo(() => {
    // Remove duplicates by ID
    const uniqueImages = images.filter(img => reportData.selectedImages.includes(img.id));
    const seen = new Set<string>();
    return uniqueImages.filter(img => {
      if (seen.has(img.id)) {
        console.warn('[REPORT] Duplicate image found and removed:', img.id, img.name);
        return false;
      }
      seen.add(img.id);
      return true;
    });
  }, [images, reportData.selectedImages]);

  const filteredMarkers = useMemo(() => 
    markers.filter(m => 
      reportData.selectedImages.includes(m.imageId) && 
      reportData.selectedMarkers.includes(m.id)
    ),
    [markers, reportData.selectedImages, reportData.selectedMarkers]
  );

  const filteredRegions = useMemo(() => {
    const filtered = regions.filter(r => 
      reportData.selectedImages.includes(r.imageId) && 
      reportData.selectedRegions.includes(r.id)
    );
    console.log('[REPORT] Filtered regions:', {
      total: regions.length,
      selectedImages: reportData.selectedImages,
      selectedRegions: reportData.selectedRegions,
      filtered: filtered.length,
      regions: regions.map(r => ({ id: r.id, imageId: r.imageId, label: r.label }))
    });
    return filtered;
  }, [regions, reportData.selectedImages, reportData.selectedRegions]);

  const filteredHistograms = useMemo(() => 
    filteredImages.filter(img => reportData.selectedHistograms.includes(img.id)),
    [filteredImages, reportData.selectedHistograms]
  );

  // Statistics
  const statistics = useMemo(() => {
    const temps = filteredMarkers.map(m => m.temperature);
    return {
      totalImages: filteredImages.length,
      totalMarkers: filteredMarkers.length,
      totalRegions: filteredRegions.length,
      avgTemp: temps.length > 0 ? (temps.reduce((a, b) => a + b, 0) / temps.length).toFixed(2) : '0',
      minTemp: temps.length > 0 ? Math.min(...temps).toFixed(2) : '0',
      maxTemp: temps.length > 0 ? Math.max(...temps).toFixed(2) : '0'
    };
  }, [filteredImages, filteredMarkers, filteredRegions]);

  // Generate report HTML
  const generateReportHTML = async () => {
    setIsGenerating(true);
    try {
      const { settings } = reportData;
      const temps = filteredMarkers.map(m => m.temperature);
      
      const texts = {
        fa: {
          title: 'گزارش تحلیل حرارتی',
          projectInfo: 'اطلاعات پروژه',
          projectName: 'نام پروژه',
          operator: 'اپراتور',
          company: 'شرکت',
          date: 'تاریخ',
          summary: 'خلاصه آماری',
          temperatureDistribution: 'توزیع دما',
          totalImages: 'تعداد تصاویر',
          totalMarkers: 'تعداد نشانگرها',
          totalRegions: 'تعداد نواحی',
          avgTemp: 'میانگین دما',
          minTemp: 'حداقل دما',
          maxTemp: 'حداکثر دما',
          images: 'تصاویر حرارتی',
          image: 'تصویر',
          realImage: 'تصویر واقعی',
          thermalImage: 'تصویر حرارتی',
          markers: 'نشانگرها',
          regions: 'نواحی',
          label: 'برچسب',
          temperature: 'دما',
          position: 'موقعیت',
          type: 'نوع',
          area: 'مساحت',
          notes: 'یادداشت‌ها',
          celsius: 'درجه سانتی‌گراد',
          marker: 'نشانگر',
          region: 'ناحیه',
          line: 'خط',
          rectangle: 'مستطیل',
          ellipse: 'بیضی',
          polygon: 'چندضلعی'
        },
        en: {
          title: 'Thermal Analysis Report',
          projectInfo: 'Project Information',
          projectName: 'Project Name',
          operator: 'Operator',
          company: 'Company',
          date: 'Date',
          summary: 'Statistical Summary',
          temperatureDistribution: 'Temperature Distribution',
          totalImages: 'Total Images',
          totalMarkers: 'Total Markers',
          totalRegions: 'Total Regions',
          avgTemp: 'Average Temperature',
          minTemp: 'Minimum Temperature',
          maxTemp: 'Maximum Temperature',
          images: 'Thermal Images',
          image: 'Image',
          realImage: 'Real Image',
          thermalImage: 'Thermal Image',
          markers: 'Markers',
          regions: 'Regions',
          label: 'Label',
          temperature: 'Temperature',
          position: 'Position',
          type: 'Type',
          area: 'Area',
          notes: 'Notes',
          celsius: 'Celsius',
          marker: 'Marker',
          region: 'Region',
          line: 'Line',
          rectangle: 'Rectangle',
          ellipse: 'Ellipse',
          polygon: 'Polygon'
        }
      };

      const txt = texts[settings.language];
      const dir = settings.language === 'fa' ? 'rtl' : 'ltr';
      const align = settings.language === 'fa' ? 'right' : 'left';
      const fontFamily = settings.language === 'fa' 
        ? "'Vazirmatn', 'Tahoma', 'Iranian Sans', Arial, sans-serif" 
        : "'Inter', 'Segoe UI', Tahoma, Arial, sans-serif";

      let html = `
        <div style="font-family: ${fontFamily}; direction: ${dir}; padding: 15px; max-width: 100%; margin: 0 auto; box-sizing: border-box;">
          <h1 style="text-align: center; color: #1e40af; margin-bottom: 30px; font-size: 28px; border-bottom: 3px solid #3b82f6; padding-bottom: 15px;">
            ${txt.title}
          </h1>

          <!-- Project Info -->
          <div style="margin-bottom: 30px; background: #f8fafc; border-radius: 8px; padding: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
            <h2 style="color: #1e40af; margin-bottom: 15px; font-size: 20px; border-bottom: 2px solid #3b82f6; padding-bottom: 8px; text-align: ${align};">
              ${txt.projectInfo}
            </h2>
            <table style="width: 100%; border-collapse: collapse; direction: ${dir};">
              <tr style="border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 10px; font-weight: bold; color: #475569; width: 150px; text-align: ${align};">${txt.projectName}:</td>
                <td style="padding: 10px; color: #1e293b; text-align: ${align};">${currentProject?.name || '-'}</td>
              </tr>
              <tr style="border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 10px; font-weight: bold; color: #475569; text-align: ${align};">${txt.operator}:</td>
                <td style="padding: 10px; color: #1e293b; text-align: ${align};">${settings.operator || '-'}</td>
              </tr>
              <tr style="border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 10px; font-weight: bold; color: #475569; text-align: ${align};">${txt.company}:</td>
                <td style="padding: 10px; color: #1e293b; text-align: ${align};">${settings.company || '-'}</td>
              </tr>
              <tr>
                <td style="padding: 10px; font-weight: bold; color: #475569; text-align: ${align};">${txt.date}:</td>
                <td style="padding: 10px; color: #1e293b; text-align: ${align};">${new Date().toLocaleDateString(settings.language === 'fa' ? 'fa-IR' : 'en-US')}</td>
              </tr>
            </table>
          </div>
      `;

      // Statistics
      if (settings.includeStatistics) {
        html += `
          <div style="margin-bottom: 25px; background: #f8fafc; border-radius: 8px; padding: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
            <h2 style="color: #1e40af; margin-bottom: 15px; font-size: 20px; border-bottom: 2px solid #3b82f6; padding-bottom: 8px; text-align: ${align};">
              ${txt.summary}
            </h2>
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 12px;">
              <div style="background: white; padding: 12px; border-radius: 6px; text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                <div style="font-size: 12px; color: #64748b; margin-bottom: 6px;">${txt.totalImages}</div>
                <div style="font-size: 24px; font-weight: bold; color: #3b82f6;">${statistics.totalImages}</div>
              </div>
              <div style="background: white; padding: 12px; border-radius: 6px; text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                <div style="font-size: 12px; color: #64748b; margin-bottom: 6px;">${txt.totalMarkers}</div>
                <div style="font-size: 24px; font-weight: bold; color: #10b981;">${statistics.totalMarkers}</div>
              </div>
              <div style="background: white; padding: 12px; border-radius: 6px; text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                <div style="font-size: 12px; color: #64748b; margin-bottom: 6px;">${txt.totalRegions}</div>
                <div style="font-size: 24px; font-weight: bold; color: #f59e0b;">${statistics.totalRegions}</div>
              </div>
            </div>
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px;">
              <div style="background: white; padding: 12px; border-radius: 6px; text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                <div style="font-size: 12px; color: #64748b; margin-bottom: 6px;">${txt.minTemp}</div>
                <div style="font-size: 20px; font-weight: bold; color: #06b6d4;">${statistics.minTemp}°C</div>
              </div>
              <div style="background: white; padding: 12px; border-radius: 6px; text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                <div style="font-size: 12px; color: #64748b; margin-bottom: 6px;">${txt.avgTemp}</div>
                <div style="font-size: 20px; font-weight: bold; color: #8b5cf6;">${statistics.avgTemp}°C</div>
              </div>
              <div style="background: white; padding: 12px; border-radius: 6px; text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                <div style="font-size: 12px; color: #64748b; margin-bottom: 6px;">${txt.maxTemp}</div>
                <div style="font-size: 20px; font-weight: bold; color: #ef4444;">${statistics.maxTemp}°C</div>
              </div>
            </div>
          </div>
        `;
      }

      // Histogram removed from global section - only shown per image

      // Images
      if (settings.includeImages && filteredImages.length > 0) {
        console.log('[REPORT] Generating images section. Total filtered images:', filteredImages.length);
        console.log('[REPORT] Filtered image IDs:', filteredImages.map(img => ({ id: img.id, name: img.name })));
        
        html += `
          <div style="margin-bottom: 40px;">
            <h2 style="color: #1e40af; margin-bottom: 30px; font-size: 24px; border-bottom: 2px solid #3b82f6; padding-bottom: 10px; text-align: ${align};">
              ${txt.images}
            </h2>
        `;

        let imageIndex = 0;
        for (const image of filteredImages) {
          imageIndex++;
          console.log(`[REPORT] Processing image ${imageIndex}/${filteredImages.length}: ${image.name} (ID: ${image.id})`);
          
          const imageMarkers = settings.includeMarkers ? filteredMarkers.filter(m => m.imageId === image.id) : [];
          const imageRegions = settings.includeRegions ? filteredRegions.filter(r => r.imageId === image.id) : [];
          
          console.log(`[REPORT] Image ${image.name} - Markers: ${imageMarkers.length}, Regions: ${imageRegions.length}`);
          console.log('[REPORT] Image regions:', imageRegions.map(r => ({ id: r.id, label: r.label, type: r.type })));

          // Get images from store - they are already base64 or URLs from server
          // realImage and serverRenderedThermalUrl are already loaded from backend
          let realImageBase64 = image.realImage || '';
          let thermalImageBase64 = image.serverRenderedThermalUrl || '';
          
          // If they are URLs (not base64), convert them to base64 for embedding
          if (realImageBase64 && !realImageBase64.startsWith('data:')) {
            console.log('[REPORT] Converting real image URL to base64:', realImageBase64.substring(0, 50));
            realImageBase64 = await getImageAsBase64(realImageBase64);
          }
          
          if (thermalImageBase64 && !thermalImageBase64.startsWith('data:')) {
            console.log('[REPORT] Converting thermal image URL to base64:', thermalImageBase64.substring(0, 50));
            thermalImageBase64 = await getImageAsBase64(thermalImageBase64);
          }

          html += `
            <div style="margin-bottom: 30px; page-break-inside: avoid; background: #f8fafc; border-radius: 8px; padding: 15px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
              <h3 style="color: #1e40af; margin-bottom: 15px; font-size: 18px;">
                ${txt.image}: ${image.name}
              </h3>

              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 15px;">
                <div>
                  <h4 style="color: #475569; margin-bottom: 8px; font-size: 14px; font-weight: bold;">${txt.realImage}</h4>
                  ${realImageBase64 ? `<img src="${realImageBase64}" style="width: 100%; max-width: 100%; height: auto; border-radius: 6px; box-shadow: 0 2px 8px rgba(0,0,0,0.15);" />` : `<div style="background: #e2e8f0; height: 200px; display: flex; align-items: center; justify-content: center; border-radius: 6px; color: #94a3b8;">-</div>`}
                </div>
                <div>
                  <h4 style="color: #475569; margin-bottom: 8px; font-size: 14px; font-weight: bold;">${txt.thermalImage}</h4>
                  ${thermalImageBase64 ? `<img src="${thermalImageBase64}" style="width: 100%; max-width: 100%; height: auto; border-radius: 6px; box-shadow: 0 2px 8px rgba(0,0,0,0.15);" />` : `<div style="background: #e2e8f0; height: 200px; display: flex; align-items: center; justify-content: center; border-radius: 6px; color: #94a3b8;">-</div>`}
                </div>
              </div>
          `;

          // Combined Markers and Regions table
          if (imageMarkers.length > 0 || imageRegions.length > 0) {
            html += `
              <div style="margin-bottom: 15px;">
                <h4 style="color: #475569; margin-bottom: 10px; font-size: 14px; font-weight: bold;">
                  ${txt.markers} ${txt.regions && imageRegions.length > 0 ? '& ' + txt.regions : ''}
                </h4>
                <table style="width: 100%; border-collapse: collapse; background: white; border-radius: 6px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); font-size: 11px;">
                  <thead>
                    <tr style="background: #3b82f6; color: white;">
                      <th style="padding: 8px; text-align: ${align}; font-weight: 600;">${txt.type}</th>
                      <th style="padding: 8px; text-align: ${align}; font-weight: 600;">${txt.label}</th>
                      <th style="padding: 8px; text-align: ${align}; font-weight: 600;">${txt.minTemp}</th>
                      <th style="padding: 8px; text-align: ${align}; font-weight: 600;">${txt.maxTemp}</th>
                      <th style="padding: 8px; text-align: ${align}; font-weight: 600;">${txt.avgTemp}</th>
                      <th style="padding: 8px; text-align: ${align}; font-weight: 600;">${txt.position}</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${imageMarkers.map((marker, idx) => `
                      <tr style="border-bottom: 1px solid #e2e8f0; ${idx % 2 === 0 ? 'background: #f8fafc;' : ''}">
                        <td style="padding: 8px; color: #3b82f6; font-weight: 600;">${txt.marker}</td>
                        <td style="padding: 8px; color: #1e293b;">${marker.label || '-'}</td>
                        <td style="padding: 8px; color: #1e293b; font-weight: 600;" colspan="3">${marker.temperature.toFixed(2)}°C</td>
                        <td style="padding: 8px; color: #64748b;">(${marker.x.toFixed(0)}, ${marker.y.toFixed(0)})</td>
                      </tr>
                    `).join('')}
                    ${imageRegions.map((region, idx) => {
                      const typeMap: Record<string, string> = {
                        'line': txt.line,
                        'rectangle': txt.rectangle,
                        'ellipse': txt.ellipse,
                        'polygon': txt.polygon
                      };
                      const translatedType = typeMap[region.type.toLowerCase()] || region.type;
                      return `
                      <tr style="border-bottom: 1px solid #e2e8f0; ${(imageMarkers.length + idx) % 2 === 0 ? 'background: #f8fafc;' : ''}">
                        <td style="padding: 8px; color: #10b981; font-weight: 600;">${translatedType}</td>
                        <td style="padding: 8px; color: #1e293b;">${region.label || '-'}</td>
                        <td style="padding: 8px; color: #06b6d4; font-weight: 600;">${region.minTemp?.toFixed(2) || '-'}°C</td>
                        <td style="padding: 8px; color: #ef4444; font-weight: 600;">${region.maxTemp?.toFixed(2) || '-'}°C</td>
                        <td style="padding: 8px; color: #8b5cf6; font-weight: 600;">${region.avgTemp?.toFixed(2) || '-'}°C</td>
                        <td style="padding: 8px; color: #64748b;">-</td>
                      </tr>`;
                    }).join('')}
                  </tbody>
                </table>
              </div>
            `;
          }

          // Image-specific histogram
          if (settings.includeHistogram && reportData.selectedHistograms.includes(image.id) && imageMarkers.length > 0) {
            const imageHistogramSvg = generateHistogram(imageMarkers.map(m => m.temperature));
            html += `
              <div style="margin-top: 25px;">
                <h4 style="color: #475569; margin-bottom: 15px; font-size: 16px; font-weight: bold; text-align: ${align};">${txt.temperatureDistribution}</h4>
                <div style="background: white; padding: 15px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                  ${imageHistogramSvg}
                </div>
              </div>
            `;
          }

          html += `</div>`;
        }

        html += `</div>`;
      }

      // Custom notes
      if (reportData.customNotes) {
        html += `
          <div style="margin-bottom: 25px; background: #fff7ed; border-${align === 'right' ? 'right' : 'left'}: 4px solid #f97316; padding: 15px; border-radius: 6px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
            <h4 style="color: #ea580c; margin-bottom: 10px; font-weight: bold; font-size: 16px; text-align: ${align};">${txt.notes}</h4>
            <p style="color: #475569; white-space: pre-wrap; line-height: 1.6; font-size: 13px; text-align: ${align};">${reportData.customNotes}</p>
          </div>
        `;
      }

      html += `</div>`;

      setReportData(prev => ({ ...prev, htmlContent: html }));
      setCurrentStep(3); // Move to preview step
    } catch (error) {
      console.error('Error generating report:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  // Export handlers
  const handleExportPDF = async () => {
    if (!reportData.htmlContent) {
      alert(language === 'fa' ? 'محتوای گزارش خالی است' : 'Report content is empty');
      return;
    }
    
    setIsExporting(true);
    try {
      // Dynamic import for browser-only library
      if (!html2pdf) {
        const module = await import('html2pdf.js');
        html2pdf = module.default;
      }

      // Use the actual preview element that's already rendered
      const previewElement = document.getElementById('report-preview');
      if (!previewElement) {
        console.error('Preview element not found');
        alert(language === 'fa' ? 'خطا: المان پیش‌نمایش یافت نشد' : 'Error: Preview element not found');
        setIsExporting(false);
        return;
      }

      console.log('Starting PDF export...');
      console.log('Content length:', previewElement.innerHTML.length);
      
      const opt = {
        margin: [10, 10, 10, 10],
        filename: `${currentProject?.name || 'report'}_${new Date().toISOString().split('T')[0]}.pdf`,
        image: { type: 'jpeg', quality: 0.9 },
        html2canvas: { 
          scale: 2,
          useCORS: true, 
          logging: false,
          allowTaint: true,
          backgroundColor: '#ffffff',
          windowWidth: 794,
          windowHeight: 1123
        },
        jsPDF: { 
          unit: 'mm', 
          format: 'a4', 
          orientation: 'portrait'
        },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
      };

      await html2pdf().set(opt).from(previewElement).save();
      console.log('PDF export completed');
    } catch (error) {
      console.error('Error exporting PDF:', error);
      alert(language === 'fa' 
        ? `خطا در ایجاد PDF: ${error}` 
        : `Error creating PDF: ${error}`);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportWord = async () => {
    if (!reportData.htmlContent) return;

    try {
      // For Word, we need to keep images simple - no compression needed
      // Word handles base64 images fine if they're not too large
      let processedContent = reportData.htmlContent;
      
      // Optionally reduce image quality for Word if needed
      // But for now, keep original images as they are already base64

      const htmlDoc = `<!DOCTYPE html>
<html xmlns:o='urn:schemas-microsoft-com:office:office' 
      xmlns:w='urn:schemas-microsoft-com:office:word' 
      xmlns='http://www.w3.org/TR/REC-html40'>
<head>
  <meta charset='utf-8'>
  <title>Thermal Analysis Report</title>
  <!--[if gte mso 9]>
  <xml>
    <w:WordDocument>
      <w:View>Print</w:View>
      <w:Zoom>100</w:Zoom>
    </w:WordDocument>
  </xml>
  <![endif]-->
  <style>
    body { 
      font-family: ${reportData.settings.language === 'fa' ? 'Tahoma, Arial' : 'Calibri, Arial'}; 
      direction: ${reportData.settings.language === 'fa' ? 'rtl' : 'ltr'};
      padding: 20px;
    }
    table { 
      border-collapse: collapse; 
      width: 100%; 
    }
    th, td { 
      border: 1px solid #ddd; 
      padding: 8px; 
    }
    img { 
      max-width: 500px; 
      height: auto; 
    }
    @page { 
      size: A4; 
      margin: 2cm;
    }
  </style>
</head>
<body>
${processedContent}
</body>
</html>`;

      const blob = new Blob(['\ufeff', htmlDoc], { 
        type: 'application/msword' 
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${currentProject?.name || 'report'}_${new Date().toISOString().split('T')[0]}.doc`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting Word:', error);
      alert(language === 'fa' ? 'خطا در ایجاد فایل Word' : 'Error creating Word file');
    }
  };

  // Navigation handlers
  const handleNext = () => {
    if (currentStep === 2) {
      generateReportHTML();
    } else if (currentStep < WIZARD_STEPS.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Render wizard steps
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{language === 'fa' ? 'اطلاعات پایه' : 'Basic Information'}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>{language === 'fa' ? 'نام اپراتور' : 'Operator Name'}</Label>
                    <Input
                      value={reportData.settings.operator}
                      onChange={(e) => setReportData(prev => ({
                        ...prev,
                        settings: { ...prev.settings, operator: e.target.value }
                      }))}
                      placeholder={language === 'fa' ? 'نام اپراتور را وارد کنید' : 'Enter operator name'}
                    />
                  </div>
                  <div>
                    <Label>{language === 'fa' ? 'نام شرکت' : 'Company Name'}</Label>
                    <Input
                      value={reportData.settings.company}
                      onChange={(e) => setReportData(prev => ({
                        ...prev,
                        settings: { ...prev.settings, company: e.target.value }
                      }))}
                      placeholder={language === 'fa' ? 'نام شرکت را وارد کنید' : 'Enter company name'}
                    />
                  </div>
                </div>
                <div>
                  <Label>{language === 'fa' ? 'زبان گزارش' : 'Report Language'}</Label>
                  <Select
                    value={reportData.settings.language}
                    onValueChange={(val: 'fa' | 'en') => setReportData(prev => ({
                      ...prev,
                      settings: { ...prev.settings, language: val }
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={language === 'fa' ? 'زبان را انتخاب کنید' : 'Select language'} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fa">فارسی</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{language === 'fa' ? 'محتویات گزارش' : 'Report Contents'}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center space-x-2 space-x-reverse">
                  <Checkbox
                    id="includeStatistics"
                    checked={reportData.settings.includeStatistics}
                    onCheckedChange={(checked) => setReportData(prev => ({
                      ...prev,
                      settings: { ...prev.settings, includeStatistics: !!checked }
                    }))}
                  />
                  <Label htmlFor="includeStatistics" className="cursor-pointer">
                    {language === 'fa' ? 'شامل آمار و ارقام' : 'Include Statistics'}
                  </Label>
                </div>
                <div className="flex items-center space-x-2 space-x-reverse">
                  <Checkbox
                    id="includeHistogram"
                    checked={reportData.settings.includeHistogram}
                    onCheckedChange={(checked) => setReportData(prev => ({
                      ...prev,
                      settings: { ...prev.settings, includeHistogram: !!checked }
                    }))}
                  />
                  <Label htmlFor="includeHistogram" className="cursor-pointer">
                    {language === 'fa' ? 'شامل هیستوگرام دما' : 'Include Temperature Histogram'}
                  </Label>
                </div>
                <div className="flex items-center space-x-2 space-x-reverse">
                  <Checkbox
                    id="includeImages"
                    checked={reportData.settings.includeImages}
                    onCheckedChange={(checked) => setReportData(prev => ({
                      ...prev,
                      settings: { ...prev.settings, includeImages: !!checked }
                    }))}
                  />
                  <Label htmlFor="includeImages" className="cursor-pointer">
                    {language === 'fa' ? 'شامل تصاویر' : 'Include Images'}
                  </Label>
                </div>
                <div className="flex items-center space-x-2 space-x-reverse">
                  <Checkbox
                    id="includeMarkers"
                    checked={reportData.settings.includeMarkers}
                    onCheckedChange={(checked) => setReportData(prev => ({
                      ...prev,
                      settings: { ...prev.settings, includeMarkers: !!checked }
                    }))}
                  />
                  <Label htmlFor="includeMarkers" className="cursor-pointer">
                    {language === 'fa' ? 'شامل نشانگرها' : 'Include Markers'}
                  </Label>
                </div>
                <div className="flex items-center space-x-2 space-x-reverse">
                  <Checkbox
                    id="includeRegions"
                    checked={reportData.settings.includeRegions}
                    onCheckedChange={(checked) => setReportData(prev => ({
                      ...prev,
                      settings: { ...prev.settings, includeRegions: !!checked }
                    }))}
                  />
                  <Label htmlFor="includeRegions" className="cursor-pointer">
                    {language === 'fa' ? 'شامل نواحی' : 'Include Regions'}
                  </Label>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            {/* Images Selection */}
            <Card>
              <CardHeader>
                <CardTitle>
                  {language === 'fa' ? 'انتخاب تصاویر' : 'Select Images'}
                  <span className="text-sm font-normal text-gray-500 mr-2">
                    ({reportData.selectedImages.length} / {filteredImages.length})
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[250px] pr-4">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2 space-x-reverse mb-4">
                      <Checkbox
                        id="selectAllImages"
                        checked={reportData.selectedImages.length === filteredImages.length}
                        onCheckedChange={(checked) => {
                          setReportData(prev => ({
                            ...prev,
                            selectedImages: checked ? filteredImages.map(img => img.id) : []
                          }));
                        }}
                      />
                      <Label htmlFor="selectAllImages" className="cursor-pointer font-bold">
                        {language === 'fa' ? 'انتخاب همه تصاویر' : 'Select All Images'}
                      </Label>
                    </div>
                    <Separator />
                    {filteredImages.map((image) => (
                      <div key={image.id} className="flex items-center space-x-2 space-x-reverse py-2 hover:bg-gray-50 rounded px-2">
                        <Checkbox
                          id={`img-${image.id}`}
                          checked={reportData.selectedImages.includes(image.id)}
                          onCheckedChange={(checked) => {
                            setReportData(prev => ({
                              ...prev,
                              selectedImages: checked
                                ? [...prev.selectedImages, image.id]
                                : prev.selectedImages.filter(id => id !== image.id)
                            }));
                          }}
                        />
                        <Label htmlFor={`img-${image.id}`} className="cursor-pointer flex-1">
                          <div className="flex items-center gap-3">
                            <ImageIcon className="w-4 h-4 text-gray-400" />
                            <span>{image.name}</span>
                            <span className="text-xs text-gray-500">
                              ({markers.filter(m => m.imageId === image.id).length} {language === 'fa' ? 'نشانگر' : 'markers'}, 
                               {regions.filter(r => r.imageId === image.id).length} {language === 'fa' ? 'ناحیه' : 'regions'})
                            </span>
                          </div>
                        </Label>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Markers Selection */}
            {markers.filter(m => reportData.selectedImages.includes(m.imageId)).length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>
                    {language === 'fa' ? 'انتخاب نشانگرها' : 'Select Markers'}
                    <span className="text-sm font-normal text-gray-500 mr-2">
                      ({reportData.selectedMarkers.length} / {markers.filter(m => reportData.selectedImages.includes(m.imageId)).length})
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[250px] pr-4">
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2 space-x-reverse mb-4">
                        <Checkbox
                          id="selectAllMarkers"
                          checked={reportData.selectedMarkers.length === markers.filter(m => reportData.selectedImages.includes(m.imageId)).length}
                          onCheckedChange={(checked) => {
                            const availableMarkers = markers.filter(m => reportData.selectedImages.includes(m.imageId));
                            setReportData(prev => ({
                              ...prev,
                              selectedMarkers: checked ? availableMarkers.map(m => m.id) : []
                            }));
                          }}
                        />
                        <Label htmlFor="selectAllMarkers" className="cursor-pointer font-bold">
                          {language === 'fa' ? 'انتخاب همه نشانگرها' : 'Select All Markers'}
                        </Label>
                      </div>
                      <Separator />
                      {markers.filter(m => reportData.selectedImages.includes(m.imageId)).map((marker) => {
                        const image = images.find(img => img.id === marker.imageId);
                        return (
                          <div key={marker.id} className="flex items-center space-x-2 space-x-reverse py-2 hover:bg-gray-50 rounded px-2">
                            <Checkbox
                              id={`marker-${marker.id}`}
                              checked={reportData.selectedMarkers.includes(marker.id)}
                              onCheckedChange={(checked) => {
                                setReportData(prev => ({
                                  ...prev,
                                  selectedMarkers: checked
                                    ? [...prev.selectedMarkers, marker.id]
                                    : prev.selectedMarkers.filter(id => id !== marker.id)
                                }));
                              }}
                            />
                            <Label htmlFor={`marker-${marker.id}`} className="cursor-pointer flex-1">
                              <div className="flex items-center gap-3">
                                <span className="font-medium">{marker.label || `Marker ${marker.id.substring(0, 8)}`}</span>
                                <span className="text-sm text-blue-600 font-semibold">{marker.temperature.toFixed(2)}°C</span>
                                <span className="text-xs text-gray-400">({image?.name})</span>
                              </div>
                            </Label>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}

            {/* Regions Selection */}
            {regions.filter(r => reportData.selectedImages.includes(r.imageId)).length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>
                    {language === 'fa' ? 'انتخاب نواحی' : 'Select Regions'}
                    <span className="text-sm font-normal text-gray-500 mr-2">
                      ({reportData.selectedRegions.length} / {regions.filter(r => reportData.selectedImages.includes(r.imageId)).length})
                    </span>
                  </CardTitle>
                  {regions.length > 0 && regions.filter(r => reportData.selectedImages.includes(r.imageId)).length === 0 && (
                    <p className="text-sm text-amber-600">
                      {language === 'fa' 
                        ? '⚠️ ابتدا تصاویری که شامل نواحی هستند را انتخاب کنید' 
                        : '⚠️ First select images that contain regions'}
                    </p>
                  )}
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[300px] pr-4">
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center space-x-2 space-x-reverse">
                        <Checkbox
                          id="selectAllRegions"
                          checked={
                            regions.filter(r => reportData.selectedImages.includes(r.imageId)).length > 0 &&
                            reportData.selectedRegions.length === regions.filter(r => reportData.selectedImages.includes(r.imageId)).length
                          }
                          onCheckedChange={(checked) => {
                            const availableRegions = regions.filter(r => reportData.selectedImages.includes(r.imageId));
                            setReportData(prev => ({
                              ...prev,
                              selectedRegions: checked ? availableRegions.map(r => r.id) : []
                            }));
                          }}
                        />
                        <Label htmlFor="selectAllRegions" className="cursor-pointer font-bold">
                          {language === 'fa' ? 'انتخاب همه نواحی' : 'Select All Regions'}
                        </Label>
                      </div>
                    </div>
                    <Separator className="mb-4" />
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-gray-100 border-b">
                          <th className="p-2 text-right w-12"></th>
                          <th className="p-3 text-right text-sm font-semibold">{language === 'fa' ? 'تصویر' : 'Image'}</th>
                          <th className="p-3 text-right text-sm font-semibold">{language === 'fa' ? 'برچسب' : 'Label'}</th>
                          <th className="p-3 text-right text-sm font-semibold">{language === 'fa' ? 'نوع' : 'Type'}</th>
                          <th className="p-3 text-right text-sm font-semibold">{language === 'fa' ? 'حداقل' : 'Min'}</th>
                          <th className="p-3 text-right text-sm font-semibold">{language === 'fa' ? 'میانگین' : 'Avg'}</th>
                          <th className="p-3 text-right text-sm font-semibold">{language === 'fa' ? 'حداکثر' : 'Max'}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {regions.filter(r => reportData.selectedImages.includes(r.imageId)).map((region, idx) => {
                          const regionImage = images.find(img => img.id === region.imageId);
                          return (
                            <tr key={region.id} className={`border-b hover:bg-gray-100 ${idx % 2 === 0 ? 'bg-gray-50' : ''}`}>
                              <td className="p-2">
                                <Checkbox
                                  id={`region-${region.id}`}
                                  checked={reportData.selectedRegions.includes(region.id)}
                                  onCheckedChange={(checked) => {
                                    setReportData(prev => ({
                                      ...prev,
                                      selectedRegions: checked
                                        ? [...prev.selectedRegions, region.id]
                                        : prev.selectedRegions.filter(id => id !== region.id)
                                    }));
                                  }}
                                />
                              </td>
                              <td className="p-3 text-xs text-gray-400">{regionImage?.name || '-'}</td>
                              <td className="p-3 text-sm">{region.label || '-'}</td>
                              <td className="p-3 text-sm text-gray-600">{region.type}</td>
                              <td className="p-3 text-sm font-semibold text-cyan-600">{region.minTemp?.toFixed(2) || '-'}°C</td>
                              <td className="p-3 text-sm font-semibold text-purple-600">{region.avgTemp?.toFixed(2) || '-'}°C</td>
                              <td className="p-3 text-sm font-semibold text-red-600">{region.maxTemp?.toFixed(2) || '-'}°C</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}

            {/* Histograms Selection */}
            {filteredMarkers.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>
                    {language === 'fa' ? 'انتخاب هیستوگرام‌ها' : 'Select Histograms'}
                    <span className="text-sm font-normal text-gray-500 mr-2">
                      ({reportData.selectedHistograms.length} / {filteredImages.length})
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[250px] pr-4">
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2 space-x-reverse mb-4">
                        <Checkbox
                          id="selectAllHistograms"
                          checked={reportData.selectedHistograms.length === filteredImages.length}
                          onCheckedChange={(checked) => {
                            setReportData(prev => ({
                              ...prev,
                              selectedHistograms: checked ? filteredImages.map(img => img.id) : []
                            }));
                          }}
                        />
                        <Label htmlFor="selectAllHistograms" className="cursor-pointer font-bold">
                          {language === 'fa' ? 'انتخاب همه هیستوگرام‌ها' : 'Select All Histograms'}
                        </Label>
                      </div>
                      <Separator />
                      {filteredImages.map((image) => {
                        const imageMarkers = markers.filter(m => m.imageId === image.id);
                        if (imageMarkers.length === 0) return null;
                        
                        return (
                          <div key={`hist-${image.id}`} className="border rounded-lg p-3 hover:bg-gray-50">
                            <div className="flex items-start space-x-2 space-x-reverse mb-3">
                              <Checkbox
                                id={`histogram-${image.id}`}
                                checked={reportData.selectedHistograms.includes(image.id)}
                                onCheckedChange={(checked) => {
                                  setReportData(prev => ({
                                    ...prev,
                                    selectedHistograms: checked
                                      ? [...prev.selectedHistograms, image.id]
                                      : prev.selectedHistograms.filter(id => id !== image.id)
                                  }));
                                }}
                              />
                              <Label htmlFor={`histogram-${image.id}`} className="cursor-pointer flex-1">
                                <div className="font-medium mb-2">{image.name}</div>
                                {reportData.selectedHistograms.includes(image.id) && (
                                  <div className="bg-white p-2 rounded border" dangerouslySetInnerHTML={{ 
                                    __html: generateHistogram(imageMarkers.map(m => m.temperature)) 
                                  }} />
                                )}
                              </Label>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>{language === 'fa' ? 'یادداشت‌های اضافی' : 'Additional Notes'}</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={reportData.customNotes}
                  onChange={(e) => setReportData(prev => ({ ...prev, customNotes: e.target.value }))}
                  placeholder={language === 'fa' ? 'یادداشت‌های خود را اینجا بنویسید...' : 'Write your notes here...'}
                  className="min-h-[120px]"
                />
              </CardContent>
            </Card>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">
                {language === 'fa' ? 'پیش‌نمایش و ویرایش گزارش' : 'Preview & Edit Report'}
              </h3>
              <Button
                onClick={() => setIsEditing(!isEditing)}
                variant="outline"
                size="sm"
              >
                {isEditing ? <Eye className="w-4 h-4 mr-2" /> : <Edit className="w-4 h-4 mr-2" />}
                {isEditing ? (language === 'fa' ? 'حالت پیش‌نمایش' : 'Preview Mode') : (language === 'fa' ? 'حالت ویرایش' : 'Edit Mode')}
              </Button>
            </div>

            {isEditing ? (
              <Card>
                <CardContent className="p-0">
                  <div className="border-b bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-3 flex gap-2 flex-wrap items-center sticky top-0 z-10">
                    <div className="flex gap-1 items-center border-r pr-3">
                      <select
                        className="h-8 px-2 bg-white border border-gray-300 rounded text-sm"
                        onChange={(e) => {
                          document.execCommand('fontSize', false, e.target.value);
                        }}
                        title={language === 'fa' ? 'اندازه فونت' : 'Font Size'}
                      >
                        <option value="1">کوچک</option>
                        <option value="3" selected>متوسط</option>
                        <option value="5">بزرگ</option>
                        <option value="7">خیلی بزرگ</option>
                      </select>
                    </div>
                    <div className="flex gap-1 items-center border-r pr-3">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 px-3 bg-white hover:bg-blue-100 hover:text-blue-700 border-gray-300"
                        onClick={() => document.execCommand('bold')}
                        title={language === 'fa' ? 'ضخیم' : 'Bold'}
                      >
                        <strong className="text-sm">B</strong>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 px-3 bg-white hover:bg-blue-100 hover:text-blue-700 border-gray-300"
                        onClick={() => document.execCommand('italic')}
                        title={language === 'fa' ? 'کج' : 'Italic'}
                      >
                        <em className="text-sm">I</em>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 px-3 bg-white hover:bg-blue-100 hover:text-blue-700 border-gray-300"
                        onClick={() => document.execCommand('underline')}
                        title={language === 'fa' ? 'زیرخط' : 'Underline'}
                      >
                        <u className="text-sm">U</u>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 px-3 bg-white hover:bg-blue-100 hover:text-blue-700 border-gray-300"
                        onClick={() => document.execCommand('strikeThrough')}
                        title={language === 'fa' ? 'خط‌خورده' : 'Strikethrough'}
                      >
                        <s className="text-sm">S</s>
                      </Button>
                    </div>
                    <div className="flex gap-1 items-center border-r pr-3">
                      <input
                        type="color"
                        className="h-8 w-8 border border-gray-300 rounded cursor-pointer"
                        onChange={(e) => document.execCommand('foreColor', false, e.target.value)}
                        title={language === 'fa' ? 'رنگ متن' : 'Text Color'}
                      />
                      <input
                        type="color"
                        className="h-8 w-8 border border-gray-300 rounded cursor-pointer"
                        onChange={(e) => document.execCommand('backColor', false, e.target.value)}
                        title={language === 'fa' ? 'رنگ پس‌زمینه' : 'Background Color'}
                      />
                    </div>
                    <div className="flex gap-1 items-center border-r pr-3">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 px-3 bg-white hover:bg-green-100 hover:text-green-700 border-gray-300"
                        onClick={() => document.execCommand('justifyLeft')}
                        title={language === 'fa' ? 'چپ‌چین' : 'Align Left'}
                      >
                        <span className="text-sm">←</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 px-3 bg-white hover:bg-green-100 hover:text-green-700 border-gray-300"
                        onClick={() => document.execCommand('justifyCenter')}
                        title={language === 'fa' ? 'وسط‌چین' : 'Center'}
                      >
                        <span className="text-sm">↔</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 px-3 bg-white hover:bg-green-100 hover:text-green-700 border-gray-300"
                        onClick={() => document.execCommand('justifyRight')}
                        title={language === 'fa' ? 'راست‌چین' : 'Align Right'}
                      >
                        <span className="text-sm">→</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 px-3 bg-white hover:bg-green-100 hover:text-green-700 border-gray-300"
                        onClick={() => document.execCommand('justifyFull')}
                        title={language === 'fa' ? 'توجیه' : 'Justify'}
                      >
                        <span className="text-sm">≡</span>
                      </Button>
                    </div>
                    <div className="flex gap-1 items-center border-r pr-3">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 px-3 bg-white hover:bg-purple-100 hover:text-purple-700 border-gray-300"
                        onClick={() => document.execCommand('insertUnorderedList')}
                        title={language === 'fa' ? 'لیست' : 'Bullet List'}
                      >
                        <span className="text-sm">•</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 px-3 bg-white hover:bg-purple-100 hover:text-purple-700 border-gray-300"
                        onClick={() => document.execCommand('insertOrderedList')}
                        title={language === 'fa' ? 'لیست شماره‌دار' : 'Numbered List'}
                      >
                        <span className="text-sm">1.</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 px-3 bg-white hover:bg-purple-100 hover:text-purple-700 border-gray-300"
                        onClick={() => document.execCommand('indent')}
                        title={language === 'fa' ? 'افزایش تورفتگی' : 'Indent'}
                      >
                        <span className="text-sm">→|</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 px-3 bg-white hover:bg-purple-100 hover:text-purple-700 border-gray-300"
                        onClick={() => document.execCommand('outdent')}
                        title={language === 'fa' ? 'کاهش تورفتگی' : 'Outdent'}
                      >
                        <span className="text-sm">|←</span>
                      </Button>
                    </div>
                    <div className="flex gap-1 items-center">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 px-3 bg-white hover:bg-orange-100 hover:text-orange-700 border-gray-300"
                        onClick={() => {
                          const text = prompt(language === 'fa' ? 'متن خود را وارد کنید:' : 'Enter your text:');
                          if (text) {
                            const formattedText = `<p style="margin: 10px 0; padding: 15px; background: #f0f9ff; border-left: 4px solid #3b82f6; border-radius: 4px;">${text}</p>`;
                            document.execCommand('insertHTML', false, formattedText);
                          }
                        }}
                        title={language === 'fa' ? 'افزودن متن' : 'Insert Text'}
                      >
                        <span className="text-sm">📝</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 px-3 bg-white hover:bg-orange-100 hover:text-orange-700 border-gray-300"
                        onClick={() => {
                          const heading = prompt(language === 'fa' ? 'عنوان را وارد کنید:' : 'Enter heading:');
                          if (heading) {
                            const formattedHeading = `<h3 style="color: #1e40af; margin: 20px 0 10px; font-size: 20px; font-weight: bold; border-bottom: 2px solid #3b82f6; padding-bottom: 8px;">${heading}</h3>`;
                            document.execCommand('insertHTML', false, formattedHeading);
                          }
                        }}
                        title={language === 'fa' ? 'افزودن عنوان' : 'Insert Heading'}
                      >
                        <span className="text-sm">H</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 px-3 bg-white hover:bg-orange-100 hover:text-orange-700 border-gray-300"
                        onClick={() => {
                          const url = prompt(language === 'fa' ? 'لینک را وارد کنید:' : 'Enter URL:');
                          if (url) document.execCommand('createLink', false, url);
                        }}
                        title={language === 'fa' ? 'افزودن لینک' : 'Insert Link'}
                      >
                        <span className="text-sm">🔗</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 px-3 bg-white hover:bg-orange-100 hover:text-orange-700 border-gray-300"
                        onClick={() => document.execCommand('unlink')}
                        title={language === 'fa' ? 'حذف لینک' : 'Remove Link'}
                      >
                        <span className="text-sm">⛓️‍💥</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 px-3 bg-white hover:bg-red-100 hover:text-red-700 border-gray-300"
                        onClick={() => {
                          if (confirm(language === 'fa' ? 'آیا مطمئن هستید؟' : 'Are you sure?')) {
                            document.execCommand('removeFormat');
                          }
                        }}
                        title={language === 'fa' ? 'حذف فرمت' : 'Clear Format'}
                      >
                        <span className="text-sm">🧹</span>
                      </Button>
                    </div>
                  </div>
                  <ScrollArea className="h-[600px]">
                    <div
                      id="editable-report"
                      contentEditable
                      suppressContentEditableWarning
                      onInput={(e) => {
                        const content = e.currentTarget.innerHTML;
                        setReportData(prev => ({ ...prev, htmlContent: content }));
                      }}
                      onPaste={(e) => {
                        e.preventDefault();
                        const text = e.clipboardData.getData('text/html') || e.clipboardData.getData('text/plain');
                        document.execCommand('insertHTML', false, text);
                      }}
                      dangerouslySetInnerHTML={{ __html: reportData.htmlContent }}
                      className="p-8 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:ring-offset-2 min-h-[600px] bg-white"
                      style={{ 
                        direction: reportData.settings.language === 'fa' ? 'rtl' : 'ltr',
                        lineHeight: '1.6',
                        fontSize: '14px'
                      }}
                    />
                  </ScrollArea>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-0">
                  <ScrollArea className="h-[600px]">
                    <div
                      id="report-preview"
                      dangerouslySetInnerHTML={{ __html: reportData.htmlContent }}
                    />
                  </ScrollArea>
                </CardContent>
              </Card>
            )}
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center space-y-6">
                  <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto" />
                  <div>
                    <h3 className="text-2xl font-bold mb-2">
                      {language === 'fa' ? 'گزارش آماده است!' : 'Report is Ready!'}
                    </h3>
                    <p className="text-gray-600">
                      {language === 'fa' 
                        ? 'گزارش شما با موفقیت تولید شد. می‌توانید آن را دانلود کنید.'
                        : 'Your report has been generated successfully. You can download it now.'
                      }
                    </p>
                  </div>

                  <div className="flex gap-4 justify-center">
                    <Button
                      onClick={handleExportPDF}
                      disabled={isExporting}
                      size="lg"
                      className="min-w-[200px]"
                    >
                      {isExporting ? (
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      ) : (
                        <FileDown className="w-5 h-5 mr-2" />
                      )}
                      {language === 'fa' ? 'دانلود PDF' : 'Download PDF'}
                    </Button>

                    <Button
                      onClick={handleExportWord}
                      variant="outline"
                      size="lg"
                      className="min-w-[200px]"
                    >
                      <FileDown className="w-5 h-5 mr-2" />
                      {language === 'fa' ? 'دانلود Word' : 'Download Word'}
                    </Button>
                  </div>

                  <Separator />

                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <div className="font-semibold text-blue-900">{statistics.totalImages}</div>
                      <div className="text-blue-600">{language === 'fa' ? 'تصاویر' : 'Images'}</div>
                    </div>
                    <div className="p-4 bg-green-50 rounded-lg">
                      <div className="font-semibold text-green-900">{statistics.totalMarkers}</div>
                      <div className="text-green-600">{language === 'fa' ? 'نشانگرها' : 'Markers'}</div>
                    </div>
                    <div className="p-4 bg-orange-50 rounded-lg">
                      <div className="font-semibold text-orange-900">{statistics.totalRegions}</div>
                      <div className="text-orange-600">{language === 'fa' ? 'نواحی' : 'Regions'}</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Hidden preview element for PDF/Word generation */}
            <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
              <div
                id="report-preview"
                dangerouslySetInnerHTML={{ __html: reportData.htmlContent }}
                style={{
                  width: '190mm',
                  maxWidth: '190mm',
                  padding: '10mm',
                  backgroundColor: 'white',
                  fontFamily: reportData.settings.language === 'fa' 
                    ? "'Vazirmatn', 'Tahoma', Arial, sans-serif" 
                    : "'Inter', 'Segoe UI', Arial, sans-serif",
                  direction: reportData.settings.language === 'fa' ? 'rtl' : 'ltr',
                  boxSizing: 'border-box',
                  overflow: 'hidden'
                }}
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (!currentProject) {
    return (
      <Window id="reports" title={t.reports || 'Reports'}>
        <div className="flex items-center justify-center h-full">
          <p className="text-gray-500">
            {language === 'fa' ? 'لطفاً ابتدا یک پروژه را بارگذاری کنید' : 'Please load a project first'}
          </p>
        </div>
      </Window>
    );
  }

  return (
    <Window id="reports" title={t.reports || 'Reports'}>
      <div className="h-full flex flex-col bg-white">
        {/* Wizard Header */}
        <div className="p-6 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            {language === 'fa' ? 'ایجاد گزارش تحلیل حرارتی' : 'Create Thermal Analysis Report'}
          </h2>
          
          {/* Steps indicator */}
          <div className="flex items-center justify-between">
            {WIZARD_STEPS.map((step, index) => (
              <React.Fragment key={step.id}>
                <div className="flex items-center">
                  <div className={`
                    flex items-center justify-center w-10 h-10 rounded-full font-semibold
                    ${currentStep >= step.id ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'}
                    ${currentStep === step.id ? 'ring-4 ring-blue-200' : ''}
                  `}>
                    {currentStep > step.id ? (
                      <CheckCircle2 className="w-6 h-6" />
                    ) : (
                      step.icon
                    )}
                  </div>
                  <div className="ml-3 hidden md:block">
                    <div className={`text-sm font-medium ${currentStep >= step.id ? 'text-blue-900' : 'text-gray-600'}`}>
                      {step.title[language]}
                    </div>
                  </div>
                </div>
                {index < WIZARD_STEPS.length - 1 && (
                  <div className={`flex-1 h-1 mx-4 ${currentStep > step.id ? 'bg-blue-600' : 'bg-gray-200'}`} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <ScrollArea className="flex-1 p-6">
          {renderStepContent()}
        </ScrollArea>

        {/* Navigation Footer */}
        <div className="p-4 border-t bg-gray-50 flex items-center justify-between">
          <Button
            onClick={handleBack}
            disabled={currentStep === 1}
            variant="outline"
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            {language === 'fa' ? 'قبلی' : 'Back'}
          </Button>

          <div className="text-sm text-gray-600">
            {language === 'fa' ? 'مرحله' : 'Step'} {currentStep} {language === 'fa' ? 'از' : 'of'} {WIZARD_STEPS.length}
          </div>

          {currentStep < WIZARD_STEPS.length ? (
            <Button
              onClick={handleNext}
              disabled={isGenerating || (currentStep === 2 && reportData.selectedImages.length === 0)}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                  {language === 'fa' ? 'در حال تولید...' : 'Generating...'}
                </>
              ) : (
                <>
                  {language === 'fa' ? 'بعدی' : 'Next'}
                  <ChevronRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          ) : (
            <Button
              onClick={() => {
                setCurrentStep(1);
                setReportData(prev => ({ ...prev, htmlContent: '' }));
              }}
              variant="outline"
            >
              {language === 'fa' ? 'ایجاد گزارش جدید' : 'Create New Report'}
            </Button>
          )}
        </div>
      </div>
    </Window>
  );
}
