/**
 * سرویس API برای ارتباط با بک‌اند با استفاده از Axios
 * API Service for backend communication using Axios
 */

import apiClient, { API_BASE_URL } from './axios-config';
import { AxiosError } from 'axios';
import type {
  ProjectPayload,
  ProjectListItem,
  ProjectDetailResponse,
  SaveProjectResponse,
  LoadProjectResponse,
  ListProjectsResponse,
  DeleteProjectResponse,
  ThermalImageUploadResponse
} from './api-types';

// Helper function to get base server URL for static files
const SERVER_BASE_URL = API_BASE_URL.replace(/\/api\/v1\/?$/, '');

/**
 * تبدیل URL نسبی به URL مطلق سرور
 * Convert relative URL to absolute server URL
 */
export function getAbsoluteUrl(relativeUrl: string | null | undefined): string | null {
  if (!relativeUrl) return null;
  // اگر از قبل absolute URL هست، همون رو برگردون
  if (relativeUrl.startsWith('http://') || relativeUrl.startsWith('https://')) {
    return relativeUrl;
  }
  // اگر relative هست، به base URL اضافه کن
  return `${SERVER_BASE_URL}${relativeUrl.startsWith('/') ? '' : '/'}${relativeUrl}`;
}


export async function post(url: string, data: any, config?: any) {
  try {
    const response = await apiClient.post(url, data, config);
    return response.data;
  } catch (err) {
    console.error(`[API SERVICE] POST request failed: ${url}`, err);
    throw err;
  }
}
// تابع کمکی GET اگر خواستی
export async function get(url: string, config?: any) {
  try {
    const response = await apiClient.get(url, config);
    return response.data;
  } catch (err) {
    console.error(`[API SERVICE] GET request failed: ${url}`, err);
    throw err;
  }
}

// ==================== Helper Functions ====================

function handleError(error: unknown, context: string): never {
  if (error instanceof AxiosError) {
    const message = error.response?.data?.detail || error.message;
    console.error(`[API_SERVICE] ${context} - ${message}`);
    throw new Error(message);
  }
  console.error(`[API_SERVICE] ${context}:`, error);
  throw error;
}

// ==================== Project API ====================

/**
 * پروژه جدید ایجاد کن
 * Create a new project
 */
export async function createProject(projectData: {
  name: string;
  operator?: string;
  company?: string;
  notes?: string;
}): Promise<any> {
  try {
    const response = await apiClient.post('/projects', projectData);
    return response.data;
  } catch (error) {
    handleError(error, 'Create project');
  }
}

/**
 * تمام پروژه‌ها را دریافت کن
 * Get all projects
 */
export async function getProjects(): Promise<any[]> {
  try {
    const response = await apiClient.get('/projects');
    return response.data;
  } catch (error) {
    handleError(error, 'Get projects');
  }
}

/**
 * یک پروژه خاص را دریافت کن
 * Get a specific project
 */
export async function getProject(projectId: string): Promise<any> {
  try {
    const response = await apiClient.get(`/projects/${projectId}`);
    return response.data;
  } catch (error) {
    handleError(error, `Get project ${projectId}`);
  }
}

/**
 * تفصیلات کامل پروژه را دریافت کن
 * Get full project details
 */
export async function getProjectDetail(projectId: string): Promise<any> {
  try {
    const response = await apiClient.get(`/projects/${projectId}`);
    return response.data;
  } catch (error) {
    handleError(error, `Get project detail ${projectId}`);
  }
}

/**
 * پروژه را به‌روزرسانی کن
 * Update a project
 */
export async function updateProject(
  projectId: string,
  projectData: Partial<{
    name: string;
    operator: string;
    company: string;
    notes: string;
  }>
): Promise<any> {
  try {
    const response = await apiClient.put(`/${projectId}`, projectData);
    return response.data;
  } catch (error) {
    handleError(error, `Update project ${projectId}`);
  }
}

// ==================== Image API ====================

/**
 * تصویر جدید برای پروژه ایجاد کن
 * Create a new image for a project
 */
export async function createImage(
  projectId: string,
  imageData: {
    name: string;
    thermal_image_base64?: string;
    real_image_base64?: string;
    thermal_data_json?: string;
  }
): Promise<any> {
  try {
    const response = await apiClient.post(`/${projectId}/images`, imageData);
    return response.data;
  } catch (error) {
    handleError(error, `Create image for project ${projectId}`);
  }
}

/**
 * تمام تصاویر پروژه را دریافت کن
 * Get all images of a project
 */
export async function getImages(projectId: string): Promise<any[]> {
  try {
    const response = await apiClient.get(`/${projectId}/images`);
    return response.data;
  } catch (error) {
    handleError(error, `Get images for project ${projectId}`);
  }
}

/**
 * یک تصویر خاص را دریافت کن
 * Get a specific image
 */
