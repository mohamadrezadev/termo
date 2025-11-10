// lib/project-service.ts
import { Project } from './store';
import { 
  fetchProjects, 
  fetchProjectById, 
  createProject, 
  updateProject, 
  deleteProject,
  ProjectResponse,
  ProjectDetailResponse,
  ProjectCreate,
  ProjectUpdate
} from './api-service';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';
import { ThermalImage, Marker, Region } from './thermal-utils';

// const PROJECTS_STORAGE_KEY = 'thermal_analyzer_projects';
// const CURRENT_PROJECT_KEY = 'thermal_analyzer_current_project';

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

// تبدیل ماتریس دما به base64
function matrixToBase64(matrix: number[][]): string {
  const flat = matrix.flat();
  const buffer = new Float32Array(flat);
  const bytes = new Uint8Array(buffer.buffer);
  return btoa(String.fromCharCode(...bytes));
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
    console.log(`[PROJECT_SERVICE] Converting URL to base64: ${url.substring(0, 100)}...`);
    
    // اگر از قبل base64 است
    if (url.startsWith('data:')) {
      console.log('[PROJECT_SERVICE] URL is already base64');
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
    console.log(`[PROJECT_SERVICE] Blob size: ${(blob.size / 1024).toFixed(2)} KB`);

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        console.log(`[PROJECT_SERVICE] Base64 conversion complete: ${(result.length / 1024).toFixed(2)} KB`);
        resolve(result);
      };
      reader.onerror = () => {
        console.error('[PROJECT_SERVICE] FileReader error:', reader.error);
        reject(reader.error);
      };
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('[PROJECT_SERVICE] Error converting URL to base64:', error);
    throw error;
  }
}

// ذخیره تصویر Canvas به base64
function canvasToBase64(canvas: HTMLCanvasElement): string {
  try {
    return canvas.toDataURL('image/png');
  } catch (error) {
    console.error('[PROJECT_SERVICE] Error converting canvas to base64:', error);
    throw error;
  }
}

// --- API-based Project Management Functions ---

export async function loadAllProjects(): Promise<ProjectResponse[]> {
  try {
    return await fetchProjects();
  } catch (error) {
    console.error('Failed to load projects from API:', error);
    // Fallback to local storage if API fails, or just return empty array
    return [];
  }
}

export asexport function loadProjectFromStorage(projectId: string): {
  project: Project;
  images: ThermalImage[];
  markers: Marker[];
  regions: Region[];
} | null {  try {
    const apiProject = await fetchProjectById(projectId);
    return deserializeProjectFromApi(apiProject);
  } catch (error) {
    console.error(`Failed to load project ${projectId} from API:`, error);
    return null;
  }
}

export async function saveProject(
  project: Project,
  images: ThermalImage[],
  markers: Marker[],
  regions: Region[]
): Promise<{ success: boolean; error?: string; project?: ProjectResponse }> {
  try {
    const projectData = await serializeProjectForApi(project, images, markers, regions);
    let apiProject: ProjectResponse;

    if (project.id) {
      // Update existing project
      apiProject = await updateProject(project.id, projectData as ProjectUpdate);
      toast.success('Project updated successfully');
    } else {
      // Create new project
      // Note: API should handle ID generation, but we pass one for consistency if needed
      const newProjectData = { ...projectData as ProjectCreate, id: uuidv4() }; 
      apiProject = await createProject(newProjectData);
      toast.success('Project created successfully');
    }

    return { success: true, project: apiProject };
  } catch (error) {
    console.error('Failed to save project to API:', error);
    return { success: false, error: (error as Error).message };
  }
}

export async function deleteProjectFromBackend(projectId: string): Promise<{ success: boolean; error?: string }> {
  try {
    await deleteProject(projectId);
    toast.success('Project deleted successfully');
    return { success: true };
  } catch (error) {
    console.error(`Failed to delete project ${projectId} from API:`, error);
    return { success: false, error: (error as Error).message };
  }
}

// Deserialization from API response to client store format
export function deserializeProjectFromApi(
  apiProject: ProjectResponse | ProjectDetailResponse
): {
  project: Project;
  images: ThermalImage[];
  markers: Marker[];
  regions: Region[];
} {
  // This is a placeholder. The actual implementation depends on the API response structure.
  // Assuming the API response is a flat project object for now.
  
  const project: Project = {
    id: apiProject.id,
    name: apiProject.name,
    operator: apiProject.operator,
    company: apiProject.company,
    date: new Date(apiProject.date),
    notes: apiProject.notes,
    images: [], // Images will be fetched/managed separately
    hasUnsavedChanges: false
  };
  
  // For ProjectDetailResponse, we would extract images, markers, regions here.
  // Since we don't have the full schema, we'll leave them empty for now.
  const images: ThermalImage[] = [];
  const markers: Marker[] = [];
  const regions: Region[] = [];

  return {
    project,
    images,
    markers,
    regions
  };
}

