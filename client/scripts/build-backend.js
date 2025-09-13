// client/scripts/build-backend.js
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const projectRoot = path.join(__dirname, '..', '..');
const serverDir = path.join(projectRoot, 'server');
const distDir = path.join(serverDir, 'dist');

async function buildBackend() {
  console.log('Building Python backend with PyInstaller...');
  
  // Check if server directory exists
  if (!fs.existsSync(serverDir)) {
    console.error(`Server directory not found: ${serverDir}`);
    process.exit(1);
  }

  // Check if requirements are installed
  const requirementsPath = path.join(serverDir, 'requirements.txt');
  if (!fs.existsSync(requirementsPath)) {
    console.error('requirements.txt not found in server directory');
    process.exit(1);
  }

  return new Promise((resolve, reject) => {
    // Build command for PyInstaller
    const buildCommand = process.platform === 'win32' ? 'python' : 'python3';
    const args = [
      '-m', 'PyInstaller',
      'main.py',
      '--name', 'thermal_api',
      '--onedir',
      '--noconsole',
      '--hidden-import=uvicorn.lifespan.on',
      '--hidden-import=uvicorn.lifespan.off',
      '--hidden-import=uvicorn.loops.auto',
      '--hidden-import=uvicorn.protocols.auto',
      '--hidden-import=uvicorn.protocols.http.auto',
      '--hidden-import=uvicorn.protocols.websockets.auto',
      '--hidden-import=fastapi.applications',
      '--hidden-import=fastapi.middleware',
      '--hidden-import=fastapi.routing',
      '--hidden-import=starlette.routing',
      '--hidden-import=pydantic.v1',
      '--collect-submodules=uvicorn',
      '--collect-submodules=fastapi',
      '--collect-submodules=starlette'
    ];

    console.log(`Running: ${buildCommand} ${args.join(' ')}`);
    console.log(`Working directory: ${serverDir}`);

    const buildProcess = spawn(buildCommand, args, {
      cwd: serverDir,
      stdio: 'inherit',
      shell: true
    });

    buildProcess.on('close', (code) => {
      if (code === 0) {
        console.log('Backend build completed successfully!');
        
        // Verify the build output exists
        const expectedOutput = path.join(distDir, 'thermal_api');
        if (fs.existsSync(expectedOutput)) {
          console.log(`Build output verified at: ${expectedOutput}`);
          resolve();
        } else {
          console.error(`Build output not found at expected location: ${expectedOutput}`);
          reject(new Error('Build output verification failed'));
        }
      } else {
        console.error(`Backend build failed with exit code ${code}`);
        reject(new Error(`Build process exited with code ${code}`));
      }
    });

    buildProcess.on('error', (err) => {
      console.error('Failed to start build process:', err);
      reject(err);
    });
  });
}

// Run if called directly
if (require.main === module) {
  buildBackend().catch((err) => {
    console.error('Build failed:', err);
    process.exit(1);
  });
}

module.exports = buildBackend;