import { contextBridge as e, ipcRenderer as t } from "electron";
//#region electron/preload.ts
e.exposeInMainWorld("electronAPI", {
	getCards: (e) => t.invoke("get-cards", e),
	playIpa: (e, n, r, i) => t.invoke("play-ipa", {
		text: e,
		language: n,
		speed: r,
		isIpa: i
	}),
	saveCards: (e) => t.invoke("save-cards", e),
	evaluateAudio: (e, n, r) => t.invoke("evaluate-audio", {
		audioBlob: e,
		language: n,
		expectedText: r
	})
});
//#endregion
