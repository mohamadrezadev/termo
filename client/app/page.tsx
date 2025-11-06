'use client';

import { useState } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import LoadingScreen from '@/components/LoadingScreen';
import ErrorBoundary from '@/components/ErrorBoundary';

export default function Home() {
  const [isLoading, setIsLoading] = useState(true);

  return (
    <ErrorBoundary>
      {isLoading ? (
        <LoadingScreen onLoadingComplete={() => setIsLoading(false)} />
      ) : (
        <MainLayout />
      )}
    </ErrorBoundary>
  );
}