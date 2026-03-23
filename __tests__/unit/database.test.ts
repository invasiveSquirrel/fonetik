/**
 * Unit Tests: Database Operations
 * Tests for SQLite3 database connection, schema, and basic operations
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import * as sqlite3 from 'sqlite3';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

describe('Database Operations', () => {
  let testDbPath: string;
  let db: sqlite3.Database;

  beforeEach((done) => {
    // Create a temporary database for testing
    testDbPath = path.join(os.tmpdir(), `fonetik-test-${Date.now()}.db`);
    db = new sqlite3.Database(testDbPath, (err) => {
      if (err) done(err);
      else {
        // Initialize schema
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
            if (err) done(err);
            else done();
          });
        });
      }
    });
  });

  afterEach((done) => {
    if (db !== null) {
      db.close((err) => {
        if (err) console.error('Error closing test database:', err);
        // Clean up test file
        if (fs.existsSync(testDbPath)) {
          fs.unlinkSync(testDbPath);
        }
        done();
      });
    }
  });

  test('Database connection should succeed', () => {
    expect(db).toBeDefined();
  });

  test('Should create cards table with correct schema', (done) => {
    db.all('PRAGMA table_info(cards)', (err: any, rows: any[]) => {
      expect(err).toBeNull();
      expect(rows).toBeDefined();
      expect(rows.length).toBeGreaterThan(0);
      
      const columnNames = rows.map(r => r.name);
      expect(columnNames).toContain('id');
      expect(columnNames).toContain('language');
      expect(columnNames).toContain('symbol');
      expect(columnNames).toContain('example_word');
      expect(columnNames).toContain('example_ipa');
      done();
    });
  });

  test('Should insert card into database', (done) => {
    const testCard = {
      language: 'Swedish (Stockholm)',
      symbol: '[p]',
      voicing: 'voiceless',
      place: 'bilabial',
      manner: 'plosive',
      type: 'consonant',
      description: 'Voiceless bilabial plosive',
      example_word: 'pappa',
      example_translation: 'dad',
      example_ipa: '[ˈpapːa]',
      example_word2: 'söp',
      example_translation2: 'sleep',
      example_ipa2: '[ˈsöp]',
      example_word3: 'upp',
      example_translation3: 'up',
      example_ipa3: '[ʊpː]',
    };

    db.run(
      `INSERT INTO cards (language, symbol, voicing, place, manner, type, description, example_word, example_translation, example_ipa, example_word2, example_translation2, example_ipa2, example_word3, example_translation3, example_ipa3)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      Object.values(testCard),
      function(err) {
        expect(err).toBeNull();
        expect(this.lastID).toBeGreaterThan(0);
        done();
      }
    );
  });

  test('Should retrieve cards by language', (done) => {
    const testCards = [
      {
        language: 'Dutch (Netherlands)',
        symbol: '[p]',
        voicing: 'voiceless',
        place: 'bilabial',
        manner: 'plosive',
        type: 'consonant',
        description: 'Voiceless bilabial plosive',
        example_word: 'pap',
        example_translation: 'porridge',
        example_ipa: '[pɑp]',
      },
      {
        language: 'Dutch (Netherlands)',
        symbol: '[b]',
        voicing: 'voiced',
        place: 'bilabial',
        manner: 'plosive',
        type: 'consonant',
        description: 'Voiced bilabial plosive',
        example_word: 'bab',
        example_translation: 'baby',
        example_ipa: '[bɑb]',
      },
    ];

    // Insert multiple cards one at a time
    const insertCard = (index: number) => {
      if (index >= testCards.length) {
        // Query by language
        db.all('SELECT * FROM cards WHERE language = ? ORDER BY symbol', ['Dutch (Netherlands)'], (err: any, rows: any[]) => {
          expect(err).toBeNull();
          expect(rows).toHaveLength(2);
          expect(rows.some(r => r.symbol === '[p]')).toBe(true);
          expect(rows.some(r => r.symbol === '[b]')).toBe(true);
          done();
        });
        return;
      }

      const card = testCards[index];
      db.run(
        `INSERT INTO cards (language, symbol, voicing, place, manner, type, description, example_word, example_translation, example_ipa)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [card.language, card.symbol, card.voicing, card.place, card.manner, card.type, card.description, card.example_word, card.example_translation, card.example_ipa],
        (err) => {
          expect(err).toBeNull();
          insertCard(index + 1);
        }
      );
    };

    insertCard(0);
  }, 15000);

  test('Should not violate unique constraint', (done) => {
    const card = {
      language: 'Scottish Gaelic',
      symbol: '[k]',
      voicing: 'voiceless',
      place: 'velar',
      manner: 'plosive',
      type: 'consonant',
      description: 'Voiceless velar plosive',
      example_word: 'cat',
      example_translation: 'cat',
      example_ipa: '[kʰat]',
    };

    const insertCard = () => {
      db.run(
        `INSERT INTO cards (language, symbol, voicing, place, manner, type, description, example_word, example_translation, example_ipa)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        Object.values(card),
        (err) => {
          expect(err).toBeNull();
        }
      );
    };

    insertCard();
    
    // Try inserting duplicate - should fail with UNIQUE constraint violation
    setTimeout(() => {
      db.run(
        `INSERT INTO cards (language, symbol, voicing, place, manner, type, description, example_word, example_translation, example_ipa)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        Object.values(card),
        (err) => {
          expect(err).not.toBeNull();
          expect(err?.message).toContain('UNIQUE');
          done();
        }
      );
    }, 100);
  });

  test('Should handle multiple concurrent operations', (done) => {
    const operations: Promise<void>[] = [];

    for (let i = 0; i < 10; i++) {
      const promise = new Promise<void>((resolve, reject) => {
        const card = {
          language: 'Test Language',
          symbol: `[t${i}]`,
          voicing: 'voiceless',
          place: 'alveolar',
          manner: 'plosive',
          type: 'consonant',
          description: `Test sound ${i}`,
          example_word: `word${i}`,
          example_translation: `word ${i}`,
          example_ipa: `[test${i}]`,
        };

        db.run(
          `INSERT INTO cards (language, symbol, voicing, place, manner, type, description, example_word, example_translation, example_ipa)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          Object.values(card),
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });
      operations.push(promise);
    }

    Promise.all(operations)
      .then(() => {
        db.get('SELECT COUNT(*) as count FROM cards WHERE language = ?', ['Test Language'], (err: any, row: any) => {
          expect(err).toBeNull();
          expect(row.count).toBe(10);
          done();
        });
      })
      .catch(done);
  });
});
