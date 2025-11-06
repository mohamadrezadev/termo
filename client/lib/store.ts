import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ThermalImage, Marker, Region, ThermalMetadata } from './thermal-utils';
import { Language } from './translations';
import { Template, TemplateData } from './template-service';
import { 
  saveProjectToStorage, 
  loadProjectFromStorage,
  scheduleAutoSave,
  deleteProjectFromStorage
} from './project-service';
import { toast } from 'sonner';

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
  markers?: Marker[];
  regions?: Region[];
  hasUnsavedChanges: boolean;
}

export interface AppState {
  // Language and UI
  language: Language;
  isRTL: boolean;
  isFullscreen: boolean;
  
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
  
  // Separate view state for thermal and real image viewers
  thermalView: {
    zoom: number;
    panX: number;
    panY: number;
  };
  realView: {
    zoom: number;
    panX: number;
    panY: number;
  };
  
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

  // Templates
  templates: Template[];

  // Actions
  setLanguage: (language: Language) => void;
  toggleFullscreen: () => void;
  setCurrentProject: (project: Project | null) => void;
  addProject: (project: Project) => void;
  removeProject: (projectId: string) => Promise<void>;
  saveCurrentProject: (project: Project) => Promise<void>;
  loadProjectById: (projectId: string) => Promise<void>;
  autoSaveProject: () => void;
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
  setThermalZoom: (zoom: number) => void;
  setThermalPan: (x: number, y: number) => void;
  setRealZoom: (zoom: number) => void;
  setRealPan: (x: number, y: number) => void;
  setActiveTool: (tool: string) => void;
  toggleWindow: (windowId: string) => void;
  updateWindow: (windowId: string, updates: Partial<WindowState>) => void;
  bringWindowToFront: (windowId: string) => void;
  resetLayout: () => void;
  updateGlobalParameters: (params: Partial<ThermalMetadata>) => void;
  clearAll: () => void;
  calculateGridLayout: () => void;
  setTemplates: (templates: Template[]) => void;
  addTemplate: (template: Template) => void;
  removeTemplate: (templateId: string) => void;
  applyTemplate: (templateData: TemplateData) => void;
  getCurrentTemplateData: () => TemplateData;
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
function calculateWindowPositions(
  windows: WindowState[], 
  containerWidth: number = 1600, 
  containerHeight: number = 900
): WindowState[] {
  const openWindows = windows.filter(w => w.isOpen);
  const { cols, rows } = calculateOptimalGrid(openWindows.length);
  
  const padding = 10;
  const headerHeight = 40;
  const availableWidth = containerWidth - (padding * (cols + 1));
  const availableHeight = containerHeight - headerHeight - (padding * (rows + 1));
  
  const windowWidth = Math.floor(availableWidth / cols);
  const windowHeight = Math.floor(availableHeight / rows);
  
  return windows.map((window) => {
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
    id: 'real-image-viewer',
    title: 'Real Image Viewer',
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

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Initial state
      language: 'en',
      isRTL: false,
      isFullscreen: false,
      currentProject: null,
      projects: [],
      activeImageId: null,
      images: [],
      markers: [],
      regions: [],
      currentPalette: 'iron',
      customMinTemp: null,
      customMaxTemp: null,
      thermalView: {
        zoom: 1,
        panX: 0,
        panY: 0
      },
      realView: {
        zoom: 1,
        panX: 0,
        panY: 0
      },
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
      templates: [],

      // Actions
      setLanguage: (language) => set({ 
        language, 
        isRTL: language === 'fa' 
      }),

      toggleFullscreen: () => set((state) => {
        const newFullscreen = !state.isFullscreen;
        if (typeof document !== 'undefined') {
          if (newFullscreen) {
            document.documentElement.requestFullscreen?.();
          } else {
            document.exitFullscreen?.();
          }
        }
        return { isFullscreen: newFullscreen };
      }),

      setCurrentProject: (project) => {
        if (project) {
          console.log('[STORE] Setting current project:', project.name);
          console.log('[STORE] Project images count:', project.images?.length);
          
          set({ 
            currentProject: project,
            images: project.images || [],
            markers: project.markers || [],
            regions: project.regions || [],
            activeImageId: project.images?.[0]?.id || null
          });
        } else {
          set({ currentProject: null });
        }
      },

      addProject: (project) => set((state) => ({
        projects: [...state.projects, project]
      })),

      removeProject: async (projectId) => {
        const result = deleteProjectFromStorage(projectId);
        if (result.success) {
          set((state) => ({
            projects: state.projects.filter(p => p.id !== projectId),
            currentProject: state.currentProject?.id === projectId ? null : state.currentProject
          }));
          toast.success('Project deleted successfully');
        } else {
          toast.error(result.error || 'Failed to delete project');
        }
      },

      saveCurrentProject: async (project) => {
        const state = get();
        
        try {
          console.log('[STORE] Saving project...', project.name);
          const result = await saveProjectToStorage(
            project,
            state.images,
            state.markers,
            state.regions
          );
          
          if (result.success) {
            const updatedProjects = state.projects.map(p => 
              p.id === project.id ? project : p
            );
            
            if (!updatedProjects.find(p => p.id === project.id)) {
              updatedProjects.push(project);
            }

            set({
              projects: updatedProjects,
              currentProject: { ...project, hasUnsavedChanges: false }
            });
            
            toast.success('Project saved successfully');
          } else {
            toast.error(result.error || 'Failed to save project');
          }
        } catch (error) {
          console.error('[STORE] Error saving project:', error);
          toast.error('Failed to save project');
        }
      },

      loadProjectById: async (projectId: string) => {
        try {
          console.log('[STORE] Loading project:', projectId);
          const result = loadProjectFromStorage(projectId);
          console.log("loadp",result)
          
          if (result.success && result.data) {
            const { project, images, markers, regions } = result.data;
            
            console.log('[STORE] Project loaded from storage');
            console.log('[STORE] Images:', images.length);
            console.log('[STORE] Markers:', markers.length);
            console.log('[STORE] Regions:', regions.length);
            
            set({
              currentProject: project,
              images: images,
              markers: markers,
              regions: regions,
              activeImageId: images[0]?.id || null
            });
            
            toast.success('Project loaded successfully');
          } else {
            toast.error(result.error || 'Failed to load project');
          }
        } catch (error) {
          console.error('[STORE] Error loading project:', error);
          toast.error('Failed to load project');
        }
      },

      autoSaveProject: () => {
        const state = get();
        if (state.currentProject) {
          console.log('[STORE] Scheduling auto-save...');
          scheduleAutoSave(
            state.currentProject,
            state.images,
            state.markers,
            state.regions
          );
        }
      },

      setActiveImage: (imageId) => set({ activeImageId: imageId }),

      addImage: (image) => {
        const state = get();
        console.log('[STORE] Adding image:', image.name);
        const newImages = [...state.images, image];
        const updatedProject = state.currentProject ? {
          ...state.currentProject,
          images: newImages,
          hasUnsavedChanges: true
        } : null;

        set({
          images: newImages,
          activeImageId: image.id,
          currentProject: updatedProject
        });
        
        // Auto-save after adding image
        if (updatedProject) {
          scheduleAutoSave(updatedProject, newImages, state.markers, state.regions);
        }
      },

      removeImage: (imageId) => {
        const state = get();
        const newImages = state.images.filter(img => img.id !== imageId);
        const updatedProject = state.currentProject ? {
          ...state.currentProject,
          images: newImages,
          hasUnsavedChanges: true
        } : null;

        set({
          images: newImages,
          activeImageId: state.activeImageId === imageId ? null : state.activeImageId,
          markers: state.markers.filter(marker => marker.imageId !== imageId),
          regions: state.regions.filter(region => region.imageId !== imageId),
          currentProject: updatedProject
        });
        
        if (updatedProject) {
          scheduleAutoSave(updatedProject, newImages, state.markers, state.regions);
        }
      },

      addMarker: (marker) => {
        const state = get();
        const newMarkers = [...state.markers, marker];
        const updatedProject = state.currentProject ? {
          ...state.currentProject,
          markers: newMarkers,
          hasUnsavedChanges: true
        } : null;

        set({
          markers: newMarkers,
          currentProject: updatedProject
        });
        
        if (updatedProject) {
          scheduleAutoSave(updatedProject, state.images, newMarkers, state.regions);
        }
      },

      updateMarker: (id, updates) => set((state) => ({
        markers: state.markers.map(marker =>
          marker.id === id ? { ...marker, ...updates } : marker
        )
      })),

      removeMarker: (id) => set((state) => ({
        markers: state.markers.filter(marker => marker.id !== id)
      })),

      addRegion: (region) => {
        const state = get();
        const newRegions = [...state.regions, region];
        const updatedProject = state.currentProject ? {
          ...state.currentProject,
          regions: newRegions,
          hasUnsavedChanges: true
        } : null;

        set({
          regions: newRegions,
          currentProject: updatedProject
        });
        
        if (updatedProject) {
          scheduleAutoSave(updatedProject, state.images, state.markers, newRegions);
        }
      },

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

      setThermalZoom: (zoom) => set((state) => ({
        thermalView: { ...state.thermalView, zoom }
      })),

      setThermalPan: (x, y) => set((state) => ({
        thermalView: { ...state.thermalView, panX: x, panY: y }
      })),

      setRealZoom: (zoom) => set((state) => ({
        realView: { ...state.realView, zoom }
      })),

      setRealPan: (x, y) => set((state) => ({
        realView: { ...state.realView, panX: x, panY: y }
      })),

      setActiveTool: (tool) => set({ activeTool: tool }),

      toggleWindow: (windowId) => set((state) => {
        const updatedWindows = state.windows.map(window =>
          window.id === windowId 
            ? { ...window, isOpen: !window.isOpen }
            : window
        );
        
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

      resetLayout: () => set(() => {
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
        thermalView: {
          zoom: 1,
          panX: 0,
          panY: 0
        },
        realView: {
          zoom: 1,
          panX: 0,
          panY: 0
        },
        activeTool: 'cursor'
      }),

      setTemplates: (templates) => set({ templates }),

      addTemplate: (template) => set((state) => ({
        templates: [template, ...state.templates]
      })),

      removeTemplate: (templateId) => set((state) => ({
        templates: state.templates.filter(t => t.id !== templateId)
      })),

      applyTemplate: (templateData) => set(() => {
        const { globalParameters, displaySettings, windowLayout } = templateData;

        return {
          globalParameters,
          currentPalette: displaySettings.currentPalette,
          customMinTemp: displaySettings.customMinTemp,
          customMaxTemp: displaySettings.customMaxTemp,
          thermalView: displaySettings.thermalView,
          realView: displaySettings.realView,
          showGrid: displaySettings.showGrid,
          showMarkers: displaySettings.showMarkers,
          showRegions: displaySettings.showRegions,
          showTemperatureScale: displaySettings.showTemperatureScale,
          windows: windowLayout.windows,
          gridCols: windowLayout.gridCols,
          gridRows: windowLayout.gridRows
        };
      }),

      getCurrentTemplateData: (): TemplateData => {
        const state = get();
        return {
          globalParameters: state.globalParameters,
          displaySettings: {
            currentPalette: state.currentPalette,
            customMinTemp: state.customMinTemp,
            customMaxTemp: state.customMaxTemp,
            thermalView: state.thermalView,
            realView: state.realView,
            showGrid: state.showGrid,
            showMarkers: state.showMarkers,
            showRegions: state.showRegions,
            showTemperatureScale: state.showTemperatureScale
          },
          windowLayout: {
            windows: state.windows,
            gridCols: state.gridCols,
            gridRows: state.gridRows
          }
        };
      }
    }),
    {
      name: 'thermal-analyzer-storage',
      partialize: (state) => ({
        language: state.language,
        projects: state.projects.map(p => ({
          ...p,
          // Don't store full image data in Zustand persist
          images: p.images.map(img => ({ id: img.id, name: img.name } as any))
        })),
        globalParameters: state.globalParameters,
        currentPalette: state.currentPalette,
        windows: state.windows
      })
    }
  )
);