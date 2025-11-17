/**
 * سرویس مدیریت پروژه با استفاده از API بک‌اند (با Axios)
 * Project management service using backend API (with Axios)
 */

import { Project } from './store';
import { ThermalImage, Marker, Region } from './thermal-utils';
import * as apiService from './api-service';

export interface SerializedProject {
  id: string;
  name: string;
  operator: string;
  company: string;
  date: string;
  notes: string;
  images: SerializedImage[];
  markers: Marker[];
  regions: Region[];
  hasUnsavedChanges: boolean;
  lastModified: string;
}

interface SerializedImage {
  id: string;
  name: string;
  thermalImageBase64?: string;
  realImageBase64?: string;
  thermalData?: {
    width: number;
    height: number;
    minTemp: number;
    maxTemp: number;
    metadata: any;
    temperatureMatrixBase64?: string;
  };
}

// ==================== Helper Functions ====================

// تبدیل ماتریس دما به base64
// function matrixToBase64(matrix: number[][]): string {
//   const flat = matrix.flat();
//   const buffer = new Float32Array(flat);
//   const bytes = new Uint8Array(buffer.buffer);
//   return btoa(String.fromCharCode(...bytes));
// }
function matrixToBase64(matrix: number[][]): string {
  const flat = matrix.flat();
  const buffer = new Float32Array(flat);
  const bytes = new Uint8Array(buffer.buffer);
  // استفاده از حلقه برای جلوگیری از Maximum call stack size exceeded در آرایه‌های بزرگ
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// تبدیل base64 به ماتریس دما
function base64ToMatrix(base64: string, width: number, height: number): number[][] {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  const buffer = new Float32Array(bytes.buffer);
  const matrix: number[][] = [];
  for (let y = 0; y < height; y++) {
    const row: number[] = [];
    for (let x = 0; x < width; x++) {
      row.push(buffer[y * width + x]);
    }
    matrix.push(row);
  }
  return matrix;
}

// تبدیل URL یا Blob به base64
async function urlToBase64(url: string): Promise<string> {
  try {
    console.log(`[PROJECT_SERVICE_API] Converting URL to base64: ${url.substring(0, 100)}...`);
    
    // اگر از قبل base64 است
    if (url.startsWith('data:')) {
      console.log('[PROJECT_SERVICE_API] URL is already base64');
      return url;
    }

    const response = await fetch(url, {
      mode: 'cors',
      credentials: 'omit'
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
    }

    const blob = await response.blob();
    console.log(`[PROJECT_SERVICE_API] Blob size: ${(blob.size / 1024).toFixed(2)} KB`);

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        console.log(`[PROJECT_SERVICE_API] Base64 conversion complete: ${(result.length / 1024).toFixed(2)} KB`);
        resolve(result);
      };
      reader.onerror = () => {
        console.error('[PROJECT_SERVICE_API] FileReader error:', reader.error);
        reject(reader.error);
      };
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('[PROJECT_SERVICE_API] Error converting URL to base64:', error);
    throw error;
  }
}

// ذخیره canvas به base64
function canvasToBase64(canvas: HTMLCanvasElement): string {
  try {
    return canvas.toDataURL('image/png');
  } catch (error) {
    console.error('[PROJECT_SERVICE_API] Error converting canvas to base64:', error);
    throw error;
  }
}

// ==================== Serialization ====================

// سریالایز کردن پروژه برای ارسال به API
export async function serializeProject(
  project: Project,
  images: ThermalImage[],
  markers: Marker[],
  regions: Region[]
): Promise<SerializedProject> {
  console.log('[PROJECT_SERVICE_API] Starting serialization...');
  console.log('[PROJECT_SERVICE_API] Images to serialize:', images.length);
  
  const serializedImages: SerializedImage[] = await Promise.all(
    images.map(async (img) => {
      console.log(`[PROJECT_SERVICE_API] Processing image: ${img.name}`);
      
      let thermalImageBase64: string | undefined;
      let realImageBase64: string | undefined;
      let thermalData: SerializedImage['thermalData'];
      
      // ذخیره داده‌های حرارتی
      if (img.thermalData) {
        console.log(`[PROJECT_SERVICE_API] Saving thermal data for ${img.name}`);
        thermalData = {
          width: img.thermalData.width,
          height: img.thermalData.height,
          minTemp: img.thermalData.minTemp,
          maxTemp: img.thermalData.maxTemp,
          metadata: img.thermalData.metadata,
          temperatureMatrixBase64: matrixToBase64(img.thermalData.temperatureMatrix)
        };
        console.log(`[PROJECT_SERVICE_API] Thermal data size: ${thermalData.temperatureMatrixBase64.length} bytes`);
      }
      
      // ذخیره تصویر حرارتی رندر شده از سرور
      if (img.serverRenderedThermalUrl) {
        try {
          console.log(`[PROJECT_SERVICE_API] Converting thermal image: ${img.serverRenderedThermalUrl.substring(0, 100)}...`);
          thermalImageBase64 = await urlToBase64(img.serverRenderedThermalUrl);
          console.log(`[PROJECT_SERVICE_API] Thermal image saved: ${(thermalImageBase64.length / 1024).toFixed(2)} KB`);
        } catch (error) {
          console.error(`[PROJECT_SERVICE_API] Failed to convert thermal image:`, error);
        }
      }
      
      // اگر canvas موجود است، از آن استفاده کن
      if (!thermalImageBase64 && img.canvas) {
        try {
          console.log(`[PROJECT_SERVICE_API] Converting canvas to base64 for ${img.name}`);
          thermalImageBase64 = canvasToBase64(img.canvas);
          console.log(`[PROJECT_SERVICE_API] Canvas converted: ${(thermalImageBase64.length / 1024).toFixed(2)} KB`);
        } catch (error) {
          console.error(`[PROJECT_SERVICE_API] Failed to convert canvas:`, error);
        }
      }
      
      // ذخیره تصویر واقعی
      if (img.realImage) {
        try {
          console.log(`[PROJECT_SERVICE_API] Converting real image for ${img.name}`);
          realImageBase64 = await urlToBase64(img.realImage);
          console.log(`[PROJECT_SERVICE_API] Real image saved: ${(realImageBase64.length / 1024).toFixed(2)} KB`);
        } catch (error) {
          console.error(`[PROJECT_SERVICE_API] Failed to convert real image:`, error);
        }
      }
      
      const serialized = {
        id: img.id,
        name: img.name,
        thermalImageBase64,
        realImageBase64,
        thermalData
      };
      
      console.log(`[PROJECT_SERVICE_API] Image ${img.name} serialized:`, {
        hasThermalImage: !!thermalImageBase64,
        hasRealImage: !!realImageBase64,
        hasThermalData: !!thermalData
      });
      
      return serialized;
    })
  );

  const serialized = {
    id: project.id,
    name: project.name,
    operator: project.operator,
    company: project.company,
    date: project.date instanceof Date && !isNaN(project.date.getTime()) 
      ? project.date.toISOString() 
      : new Date().toISOString(),
    notes: project.notes,
    images: serializedImages,
    markers: markers.filter(m => images.some(img => img.id === m.imageId)),
    regions: regions.filter(r => images.some(img => img.id === r.imageId)),
    hasUnsavedChanges: false,
    lastModified: new Date().toISOString()
  };
  
  const jsonString = JSON.stringify(serialized);
  const sizeInMB = (jsonString.length / 1024 / 1024).toFixed(2);
  console.log(`[PROJECT_SERVICE_API] Serialization complete. Total size: ${sizeInMB} MB`);
  
  return serialized;
}

// دی‌سریالایز کردن پروژه از API
export function deserializeProject(serialized: SerializedProject): {
  project: Project;
  images: ThermalImage[];
  markers: Marker[];
  regions: Region[];
} {
  console.log('[PROJECT_SERVICE_API] Starting deserialization...');
  console.log('[PROJECT_SERVICE_API] Images to deserialize:', serialized.images.length);
  
  const images: ThermalImage[] = serialized.images.map(img => {
    console.log(`[PROJECT_SERVICE_API] Deserializing image: ${img.name}`);
    
    let thermalData = null;
    if (img.thermalData && img.thermalData.temperatureMatrixBase64) {
      console.log(`[PROJECT_SERVICE_API] Restoring thermal data for ${img.name}`);
      thermalData = {
        ...img.thermalData,
        temperatureMatrix: base64ToMatrix(
          img.thermalData.temperatureMatrixBase64,
          img.thermalData.width,
          img.thermalData.height
        )
      };
      delete (thermalData as any).temperatureMatrixBase64;
    }
    
    const thermalImage: ThermalImage = {
      id: img.id,
      name: img.name,
      thermalData: thermalData,
      realImage: img.realImageBase64 || null,
      serverRenderedThermalUrl: img.thermalImageBase64 || null
    };
    
    console.log(`[PROJECT_SERVICE_API] Image ${img.name} deserialized:`, {
      hasRealImage: !!thermalImage.realImage,
      hasThermalImage: !!thermalImage.serverRenderedThermalUrl,
      hasThermalData: !!thermalImage.thermalData
    });
    
    return thermalImage;
  });

  const project: Project = {
    id: serialized.id,
    name: serialized.name,
    operator: serialized.operator,
    company: serialized.company,
    date: new Date(serialized.date),
    notes: serialized.notes,
    images: images,
    hasUnsavedChanges: false
  };
  
  console.log('[PROJECT_SERVICE_API] Deserialization complete');
  console.log(`[PROJECT_SERVICE_API] Restored ${images.length} images, ${serialized.markers.length} markers, ${serialized.regions.length} regions`);

  return {
    project,
    images,
    markers: serialized.markers,
    regions: serialized.regions
  };
}

// ==================== Project Operations ====================

/**
 * ذخیره پروژه در بک‌اند با state persistence کامل
 * Save project to backend with complete state persistence
 */
export async function saveProjectToAPI(
  project: Project,
  images: ThermalImage[],
  markers: Marker[],
  regions: Region[],
  isNewProject: boolean = false,
  // State persistence data
  stateData?: {
    activeImageId?: string | null;
    currentPalette?: string;
    customMinTemp?: number | null;
    customMaxTemp?: number | null;
    globalParameters?: any;
    displaySettings?: any;
    windowLayout?: any;
  }
): Promise<{ success: boolean; error?: string; projectId?: string }> {
  try {
    console.log('[PROJECT_SERVICE_API] Starting project save to API...');
    console.log(`[PROJECT_SERVICE_API] Project: ${project.name}`);
    console.log(`[PROJECT_SERVICE_API] Is New Project: ${isNewProject}`);
    console.log(`[PROJECT_SERVICE_API] Images: ${images.length}`);
    console.log(`[PROJECT_SERVICE_API] Markers: ${markers.length}`);
    console.log(`[PROJECT_SERVICE_API] Regions: ${regions.length}`);

    const serialized = await serializeProject(project, images, markers, regions);

    // استفاده از bulk save API (که در واقع همان endpoint عادی save است)
    // بکند یک endpoint دارد که همه چیز را قبول می‌کند
    const projectIdToSend = isNewProject ? null : project.id;

    const result = await apiService.bulkSaveProject(
      projectIdToSend,
      {
        name: project.name,
        operator: project.operator,
        company: project.company,
        notes: project.notes
      },
      serialized.images.map(img => ({
        id: img.id,
        name: img.name,
        thermal_image_base64: img.thermalImageBase64,
        real_image_base64: img.realImageBase64,
        thermal_data_json: img.thermalData ? JSON.stringify(img.thermalData) : undefined
      })),
      serialized.markers.map(m => ({
        id: m.id,
        image_id: m.imageId,
        name: m.name || m.label,
        x: m.x,
        y: m.y,
        temperature: m.temperature,
        notes: m.notes
      })),
      serialized.regions.map(r => ({
        id: r.id,
        image_id: r.imageId,
        name: r.name || r.label,
        points: r.points,
        color: r.color,
        min_temp: r.minTemp,
        max_temp: r.maxTemp,
        avg_temp: r.avgTemp,
        notes: r.notes
      })),
      // State persistence data
      stateData ? {
        active_image_id: stateData.activeImageId || undefined,
        current_palette: stateData.currentPalette || 'iron',
        custom_min_temp: stateData.customMinTemp,
        custom_max_temp: stateData.customMaxTemp,
        global_parameters: stateData.globalParameters,
        display_settings: stateData.displaySettings,
        window_layout: stateData.windowLayout
      } : undefined
    );

    console.log('[PROJECT_SERVICE_API] Project saved successfully to API');
    console.log('[PROJECT_SERVICE_API] Returned data:', result);
    // بکند project_id را برمی‌گرداند
    const projectId = result.project?.id || result.project_id || result.id || projectIdToSend;
    return { success: true, projectId };
  } catch (error) {
    console.error('[PROJECT_SERVICE_API] Error saving project:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to save project'
    };
  }
}

/**
 * بارگذاری تمام پروژه‌ها از API
 * Load all projects from API
 */
export async function loadProjectsFromAPI(): Promise<SerializedProject[]> {
  try {
    console.log('[PROJECT_SERVICE_API] Loading projects from API...');
    const response = await apiService.listProjects();
    // بکند لیست را در response.projects برمی‌گرداند
    const projects = response.projects || [];
    console.log(`[PROJECT_SERVICE_API] Loaded ${projects.length} projects from API`);
    return projects;
  } catch (error) {
    console.error('[PROJECT_SERVICE_API] Error loading projects:', error);
    return [];
  }
}

/**
 * بارگذاری یک پروژه خاص از API با state persistence کامل
 * Load a specific project from API with complete state persistence
 */
export async function loadProjectFromAPI(projectId: string): Promise<{
  success: boolean;
  data?: {
    project: Project;
    images: ThermalImage[];
    markers: Marker[];
    regions: Region[];
    // State persistence data
    stateData?: {
      activeImageId?: string | null;
      currentPalette?: string;
      customMinTemp?: number | null;
      customMaxTemp?: number | null;
      globalParameters?: any;
      displaySettings?: any;
      windowLayout?: any;
    };
  };
  error?: string;
}> {
  try {
    console.log('[PROJECT_SERVICE_API] Loading project:', projectId);
    const response = await apiService.loadProject(projectId);
    
    // بکند پروژه را در response.project برمی‌گرداند
    const projectData = response.project || response;
    
    if (!projectData) {
      console.error('[PROJECT_SERVICE_API] Project not found:', projectId);
      return { success: false, error: 'Project not found' };
    }
    
    console.log('[PROJECT_SERVICE_API] Deserializing project data...');
    const data = deserializeProject(projectData);
    
    // Extract state persistence data from backend
    const stateData = {
      activeImageId: projectData.active_image_id || projectData.activeImageId || null,
      currentPalette: projectData.current_palette || projectData.currentPalette || 'iron',
      customMinTemp: projectData.custom_min_temp !== undefined ? projectData.custom_min_temp : (projectData.customMinTemp || null),
      customMaxTemp: projectData.custom_max_temp !== undefined ? projectData.custom_max_temp : (projectData.customMaxTemp || null),
      globalParameters: projectData.global_parameters || projectData.globalParameters || undefined,
      displaySettings: projectData.display_settings || projectData.displaySettings || undefined,
      windowLayout: projectData.window_layout || projectData.windowLayout || undefined
    };
    
    console.log('[PROJECT_SERVICE_API] Project loaded successfully');
    console.log(`[PROJECT_SERVICE_API] Images: ${data.images.length}`);
    console.log(`[PROJECT_SERVICE_API] Markers: ${data.markers.length}`);
    console.log(`[PROJECT_SERVICE_API] Regions: ${data.regions.length}`);
    console.log('[PROJECT_SERVICE_API] State data:', stateData);
    
    return { success: true, data: { ...data, stateData } };
  } catch (error) {
    console.error('[PROJECT_SERVICE_API] Error loading project:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to load project'
    };
  }
}

/**
 * حذف پروژه از API
 * Delete a project from API
 */
export async function deleteProjectFromAPI(projectId: string): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('[PROJECT_SERVICE_API] Deleting project:', projectId);
    await apiService.deleteProject(projectId);
    console.log('[PROJECT_SERVICE_API] Project deleted successfully');
    return { success: true };
  } catch (error) {
    console.error('[PROJECT_SERVICE_API] Error deleting project:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to delete project'
    };
  }
}

