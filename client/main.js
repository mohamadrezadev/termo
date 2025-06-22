const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs'); // Needed for checking file existence

let backendProcess = null;

// Function to determine the path to the backend executable
function getBackendExecutablePath() {
  // For a packaged app, resourcesPath points to the 'resources' directory.
  // We'll assume the backend executable (or its directory if not onefile)
  // is copied into a 'server_dist' folder within 'resources/app.asar.unpacked' or just 'resources'
  // For development, we point to the PyInstaller output in the server directory.

  const isPackaged = app.isPackaged;
  let baseResourcesPath = isPackaged ? process.resourcesPath : path.join(__dirname, '..'); // Go up to project root in dev

  // In packaged app, pyinstaller output (e.g., 'thermal_api' folder or 'thermal_api.exe')
  // will be in 'app.asar.unpacked/server_dist/' or similar, copied by electron-builder.
  // Let's assume the PyInstaller output directory `thermal_api` (from --name thermal_api --onedir)
  // is copied into a directory called `bundled_backend` at the root of the client package.
  // So, in packaged app: resources/app.asar/ (or resources/app/ for non-asar)
  // and resources/app.asar.unpacked/bundled_backend/thermal_api/thermal_api.exe

  let executablePathInsideBundle;
  if (isPackaged) {
    // Standard location for unpacked executables.
    // We will configure electron-builder to put the 'thermal_api' dir from server/dist
    // into 'server_executable_build' inside the 'app.asar.unpacked' directory.
    baseResourcesPath = path.join(process.resourcesPath, 'app.asar.unpacked', 'server_executable_build');
    if (process.platform === 'win32') {
      executablePathInsideBundle = path.join(baseResourcesPath, 'thermal_api', 'thermal_api.exe');
    } else {
      executablePathInsideBundle = path.join(baseResourcesPath, 'thermal_api', 'thermal_api'); // Assuming --onedir output
    }
  } else {
    // Development: path to pyinstaller output in server/dist/thermal_api/
    if (process.platform === 'win32') {
      executablePathInsideBundle = path.join(baseResourcesPath, 'server', 'dist', 'thermal_api', 'thermal_api.exe');
    } else {
      executablePathInsideBundle = path.join(baseResourcesPath, 'server', 'dist', 'thermal_api', 'thermal_api');
    }
  }
  return executablePathInsideBundle;
}


function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      // preload: path.join(__dirname, 'preload.js'), // Uncomment if you have a preload script
      // webSecurity: process.env.NODE_ENV === 'development' ? false : true, // Disable for dev if facing CORS, but ensure it's on for prod.
    }
  });

  const startURL = app.isPackaged
    ? `file://${path.join(__dirname, 'out', 'index.html')}` // Packaged app loads from file
    : 'http://localhost:3000'; // Development loads from Next.js dev server (or 'out' if preferred)

  if (app.isPackaged) {
    mainWindow.loadFile(path.join(__dirname, 'out', 'index.html'));
  } else {
    // For dev, assuming `npm run dev` (Next.js dev server) is running on port 3000.
    // And client-side code will fetch from Python server at http://localhost:8000
    // The `build:static` and `electron:dev` script loads from `out/index.html` after build.
    // So we should be consistent with that.
    mainWindow.loadFile(path.join(__dirname, 'out', 'index.html'));
    mainWindow.webContents.openDevTools(); // Open DevTools in development
  }


  // mainWindow.webContents.openDevTools(); // Optional: for debugging
}

