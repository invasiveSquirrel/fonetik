import { contextBridge, ipcRenderer } from "electron";
//#region electron/preload.ts
contextBridge.exposeInMainWorld("electronAPI", {
	getCards: (language) => ipcRenderer.invoke("get-cards", language),
	playIpa: (text, language, speed, isIpa) => ipcRenderer.invoke("play-ipa", {
		text,
		language,
		speed,
		isIpa
	}),
	saveCards: (cards) => ipcRenderer.invoke("save-cards", cards),
	evaluateAudio: (audioBlob, language, expectedText) => ipcRenderer.invoke("evaluate-audio", {
		audioBlob,
		language,
		expectedText
	})
});
//#endregion
