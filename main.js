'use strict';

const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const store = require('./src/store');
const exportLib = require('./src/export');

let win = null;

function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 980,
    minHeight: 640,
    backgroundColor: '#0b0f14',
    autoHideMenuBar: true,
    title: 'Paletteforge',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  if (process.env.PALETTEFORGE_DEBUG) {
    win.webContents.on('console-message', (_e, level, message, line, sourceId) => {
      console.log(`RENDERER-CONSOLE[${level}] ${sourceId}:${line} ${message}`);
    });
  }

  // Boot verification hook (used by CI / smoke checks): PALETTEFORGE_SMOKE=1 npm start
  // prints a JSON snapshot of the booted UI and exits.
  if (process.env.PALETTEFORGE_SMOKE) {
    win.webContents.once('did-finish-load', () => {
      setTimeout(async () => {
        try {
          const snap = await win.webContents.executeJavaScript(`({
            color: typeof window.PaletteforgeColor,
            kmeans: typeof window.PaletteforgeKMeans,
            exportLib: typeof window.PaletteforgeExport,
            fonts: typeof window.PaletteforgeFonts,
            bridge: typeof window.paletteforge,
            tabs: document.querySelectorAll('.tab').length,
            title: document.title,
          })`);
          console.log('SMOKE:' + JSON.stringify(snap));
        } catch (err) {
          console.log('SMOKE-ERROR:' + err.message);
        }
        app.exit(0);
      }, 1200);
    });
  }
}

// ---------- data IPC ----------

const userDir = () => app.getPath('userData');

ipcMain.handle('data:load', () => store.load(userDir()));
ipcMain.handle('data:save', (_e, data) => {
  store.save(userDir(), store.normalize(data));
  return true;
});

// ---------- file dialogs ----------

ipcMain.handle('dialog:pickLogo', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog(win, {
    title: 'Choose a logo file',
    properties: ['openFile'],
    filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'svg', 'webp', 'gif'] }],
  });
  if (canceled || !filePaths.length) return { ok: false, canceled: true };
  return { ok: true, path: filePaths[0] };
});

// ---------- export ----------

ipcMain.handle('export:text', async (_e, { content, defaultPath, filterName, extensions, title }) => {
  const { canceled, filePath } = await dialog.showSaveDialog(win, {
    title: title || 'Export',
    defaultPath,
    filters: [{ name: filterName || 'File', extensions: extensions || ['txt'] }],
  });
  if (canceled || !filePath) return { ok: false, canceled: true };
  fs.writeFileSync(filePath, content, 'utf8');
  return { ok: true, path: filePath };
});

// ASE writer uses Node's Buffer (via src/export.js), which isn't available
// in the sandboxed renderer — run it here in the main process instead.
ipcMain.handle('export:ase', async (_e, { palette, defaultPath }) => {
  const { canceled, filePath } = await dialog.showSaveDialog(win, {
    title: 'Export ASE (Adobe Swatch Exchange)',
    defaultPath: defaultPath || 'paletteforge-palette.ase',
    filters: [{ name: 'Adobe Swatch Exchange', extensions: ['ase'] }],
  });
  if (canceled || !filePath) return { ok: false, canceled: true };
  const buf = exportLib.toASE(palette);
  fs.writeFileSync(filePath, buf);
  return { ok: true, path: filePath };
});

ipcMain.handle('export:binary', async (_e, { bytes, defaultPath, filterName, extensions, title }) => {
  const { canceled, filePath } = await dialog.showSaveDialog(win, {
    title: title || 'Export',
    defaultPath,
    filters: [{ name: filterName || 'File', extensions: extensions || ['bin'] }],
  });
  if (canceled || !filePath) return { ok: false, canceled: true };
  fs.writeFileSync(filePath, Buffer.from(bytes));
  return { ok: true, path: filePath };
});

ipcMain.handle('export:png', async (_e, { dataUrl, defaultPath, title }) => {
  const { canceled, filePath } = await dialog.showSaveDialog(win, {
    title: title || 'Export palette card (PNG)',
    defaultPath,
    filters: [{ name: 'PNG Image', extensions: ['png'] }],
  });
  if (canceled || !filePath) return { ok: false, canceled: true };
  const base64 = dataUrl.replace(/^data:image\/png;base64,/, '');
  fs.writeFileSync(filePath, Buffer.from(base64, 'base64'));
  return { ok: true, path: filePath };
});

ipcMain.handle('data:importJSON', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog(win, {
    title: 'Import Paletteforge data',
    filters: [{ name: 'JSON', extensions: ['json'] }],
    properties: ['openFile'],
  });
  if (canceled || !filePaths.length) return { ok: false, canceled: true };
  try {
    const data = store.importJSON(fs.readFileSync(filePaths[0], 'utf8'));
    store.save(userDir(), data);
    return { ok: true, data };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

app.whenReady().then(() => {
  if (process.platform === 'win32') app.setAppUserModelId('com.bensblueprints.paletteforge');
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
