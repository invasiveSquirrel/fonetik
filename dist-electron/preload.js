let electron = require("electron");
//#region electron/preload.ts
electron.contextBridge.exposeInMainWorld("electronAPI", {
	getCards: (language) => electron.ipcRenderer.invoke("get-cards", language),
	playIpa: (text, language) => electron.ipcRenderer.invoke("play-ipa", {
		text,
		language
	}),
	saveCards: (cards) => electron.ipcRenderer.invoke("save-cards", cards),
	evaluateAudio: (audioBlob, language, expectedText) => electron.ipcRenderer.invoke("evaluate-audio", {
		audioBlob,
		language,
		expectedText
	})
});
//#endregion
