export interface LicenseWindowOptions {
  BrowserWindow?: new (options: Record<string, unknown>) => { loadURL(url: string): Promise<void> | void; on?(event: string, listener: () => void): void };
  uiUrl: string;
  width?: number;
  height?: number;
  productName?: string;
  primaryColor?: string;
}

export function createLicenseWindow(options: LicenseWindowOptions) {
  const url = new URL(options.uiUrl);
  if (options.productName) url.searchParams.set('productName', options.productName);
  if (options.primaryColor) url.searchParams.set('primaryColor', options.primaryColor);

  const windowOptions = {
    width: options.width ?? 460,
    height: options.height ?? 620,
    resizable: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  };

  if (!options.BrowserWindow) {
    return { url: url.toString(), options: windowOptions };
  }

  const win = new options.BrowserWindow(windowOptions);
  void win.loadURL(url.toString());
  return { window: win, url: url.toString(), options: windowOptions };
}

export function licenseBridgePreloadSource() {
  return `const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('licenseBridge', {
  activate: (licenseKey) => ipcRenderer.invoke('license:activate', licenseKey),
  getState: () => ipcRenderer.invoke('license:getState')
});`;
}
