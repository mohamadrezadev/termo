// client/scripts/copy-backend.js
const fs = require('fs-extra');
const path = require('path');

const projectRoot = path.join(__dirname, '..', '..'); // Script is in client/scripts
const backendSourceDir = path.join(projectRoot, 'server', 'dist', 'thermal_api');
// Temp dir inside client, will be created by this script
const backendDestParentDir = path.join(__dirname, '..', 'dist_backend_temp');
const backendDestDir = path.join(backendDestParentDir, 'thermal_api');

async function copyBackend() {
  try {
    if (!fs.existsSync(backendSourceDir)) {
      console.error(`Error: Backend source directory does not exist: ${backendSourceDir}`);
      console.error('Backend not built yet. Run "npm run build:backend" first or ensure PyInstaller build completed successfully.');
      process.exit(1);
    }
    
    // Verify the backend executable exists
    const executableName = process.platform === 'win32' ? 'thermal_api.exe' : 'thermal_api';
    const executablePath = path.join(backendSourceDir, executableName);
    if (!fs.existsSync(executablePath)) {
      console.error(`Backend executable not found: ${executablePath}`);
      console.error('PyInstaller build may have failed. Check the build output.');
      process.exit(1);
    }
    
    console.log(`Ensuring temporary backend destination parent directory exists: ${backendDestParentDir}`);
    await fs.ensureDir(backendDestParentDir); // Create parent if it doesn't exist

    console.log(`Removing old backend temp directory (if exists): ${backendDestDir}`);
    await fs.remove(backendDestDir);

    console.log(`Copying backend from ${backendSourceDir} to ${backendDestDir}`);
    await fs.copy(backendSourceDir, backendDestDir, {
      filter: (src, dest) => {
        // Example filter: skip .pyc files or other unnecessary build artifacts if any
        // For now, copy everything from thermal_api directory
        // const ext = path.extname(src);
        // if (ext === '.pyc') return false;
        return true;
      }
    });
    console.log('Backend copied successfully for Electron build.');
  } catch (err) {
    console.error('Error copying backend files:', err);
    process.exit(1);
  }
}

copyBackend();
