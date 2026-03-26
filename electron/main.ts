import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'node:path';
import { spawn } from 'node:child_process';
import sqlite3 from 'sqlite3';
import * as fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { SpeechClient, protos } from '@google-cloud/speech';
import { TextToSpeechClient } from '@google-cloud/text-to-speech';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Define __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Add stability flags globally
app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('disable-software-rasterizer');
app.commandLine.appendSwitch('no-sandbox');

// ============================================
// CONFIGURATION & INITIALIZATION
// ============================================

let mainWindow: BrowserWindow | null = null;
let db: sqlite3.Database | null = null;
let ttsClient: TextToSpeechClient | null = null;
let speechClient: SpeechClient | null = null;
let genAI: GoogleGenerativeAI | null = null;
let model: any = null;

// Initialize database and API clients
async function initializeApp() {
  const dbDir = path.join(app.getPath('userData'), 'db');
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { mode: 0o700, recursive: true });
  }
  const dbPath = path.join(dbDir, 'fonetik.db');

  db = new sqlite3.Database(dbPath, (err: Error | null) => {
    if (err) {
      console.error('Database connection error:', err);
      return;
    }

    db?.serialize(() => {
      db?.run(`
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
          type TEXT,
          description TEXT,
          example_word TEXT,
          example_translation TEXT,
          example_ipa TEXT,
          example_word2 TEXT,
          example_translation2 TEXT,
          example_ipa2 TEXT,
          example_word3 TEXT,
          example_translation3 TEXT,
          example_ipa3 TEXT,
           example_sentence TEXT,
           example_sentence_ipa TEXT,
           example_sentence2 TEXT,
           example_sentence_ipa2 TEXT,
           example_sentence3 TEXT,
           example_sentence_ipa3 TEXT,
           UNIQUE(language, symbol, example_word)
         )
      `, (err: Error | null) => {
        if (err) console.error('Error creating cards table:', err);
        else console.log('Database initialized or already exists');
      });
    });
  });

  const credentialPaths = [
    process.env.GOOGLE_APPLICATION_CREDENTIALS,
    path.join(path.dirname(app.getPath('userData')), 'panglossia', 'google-credentials.json'),
  ].filter((p): p is string => typeof p === 'string' && fs.existsSync(p));

  if (credentialPaths.length > 0) {
    process.env.GOOGLE_APPLICATION_CREDENTIALS = credentialPaths[0];
  }

  ttsClient = new TextToSpeechClient();
  speechClient = new SpeechClient();
}

// ============================================
// CACHING SYSTEMS
// ============================================

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

class Cache<T> {
  private map = new Map<string, CacheEntry<T>>();
  constructor(private maxSize: number = 500, private ttlMs: number = 300000) { }

  get(key: string): T | null {
    const entry = this.map.get(key);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > this.ttlMs) {
      this.map.delete(key);
      return null;
    }
    return entry.data;
  }

  set(key: string, data: T): void {
    if (this.map.size >= this.maxSize) {
      const oldest = [...this.map.entries()].sort((a, b) => a[1].timestamp - b[1].timestamp)[0];
      this.map.delete(oldest[0]);
    }
    this.map.set(key, { data, timestamp: Date.now() });
  }

  clear(): void {
    this.map.clear();
  }
}

const cardCache = new Cache<any[]>(100, 5 * 60 * 1000);
const audioCache = new Cache<Buffer>(500, 60 * 60 * 1000);

// ============================================
// RATE LIMITING
// ============================================

class RateLimiter {
  private callTimes = new Map<string, number[]>();
  constructor(private maxPerMinute: number) { }

  check(id: string): boolean {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    const calls = (this.callTimes.get(id) || []).filter(t => t > oneMinuteAgo);
    if (calls.length >= this.maxPerMinute) return false;
    calls.push(now);
    this.callTimes.set(id, calls);
    return true;
  }
}

