#!/usr/bin/env node
/**
 * Comprehensive IPA Data Generator for Swedish, Dutch, and Scottish Gaelic
 * Generates exhaustive phoneme and allophone coverage with full IPA transcriptions
 * and pronunciation examples for each sound
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import sqlite3 from 'sqlite3';
import * as fs from 'fs';

const dbPath = "/home/chris/fonetik/db/fonetik.db";
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Database error:', err.message);
    process.exit(1);
  }
});

const KEY_FILE = "/home/chris/wordhord/wordhord_api.txt";
let API_KEY = "";

try {
  API_KEY = fs.readFileSync(KEY_FILE, 'utf8').trim();
} catch (e) {
  console.error("❌ API Key file not found at", KEY_FILE);
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

// Focus on these three complex languages
const TARGET_LANGUAGES = [
  { dialect: "Swedish (Stockholm)", fullName: "Swedish (Stockholm Dialect)" },
  { dialect: "Dutch (Netherlands)", fullName: "Dutch (Netherlands Standard)" },
  { dialect: "Scottish Gaelic", fullName: "Scottish Gaelic" }
];

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Initialize database table
 */
function initDatabase() {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run(`
        CREATE TABLE IF NOT EXISTS cards (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          language TEXT NOT NULL,
          symbol TEXT NOT NULL,
          voicing TEXT,
          place TEXT,
          manner TEXT,
          height TEXT,
          backness TEXT,
          roundedness TEXT,
          type TEXT NOT NULL DEFAULT 'consonant',
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
      `, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  });
}

/**
 * Generate comprehensive phoneme data for a language
 */
async function generateComprehensivePhonemeData(dialect, fullName) {
  const specialInstructions = {
    "Swedish (Stockholm)": `
      CRITICAL: Include ALL Swedish phonemes:
      CONSONANTS: [p], [b], [t], [d], [k], [ɡ], [f], [v], [s], [z], [ʂ], [ʐ], [ʃ], [ʒ], [ç], [ʝ], [x], [ɣ], [m], [n], [ŋ], [ŋɡ], [l], [ʎ], [r], [ɹ], [j], [w], [ɧ]
      VOWELS: [ɪ], [e], [ɛ], [a], [ɑ], [ɔ], [ʊ], [u], [ø], [œ], [ə], [ɘ]
      DIPHTHONGS: [eɪ], [aɪ], [ɔʏ], [æʊ], [ɔʉ]
      Mark stress with [ˈ] and secondary stress [ˌ]
    `,
    "Dutch (Netherlands)": `
      CRITICAL: Include ALL Dutch phonemes:
      CONSONANTS: [p], [b], [t], [d], [k], [ɡ], [f], [v], [s], [z], [ʃ], [ʒ], [x], [ɣ], [m], [n], [ŋ], [l], [r], [ɹ], [j], [w]
      VOWELS: [ɪ], [e], [ɛ], [a], [ɑ], [ɔ], [ʊ], [u], [ə], [ɘ], [ʌ]
      DIPHTHONGS: [ɛɪ], [œʏ], [ɑʊ], [eɪ]
      Include long vs short vowel contrasts [aː] vs [a]
    `,
    "Scottish Gaelic": `
      CRITICAL: Include ALL Scottish Gaelic phonemes:
      BROAD CONSONANTS: [p], [b], [t], [d], [k], [ɡ], [f], [v], [s], [z], [ʃ], [m], [n], [l], [r]
      SLENDER CONSONANTS: [pʲ], [bʲ], [tʲ], [dʲ], [kʲ], [ɡʲ], [fʲ], [vʲ], [sʲ], [zʲ], [ʃʲ], [mʲ], [nʲ], [lʲ], [rʲ]
      PRE-ASPIRATION: [ʰp], [ʰt], [ʰk]
      VOWELS: [a], [ə], [e], [ɪ], [ɔ], [u], [iː], [uː], [ɛː], [ɔː]
      DIPHTHONGS: [iə], [uə], [əu], [ai], [au], [ɔi]
    `
  };

  const specialInst = specialInstructions[dialect] || "";

  const prompt = `
    ACT AS AN EXPERT PHONOLOGIST SPECIALIZING IN ${fullName.toUpperCase()}.
    
    Generate COMPREHENSIVE JSON list of ${dialect.includes("Gaelic") ? "40" : "50"} UNIQUE IPA phonetic cards for ${fullName}.
    
    ${specialInst}
    
    REQUIREMENTS:
    1. Complete IPA symbols with all diacritics
    2. Full articulatory features
    3. EXACTLY THREE examples per sound with:
       - "word": Native word in Latin script
       - "trans": 1-3 word English translation
       - "ipa": COMPLETE IPA of entire word with stress marks
    4. Expert description of mouth position and common mistakes
    
    Return ONLY raw JSON array. No markdown. Example format:
    [
      {
        "symbol": "[tʰ]",
        "type": "consonant",
        "voicing": "voiceless",
        "place": "alveolar",
        "manner": "plosive",
        "height": null,
        "backness": null,
        "roundedness": null,
        "description": "Aspirated voiceless alveolar plosive. Strong airflow after release.",
        "example_word": "tog",
        "example_translation": "roof",
        "example_ipa": "[tʰɔx]",
        "example_word2": "tá",
        "example_translation2": "is",
        "example_ipa2": "[tʰɑː]",
        "example_word3": "tinn",
        "example_translation3": "tin",
        "example_ipa3": "[tʰɪnˀ]"
      }
    ]
  `;

  console.log(`\n📊 Generating comprehensive data for ${dialect}...`);
  let retries = 3;
  while (retries > 0) {
    try {
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      
      // Extract JSON from response
      let jsonMatch = text.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        console.warn(`⚠️  No JSON found, retrying...`);
        await sleep(5000);
        retries--;
        continue;
      }
      
      const cards = JSON.parse(jsonMatch[0]);
      console.log(`✅ Generated ${cards.length} cards for ${dialect}`);
      return cards;
    } catch (error) {
      console.error(`❌ Error:`, error.message);
      await sleep(8000);
      retries--;
    }
  }
  return [];
}