// ==================== Auto Save ====================

let autoSaveTimeout: NodeJS.Timeout | null = null;

/**
 * برنامه‌ریزی ذخیره خودکار با state persistence کامل
 * Schedule auto save with complete state persistence
 */
export function scheduleAutoSave(
  project: Project,
  images: ThermalImage[],
  markers: Marker[],
  regions: Region[],
  stateData?: {
    activeImageId?: string | null;
    currentPalette?: string;
    customMinTemp?: number | null;
    customMaxTemp?: number | null;
    globalParameters?: any;
    displaySettings?: any;
    windowLayout?: any;
  },
  delayMs: number = 5000
) {
  if (autoSaveTimeout) {
    clearTimeout(autoSaveTimeout);
  }
  
  autoSaveTimeout = setTimeout(async () => {
    console.log('[PROJECT_SERVICE_API] Auto-saving project...');
    const result = await saveProjectToAPI(project, images, markers, regions, false, stateData);
    if (result.success) {
      console.log('[PROJECT_SERVICE_API] Project auto-saved successfully');
    } else {
      console.error('[PROJECT_SERVICE_API] Auto-save failed:', result.error);
    }
  }, delayMs);
}

/**
 * لغو ذخیره خودکار
 * Cancel auto save
 */
export function cancelAutoSave() {
  if (autoSaveTimeout) {
    clearTimeout(autoSaveTimeout);
    autoSaveTimeout = null;
    console.log('[PROJECT_SERVICE_API] Auto-save cancelled');
  }
}