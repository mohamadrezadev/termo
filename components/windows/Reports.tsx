'use client';

import { useState } from 'react';
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
    regions
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

  const activeImage = images.find(img => img.id === activeImageId);

  const handleGenerateReport = (format: 'pdf' | 'docx' | 'html') => {
    console.log('Generating report in format:', format);
    // Report generation logic would go here
  };

  return (
    <Window id="reports" title={t.reports} minWidth={350} minHeight={400}>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="p-3 bg-gray-750 border-b border-gray-600">
          <h3 className="text-sm font-medium flex items-center">
            <FileText className="w-4 h-4 mr-2" />
            {t.reportWizard}
          </h3>
        </div>

        {/* Content */}
        <div className="flex-1 p-4 space-y-4 overflow-auto">
          {/* Report Title */}
          <div className="space-y-2">
            <Label className="text-sm">Report Title</Label>
            <Input
              value={reportSettings.title}
              onChange={(e) => setReportSettings(prev => ({ ...prev, title: e.target.value }))}
              className="h-8"
            />
          </div>

          {/* Include Options */}
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
                  Thermal & RGB Images ({images.length})
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

          {/* Notes */}
          <div className="space-y-2">
            <Label className="text-sm">Additional Notes</Label>
            <Textarea
              value={reportSettings.notes}
              onChange={(e) => setReportSettings(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Enter any additional notes or observations..."
              className="h-20 text-sm"
            />
          </div>

          {/* Project Info */}
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

        {/* Actions */}
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

          <div className="grid grid-cols-3 gap-2">
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
              onClick={() => handleGenerateReport('docx')}
              className="h-8"
            >
              <FileText className="w-3 h-3 mr-1" />
              DOCX
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

          <div className="flex space-x-2">
            <Button
              variant="ghost"
              size="sm"
              className="flex-1 h-8"
            >
              <Printer className="w-3 h-3 mr-1" />
              Print
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="flex-1 h-8"
            >
              <Mail className="w-3 h-3 mr-1" />
              Email
            </Button>
          </div>
        </div>
      </div>
    </Window>
  );
}