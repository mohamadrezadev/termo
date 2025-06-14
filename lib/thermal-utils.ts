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
  realImage: string | null; // base64 or URL
  canvas?: HTMLCanvasElement;
  preRenderedThermalUrl?: string;
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

const LOW_CONTRAST_THRESHOLD = 0.1; // Threshold for very low thermal contrast

export function interpolateColor(value: number, min: number, max: number, palette: ColorPalette): string {
  if (max === min || (max - min) < LOW_CONTRAST_THRESHOLD) {
    // If min and max are equal, or contrast is very low, return the middle color of the palette
    // This prevents uniform temperature images from always being the first color (e.g., black)
    // and handles very low contrast scenarios more gracefully.
    return palette.colors[Math.floor(palette.colors.length / 2)];
  }
  
  const normalized = Math.max(0, Math.min(1, (value - min) / (max - min)));
  const index = normalized * (palette.colors.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  
  if (lower === upper) return palette.colors[lower];
  
  const factor = index - lower;
  const colorLower = hexToRgb(palette.colors[lower]);
  const colorUpper = hexToRgb(palette.colors[upper]);
  
  if (!colorLower || !colorUpper) {
    // Fallback if hexToRgb fails for some reason, though unlikely with valid hex strings
    return palette.colors[Math.floor(palette.colors.length / 2)];
  }
  
  const r = Math.round(colorLower.r + factor * (colorUpper.r - colorLower.r));
  const g = Math.round(colorLower.g + factor * (colorUpper.g - colorLower.g));
  const b = Math.round(colorLower.b + factor * (colorUpper.b - colorLower.b));
  
  return `rgb(${r}, ${g}, ${b})`;
}

// Helper function to convert ArrayBuffer to base64
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
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
  return new Promise(async (resolve, reject) => { // Added async here
    const reader = new FileReader();

    reader.onload = async (e) => { // Added async here
      const arrayBuffer = e.target?.result as ArrayBuffer;
      if (!arrayBuffer) {
        reject(new Error('Failed to read file as ArrayBuffer'));
        return;
      }

      if (file.name.toLowerCase().endsWith('.bmp')) {
        try {
          const bmpResult = await processDualBMP(file, arrayBuffer);

          let temperatureMatrix: number[][] = [];
          let minTemp = Infinity;
          let maxTemp = -Infinity;

          if (bmpResult.originalThermalCanvas) {
            const canvas = bmpResult.originalThermalCanvas;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
              for (let y = 0; y < canvas.height; y++) {
                const row: number[] = [];
                for (let x = 0; x < canvas.width; x++) {
                  const pixelIndex = (y * canvas.width + x) * 4;
                  const temp = imageData.data[pixelIndex]; // Red channel as temperature
                  row.push(temp);
                  minTemp = Math.min(minTemp, temp);
                  maxTemp = Math.max(maxTemp, temp);
                }
                temperatureMatrix.push(row);
              }
              if (minTemp === Infinity) { // Handle 0x0 image or fully transparent image
                  minTemp = 0;
                  maxTemp = 0;
              }
            } else {
              throw new Error("Could not get context from originalThermalCanvas for BMP processing");
            }
          } else {
             // This case should ideally not happen if processDualBMP succeeds and is implemented correctly
             throw new Error("originalThermalCanvas was null after successful BMP processing");
          }

          const thermalData: ThermalData = {
            width: bmpResult.width,
            height: bmpResult.height,
            temperatureMatrix,
            minTemp,
            maxTemp,
            metadata: {
              emissivity: 0.95, // Default or from somewhere else
              ambientTemp: 20,  // Default
              reflectedTemp: 20, // Default
              humidity: 0.50, // Default
              distance: 1.0, // Default
              cameraModel: 'BMP Dual Image (Custom)',
              timestamp: new Date()
              // preRenderedThermalUrl is now part of ThermalImage, not metadata
            }
          };

          resolve({
            id: generateId(),
            name: file.name,
            thermalData: thermalData,
            realImage: bmpResult.realUrl,
            preRenderedThermalUrl: bmpResult.thermalUrl, // Assign to the new field in ThermalImage
          });
        } catch (bmpError) {
          console.log("Dual BMP processing failed for", file.name, ". Falling back to generic image processing.", bmpError);
          // Fallback: load file as a single image and do grayscale conversion
          const fallbackReaderImg = new FileReader();
          fallbackReaderImg.onload = (e_fallback) => {
            const result_fallback = e_fallback.target?.result;
            if (!result_fallback) {
              reject(new Error('Failed to read file for BMP fallback'));
              return;
            }
            const img = new Image();
            img.onload = () => {
              const canvas = document.createElement('canvas');
              canvas.width = img.width;
              canvas.height = img.height;
              const ctx = canvas.getContext('2d');
              if (!ctx) {
                reject(new Error('Failed to get canvas context for BMP fallback image processing'));
                return;
              }
              ctx.drawImage(img, 0, 0);
              const imageData = ctx.getImageData(0, 0, img.width, img.height);
              const temperatureMatrixFallback: number[][] = [];
              let minTempFallback = Infinity;
              let maxTempFallback = -Infinity;
              for (let y_fb = 0; y_fb < img.height; y_fb++) {
                const row_fb: number[] = [];
                for (let x_fb = 0; x_fb < img.width; x_fb++) {
                  const pixelIndex_fb = (y_fb * img.width + x_fb) * 4;
                  const r_fb = imageData.data[pixelIndex_fb];
                  const g_fb = imageData.data[pixelIndex_fb + 1];
                  const b_fb = imageData.data[pixelIndex_fb + 2];
                  const grayscaleTemp_fb = 0.299 * r_fb + 0.587 * g_fb + 0.114 * b_fb;
                  row_fb.push(grayscaleTemp_fb);
                  minTempFallback = Math.min(minTempFallback, grayscaleTemp_fb);
                  maxTempFallback = Math.max(maxTempFallback, grayscaleTemp_fb);
                }
                temperatureMatrixFallback.push(row_fb);
              }
              if (minTempFallback === Infinity) { minTempFallback = 0; maxTempFallback = 0;}
              const fallbackThermalData: ThermalData = {
                width: img.width, height: img.height, temperatureMatrix: temperatureMatrixFallback,
                minTemp: minTempFallback, maxTemp: maxTempFallback,
                metadata: { emissivity: 0.95, ambientTemp: 20, reflectedTemp: 20, humidity: 0.50, distance: 1.0, cameraModel: 'BMP Fallback (Grayscale)', timestamp: new Date()}
              };
              resolve({ id: generateId(), name: file.name, thermalData: fallbackThermalData, realImage: result_fallback as string });
            };
            img.onerror = () => reject(new Error('Failed to load image for BMP fallback'));
            img.src = result_fallback as string;
          };
          fallbackReaderImg.onerror = () => reject(new Error('Failed to read file for BMP fallback reader'));
          fallbackReaderImg.readAsDataURL(file);
        }
        return; // Important: return after handling BMP
      }

      // Fallback for non-BMP files (e.g., JPG, PNG directly uploaded to client)
      console.log(`File ${file.name} is not a BMP. Attempting fallback to generic image read.`);
      fallbackToImageRead(file, resolve, reject);
      
    }; // end of reader.onload

    reader.onerror = () => reject(new Error('Failed to read file initially'));
    reader.readAsArrayBuffer(file); // Read as ArrayBuffer for BMT parsing
  });
}

