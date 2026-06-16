const { app, BrowserWindow } = require('electron');
const path = require('path');

const isDev = !!process.env.ELECTRON_START_URL;

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 640,
    autoHideMenuBar: true,
    backgroundColor: '#EAF9FD',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (isDev) {
    mainWindow.loadURL(process.env.ELECTRON_START_URL);
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    const entryFile = path.join(__dirname, '..', 'dist', 'index.html');
    mainWindow.loadFile(entryFile);
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
