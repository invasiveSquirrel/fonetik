import { BrowserWindow as e, app as t, ipcMain as n } from "electron";
import r from "path";
import { spawn as i } from "child_process";
import a from "sqlite3";
import * as o from "fs";
import { fileURLToPath as s } from "url";
import { SpeechClient as c, protos as l } from "@google-cloud/speech";
import { TextToSpeechClient as u } from "@google-cloud/text-to-speech";
import { GoogleGenerativeAI as d } from "@google/generative-ai";
//#region electron/main.ts
var f = s(import.meta.url), p = r.dirname(f);
t.commandLine.appendSwitch("disable-gpu"), t.commandLine.appendSwitch("disable-software-rasterizer"), t.commandLine.appendSwitch("no-sandbox");
var m = null, h = null, g = null, _ = null, v = null, y = null;
async function b() {
	let e = r.join(t.getPath("userData"), "db");
	o.existsSync(e) || o.mkdirSync(e, {
		mode: 448,
		recursive: !0
	});
	let n = r.join(e, "fonetik.db");
	h = new a.Database(n, (e) => {
		if (e) {
			console.error("Database connection error:", e);
			return;
		}
		h?.serialize(() => {
			h?.run("\n        CREATE TABLE IF NOT EXISTS cards (\n          id INTEGER PRIMARY KEY AUTOINCREMENT,\n          language TEXT,\n          symbol TEXT,\n          voicing TEXT,\n          place TEXT,\n          manner TEXT,\n          height TEXT,\n          backness TEXT,\n          roundedness TEXT,\n          type TEXT,\n          description TEXT,\n          example_word TEXT,\n          example_translation TEXT,\n          example_ipa TEXT,\n          example_word2 TEXT,\n          example_translation2 TEXT,\n          example_ipa2 TEXT,\n          example_word3 TEXT,\n          example_translation3 TEXT,\n          example_ipa3 TEXT,\n          example_sentence TEXT,\n          example_sentence2 TEXT,\n          example_sentence3 TEXT,\n          UNIQUE(language, symbol, example_word)\n        )\n      ", (e) => {
				e ? console.error("Error creating cards table:", e) : console.log("Database initialized or already exists");
			});
		});
	});
	let i = [process.env.GOOGLE_APPLICATION_CREDENTIALS, r.join(r.dirname(t.getPath("userData")), "panglossia", "google-credentials.json")].filter((e) => typeof e == "string" && o.existsSync(e));
	i.length > 0 && (process.env.GOOGLE_APPLICATION_CREDENTIALS = i[0]), g = new u(), _ = new c();
}
var x = class {
	constructor(e = 500, t = 3e5) {
		this.maxSize = e, this.ttlMs = t, this.map = /* @__PURE__ */ new Map();
	}
	get(e) {
		let t = this.map.get(e);
		return t ? Date.now() - t.timestamp > this.ttlMs ? (this.map.delete(e), null) : t.data : null;
	}
	set(e, t) {
		if (this.map.size >= this.maxSize) {
			let e = [...this.map.entries()].sort((e, t) => e[1].timestamp - t[1].timestamp)[0];
			this.map.delete(e[0]);
		}
		this.map.set(e, {
			data: t,
			timestamp: Date.now()
		});
	}
	clear() {
		this.map.clear();
	}
}, S = new x(100, 300 * 1e3), C = new x(500, 3600 * 1e3), w = class {
	constructor(e) {
		this.maxPerMinute = e, this.callTimes = /* @__PURE__ */ new Map();
	}
	check(e) {
		let t = Date.now(), n = t - 6e4, r = (this.callTimes.get(e) || []).filter((e) => e > n);
		return r.length >= this.maxPerMinute ? !1 : (r.push(t), this.callTimes.set(e, r), !0);
	}
}, T = new w(30), E = new w(15), D = [
	"English (North American)",
	"English (Received Pronunciation)",
	"English (Australian)",
	"English (Scottish)",
	"Dutch (Netherlands)",
	"Dutch (Flemish)",
	"German (Northern)",
	"German (Austrian)",
	"German (Swiss)",
	"Spanish (Spain)",
	"Spanish (Mexican)",
	"Spanish (Argentinian)",
	"Spanish (Colombian)",
	"Spanish (Chilean)",
	"Spanish (Cuban)",
	"Portuguese (Brazilian)",
	"Portuguese (European)",
	"Swedish (Stockholm)",
	"Swedish (Skåne)",
	"Swedish (Finland)",
	"Finnish (Helsinki)",
	"Scottish Gaelic"
];
function O(e) {
	if (typeof e != "string" || !D.includes(e)) throw Error("Invalid language");
	return e;
}
function k(e) {
	return e.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}