export async function serializeProjectForApi(
  project: Project,
  images: ThermalImage[],
  markers: Marker[],
  regions: Region[]
): Promise<ProjectCreate | ProjectUpdate> {
  // This is a placeholder. The actual implementation depends on what the API expects.
  // Assuming the API expects only project metadata for creation/update.
  // Image, marker, and region handling will require separate API calls.
  
  const projectData = {
    name: project.name,
    operator: project.operator,
    company: project.company,
    date: project.date.toISOString(),
    notes: project.notes,
  };

  return projectData;
}

// --- Old Local Storage Functions (Commented out) ---

/*
// سریالایز کردن پروژه برای ذخیره
export async function serializeProject(
  project: Project,
  images: ThermalImage[],
  regions: Region[]
): Promise<SerializedProject> {
  console.log('[PROJECT_SERVICE] Starting serialization...');
  console.log('[PROJECT_SERVICE] Images to serialize:', images.length);
  
  const serializedImages: SerializedImage[] = await Promise.all(
    images.map(async (img) => {
      console.log(`[PROJECT_SERVICE] Processing image: ${img.name}`);
      
      let thermalImageBase64: string | undefined;
      let realImageBase64: string | undefined;
      let thermalData: SerializedImage['thermalData'];
      
      // ذخیره داده‌های حرارتی
      if (img.thermalData) {
        console.log(`[PROJECT_SERVICE] Saving thermal data for ${img.name}`);
        thermalData = {
          width: img.thermalData.width,
          height: img.thermalData.height,
          minTemp: img.thermalData.minTemp,
          maxTemp: img.thermalData.maxTemp,
          metadata: img.thermalData.metadata,
          temperatureMatrixBase64: matrixToBase64(img.thermalData.temperatureMatrix)
        };
        console.log(`[PROJECT_SERVICE] Thermal data size: ${thermalData.temperatureMatrixBase64.length} bytes`);
      }
      
      // ذخیره تصویر حرارتی رندر شده از سرور
      if (img.serverRenderedThermalUrl) {
        try {
          console.log(`[PROJECT_SERVICE] Converting thermal image: ${img.serverRenderedThermalUrl.substring(0, 100)}...`);
          thermalImageBase64 = await urlToBase64(img.serverRenderedThermalUrl);
          console.log(`[PROJECT_SERVICE] Thermal image saved: ${(thermalImageBase64.length / 1024).toFixed(2)} KB`);
        } catch (error) {
          console.error(`[PROJECT_SERVICE] Failed to convert thermal image:`, error);
        }
      }
      
      // اگر canvas موجود است، از آن استفاده کن
      if (!thermalImageBase64 && img.canvas) {
        try {
          console.log(`[PROJECT_SERVICE] Converting canvas to base64 for ${img.name}`);
          thermalImageBase64 = canvasToBase64(img.canvas);
          console.log(`[PROJECT_SERVICE] Canvas converted: ${(thermalImageBase64.length / 1024).toFixed(2)} KB`);
        } catch (error) {
          console.error(`[PROJECT_SERVICE] Failed to convert canvas:`, error);
        }
      }
      
      // ذخیره تصویر واقعی
      if (img.realImage) {
        try {
          console.log(`[PROJECT_SERVICE] Converting real image for ${img.name}`);
          realImageBase64 = await urlToBase64(img.realImage);
          console.log(`[PROJECT_SERVICE] Real image saved: ${(realImageBase64.length / 1024).toFixed(2)} KB`);
        } catch (error) {
          console.error(`[PROJECT_SERVICE] Failed to convert real image:`, error);
        }
      }
      
      const serialized = {
        id: img.id,
        name: img.name,
        thermalImageBase64,
        realImageBase64,
        thermalData
      };
      
      console.log(`[PROJECT_SERVICE] Image ${img.name} serialized:`, {
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
    date: project.date.toISOString(),
    notes: project.notes,
    images: serializedImages,
    markers: markers.filter(m => images.some(img => img.id === m.imageId)),
    regions: regions.filter(r => images.some(img => img.id === r.imageId)),
    hasUnsavedChanges: false,
    lastModified: new Date().toISOString()
  };
  
  // محاسبه حجم کل
  const jsonString = JSON.stringify(serialized);
  const sizeInMB = (jsonString.length / 1024 / 1024).toFixed(2);
  console.log(`[PROJECT_SERVICE] Serialization complete. Total size: ${sizeInMB} MB`);
  
  return serialized;
}

// دی‌سریالایز کردن پروژه از ذخیره
export function deserializeProject(serialized: SerializedProject): {
  project: Project;
  images: ThermalImage[];
  markers: Marker[];
  regions: Region[];
} {
  console.log('[PROJECT_SERVICE] Starting deserialization...');
  console.log('[PROJECT_SERVICE] Images to deserialize:', serialized.images.length);
  
  const images: ThermalImage[] = serialized.images.map(img => {
    console.log(`[PROJECT_SERVICE] Deserializing image: ${img.name}`);
    
    let thermalData = null;
    if (img.thermalData && img.thermalData.temperatureMatrixBase64) {
      console.log(`[PROJECT_SERVICE] Restoring thermal data for ${img.name}`);
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
    
    console.log(`[PROJECT_SERVICE] Image ${img.name} deserialized:`, {
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
  
  console.log('[PROJECT_SERVICE] Deserialization complete');
  console.log(`[PROJECT_SERVICE] Restored ${images.length} images, ${serialized.markers.length} markers, ${serialized.regions.length} regions`);

  return {
    project,
    images,
    markers: serialized.markers,
    regions: serialized.regions
  };
}

// ذخیره پروژه در localStorage
export async function saveProjectToStorage(
  project: Project,
  images: ThermalImage[],
  markers: Marker[],
  regions: Region[]
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('[PROJECT_SERVICE] Starting project save...');
    console.log(`[PROJECT_SERVICE] Project: ${project.name}`);
    console.log(`[PROJECT_SERVICE] Images: ${images.length}`);
    console.log(`[PROJECT_SERVICE] Markers: ${markers.length}`);
    console.log(`[PROJECT_SERVICE] Regions: ${regions.length}`);
    
    const serialized = await serializeProject(project, images, markers, regions);
    
    // دریافت پروژه‌های موجود
    const projects = loadProjectsFromStorage();
    
    // به‌روزرسانی یا اضافه کردن پروژه
    const existingIndex = projects.findIndex(p => p.id === project.id);
    if (existingIndex >= 0) {
      projects[existingIndex] = serialized;
      console.log('[PROJECT_SERVICE] Updated existing project');
    } else {
      projects.push(serialized);
      console.log('[PROJECT_SERVICE] Added new project');
    }
    
    // ذخیره در localStorage
    const jsonString = JSON.stringify(projects);
    const sizeInMB = (jsonString.length / 1024 / 1024).toFixed(2);
    console.log(`[PROJECT_SERVICE] Total storage size: ${sizeInMB} MB`);
    
    // بررسی محدودیت حجم (معمولاً 5-10 MB)
    if (jsonString.length > 5 * 1024 * 1024) {
      console.warn('[PROJECT_SERVICE] Warning: Storage size exceeds 5MB, might fail in some browsers');
    }
    
    localStorage.setItem(PROJECTS_STORAGE_KEY, jsonString);
    localStorage.setItem(CURRENT_PROJECT_KEY, project.id);
    
    console.log('[PROJECT_SERVICE] Project saved successfully to localStorage');
    return { success: true };
  } catch (error) {
    console.error('[PROJECT_SERVICE] Error saving project:', error);
    
    // بررسی خطای QuotaExceededError
    if (error instanceof Error && error.name === 'QuotaExceededError') {
      return {
        success: false,
        error: 'Storage quota exceeded. Please delete some old projects or reduce image quality.'
      };
    }
    
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to save project'
    };
  }
}

// بارگذاری تمام پروژه‌ها از localStorage
export function loadProjectsFromStorage(): SerializedProject[] {
  try {
    const stored = localStorage.getItem(PROJECTS_STORAGE_KEY);
    if (!stored) {
      console.log('[PROJECT_SERVICE] No projects found in storage');
      return [];
    }
    
    const projects = JSON.parse(stored);
    console.log(projects)
    console.log(`[PROJECT_SERVICE] Loaded ${projects.length} projects from storage`);
    return projects;
  } catch (error) {
    console.error('[PROJECT_SERVICE] Error loading projects:', error);
    return [];
  }
}

// بارگذاری یک پروژه خاص
export function loadProjectFromStorage(projectId: string): {
  success: boolean;
  data?: {
    project: Project;
    images: ThermalImage[];
    markers: Marker[];
    regions: Region[];
  };
  error?: string;
} {
  try {
    console.log('[PROJECT_SERVICE] Loading project:', projectId);
    const projects = loadProjectsFromStorage();
    const serialized = projects.find(p => p.id === projectId);
    
    if (!serialized) {
      console.error('[PROJECT_SERVICE] Project not found:', projectId);
      return { success: false, error: 'Project not found' };
    }
    
    console.log('[PROJECT_SERVICE] Deserializing project data...');
    const data = deserializeProject(serialized);
    localStorage.setItem(CURRENT_PROJECT_KEY, projectId);
    
    console.log('[PROJECT_SERVICE] Project loaded successfully');
    console.log(`[PROJECT_SERVICE] Images: ${data.images.length}`);
    console.log(`[PROJECT_SERVICE] Markers: ${data.markers.length}`);
    console.log(`[PROJECT_SERVICE] Regions: ${data.regions.length}`);
    
    return { success: true, data };
  } catch (error) {
    console.error('[PROJECT_SERVICE] Error loading project:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to load project'
    };
  }
}

// حذف پروژه
export function deleteProjectFromStorage(projectId: string): { success: boolean; error?: string } {
  try {
    console.log('[PROJECT_SERVICE] Deleting project:', projectId);
    const projects = loadProjectsFromStorage();
    const filtered = projects.filter(p => p.id !== projectId);
    
    if (filtered.length === projects.length) {
      console.warn('[PROJECT_SERVICE] Project not found for deletion:', projectId);
    }
    
    localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(filtered));
    
    const currentProjectId = localStorage.getItem(CURRENT_PROJECT_KEY);
    if (currentProjectId === projectId) {
      localStorage.removeItem(CURRENT_PROJECT_KEY);
      console.log('[PROJECT_SERVICE] Removed current project reference');
    }
    
    console.log('[PROJECT_SERVICE] Project deleted successfully');
    return { success: true };
  } catch (error) {
    console.error('[PROJECT_SERVICE] Error deleting project:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to delete project'
    };
  }
}

// دریافت شناسه پروژه فعلی
export function getCurrentProjectId(): string | null {
  return localStorage.getItem(CURRENT_PROJECT_KEY);
}

// ذخیره خودکار
let autoSaveTimeout: NodeJS.Timeout | null = null;
export function scheduleAutoSave(store: any) {Project,
  images: ThermalImage[],
  markers: Marker[],
  regions: Region[],
  delayMs: number = 5000
) {
  if (autoSaveTimeout) {
    clearTimeout(autoSaveTimeout);
  }
  
  autoSaveTimeout = setTimeout(async () => {
    console.log('[PROJECT_SERVICE] Auto-saving project...');
    const result = await saveProjectToStorage(project, images, markers, regions);
    if (result.success) {
      console.log('[PROJECT_SERVICE] Project auto-saved successfully');
    } else {
      console.error('[PROJECT_SERVICE] Auto-save failed:', result.error);
    }
  }, delayMs);
}

// بررسی حجم ذخیره‌سازی
export function getStorageSize(): { 
  used: string; 
  available: string; 
  percentage: number;
  projects: Array<{ name: string; size: string }>;
} {
  let totalUsed = 0;
  const projectSizes: Array<{ name: string; size: string }> = [];
  
  // محاسبه حجم تمام پروژه‌ها
  const projects = loadProjectsFromStorage();
  projects.forEach(project => {
    const size = JSON.stringify(project).length;
    totalUsed += size;
    projectSizes.push({
      name: project.name,
      size: `${(size / 1024 / 1024).toFixed(2)} MB`
    });
  });
  
  // محاسبه حجم کل localStorage
  for (let key in localStorage) {
    if (localStorage.hasOwnProperty(key) && key !== PROJECTS_STORAGE_KEY) {
      totalUsed += localStorage[key].length + key.length;
    }
  }
  
  const maxSize = 5 * 1024 * 1024; // 5MB محدودیت معمول
  const usedMB = (totalUsed / 1024 / 1024).toFixed(2);
  const availableMB = ((maxSize - totalUsed) / 1024 / 1024).toFixed(2);
  const percentage = Math.round((totalUsed / maxSize) * 100);
  
  return {
    used: `${usedMB} MB`,
    available: `${availableMB} MB`,
    percentage,
    projects: projectSizes
  };
}