export async function getImage(imageId: string): Promise<any> {
  try {
    const response = await apiClient.get(`/images/${imageId}`);
    return response.data;
  } catch (error) {
    handleError(error, `Get image ${imageId}`);
  }
}

/**
 * تصویر را به‌روزرسانی کن
 * Update an image
 */
export async function updateImage(
  imageId: string,
  imageData: Partial<{
    name: string;
    thermal_image_base64: string;
    real_image_base64: string;
    thermal_data_json: string;
  }>
): Promise<any> {
  try {
    const response = await apiClient.put(`/images/${imageId}`, imageData);
    return response.data;
  } catch (error) {
    handleError(error, `Update image ${imageId}`);
  }
}

/**
 * تصویر را حذف کن
 * Delete an image
 */
export async function deleteImage(imageId: string): Promise<void> {
  try {
    await apiClient.delete(`/images/${imageId}`);
  } catch (error) {
    handleError(error, `Delete image ${imageId}`);
  }
}

// ==================== Marker API ====================

/**
 * مارکر جدید برای تصویر ایجاد کن
 * Create a new marker for an image
 */
export async function createMarker(
  imageId: string,
  markerData: {
    name: string;
    x: number;
    y: number;
    temperature?: number;
    notes?: string;
  }
): Promise<any> {
  try {
    const response = await apiClient.post(`/images/${imageId}/markers`, markerData);
    return response.data;
  } catch (error) {
    handleError(error, `Create marker for image ${imageId}`);
  }
}

/**
 * تمام مارکرهای تصویر را دریافت کن
 * Get all markers of an image
 */
export async function getMarkers(imageId: string): Promise<any[]> {
  try {
    const response = await apiClient.get(`/images/${imageId}/markers`);
    return response.data;
  } catch (error) {
    handleError(error, `Get markers for image ${imageId}`);
  }
}

/**
 * یک مارکر خاص را دریافت کن
 * Get a specific marker
 */
export async function getMarker(markerId: string): Promise<any> {
  try {
    const response = await apiClient.get(`/markers/${markerId}`);
    return response.data;
  } catch (error) {
    handleError(error, `Get marker ${markerId}`);
  }
}

/**
 * مارکر را به‌روزرسانی کن
 * Update a marker
 */
export async function updateMarker(
  markerId: string,
  markerData: Partial<{
    name: string;
    x: number;
    y: number;
    temperature: number;
    notes: string;
  }>
): Promise<any> {
  try {
    const response = await apiClient.put(`/markers/${markerId}`, markerData);
    return response.data;
  } catch (error) {
    handleError(error, `Update marker ${markerId}`);
  }
}

/**
 * مارکر را حذف کن
 * Delete a marker
 */
export async function deleteMarker(markerId: string): Promise<void> {
  try {
    await apiClient.delete(`/markers/${markerId}`);
  } catch (error) {
    handleError(error, `Delete marker ${markerId}`);
  }
}

// ==================== Region API ====================

/**
 * منطقه جدید برای تصویر ایجاد کن
 * Create a new region for an image
 */
export async function createRegion(
  imageId: string,
  regionData: {
    name: string;
    points: Array<{ x: number; y: number }>;
    color?: string;
    min_temp?: number;
    max_temp?: number;
    avg_temp?: number;
    notes?: string;
  }
): Promise<any> {
  try {
    const response = await apiClient.post(`/images/${imageId}/regions`, regionData);
    return response.data;
  } catch (error) {
    handleError(error, `Create region for image ${imageId}`);
  }
}

/**
 * تمام مناطق تصویر را دریافت کن
 * Get all regions of an image
 */
export async function getRegions(imageId: string): Promise<any[]> {
  try {
    const response = await apiClient.get(`/images/${imageId}/regions`);
    return response.data;
  } catch (error) {
    handleError(error, `Get regions for image ${imageId}`);
  }
}

/**
 * یک منطقه خاص را دریافت کن
 * Get a specific region
 */
export async function getRegion(regionId: string): Promise<any> {
  try {
    const response = await apiClient.get(`/regions/${regionId}`);
    return response.data;
  } catch (error) {
    handleError(error, `Get region ${regionId}`);
  }
}

/**
 * منطقه را به‌روزرسانی کن
 * Update a region
 */
export async function updateRegion(
  regionId: string,
  regionData: Partial<{
    name: string;
    points: Array<{ x: number; y: number }>;
    color: string;
    min_temp: number;
    max_temp: number;
    avg_temp: number;
    notes: string;
  }>
): Promise<any> {
  try {
    const response = await apiClient.put(`/regions/${regionId}`, regionData);
    return response.data;
  } catch (error) {
    handleError(error, `Update region ${regionId}`);
  }
}

/**
 * منطقه را حذف کن
 * Delete a region
 */
export async function deleteRegion(regionId: string): Promise<void> {
  try {
    await apiClient.delete(`/regions/${regionId}`);
  } catch (error) {
    handleError(error, `Delete region ${regionId}`);
  }
}

