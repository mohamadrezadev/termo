'use client';

import { useEffect } from 'react';
import { Toaster } from 'sonner';
import { useAppStore } from '@/lib/store';

export default function ToastWrapper() {
  const { language } = useAppStore();
  const isRTL = language === 'fa';

  useEffect(() => {
    // Update document direction when language changes
    if (typeof document !== 'undefined') {
      const toasterElements = document.querySelectorAll('[data-sonner-toaster]');
      toasterElements.forEach(el => {
        if (isRTL) {
          el.setAttribute('dir', 'rtl');
        } else {
          el.removeAttribute('dir');
        }
      });
    }
  }, [isRTL]);

  return (
    <Toaster 
      position={isRTL ? "top-left" : "top-right"}
      theme="dark"
      richColors
      closeButton
      duration={3000}
      dir={isRTL ? 'rtl' : 'ltr'}
      toastOptions={{
        style: {
          direction: isRTL ? 'rtl' : 'ltr',
          fontFamily: isRTL ? 'Tahoma, Arial, sans-serif' : 'Inter, sans-serif',
        }
      }}
    />
  );
}