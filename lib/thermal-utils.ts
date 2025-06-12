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
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const arrayBuffer = e.target?.result as ArrayBuffer;
      if (!arrayBuffer) {
        reject(new Error('Failed to read file as ArrayBuffer'));
        return;
      }

      const dataView = new DataView(arrayBuffer);
      const textDecoder = new TextDecoder('ascii');

      const checkBoundary = (offset: number, length: number, sectionName: string) => {
        if (offset + length > dataView.byteLength) {
          throw new Error(`BMT_PARSE_ERROR: Unexpected end of file while reading ${sectionName}. Needed ${offset + length}, have ${dataView.byteLength}`);
        }
      };

      // Check for BMTF Magic Number
      try {
        checkBoundary(0, 4, "Magic Number");
        if (textDecoder.decode(new Uint8Array(arrayBuffer, 0, 4)) !== 'BMTF') {
          console.log("File is not a BMTF format (magic number mismatch). Attempting fallback.");
          fallbackToImageRead(file, resolve, reject);
          return;
        }
      } catch (e: any) {
        // This catch is primarily for boundary check on magic number itself
        console.error("BMT Parsing Error: Could not read magic number.", e.message);
        fallbackToImageRead(file, resolve, reject);
        return;
      }
      
      try {
        // File Header Parsing
        let currentOffset = 4; // Start after magic number

        checkBoundary(currentOffset, 2, "Format Version");
        const formatVersion = dataView.getUint16(currentOffset, true);
        currentOffset += 2;

        checkBoundary(currentOffset, 1, "File Flags");
        const fileFlags = dataView.getUint8(currentOffset);
        currentOffset += 1;
        const hasRealImage = (fileFlags & 0x01) === 1;

        checkBoundary(currentOffset, 8, "Timestamp");
        const timestampBigInt = dataView.getBigInt64(currentOffset, true);
        const timestamp = new Date(Number(timestampBigInt));
        currentOffset += 8;

        checkBoundary(currentOffset, 4, "Thermal Data Offset");
        const thermalDataOffset = dataView.getUint32(currentOffset, true);
        currentOffset += 4;

        checkBoundary(currentOffset, 4, "Real Image Data Offset");
        const realImageDataBaseOffset = dataView.getUint32(currentOffset, true);
        currentOffset += 4; // End of header, currentOffset is now 23

        if (thermalDataOffset === 0 || thermalDataOffset >= dataView.byteLength) {
            throw new Error(`BMT_PARSE_ERROR: Invalid thermalDataOffset: ${thermalDataOffset}`);
        }


        // Thermal Image Metadata Section
        let thermalMetaOffset = thermalDataOffset;
        
        checkBoundary(thermalMetaOffset, 2, "Thermal Image Width");
        const thermalImageWidth = dataView.getUint16(thermalMetaOffset, true);
        thermalMetaOffset += 2;

        checkBoundary(thermalMetaOffset, 2, "Thermal Image Height");
        const thermalImageHeight = dataView.getUint16(thermalMetaOffset, true);
        thermalMetaOffset += 2;

        checkBoundary(thermalMetaOffset, 1, "Temperature Unit");
        const temperatureUnit = dataView.getUint8(thermalMetaOffset); // 0: C, 1: F, 2: K
        thermalMetaOffset += 1;

        checkBoundary(thermalMetaOffset, 1, "Data Type for Temperatures");
        const dataTypeForTemperatures = dataView.getUint8(thermalMetaOffset); // 0: Float32, 1: Uint16
        thermalMetaOffset += 1;

        checkBoundary(thermalMetaOffset, 4, "Min Temperature Value");
        const minTempValue = dataView.getFloat32(thermalMetaOffset, true);
        thermalMetaOffset += 4;

        checkBoundary(thermalMetaOffset, 4, "Max Temperature Value");
        const maxTempValue = dataView.getFloat32(thermalMetaOffset, true);
        thermalMetaOffset += 4;

        checkBoundary(thermalMetaOffset, 4, "Emissivity");
        const emissivity = dataView.getFloat32(thermalMetaOffset, true);
        thermalMetaOffset += 4;

        checkBoundary(thermalMetaOffset, 4, "Ambient Temperature");
        const ambientTemperature = dataView.getFloat32(thermalMetaOffset, true);
        thermalMetaOffset += 4;

        checkBoundary(thermalMetaOffset, 4, "Reflected Temperature");
        const reflectedTemperature = dataView.getFloat32(thermalMetaOffset, true);
        thermalMetaOffset += 4;

        checkBoundary(thermalMetaOffset, 2, "Humidity");
        const humidity = dataView.getUint16(thermalMetaOffset, true);
        thermalMetaOffset += 2;

        checkBoundary(thermalMetaOffset, 4, "Distance");
        const distance = dataView.getFloat32(thermalMetaOffset, true);
        thermalMetaOffset += 4;

        checkBoundary(thermalMetaOffset, 32, "Camera Model String");
        const cameraModelBytes = new Uint8Array(arrayBuffer, thermalMetaOffset, 32);
        const cameraModelNullIndex = cameraModelBytes.indexOf(0);
        const cameraModel = textDecoder.decode(cameraModelBytes.slice(0, cameraModelNullIndex > -1 ? cameraModelNullIndex : 32));
        thermalMetaOffset += 32; // End of thermal metadata, thermalMetaOffset is thermalDataOffset + 64 (assuming 32+4+2+4+4+4+4+1+1+2+2 = 60, oops, example metadata was 128 bytes)
        // Correcting based on individual reads, the total size of metadata read is 2+2+1+1+4+4+4+4+4+2+4+32 = 64 bytes.
        // The problem description stated "Thermal Image Metadata Section (at Thermal Data Offset, assume 128 bytes total for this example)"
        // And then "Thermal Image Data Section (immediately after thermal metadata): Calculate data start: Thermal Data Offset + 128"
        // So we should use thermalDataOffset + 128 for thermalDataStart, regardless of actual metadata bytes read, to match spec.

        // Thermal Image Data Section
        const thermalDataStart = thermalDataOffset + 128; // As per spec
        const bytesPerPixel = dataTypeForTemperatures === 0 ? 4 : 2;
        const thermalDataEnd = thermalDataStart + (thermalImageWidth * thermalImageHeight * bytesPerPixel);
        checkBoundary(thermalDataStart, (thermalImageWidth * thermalImageHeight * bytesPerPixel), "Thermal Image Data");

        const temperatureMatrix: number[][] = [];
        let minTempActual = Infinity;
        let maxTempActual = -Infinity;

        for (let y = 0; y < thermalImageHeight; y++) {
          const row: number[] = [];
          for (let x = 0; x < thermalImageWidth; x++) {
            const dataIdx = thermalDataStart + (y * thermalImageWidth + x) * bytesPerPixel;
            // Boundary check for each pixel read is too granular and slow, covered by the block check above.
            let temp: number;
            if (dataTypeForTemperatures === 0) { // Float32
              temp = dataView.getFloat32(dataIdx, true);
            } else { // Uint16, scaled
              temp = dataView.getUint16(dataIdx, true) / 100.0;
            }
            row.push(temp);
            minTempActual = Math.min(minTempActual, temp);
            maxTempActual = Math.max(maxTempActual, temp);
          }
          temperatureMatrix.push(row);
        }

        let realImageBase64: string | null = null;

        // New logic: Search for JPEG magic number
        if (hasRealImage) { // Only search if the header flag suggests there might be one
          const searchOffset = thermalDataEnd; // Start searching after thermal data

          if (searchOffset < dataView.byteLength - 4) { // Ensure there's enough space for magic number + some data
            const jpegMagic1 = [0xFF, 0xD8, 0xFF, 0xE0]; // Standard JPEG
            const jpegMagic2 = [0xFF, 0xD8, 0xFF, 0xE1]; // JPEG with EXIF
            let foundJpegStartIndex = -1;

            console.log(`BMT Parsing: Starting JPEG search from offset ${searchOffset}. File length: ${dataView.byteLength}`);

            for (let i = searchOffset; i <= dataView.byteLength - 4; i++) {
              // Check for FF D8 FF
              if (dataView.getUint8(i) === 0xFF &&
                  dataView.getUint8(i + 1) === 0xD8 &&
                  dataView.getUint8(i + 2) === 0xFF) {
                const fourthByte = dataView.getUint8(i + 3);
                // Check if fourth byte is E0 or E1
                if (fourthByte === 0xE0 || fourthByte === 0xE1) {
                  foundJpegStartIndex = i;
                  break;
                }
              }
            }

            if (foundJpegStartIndex !== -1) {
              // JPEG found, extract from foundJpegStartIndex to the end of the file
              const jpegDataArrayBuffer = arrayBuffer.slice(foundJpegStartIndex);
              const base64Data = arrayBufferToBase64(jpegDataArrayBuffer);
              realImageBase64 = `data:image/jpeg;base64,${base64Data}`;
              console.log(`BMT Parsing: Found embedded JPEG at offset ${foundJpegStartIndex} by magic number. Extracted length: ${jpegDataArrayBuffer.byteLength}`);
            } else {
              console.log(`BMT Parsing: hasRealImage flag was set, but no JPEG magic number (FFD8FFE0 or FFD8FFE1) found after thermal data. Search started at offset: ${searchOffset}.`);
            }
          } else {
            console.log(`BMT Parsing: Not enough data after thermal data to search for JPEG. Search offset: ${searchOffset}. File length: ${dataView.byteLength}`);
          }
        } else {
            console.log("BMT Parsing: hasRealImage flag is false. Skipping JPEG search.");
        }

        /*
        // Old logic for realImageBase64 extraction:
        // Kept for reference, replaced by magic number search
        if (hasRealImage && realImageDataBaseOffset > 0 && realImageDataBaseOffset < dataView.byteLength) {
            if (realImageDataBaseOffset < thermalDataEnd) { // Basic sanity check for offset
                throw new Error(`BMT_PARSE_ERROR: realImageDataBaseOffset ${realImageDataBaseOffset} overlaps with thermal data ending at ${thermalDataEnd}`);
            }

            let realMetaOffset = realImageDataBaseOffset;

            checkBoundary(realMetaOffset, 2, "Real Image Width");
            const realImageWidth = dataView.getUint16(realMetaOffset, true);
            realMetaOffset += 2;

            checkBoundary(realMetaOffset, 2, "Real Image Height");
            const realImageHeight = dataView.getUint16(realMetaOffset, true);
            realMetaOffset += 2;

            checkBoundary(realMetaOffset, 1, "Real Image Format");
            const realImageFormat = dataView.getUint8(realMetaOffset); // 0: JPEG, 1: PNG
            realMetaOffset += 1;

            checkBoundary(realMetaOffset, 4, "Length of Real Image Data");
            const realImageLength = dataView.getUint32(realMetaOffset, true);
            realMetaOffset += 4; // End of real image metadata, realMetaOffset is realImageDataBaseOffset + 9

            const realImageDataStart = realImageDataBaseOffset + 20; // As per original spec
            checkBoundary(realImageDataStart, realImageLength, "Real Image Data");

            const realImageDataBuffer = arrayBuffer.slice(realImageDataStart, realImageDataStart + realImageLength);
            const base64Data = arrayBufferToBase64(realImageDataBuffer);
            if (realImageFormat === 0) {
              realImageBase64 = `data:image/jpeg;base64,${base64Data}`;
            } else if (realImageFormat === 1) {
              realImageBase64 = `data:image/png;base64,${base64Data}`;
            } else {
              console.warn(`BMT Parsing: Unknown real image format: ${realImageFormat}`);
            }
        }
        */

        resolve({
            id: generateId(),
            name: file.name,
            thermalData: {
              width: thermalImageWidth,
              height: thermalImageHeight,
              temperatureMatrix,
              minTemp: minTempActual, // Use actual min/max from data
              maxTemp: maxTempActual,
              metadata: {
                emissivity,
                ambientTemp: ambientTemperature,
                reflectedTemp: reflectedTemperature,
                humidity: humidity / 100, // Assuming humidity is stored as value*100
                distance,
                cameraModel,
                timestamp,
                // temperatureUnit can be stored if needed
              },
            },
            realImage: realImageBase64,
          });

        } catch (error) {
          console.error("Error parsing BMT file:", error);
          // Fallback for parsing errors within BMT structure or if specific BMT_PARSE_ERROR was thrown
          console.error("BMT Parsing Error:", (error as Error).message);
          fallbackToImageRead(file, resolve, reject);
        }
      // Removed the specific 'else' for magic number, as it's handled inside the first try-catch.
    };

    reader.onerror = () => reject(new Error('Failed to read file initially'));
    reader.readAsArrayBuffer(file); // Read as ArrayBuffer for BMT parsing
  });
}

// Helper function for fallback behavior
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