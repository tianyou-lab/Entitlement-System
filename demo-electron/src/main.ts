import { app, BrowserWindow, ipcMain } from 'electron';
import { join } from 'path';
import { LicenseClient } from '@entitlement/sdk-electron';
import { createDemoConfig } from './demo-config';
import { isUsableStatus, toDemoLicenseView } from './license-status';

let mainWindow: BrowserWindow | null = null;
let licenseWindow: BrowserWindow | null = null;
let license: LicenseClient;

async function bootstrap() {
  const config = createDemoConfig();
  license = new LicenseClient({
    apiBaseUrl: config.apiBaseUrl,
    productCode: config.productCode,
    appVersion: config.appVersion,
    storagePath: config.storagePath,
    heartbeatIntervalMs: config.heartbeatIntervalMs,
    requestSigningSecret: config.requestSigningSecret,
  });

  registerIpc(config);
  await createMainWindow();
  const state = await license.verifyOnStartup();
  if (isUsableStatus(state.status)) {
    license.startHeartbeat();
  } else {
    await openLicenseWindow(config);
  }
}

async function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 880,
    height: 680,
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (process.env.DEMO_RENDERER_URL) {
    await mainWindow.loadURL(process.env.DEMO_RENDERER_URL);
  } else {
    await mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }
}

function registerIpc(config: ReturnType<typeof createDemoConfig>) {
  ipcMain.handle('license:getState', () => view());
  ipcMain.handle('license:verify', async () => {
    const state = await license.verifyOnStartup();
    if (isUsableStatus(state.status)) license.startHeartbeat();
    return view();
  });
  ipcMain.handle('license:startHeartbeat', () => {
    license.startHeartbeat();
    return view();
  });
  ipcMain.handle('license:stopHeartbeat', () => {
    license.stopHeartbeat();
    return view();
  });
  ipcMain.handle('license:activate', async (_event, licenseKey: string) => {
    await license.activate(licenseKey);
    license.startHeartbeat();
    licenseWindow?.close();
    licenseWindow = null;
    mainWindow?.webContents.send('license:changed', view());
    return { ok: true };
  });
  ipcMain.handle('license:deactivate', async (_event, licenseKey: string) => {
    await license.deactivate(licenseKey);
    license.stopHeartbeat();
    mainWindow?.webContents.send('license:changed', view());
    return view();
  });
  ipcMain.handle('license:hasFeature', (_event, key: string) => license.hasFeature(key));
  ipcMain.handle('license:getLimit', (_event, key: string) => license.getLimit(key));
  ipcMain.handle('license:openLicenseWindow', () => openLicenseWindow(config));
}

async function openLicenseWindow(config: ReturnType<typeof createDemoConfig>) {
  if (licenseWindow && !licenseWindow.isDestroyed()) {
    licenseWindow.focus();
    return;
  }

  const url = new URL(config.licenseUiUrl);
  url.searchParams.set('productName', 'Demo App');
  url.searchParams.set('primaryColor', '#2563eb');

  licenseWindow = new BrowserWindow({
    width: 460,
    height: 620,
    parent: mainWindow ?? undefined,
    modal: Boolean(mainWindow),
    resizable: false,
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  licenseWindow.on('closed', () => {
    licenseWindow = null;
  });
  await licenseWindow.loadURL(url.toString());
}

function view() {
  return toDemoLicenseView(license.getState(), (key) => license.hasFeature(key), (key) => license.getLimit(key));
}

app.whenReady().then(() => void bootstrap());
app.on('window-all-closed', () => {
  license?.stopHeartbeat();
  if (process.platform !== 'darwin') app.quit();
});
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) void createMainWindow();
});
