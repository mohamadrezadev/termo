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
  gridPosition?: { row: number; col: number };
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
  gridCols: number;
  gridRows: number;
  
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
  calculateGridLayout: () => void;
}

// Grid layout calculation function
function calculateOptimalGrid(windowCount: number): { cols: number; rows: number } {
  if (windowCount <= 0) return { cols: 1, rows: 1 };
  if (windowCount === 1) return { cols: 1, rows: 1 };
  if (windowCount === 2) return { cols: 2, rows: 1 };
  if (windowCount <= 4) return { cols: 2, rows: 2 };
  if (windowCount <= 6) return { cols: 3, rows: 2 };
  if (windowCount <= 9) return { cols: 3, rows: 3 };
  return { cols: 4, rows: Math.ceil(windowCount / 4) };
}

// Calculate window positions based on grid
function calculateWindowPositions(windows: WindowState[], containerWidth: number = 1600, containerHeight: number = 900): WindowState[] {
  const openWindows = windows.filter(w => w.isOpen);
  const { cols, rows } = calculateOptimalGrid(openWindows.length);
  
  const padding = 10;
  const headerHeight = 40; // Top menu bar height
  const availableWidth = containerWidth - (padding * (cols + 1));
  const availableHeight = containerHeight - headerHeight - (padding * (rows + 1));
  
  const windowWidth = Math.floor(availableWidth / cols);
  const windowHeight = Math.floor(availableHeight / rows);
  
  return windows.map((window, index) => {
    if (!window.isOpen) return window;
    
    const openIndex = openWindows.findIndex(w => w.id === window.id);
    const row = Math.floor(openIndex / cols);
    const col = openIndex % cols;
    
    const x = padding + (col * (windowWidth + padding));
    const y = headerHeight + padding + (row * (windowHeight + padding));
    
    return {
      ...window,
      position: { x, y },
      size: { 
        width: Math.max(windowWidth, window.id === 'thermal-viewer' ? 600 : 300), 
        height: Math.max(windowHeight, window.id === 'data-table' ? 200 : 250) 
      },
      gridPosition: { row, col }
    };
  });
}

const defaultWindows: WindowState[] = [
  {
    id: 'thermal-viewer',
    title: 'Thermal Viewer',
    isOpen: true,
    position: { x: 10, y: 50 },
    size: { width: 600, height: 400 },
    zIndex: 1
  },
  {
    id: 'rgb-image-viewer',
    title: 'RGB Image Viewer',
    isOpen: true,
    position: { x: 620, y: 50 },
    size: { width: 500, height: 400 },
    zIndex: 2
  },
  {
    id: 'parameters',
    title: 'Parameters',
    isOpen: true,
    position: { x: 1130, y: 50 },
    size: { width: 300, height: 400 },
    zIndex: 3
  },
  {
    id: 'histogram',
    title: 'Histogram',
    isOpen: true,
    position: { x: 10, y: 460 },
    size: { width: 400, height: 300 },
    zIndex: 4
  },
  {
    id: 'data-table',
    title: 'Data Table',
    isOpen: true,
    position: { x: 420, y: 460 },
    size: { width: 700, height: 300 },
    zIndex: 5
  },
  {
    id: 'timeline',
    title: 'Timeline',
    isOpen: false,
    position: { x: 10, y: 770 },
    size: { width: 800, height: 150 },
    zIndex: 6
  },
  {
    id: 'reports',
    title: 'Reports',
    isOpen: false,
    position: { x: 1130, y: 460 },
    size: { width: 300, height: 300 },
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
  windows: calculateWindowPositions(defaultWindows),
  nextZIndex: 8,
  gridCols: 3,
  gridRows: 2,
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

  toggleWindow: (windowId) => set((state) => {
    const updatedWindows = state.windows.map(window =>
      window.id === windowId 
        ? { ...window, isOpen: !window.isOpen }
        : window
    );
    
    // Recalculate grid layout after toggling
    const gridLayoutWindows = calculateWindowPositions(updatedWindows);
    
    return { windows: gridLayoutWindows };
  }),

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

  resetLayout: () => set((state) => {
    const resetWindows = calculateWindowPositions(defaultWindows);
    return { 
      windows: resetWindows, 
      nextZIndex: 8 
    };
  }),

  calculateGridLayout: () => set((state) => {
    const gridLayoutWindows = calculateWindowPositions(state.windows);
    return { windows: gridLayoutWindows };
  }),

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