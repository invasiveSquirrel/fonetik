const sqlite3 = require('sqlite3').verbose();
const path = require('node:path');
const fs = require('node:fs/promises');

const dbPath = '/home/chris/fonetik/db/fonetik.db';

async function cleanup() {
  const db = new sqlite3.Database(dbPath);

  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // 1. Remove non-distinct English clusters (e.g., st, pr, kl, br, etc.)
      // These are usually represented as simple combinations of two phonemes without a tie.
      console.log('Removing non-distinct English consonant clusters...');
      const EnglishClustersToRemove = [
        'st', 'pr', 'kl', 'br', 'kr', 'tr', 'dr', 'gr', 'pl', 'fl', 'gl', 'sl', 'bl', 'sp', 'sk', 'sm', 'sn', 'sw', 'tw', 'dw', 'gw', 'kw', 'qu'
      ];
      
      const placeholders = EnglishClustersToRemove.map(() => '?').join(',');
      db.run(`
        DELETE FROM cards 
        WHERE language LIKE 'English%' 
        AND (symbol IN (${placeholders}) OR symbol IN (${EnglishClustersToRemove.map(s => `'[${s}]'`).join(',')}))
      `, EnglishClustersToRemove, (err) => {
        if (err) console.error('Cluster removal error:', err);
      });

      // 2. Enforce [] formatting and ties
      console.log('Enforcing IPA formatting and standardizing ties...');
      db.all(`SELECT id, symbol, example_ipa, example_ipa2, example_ipa3, example_sentence_ipa, example_sentence_ipa2, example_sentence_ipa3 FROM cards`, [], (err, rows) => {
        if (err) {
          reject(err);
          return;
        }

        const updateStmt = db.prepare(`
          UPDATE cards SET 
            symbol = ?, 
            example_ipa = ?, 
            example_ipa2 = ?, 
            example_ipa3 = ?, 
            example_sentence_ipa = ?, 
            example_sentence_ipa2 = ?, 
            example_sentence_ipa3 = ? 
          WHERE id = ?
        `);

        for (const row of rows) {
          const format = (val) => {
            if (!val) return val;
            let s = val.trim();
            if (!s.startsWith('[')) s = '[' + s;
            if (!s.endsWith(']')) s = s + ']';
            // Standardize ties to U+0361
            s = s.replace(/[\u035C\u2040]/g, '\u0361'); 
            return s;
          };

          updateStmt.run(
            format(row.symbol),
            format(row.example_ipa),
            format(row.example_ipa2),
            format(row.example_ipa3),
            format(row.example_sentence_ipa),
            format(row.example_sentence_ipa2),
            format(row.example_sentence_ipa3),
            row.id
          );
        }
        updateStmt.finalize();
        console.log('Cleanup complete.');
        resolve();
      });
    });
  });
}

cleanup().catch(console.error);