const ttsRateLimiter = new RateLimiter(30);
const speechRateLimiter = new RateLimiter(15);

// ============================================
// SECURITY & VALIDATION
// ============================================

const VALID_LANGUAGES = new Set([
  "English (North American)", "English (Received Pronunciation)", "English (Australian)",
  "English (Scottish)", "Dutch (Netherlands)", "Dutch (Flemish)",
  "German (Northern)", "German (Austrian)", "German (Swiss)", "Spanish (Spain)",
  "Spanish (Mexican)", "Spanish (Argentinian)", "Spanish (Colombian)", "Spanish (Chilean)",
  "Spanish (Cuban)", "Portuguese (Brazilian)", "Portuguese (European)",
  "Swedish (Stockholm)", "Swedish (Skåne)", "Swedish (Finland)",
  "Finnish (Helsinki)", "Scottish Gaelic"
]);

function validateLanguage(lang: unknown): string {
  if (typeof lang !== 'string' || !VALID_LANGUAGES.has(lang)) {
    throw new Error('Invalid language');
  }
  return lang;
}

function escapeXml(str: string): string {
  return str
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function getAPIKey(): string {
  const key = process.env.GOOGLE_API_KEY;
  if (!key || key.length < 10) throw new Error('GOOGLE_API_KEY not configured');
  return key;
}

function getModel(modelName: string = "gemini-2.0-pro-exp-02-05") {
  const key = getAPIKey();
  const genAIInstance = new GoogleGenerativeAI(key);
  return genAIInstance.getGenerativeModel({ model: modelName });
}

function createWindow() {
  const preloadPath = path.join(__dirname, 'preload.js');
  mainWindow = new BrowserWindow({
    width: 1200, height: 900, frame: false, autoHideMenuBar: true,
    backgroundColor: '#0f172a',
    webPreferences: { preload: preloadPath, nodeIntegration: false, contextIsolation: true, sandbox: false },
  });
  mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  mainWindow.on('closed', () => { mainWindow = null; });
}

app.on('ready', async () => {
  await initializeApp();
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    if (db) db.close();
    app.quit();
  }
});

// ============================================
// IPC HANDLERS - GET CARDS
// ============================================

ipcMain.handle('get-cards', async (event, language: unknown) => {
  try {
    const url = event.senderFrame?.url || (event.sender as any)?.getURL?.() || '';
    if (!url.startsWith('file://')) throw new Error('Unauthorized origin');
    const validLang = validateLanguage(language);
    const cached = cardCache.get(validLang);
    if (cached) return cached;
    const database = db;
    if (!database) throw new Error("Database not initialized");
    const rows = await new Promise<any[]>((resolve, reject) => {
      database.all("SELECT * FROM cards WHERE language = ? LIMIT 1000", [validLang], (err, rows) => {
        if (err) reject(err); else resolve(rows);
      });
    });
    const result = rows || [];
    cardCache.set(validLang, result);
    return result;
  } catch (error: any) { throw new Error(error?.message || 'Failed to get cards'); }
});

// ============================================
// TTS HELPERS
// ============================================

