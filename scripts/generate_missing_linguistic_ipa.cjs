const sqlite3 = require('sqlite3').verbose();
const https = require('node:https');
const fs = require('node:fs');

const API_KEY = fs.readFileSync("/home/chris/wordhord/wordhord_api.txt", "utf-8").trim();
const dbPath = '/home/chris/fonetik/db/fonetik.db';

const PHONETIC_GROUPS = [
  {
    language: "Swedish",
    description: "Retroflex consonants and sj-sound",
    targets: ["[ʈ]", "[ɖ]", "[ɳ]", "[ɭ]", "[ʂ]", "[ɧ]"]
  },
  {
    language: "Swedish",
    description: "Tonal minimal pairs (Tone 1 vs Tone 2)",
    targets: ["Tone 1", "Tone 2"]
  },
  {
    language: "Dutch",
    description: "Specific fricatives and clusters",
    targets: ["[s]", "[x]", "[ɣ]", "[sx]"]
  },
  {
    language: "Scottish Gaelic",
    description: "Lenition and broad/slender distinctions",
    targets: ["[x]", "[ɣ]", "[ç]", "[ʝ]", "[l̪ˠ]", "[lʲ]", "[rˠ]", "[rʲ]", "[n̪ˠ]", "[nʲ]", "[ˠ]"]
  },
  {
    language: "Finnish",
    description: "Comprehensive vowel system",
    targets: ["[y]", "[ø]", "[æ]", "[œ]", "[ɯ]", "[ɑ]"]
  }
];

async function generateBatch(group) {
  const prompt = `You are an expert phonetician. Generate IPA cards for ${group.language} focusing on ${group.description}. 
Especially target these symbols/features: ${group.targets.join(', ')}.

For each target, provide:
- symbol (wrapped in [], e.g. [ʈ])
- voicing, place, manner (for consonants)
- height, backness, roundedness (for vowels)
- description (technical phonetic description)
- 3 example words with their translation and word-level IPA (wrapped in []).
- 1 example sentence with its sentence-level IPA (wrapped in []) for each word.

In the case of Swedish tones, provide minimal pairs (words spelled the same but differing only in tone).
In the case of Scottish Gaelic, use the raised gamma [ˠ] to indicate velarization for broad consonants where appropriate.
Ensure all IPA uses tie bars [͡] where necessary.

Return ONLY a JSON array of objects with these keys: 
language, symbol, voicing, place, manner, height, backness, roundedness, type, description, 
example_word, example_translation, example_ipa, 
example_word2, example_translation2, example_ipa2, 
example_word3, example_translation3, example_ipa3, 
example_sentence, example_sentence_ipa, 
example_sentence2, example_sentence_ipa2, 
example_sentence3, example_sentence_ipa3`;

  const requestData = JSON.stringify({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.1, response_mime_type: "application/json" }
  });

  return new Promise((resolve, reject) => {
    const req = https.request(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' } },
        (res) => {
          let body = '';
          res.on('data', (chunk) => body += chunk);
          res.on('end', () => {
            try {
              const data = JSON.parse(body);
              const content = data.candidates[0].content.parts[0].text;
              resolve(JSON.parse(content));
            } catch (e) {
              console.error("Error parsing Gemini response:", body);
              reject(e);
            }
          });
        }
    );
    req.on('error', reject);
    req.write(requestData);
    req.end();
  });
}

async function run() {
  const db = new sqlite3.Database(dbPath);
  
  for (const group of PHONETIC_GROUPS) {
    console.log(`Generating cards for ${group.language} (${group.description})...`);
    try {
      const cards = await generateBatch(group);
      
      const insertStmt = db.prepare(`
        INSERT INTO cards (
          language, symbol, voicing, place, manner, height, backness, roundedness, type, description,
          example_word, example_translation, example_ipa,
          example_word2, example_translation2, example_ipa2,
          example_word3, example_translation3, example_ipa3,
          example_sentence, example_sentence_ipa,
          example_sentence2, example_sentence_ipa2,
          example_sentence3, example_sentence_ipa3
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const card of cards) {
        insertStmt.run(
          card.language || group.language, 
          card.symbol, card.voicing, card.place, card.manner, card.height, card.backness, card.roundedness, 
          card.type || (card.height ? 'vowel' : 'consonant'),
          card.description,
          card.example_word, card.example_translation, card.example_ipa,
          card.example_word2, card.example_translation2, card.example_ipa2,
          card.example_word3, card.example_translation3, card.example_ipa3,
          card.example_sentence, card.example_sentence_ipa,
          card.example_sentence2, card.example_sentence_ipa2,
          card.example_sentence3, card.example_sentence_ipa3
        );
      }
      insertStmt.finalize();
      console.log(`Successfully added ${cards.length} cards for ${group.language}.`);
    } catch (e) {
      console.error(`Failed to generate batch for ${group.language}:`, e);
    }
  }
}

run().catch(console.error);
