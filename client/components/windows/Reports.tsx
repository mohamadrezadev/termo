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
  Eye
} from 'lucide-react';

type ReportSettings = {
  title: string;
  includeImages: boolean;
  includeMarkers: boolean;
  includeRegions: boolean;
  includeParameters: boolean;
  includeStatistics: boolean;
  notes: string;
};

type IncludeKey = Exclude<keyof ReportSettings, 'title' | 'notes'>;

export default function Reports() {
  const {
    language,
    currentProject,
    images,
    activeImageId,
    markers,
    regions
  } = useAppStore();

  const t = translations[language];
  const [reportSettings, setReportSettings] = useState<ReportSettings>({
    title: 'Thermal Analysis Report',
    includeImages: true,
    includeMarkers: true,
    includeRegions: true,
    includeParameters: true,
    includeStatistics: true,
    notes: ''
  });

  const reportRef = useRef<HTMLDivElement>(null);

  const handleGenerateReport = async (format: 'pdf' | 'html') => {
    if (!reportRef.current) return;
    const el = reportRef.current;

    el.style.position = 'static';
    el.style.visibility = 'visible';

    await new Promise((resolve) => setTimeout(resolve, 1000));

    if (format === 'pdf') {
      const html2pdf = (await import('html2pdf.js')).default;
      await html2pdf().set({
        margin: 10,
        filename: `${reportSettings.title.replace(/\s+/g, '_')}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      }).from(el).save();
    } else {
      const htmlContent = el.innerHTML;
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${reportSettings.title.replace(/\s+/g, '_')}.html`;
      link.click();
      URL.revokeObjectURL(url);
    }

    el.style.position = 'absolute';
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
              {([
                { id: 'include-images', label: `Thermal & Real Images (${images.length})`, key: 'includeImages' as IncludeKey },
                { id: 'include-markers', label: `Temperature Markers (${markers.length})`, key: 'includeMarkers' as IncludeKey },
                { id: 'include-regions', label: `Analysis Regions (${regions.length})`, key: 'includeRegions' as IncludeKey },
                { id: 'include-parameters', label: 'Measurement Parameters', key: 'includeParameters' as IncludeKey },
                { id: 'include-statistics', label: 'Statistical Analysis', key: 'includeStatistics' as IncludeKey }
              ]).map(item => (
                <div key={item.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={item.id}
                    checked={reportSettings[item.key]}
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
            <Label className="text-sm">Additional Notes</Label>
            <Textarea
              value={reportSettings.notes}
              onChange={(e) => setReportSettings(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Enter any additional notes or observations..."
              className="h-20 text-sm"
            />
          </div>
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
            <Button size="sm" onClick={() => handleGenerateReport('pdf')} className="h-8">
              <Download className="w-3 h-3 mr-1" />
              PDF
            </Button>
            <Button size="sm" variant="outline" onClick={() => handleGenerateReport('html')} className="h-8">
              <FileText className="w-3 h-3 mr-1" />
              HTML
            </Button>
          </div>
        </div>

        <div
          ref={reportRef}
          style={{
            position: 'absolute',
            left: '-9999px',
            top: 0,
            width: '210mm',
            padding: '20mm',
            background: 'white',
            fontFamily: 'Arial, sans-serif',
            fontSize: '12px',
            lineHeight: '1.6',
            color: '#000'
          }}
        >
          <div dangerouslySetInnerHTML={{ __html: `
            <style>
              h1 { font-size: 20px; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 5px; }
              h2 { font-size: 16px; margin-top: 24px; margin-bottom: 8px; border-bottom: 1px solid #ccc; padding-bottom: 3px; }
              p, li { font-size: 12px; margin: 4px 0; }
              ul { padding-left: 20px; margin-bottom: 12px; }
              table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
              th, td { border: 1px solid #999; padding: 6px; font-size: 12px; text-align: left; }
              img { margin-top: 4px; margin-bottom: 8px; max-width: 100%; height: auto; border: 1px solid #ccc; }
              .section { margin-bottom: 24px; }
              .page-break { page-break-before: always; }
              table, tr, td, th { page-break-inside: avoid; }
            </style>
          ` }} />

          <h1>{reportSettings.title}</h1>

          <div className="section">
            <h2>1. Project Information</h2>
            <p><strong>Company:</strong> {currentProject?.company || '—'}</p>
            <p><strong>Customer:</strong> —</p>
            <p><strong>Location:</strong> —</p>
            <p><strong>Purpose:</strong> —</p>
            <p><strong>Date:</strong> {currentProject?.date?.toLocaleDateString() || '—'}</p>
            <p><strong>Method:</strong> Based on EN 13187 using thermal imaging.</p>
          </div>

          <div className="section">
            <h2>2. Device Information</h2>
            <p><strong>Device:</strong> Testo 882</p>
            <p><strong>Serial No:</strong> 1906934</p>
            <p><strong>Lens:</strong> 32° × 23°</p>
            <p><strong>Emissivity:</strong> 0.95</p>
            <p><strong>Reflected Temp:</strong> 68°F</p>
          </div>

          <div className="section">
            <h2>3. Building Description</h2>
            <p><strong>Structure:</strong> —</p>
            <p><strong>Orientation:</strong> —</p>
            <p><strong>Surroundings:</strong> —</p>
          </div>

          <div className="section">
            <h2>4. Weather Conditions</h2>
            <p><strong>Outdoor Temp (24h min/max/current):</strong> — / — / —</p>
            <p><strong>Indoor Temp:</strong> —</p>
            <p><strong>Temp Difference:</strong> —</p>
            <p><strong>Solar Radiation (12h / current):</strong> — / —</p>
            <p><strong>Rain:</strong> —</p>
            <p><strong>Wind Speed / Direction:</strong> — / —</p>
            <p><strong>Pressure Difference:</strong> —</p>
          </div>

          {reportSettings.includeImages && images.length > 0 && (
            <div className="section page-break">
              <h2>5. Images</h2>
              {images.map((img) => (
                <div key={img.id} style={{ marginBottom: '12px' }}>
                  <p><strong>{img.name}</strong></p>
                  {img.realImage && (
                    <img src={img.realImage} alt={img.name} crossOrigin="anonymous" />
                  )}
                  <p>Max Temp: {img.thermalData?.maxTemp ?? '—'} °F</p>
                  <p>Min Temp: {img.thermalData?.minTemp ?? '—'} °F</p>
                </div>
              ))}
            </div>
          )}

          {reportSettings.includeMarkers && markers.length > 0 && (
            <div className="section">
              <h2>6. Temperature Markers</h2>
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>X</th>
                    <th>Y</th>
                    <th>Temp (°F)</th>
                  </tr>
                </thead>
                <tbody>
                  {markers.map((m, i) => (
                    <tr key={i}>
                      <td>{i + 1}</td>
                      <td>{m.x}</td>
                      <td>{m.y}</td>
                      <td>{m.temperature ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {reportSettings.includeRegions && regions.length > 0 && (
            <div className="section">
              <h2>7. Analysis Regions</h2>
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Type</th>
                    <th>Avg Temp</th>
                    <th>Min Temp</th>
                    <th>Max Temp</th>
                  </tr>
                </thead>
                <tbody>
                  {regions.map((r, i) => (
                    <tr key={i}>
                      <td>{i + 1}</td>
                      <td>{r.type || '—'}</td>
                      <td>{r.avgTemp ?? '—'} °F</td>
                      <td>{r.minTemp ?? '—'} °F</td>
                      <td>{r.maxTemp ?? '—'} °F</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {reportSettings.includeStatistics && (
            <div className="section">
              <h2>8. Statistical Analysis</h2>
              <p>—</p>
            </div>
          )}

          <div className="section">
            <h2>9. Deviations from Test Standards</h2>
            <p>—</p>
          </div>

          {reportSettings.notes && (
            <div className="section">
              <h2>10. Additional Notes</h2>
              <p>{reportSettings.notes}</p>
            </div>
          )}
        </div>
      </div>
    </Window>
  );
}