//#region electron/main.ts
var { app, BrowserWindow, ipcMain } = require("electron");
var path = require("path");
var { spawn } = require("child_process");
var sqlite3 = require("sqlite3");
var fs = require("fs");
var mainWindow = null;
var dbPath = path.join(__dirname, "../../db/fonetik.db");
var db = new sqlite3.Database(dbPath);
db.serialize(() => {
	db.run(`
    CREATE TABLE IF NOT EXISTS cards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      language TEXT,
      symbol TEXT,
      voicing TEXT,
      place TEXT,
      manner TEXT,
      height TEXT,
      backness TEXT,
      roundedness TEXT,
      type TEXT, -- 'consonant' or 'vowel'
      description TEXT,
      example_word TEXT,
      example_translation TEXT,
      example_ipa TEXT
    )
  `);
});
function createWindow() {
	mainWindow = new BrowserWindow({
		width: 1200,
		height: 800,
		webPreferences: {
			preload: path.join(__dirname, "preload.js"),
			nodeIntegration: false,
			contextIsolation: true
		}
	});
	if (process.env.NODE_ENV === "development") mainWindow.loadURL("http://localhost:5173");
	else mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
	mainWindow.on("closed", () => {
		mainWindow = null;
	});
}
app.on("ready", createWindow);
app.on("window-all-closed", () => {
	if (process.platform !== "darwin") app.quit();
});
app.on("activate", () => {
	if (mainWindow === null) createWindow();
});
ipcMain.handle("get-cards", async (_, language) => {
	return new Promise((resolve, reject) => {
		db.all("SELECT * FROM cards WHERE language = ?", [language], (err, rows) => {
			if (err) reject(err);
			else resolve(rows);
		});
	});
});
ipcMain.handle("play-ipa", async (_, { text, language }) => {
	const voice = {
		"English": "en-gb",
		"German": "de",
		"Dutch": "nl",
		"Spanish": "es",
		"Portuguese": "pt",
		"Finnish": "fi",
		"Swedish": "sv"
	}[language] || "en-gb";
	const ipaInput = `[[${text.replace(/[\[\]]/g, "")}]]`;
	return new Promise((resolve, reject) => {
		const espeak = spawn("espeak-ng", [
			"-v",
			voice,
			"-s",
			"150",
			"--stdout",
			ipaInput
		]);
		let audioData = Buffer.alloc(0);
		espeak.stdout.on("data", (data) => {
			audioData = Buffer.concat([audioData, data]);
		});
		espeak.on("close", (code) => {
			if (code === 0) resolve(audioData);
			else reject(/* @__PURE__ */ new Error(`espeak-ng exited with code ${code}`));
		});
	});
});
var { GoogleGenerativeAI } = require("@google/generative-ai");
var speech = require("@google-cloud/speech");
var model = new GoogleGenerativeAI("AIzaSyA6mhnwbbscpNg15Wg3knZEF2EeFKNQJ0k").getGenerativeModel({ model: "gemini-2.0-flash" });
var possibleCreds = "/home/chris/panglossia/google-credentials.json";
if (fs.existsSync(possibleCreds)) process.env.GOOGLE_APPLICATION_CREDENTIALS = possibleCreds;
var speechClient = new speech.SpeechClient();
ipcMain.handle("evaluate-audio", async (_, { audioBlob, language, expectedText }) => {
	try {
		const request = {
			audio: { content: Buffer.from(await audioBlob.arrayBuffer()) },
			config: {
				encoding: "WEBM_OPUS",
				sampleRateHertz: 48e3,
				languageCode: language === "English" ? "en-US" : language === "German" ? "de-DE" : "en-US"
			}
		};
		const [response] = await speechClient.recognize(request);
		const transcription = response.results?.map((result) => result.alternatives?.[0].transcript).join("\n") || "[No speech detected]";
		const prompt = `
      The user is practicing the IPA sound in the context of the word "${expectedText}".
      They are speaking ${language}.
      The speech recognition engine heard: "${transcription}".
      
      Compare what was heard to the target "${expectedText}". 
      Provide 1-2 sentences of encouraging, expert phonetic feedback. 
      Focus on the specific IPA nuance (e.g., aspiration, dental vs alveolar).
    `;
		return {
			transcription,
			feedback: (await model.generateContent(prompt)).response.text()
		};
	} catch (error) {
		console.error("Evaluation error:", error);
		return {
			transcription: "Error",
			feedback: "Could not evaluate speech at this time."
		};
	}
});
//#endregion
