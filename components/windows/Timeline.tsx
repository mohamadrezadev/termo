'use client';

import { useAppStore } from '@/lib/store';
import { translations } from '@/lib/translations';
import Window from './Window';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward,
  Clock,
  Plus
} from 'lucide-react';

export default function Timeline() {
  const {
    language,
    timelineImages,
    currentTimeIndex,
    isPlaying,
    playbackSpeed
  } = useAppStore();

  const t = translations[language];

  return (
    <Window id="timeline" title={t.timeline} minHeight={150}>
      <div className="flex flex-col h-full">
        {/* Controls */}
        <div className="flex items-center justify-between p-2 bg-gray-750 border-b border-gray-600">
          <div className="flex items-center space-x-1">
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <SkipBack className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </Button>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <SkipForward className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-xs text-gray-400">Speed:</span>
            <span className="text-xs text-gray-300 min-w-[3rem]">
              {playbackSpeed}x
            </span>
          </div>

          <Button variant="outline" size="sm" className="h-8 px-2">
            <Plus className="w-4 h-4 mr-1" />
            Add Images
          </Button>
        </div>

        {/* Timeline Content */}
        <div className="flex-1 p-4">
          {timelineImages.length > 0 ? (
            <div className="space-y-4">
              {/* Timeline Slider */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-gray-400">
                  <span>Frame {currentTimeIndex + 1} of {timelineImages.length}</span>
                  <span>{timelineImages[currentTimeIndex]?.name}</span>
                </div>
                <Slider
                  value={[currentTimeIndex]}
                  max={timelineImages.length - 1}
                  step={1}
                  className="w-full"
                />
              </div>

              {/* Image Thumbnails */}
              <div className="flex space-x-2 overflow-x-auto">
                {timelineImages.map((image, index) => (
                  <div
                    key={image.id}
                    className={`flex-shrink-0 w-20 h-16 bg-gray-700 rounded border-2 cursor-pointer ${
                      index === currentTimeIndex ? 'border-blue-500' : 'border-gray-600'
                    }`}
                  >
                    {image.realImage && (
                      <img
                        src={image.realImage}
                        alt={`Frame ${index + 1}`}
                        className="w-full h-full object-cover rounded"
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400">
              <div className="text-center">
                <Clock className="w-12 h-12 mx-auto mb-2" />
                <p>No timeline images</p>
                <p className="text-sm">Add multiple images to create a time series</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </Window>
  );
}