function getVoiceConfig(language: string, text: string) {
  const highQualityVoiceMap: any = {
    "English (North American)": { languageCode: "en-US", name: "en-US-Chirp3-HD-Dione" },
    "English (Received Pronunciation)": { languageCode: "en-GB", name: "en-GB-Chirp3-HD-Calliope" },
    "English (Australian)": { languageCode: "en-AU", name: "en-AU-Neural2-A" },
    "English (Scottish)": { languageCode: "en-GB", name: "en-GB-Neural2-B" },
    "Dutch (Netherlands)": { languageCode: "nl-NL", name: "nl-NL-Chirp3-HD-Despina" },
    "Dutch (Flemish)": { languageCode: "nl-BE", name: "nl-BE-Wavenet-A" },
    "German (Northern)": { languageCode: "de-DE", name: "de-DE-Chirp3-HD-Leda" },
    "German (Austrian)": { languageCode: "de-AT", name: "de-AT-Wavenet-A" },
    "German (Swiss)": { languageCode: "de-CH", name: "de-CH-Wavenet-A" },
    "Spanish (Spain)": { languageCode: "es-ES", name: "es-ES-Chirp3-HD-Callirrhoe" },
    "Spanish (Mexican)": { languageCode: "es-MX", name: "es-MX-Chirp3-HD-Dione" },
    "Spanish (Argentinian)": { languageCode: "es-AR", name: "es-AR-Neural2-A" },
    "Spanish (Colombian)": { languageCode: "es-CO", name: "es-CO-Neural2-A" },
    "Spanish (Chilean)": { languageCode: "es-CL", name: "es-CL-Neural2-A" },
    "Spanish (Cuban)": { languageCode: "es-US", name: "es-US-Chirp3-HD-Callirrhoe" },
    "Portuguese (Brazilian)": { languageCode: "pt-BR", name: "pt-BR-Chirp3-HD-Dione" },
    "Portuguese (European)": { languageCode: "pt-PT", name: "pt-PT-Wavenet-A" },
    "Swedish (Stockholm)": { languageCode: "sv-SE", name: "sv-SE-Chirp3-HD-Laomedeia" },
    "Swedish (Skåne)": { languageCode: "sv-SE", name: "sv-SE-Neural2-C" },
    "Swedish (Finland)": { languageCode: "sv-SE", name: "sv-SE-Neural2-C" },
    "Finnish (Helsinki)": { languageCode: "fi-FI", name: "fi-FI-Chirp3-HD-Despina" },
    "Scottish Gaelic": { languageCode: "en-GB", name: "en-GB-Standard-A" }
  };

  let targetLang = language;
  const dialectMatch = text.match(/\(([^)]+)\)/);
  if (dialectMatch) {
    const detectedDialect = dialectMatch[1].toLowerCase();
    if (detectedDialect.includes("north american") || detectedDialect.includes("us")) targetLang = "English (North American)";
    else if (detectedDialect.includes("received pronunciation") || detectedDialect.includes("rp") || detectedDialect.includes("british")) targetLang = "English (Received Pronunciation)";
    else if (detectedDialect.includes("mexican")) targetLang = "Spanish (Mexican)";
    else if (detectedDialect.includes("spain")) targetLang = "Spanish (Spain)";
  }

  return highQualityVoiceMap[targetLang] || highQualityVoiceMap[language] || { languageCode: "en-US", name: "en-US-Chirp3-HD-Dione" };
}

function generateSsml(text: string, langCode: string, isIpa: boolean): string {
  const escaped = escapeXml(text);
  return isIpa 
    ? `<speak xml:lang="${langCode}"><phoneme alphabet="ipa" ph="${escaped}">${escaped}</phoneme></speak>`
    : `<speak xml:lang="${langCode}">${escaped}</speak>`;
}

