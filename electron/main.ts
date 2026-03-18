const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const sqlite3 = require('sqlite3');
const fs = require('fs');
const speech = require('@google-cloud/speech');
const texttospeech = require('@google-cloud/text-to-speech');
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Add stability flags globally
app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('disable-software-rasterizer');
app.commandLine.appendSwitch('no-sandbox');

let mainWindow = null;
const dbPath = "/home/chris/fonetik/db/fonetik.db";

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) console.error('❌ Database error:', err.message);
});

const possibleCreds = '/home/chris/panglossia/google-credentials.json';
if (fs.existsSync(possibleCreds)) process.env.GOOGLE_APPLICATION_CREDENTIALS = possibleCreds;

const ttsClient = new texttospeech.TextToSpeechClient();
const speechClient = new speech.SpeechClient();

const KEY_FILE = "/home/chris/wordhord/wordhord_api.txt";
let API_KEY = "";
try {
  API_KEY = fs.readFileSync(KEY_FILE, 'utf8').trim();
} catch (e) {
  console.warn("API Key file not found.");
}

const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 900,
    frame: false, // Self-standing app (no frame)
    autoHideMenuBar: true,
    backgroundColor: '#0f172a',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.on('ready', createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// IPC Handlers
ipcMain.handle('get-cards', async (_, language) => {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM cards WHERE language = ?', [language], (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
});

ipcMain.handle('play-ipa', async (_, { text, language }) => {
  console.log(`[main] play-ipa request: "${text}" in ${language}`);
  const highQualityVoiceMap = {
    "English (North American)": { languageCode: "en-US", name: "en-US-Journey-F" },
    "English (Received Pronunciation)": { languageCode: "en-GB", name: "en-GB-Chirp3-HD-Calliope" },
    "English (Australian)": { languageCode: "en-AU", name: "en-AU-Chirp3-HD-Dione" },
    "English (Scottish)": { languageCode: "en-GB", name: "en-GB-Chirp3-HD-Calliope" }, 
    "English (Cockney)": { languageCode: "en-GB", name: "en-GB-Chirp3-HD-Calliope" },
    "Dutch (Netherlands)": { languageCode: "nl-NL", name: "nl-NL-Chirp3-HD-Despina" },
    "Dutch (Flemish)": { languageCode: "nl-BE", name: "nl-BE-Standard-A" },
    "German (Northern)": { languageCode: "de-DE", name: "de-DE-Chirp3-HD-Leda" },
    "German (Austrian)": { languageCode: "de-AT", name: "de-AT-Standard-A" },
    "German (Swiss)": { languageCode: "de-CH", name: "de-CH-Standard-A" },
    "Spanish (Spain)": { languageCode: "es-ES", name: "es-ES-Chirp3-HD-Callirrhoe" },
    "Spanish (Mexican)": { languageCode: "es-MX", name: "es-MX-Chirp3-HD-Dione" },
    "Spanish (Argentinian)": { languageCode: "es-AR", name: "es-AR-Standard-A" },
    "Spanish (Colombian)": { languageCode: "es-CO", name: "es-CO-Standard-A" },
    "Spanish (Chilean)": { languageCode: "es-CL", name: "es-CL-Standard-A" },
    "Spanish (Cuban)": { languageCode: "es-US", name: "es-US-Chirp3-HD-Callirrhoe" },
    "Portuguese (Brazilian)": { languageCode: "pt-BR", name: "pt-BR-Chirp3-HD-Dione" },
    "Portuguese (European)": { languageCode: "pt-PT", name: "pt-PT-Standard-A" },
    "Swedish (Stockholm)": { languageCode: "sv-SE", name: "sv-SE-Chirp3-HD-Laomedeia" },
    "Swedish (Skåne)": { languageCode: "sv-SE", name: "sv-SE-Chirp3-HD-Laomedeia" },
    "Swedish (Finland)": { languageCode: "sv-SE", name: "sv-SE-Chirp3-HD-Laomedeia" },
    "Finnish (Helsinki)": { languageCode: "fi-FI", name: "fi-FI-Chirp3-HD-Despina" },
    "Scottish Gaelic": { languageCode: "en-GB", name: "en-GB-Standard-A" }
  };

  const selectedVoice = highQualityVoiceMap[language] || { languageCode: "en-US", name: "en-US-Journey-F" };
  
  // If the language is Gaelic, we ALWAYS want to use IPA via SSML for accuracy
  // Check if text is bracketed or contains IPA characters
  const containsIpa = /[ɑʋɛɪɔʊæøœʉɟʝɲŋʃʒθðɬɮɹɻɥɰʁˈˌ]/.test(text);
  const isIpa = (text.startsWith('[') && text.endsWith(']')) || containsIpa || language === "Scottish Gaelic";
  const cleanText = text.replace(/[\[\]]/g, '');

  try {
    let input;
    if (isIpa) {
      console.log(`[main] Using SSML for IPA/Gaelic: ${cleanText}`);
      input = { ssml: `<speak><phoneme alphabet="ipa" ph="${cleanText}">${cleanText}</phoneme></speak>` };
    } else {
      input = { text: text };
    }

    const [response] = await ttsClient.synthesizeSpeech({
      input: input,
      voice: selectedVoice,
      audioConfig: { audioEncoding: 'MP3' },
    });
    console.log(`[main] Google TTS success, buffer size: ${response.audioContent.length}`);
    return response.audioContent;
  } catch (e) {
    console.warn(`[main] Google TTS failed, falling back to espeak:`, e.message);
    
    let voice = 'en-gb';
    const l = language.toLowerCase();
    if (l.includes('english') && l.includes('north american')) voice = 'en-us';
    else if (l.includes('english')) voice = 'en-gb';
    else if (l.includes('german')) voice = 'de';
    else if (l.includes('dutch')) voice = 'nl';
    else if (l.includes('spanish')) voice = 'es';
    else if (l.includes('portuguese')) voice = 'pt';
    else if (l.includes('finnish')) voice = 'fi';
    else if (l.includes('swedish')) voice = 'sv';
    else if (l.includes('gaelic')) voice = 'gd';

    const ipaInput = `[[${cleanText}]]`;

    return new Promise((resolve, reject) => {
      const espeak = spawn('espeak-ng', ['-v', voice, '-s', '150', '--stdout', ipaInput]);
      let audioData = Buffer.alloc(0);
      espeak.stdout.on('data', (data) => { audioData = Buffer.concat([audioData, data]); });
      espeak.on('close', (code) => {
        if (code === 0) {
          console.log(`[main] espeak-ng success, buffer size: ${audioData.length}`);
          resolve(audioData);
        } else {
          console.error(`[main] espeak-ng failed with code ${code}`);
          reject(new Error(`espeak-ng error ${code}`));
        }
      });
      espeak.on('error', (err) => {
        console.error(`[main] Failed to start espeak-ng: ${err.message}`);
        reject(err);
      });
    });
  }
});

ipcMain.handle('evaluate-audio', async (_, { audioBlob, language, expectedText }) => {
  try {
    const audioBytes = Buffer.from(await audioBlob.arrayBuffer());
    const request = {
      audio: { content: audioBytes },
      config: {
        encoding: 'WEBM_OPUS',
        sampleRateHertz: 48000,
        languageCode: language.includes("Spanish") ? "es-US" : language.includes("German") ? "de-DE" : "en-US",
      },
    };
    const [response] = await speechClient.recognize(request);
    const transcription = response.results?.map(r => r.alternatives?.[0].transcript).join('\n') || "[No speech]";
    const prompt = `User practiced "${expectedText}" in ${language}. Recognized: "${transcription}". Give 1-2 sentences of phonetic advice.`;
    const result = await model.generateContent(prompt);
    return { transcription, feedback: result.response.text() };
  } catch (error) {
    return { transcription: "Error", feedback: "Could not evaluate speech." };
  }
});
