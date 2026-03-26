import { GoogleGenerativeAI } from "@google/generative-ai";
import sqlite3 from 'sqlite3';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Use the exact DB path from main.ts initialization logic
const dbPath = "/home/chris/fonetik/db/fonetik.db"; 
const db = new sqlite3.Database(dbPath);

const KEY_FILE = "/home/chris/wordhord/wordhord_api.txt";
const finalKey = fs.readFileSync(KEY_FILE, 'utf8').trim();

const genAI = new GoogleGenerativeAI(finalKey);
// Use the BEST linguistic LLM as requested
const model = genAI.getGenerativeModel({ 
    model: "gemini-2.0-flash" 
});

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
    ACT AS AN EXPERT PHONOLOGIST AND PHONETICIAN. 
    Target Dialect: ${language}.
    
    GOAL: Provide a HIGHLY FINE-GRAINED and EXHAUSTIVE set of phonemes and allophones that a linguistics researcher would need.
    
    **CRITICAL DATA REQUIREMENTS**:
    1. EXHAUSTIVE COVERAGE: Include standard phonemes, and ALL significant allophones (aspirated, glottalized, nasalized, etc.).
    2. DIALECT/SOCIOLECT LABELING: For every example word, if it represents a specific regional or social pronunciation, follow it with the dialect/sociolect name in parentheses, e.g. "water (North American)" or "singing (Received Pronunciation)".
    3. THREE EXAMPLES PER CARD: Each sound must have 3 distinct example words.
    4. SENTENCES FOR ALL: Every example word must be followed by a clear sample sentence.
    5. NARROW IPA: All example words and sentences MUST have narrow IPA transcriptions that exactly match the identified dialect.
    6. CLUSTERS: Only list consonant clusters as distinct phonemes if they are best shown with a tie bar (e.g. [t͡s]) or if one element is a superscript (e.g. [pʰ]).
    7. JSON FORMAT: Return a JSON list of 10-15 entries.

    EXCLUDE THESE SYMBOLS ALREADY IN DB FOR THIS LANGUAGE: ${existingSymbols.join(', ')}

    FORMAT EXAMPLE:
    [
      {
        "symbol": "[pʰ]",
        "type": "consonant",
        "voicing": "voiceless", "place": "bilabial", "manner": "plosive",
        "description": "Voiceless bilabial plosive with audible aspiration.",
        "example_word": "pit (Received Pronunciation)", "example_translation": "a large hole", "example_ipa": "[pʰɪt]", "example_sentence": "He fell into the pit.", "example_sentence_ipa": "[hiː fɛl ˈɪntuː ðə pʰɪt]",
        "example_word2": "... (Dialect)", "example_translation2": "...", "example_ipa2": "...", "example_sentence2": "...", "example_sentence_ipa2": "...",
        "example_word3": "...", "example_translation3": "...", "example_ipa3": "...", "example_sentence3": "...", "example_sentence_ipa3": "..."
      }
    ]
  `;

  try {
    const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.1 }
    });
    const text = result.response.text();
    const jsonMatch = text.match(/\[.*\]/s);
    if (!jsonMatch) {
        console.warn("No JSON match in response:", text);
        return [];
    }
    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error(`Error in batch for ${language}: ${error.message}`);
    return [];
  }
}

async function main() {
  console.log(`🛠 Starting linguistic data generation using Gemini 2.0 Pro Exp...`);

  db.serialize(() => {
    // Ensure table matches our requirements
    db.run(`CREATE TABLE IF NOT EXISTS cards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      language TEXT, symbol TEXT, voicing TEXT, place TEXT, manner TEXT,
      height TEXT, backness TEXT, roundedness TEXT, type TEXT, description TEXT,
      example_word TEXT, example_translation TEXT, example_ipa TEXT,
      example_word2 TEXT, example_translation2 TEXT, example_ipa2 TEXT,
      example_word3 TEXT, example_translation3 TEXT, example_ipa3 TEXT,
      example_sentence TEXT, example_sentence_ipa TEXT,
      example_sentence2 TEXT, example_sentence_ipa2 TEXT,
      example_sentence3 TEXT, example_sentence_ipa3 TEXT,
      UNIQUE(language, symbol, example_word)
    )`);
  });

  for (const lang of LANGUAGES) {
    let currentCount = await new Promise(r => db.get("SELECT COUNT(*) as c FROM cards WHERE language=?", [lang], (e, row) => r(row ? row.c : 0)));
    const target = 500; // Researcher-grade exhaustive target

    console.log(`\n🌍 Language/Dialect: ${lang} (Current: ${currentCount}/${target})`);

    while (currentCount < target) {
      const existing = await new Promise(r => db.all("SELECT symbol FROM cards WHERE language=?", [lang], (e, rows) => r(rows.map(row => row.symbol))));

      const batch = await generateBatch(lang, currentCount, existing);
      if (batch.length === 0) {
        console.warn("Empty batch or error, retrying in 1min...");
        await sleep(60000);
        continue;
      }

      const stmt = db.prepare(`INSERT OR REPLACE INTO cards (
        language, symbol, voicing, place, manner, height, backness, roundedness, type, description, 
        example_word, example_translation, example_ipa,
        example_word2, example_translation2, example_ipa2,
        example_word3, example_translation3, example_ipa3,
        example_sentence, example_sentence_ipa,
        example_sentence2, example_sentence_ipa2,
        example_sentence3, example_sentence_ipa3
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

      await new Promise((resolve) => {
        db.serialize(() => {
          for (const card of batch) {
            stmt.run(
              lang, card.symbol, card.voicing || null, card.place || null, card.manner || null,
              card.height || null, card.backness || null, card.roundedness || null, card.type, card.description,
              card.example_word, card.example_translation, card.example_ipa,
              card.example_word2 || null, card.example_translation2 || null, card.example_ipa2 || null,
              card.example_word3 || null, card.example_translation3 || null, card.example_ipa3 || null,
              card.example_sentence || null, card.example_sentence_ipa || null,
              card.example_sentence2 || null, card.example_sentence_ipa2 || null,
              card.example_sentence3 || null, card.example_sentence_ipa3 || null
            );
          }
          stmt.finalize(() => resolve());
        });
      });

      currentCount += batch.length;
      console.log(`✅ ${lang}: Added ${batch.length} cards. Total: ${currentCount}/${target}`);
      await sleep(15000); // Respect rate limits
    }
  }
  console.log("🏁 Linguistic data generation complete.");
  db.close();
}

main().catch(console.error);