function A() {
	let e = process.env.GOOGLE_API_KEY;
	if (!e || e.length < 10) throw Error("GOOGLE_API_KEY not configured");
	return e;
}
function j() {
	return y ||= (v = new d(A()), v.getGenerativeModel({ model: "gemini-2.0-flash" })), y;
}
function M() {
	m = new e({
		width: 1200,
		height: 900,
		frame: !1,
		autoHideMenuBar: !0,
		backgroundColor: "#0f172a",
		webPreferences: {
			preload: r.join(p, "preload.js"),
			nodeIntegration: !1,
			contextIsolation: !0,
			sandbox: !1
		}
	}), m.loadFile(r.join(p, "../dist/index.html")), m.on("closed", () => {
		m = null;
	});
}
t.on("ready", async () => {
	await b(), M();
}), t.on("window-all-closed", () => {
	process.platform !== "darwin" && (h && h.close(), t.quit());
}), n.handle("get-cards", async (e, t) => {
	try {
		if (!(e.senderFrame?.url || e.sender?.getURL?.() || "").startsWith("file://")) throw Error("Unauthorized origin");
		let n = O(t), r = S.get(n);
		if (r) return r;
		let i = h;
		if (!i) throw Error("Database not initialized");
		let a = await new Promise((e, t) => {
			i.all("SELECT * FROM cards WHERE language = ? LIMIT 1000", [n], (n, r) => {
				n ? t(n) : e(r);
			});
		}) || [];
		return S.set(n, a), a;
	} catch (e) {
		throw Error(e?.message || "Failed to get cards");
	}
}), n.handle("play-ipa", async (e, { text: t, language: n, speed: r, isIpa: a }) => {
	let o = r || 1;
	console.log(`IPC play-ipa: text="${t}", lang="${n}", speed=${o}, isIpa=${a}`);
	try {
		if (!(e.senderFrame?.url || e.sender?.getURL?.() || "").startsWith("file://")) throw Error("Unauthorized origin");
		if (!T.check("play-ipa")) throw Error("Rate limit exceeded");
		if (typeof t != "string" || t.length === 0 || t.length > 500) throw Error("Invalid text");
		let r = O(n), s = /[ɑʋɛɪɔʊæøœʉɟʝɲŋʃʒθðɬɮɹɻɥɰʁˈˌ]/.test(t), c = t.startsWith("[") && t.endsWith("]") || s || r === "Scottish Gaelic", l = a === void 0 ? c : a, u = t.replace(/(^\[|\]$)/g, "").trim(), d = `${r}::${o}::${l}::${u}`, f = C.get(d);
		if (f) return f;
		let p = {
			"English (North American)": {
				languageCode: "en-US",
				name: "en-US-Chirp3-HD-Dione"
			},
			"English (Received Pronunciation)": {
				languageCode: "en-GB",
				name: "en-GB-Chirp3-HD-Calliope"
			},
			"English (Australian)": {
				languageCode: "en-AU",
				name: "en-AU-Neural2-A"
			},
			"English (Scottish)": {
				languageCode: "en-GB",
				name: "en-GB-Neural2-B"
			},
			"Dutch (Netherlands)": {
				languageCode: "nl-NL",
				name: "nl-NL-Chirp3-HD-Despina"
			},
			"Dutch (Flemish)": {
				languageCode: "nl-BE",
				name: "nl-BE-Wavenet-A"
			},
			"German (Northern)": {
				languageCode: "de-DE",
				name: "de-DE-Chirp3-HD-Leda"
			},
			"German (Austrian)": {
				languageCode: "de-AT",
				name: "de-AT-Wavenet-A"
			},
			"German (Swiss)": {
				languageCode: "de-CH",
				name: "de-CH-Wavenet-A"
			},
			"Spanish (Spain)": {
				languageCode: "es-ES",
				name: "es-ES-Chirp3-HD-Callirrhoe"
			},
			"Spanish (Mexican)": {
				languageCode: "es-MX",
				name: "es-MX-Chirp3-HD-Dione"
			},
			"Spanish (Argentinian)": {
				languageCode: "es-AR",
				name: "es-AR-Neural2-A"
			},
			"Spanish (Colombian)": {
				languageCode: "es-CO",
				name: "es-CO-Neural2-A"
			},
			"Spanish (Chilean)": {
				languageCode: "es-CL",
				name: "es-CL-Neural2-A"
			},
			"Spanish (Cuban)": {
				languageCode: "es-US",
				name: "es-US-Chirp3-HD-Callirrhoe"
			},
			"Portuguese (Brazilian)": {
				languageCode: "pt-BR",
				name: "pt-BR-Chirp3-HD-Dione"
			},
			"Portuguese (European)": {
				languageCode: "pt-PT",
				name: "pt-PT-Wavenet-A"
			},
			"Swedish (Stockholm)": {
				languageCode: "sv-SE",
				name: "sv-SE-Chirp3-HD-Laomedeia"
			},
			"Swedish (Skåne)": {
				languageCode: "sv-SE",
				name: "sv-SE-Neural2-C"
			},
			"Swedish (Finland)": {
				languageCode: "sv-SE",
				name: "sv-SE-Neural2-C"
			},
			"Finnish (Helsinki)": {
				languageCode: "fi-FI",
				name: "fi-FI-Chirp3-HD-Despina"
			},
			"Scottish Gaelic": {
				languageCode: "en-GB",
				name: "en-GB-Standard-A"
			}
		}[r] || {
			languageCode: "en-US",
			name: "en-US-Chirp3-HD-Dione"
		}, m = p.languageCode || "en-US";
		try {
			if (!g) throw Error("TTS Client not initialized");
			let e;
			if (l) {
				let t = k(u);
				e = `<speak xml:lang="${m}"><phoneme alphabet="ipa" ph="${t}">${t}</phoneme></speak>`;
			} else e = `<speak xml:lang="${m}">${k(u)}</speak>`;
			console.log(`[play-ipa] TTS Request (${m}): ${e}`);
			let [t] = await g.synthesizeSpeech({
				input: { ssml: e },
				voice: {
					languageCode: m,
					name: p.name
				},
				audioConfig: {
					audioEncoding: "MP3",
					speakingRate: o
				}
			}), n = Buffer.from(t.audioContent || Buffer.alloc(0));
			if (n.length > 0) return C.set(d, n), n;
			throw Error("Empty audio content");
		} catch (e) {
			console.warn(`[play-ipa] Google TTS failure: ${e.message}`);
			let t = {
				"en-us": "en-us",
				"en-gb": "en-gb",
				de: "de",
				nl: "nl",
				es: "es",
				pt: "pt",
				fi: "fi",
				sv: "sv"
			}, n = "en-gb", a = r.toLowerCase();
			a.includes("german") ? n = t.de : a.includes("dutch") ? n = t.nl : a.includes("spanish") ? n = t.es : a.includes("portuguese") ? n = t.pt : a.includes("finnish") ? n = t.fi : a.includes("swedish") ? n = t.sv : a.includes("english") && a.includes("north american") && (n = t["en-us"]);
			let s = l ? `[[${u}]]` : u, c = Math.round(150 * o);
			return new Promise((e, t) => {
				let r = i("espeak-ng", [
					"-v",
					n,
					"-s",
					String(c),
					"--stdout",
					s
				]), a = Buffer.alloc(0);
				r.stdout.on("data", (e) => a = Buffer.concat([a, e])), r.on("close", (n) => {
					n === 0 ? (C.set(d, a), e(a)) : t(/* @__PURE__ */ Error("espeak-ng failed"));
				}), r.on("error", (e) => t(/* @__PURE__ */ Error("Failed to start espeak-ng")));
			});
		}
	} catch (e) {
		throw Error(e?.message || "Failed to play audio");
	}
}), n.handle("evaluate-audio", async (e, { audioBlob: t, language: n, expectedText: r }) => {
	try {
		if (!(e.senderFrame?.url || e.sender?.getURL?.() || "").startsWith("file://")) throw Error("Unauthorized origin");
		if (!E.check("evaluate-audio")) throw Error("Rate limit exceeded");
		if (!(t instanceof Uint8Array)) throw Error("Invalid audio data");
		let i = O(n), a = Buffer.from(t), o = {
			es: "es-US",
			de: "de-DE",
			pt: "pt-BR",
			nl: "nl-NL",
			sv: "sv-SE",
			fi: "fi-FI"
		}, s = "en-US", c = i.toLowerCase();
		for (let [e, t] of Object.entries(o)) if (c.includes(e)) {
			s = t;
			break;
		}
		if (!_) throw Error("Speech client not initialized");
		let [u] = await _.recognize({
			audio: { content: a },
			config: {
				encoding: l.google.cloud.speech.v1.RecognitionConfig.AudioEncoding.WEBM_OPUS,
				sampleRateHertz: 48e3,
				languageCode: s
			}
		}), d = u.results?.map((e) => e.alternatives?.[0].transcript).join("\n") || "[No speech]", f = j(), p = `User practiced "${r}" in ${i}. Recognized: "${d}". Give 1-2 sentences of phonetic advice.`;
		return {
			transcription: d,
			feedback: (await f.generateContent(p)).response.text()
		};
	} catch {
		return {
			transcription: "Error",
			feedback: "Evaluation failed"
		};
	}
}), n.handle("save-cards", async (e, t) => {
	try {
		if (!(e.senderFrame?.url || e.sender?.getURL?.() || "").startsWith("file://")) throw Error("Unauthorized origin");
		if (!Array.isArray(t)) throw Error("Cards must be an array");
		return new Promise((e, n) => {
			let r = h;
			if (!r) throw Error("DB not initialized");
			r.serialize(() => {
				let n = 0;
				t.forEach((e) => {
					r.run("INSERT OR REPLACE INTO cards \n            (language, symbol, type, voicing, place, manner, height, backness, roundedness, description, \n             example_word, example_translation, example_ipa, example_word2, example_translation2, example_ipa2, \n             example_word3, example_translation3, example_ipa3, example_sentence, example_sentence2, example_sentence3) \n            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [
						e.language,
						e.symbol,
						e.type,
						e.voicing,
						e.place,
						e.manner,
						e.height,
						e.backness,
						e.roundedness,
						e.description,
						e.example_word,
						e.example_translation,
						e.example_ipa,
						e.example_word2,
						e.example_translation2,
						e.example_ipa2,
						e.example_word3,
						e.example_translation3,
						e.example_ipa3,
						e.example_sentence,
						e.example_sentence2,
						e.example_sentence3
					], (e) => {
						e || n++;
					});
				}), setTimeout(() => {
					S.clear(), e({ saved: n });
				}, 500);
			});
		});
	} catch {
		throw Error("Save failed");
	}
});
//#endregion
