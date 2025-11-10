// lib/api-service.ts
import { Project, ProjectResponse, ProjectDetailResponse, ProjectCreate, ProjectUpdate } from './types'; // Assuming types are defined or imported
import { toast } from 'sonner';

// The base URL for the backend API.
// We assume the backend runs on port 8000 for local development.
const API_BASE_URL = 'http://localhost:8000';

// Helper function for API calls
async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const defaultHeaders = {
    'Content-Type': 'application/json',
  };

  const response = await fetch(url, {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
    const errorMessage = errorData.detail || `API call failed with status ${response.status}`;
    toast.error(errorMessage);
    throw new Error(errorMessage);
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return null as T;
  }

  return response.json() as Promise<T>;
}

// --- Project API Calls ---

export async function fetchProjects(): Promise<ProjectResponse[]> {
  return apiFetch<ProjectResponse[]>('/projects');
}

export async function fetchProjectById(projectId: string): Promise<ProjectDetailResponse> {
  return apiFetch<ProjectDetailResponse>(`/project/${projectId}`);
}

export async function createProject(projectData: ProjectCreate): Promise<ProjectResponse> {
  return apiFetch<ProjectResponse>('/project/', {
    method: 'POST',
    body: JSON.stringify(projectData),
  });
}

export async function updateProject(projectId: string, projectData: ProjectUpdate): Promise<ProjectResponse> {
  return apiFetch<ProjectResponse>(`/project/${projectId}`, {
    method: 'PATCH',
    body: JSON.stringify(projectData),
  });
}

export async function deleteProject(projectId: string): Promise<void> {
  return apiFetch<void>(`/project/${projectId}`, {
    method: 'DELETE',
  });
}

// --- Other API Calls (Thermal, Markers, Regions) will be added as needed ---

export async function uploadFiles(projectId: string, thermalFile: File, visualFile: File): Promise<{ thermal_path: string, visual_path: string }> {
  const formData = new FormData();
  formData.append('thermal', thermalFile);
  formData.append('visual', visualFile);

  const response = await fetch(`${API_BASE_URL}/upload/${projectId}`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
    const errorMessage = errorData.detail || `File upload failed with status ${response.status}`;
    toast.error(errorMessage);
    throw new Error(errorMessage);
  }

  return response.json();
}

export async function checkHealth(): Promise<{ status: string, service: string }> {
  return apiFetch<{ status: string, service: string }>('/health/status');
}

// Placeholder for types based on backend analysis
export interface ProjectResponse {
  id: string;
  name: string;
  operator: string;
  company: string;
  date: string; // ISO string
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectDetailResponse extends ProjectResponse {
  // Add related data fields like images, markers, regions when schemas are known
}

export interface ProjectCreate {
  name: string;
  operator: string;
  company: string;
  date: string; // ISO string
  notes: string;
}

export interface ProjectUpdate extends Partial<ProjectCreate> {}
