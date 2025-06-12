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

      // Existing non-BMP logic starts here
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