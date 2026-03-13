import { GoogleGenerativeAI } from "@google/generative-ai";
import Database from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.resolve(__dirname, '../db/fonetik.db');
const db = new Database(dbPath);

const API_KEY = process.env.GOOGLE_API_KEY;
if (!API_KEY) {
  console.error("GOOGLE_API_KEY not found in environment.");
  process.exit(1);
}
const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

const LANGUAGES = [
  "English", "German", "Dutch", "Spanish", "Portuguese", "Finnish", "Swedish"
];

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function generateData(language) {
  const prompt = `
    Generate a JSON list of 15-20 IPA practice cards for ${language}.
    Focus on specific phonetic nuances that distinguish it from other languages (e.g., aspirated vs unaspirated 't', dental vs alveolar 's', dialectal variations like 'g' in Dutch or 'j' in Spanish).
    Include phonological classification according to articulatory features.

    Format the output as a JSON list of objects:
    [
      {
        "language": "${language}",
        "symbol": "[tʰ]",
        "type": "consonant",
        "voicing": "voiceless",
        "place": "alveolar",
        "manner": "plosive",
        "height": null,
        "backness": null,
        "roundedness": null,
        "description": "Aspirated voiceless alveolar plosive. Strong burst of air after the 't' at start of stressed syllables.",
        "example_word": "top",
        "example_translation": "top",
        "example_ipa": "[tʰɒp]"
      },
      {
        "language": "${language}",
        "symbol": "[i]",
        "type": "vowel",
        "voicing": null,
        "place": null,
        "manner": null,
        "height": "close",
        "backness": "front",
        "roundedness": "unrounded",
        "description": "Close front unrounded vowel.",
        "example_word": "seat",
        "example_translation": "seat",
        "example_ipa": "[siːt]"
      }
    ]
  `;

  console.log(`Generating data for ${language}...`);
  let retries = 3;
  while (retries > 0) {
    try {
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      const jsonMatch = text.match(/\[.*\]/s);
      if (!jsonMatch) throw new Error("JSON not found in response");
      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      if (error.status === 429) {
        console.warn(`Rate limit for ${language}, retrying in 5s...`);
        await sleep(5000);
        retries--;
      } else {
        console.error(`Error for ${language}:`, error);
        return [];
      }
    }
  }
  return [];
}

async function main() {
  db.exec(`
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
      UNIQUE(language, symbol, example_word)
    )
  `);

  const insert = db.prepare(`
    INSERT OR IGNORE INTO cards (language, symbol, voicing, place, manner, height, backness, roundedness, type, description, example_word, example_translation, example_ipa)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const lang of LANGUAGES) {
    const cards = await generateData(lang);
    if (cards.length === 0) continue;
    
    const transaction = db.transaction((cards) => {
      for (const card of cards) {
        insert.run(
          card.language,
          card.symbol,
          card.voicing,
          card.place,
          card.manner,
          card.height,
          card.backness,
          card.roundedness,
          card.type,
          card.description,
          card.example_word,
          card.example_translation,
          card.example_ipa
        );
      }
    });
    transaction(cards);
    console.log(`Successfully saved cards for ${lang}.`);
    await sleep(2000); // 2s delay between languages
  }
}

main().catch(console.error);
