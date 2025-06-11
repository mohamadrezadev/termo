# Thermal Analyzer Pro

Thermal Analyzer Pro is a web application built with Next.js 13 and TypeScript for viewing and analyzing thermal images. It can load common image formats as well as compressed **.bmt** archives that contain thermal CSV data and a visible image. The interface is bilingual (English and Persian) and uses Zustand for state management with an integrated logging system.

## Features
- Import BMT files with thermal data and real images
- Select from multiple color palettes such as Ironbow, Hot/Cold, Grayscale, Sepia and others
- Moveable windows for thermal and real image viewers, histogram, data table and more
- Generate reports and export data
- Interface available in English and Persian

## Getting Started
1. Install dependencies:
   ```bash
   npm install
   ```
2. Run in development mode:
   ```bash
   npm run dev
   ```
3. Build for production:
   ```bash
   npm run build
   ```
