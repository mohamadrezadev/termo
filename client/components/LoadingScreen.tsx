'use client';

import { useEffect, useState } from 'react';
import { Thermometer } from 'lucide-react';

interface LoadingScreenProps {
  onLoadingComplete: () => void;
}

export default function LoadingScreen({ onLoadingComplete }: LoadingScreenProps) {
  const [progress, setProgress] = useState(0);
  const [loadingText, setLoadingText] = useState('بارگذاری اولیه...');

  useEffect(() => {
    const steps = [
      { progress: 20, text: 'بارگذاری منابع برنامه...', delay: 300 },
      { progress: 40, text: 'راه‌اندازی موتور حرارتی...', delay: 500 },
      { progress: 60, text: 'بارگذاری پالت‌های رنگی...', delay: 400 },
      { progress: 80, text: 'آماده‌سازی محیط کار...', delay: 400 },
      { progress: 100, text: 'آماده!', delay: 300 }
    ];

    let currentStep = 0;

    const runNextStep = () => {
      if (currentStep < steps.length) {
        const step = steps[currentStep];
        setProgress(step.progress);
        setLoadingText(step.text);
        currentStep++;
        
        setTimeout(() => {
          if (currentStep < steps.length) {
            runNextStep();
          } else {
            setTimeout(() => {
              onLoadingComplete();
            }, 500);
          }
        }, step.delay);
      }
    };

    setTimeout(runNextStep, 500);
  }, [onLoadingComplete]);

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center z-50">
      <div className="text-center">
        {/* Logo and Icon */}
        <div className="mb-8 relative">
          <div className="w-24 h-24 mx-auto bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-2xl animate-pulse">
            <Thermometer className="w-12 h-12 text-white" />
          </div>
          <div className="absolute inset-0 w-24 h-24 mx-auto bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl blur-xl opacity-50"></div>
        </div>

        {/* App Title */}
        <h1 className="text-4xl font-bold text-white mb-2">
          تحلیلگر حرارتی پیشرفته
        </h1>
        <p className="text-gray-400 mb-8">
          Thermal Analyzer Pro
        </p>

        {/* Progress Bar */}
        <div className="w-80 mx-auto">
          <div className="h-2 bg-gray-700 rounded-full overflow-hidden mb-4">
            <div 
              className="h-full bg-gradient-to-r from-blue-500 to-purple-600 transition-all duration-500 ease-out rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>
          
          {/* Loading Text */}
          <div className="text-sm text-gray-400 animate-pulse min-h-[20px]">
            {loadingText}
          </div>
          
          {/* Progress Percentage */}
          <div className="text-lg font-semibold text-white mt-2">
            {progress}%
          </div>
        </div>

        {/* Version */}
        <div className="mt-12 text-xs text-gray-600">
          نسخه 1.0.0
        </div>
      </div>
    </div>
  );
}