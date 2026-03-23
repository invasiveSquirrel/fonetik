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
  "English (North American)", "English (Received Pronunciation)", "English (Australian)", "English (Scottish)", "English (Cockney)",
  "Dutch (Netherlands)", "Dutch (Flemish)",
  "German (Northern)", "German (Austrian)", "German (Swiss)",
  "Spanish (Spain)", "Spanish (Mexican)", "Spanish (Argentinian)", "Spanish (Colombian)", "Spanish (Chilean)", "Spanish (Cuban)",
  "Portuguese (Brazilian)", "Portuguese (European)",
  "Swedish (Stockholm)", "Swedish (Skåne)", "Swedish (Finland)",
  "Finnish (Helsinki)"
];

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function generateBatch(language, offset, existingSymbols) {
  const prompt = `
    ACT AS AN EXPERT PHONOLOGIST. Dialect: ${language}.
    Generate a JSON list of 15 UNIQUE IPA practice cards (Batch starting at ${offset}).
    
    EXCLUDE THESE SYMBOLS ALREADY IN DB: ${existingSymbols.join(', ')}

    REQUIREMENTS:
    1. Focus on standard phonemes, allophones, diphthongs, or consonant clusters.
    2. Provide THREE EXAMPLES per sound. Each example MUST have:
       - "word": Native script.
       - "trans": English translation.
       - "ipa": Full IPA of that word in ${language}.
    3. Articulatory classification (Voicing, Place, Manner OR Height, Backness, Roundedness).

    Format as JSON list:
    [
      {
        "symbol": "[tʰ]",
        "type": "consonant",
        "voicing": "voiceless",
        "place": "alveolar",
        "manner": "plosive",
        "description": "Aspirated voiceless alveolar plosive.",
        "example_word": "top", "example_translation": "top", "example_ipa": "[tʰɒp]",
        "example_word2": "ten", "example_translation": "ten", "example_ipa": "[tʰɛn]",
        "example_word3": "take", "example_translation": "take", "example_ipa": "[tʰeɪk]"
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
  console.log("🛠 Starting chunked data generation (Target: 80 per dialect)...");
  
  db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS cards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      language TEXT, symbol TEXT, voicing TEXT, place TEXT, manner TEXT,
      height TEXT, backness TEXT, roundedness TEXT, type TEXT, description TEXT,
      example_word TEXT, example_translation TEXT, example_ipa TEXT,
      example_word2 TEXT, example_translation2 TEXT, example_ipa2 TEXT,
      example_word3 TEXT, example_translation3 TEXT, example_ipa3 TEXT,
      UNIQUE(language, symbol, example_word)
    )`);
  });

  for (const lang of LANGUAGES) {
    let currentCount = await new Promise(r => db.get("SELECT COUNT(*) as c FROM cards WHERE language=?", [lang], (e, row) => r(row.c || 0)));
    
    console.log(`\n🌍 Dialect: ${lang} (Current: ${currentCount}/80)`);
    
    while (currentCount < 80) {
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
        example_word3, example_translation3, example_ipa3
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

      db.serialize(() => {
        for (const card of batch) {
          stmt.run(
            lang, card.symbol, card.voicing || null, card.place || null, card.manner || null,
            card.height || null, card.backness || null, card.roundedness || null, card.type, card.description,
            card.example_word, card.example_translation, card.example_ipa,
            card.example_word2 || null, card.example_translation2 || null, card.example_ipa2 || null,
            card.example_word3 || null, card.example_translation3 || null, card.example_ipa3 || null
          );
        }
        stmt.finalize();
      });

      currentCount += batch.length;
      console.log(`✅ Progress: ${currentCount}/80`);
      await sleep(15000); // Wait between batches
    }
  }
  console.log("🏁 All dialects exhaustive.");
}

main().catch(console.error);
