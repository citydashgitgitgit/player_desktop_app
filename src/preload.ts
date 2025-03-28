import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electron', {
    getAdObject: () => ipcRenderer.invoke('get-ad-object'),
    checkCurrentPlaylist: (playlist: any) => ipcRenderer.invoke('check-current-playlist', playlist),
})