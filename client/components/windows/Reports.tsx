'use client';

import { useRef, useState } from 'react';
import { useAppStore } from '@/lib/store';
import { translations } from '@/lib/translations';
import Window from './Window';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  FileText,
  Download,
  Printer,
  Eye,
  Mail
} from 'lucide-react';

export default function Reports() {
  const {
    language,
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
    includeImages: true,
    includeMarkers: true,
    includeRegions: true,
    includeParameters: true,
    includeStatistics: true,
    notes: ''
  });

  const reportRef = useRef<HTMLDivElement>(null);
  const activeImage = images.find(img => img.id === activeImageId);

  const handleGenerateReport = async (format: 'pdf' | 'html') => {
    if (!reportRef.current) return;

    if (format === 'pdf') {
      const html2pdf = (await import('html2pdf.js')).default;

      html2pdf().set({
        margin: 10,
        filename: `${reportSettings.title.replace(/\s+/g, '_')}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      }).from(reportRef.current).save();
    } else {
      const htmlContent = reportRef.current.innerHTML;
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${reportSettings.title.replace(/\s+/g, '_')}.html`;
      link.click();
      URL.revokeObjectURL(url);
    }
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
            <Label className="text-sm">Report Title</Label>
            <Input
              value={reportSettings.title}
              onChange={(e) => setReportSettings(prev => ({ ...prev, title: e.target.value }))}
              className="h-8"
            />
          </div>

          <div className="space-y-3">
            <Label className="text-sm">Include in Report</Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="include-images"
                  checked={reportSettings.includeImages}
                  onCheckedChange={(checked) =>
                    setReportSettings(prev => ({ ...prev, includeImages: !!checked }))
                  }
                />
                <Label htmlFor="include-images" className="text-sm">
                  Thermal & Real Images ({images.length})
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="include-markers"
                  checked={reportSettings.includeMarkers}
                  onCheckedChange={(checked) =>
                    setReportSettings(prev => ({ ...prev, includeMarkers: !!checked }))
                  }
                />
                <Label htmlFor="include-markers" className="text-sm">
                  Temperature Markers ({markers.length})
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="include-regions"
                  checked={reportSettings.includeRegions}
                  onCheckedChange={(checked) =>
                    setReportSettings(prev => ({ ...prev, includeRegions: !!checked }))
                  }
                />
                <Label htmlFor="include-regions" className="text-sm">
                  Analysis Regions ({regions.length})
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="include-parameters"
                  checked={reportSettings.includeParameters}
                  onCheckedChange={(checked) =>
                    setReportSettings(prev => ({ ...prev, includeParameters: !!checked }))
                  }
                />
                <Label htmlFor="include-parameters" className="text-sm">
                  Measurement Parameters
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="include-statistics"
                  checked={reportSettings.includeStatistics}
                  onCheckedChange={(checked) =>
                    setReportSettings(prev => ({ ...prev, includeStatistics: !!checked }))
                  }
                />
                <Label htmlFor="include-statistics" className="text-sm">
                  Statistical Analysis
                </Label>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm">Additional Notes</Label>
            <Textarea
              value={reportSettings.notes}
              onChange={(e) => setReportSettings(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Enter any additional notes or observations..."
              className="h-20 text-sm"
            />
          </div>

          {currentProject && (
            <div className="space-y-2 p-3 bg-gray-800 rounded border">
              <h4 className="text-sm font-medium">Project Information</h4>
              <div className="text-xs text-gray-400 space-y-1">
                <div>Name: {currentProject.name}</div>
                <div>Operator: {currentProject.operator}</div>
                <div>Company: {currentProject.company}</div>
                <div>Date: {currentProject.date.toLocaleDateString()}</div>
              </div>
            </div>
          )}
        </div>

        <div className="p-3 bg-gray-750 border-t border-gray-600 space-y-3">
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => handleGenerateReport('pdf')}
            >
              <Eye className="w-4 h-4 mr-1" />
              {t.preview}
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button
              size="sm"
              onClick={() => handleGenerateReport('pdf')}
              className="h-8"
            >
              <Download className="w-3 h-3 mr-1" />
              PDF
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleGenerateReport('html')}
              className="h-8"
            >
              <FileText className="w-3 h-3 mr-1" />
              HTML
            </Button>
          </div>
        </div>

        {/* Hidden report content for export */}
        <div
          ref={reportRef}
          style={{
            position: 'absolute',
            left: '-9999px',
            top: 0,
            width: '210mm',
            padding: '20mm',
            background: 'white'
          }}
        >
          <h1>{reportSettings.title}</h1>
          {currentProject && (
            <>
              <h2>Project Information</h2>
              <p><strong>Name:</strong> {currentProject.name}</p>
              <p><strong>Operator:</strong> {currentProject.operator}</p>
              <p><strong>Company:</strong> {currentProject.company}</p>
              <p><strong>Date:</strong> {currentProject.date.toLocaleDateString()}</p>
            </>
          )}
          {reportSettings.includeParameters && (
            <>
              <h2>Measurement Parameters</h2>
              <p><strong>{t.emissivity}:</strong> {globalParameters.emissivity}</p>
              <p><strong>{t.ambientTemp}:</strong> {globalParameters.ambientTemp}°C</p>
              <p><strong>{t.reflectedTemp}:</strong> {globalParameters.reflectedTemp}°C</p>
              <p><strong>{t.humidity}:</strong> {globalParameters.humidity}%</p>
              <p><strong>{t.distance}:</strong> {globalParameters.distance}m</p>
              <p><strong>{t.dewpoint}:</strong> {(globalParameters.ambientTemp - (100 - globalParameters.humidity) / 5).toFixed(1)}°C</p>
            </>
          )}
          {reportSettings.includeImages && (
            <>
              <h2>Images</h2>
              {images.map((img) => (
                <div key={img.id} style={{ marginBottom: '10px' }}>
                  <p><strong>{img.name}</strong></p>
                  {img.preRenderedThermalUrl && (
                    <img
                      src={img.preRenderedThermalUrl}
                      alt={`${img.name} thermal`}
                      style={{ maxWidth: '100%' }}
                      crossOrigin="anonymous"
                    />
                  )}
                  {img.realImage && (
                    <img
                      src={img.realImage}
                      alt={img.name}
                      style={{ maxWidth: '100%' }}
                      crossOrigin="anonymous"
                    />
                  )}
                </div>
              ))}
            </>
          )}
          {reportSettings.notes && (
            <>
              <h2>Additional Notes</h2>
              <p>{reportSettings.notes}</p>
            </>
          )}
        </div>
      </div>
    </Window>
  );
}