app.whenReady().then(() => {
  const backendExecutable = getBackendExecutablePath();
  console.log(`[Electron Main] Attempting to start backend from: ${backendExecutable}`);

  if (!fs.existsSync(backendExecutable)) {
      console.error(`[Electron Main] Backend executable not found at: ${backendExecutable}`);
      // If backend is critical, you might want to inform the user and quit.
      // dialog.showErrorBox("Backend Error", `Failed to find backend executable at ${backendExecutable}`);
      // app.quit();
      // return;
      // For now, create window anyway to show frontend if backend is optional or for debugging
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
  } else {
      const backendDir = path.dirname(path.dirname(backendExecutable)); // The 'thermal_api' directory
      console.log(`[Electron Main] Backend executable will run from CWD: ${backendDir}`);

      // Ensure the executable has execute permissions, especially on non-Windows
      if (process.platform !== 'win32') {
          try {
              fs.chmodSync(backendExecutable, '755');
              console.log(`[Electron Main] Ensured execute permissions for ${backendExecutable}`);
          } catch (err) {
              console.error(`[Electron Main] Failed to set execute permissions for backend: ${err}`);
          }
      }

      backendProcess = spawn(backendExecutable, [], { cwd: backendDir, windowsHide: true });

      let windowCreated = false;
      backendProcess.stdout.on('data', (data) => {
        const logMessage = data.toString();
        console.log(`[Backend STDOUT]: ${logMessage.trim()}`);
        if (logMessage.includes("Uvicorn running on http://127.0.0.1:8000") || logMessage.includes("Application startup complete")) {
            if (!windowCreated) {
                console.log("[Electron Main] Backend server started successfully. Creating window.");
                createWindow();
                windowCreated = true;
            }
        }
      });

      backendProcess.stderr.on('data', (data) => {
        console.error(`[Backend STDERR]: ${data.toString().trim()}`);
        // If backend fails critically on startup, you might want to inform user / quit
        // if (!windowCreated && data.toString().includes("ERROR")) {
        //   dialog.showErrorBox("Backend Startup Error", `Error starting backend: ${data.toString()}`);
        //   app.quit();
        // }
      });

      backendProcess.on('close', (code) => {
        console.log(`[Electron Main] Backend process exited with code ${code}`);
        backendProcess = null;
        // Optionally, try to restart or inform the user
      });

      backendProcess.on('error', (err) => {
        console.error('[Electron Main] Failed to start backend process:', err);
        // dialog.showErrorBox("Backend Execution Error", `Failed to start backend process: ${err.message}`);
        // app.quit();
        if (!windowCreated) { // If window hasn't been created yet, try creating it to show potential frontend issues
            createWindow();
            windowCreated = true;
        }
      });
  }

  // Fallback to create window if backend start had issues but didn't quit
  // This timeout gives a bit of time for the backend to attempt to start.
  setTimeout(() => {
    if (BrowserWindow.getAllWindows().length === 0) {
        console.log("[Electron Main] Fallback: Creating window as backend might have issues or no startup message matched.");
        createWindow();
    }
  }, 3000); // Adjust timeout as needed


  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) {
        // Check if backend is running, if not, maybe try to start it or just open window
        if (!backendProcess) {
            console.log("[Electron Main] Activate: Backend not running. Consider restarting or just opening window.");
        }
        createWindow();
    }
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') {
    app.quit(); // This will trigger 'will-quit'
  }
});

app.on('will-quit', async () => {
  if (backendProcess) {
    console.log('[Electron Main] Electron app quitting, attempting to kill backend server...');
    // Attempt graceful shutdown first, then force kill if necessary
    const killed = backendProcess.kill('SIGTERM'); // or 'SIGINT'
    if (killed) {
        console.log('[Electron Main] Sent SIGTERM to backend process.');
        // Wait a bit for graceful shutdown
        await new Promise(resolve => setTimeout(resolve, 1000));
        if (backendProcess && !backendProcess.killed) {
            console.log('[Electron Main] Backend process still alive, forcing kill with SIGKILL.');
            backendProcess.kill('SIGKILL');
        }
    } else {
        console.log('[Electron Main] Failed to send SIGTERM, backend might have already exited or is unresponsive.');
    }
    backendProcess = null;
  }
  console.log('[Electron Main] Quitting now.');
});
