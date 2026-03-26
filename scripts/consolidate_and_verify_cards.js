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

async function verifyCard(card) {
  const prompt = `
    ACT AS AN EXPERT PHONETICIAN.
    Language/Dialect: ${card.language}
    Target Sound: ${card.symbol}
    
    Card Data to Verify:
    1. Word: ${card.example_word} -> IPA: ${card.example_ipa}
    2. Word2: ${card.example_word2} -> IPA: ${card.example_ipa2}
    3. Word3: ${card.example_word3} -> IPA: ${card.example_ipa3}
    
    TASK:
    - Check if the IPA transcriptions exactly match the word pronunciations in the specified dialect.
    - Ensure all affricates and diphthongs use tie bars (U+0361 or U+035C).
    - If there is a mismatch, provide the CORRECTED IPA.
    - Check if the dialect label in parentheses is present in the word (e.g. "word (Dialect)"). If missing, suggest the most likely dialect from the language field.
    
    Return ONLY a JSON object:
    {
      "needs_fix": true|false,
      "example_word": "word (Dialect)",
      "example_ipa": "[corrected_ipa]",
      "example_word2": "...",
      "example_ipa2": "...",
      "example_word3": "...",
      "example_ipa3": "..."
    }
  `;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const jsonMatch = text.match(/\{.*\}/s);
    if (!jsonMatch) return null;
    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error(`Error verifying card ${card.id}: ${error.message}`);
    return null;
  }
}

async function main() {
  console.log("🔍 Starting card consolidation and verification...");
  
  const cards = await new Promise((resolve) => {
    db.all("SELECT * FROM cards", (err, rows) => resolve(rows || []));
  });

  console.log(`Found ${cards.length} cards to verify.`);

  for (const card of cards) {
    const result = await verifyCard(card);
    if (result && result.needs_fix) {
      console.log(`🛠 Fixing card ${card.id} (${card.symbol} in ${card.language})`);
      const stmt = db.prepare(`UPDATE cards SET 
        example_word = ?, example_ipa = ?,
        example_word2 = ?, example_ipa2 = ?,
        example_word3 = ?, example_ipa3 = ?
        WHERE id = ?`);
      
      await new Promise((resolve) => {
        stmt.run(
          result.example_word, result.example_ipa,
          result.example_word2, result.example_ipa2,
          result.example_word3, result.example_ipa3,
          card.id,
          () => resolve()
        );
      });
      stmt.finalize();
    }
  }

  console.log("🏁 Verification complete.");
  db.close();
}

main().catch(console.error);
