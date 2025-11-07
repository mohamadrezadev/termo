import { generateId } from './utils';

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
  realImage: string | null;
  canvas?: HTMLCanvasElement;
  preRenderedThermalUrl?: string;
  serverRenderedThermalUrl?: string | null; // New field
}
// به lib/thermal-utils.ts این توابع را اضافه/جایگزین کنید

export interface ColorPalette {
  name: string;
  colors: string[];
  description?: string; // توضیح فارسی
}

export const COLOR_PALETTES: Record<string, ColorPalette> = {
  iron: {
    name: 'Iron (آهنی)',
    description: 'پالت استاندارد صنعتی با کنتراست بالا',
    colors: ['#000033', '#000055', '#0000aa', '#0033ff', '#0088ff', '#00ddff', '#33ffaa', '#88ff55', '#ddff00', '#ffaa00', '#ff5500', '#ff0000', '#aa0000']
  },
  rainbow: {
    name: 'Rainbow (رنگین‌کمان)',
    description: 'طیف کامل رنگی برای تشخیص دقیق',
    colors: ['#0000ff', '#0055ff', '#00aaff', '#00ffff', '#00ff88', '#00ff00', '#88ff00', '#ffff00', '#ffaa00', '#ff5500', '#ff0000', '#ffffff']
  },
  grayscale: {
    name: 'Grayscale (سیاه و سفید)',
    description: 'مناسب چاپ و مستندسازی',
    colors: ['#000000', '#1a1a1a', '#333333', '#4d4d4d', '#666666', '#808080', '#999999', '#b3b3b3', '#cccccc', '#e6e6e6', '#ffffff']
  },
  hot: {
    name: 'Hot (داغ)',
    description: 'تاکید بر نقاط داغ',
    colors: ['#000000', '#330000', '#660000', '#990000', '#cc0000', '#ff0000', '#ff3300', '#ff6600', '#ff9900', '#ffcc00', '#ffff00', '#ffffff']
  },
  cold: {
    name: 'Cold (سرد)',
    description: 'تاکید بر نقاط سرد',
    colors: ['#ffffff', '#ccffff', '#99ffff', '#66ffff', '#33ffff', '#00ffff', '#00ccff', '#0099ff', '#0066ff', '#0033ff', '#0000ff', '#000033']
  },
  medical: {
    name: 'Medical (پزشکی)',
    description: 'پالت استاندارد تصویربرداری پزشکی',
    colors: ['#000080', '#0000c0', '#0040ff', '#0080ff', '#00c0ff', '#00ffff', '#80ffff', '#c0ffff', '#ffffff']
  },
  sepia: {
    name: 'Sepia (سپیا)',
    description: 'نمای کلاسیک و خوانا',
    colors: ['#1a0f0a', '#2d1b0e', '#4a2f1a', '#6b4423', '#8b5a2b', '#a0673a', '#b8814a', '#cc9966', '#d4a574', '#e0b88c', '#f5deb3']
  },
  arctic: {
    name: 'Arctic (قطبی)',
    description: 'مناسب تصاویر سرد و یخی',
    colors: ['#001a33', '#003366', '#004d99', '#0066cc', '#0080ff', '#3399ff', '#66b3ff', '#99ccff', '#cce6ff', '#e6f2ff', '#ffffff']
  },
  lava: {
    name: 'Lava (گدازه)',
    description: 'مناسب تصاویر بسیار داغ',
    colors: ['#000000', '#1a0000', '#330000', '#4d0000', '#660000', '#800000', '#990000', '#b30000', '#cc0000', '#e60000', '#ff0000', '#ff3333', '#ff6666', '#ff9999', '#ffcccc']
  }
};

const LOW_CONTRAST_THRESHOLD = 0.1;

// بهبود interpolateColor برای دقت بیشتر
export function interpolateColor(value: number, min: number, max: number, palette: ColorPalette): string {
  // اگر محدوده خیلی کوچک است، از رنگ میانی استفاده کن
  if (max === min || (max - min) < LOW_CONTRAST_THRESHOLD) {
    return palette.colors[Math.floor(palette.colors.length / 2)];
  }
  
  // Normalize value to 0-1
  const normalized = Math.max(0, Math.min(1, (value - min) / (max - min)));
  
  // Map to palette index
  const index = normalized * (palette.colors.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  
  if (lower === upper) return palette.colors[lower];
  
  // Interpolate between two colors
  const factor = index - lower;
  const colorLower = hexToRgb(palette.colors[lower]);
  const colorUpper = hexToRgb(palette.colors[upper]);
  
  if (!colorLower || !colorUpper) return palette.colors[Math.floor(palette.colors.length / 2)];
  
  const r = Math.round(colorLower.r + factor * (colorUpper.r - colorLower.r));
  const g = Math.round(colorLower.g + factor * (colorUpper.g - colorLower.g));
  const b = Math.round(colorLower.b + factor * (colorUpper.b - colorLower.b));
  
  return `rgb(${r}, ${g}, ${b})`;
}




// تابع کمکی برای ایجاد نمونه از پالت (برای پیش‌نمایش)
export function createPalettePreview(
  palette: ColorPalette,
  width: number = 256,
  height: number = 20
): string {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  
  if (!ctx) return '';
  
  const gradient = ctx.createLinearGradient(0, 0, width, 0);
  const numColors = palette.colors.length;
  
  palette.colors.forEach((color, index) => {
    gradient.addColorStop(index / (numColors - 1), color);
  });
  
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  
  return canvas.toDataURL();
}
export interface Marker {
  id: string;
  type: 'point' | 'hotspot' | 'coldspot';
  x: number;
  y: number;
  temperature: number;
  label: string;
  emissivity: number;
  imageId: string;
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
  imageId: string;
}

export interface ColorPalette {
  name: string;
  colors: string[];
}






function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
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
      const rgbMatch = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
      const r = rgbMatch ? parseInt(rgbMatch[1], 10) : 0;
      const g = rgbMatch ? parseInt(rgbMatch[2], 10) : 0;
      const b = rgbMatch ? parseInt(rgbMatch[3], 10) : 0;
      const index = (y * width + x) * 4;
      imageData.data[index] = r;
      imageData.data[index + 1] = g;
      imageData.data[index + 2] = b;
      imageData.data[index + 3] = 255;
    }
  }

  ctx.putImageData(imageData, 0, 0);
}