// BMP Processing Helper Functions
async function generateThermalFromBMP(canvas: HTMLCanvasElement, paletteName: keyof typeof COLOR_PALETTES = 'iron'): Promise<string> {
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Could not get canvas context');
  }
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  const palette = COLOR_PALETTES[paletteName];
  if (!palette) {
    throw new Error(`Invalid palette name: ${paletteName}`);
  }

  let minIntensity = 255;
  let maxIntensity = 0;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i]; // Assuming grayscale, R=G=B for thermal info
    minIntensity = Math.min(minIntensity, r);
    maxIntensity = Math.max(maxIntensity, r);
  }

  if (minIntensity === maxIntensity) {
      const targetColorHex = (minIntensity === 0) ? palette.colors[0] : palette.colors[palette.colors.length -1];
      const targetColorRgb = hexToRgb(targetColorHex);
      if (targetColorRgb) {
          for (let i = 0; i < data.length; i += 4) {
              data[i] = targetColorRgb.r;
              data[i + 1] = targetColorRgb.g;
              data[i + 2] = targetColorRgb.b;
              data[i + 3] = 255;
          }
      }
  } else {
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const colorStr = interpolateColor(r, minIntensity, maxIntensity, palette);
        // interpolateColor returns "rgb(r, g, b)"
        const rgbValues = colorStr.substring(4, colorStr.length - 1).split(',').map(v => parseInt(v.trim(), 10));
        data[i] = rgbValues[0];
        data[i + 1] = rgbValues[1];
        data[i + 2] = rgbValues[2];
        data[i + 3] = 255; // Alpha
      }
  }
  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL();
}

