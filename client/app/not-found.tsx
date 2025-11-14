'use client';

export default function NotFound() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-900">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-white mb-4">404</h1>
        <p className="text-xl text-gray-400 mb-8">صفحه یافت نشد / Page Not Found</p>
        <a href="/" className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
          بازگشت به صفحه اصلی / Go Home
        </a>
      </div>
    </div>
  );
}
