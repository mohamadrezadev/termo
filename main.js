const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let backendProcess = null;
const backendDir = path.join(__dirname, 'bmp-extractor-server');
const backendScript = path.join(backendDir, 'index.js');

function createWindow() {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js') // Assuming a preload.js might be added later
    }
  });

  // Load the Next.js static export
  const indexPath = path.join(__dirname, 'out', 'index.html');
  mainWindow.loadFile(indexPath); // Use loadFile for local HTML files

  // Open the DevTools.
  // mainWindow.webContents.openDevTools();
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  console.log('App ready, starting backend server...');
  backendProcess = spawn('node', [backendScript], { cwd: backendDir });

  backendProcess.stdout.on('data', (data) => {
    console.log(`Backend STDOUT: ${data}`);
  });

  backendProcess.stderr.on('data', (data) => {
    console.error(`Backend STDERR: ${data}`);
  });

  backendProcess.on('close', (code) => {
    console.log(`Backend process exited with code ${code}`);
    backendProcess = null; // Clear the reference
  });

  backendProcess.on('error', (err) => {
    console.error('Failed to start backend process:', err);
    // Optionally, quit the app or show an error dialog
    // app.quit();
  });

  createWindow();

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('will-quit', () => {
  if (backendProcess) {
    console.log('Electron app quitting, killing backend server...');
    backendProcess.kill();
    backendProcess = null;
  }
});

// In this file, you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