async function processDualBMP(file: File, arrayBuffer: ArrayBuffer): Promise<{ thermalUrl: string; realUrl: string; width: number; height: number; originalThermalCanvas: HTMLCanvasElement | null }> {
  return new Promise((resolve, reject) => {
    const dataView = new DataView(arrayBuffer);
    if (dataView.getUint16(0, false) !== 0x424D) { // 'BM'
      reject(new Error("File is not a BMP or first image is not BMP."));
      return;
    }

    // Create a blob for the entire file, assuming the first image starts at offset 0
    const firstImageBlob = new Blob([arrayBuffer], { type: 'image/bmp' });
    const firstImageUrl = URL.createObjectURL(firstImageBlob);
    const img1 = new Image();
    let originalThermalCanvas: HTMLCanvasElement | null = null;

    img1.onload = async () => {
      originalThermalCanvas = document.createElement('canvas');
      originalThermalCanvas.width = img1.width;
      originalThermalCanvas.height = img1.height;
      const ctx1 = originalThermalCanvas.getContext('2d');
      if (!ctx1) {
          URL.revokeObjectURL(firstImageUrl);
          reject(new Error("Could not get context for original thermal canvas"));
          return;
      }
      ctx1.drawImage(img1, 0, 0, img1.width, img1.height); // Draw the first image (thermal)

      const coloringCanvas = document.createElement('canvas');
      coloringCanvas.width = img1.width;
      coloringCanvas.height = img1.height;
      const coloringCtx = coloringCanvas.getContext('2d');
      if (!coloringCtx) {
          URL.revokeObjectURL(firstImageUrl);
          reject(new Error("Could not get context for coloring canvas"));
          return;
      }
      coloringCtx.drawImage(img1, 0, 0, img1.width, img1.height); // Draw it again for false coloring

      // No need to revoke firstImageUrl yet if we are still trying to find second image from arrayBuffer

      const thermalUrl = await generateThermalFromBMP(coloringCanvas);

      let secondImageOffset = -1;
      // Naive search for the second 'BM' signature.
      // This assumes the first BMP isn't extraordinarily small.
      // A robust solution would parse the first BMP to find its exact size.
      const minOffsetForSecondImage = 100; // Start search after a minimal header size
      for (let i = minOffsetForSecondImage; i < arrayBuffer.byteLength - 1; i++) {
          if (dataView.getUint16(i, false) === 0x424D) {
              secondImageOffset = i;
              break;
          }
      }

      if (secondImageOffset === -1) {
        URL.revokeObjectURL(firstImageUrl); // Clean up first image URL
        reject(new Error("Second BMP image signature not found in the provided file."));
        return;
      }

      // If second image is found, create blob from its offset
      const secondImageBlob = new Blob([arrayBuffer.slice(secondImageOffset)], { type: 'image/bmp' });
      const secondImageUrl = URL.createObjectURL(secondImageBlob);
      const img2 = new Image();

      img2.onload = () => {
        // Create a data URL for the second image to ensure it's self-contained
        const realCanvas = document.createElement('canvas');
        realCanvas.width = img2.width;
        realCanvas.height = img2.height;
        const realCtx = realCanvas.getContext('2d');
        if (!realCtx) {
            URL.revokeObjectURL(firstImageUrl);
            URL.revokeObjectURL(secondImageUrl);
            reject(new Error("Could not get context for real image canvas (BMP)"));
            return;
        }
        realCtx.drawImage(img2, 0, 0);
        const realUrlData = realCanvas.toDataURL();

        URL.revokeObjectURL(firstImageUrl); // Clean up
        URL.revokeObjectURL(secondImageUrl); // Clean up

        resolve({
          thermalUrl: thermalUrl,
          realUrl: realUrlData,
          width: img1.width,
          height: img1.height,
          originalThermalCanvas: originalThermalCanvas
        });
      };
      img2.onerror = () => {
        URL.revokeObjectURL(firstImageUrl);
        URL.revokeObjectURL(secondImageUrl);
        reject(new Error("Failed to load second BMP image. It might be corrupted or not a valid BMP."));
      };
      img2.src = secondImageUrl;
    };
    img1.onerror = () => {
      URL.revokeObjectURL(firstImageUrl);
      reject(new Error("Failed to load first BMP image. It might be corrupted or not a valid BMP."));
    };
    img1.src = firstImageUrl;
  });
}

