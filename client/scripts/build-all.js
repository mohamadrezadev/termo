// scripts/build-all.js
// Complete build script for Windows application

const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

function runCommand(command, description) {
  return new Promise((resolve, reject) => {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`▶ ${description}`);
    console.log(`${'='.repeat(60)}\n`);
    
    const process = exec(command, { maxBuffer: 1024 * 1024 * 10 });
    
    process.stdout.on('data', (data) => {
      console.log(data.toString());
    });
    
    process.stderr.on('data', (data) => {
      console.error(data.toString());
    });
    
    process.on('close', (code) => {
      if (code === 0) {
        console.log(`✓ ${description} completed successfully\n`);
        resolve();
      } else {
        console.error(`✗ ${description} failed with code ${code}\n`);
        reject(new Error(`Command failed: ${command}`));
      }
    });
  });
}

async function buildAll() {
  const startTime = Date.now();
  
  try {
    console.log('🚀 Starting complete build process for Windows...\n');
    
    // Step 1: Build Next.js frontend
    await runCommand('npm run export', 'Building Next.js frontend (static export)');
    
    // Verify frontend build
    const outDir = path.join(__dirname, '..', 'out');
    if (!fs.existsSync(outDir)) {
      throw new Error('Frontend build failed: out/ directory not found');
    }
    console.log('✓ Frontend build verified\n');
    
    // Step 2: Build Python backend
    await runCommand('npm run build:backend', 'Building Python backend with PyInstaller');
    
    // Verify backend build
    const backendDist = path.join(__dirname, '..', '..', 'server', 'dist', 'thermal_api');
    if (!fs.existsSync(backendDist)) {
      throw new Error('Backend build failed: dist/thermal_api directory not found');
    }
    console.log('✓ Backend build verified\n');
    
    // Step 3: Copy backend to temp directory
    await runCommand('npm run copy:backend', 'Copying backend to staging directory');
    
    // Verify backend copy
    const tempBackend = path.join(__dirname, '..', 'dist_backend_temp', 'thermal_api');
    if (!fs.existsSync(tempBackend)) {
      throw new Error('Backend copy failed: dist_backend_temp/thermal_api directory not found');
    }
    console.log('✓ Backend copy verified\n');
    
    // Step 4: Build Electron app
    await runCommand('electron-builder build --win', 'Building Electron application for Windows');
    
    // Verify electron build
    const electronDist = path.join(__dirname, '..', 'dist_electron');
    if (!fs.existsSync(electronDist)) {
      throw new Error('Electron build failed: dist_electron directory not found');
    }
    
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log('\n' + '='.repeat(60));
    console.log('🎉 BUILD COMPLETED SUCCESSFULLY!');
    console.log('='.repeat(60));
    console.log(`⏱  Total time: ${elapsed} seconds`);
    console.log(`📦 Output directory: ${electronDist}`);
    console.log('\nYou can find the following files:');
    console.log('  • Installer: dist_electron/Thermal Analyzer Pro Setup.exe');
    console.log('  • Portable: dist_electron/ThermalAnalyzerPro-Portable.exe');
    console.log('='.repeat(60) + '\n');
    
  } catch (error) {
    console.error('\n❌ Build failed:', error.message);
    process.exit(1);
  }
}

buildAll();