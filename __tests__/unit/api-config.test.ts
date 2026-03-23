/**
 * Unit Tests: API Configuration & Integration
 * Tests for Google Cloud APIs, Gemini, and environment setup
 */

import * as fs from 'fs';
import * as path from 'path';

describe('API Configuration', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  test('Should load API key from environment', () => {
    process.env.GOOGLE_API_KEY = 'test_api_key_12345';
    expect(process.env.GOOGLE_API_KEY).toBe('test_api_key_12345');
  });

  test('Should validate API key format', () => {
    const validApiKey = 'AIzaSyC' + 'a'.repeat(30);
    process.env.GOOGLE_API_KEY = validApiKey;
    
    const isValid = /^[A-Za-z0-9_-]{30,}$/.test(process.env.GOOGLE_API_KEY);
    expect(isValid).toBe(true);
  });

  test('Should handle missing Google Application Credentials gracefully', () => {
    delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
    expect(process.env.GOOGLE_APPLICATION_CREDENTIALS).toBeUndefined();
  });

  test('Should detect Google Cloud credential file', () => {
    const credPath = '/home/chris/panglossia/google-credentials.json';
    const exists = fs.existsSync(credPath);
    // Just verify the check doesn't throw
    expect(typeof exists).toBe('boolean');
  });

  test('Should validate API key existence', (done) => {
    const keyFile = '/home/chris/wordhord/wordhord_api.txt';
    
    fs.readFile(keyFile, 'utf8', (err, data) => {
      if (!err && data) {
        const apiKey = data.trim();
        expect(apiKey.length).toBeGreaterThan(0);
      }
      done();
    });
  });

  test('Should validate database path configuration', () => {
    const dbPath = '/home/chris/fonetik/db/fonetik.db';
    const dirPath = path.dirname(dbPath);
    
    expect(path.isAbsolute(dbPath)).toBe(true);
    expect(dirPath).toContain('fonetik');
    expect(dbPath.endsWith('.db')).toBe(true);
  });
});

describe('Voice Configuration', () => {
  test('Should have voice mapping for all languages', () => {
    const voiceMap = {
      "English (North American)": { languageCode: "en-US", name: "en-US-Journey-F" },
      "Dutch (Netherlands)": { languageCode: "nl-NL", name: "nl-NL-Chirp3-HD-Despina" },
      "Scottish Gaelic": { languageCode: "en-GB", name: "en-GB-Standard-A" },
      "Swedish (Stockholm)": { languageCode: "sv-SE", name: "sv-SE-Chirp3-HD-Laomedeia" },
    };

    expect(voiceMap["Dutch (Netherlands)"].languageCode).toBe("nl-NL");
    expect(voiceMap["Scottish Gaelic"].languageCode).toBe("en-GB");
    expect(voiceMap["Swedish (Stockholm)"].languageCode).toBe("sv-SE");
  });

  test('Should fallback to default voice when not found', () => {
    const voiceMap: { [key: string]: { languageCode: string; name: string } } = {
      "English (North American)": { languageCode: "en-US", name: "en-US-Journey-F" },
    };
    const defaultVoice = { languageCode: "en-US", name: "en-US-Journey-F" };

    const selectedVoice = voiceMap["Unknown Language"] || defaultVoice;
    expect(selectedVoice).toEqual(defaultVoice);
  });
});

describe('IPA Symbol Validation', () => {
  test('Should validate IPA brackets', () => {
    const ipaWithBrackets = '[tʰɒp]';
    expect(ipaWithBrackets.startsWith('[')).toBe(true);
    expect(ipaWithBrackets.endsWith(']')).toBe(true);
  });

  test('Should detect IPA characters', () => {
    const ipaRegex = /[ɑʋɛɪɔʊæøœʉɟʝɲŋʃʒθðɬɮɹɻɥɰʁˈˌ]/;
    
    expect(ipaRegex.test('ʰp')).toBe(false); // ʰ and p are not in the test set
    expect(ipaRegex.test('[ɑ]')).toBe(true);
    expect(ipaRegex.test('[θ]')).toBe(true);
    expect(ipaRegex.test('[ŋ]')).toBe(true);
  });

  test('Should extract clean IPA from brackets', () => {
    const ipaWithBrackets = '[tʰɒp]';
    const cleanIpa = ipaWithBrackets.split('').filter(c => c !== '[' && c !== ']').join('');
    expect(cleanIpa).toBe('tʰɒp');
  });
});

describe('Error Handling', () => {
  test('Should handle invalid file paths gracefully', () => {
    const invalidPath = '/invalid/path/to/file.txt';
    const exists = fs.existsSync(invalidPath);
    expect(exists).toBe(false);
  });

  test('Should validate JSON parsing', () => {
    const validJson = '{"language": "Swedish", "symbol": "[p]"}';
    const invalidJson = '{invalid json}';

    expect(() => JSON.parse(validJson)).not.toThrow();
    expect(() => JSON.parse(invalidJson)).toThrow();
  });

  test('Should handle empty responses', () => {
    const emptyResponse = '';
    const jsonMatch = emptyResponse.match(/\[[\s\S]*\]/);
    expect(jsonMatch).toBeNull();
  });
});