ipcMain.handle('play-ipa', async (event, { text, language, speed, isIpa }: any) => {
  const speakingRate = speed || 1.0;
  try {
    const url = event.senderFrame?.url || (event.sender as any)?.getURL?.() || '';
    if (!url.startsWith('file://')) throw new Error(`Unauthorized origin`);
    if (!ttsRateLimiter.check('play-ipa')) throw new Error('Rate limit exceeded');
    if (typeof text !== 'string' || text.length === 0 || text.length > 500) throw new Error('Invalid text');
    
    const validLang = validateLanguage(language);
    const containsIpaDetected = /[ɑʋɛɪɔʊæøœʉɟʝɲŋʃʒθðɬɮɹɻɥɰʁˈˌ]/.test(text);
    const isIpaDetected = (text.startsWith('[') && text.endsWith(']')) || containsIpaDetected || validLang === "Scottish Gaelic";
    const finalIsIpa = isIpa !== undefined ? isIpa : isIpaDetected;

    let cleanText = text.replace(/(^\[|\]$)/g, '').trim();
    if (finalIsIpa && cleanText.length <= 4 && !/[aeiouyɑɛɪɔʊæøœʉ]/.test(cleanText)) {
      cleanText = `a${cleanText}a`;
    }

    const cacheKey = `${validLang}::${speakingRate}::${finalIsIpa}::${cleanText}`;
    const cached = audioCache.get(cacheKey);
    if (cached) return cached;

    const selectedVoice = getVoiceConfig(validLang, text);
    const langCode = selectedVoice.languageCode || 'en-US';

    try {
      if (!ttsClient) throw new Error("TTS Client not initialized");
      const ssml = generateSsml(cleanText, langCode, finalIsIpa);
      const [response] = await ttsClient.synthesizeSpeech({
        input: { ssml },
        voice: { languageCode: langCode, name: selectedVoice.name },
        audioConfig: { audioEncoding: 'MP3', speakingRate: speakingRate },
      });
      const buffer = Buffer.from(response.audioContent || Buffer.alloc(0));
      if (buffer.length > 0) {
        audioCache.set(cacheKey, buffer);
        return buffer;
      }
      throw new Error("Empty audio content");
    } catch (googleError: any) {
      console.warn(`[play-ipa] Google TTS failure: ${googleError.message}`);
      const fallbackVoiceMap: any = { 'en-us': 'en-us', 'en-gb': 'en-gb', 'de': 'de', 'nl': 'nl', 'es': 'es', 'pt': 'pt', 'fi': 'fi', 'sv': 'sv' };
      let chosenVoice = 'en-gb';
      const l = validLang.toLowerCase();
      if (l.includes('german')) chosenVoice = fallbackVoiceMap['de'] || 'de-DE';
      else if (l.includes('dutch')) chosenVoice = fallbackVoiceMap['nl'] || 'nl-NL';
      else if (l.includes('spanish')) chosenVoice = fallbackVoiceMap['es'] || 'es-ES';
      else if (l.includes('portuguese')) chosenVoice = fallbackVoiceMap['pt'] || 'pt-PT';
      else if (l.includes('finnish')) chosenVoice = fallbackVoiceMap['fi'] || 'fi-FI';
      else if (l.includes('swedish')) chosenVoice = fallbackVoiceMap['sv'] || 'sv-SE';
      else if (l.includes('english') && l.includes('north american')) chosenVoice = 'en-us';

      const ipaInput = finalIsIpa ? `[[${cleanText}]]` : cleanText;
      const espeakSpeed = Math.round(150 * speakingRate);
      return new Promise((resolve, reject) => {
        const espeak = spawn('espeak-ng', ['-v', chosenVoice, '-s', String(espeakSpeed), '--stdout', ipaInput]);
        let audioData = Buffer.alloc(0);
        espeak.stdout.on('data', (data) => audioData = Buffer.concat([audioData, data]));
        espeak.on('close', (code) => { if (code === 0) { audioCache.set(cacheKey, audioData); resolve(audioData); } else reject(new Error('espeak-ng failed')); });
        espeak.on('error', (err) => reject(new Error('Failed to start espeak-ng')));
      });
    }
  } catch (error: any) { throw new Error(error?.message || 'Failed to play audio'); }
});

// ============================================
// IPC HANDLERS - EVALUATE AUDIO
// ============================================

