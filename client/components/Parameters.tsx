'use client';

import { useAppStore } from '@/lib/store';
import { translations } from '@/lib/translations';
import { COLOR_PALETTES } from '@/lib/thermal-utils';
import Window from './Window';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { Settings, Palette, Check } from 'lucide-react';
import { toast } from 'sonner';

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

  const handlePaletteChange = (paletteKey: string) => {
    setPalette(paletteKey);
    toast.success(`پالت رنگی "${COLOR_PALETTES[paletteKey].name}" اعمال شد`);
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
    toast.success('محدوده دمایی به حالت اولیه بازگشت');
  };

  return (
    <Window id="parameters" title={t.parameters} minWidth={300} minHeight={500}>
      <div className="flex flex-col h-full p-4 space-y-4 overflow-auto">
        {/* Color Palette Section */}
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Palette className="w-4 h-4" />
            <h3 className="text-sm font-medium">{t.palette}</h3>
          </div>
          
          {/* Palette Grid */}
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(COLOR_PALETTES).map(([key, palette]) => (
              <button
                key={key}
                onClick={() => handlePaletteChange(key)}
                className={`
                  relative p-2 rounded-lg border-2 transition-all duration-200 group
                  ${currentPalette === key 
                    ? 'border-primary shadow-glow bg-primary/10' 
                    : 'border-border hover:border-primary/50 hover:shadow-sm'
                  }
                `}
              >
                {/* Palette Preview */}
                <div 
                  className="h-8 rounded-md mb-1 ring-1 ring-border group-hover:ring-primary/50 transition-all"
                  style={{
                    background: `linear-gradient(to right, ${palette.colors.join(', ')})`
                  }}
                />
                
                {/* Palette Name */}
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium">{palette.name}</span>
                  {currentPalette === key && (
                    <Check className="w-3 h-3 text-primary" />
                  )}
                </div>
              </button>
            ))}
          </div>

          {/* Current Palette Info */}
          <div className="bg-muted/50 rounded-lg p-3 border border-primary/20 backdrop-blur-sm">
            <div className="text-xs text-muted-foreground mb-2 font-medium">پالت فعلی:</div>
            <div 
              className="h-6 rounded-md border-2 border-primary/30 shadow-sm"
              style={{
                background: `linear-gradient(to right, ${COLOR_PALETTES[currentPalette]?.colors.join(', ')})`
              }}
            />
            <div className="text-xs text-center mt-2 font-semibold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              {COLOR_PALETTES[currentPalette]?.name}
            </div>
          </div>
        </div>

        <Separator />

        {/* Temperature Range Section */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium">محدوده دمایی</h3>
          
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">{t.minTemp}</Label>
              <Input
                type="number"
                step="0.1"
                value={customMinTemp ?? activeImage?.thermalData?.minTemp.toFixed(1) ?? ''}
                onChange={(e) => handleTemperatureRangeChange('min', e.target.value)}
                className="h-8 text-sm"
                placeholder="Auto"
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
                placeholder="Auto"
              />
            </div>
          </div>

          {activeImage?.thermalData && (
            <div className="text-xs text-gray-400 space-y-1">
              <div className="flex justify-between">
                <span>محدوده اصلی:</span>
                <span className="font-mono">
                  {activeImage.thermalData.minTemp.toFixed(1)} - {activeImage.thermalData.maxTemp.toFixed(1)}°C
                </span>
              </div>
              {(customMinTemp !== null || customMaxTemp !== null) && (
                <div className="flex justify-between text-blue-400">
                  <span>محدوده فعلی:</span>
                  <span className="font-mono">
                    {(customMinTemp ?? activeImage.thermalData.minTemp).toFixed(1)} - 
                    {(customMaxTemp ?? activeImage.thermalData.maxTemp).toFixed(1)}°C
                  </span>
                </div>
              )}
            </div>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={resetTemperatureRange}
            className="w-full h-8"
          >
            بازگشت به محدوده اتوماتیک
          </Button>
        </div>

        <Separator />

        {/* Physical Parameters Section */}
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Settings className="w-4 h-4" />
            <h3 className="text-sm font-medium">پارامترهای فیزیکی</h3>
          </div>

          <div className="space-y-3">
            {/* Emissivity */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">{t.emissivity}</Label>
                <span className="text-xs font-mono text-gray-400">
                  {globalParameters.emissivity.toFixed(2)}
                </span>
              </div>
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
                className="h-7 text-xs"
              />
            </div>

            {/* Ambient Temperature */}
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

            {/* Reflected Temperature */}
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

            {/* Humidity */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">{t.humidity} (%)</Label>
                <span className="text-xs font-mono text-gray-400">
                  {globalParameters.humidity.toFixed(0)}%
                </span>
              </div>
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
                className="h-7 text-xs"
              />
            </div>

            {/* Distance */}
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
          <h3 className="text-sm font-medium">مقادیر محاسبه شده</h3>
          
          <div className="space-y-2 text-sm bg-gray-800 rounded p-3 border border-gray-700">
            <div className="flex justify-between">
              <span className="text-gray-400">{t.dewpoint}:</span>
              <span className="font-mono">
                {/* Simple dewpoint calculation (Magnus formula approximation) */}
                {(
                  globalParameters.ambientTemp - 
                  ((100 - globalParameters.humidity) / 5)
                ).toFixed(1)}°C
              </span>
            </div>
            
            {activeImage?.thermalData && (
              <>
                <div className="flex justify-between">
                  <span className="text-gray-400">محدوده تصویر:</span>
                  <span className="font-mono text-xs">
                    {(activeImage.thermalData.maxTemp - activeImage.thermalData.minTemp).toFixed(1)}°C
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">رزولوشن:</span>
                  <span className="font-mono text-xs">
                    {activeImage.thermalData.width} × {activeImage.thermalData.height}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">تعداد پیکسل:</span>
                  <span className="font-mono text-xs">
                    {(activeImage.thermalData.width * activeImage.thermalData.height).toLocaleString()}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Help Text */}
        <div className="text-xs text-gray-500 bg-gray-800/50 rounded p-2 border border-gray-700">
          💡 <strong>نکته:</strong> تغییر پالت رنگی یا محدوده دمایی بلافاصله روی تصویر حرارتی و هیستوگرام اعمال می‌شود.
        </div>
      </div>
    </Window>
  );
}