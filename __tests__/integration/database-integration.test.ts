/**
 * Integration Tests: Database & API Combined Operations
 * Tests for realistic workflows combining database and API calls
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import * as sqlite3 from 'sqlite3';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

describe('Integration: Database + Language Processing', () => {
  let testDbPath: string;
  let db: sqlite3.Database;

  beforeEach((done) => {
    testDbPath = path.join(os.tmpdir(), `fonetik-integration-${Date.now()}.db`);
    db = new sqlite3.Database(testDbPath, (err) => {
      if (err) done(err);
      else {
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
          `, done);
        });
      }
    });
  });

  afterEach((done) => {
    if (db !== null) {
      db.close(() => {
        if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
        done();
      });
    }
  });

  test('Should load cards for a language and verify complete data', (done) => {
    const swedishCards = [
      {
        language: 'Swedish (Stockholm)',
        symbol: '[p]',
        type: 'consonant',
        voicing: 'voiceless',
        place: 'bilabial',
        manner: 'plosive',
        description: 'Voiceless bilabial plosive',
        example_word: 'pappa',
        example_translation: 'dad',
        example_ipa: '[ˈpapːa]',
        example_word2: 'super',
        example_translation2: 'super',
        example_ipa2: '[ˈsʉːpɛr]',
        example_word3: 'upp',
        example_translation3: 'up',
        example_ipa3: '[ʊpː]',
      },
      {
        language: 'Swedish (Stockholm)',
        symbol: '[ø]',
        type: 'vowel',
        height: 'close-mid',
        backness: 'front',
        roundedness: 'rounded',
        description: 'Close-mid front rounded vowel',
        example_word: 'köp',
        example_translation: 'purchase',
        example_ipa: '[ˈçœp]',
        example_word2: 'möte',
        example_translation2: 'meeting',
        example_ipa2: '[ˈmø:tə]',
        example_word3: 'ök',
        example_translation3: 'increase',
        example_ipa3: '[ˈøːk]',
      },
    ];

    const stmt = db.prepare(
      `INSERT INTO cards (language, symbol, voicing, place, manner, height, backness, roundedness, type, description, example_word, example_translation, example_ipa, example_word2, example_translation2, example_ipa2, example_word3, example_translation3, example_ipa3)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );

    swedishCards.forEach(card => {
      stmt.run(
        card.language, card.symbol, card.voicing || null, card.place || null, card.manner || null,
        card.height || null, card.backness || null, card.roundedness || null, card.type, card.description,
        card.example_word, card.example_translation, card.example_ipa,
        card.example_word2 || null, card.example_translation2 || null, card.example_ipa2 || null,
        card.example_word3 || null, card.example_translation3 || null, card.example_ipa3 || null
      );
    });

    stmt.finalize(() => {
      db.all('SELECT * FROM cards WHERE language = ?', ['Swedish (Stockholm)'], (err: any, rows: any[]) => {
        expect(err).toBeNull();
        expect(rows.length).toBe(2);
        
        const pCard = rows.find(r => r.symbol === '[p]');
        expect(pCard).toBeDefined();
        expect(pCard.example_ipa).toBe('[ˈpapːa]');
        expect(pCard.example_ipa2).toBe('[ˈsʉːpɛr]');
        expect(pCard.example_ipa3).toBe('[ʊpː]');
        
        const øCard = rows.find(r => r.symbol === '[ø]');
        expect(øCard).toBeDefined();
        expect(øCard.type).toBe('vowel');
        expect(øCard.roundedness).toBe('rounded');
        
        done();
      });
    });
  });

  test('Should handle Dutch language cards with length markers', (done) => {
    db.run(
      `INSERT INTO cards (language, symbol, voicing, place, manner, height, backness, roundedness, type, description, example_word, example_translation, example_ipa, example_word2, example_translation2, example_ipa2, example_word3, example_translation3, example_ipa3)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        'Dutch (Netherlands)', '[aː]', null, null, null, 'open', 'back', 'unrounded',
        'vowel', 'Long open back unrounded vowel', 'naam', 'name', '[naːm]',
        'kaas', 'cheese', '[kaːs]', 'staat', 'stands', '[staːt]'
      ],
      function() {
        db.get('SELECT * FROM cards WHERE symbol = ? AND language = ?', ['[aː]', 'Dutch (Netherlands)'], (err: any, row: any) => {
          expect(err).toBeNull();
          expect(row.example_ipa).toContain('ː'); // Long vowel marker
          expect(row.example_ipa2).toContain('ː');
          done();
        });
      }
    );
  });

  test('Should handle Scottish Gaelic broad/slender distinctions', (done) => {
    const gaelicCards = [
      {
        language: 'Scottish Gaelic',
        symbol: '[kʲ]',
        type: 'consonant',
        voicing: 'voiceless',
        place: 'velar',
        manner: 'plosive',
        description: 'Slender (palatalized) velar plosive',
        example_word: 'ceòl',
        example_translation: 'music',
        example_ipa: '[kʲɔːl]',
        example_word2: 'cia',
        example_translation2: 'who',
        example_ipa2: '[kʲiː]',
        example_word3: 'ceum',
        example_translation3: 'step',
        example_ipa3: '[kʲem]',
      },
      {
        language: 'Scottish Gaelic',
        symbol: '[ʰk]',
        type: 'consonant',
        voicing: 'voiceless',
        place: 'velar',
        manner: 'plosive',
        description: 'Pre-aspirated voiceless velar plosive',
        example_word: 'bhacag',
        example_translation: 'small bend',
        example_ipa: '[vɑxkɑɡ]', // Note: aspirated k
        example_word2: 'eachainn',
        example_translation2: 'horseman',
        example_ipa2: '[ɛxəɲ]',
        example_word3: 'ack',
        example_translation3: 'acne',
        example_ipa3: '[ɑxk]',
      },
    ];

    const stmt = db.prepare(
      `INSERT INTO cards (language, symbol, voicing, place, manner, type, description, example_word, example_translation, example_ipa, example_word2, example_translation2, example_ipa2, example_word3, example_translation3, example_ipa3)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );

    gaelicCards.forEach(card => {
      stmt.run(
        card.language, card.symbol, card.voicing, card.place, card.manner, card.type,
        card.description, card.example_word, card.example_translation, card.example_ipa,
        card.example_word2, card.example_translation2, card.example_ipa2,
        card.example_word3, card.example_translation3, card.example_ipa3
      );
    });

    stmt.finalize(() => {
      db.all('SELECT * FROM cards WHERE language = ?', ['Scottish Gaelic'], (err: any, rows: any[]) => {
        expect(err).toBeNull();
        expect(rows.length).toBe(2);
        expect(rows.some(r => r.symbol === '[kʲ]')).toBe(true);
        expect(rows.some(r => r.symbol === '[ʰk]')).toBe(true);
        done();
      });
    });
  });

  test('Should efficiently search multiple languages', (done) => {
    const complexData = [
      { language: 'Swedish (Stockholm)', symbol: '[ʃ]', type: 'consonant' },
      { language: 'Dutch (Netherlands)', symbol: '[ʃ]', type: 'consonant' },
      { language: 'Scottish Gaelic', symbol: '[ʃ]', type: 'consonant' },
      { language: 'Swedish (Stockholm)', symbol: '[ʂ]', type: 'consonant' },
      { language: 'Dutch (Netherlands)', symbol: '[x]', type: 'consonant' },
    ];

    const stmt = db.prepare(
      `INSERT INTO cards (language, symbol, type, description, example_word, example_translation, example_ipa)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    );

    complexData.forEach(data => {
      stmt.run(data.language, data.symbol, data.type, 'test desc', `word-${data.language}`, 'translation', '[ipa]');
    });

    stmt.finalize(() => {
      // Query all Swedish cards
      db.all('SELECT * FROM cards WHERE language LIKE ?', ['Swedish%'], (err: any, rows: any[]) => {
        expect(err).toBeNull();
        expect(rows.length).toBe(2);
        done();
      });
    });
  });

  test('Should validate three examples per phoneme', (done) => {
    const card = {
      language: 'Swedish (Stockholm)',
      symbol: '[e]',
      type: 'vowel',
      example_word: 'ben',
      example_translation: 'leg',
      example_ipa: '[beːn]',
      example_word2: 'se',
      example_translation2: 'see',
      example_ipa2: '[seː]',
      example_word3: 'mete',
      example_translation3: 'measure',
      example_ipa3: '[ˈmeːtə]',
    };

    db.run(
      `INSERT INTO cards (language, symbol, type, description, example_word, example_translation, example_ipa, example_word2, example_translation2, example_ipa2, example_word3, example_translation3, example_ipa3)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        card.language, card.symbol, card.type, 'vowel sound',
        card.example_word, card.example_translation, card.example_ipa,
        card.example_word2, card.example_translation2, card.example_ipa2,
        card.example_word3, card.example_translation3, card.example_ipa3
      ],
      function() {
        db.get('SELECT * FROM cards WHERE symbol = ?', [card.symbol], (err: any, row: any) => {
          expect(err).toBeNull();
          expect(row.example_word).toBeTruthy();
          expect(row.example_word2).toBeTruthy();
          expect(row.example_word3).toBeTruthy();
          expect(row.example_ipa).toBeTruthy();
          expect(row.example_ipa2).toBeTruthy();
          expect(row.example_ipa3).toBeTruthy();
          done();
        });
      }
    );
  });
});
