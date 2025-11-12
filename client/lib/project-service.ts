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

// The local storage keys are no longer used for saving, but kept for potential migration logic.
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

// The following utility functions (matrixToBase64, base64ToMatrix, urlToBase64, canvasToBase64) 
// are likely still needed for image/data processing on the client side, even with API integration.
// I will keep them as they were in the original file.

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


export async function loadProjectById(projectId: string): Promise<{

  project: Project;
  images: ThermalImage[];
  markers: Marker[];
  regions: Region[];
} | null> {  
  try {
    const apiProject = await fetchProjectById(projectId);
    console.log('[PROJECT_SERVICE] Loaded project from API:', apiProject);
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
      // The backend's `create_project` endpoint generates the ID, so we don't need to pass one.
      const newProjectData = projectData as ProjectCreate; 
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

// --- Old Local Storage Functions (Removed)
// All local storage functions have been removed.
