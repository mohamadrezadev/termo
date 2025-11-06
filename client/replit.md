# Thermal Analyzer Pro

## Overview

Thermal Analyzer Pro is a professional web-based thermal imaging analysis application built with Next.js, React, and TypeScript. The application provides advanced tools for analyzing thermal images, including interactive visualization, measurement tools, data analysis, and report generation. It supports both English and Persian languages with full RTL (right-to-left) layout support.

The application features a multi-window interface where users can upload thermal images, view them with various color palettes, draw measurement markers and regions, analyze temperature data through tables and histograms, manage time-series image sequences, and generate professional reports in multiple formats.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework**: Next.js 13+ with App Router
- Uses the modern App Router pattern with `app/` directory structure
- Server-side rendering (SSR) disabled via configuration for static export compatibility
- TypeScript strict mode enabled for type safety

**UI Component System**: Shadcn/UI with Radix UI primitives
- Component library based on Radix UI headless components
- Tailwind CSS for styling with custom design tokens
- Dark mode theme as default (forced via ThemeProvider)
- Comprehensive set of reusable UI components in `components/ui/`

**State Management**: Zustand
- Centralized global state store in `lib/store.ts`
- Manages application state including:
  - Project management (current project, project list)
  - Image data (thermal images, active image)
  - Measurement data (markers, regions)
  - UI state (language, window positions, view settings)
  - Display settings (palette, zoom, pan, temperature ranges)

**Window Management System**
- Custom resizable window implementation
- Grid-based layout with automatic positioning
- Window state persistence (position, size, z-index, open/closed)
- Independent zoom and pan controls for thermal and real image viewers

**Internationalization**
- Manual translation system with English and Persian support
- RTL layout support for Persian language
- Translation definitions in `lib/translations.ts`

### Data Processing & Visualization

**Thermal Image Processing**
- Server-side thermal image processing via Python backend (FastAPI)
- Client-side thermal data rendering using HTML5 Canvas
- Support for BMP thermal image format
- Temperature matrix extraction and manipulation
- Multiple color palette options (Iron, Rainbow, Grayscale, etc.)

**Measurement Tools**
- Point markers with temperature readings
- Region tools (rectangle, circle, polygon, line)
- Hotspot and coldspot detection
- Temperature statistics calculation (min, max, average, area)

**Visualization Components**
- Thermal image viewer with interactive overlays
- Real/visual image viewer with fusion modes
- Data table for measurement listings
- Histogram for temperature distribution
- Timeline for time-series analysis

### Template & Storage System

**Template Management** (Supabase Integration)
- Optional Supabase backend for template storage
- Save/load display settings, window layouts, and parameters
- Public and private template support
- Template usage tracking
- Graceful degradation if Supabase is not configured

**Template Data Structure**
- Global thermal parameters (emissivity, ambient temp, humidity, etc.)
- Display settings (palette, zoom, pan, visibility flags)
- Window layout configuration (positions, sizes, grid settings)

### Report Generation

**Export Formats**
- PDF reports (client-side generation)
- HTML reports
- DOCX documents
- CSV data export

**Report Content**
- Project metadata and notes
- Thermal images with overlays
- Measurement markers and regions
- Temperature statistics and parameters
- Customizable sections (toggleable inclusions)

### Electron Desktop Integration

**Desktop Application Support**
- Electron main process setup in `main.js`
- Python backend bundling via PyInstaller
- Backend process spawning from packaged executable
- Platform-specific executable paths (Windows/Linux)
- Build scripts for backend compilation and copying

**Backend Architecture**
- FastAPI Python server for thermal processing
- PyInstaller packaging for standalone distribution
- Hidden imports configuration for FastAPI/Uvicorn dependencies
- Server runs on localhost for client communication

## External Dependencies

### Core Framework & Build Tools
- **Next.js 13.5.1**: React framework with App Router
- **React 18**: UI library
- **TypeScript**: Type safety and development tooling
- **Tailwind CSS**: Utility-first CSS framework
- **PostCSS & Autoprefixer**: CSS processing

### State & Data Management
- **Zustand**: Lightweight state management library
- **@supabase/supabase-js**: Optional cloud database client for template storage

### UI Component Libraries
- **Radix UI**: Headless accessible component primitives
  - Dialog, Dropdown, Popover, Tabs, Toast, and 20+ other components
- **class-variance-authority**: Component variant management
- **clsx & tailwind-merge**: Conditional className utilities
- **cmdk**: Command palette component
- **Lucide React**: Icon library

### Visualization & Charts
- **Recharts**: Chart library for histogram visualization
- **embla-carousel-react**: Carousel/slider component

### Form Handling
- **React Hook Form**: Form state management
- **@hookform/resolvers**: Validation resolver integration
- **Zod** (implied): Schema validation

### Date Utilities
- **date-fns**: Date manipulation and formatting

### Desktop Application
- **Electron**: Desktop application wrapper
- **Python/FastAPI Backend**: Thermal image processing server
  - PyInstaller for executable packaging
  - Uvicorn ASGI server
  - FastAPI web framework

### Development Tools
- **ESLint**: Code linting (Next.js config)
- **@next/swc-wasm-nodejs**: WebAssembly SWC compiler for environments without native bindings

### Build Configuration Notes
- TypeScript and ESLint build errors ignored in production builds
- Image optimization disabled for static export compatibility
- Custom port 5000 for development server
- Host binding to 0.0.0.0 for network access