import { create } from 'zustand';
import { ThermalImage, Marker, Region, ThermalMetadata } from './thermal-utils';
import { Language } from './translations';

export interface WindowState {
  id: string;
  title: string;
  isOpen: boolean;
  position: { x: number; y: number };
  size: { width: number; height: number };
  zIndex: number;
}

export interface Project {
  id: string;
  name: string;
  operator: string;
  company: string;
  date: Date;
  notes: string;
  images: ThermalImage[];
  hasUnsavedChanges: boolean;
}

export interface AppState {
  // Language and UI
  language: Language;
  isRTL: boolean;
  
  // Project Management
  currentProject: Project | null;
  projects: Project[];
  
  // Current Image and Analysis
  activeImageId: string | null;
  images: ThermalImage[];
  markers: Marker[];
  regions: Region[];
  
  // Image Display Settings
  currentPalette: string;
  customMinTemp: number | null;
  customMaxTemp: number | null;
  zoom: number;
  panX: number;
  panY: number;
  
  // Tools and UI State
  activeTool: string;
  showGrid: boolean;
  showMarkers: boolean;
  showRegions: boolean;
  showTemperatureScale: boolean;
  
  // Window Management
  windows: WindowState[];
  nextZIndex: number;
  
  // Measurement Parameters
  globalParameters: ThermalMetadata;
  
  // Time Series
  timelineImages: ThermalImage[];
  currentTimeIndex: number;
  isPlaying: boolean;
  playbackSpeed: number;
  
  // Actions
  setLanguage: (language: Language) => void;
  setCurrentProject: (project: Project | null) => void;
  setActiveImage: (imageId: string | null) => void;
  addImage: (image: ThermalImage) => void;
  removeImage: (imageId: string) => void;
  addMarker: (marker: Marker) => void;
  updateMarker: (id: string, updates: Partial<Marker>) => void;
  removeMarker: (id: string) => void;
  addRegion: (region: Region) => void;
  updateRegion: (id: string, updates: Partial<Region>) => void;
  removeRegion: (id: string) => void;
  setPalette: (palette: string) => void;
  setTemperatureRange: (min: number | null, max: number | null) => void;
  setZoom: (zoom: number) => void;
  setPan: (x: number, y: number) => void;
  setActiveTool: (tool: string) => void;
  toggleWindow: (windowId: string) => void;
  updateWindow: (windowId: string, updates: Partial<WindowState>) => void;
  bringWindowToFront: (windowId: string) => void;
  resetLayout: () => void;
  updateGlobalParameters: (params: Partial<ThermalMetadata>) => void;
  clearAll: () => void;
}

const defaultWindows: WindowState[] = [
  {
    id: 'thermal-viewer',
    title: 'Thermal Viewer',
    isOpen: true,
    position: { x: 20, y: 60 },
    size: { width: 800, height: 600 },
    zIndex: 1
  },
  {
    id: 'real-image-viewer',
    title: 'Real Image Viewer',
    isOpen: true,
    position: { x: 840, y: 60 },
    size: { width: 600, height: 400 },
    zIndex: 2
  },
  {
    id: 'data-table',
    title: 'Data Table',
    isOpen: true,
    position: { x: 20, y: 680 },
    size: { width: 800, height: 300 },
    zIndex: 3
  },
  {
    id: 'histogram',
    title: 'Histogram',
    isOpen: true,
    position: { x: 840, y: 480 },
    size: { width: 400, height: 300 },
    zIndex: 4
  },
  {
    id: 'parameters',
    title: 'Parameters',
    isOpen: true,
    position: { x: 1260, y: 60 },
    size: { width: 300, height: 400 },
    zIndex: 5
  },
  {
    id: 'timeline',
    title: 'Timeline',
    isOpen: false,
    position: { x: 20, y: 1000 },
    size: { width: 1000, height: 200 },
    zIndex: 6
  },
  {
    id: 'reports',
    title: 'Reports',
    isOpen: false,
    position: { x: 1260, y: 480 },
    size: { width: 400, height: 500 },
    zIndex: 7
  }
];

