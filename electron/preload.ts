import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  getCards: (language: string) => ipcRenderer.invoke('get-cards', language),
  playIpa: (text: string, language: string, speed?: number, isIpa?: boolean) => ipcRenderer.invoke('play-ipa', { text, language, speed, isIpa }),
  saveCards: (cards: any[]) => ipcRenderer.invoke('save-cards', cards),
  evaluateAudio: (audioBlob: Blob, language: string, expectedText: string) => ipcRenderer.invoke('evaluate-audio', { audioBlob, language, expectedText })
});
