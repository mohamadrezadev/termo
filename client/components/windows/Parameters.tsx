'use client';

import { useAppStore } from '@/lib/store';
import { translations } from '@/lib/translations';
import { COLOR_PALETTES } from '@/lib/thermal-utils';
import Window from './Window';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Settings, Palette } from 'lucide-react';

export default function Parameters() {
  const {
    language,
    currentPalette,
    customMinTemp,
    customMaxTemp,
    globalParameters,
    images,
    activeImageId,
    setPalette,
    setTemperatureRange,
    updateGlobalParameters
  } = useAppStore();

  const t = translations[language];
  const activeImage = images.find(img => img.id === activeImageId);

  const handlePaletteChange = (palette: string) => {
    setPalette(palette);
  };

  const handleTemperatureRangeChange = (type: 'min' | 'max', value: string) => {
    const numValue = parseFloat(value) || null;
    if (type === 'min') {
      setTemperatureRange(numValue, customMaxTemp);
    } else {
      setTemperatureRange(customMinTemp, numValue);
    }
  };

  const handleParameterChange = (key: keyof typeof globalParameters, value: number) => {
    updateGlobalParameters({ [key]: value });
  };

  const resetTemperatureRange = () => {
    setTemperatureRange(null, null);
  };

  return (
    <Window id="parameters" title={t.parameters} minWidth={250} minHeight={400}>
      <div className="flex flex-col h-full p-4 space-y-6 overflow-auto">
        {/* Color Palette Section */}
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Palette className="w-4 h-4" />
            <h3 className="text-sm font-medium">{t.palette}</h3>
          </div>
          
          <Select value={currentPalette} onValueChange={handlePaletteChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(COLOR_PALETTES).map(([key, palette]) => (
                <SelectItem key={key} value={key}>
                  <div className="flex items-center space-x-2">
                    <div 
                      className="w-4 h-4 rounded"
                      style={{
                        background: `linear-gradient(to right, ${palette.colors.slice(0, 3).join(', ')})`
                      }}
                    />
                    <span>{palette.name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Color Preview */}
          <div className="h-6 rounded border" style={{
            background: `linear-gradient(to right, ${COLOR_PALETTES[currentPalette]?.colors.join(', ')})`
          }} />
        </div>

        <Separator />

        {/* Temperature Range Section */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium">Temperature Range</h3>
          
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">{t.minTemp}</Label>
              <Input
                type="number"
                step="0.1"
                value={customMinTemp ?? activeImage?.thermalData?.minTemp.toFixed(1) ?? ''}
                onChange={(e) => handleTemperatureRangeChange('min', e.target.value)}
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t.maxTemp}</Label>
              <Input
                type="number"
                step="0.1"
                value={customMaxTemp ?? activeImage?.thermalData?.maxTemp.toFixed(1) ?? ''}
                onChange={(e) => handleTemperatureRangeChange('max', e.target.value)}
                className="h-8 text-sm"
              />
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={resetTemperatureRange}
            className="w-full h-8"
          >
            Auto Range
          </Button>
        </div>

        <Separator />

        {/* Physical Parameters Section */}
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Settings className="w-4 h-4" />
            <h3 className="text-sm font-medium">Physical Parameters</h3>
          </div>

          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">{t.emissivity}</Label>
              <div className="space-y-2">
                <Slider
                  value={[globalParameters.emissivity]}
                  onValueChange={(value) => handleParameterChange('emissivity', value[0])}
                  min={0.1}
                  max={1}
                  step={0.01}
                  className="w-full"
                />
                <Input
                  type="number"
                  step="0.01"
                  min="0.1"
                  max="1"
                  value={globalParameters.emissivity}
                  onChange={(e) => handleParameterChange('emissivity', parseFloat(e.target.value) || 0.95)}
                  className="h-8 text-sm"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">{t.ambientTemp} (°C)</Label>
              <Input
                type="number"
                step="0.1"
                value={globalParameters.ambientTemp}
                onChange={(e) => handleParameterChange('ambientTemp', parseFloat(e.target.value) || 20)}
                className="h-8 text-sm"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">{t.reflectedTemp} (°C)</Label>
              <Input
                type="number"
                step="0.1"
                value={globalParameters.reflectedTemp}
                onChange={(e) => handleParameterChange('reflectedTemp', parseFloat(e.target.value) || 20)}
                className="h-8 text-sm"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">{t.humidity} (%)</Label>
              <div className="space-y-2">
                <Slider
                  value={[globalParameters.humidity]}
                  onValueChange={(value) => handleParameterChange('humidity', value[0])}
                  min={0}
                  max={100}
                  step={1}
                  className="w-full"
                />
                <Input
                  type="number"
                  step="1"
                  min="0"
                  max="100"
                  value={globalParameters.humidity}
                  onChange={(e) => handleParameterChange('humidity', parseFloat(e.target.value) || 50)}
                  className="h-8 text-sm"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">{t.distance} (m)</Label>
              <Input
                type="number"
                step="0.1"
                min="0.1"
                value={globalParameters.distance}
                onChange={(e) => handleParameterChange('distance', parseFloat(e.target.value) || 1.0)}
                className="h-8 text-sm"
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Calculated Values */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium">Calculated Values</h3>
          
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">{t.dewpoint}:</span>
              <span>
                {/* Simple dewpoint calculation */}
                {(globalParameters.ambientTemp - (100 - globalParameters.humidity) / 5).toFixed(1)}°C
              </span>
            </div>
          </div>
        </div>
      </div>
    </Window>
  );
}