export const useAppStore = create<AppState>((set, get) => ({
  // Initial state
  language: 'en',
  isRTL: false,
  currentProject: null,
  projects: [],
  activeImageId: null,
  images: [],
  markers: [],
  regions: [],
  currentPalette: 'iron',
  customMinTemp: null,
  customMaxTemp: null,
  zoom: 1,
  panX: 0,
  panY: 0,
  activeTool: 'cursor',
  showGrid: false,
  showMarkers: true,
  showRegions: true,
  showTemperatureScale: true,
  windows: defaultWindows,
  nextZIndex: 8,
  globalParameters: {
    emissivity: 0.95,
    ambientTemp: 20,
    reflectedTemp: 20,
    humidity: 50,
    distance: 1.0
  },
  timelineImages: [],
  currentTimeIndex: 0,
  isPlaying: false,
  playbackSpeed: 1,

  // Actions
  setLanguage: (language) => set({ 
    language, 
    isRTL: language === 'fa' 
  }),

  setCurrentProject: (project) => set({ currentProject: project }),

  setActiveImage: (imageId) => set({ activeImageId: imageId }),

  addImage: (image) => set((state) => ({
    images: [...state.images, image],
    activeImageId: image.id
  })),

  removeImage: (imageId) => set((state) => ({
    images: state.images.filter(img => img.id !== imageId),
    activeImageId: state.activeImageId === imageId ? null : state.activeImageId,
    markers: state.markers.filter(marker => marker.id !== imageId),
    regions: state.regions.filter(region => region.id !== imageId)
  })),

  addMarker: (marker) => set((state) => ({
    markers: [...state.markers, marker]
  })),

  updateMarker: (id, updates) => set((state) => ({
    markers: state.markers.map(marker =>
      marker.id === id ? { ...marker, ...updates } : marker
    )
  })),

  removeMarker: (id) => set((state) => ({
    markers: state.markers.filter(marker => marker.id !== id)
  })),

  addRegion: (region) => set((state) => ({
    regions: [...state.regions, region]
  })),

  updateRegion: (id, updates) => set((state) => ({
    regions: state.regions.map(region =>
      region.id === id ? { ...region, ...updates } : region
    )
  })),

  removeRegion: (id) => set((state) => ({
    regions: state.regions.filter(region => region.id !== id)
  })),

  setPalette: (palette) => set({ currentPalette: palette }),

  setTemperatureRange: (min, max) => set({
    customMinTemp: min,
    customMaxTemp: max
  }),

  setZoom: (zoom) => set({ zoom }),

  setPan: (x, y) => set({ panX: x, panY: y }),

  setActiveTool: (tool) => set({ activeTool: tool }),

  toggleWindow: (windowId) => set((state) => ({
    windows: state.windows.map(window =>
      window.id === windowId 
        ? { ...window, isOpen: !window.isOpen }
        : window
    )
  })),

  updateWindow: (windowId, updates) => set((state) => ({
    windows: state.windows.map(window =>
      window.id === windowId 
        ? { ...window, ...updates }
        : window
    )
  })),

  bringWindowToFront: (windowId) => set((state) => {
    const nextZ = state.nextZIndex + 1;
    return {
      windows: state.windows.map(window =>
        window.id === windowId 
          ? { ...window, zIndex: nextZ }
          : window
      ),
      nextZIndex: nextZ
    };
  }),

  resetLayout: () => set({ windows: defaultWindows, nextZIndex: 8 }),

  updateGlobalParameters: (params) => set((state) => ({
    globalParameters: { ...state.globalParameters, ...params }
  })),

  clearAll: () => set({
    markers: [],
    regions: [],
    zoom: 1,
    panX: 0,
    panY: 0,
    activeTool: 'cursor'
  })
}));