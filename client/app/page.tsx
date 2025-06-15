'use client';

import MainLayout from '@/components/layout/MainLayout';
import ErrorBoundary from '@/components/ErrorBoundary';

export default function Home() {
  return (
    <ErrorBoundary>
      <MainLayout />
    </ErrorBoundary>
  );
}