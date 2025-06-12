export interface ThermalData {
  width: number;
  height: number;
  temperatureMatrix: number[][];
  minTemp: number;
  maxTemp: number;
  metadata: ThermalMetadata;
}

export interface ThermalMetadata {
  emissivity: number;
  ambientTemp: number;
  reflectedTemp: number;
  humidity: number;
  distance: number;
  cameraModel?: string;
  timestamp?: Date;
}

export interface ThermalImage {
  id: string;
  name: string;
  thermalData: ThermalData | null;
  rgbImage: string | null; // base64 or URL
  canvas?: HTMLCanvasElement;
}

export interface Marker {
  id: string;
  type: 'point' | 'hotspot' | 'coldspot';
  x: number;
  y: number;
  temperature: number;
  label: string;
  emissivity: number;
}

export interface Region {
  id: string;
  type: 'rectangle' | 'circle' | 'polygon' | 'line';
  points: { x: number; y: number }[];
  minTemp: number;
  maxTemp: number;
  avgTemp: number;
  area?: number;
  label: string;
  emissivity: number;
}

export interface ColorPalette {
  name: string;
  colors: string[];
}

export const COLOR_PALETTES: Record<string, ColorPalette> = {
  iron: {
    name: 'Iron',
    colors: ['#000000', '#440154', '#721f81', '#b73779', '#f1605d', '#feb078', '#fcfdbf']
  },
  rainbow: {
    name: 'Rainbow',
    colors: ['#0000ff', '#00ffff', '#00ff00', '#ffff00', '#ff8000', '#ff0000', '#ffffff']
  },
  grayscale: {
    name: 'Grayscale',
    colors: ['#000000', '#404040', '#808080', '#c0c0c0', '#ffffff']
  },
  sepia: {
    name: 'Sepia',
    colors: ['#2d1b0e', '#6b4423', '#a0673a', '#d4a574', '#f5deb3']
  },
  medical: {
    name: 'Medical',
    colors: ['#000080', '#0040c0', '#0080ff', '#40c0ff', '#80ffff', '#c0ffff', '#ffffff']
  },
  coldHot: {
    name: 'Cold/Hot',
    colors: ['#0000ff', '#8080ff', '#ffffff', '#ff8080', '#ff0000']
  }
};

export function interpolateColor(value: number, min: number, max: number, palette: ColorPalette): string {
  if (max === min) return palette.colors[0];
  
  const normalized = Math.max(0, Math.min(1, (value - min) / (max - min)));
  const index = normalized * (palette.colors.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  
  if (lower === upper) return palette.colors[lower];
  
  const factor = index - lower;
  const colorLower = hexToRgb(palette.colors[lower]);
  const colorUpper = hexToRgb(palette.colors[upper]);
  
  if (!colorLower || !colorUpper) return palette.colors[0];
  
  const r = Math.round(colorLower.r + factor * (colorUpper.r - colorLower.r));
  const g = Math.round(colorLower.g + factor * (colorUpper.g - colorLower.g));
  const b = Math.round(colorLower.b + factor * (colorUpper.b - colorLower.b));
  
  return `rgb(${r}, ${g}, ${b})`;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

export function extractThermalData(file: File): Promise<ThermalImage> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const result = e.target?.result;
      if (!result) {
        reject(new Error('Failed to read file'));
        return;
      }
      
      const img = new Image();
      img.onload = () => {
        // For now, create mock thermal data
        // In a real implementation, you would parse BMT/thermal formats here
        const mockThermalData = generateMockThermalData(img.width, img.height);
        
        resolve({
          id: Math.random().toString(36).substr(2, 9),
          name: file.name,
          thermalData: mockThermalData,
          rgbImage: result as string
        });
      };
      
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = result as string;
    };
    
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

function generateMockThermalData(width: number, height: number): ThermalData {
  const temperatureMatrix: number[][] = [];
  let minTemp = Infinity;
  let maxTemp = -Infinity;
  
  // Generate realistic thermal data pattern
  for (let y = 0; y < height; y++) {
    const row: number[] = [];
    for (let x = 0; x < width; x++) {
      // Create some hot spots and gradients
      const centerX = width / 2;
      const centerY = height / 2;
      const distance = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
      const normalized = distance / Math.sqrt(centerX ** 2 + centerY ** 2);
      
      // Add some noise and patterns
      const noise = (Math.random() - 0.5) * 5;
      const hotSpot1 = Math.exp(-((x - width * 0.3) ** 2 + (y - height * 0.3) ** 2) / 1000) * 20;
      const hotSpot2 = Math.exp(-((x - width * 0.7) ** 2 + (y - height * 0.7) ** 2) / 1500) * 15;
      
      const temp = 20 + (1 - normalized) * 15 + noise + hotSpot1 + hotSpot2;
      
      row.push(temp);
      minTemp = Math.min(minTemp, temp);
      maxTemp = Math.max(maxTemp, temp);
    }
    temperatureMatrix.push(row);
  }
  
  return {
    width,
    height,
    temperatureMatrix,
    minTemp,
    maxTemp,
    metadata: {
      emissivity: 0.95,
      ambientTemp: 20,
      reflectedTemp: 20,
      humidity: 50,
      distance: 1.0,
      cameraModel: 'Mock Thermal Camera',
      timestamp: new Date()
    }
  };
}

export function renderThermalCanvas(
  canvas: HTMLCanvasElement,
  thermalData: ThermalData,
  palette: ColorPalette,
  customMin?: number,
  customMax?: number
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  
  const { width, height, temperatureMatrix } = thermalData;
  const minTemp = customMin ?? thermalData.minTemp;
  const maxTemp = customMax ?? thermalData.maxTemp;
  
  canvas.width = width;
  canvas.height = height;
  
  const imageData = ctx.createImageData(width, height);
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const temp = temperatureMatrix[y][x];
      const color = interpolateColor(temp, minTemp, maxTemp, palette);
      const rgb = hexToRgb(color) || { r: 0, g: 0, b: 0 };
      
      const index = (y * width + x) * 4;
      imageData.data[index] = rgb.r;     // R
      imageData.data[index + 1] = rgb.g; // G
      imageData.data[index + 2] = rgb.b; // B
      imageData.data[index + 3] = 255;   // A
    }
  }
  
  ctx.putImageData(imageData, 0, 0);
}

export function getTemperatureAtPixel(thermalData: ThermalData, x: number, y: number): number | null {
  if (x < 0 || x >= thermalData.width || y < 0 || y >= thermalData.height) {
    return null;
  }
  
  const floorX = Math.floor(x);
  const floorY = Math.floor(y);
  
  if (floorY >= thermalData.temperatureMatrix.length || 
      floorX >= thermalData.temperatureMatrix[floorY].length) {
    return null;
  }
  
  return thermalData.temperatureMatrix[floorY][floorX];
}