/**
 * Insert cards in database
 */
async function insertCards(dialect, cards) {
  return new Promise((resolve, reject) => {
    db.run('DELETE FROM cards WHERE language = ?', [dialect], (err) => {
      if (err) {
        reject(err);
        return;
      }

      let inserted = 0;
      let processed = 0;

      if (cards.length === 0) {
        resolve(0);
        return;
      }

      cards.forEach((card) => {
        db.run(
          `INSERT OR REPLACE INTO cards (
            language, symbol, voicing, place, manner, height, backness, roundedness, type, description,
            example_word, example_translation, example_ipa,
            example_word2, example_translation2, example_ipa2,
            example_word3, example_translation3, example_ipa3
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            dialect,
            card.symbol || '',
            card.voicing || null,
            card.place || null,
            card.manner || null,
            card.height || null,
            card.backness || null,
            card.roundedness || null,
            card.type || 'consonant',
            card.description || '',
            card.example_word || '',
            card.example_translation || '',
            card.example_ipa || '',
            card.example_word2 || null,
            card.example_translation2 || null,
            card.example_ipa2 || null,
            card.example_word3 || null,
            card.example_translation3 || null,
            card.example_ipa3 || null
          ],
          function(err) {
            processed++;
            if (!err) inserted++;
            if (processed === cards.length) {
              resolve(inserted);
            }
          }
        );
      });
    });
  });
}

/**
 * Main execution
 */
async function main() {
  console.log("\n🎯 COMPREHENSIVE IPA DATA GENERATION");
  console.log("═".repeat(60));

  try {
    await initDatabase();
    console.log("✅ Database initialized");
  } catch (err) {
    console.error("❌ Database error:", err.message);
    process.exit(1);
  }

  for (const langInfo of TARGET_LANGUAGES) {
    try {
      const cards = await generateComprehensivePhonemeData(langInfo.dialect, langInfo.fullName);
      
      if (cards.length === 0) {
        console.warn(`⚠️  No cards generated for ${langInfo.dialect}`);
        continue;
      }
      
      const inserted = await insertCards(langInfo.dialect, cards);
      console.log(`✅ Inserted ${inserted}/${cards.length} cards for ${langInfo.dialect}`);
      
      if (langInfo !== TARGET_LANGUAGES[TARGET_LANGUAGES.length - 1]) {
        console.log("⏳ Waiting 12s...");
        await sleep(12000);
      }
    } catch (err) {
      console.error(`🔥 Error for ${langInfo.dialect}:`, err.message);
    }
  }

  console.log("\n" + "═".repeat(60));
  console.log("🏁 Complete!");
  db.close();
}

main().catch(err => {
  console.error("💥 Fatal error:", err);
  process.exit(1);
});
