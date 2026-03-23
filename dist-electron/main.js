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
			h?.run("\n        CREATE TABLE IF NOT EXISTS cards (\n          id INTEGER PRIMARY KEY AUTOINCREMENT,\n          language TEXT,\n          symbol TEXT,\n          voicing TEXT,\n          place TEXT,\n          manner TEXT,\n          height TEXT,\n          backness TEXT,\n          roundedness TEXT,\n          type TEXT,\n          description TEXT,\n          example_word TEXT,\n          example_translation TEXT,\n          example_ipa TEXT,\n          example_word2 TEXT,\n          example_translation2 TEXT,\n          example_ipa2 TEXT,\n          example_word3 TEXT,\n          example_translation3 TEXT,\n          example_ipa3 TEXT,\n          UNIQUE(language, symbol, example_word)\n        )\n      ", (e) => {
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
	reset(e) {
		this.callTimes.delete(e);
	}
}, T = new w(30), E = new w(15), D = [
	"English (North American)",
	"English (Received Pronunciation)",
	"English (Australian)",
	"English (Scottish)",
	"English (Cockney)",
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
	process.platform !== "darwin" && (h && h.close((e) => {
		e && console.error("Database close error");
	}), t.quit());
}), n.handle("get-cards", async (e, t) => {
	try {
		if (!e.senderFrame.url.startsWith("file://")) throw Error("Unauthorized origin");
		let n = O(t);
		return S.get(n) || new Promise((e, t) => {
			h.all("SELECT * FROM cards WHERE language = ? LIMIT 1000", [n], (r, i) => {
				if (r) {
					t(/* @__PURE__ */ Error("Database query failed"));
					return;
				}
				let a = i || [];
				S.set(n, a), e(a);
			});
		});
	} catch (e) {
		throw Error(e?.message || "Failed to get cards");
	}
}), n.handle("play-ipa", async (e, { text: t, language: n }) => {
	try {
		if (!e.senderFrame.url.startsWith("file://")) throw Error("Unauthorized origin");
		if (!T.check("play-ipa")) throw Error("Rate limit exceeded. Please wait before trying again.");
		if (typeof t != "string" || t.length === 0 || t.length > 500) throw Error("Invalid text parameter");
		let r = O(n), a = `${r}::${t}`, o = C.get(a);
		if (o) return o;
		let s = {
			"English (North American)": {
				languageCode: "en-US",
				name: "en-US-Journey-F"
			},
			"English (Received Pronunciation)": {
				languageCode: "en-GB",
				name: "en-GB-Chirp3-HD-Calliope"
			},
			"English (Australian)": {
				languageCode: "en-AU",
				name: "en-AU-Chirp3-HD-Dione"
			},
			"English (Scottish)": {
				languageCode: "en-GB",
				name: "en-GB-Chirp3-HD-Calliope"
			},
			"English (Cockney)": {
				languageCode: "en-GB",
				name: "en-GB-Chirp3-HD-Calliope"
			},
			"Dutch (Netherlands)": {
				languageCode: "nl-NL",
				name: "nl-NL-Chirp3-HD-Despina"
			},
			"Dutch (Flemish)": {
				languageCode: "nl-BE",
				name: "nl-BE-Standard-A"
			},
			"German (Northern)": {
				languageCode: "de-DE",
				name: "de-DE-Chirp3-HD-Leda"
			},
			"German (Austrian)": {
				languageCode: "de-AT",
				name: "de-AT-Standard-A"
			},
			"German (Swiss)": {
				languageCode: "de-CH",
				name: "de-CH-Standard-A"
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
				name: "es-AR-Standard-A"
			},
			"Spanish (Colombian)": {
				languageCode: "es-CO",
				name: "es-CO-Standard-A"
			},
			"Spanish (Chilean)": {
				languageCode: "es-CL",
				name: "es-CL-Standard-A"
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
				name: "pt-PT-Standard-A"
			},
			"Swedish (Stockholm)": {
				languageCode: "sv-SE",
				name: "sv-SE-Chirp3-HD-Laomedeia"
			},
			"Swedish (Skåne)": {
				languageCode: "sv-SE",
				name: "sv-SE-Chirp3-HD-Laomedeia"
			},
			"Swedish (Finland)": {
				languageCode: "sv-SE",
				name: "sv-SE-Chirp3-HD-Laomedeia"
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
			name: "en-US-Journey-F"
		}, c = /[ɑʋɛɪɔʊæøœʉɟʝɲŋʃʒθðɬɮɹɻɥɰʁˈˌ]/.test(t), l = t.startsWith("[") && t.endsWith("]") || c || r === "Scottish Gaelic", u = t.replace(/[\[\]]/g, "");
		try {
			let e;
			if (l) {
				let t = k(u);
				e = { ssml: `<speak><phoneme alphabet="ipa" ph="${t}">${t}</phoneme></speak>` };
			} else e = { text: t };
			let [n] = await g.synthesizeSpeech({
				input: e,
				voice: s,
				audioConfig: { audioEncoding: "MP3" }
			}), r = Buffer.from(n.audioContent);
			return C.set(a, r), r;
		} catch {
			let e = {
				"en-us": "en-us",
				"en-gb": "en-gb",
				de: "de",
				nl: "nl",
				es: "es",
				pt: "pt",
				fi: "fi",
				sv: "sv",
				gd: "gd"
			}, t = "en-gb", n = r.toLowerCase();
			n.includes("english") && n.includes("north american") ? t = e["en-us"] : n.includes("english") ? t = e["en-gb"] : n.includes("german") ? t = e.de : n.includes("dutch") ? t = e.nl : n.includes("spanish") ? t = e.es : n.includes("portuguese") ? t = e.pt : n.includes("finnish") ? t = e.fi : n.includes("swedish") ? t = e.sv : n.includes("gaelic") && (t = e.gd);
			let o = `[[${u}]]`;
			return new Promise((e, n) => {
				let r = i("espeak-ng", [
					"-v",
					t,
					"-s",
					"150",
					"--stdout",
					o
				]), s = Buffer.alloc(0);
				r.stdout.on("data", (e) => {
					s = Buffer.concat([s, e]);
				}), r.on("close", (t) => {
					t === 0 ? (C.set(a, s), e(s)) : n(/* @__PURE__ */ Error("espeak-ng synthesis failed"));
				}), r.on("error", (e) => {
					n(/* @__PURE__ */ Error("Failed to start espeak-ng"));
				});
			});
		}
	} catch (e) {
		throw Error(e?.message || "Failed to play IPA");
	}
}), n.handle("evaluate-audio", async (e, { audioBlob: t, language: n, expectedText: r }) => {
	try {
		if (!e.senderFrame.url.startsWith("file://")) throw Error("Unauthorized origin");
		if (!E.check("evaluate-audio")) throw Error("Rate limit exceeded. Please wait before trying again.");
		if (!(t instanceof Uint8Array)) throw Error("Invalid audio data");
		if (typeof r != "string" || r.length > 500) throw Error("Invalid expected text");
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
		let u = {
			audio: { content: a },
			config: {
				encoding: l.google.cloud.speech.v1.RecognitionConfig.AudioEncoding.WEBM_OPUS,
				sampleRateHertz: 48e3,
				languageCode: s
			}
		}, [d] = await _.recognize(u), f = d.results?.map((e) => e.alternatives?.[0].transcript).join("\n") || "[No speech]", p = j(), m = `User practiced "${r}" in ${i}. Recognized: "${f}". Give 1-2 sentences of phonetic advice if there were issues, else say "Great job!".`;
		return {
			transcription: f,
			feedback: (await p.generateContent(m)).response.text()
		};
	} catch {
		return {
			transcription: "Error",
			feedback: "Could not evaluate speech. Please try again."
		};
	}
}), n.handle("save-cards", async (e, t) => {
	try {
		if (!e.senderFrame.url.startsWith("file://")) throw Error("Unauthorized origin");
		if (!Array.isArray(t)) throw Error("Cards must be an array");
		if (t.length === 0 || t.length > 1e3) throw Error("Invalid number of cards (0-1000 allowed)");
		return new Promise((e, n) => {
			h.serialize(() => {
				let n = 0, r = [];
				t.forEach((e, t) => {
					if (!e.language || !e.symbol) {
						r.push(`Card ${t}: missing required fields`);
						return;
					}
					let i = {
						language: String(e.language).substring(0, 100),
						symbol: String(e.symbol).substring(0, 10),
						type: e.type || "consonant",
						voicing: e.voicing || null,
						place: e.place || null,
						manner: e.manner || null,
						height: e.height || null,
						backness: e.backness || null,
						roundedness: e.roundedness || null,
						description: String(e.description || "").substring(0, 500),
						example_word: String(e.example_word || "").substring(0, 100),
						example_translation: String(e.example_translation || "").substring(0, 200),
						example_ipa: String(e.example_ipa || "").substring(0, 100),
						example_word2: String(e.example_word2 || "").substring(0, 100),
						example_translation2: String(e.example_translation2 || "").substring(0, 200),
						example_ipa2: String(e.example_ipa2 || "").substring(0, 100),
						example_word3: String(e.example_word3 || "").substring(0, 100),
						example_translation3: String(e.example_translation3 || "").substring(0, 200),
						example_ipa3: String(e.example_ipa3 || "").substring(0, 100)
					};
					h.run("INSERT OR REPLACE INTO cards \n             (language, symbol, type, voicing, place, manner, height, backness, roundedness, description, \n              example_word, example_translation, example_ipa, \n              example_word2, example_translation2, example_ipa2, \n              example_word3, example_translation3, example_ipa3) \n             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [
						i.language,
						i.symbol,
						i.type,
						i.voicing,
						i.place,
						i.manner,
						i.height,
						i.backness,
						i.roundedness,
						i.description,
						i.example_word,
						i.example_translation,
						i.example_ipa,
						i.example_word2,
						i.example_translation2,
						i.example_ipa2,
						i.example_word3,
						i.example_translation3,
						i.example_ipa3
					], (e) => {
						e ? r.push(`Card ${t}: ${e.message}`) : n++;
					});
				}), setTimeout(() => {
					S.clear(), e({
						saved: n,
						errors: r.length > 0 ? r : void 0
					});
				}, 500);
			});
		});
	} catch (e) {
		throw Error(e?.message || "Failed to save cards");
	}
});
//#endregion
