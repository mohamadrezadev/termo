

import axios, { AxiosInstance, AxiosError, AxiosResponse } from 'axios';

// دریافت URL پایه API از متغیرهای محیطی. پیش‌فرض را روی سرور FastAPI (پورت 8000) می‌گذاریم.
function resolveApiBaseUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (envUrl) {
    return envUrl.replace(/\/$/, ''); // جلوگیری از // در baseURL
  }
  return 'http://localhost:8000/api/v1';
}

export const API_BASE_URL = resolveApiBaseUrl();

// ایجاد instance Axios
export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 ثانیه
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor برای درخواست‌ها
apiClient.interceptors.request.use(
  (config) => {
    console.log(`[AXIOS] ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error: AxiosError) => {
    console.error('[AXIOS] Request error:', error);
    return Promise.reject(error);
  }
);

// Interceptor برای پاسخ‌ها
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    console.log(`[AXIOS] Response ${response.status} from ${response.config.url}`);
    return response;
  },
  (error: AxiosError) => {
    if (error.response) {
      console.error(`[AXIOS] Response error ${error.response.status}:`, error.response.data);
    } else if (error.request) {
      console.error('[AXIOS] No response received:', error.request);
    } else {
      console.error('[AXIOS] Error:', error.message);
    }
    return Promise.reject(error);
  }
);

export default apiClient;