// ==================== Bulk Operations ====================

/**
 * تمام داده‌های پروژه را یک‌باره ذخیره کن
 * Bulk save all project data at once
 */
export async function bulkSaveProject(
  projectId: string | null,
  projectData: {
    name: string;
    operator?: string;
    company?: string;
    notes?: string;
  },
  images: Array<{
    id?: string;
    name: string;
    thermal_image_base64?: string;
    real_image_base64?: string;
    thermal_data_json?: string;
  }>,
  markers: Array<{
    id?: string;
    image_id: string;
    name: string;
    x: number;
    y: number;
    temperature?: number;
    notes?: string;
  }>,
  regions: Array<{
    id?: string;
    image_id: string;
    name: string;
    points: Array<{ x: number; y: number }>;
    color?: string;
    min_temp?: number;
    max_temp?: number;
    avg_temp?: number;
    notes?: string;
  }>
): Promise<any> {
  try {
    const url = projectId ? `/${projectId}/bulk-save` : '/null/bulk-save';

    const response = await apiClient.post(url, {
      project: projectData,
      images,
      markers,
      regions,
    });

    return response.data;
  } catch (error) {
    handleError(error, 'Bulk save project');
  }
}

// ==================== Report Generation API ====================

/**
 * تولید گزارش PDF یا DOCX
 * Generate PDF or DOCX report
 */
export async function generateReport(requestData: {
  projectId: string;
  projectName: string;
  operator: string;
  company: string;
  settings: any;
  images: Array<{
    id: string;
    name: string;
    thermalBase64?: string;
    realBase64?: string;
  }>;
  markers: Array<{
    id: string;
    imageId: string;
    label: string;
    x: number;
    y: number;
    temperature: number;
  }>;
  regions: Array<{
    id: string;
    imageId: string;
    label: string;
    type: string;
    points: Array<{ x: number; y: number }>;
    minTemp: number;
    maxTemp: number;
    avgTemp: number;
  }>;
  globalParameters: any;
  format: 'pdf' | 'docx';
}): Promise<Blob> {
  try {
    const response = await apiClient.post('/reports/generate', requestData, {
      responseType: 'blob'
    });
    return response.data;
  } catch (error) {
    handleError(error, 'Generate report');
  }
}

/**
 * تغییر پالت رنگی تصویر حرارتی
 * Change thermal image color palette
 */
export async function rerenderPalette(
  file: File | null,
  projectName: string,
  palette: string
): Promise<any> {
  try {
    const formData = new FormData();
    if (file) {
      formData.append('bmt_file', file);
    }
    formData.append('project_name', projectName);
    formData.append('palette', palette);

    const response = await apiClient.post('/thermal/upload/rerender-palette', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });

    return response.data;
  } catch (error) {
    handleError(error, 'Rerender palette');
  }
}

/**
 * ذخیره پروژه با تمام اطلاعات (تصاویر، markers، regions)
 * Save project with all data (images, markers, regions)
 */
export async function saveProject(projectData: ProjectPayload): Promise<SaveProjectResponse> {
  try {
    const response = await apiClient.post('/project/save', {
      id: projectData.id,
      name: projectData.name,
      description: projectData.description || projectData.parameters?.timestamp?.toString() || '',
      operator: projectData.operator || '',
      company: projectData.company || '',
      images: projectData.images || [],
      markers: projectData.markers || [],
      regions: projectData.regions || [],
      activeImageId: projectData.activeImageId,
      currentPalette: projectData.currentPalette,
      customMinTemp: projectData.customMinTemp,
      customMaxTemp: projectData.customMaxTemp,
      parameters: projectData.parameters || {}
    });

    console.log('[API] Project saved successfully:', response.data);
    return response.data;
  } catch (error) {
    handleError(error, 'Save project');
  }
}

/**
 * بارگذاری پروژه با تمام اطلاعات
 * Load project with all data
 */
export async function loadProject(projectId: string): Promise<LoadProjectResponse> {
  try {
    const response = await apiClient.get(`/project/load/${projectId}`);
    
    console.log('[API] Project loaded successfully:', response.data);
    return response.data;
  } catch (error) {
    handleError(error, 'Load project');
  }
}

/**
 * دریافت لیست تمام پروژه‌ها
 * Get list of all projects
 */
export async function listProjects(): Promise<ListProjectsResponse> {
  try {
    const response = await apiClient.get('/project/list');
    
    console.log('[API] Projects list retrieved:', response.data);
    return response.data;
  } catch (error) {
    handleError(error, 'List projects');
  }
}

/**
 * حذف پروژه
 * Delete project
 */
export async function deleteProject(projectId: string): Promise<DeleteProjectResponse> {
  try {
    const response = await apiClient.delete(`/project/delete/${projectId}`);
    
    console.log('[API] Project deleted:', response.data);
    return response.data;
  } catch (error) {
    handleError(error, 'Delete project');
  }
}