/**
 * پردازش داده‌های حرارتی از فایل CSV
 * این تابع دقت بیشتری نسبت به خواندن از پیکسل‌های تصویر دارد
 */
export async function processThermalDataFromCSV(
  csvUrl: string,
  metadata?: Partial<ThermalMetadata>
): Promise<ThermalData> {
  console.log('[THERMAL_UTILS] Processing thermal data from CSV:', csvUrl);

  const response = await fetch(csvUrl, {
    mode: 'cors',
    credentials: 'omit'
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch CSV: ${response.status} ${response.statusText}`);
  }

  const csvText = await response.text();
  console.log(`[THERMAL_UTILS] CSV loaded, size: ${(csvText.length / 1024).toFixed(2)} KB`);

  // Parse CSV
  const rows = csvText.trim().split('\n');
  const temperatureMatrix: number[][] = rows.map(row =>
    row.split(',').map(val => parseFloat(val.trim()))
  );

  const height = temperatureMatrix.length;
  const width = temperatureMatrix[0]?.length || 0;

  if (width === 0 || height === 0) {
    throw new Error('Invalid CSV: empty temperature matrix');
  }

  console.log(`[THERMAL_UTILS] CSV parsed: ${width}x${height} pixels`);

  // محاسبه min/max temperature
  let minTemp = Infinity;
  let maxTemp = -Infinity;

  temperatureMatrix.forEach(row => {
    row.forEach(temp => {
      if (!isNaN(temp)) {
        minTemp = Math.min(minTemp, temp);
        maxTemp = Math.max(maxTemp, temp);
      }
    });
  });

  if (minTemp === Infinity) {
    minTemp = 0;
    maxTemp = 0;
  }

  console.log(`[THERMAL_UTILS] Temperature range: ${minTemp.toFixed(2)}°C - ${maxTemp.toFixed(2)}°C`);

  // ساخت metadata کامل
  const fullMetadata: ThermalMetadata = {
    emissivity: metadata?.emissivity ?? 0.95,
    ambientTemp: metadata?.ambientTemp ?? 20,
    reflectedTemp: metadata?.reflectedTemp ?? 20,
    humidity: metadata?.humidity ?? 0.5,
    distance: metadata?.distance ?? 1.0,
    cameraModel: metadata?.cameraModel || 'Thermal Camera',
    timestamp: metadata?.timestamp || new Date()
  };

  return {
    width,
    height,
    temperatureMatrix,
    minTemp,
    maxTemp,
    metadata: fullMetadata
  };
}

/**
 * پردازش تصویر حرارتی از BMP سرور (fallback اگر CSV نباشد)
 * دقت این متد کمتر از CSV است
 */
export async function processThermalBmpFromServer(imageUrl: string): Promise<ThermalData> {
  console.log('[THERMAL_UTILS] Processing thermal BMP from server (fallback mode):', imageUrl);

  // For desktop app, ensure we can fetch from local server
  const response = await fetch(imageUrl, {
    mode: 'cors',
    credentials: 'omit'
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
  }
  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);

  try {
    const img = new Image();
    img.src = objectUrl;
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = (err) => reject(new Error(`Failed to load image from object URL: ${err instanceof ErrorEvent ? err.message : String(err)}`));
    });

    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get 2D context from canvas');
    }
    ctx.drawImage(img, 0, 0);
    const imageData = ctx.getImageData(0, 0, img.width, img.height);

    const temperatureMatrix: number[][] = [];
    let minTemp = Infinity;
    let maxTemp = -Infinity;

    for (let y = 0; y < img.height; y++) {
      const row: number[] = [];
      for (let x = 0; x < img.width; x++) {
        const pixelIndex = (y * img.width + x) * 4;
        const temp = imageData.data[pixelIndex];
        row.push(temp);
        minTemp = Math.min(minTemp, temp);
        maxTemp = Math.max(maxTemp, temp);
      }
      temperatureMatrix.push(row);
    }

    if (minTemp === Infinity) {
      minTemp = 0;
      maxTemp = 0;
    }

    console.log('[THERMAL_UTILS] BMP processed (fallback)');

    return {
      width: img.width,
      height: img.height,
      temperatureMatrix,
      minTemp,
      maxTemp,
      metadata: {
        emissivity: 0.95,
        ambientTemp: 20,
        reflectedTemp: 20,
        humidity: 0.5,
        distance: 1.0,
        cameraModel: 'Server Extracted BMP',
        timestamp: new Date()
      }
    };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
export function getTemperatureAtPixel(thermalData: ThermalData, x: number, y: number): number | null {
  if (x < 0 || x >= thermalData.width || y < 0 || y >= thermalData.height) {
    return null;
  }

  const floorX = Math.floor(x);
  const floorY = Math.floor(y);

  if (floorY >= thermalData.temperatureMatrix.length || floorX >= thermalData.temperatureMatrix[floorY].length) {
    return null;
  }

  return thermalData.temperatureMatrix[floorY][floorX];
}
