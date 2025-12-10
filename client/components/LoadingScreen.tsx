'use client';

import { useEffect, useState } from 'react';
import { Thermometer, Activity, TrendingUp } from 'lucide-react';

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
    <div className="fixed inset-0 bg-gradient-to-br from-background via-primary/5 to-secondary/5 flex items-center justify-center z-50">
      <div className="text-center">
        {/* Logo with Thermal Animation */}
        <div className="mb-8 relative">
          {/* Thermal Waves Background */}
          <div className="absolute inset-0 w-32 h-32 mx-auto">
            <div className="absolute inset-0 bg-gradient-to-r from-red-500 via-yellow-500 to-blue-500 rounded-full blur-3xl opacity-20 animate-pulse"></div>
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500 via-cyan-500 to-green-500 rounded-full blur-2xl opacity-30 animate-pulse" style={{ animationDelay: '0.5s' }}></div>
          </div>
          
          {/* Main Logo Container */}
          <div className="relative w-32 h-32 mx-auto">
            {/* Outer Ring - Rotating */}
            <div className="absolute inset-0 border-4 border-primary/30 rounded-full animate-spin" style={{ animationDuration: '3s' }}>
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-primary rounded-full"></div>
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-3 h-3 bg-secondary rounded-full"></div>
            </div>
            
            {/* Middle Ring - Counter Rotating */}
            <div className="absolute inset-2 border-4 border-secondary/30 rounded-full animate-spin" style={{ animationDuration: '2s', animationDirection: 'reverse' }}>
              <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-accent rounded-full"></div>
              <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-2.5 h-2.5 bg-accent rounded-full"></div>
            </div>
            
            {/* Center Icon Container */}
            <div className="absolute inset-4 bg-gradient-to-br from-primary to-secondary rounded-2xl flex items-center justify-center shadow-glow-lg animate-pulse">
              <Thermometer className="w-12 h-12 text-primary-foreground" />
              
              {/* Temperature Rising Animation */}
              <div className="absolute bottom-2 right-2">
                <TrendingUp className="w-4 h-4 text-primary-foreground animate-bounce" />
              </div>
              
              {/* Activity Pulse */}
              <div className="absolute top-2 left-2">
                <Activity className="w-4 h-4 text-primary-foreground animate-pulse" />
              </div>
            </div>
          </div>
          
          {/* Glow Effect */}
          <div className="absolute inset-0 w-32 h-32 mx-auto bg-gradient-to-br from-primary to-secondary rounded-full blur-2xl opacity-40"></div>
        </div>

        {/* App Title */}
        <h1 className="text-4xl font-bold bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent mb-2 animate-pulse">
          تحلیلگر حرارتی پیشرفته
        </h1>
        <p className="text-muted-foreground mb-8 flex items-center justify-center gap-2">
          <span>Thermal Analyzer Pro</span>
          <Thermometer className="w-4 h-4" />
        </p>

        {/* Progress Bar */}
        <div className="w-80 mx-auto">
          <div className="h-2.5 bg-muted/50 rounded-full overflow-hidden mb-4 border border-primary/20">
            <div 
              className="h-full bg-gradient-to-r from-primary via-secondary to-accent transition-all duration-500 ease-out rounded-full shadow-glow relative overflow-hidden"
              style={{ width: `${progress}%` }}
            >
              {/* Shimmer Effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"></div>
            </div>
          </div>
          
          {/* Loading Text */}
          <div className="text-sm text-muted-foreground animate-pulse min-h-[20px]">
            {loadingText}
          </div>
          
          {/* Progress Percentage */}
          <div className="text-lg font-semibold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent mt-2">
            {progress}%
          </div>
        </div>

        {/* Version */}
        <div className="mt-12 text-xs text-muted-foreground/60">
          نسخه 1.0.0
        </div>
      </div>
    </div>
  );
}