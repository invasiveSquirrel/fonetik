import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  getCards: (language: string) => ipcRenderer.invoke('get-cards', language),
  playIpa: (text: string, language: string) => ipcRenderer.invoke('play-ipa', { text, language }),
  saveCards: (cards: any[]) => ipcRenderer.invoke('save-cards', cards),
  evaluateAudio: (audioBlob: Blob, language: string, expectedText: string) => ipcRenderer.invoke('evaluate-audio', { audioBlob, language, expectedText })
});
