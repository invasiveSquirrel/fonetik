import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { spawn } from 'child_process';
import sqlite3 from 'sqlite3';
import * as fs from 'fs';
import { promises as fsPromises } from 'fs';
import { fileURLToPath } from 'url';
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
  // Setup database path using app directory
  const dbDir = path.join(app.getPath('userData'), 'db');
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { mode: 0o700, recursive: true });
  }
  const dbPath = path.join(dbDir, 'fonetik.db');

  // Initialize database
  db = new sqlite3.Database(dbPath, (err: Error | null) => {
    if (err) {
      console.error('Database connection error:', err);
      return;
    }

    // Ensure tables exist
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
          UNIQUE(language, symbol, example_word)
        )
      `, (err: Error | null) => {
        if (err) console.error('Error creating cards table:', err);
        else console.log('Database initialized or already exists');
      });
    });
  });

  // Setup Google credentials path
  const credentialPaths = [
    process.env.GOOGLE_APPLICATION_CREDENTIALS,
    path.join(path.dirname(app.getPath('userData')), 'panglossia', 'google-credentials.json'),
  ].filter((p): p is string => typeof p === 'string' && fs.existsSync(p));

  if (credentialPaths.length > 0) {
    process.env.GOOGLE_APPLICATION_CREDENTIALS = credentialPaths[0];
  }

  // Initialize Google Cloud clients
  ttsClient = new TextToSpeechClient();
  speechClient = new SpeechClient();

  // Initialize Gemini (API key loaded lazily on first use)
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
    // Evict oldest if size exceeded
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

const cardCache = new Cache<any[]>(100, 5 * 60 * 1000);  // 500 entries, 5 min TTL
const audioCache = new Cache<Buffer>(500, 60 * 60 * 1000);  // 500 entries, 1 hour TTL

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

    if (calls.length >= this.maxPerMinute) {
      return false;
    }

    calls.push(now);
    this.callTimes.set(id, calls);
    return true;
  }

  reset(id: string): void {
    this.callTimes.delete(id);
  }
}

const ttsRateLimiter = new RateLimiter(30);  // 30 TTS calls/minute
const speechRateLimiter = new RateLimiter(15);  // 15 speech recognition/minute

// ============================================
// SECURITY & VALIDATION
// ============================================

const VALID_LANGUAGES = [
  "English (North American)", "English (Received Pronunciation)", "English (Australian)",
  "English (Scottish)", "English (Cockney)", "Dutch (Netherlands)", "Dutch (Flemish)",
  "German (Northern)", "German (Austrian)", "German (Swiss)", "Spanish (Spain)",
  "Spanish (Mexican)", "Spanish (Argentinian)", "Spanish (Colombian)", "Spanish (Chilean)",
  "Spanish (Cuban)", "Portuguese (Brazilian)", "Portuguese (European)",
  "Swedish (Stockholm)", "Swedish (Skåne)", "Swedish (Finland)",
  "Finnish (Helsinki)", "Scottish Gaelic"
];

function validateLanguage(lang: unknown): string {
  if (typeof lang !== 'string' || !VALID_LANGUAGES.includes(lang)) {
    throw new Error('Invalid language');
  }
  return lang;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Get API key from environment (loaded lazily)
function getAPIKey(): string {
  const key = process.env.GOOGLE_API_KEY;
  if (!key || key.length < 10) {
    throw new Error('GOOGLE_API_KEY not configured');
  }
  return key;
}

// Lazy initialize Gemini
function getModel() {
  if (!model) {
    genAI = new GoogleGenerativeAI(getAPIKey());
    model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
  }
  return model;
}

function createWindow() {
  const preloadPath = path.join(__dirname, 'preload.js');

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 900,
    frame: false,
    autoHideMenuBar: true,
    backgroundColor: '#0f172a',
    webPreferences: {
      preload: preloadPath,
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.on('ready', async () => {
  await initializeApp();
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    if (db) {
      db.close((err: any) => {
        if (err) console.error('Database close error');
      });
    }
    app.quit();
  }
});

// ============================================
// IPC HANDLERS - GET CARDS
// ============================================

ipcMain.handle('get-cards', async (event, language: unknown) => {
  try {
    // Validate origin
    if (!event.senderFrame.url.startsWith('file://')) {
      throw new Error('Unauthorized origin');
    }

    // Validate input
    const validLang = validateLanguage(language);

    // Check cache first
    const cached = cardCache.get(validLang);
    if (cached) {
      return cached;
    }

    // Query database
    return new Promise((resolve, reject) => {
      if (!db) {
        reject(new Error('Database not initialized'));
        return;
      }
      db.all(
        'SELECT * FROM cards WHERE language = ? LIMIT 1000',
        [validLang],
        (err: any, rows: any[]) => {
          if (err) {
            reject(new Error('Database query failed'));
            return;
          }
          const result = rows || [];
          cardCache.set(validLang, result);  // Cache result
          resolve(result);
        }
      );
    });
  } catch (error: any) {
    throw new Error(error?.message || 'Failed to get cards');
  }
});

// ============================================
// IPC HANDLERS - PLAY IPA
// ============================================

ipcMain.handle('play-ipa', async (event, { text, language }: any) => {
  try {
    // Validate origin
    if (!event.senderFrame.url.startsWith('file://')) {
      throw new Error('Unauthorized origin');
    }

    // Rate limiting
    if (!ttsRateLimiter.check('play-ipa')) {
      throw new Error('Rate limit exceeded. Please wait before trying again.');
    }

    // Validate input
    if (typeof text !== 'string' || text.length === 0 || text.length > 500) {
      throw new Error('Invalid text parameter');
    }
    const validLang = validateLanguage(language);

    // Check audio cache
    const cacheKey = `${validLang}::${text}`;
    const cached = audioCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const highQualityVoiceMap: any = {
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

    const selectedVoice = highQualityVoiceMap[validLang] || { languageCode: "en-US", name: "en-US-Journey-F" };

    // Check if text is IPA
    const containsIpa = /[ɑʋɛɪɔʊæøœʉɟʝɲŋʃʒθðɬɮɹɻɥɰʁˈˌ]/.test(text);
    const isIpa = (text.startsWith('[') && text.endsWith(']')) || containsIpa || validLang === "Scottish Gaelic";
    const cleanText = text.replace(/[\[\]]/g, '');

    try {
      let input: any;
      if (isIpa) {
        // Escape XML to prevent injection attacks
        const escapedText = escapeXml(cleanText);
        input = { ssml: `<speak><phoneme alphabet="ipa" ph="${escapedText}">${escapedText}</phoneme></speak>` };
      } else {
        input = { text: text };
      }

      const [response] = await ttsClient.synthesizeSpeech({
        input: input,
        voice: selectedVoice,
        audioConfig: { audioEncoding: 'MP3' },
      });

      const buffer = Buffer.from(response.audioContent);
      audioCache.set(cacheKey, buffer);  // Cache audio
      return buffer;
    } catch (e: any) {
      // Fallback to espeak-ng
      const voiceMap: any = {
        'en-us': 'en-us',
        'en-gb': 'en-gb',
        'de': 'de',
        'nl': 'nl',
        'es': 'es',
        'pt': 'pt',
        'fi': 'fi',
        'sv': 'sv',
        'gd': 'gd',
      };

      let voice = 'en-gb';
      const l = validLang.toLowerCase();
      if (l.includes('english') && l.includes('north american')) voice = voiceMap['en-us'];
      else if (l.includes('english')) voice = voiceMap['en-gb'];
      else if (l.includes('german')) voice = voiceMap['de'];
      else if (l.includes('dutch')) voice = voiceMap['nl'];
      else if (l.includes('spanish')) voice = voiceMap['es'];
      else if (l.includes('portuguese')) voice = voiceMap['pt'];
      else if (l.includes('finnish')) voice = voiceMap['fi'];
      else if (l.includes('swedish')) voice = voiceMap['sv'];
      else if (l.includes('gaelic')) voice = voiceMap['gd'];

      const ipaInput = `[[${cleanText}]]`;

      return new Promise((resolve, reject) => {
        const espeak = spawn('espeak-ng', ['-v', voice, '-s', '150', '--stdout', ipaInput]);
        let audioData = Buffer.alloc(0);
        espeak.stdout.on('data', (data: Buffer) => { audioData = Buffer.concat([audioData, data]); });
        espeak.on('close', (code: number) => {
          if (code === 0) {
            audioCache.set(cacheKey, audioData);
            resolve(audioData);
          } else {
            reject(new Error('espeak-ng synthesis failed'));
          }
        });
        espeak.on('error', (err: Error) => {
          reject(new Error('Failed to start espeak-ng'));
        });
      });
    }
  } catch (error: any) {
    throw new Error(error?.message || 'Failed to play IPA');
  }
});

// ============================================
// IPC HANDLERS - EVALUATE AUDIO
// ============================================

ipcMain.handle('evaluate-audio', async (event, { audioBlob, language, expectedText }: any) => {
  try {
    // Validate origin
    if (!event.senderFrame.url.startsWith('file://')) {
      throw new Error('Unauthorized origin');
    }

    // Rate limiting
    if (!speechRateLimiter.check('evaluate-audio')) {
      throw new Error('Rate limit exceeded. Please wait before trying again.');
    }

    // Validate input
    if (!(audioBlob instanceof Uint8Array)) {
      throw new Error('Invalid audio data');
    }
    if (typeof expectedText !== 'string' || expectedText.length > 500) {
      throw new Error('Invalid expected text');
    }
    const validLang = validateLanguage(language);

    const audioBytes = Buffer.from(audioBlob);
    const languageCodeMap: any = {
      'es': 'es-US',
      'de': 'de-DE',
      'pt': 'pt-BR',
      'nl': 'nl-NL',
      'sv': 'sv-SE',
      'fi': 'fi-FI',
    };

    let languageCode = 'en-US';
    const l = validLang.toLowerCase();
    for (const [key, code] of Object.entries(languageCodeMap)) {
      if (l.includes(key)) {
        languageCode = code as string;
        break;
      }
    }

    const request: protos.google.cloud.speech.v1.IRecognizeRequest = {
      audio: { content: audioBytes },
      config: {
        encoding: protos.google.cloud.speech.v1.RecognitionConfig.AudioEncoding.WEBM_OPUS,
        sampleRateHertz: 48000,
        languageCode: languageCode,
      },
    };

    const [response] = await speechClient.recognize(request);
    const transcription = response.results?.map((r: any) => r.alternatives?.[0].transcript).join('\n') || "[No speech]";

    // Get model and evaluate
    const modelInstance = getModel();
    const prompt = `User practiced "${expectedText}" in ${validLang}. Recognized: "${transcription}". Give 1-2 sentences of phonetic advice if there were issues, else say "Great job!".`;
    const result = await modelInstance.generateContent(prompt);

    return { transcription, feedback: result.response.text() };
  } catch (error: any) {
    return { transcription: "Error", feedback: "Could not evaluate speech. Please try again." };
  }
});

// ============================================
// IPC HANDLERS - SAVE CARDS
// ============================================

ipcMain.handle('save-cards', async (event, cards: unknown) => {
  try {
    // Validate origin
    if (!event.senderFrame.url.startsWith('file://')) {
      throw new Error('Unauthorized origin');
    }

    // Validate input
    if (!Array.isArray(cards)) {
      throw new Error('Cards must be an array');
    }

    if (cards.length === 0 || cards.length > 1000) {
      throw new Error('Invalid number of cards (0-1000 allowed)');
    }

    return new Promise((resolve, reject) => {
      db.serialize(() => {
        let saved = 0;
        const errors: string[] = [];

        cards.forEach((card: any, index: number) => {
          if (!card.language || !card.symbol) {
            errors.push(`Card ${index}: missing required fields`);
            return;
          }

          const validatedCard = {
            language: String(card.language).substring(0, 100),
            symbol: String(card.symbol).substring(0, 10),
            type: card.type || 'consonant',
            voicing: card.voicing || null,
            place: card.place || null,
            manner: card.manner || null,
            height: card.height || null,
            backness: card.backness || null,
            roundedness: card.roundedness || null,
            description: String(card.description || '').substring(0, 500),
            example_word: String(card.example_word || '').substring(0, 100),
            example_translation: String(card.example_translation || '').substring(0, 200),
            example_ipa: String(card.example_ipa || '').substring(0, 100),
            example_word2: String(card.example_word2 || '').substring(0, 100),
            example_translation2: String(card.example_translation2 || '').substring(0, 200),
            example_ipa2: String(card.example_ipa2 || '').substring(0, 100),
            example_word3: String(card.example_word3 || '').substring(0, 100),
            example_translation3: String(card.example_translation3 || '').substring(0, 200),
            example_ipa3: String(card.example_ipa3 || '').substring(0, 100),
          };

          db.run(
            `INSERT OR REPLACE INTO cards 
             (language, symbol, type, voicing, place, manner, height, backness, roundedness, description, 
              example_word, example_translation, example_ipa, 
              example_word2, example_translation2, example_ipa2, 
              example_word3, example_translation3, example_ipa3) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              validatedCard.language, validatedCard.symbol, validatedCard.type,
              validatedCard.voicing, validatedCard.place, validatedCard.manner,
              validatedCard.height, validatedCard.backness, validatedCard.roundedness,
              validatedCard.description, validatedCard.example_word, validatedCard.example_translation,
              validatedCard.example_ipa, validatedCard.example_word2, validatedCard.example_translation2,
              validatedCard.example_ipa2, validatedCard.example_word3, validatedCard.example_translation3,
              validatedCard.example_ipa3
            ],
            (err: any) => {
              if (!err) saved++;
              else errors.push(`Card ${index}: ${err.message}`);
            }
          );
        });

        // Invalidate cache after save
        setTimeout(() => {
          cardCache.clear();
          resolve({ saved, errors: errors.length > 0 ? errors : undefined });
        }, 500);
      });
    });
  } catch (error: any) {
    throw new Error(error?.message || 'Failed to save cards');
  }
});
