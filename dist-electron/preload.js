import { contextBridge as e, ipcRenderer as t } from "electron";
//#region electron/preload.ts
console.log("Preload script starting...");
try {
	e.exposeInMainWorld("electronAPI", {
		getCards: (e) => t.invoke("get-cards", e),
		playIpa: (e, n) => t.invoke("play-ipa", {
			text: e,
			language: n
		}),
		saveCards: (e) => t.invoke("save-cards", e),
		evaluateAudio: (e, n, r) => t.invoke("evaluate-audio", {
			audioBlob: e,
			language: n,
			expectedText: r
		})
	}), console.log("Preload script finished exposing API");
} catch (e) {
	console.error("Preload script error:", e);
}
//#endregion