// Helper function for fallback behavior (for non-BMP, non-BMTF files)
function fallbackToImageRead(file: File, resolve: (value: ThermalImage | PromiseLike<ThermalImage>) => void, reject: (reason?: any) => void) {
  const fallbackReader = new FileReader();
  fallbackReader.onload = (e_fallback) => {
    const result_fallback = e_fallback.target?.result;
    if (!result_fallback) {
      reject(new Error('Failed to read file for fallback'));
      return;
    }
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error('Failed to get canvas context for fallback image processing'));
        return;
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
          const r = imageData.data[pixelIndex];
          const g = imageData.data[pixelIndex + 1];
          const b = imageData.data[pixelIndex + 2];
          const grayscaleTemp = 0.299 * r + 0.587 * g + 0.114 * b;
          row.push(grayscaleTemp);
          minTemp = Math.min(minTemp, grayscaleTemp);
          maxTemp = Math.max(maxTemp, grayscaleTemp);
        }
        temperatureMatrix.push(row);
      }

      if (minTemp === Infinity) { // Handle 0x0 image or fully transparent image
        minTemp = 0;
        maxTemp = 0;
      }

      const newThermalData: ThermalData = {
        width: img.width,
        height: img.height,
        temperatureMatrix,
        minTemp,
        maxTemp,
        metadata: {
          emissivity: 0.95,
          ambientTemp: 20,
          reflectedTemp: 20,
          humidity: 0.50,
          distance: 1.0,
          cameraModel: 'Standard Image (Grayscale)',
          timestamp: new Date()
        }
      };

      resolve({
        id: generateId(),
        name: file.name,
        thermalData: newThermalData,
        realImage: result_fallback as string,
      });
    };
    img.onerror = () => reject(new Error('Failed to load image for fallback'));
    img.src = result_fallback as string;
  };
  fallbackReader.onerror = () => reject(new Error('Failed to read file for fallback'));
  fallbackReader.readAsDataURL(file); // Original method for non-BMT
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

export async function processThermalBmpFromServer(imageUrl: string): Promise<ThermalData> {
  // Fetch the image
  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
  }
  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);

  try {
    // Load the image
    const img = new Image();
    img.src = objectUrl;
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = (err) => reject(new Error(`Failed to load image from object URL: ${err instanceof ErrorEvent ? err.message : String(err)}`));
    });

    // Process on canvas
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get 2D context from canvas');
    }
    ctx.drawImage(img, 0, 0);
    const imageData = ctx.getImageData(0, 0, img.width, img.height);

    // Extract temperature data (using red channel)
    const temperatureMatrix: number[][] = [];
    let minTemp = Infinity;
    let maxTemp = -Infinity;

    if (img.width === 0 || img.height === 0) {
        // Handle zero-size image immediately
        minTemp = 0;
        maxTemp = 0;
    } else {
        for (let y = 0; y < img.height; y++) {
            const row: number[] = [];
            for (let x = 0; x < img.width; x++) {
                const pixelIndex = (y * img.width + x) * 4;
                const temp = imageData.data[pixelIndex]; // Red channel as temperature
                row.push(temp);
                minTemp = Math.min(minTemp, temp);
                maxTemp = Math.max(maxTemp, temp);
            }
            temperatureMatrix.push(row);
        }
        // If after processing all pixels, minTemp is still Infinity,
        // it means no pixels were processed (e.g., fully transparent image, though unlikely for BMP from server)
        // or all pixels had an alpha of 0 if we were considering that.
        // For red channel processing, this check is mainly for true 0-pixel images.
        if (minTemp === Infinity) {
            minTemp = 0;
            maxTemp = 0;
        }
    }

    console.log(`[processThermalBmpFromServer] Processed: ${imageUrl}, Width: ${img.width}, Height: ${img.height}, MinTemp: ${minTemp}, MaxTemp: ${maxTemp}`);
    // Return ThermalData
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
        humidity: 0.50, // Represented as 0-1
        distance: 1.0,
        cameraModel: 'Server Extracted BMP',
        timestamp: new Date(),
      },
    };
  } finally {
    // Clean up
    URL.revokeObjectURL(objectUrl);
  }
}