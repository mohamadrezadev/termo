/**
 * API Response Types
 * Type-safe interfaces for all API endpoints
 */

import { ThermalImage, Marker, Region, ThermalMetadata } from './thermal-utils';

// ============== Project Types ==============

export interface ProjectPayload {
  id: string;
  name: string;
  description?: string;
  operator?: string;
  company?: string;
  images?: ThermalImage[];
  markers?: Marker[];
  regions?: Region[];
  activeImageId?: string | null;
  currentPalette?: string;
  customMinTemp?: number | null;
  customMaxTemp?: number | null;
  parameters?: ThermalMetadata;
}

export interface ProjectListItem {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectDetailResponse {
  id: string;
  name: string;
  description: string | null;
  operator?: string;
  company?: string;
  createdAt: string;
  updatedAt: string;
  images: ThermalImage[];
  markers: Marker[];
  regions: Region[];
  activeImageId?: string | null;
  currentPalette?: string;
  customMinTemp?: number | null;
  customMaxTemp?: number | null;
  parameters?: ThermalMetadata;
}

// ============== API Response Wrappers ==============

export interface SaveProjectResponse {
  status: string;
  message: string;
  project_id: string;
}

export interface LoadProjectResponse {
  status: string;
  project: ProjectDetailResponse;
}

export interface ListProjectsResponse {
  status: string;
  projects: ProjectListItem[];
  count: number;
}

export interface DeleteProjectResponse {
  status: string;
  message: string;
}

// ============== Thermal Image Upload ==============

export interface ThermalImageUploadResponse {
  status: string;
  message: string;
  images?: ThermalImageData[];
  validation?: ValidationResult;
}

export interface ThermalImageData {
  type: 'thermal' | 'real';
  url: string;
  palettes?: Record<string, string>;
  csv_url?: string;
  metadata?: ThermalImageMetadata;
}

export interface ThermalImageMetadata {
  emissivity?: number;
  reflected_temp?: number;
  humidity?: number;
  device?: string;
  captured_at?: string;
  min_temp?: number;
  max_temp?: number;
  avg_temp?: number;
}

export interface ValidationResult {
  has_thermal: boolean;
  has_visual: boolean;
  has_csv: boolean;
  has_json: boolean;
  errors: string[];
}

// ============== Error Response ==============

export interface ErrorResponse {
  detail: string;
  status?: number;
  timestamp?: string;
}

// ============== Health Check ==============

export interface HealthResponse {
  status: string;
  app?: string;
  version?: string;
}
