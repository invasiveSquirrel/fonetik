import { GoogleGenerativeAI } from "@google/generative-ai";
import sqlite3 from 'sqlite3';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = "/home/chris/fonetik/db/fonetik.db";
const db = new sqlite3.Database(dbPath);

const KEY_FILE = "/home/chris/wordhord/wordhord_api.txt";
const finalKey = fs.readFileSync(KEY_FILE, 'utf8').trim();

const genAI = new GoogleGenerativeAI(finalKey);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

const LANGUAGES = [
  "English (North American)", "English (Received Pronunciation)", "English (Australian)", "English (Scottish)",
  "Dutch (Netherlands)", "Dutch (Flemish)",
  "German (Northern)", "German (Austrian)", "German (Swiss)",
  "Spanish (Spain)", "Spanish (Mexican)", "Spanish (Argentinian)", "Spanish (Colombian)", "Spanish (Chilean)", "Spanish (Cuban)",
  "Portuguese (Brazilian)", "Portuguese (European)",
  "Swedish (Stockholm)", "Swedish (Skåne)", "Swedish (Finland)",
  "Finnish (Helsinki)",
  "Scottish Gaelic"
];

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function generateBatch(language, offset, existingSymbols) {
  const prompt = `
    ACT AS AN EXPERT PHONOLOGIST AND PHONETICIAN. Target Dialect: ${language}.
    Generate a JSON list of 15 UNIQUE IPA entries (Batch starting at ${offset}).
    
    GOAL: Provide a COMPREHENSIVE and EXHAUSTIVE set of phonemes and allophones.
    **CRITICAL COVERAGE REQUIREMENTS**: 
    - Include a wide variety of 'a' sounds (e.g., [a], [ɑ], [æ], [ɐ], [ə], [ʌ]).
    - Include barred letters (e.g., [ʉ], [ɨ], [ɵ], [ɝ]).
    - Include raised consonants/superscripts (e.g., [tʰ], [pᶣ], [dᶻ], [nⁿ]).
    - Include all types of Germanic umlauts and their IPA equivalents (e.g., [ɛ], [ø], [y], [œ]).
    - Include aspirated vs unaspirated, taps, glottalization, and dialect-specific realizations.
    
    EXCLUDE THESE SYMBOLS ALREADY IN DB: ${existingSymbols.join(', ')}

    REQUIREMENTS:
    1. Include the IPA symbol/transcription (e.g., [tʰ], [ɾ], [ç], [ɧ]). **CRITICAL: For affricates and diphthongs, ALWAYS use tie bars (U+0361 or U+035C, e.g., [t͡s], [d͡ʒ], [a͡ɪ], [o͡ʊ]).**
    2. Provide THREE EXAMPLES per sound. Each example MUST have:
       - "word": Native orthography.
       - "trans": English translation.
       - "ipa": Full, narrow IPA transcription of that word. **CRITICAL: The IPA MUST exactly represent the pronunciation of the 'word'. Use tie bars for ALL affricates and diphthongs.**
       - "sentence": A short, simple sample sentence in the target language where the "word" is clearly embedded.
    3. Classification:
       - For consonants: voicing, place, manner.
       - For vowels: height, backness, roundedness (nasalization if applicable).
    4. Provide a clear, technical description of the articulatory gesture.

    Format as JSON list:
    [
      {
        "symbol": "[symbol]",
        "type": "consonant|vowel",
        "voicing": "...", "place": "...", "manner": "...",
        "height": "...", "backness": "...", "roundedness": "...",
        "description": "...",
        "example_word": "...", "example_translation": "...", "example_ipa": "...", "example_sentence": "...",
        "example_word2": "...", "example_translation2": "...", "example_ipa2": "...", "example_sentence2": "...",
        "example_word3": "...", "example_translation3": "...", "example_ipa3": "...", "example_sentence3": "..."
      }
    ]
  `;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const jsonMatch = text.match(/\[.*\]/s);
    if (!jsonMatch) return [];
    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error(`Error in batch for ${language}: ${error.message}`);
    return [];
  }
}

async function main() {
  const appDbPath = path.join(process.env.HOME, '.config/fonetik/db/fonetik.db');
  const db = new sqlite3.Database(appDbPath);

  console.log(`🛠 Starting chunked data generation in: ${appDbPath}`);

  db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS cards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      language TEXT, symbol TEXT, voicing TEXT, place TEXT, manner TEXT,
      height TEXT, backness TEXT, roundedness TEXT, type TEXT, description TEXT,
      example_word TEXT, example_translation TEXT, example_ipa TEXT,
      example_word2 TEXT, example_translation2 TEXT, example_ipa2 TEXT,
      example_word3 TEXT, example_translation3 TEXT, example_ipa3 TEXT,
      example_sentence TEXT, example_sentence2 TEXT, example_sentence3 TEXT,
      UNIQUE(language, symbol, example_word)
    )`);
  });

  for (const lang of LANGUAGES) {
    let currentCount = await new Promise(r => db.get("SELECT COUNT(*) as c FROM cards WHERE language=?", [lang], (e, row) => r(row ? row.c : 0)));

    // Exhaustive targets for diverse coverage
    const target = (lang.includes("English") || lang.includes("Swedish") || lang.includes("Gaelic") || lang.includes("German")) ? 500 : 300;

    console.log(`\n🌍 Dialect: ${lang} (Current: ${currentCount}/${target})`);

    while (currentCount < target) {
      const existing = await new Promise(r => db.all("SELECT symbol FROM cards WHERE language=?", [lang], (e, rows) => r(rows.map(row => row.symbol))));

      const batch = await generateBatch(lang, currentCount, existing);
      if (batch.length === 0) {
        console.warn("Empty batch or error, retrying in 20s...");
        await sleep(20000);
        continue;
      }

      const stmt = db.prepare(`INSERT OR REPLACE INTO cards (
        language, symbol, voicing, place, manner, height, backness, roundedness, type, description, 
        example_word, example_translation, example_ipa,
        example_word2, example_translation2, example_ipa2,
        example_word3, example_translation3, example_ipa3,
        example_sentence, example_sentence2, example_sentence3
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

      await new Promise((resolve) => {
        db.serialize(() => {
          for (const card of batch) {
            stmt.run(
              lang, card.symbol, card.voicing || null, card.place || null, card.manner || null,
              card.height || null, card.backness || null, card.roundedness || null, card.type, card.description,
              card.example_word, card.example_translation, card.example_ipa,
              card.example_word2 || null, card.example_translation2 || null, card.example_ipa2 || null,
              card.example_word3 || null, card.example_translation3 || null, card.example_ipa3 || null,
              card.example_sentence || null, card.example_sentence2 || null, card.example_sentence3 || null
            );
          }
          stmt.finalize(() => resolve());
        });
      });

      currentCount += batch.length;
      console.log(`✅ Progress: ${currentCount}/${target}`);
      await sleep(30000); // 30s wait between batches
    }
  }
  console.log("🏁 All dialects exhaustive.");
  db.close();
}

main().catch(console.error);
