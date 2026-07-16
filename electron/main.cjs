const { app, BrowserWindow, ipcMain, shell, session } = require('electron');
const path = require('node:path');
const fs = require('node:fs');

// Some GPU/driver combinations render the camera preview as a solid green
// (or pink) frame in Electron/Chromium due to a hardware video decode bug.
// Disabling GPU acceleration forces the software path and avoids it. This
// must be called before the app is ready.
app.disableHardwareAcceleration();

let mainWindow;

function sanitizeSegment(name) {
  return String(name || '')
    .replace(/[\\/:*?"<>|]+/g, '_')
    .trim() || '未命名';
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 800,
    minWidth: 480,
    title: '制药用水设备展会客户收集',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false, // allow preload to use ipcRenderer via contextBridge
    },
  });

  const indexPath = path.join(__dirname, '..', 'dist', 'index.html');
  mainWindow.loadFile(indexPath);
}

app.whenReady().then(() => {
  // Explicitly allow camera (and mic, unused but harmless) access requests
  // from the renderer, so getUserMedia() is never silently blocked even if
  // Electron's default permission behavior changes between versions.
  session.defaultSession.setPermissionRequestHandler((_webContents, permission, callback) => {
    if (permission === 'media') {
      callback(true);
    } else {
      callback(false);
    }
  });
  session.defaultSession.setPermissionCheckHandler((_webContents, permission) => {
    return permission === 'media';
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// Saves a base64-encoded file into:
//   <Downloads>/<exhibitionFolder>/<dateFolder>/<filename>
// Returns { success, fullPath, error? }
ipcMain.handle('save-docx-to-downloads', async (_event, payload) => {
  try {
    const { base64Data, exhibitionFolder, dateFolder, filename } = payload;
    const downloadsDir = app.getPath('downloads');
    const targetDir = path.join(
      downloadsDir,
      sanitizeSegment(exhibitionFolder),
      sanitizeSegment(dateFolder)
    );
    fs.mkdirSync(targetDir, { recursive: true });
    const fullPath = path.join(targetDir, filename);
    const buffer = Buffer.from(base64Data, 'base64');
    fs.writeFileSync(fullPath, buffer);
    return { success: true, fullPath };
  } catch (err) {
    return { success: false, error: String(err && err.message ? err.message : err) };
  }
});

// Lets the renderer reveal the saved file in Windows Explorer.
ipcMain.handle('show-file-in-folder', async (_event, fullPath) => {
  shell.showItemInFolder(fullPath);
  return true;
});
