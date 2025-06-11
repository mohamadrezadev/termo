import JSZip from 'jszip';
import { ThermalData, ThermalImage } from './thermal-utils';

function parseCSV(content: string): number[][] {
  return content.trim().split(/\r?\n/).map(line =>
    line.trim().split(/[,;\s]+/).map(v => parseFloat(v))
  );
}

export async function parseBMTFile(file: File): Promise<ThermalImage> {
  const zip = await JSZip.loadAsync(file);
  let thermalMatrix: number[][] | null = null;
  let realImage: string | null = null;

  for (const name of Object.keys(zip.files)) {
    const entry = zip.files[name];
    if (!entry) continue;
    if (/real|visible/i.test(name) && /\.(png|jpe?g)$/i.test(name)) {
      const base64 = await entry.async('base64');
      const ext = name.toLowerCase().endsWith('.png') ? 'png' : 'jpeg';
      realImage = `data:image/${ext};base64,${base64}`;
    }
    if (/thermal/i.test(name) && /\.csv$/i.test(name)) {
      const text = await entry.async('text');
      thermalMatrix = parseCSV(text);
    }
  }

  if (!thermalMatrix) {
    throw new Error('No thermal data found in BMT file');
  }

  const height = thermalMatrix.length;
  const width = thermalMatrix[0]?.length || 0;
  let minTemp = Infinity;
  let maxTemp = -Infinity;
  for (const row of thermalMatrix) {
    for (const v of row) {
      if (v < minTemp) minTemp = v;
      if (v > maxTemp) maxTemp = v;
    }
  }

  const thermalData: ThermalData = {
    width,
    height,
    temperatureMatrix: thermalMatrix,
    minTemp,
    maxTemp,
    metadata: {
      emissivity: 0.95,
      ambientTemp: 20,
      reflectedTemp: 20,
      humidity: 50,
      distance: 1
    }
  };

  return {
    id: Math.random().toString(36).substr(2, 9),
    name: file.name,
    thermalData,
    realImage
  };
}
