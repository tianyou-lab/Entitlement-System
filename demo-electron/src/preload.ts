import { contextBridge, ipcRenderer } from 'electron';

const licenseApi = {
  getState: () => ipcRenderer.invoke('license:getState'),
  verify: () => ipcRenderer.invoke('license:verify'),
  startHeartbeat: () => ipcRenderer.invoke('license:startHeartbeat'),
  stopHeartbeat: () => ipcRenderer.invoke('license:stopHeartbeat'),
  deactivate: (licenseKey: string) => ipcRenderer.invoke('license:deactivate', licenseKey),
  hasFeature: (key: string) => ipcRenderer.invoke('license:hasFeature', key),
  getLimit: (key: string) => ipcRenderer.invoke('license:getLimit', key),
  openLicenseWindow: () => ipcRenderer.invoke('license:openLicenseWindow'),
  onChanged: (handler: (state: unknown) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, state: unknown) => handler(state);
    ipcRenderer.on('license:changed', listener);
    return () => ipcRenderer.removeListener('license:changed', listener);
  },
};

contextBridge.exposeInMainWorld('demoLicense', licenseApi);
contextBridge.exposeInMainWorld('licenseBridge', {
  activate: async (licenseKey: string) => {
    try {
      return await ipcRenderer.invoke('license:activate', licenseKey);
    } catch (error) {
      return { ok: false, code: 'ACTIVATE_FAILED', message: error instanceof Error ? error.message : '激活失败' };
    }
  },
  getState: () => ipcRenderer.invoke('license:getState'),
});