ipcMain.handle('evaluate-audio', async (event, { audioBlob, language, expectedText, isIpa }: any) => {
  try {
    const url = event.senderFrame?.url || (event.sender as any)?.getURL?.() || '';
    if (!url.startsWith('file://')) throw new Error('Unauthorized origin');
    if (!speechRateLimiter.check('evaluate-audio')) throw new Error('Rate limit exceeded');
    if (!(audioBlob instanceof Uint8Array)) throw new Error('Invalid audio data');
    const validLang = validateLanguage(language);
    const userAudioBytes = Buffer.from(audioBlob);

    // Get Reference AI Audio if available in cache
    // We try to find it by IPA or Text
    const cacheKey = `${validLang}::1::${!!isIpa}::${expectedText}`;
    const aiAudioBytes = audioCache.get(cacheKey);

    const modelInstance = getModel("gemini-2.0-pro-exp-02-05"); // Use Pro Exp for high precision evaluation
    
    const prompt = `
      ACT AS AN EXPERT LINGUISTIC COACH.
      Goal: Evaluate the student's pronunciation of "${expectedText}" in ${validLang}.
      
      Inputs:
      1. Reference Audio: A perfect native-speaker (AI) pronunciation (if provided).
      2. Student Audio: The student's attempt.
      
      TASK:
      - Compare the student's audio against the reference audio and the target IPA.
      - Perform forced alignment to identify which phonemes were hit or missed.
      - Evaluate articulatory precision (vowel quality, consonant placement).
      - Evaluate prosody (stress, rhythm, intonation).
      
      Return ONLY a JSON object:
      {
        "score": 0-100,
        "phonemes": [
          { "p": "symbol", "s": 0-100, "f": "brief phonetic feedback" }
        ],
        "prosody": { "stress": 0-100, "intonation": 0-100, "rhythm": 0-100 },
        "advice": "1-2 sentences of professional articulatory coaching."
      }
    `;

    const parts: any[] = [{ text: prompt }];
    
    // Add User Audio
    parts.push({
      inlineData: {
        data: userAudioBytes.toString('base64'),
        mimeType: 'audio/webm'
      }
    });

    // Add AI Reference Audio if we have it
    if (aiAudioBytes) {
      parts.push({
        inlineData: {
          data: aiAudioBytes.toString('base64'),
          mimeType: 'audio/mp3'
        }
      });
    }

    const result = await modelInstance.generateContent({ contents: [{ role: 'user', parts }] });
    const responseText = result.response.text();
    const jsonMatch = responseText.match(/\{.*\}/s);
    
    if (jsonMatch) {
      const evaluation = JSON.parse(jsonMatch[0]);
      return { 
        transcription: "Evaluated", 
        feedback: evaluation.advice, 
        details: evaluation 
      };
    }
    
    return { transcription: "Evaluated", feedback: responseText };
  } catch (error: any) { 
    console.error("Evaluation Error:", error);
    return { transcription: "Error", feedback: "Evaluation failed: " + error.message }; 
  }
});

// ============================================
// IPC HANDLERS - SAVE CARDS
// ============================================

ipcMain.handle('save-cards', async (event, cards: any) => {
  try {
    const url = event.senderFrame?.url || (event.sender as any)?.getURL?.() || '';
    if (!url.startsWith('file://')) throw new Error('Unauthorized origin');
    if (!Array.isArray(cards)) throw new Error('Cards must be an array');
    return new Promise((resolve, reject) => {
      const database = db; if (!database) throw new Error("DB not initialized");
      database.serialize(() => {
        let saved = 0;
        cards.forEach((card) => {
          database.run(`INSERT OR REPLACE INTO cards 
            (language, symbol, type, voicing, place, manner, height, backness, roundedness, description, 
             example_word, example_translation, example_ipa, example_word2, example_translation2, example_ipa2, 
             example_word3, example_translation3, example_ipa3, example_sentence, example_sentence2, example_sentence3) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [card.language, card.symbol, card.type, card.voicing, card.place, card.manner, card.height, card.backness, card.roundedness, card.description,
            card.example_word, card.example_translation, card.example_ipa, card.example_word2, card.example_translation2, card.example_ipa2,
            card.example_word3, card.example_translation3, card.example_ipa3, card.example_sentence, card.example_sentence2, card.example_sentence3],
            (err) => { if (!err) saved++; });
        });
        setTimeout(() => { cardCache.clear(); resolve({ saved }); }, 500);
      });
    });
  } catch (error: any) { throw new Error('Save failed'); }
});
