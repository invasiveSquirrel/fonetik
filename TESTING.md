# Testing Guide for Fonetik

This document explains the comprehensive test suite for the fonetik IPA learning application.

## Quick Start

```bash
# Install dependencies (including test tools)
npm install

# Run all tests with coverage
npm test

# Run specific test suites
npm run test:unit          # Database & API configuration tests  
npm run test:integration   # Language data & workflow tests
npm run test:concurrent    # Multi-app resource sharing tests

# Run tests in watch mode (auto-rerun on changes)
npm run test:watch
```

## Test Architecture

### 1. Unit Tests (`__tests__/unit/`)

Tests for isolated components without external dependencies.

#### `database.test.ts` (8 tests)
- Database connection and initialization
- Table schema creation and validation
- Single card insertion
- Language-filtered queries
- UNIQUE constraint enforcement
- Concurrent insert operations (10 simultaneous)
- Database cleanup and resource deallocation

**Key Coverage**:
- SQLite3 database operations
- Schema validation
- Data integrity
- Concurrent safety

#### `api-config.test.ts` (12 tests)
- Environment variable configuration
- API key format validation
- Google Cloud credentials handling
- Voice mapping for all supported languages
- Voice fallback mechanisms
- IPA symbol validation
- Error handling for edge cases
- Database path configuration

**Key Coverage**:
- Configuration management
- API integration setup
- Error resilience
- Multi-language voice support

### 2. Integration Tests (`__tests__/integration/`)

Tests for realistic workflows combining multiple components.

#### `database-integration.test.ts` (5 tests)
- Loading Swedish (Stockholm) phonemes with complete articulatory features
- Dutch (Netherlands) cards with vowel length markers
- Scottish Gaelic broad/slender consonant distinctions
- Gaelic pre-aspiration features
- Multi-language search efficiency
- Three examples per phoneme validation

**Key Coverage**:
- Language-specific phonetic data
- Complex linguistic features (diacritics, stress, etc.)
- Real-world query patterns
- Data completeness validation

### 3. Concurrent/Resource Tests (`__tests__/concurrent/`)

Tests for safe operation alongside other applications (wordhord, strutur, panglossia).

#### `resource-sharing.test.ts` (13 tests)

**Resource Conflict Detection** (3 tests):
- Available port identification
- Database file lock prevention
- Credential path isolation

**Concurrent Application Simulation** (4 tests):
- Simultaneous database access
- API key isolation between apps
- Temporary file conflict prevention
- IPC channel isolation

**Resource Memory Limits** (2 tests):
- Memory requirement documentation
- Free memory tracking

**Concurrent Database Operations** (1 test):
- Database lock handling with exponential backoff

**Process Health Checks** (3 tests):
- Process blocking prevention
- Operation timeout protection
- Graceful process termination

**Key Coverage**:
- Multi-app compatibility
- Resource isolation
- Lock handling
- Process management

## Test Data

### Languages Tested
- **Swedish (Stockholm)**: Consonants, vowels, diphthongs, stress marks
- **Dutch (Netherlands)**: Long vs short vowels, rounded/unrounded distinction
- **Scottish Gaelic**: Broad/slender, pre-aspiration, vowel length

### Test Database Schema
```sql
CREATE TABLE cards (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  language TEXT NOT NULL,
  symbol TEXT NOT NULL,
  voicing TEXT,                    -- consonant feature
  place TEXT,                      -- consonant feature
  manner TEXT,                     -- consonant feature
  height TEXT,                     -- vowel feature
  backness TEXT,                   -- vowel feature
  roundedness TEXT,                -- vowel feature
  type TEXT NOT NULL,              -- 'consonant' or 'vowel'
  description TEXT,
  example_word TEXT,               -- 1st example word
  example_translation TEXT,
  example_ipa TEXT,
  example_word2 TEXT,              -- 2nd example word
  example_translation2 TEXT,
  example_ipa2 TEXT,
  example_word3 TEXT,              -- 3rd example word
  example_translation3 TEXT,
  example_ipa3 TEXT,
  UNIQUE(language, symbol, example_word)
);
```

## Concurrent App Environment

The test suite validates safe operation with:

```
┌─────────────────────────────────────────────────────────┐
│ fonetik (500MB) - IPA Learning                           │
│ ├── Database: /home/chris/fonetik/db/fonetik.db         │
│ ├── IPC: get-cards, play-ipa, evaluate-audio, save-cards│
│ └── API: GOOGLE_API_KEY (Gemini)                        │
├─────────────────────────────────────────────────────────┤
│ wordhord (300MB) - Word Learning                         │
│ ├── Database: /home/chris/wordhord/wordhord.db          │
│ ├── IPC: get-words, search-words, add-word              │
│ └── API: wordhord_api.txt                               │
├─────────────────────────────────────────────────────────┤
│ strutur (250MB) - Structure Learning                     │
│ ├── Database: /home/chris/strutur/strutur.db            │
│ ├── IPC: create-structure, query-structure              │
│ └── No external API                                      │
├─────────────────────────────────────────────────────────┤
│ panglossia (400MB) - Language Processing                 │
│ ├── Database: /home/chris/panglossia/panglossia.db      │
│ ├── IPC: get-languages, process-audio                    │
│ └── Credentials: google-credentials.json (shared, RO)   │
└─────────────────────────────────────────────────────────┘
Total Memory Needed: 1450MB
```

## Configuration

### Jest Configuration (`jest.config.js`)
- Test environment: Node.js
- Test pattern: `__tests__/**/*.test.ts?(x)`
- Timeout: 10 seconds per test (some tests override with 15s)
- TypeScript support via ts-jest
- Coverage tracking enabled

### Key Files
- `jest.config.js` - Jest configuration
- `__tests__/setup.ts` - Test environment setup
- `__tests__/unit/**` - Unit tests
- `__tests__/integration/**` - Integration tests
- `__tests__/concurrent/**` - Concurrent/resource tests

## Coverage Targets

```
global:
  - statements: 70% minimum
  - branches: 50% minimum  
  - lines: 70% minimum
  - functions: 60% minimum
```

Note: Frontend components (React/Electron) are excluded from coverage requirements as they are tested through integration tests and manual QA.

## Debugging Failed Tests

### Run with verbose output
```bash
npm test -- --verbose
```

### Run specific test file
```bash
npm test -- database.test.ts
```

### Run specific test case
```bash
npm test -- -t "Should retrieve cards by language"
```

### Debug with Node inspector
```bash
node --inspect-brk ./node_modules/.bin/jest --runInBand
```

### Check for open handles (resource leaks)
```bash
npm test -- --detectOpenHandles
```

## Common Issues

### Test Timeout
- Increase timeout in test: `test('name', async () => {...}, 15000)`
- Check for unresolved promises or callbacks
- Verify database connections are closed in afterEach

### Database Lock Errors
- Tests use separate temp database files to prevent conflicts
- Ensure proper cleanup in afterEach hooks
- Check for open database connections

### IPC Channel Conflicts
- Each app has unique channel names
- Tests validate no overlap
- Prefix channels with app name if adding new ones

## Contributing Tests

When adding new features:

1. **Write unit tests first** for new database operations or API integrations
2. **Add integration tests** for features combining multiple components
3. **Include concurrent tests** if feature affects timing or resources
4. **Document assumptions** about external services or configurations
5. **Use meaningful test names** that describe what's being tested
6. **Clean up resources** in afterEach/afterAll hooks

### Test Template
```typescript
describe('Feature Category', () => {
  beforeEach((done) => {
    // Setup
    done();
  });

  afterEach((done) => {
    // Cleanup
    done();
  });

  test('Should describe specific behavior', (done) => {
    // Arrange
    
    // Act
    
    // Assert
    expect(result).toBe(expected);
    done();
  }, 10000); // timeout in ms
});
```

## Performance Targets

Tests should run in under 30 seconds total:
- Unit tests: <5s
- Integration tests: <5s
- Concurrent tests: <15s

If tests exceed this, investigate for:
- Slow database queries
- Excessive I/O operations
- External API calls without mocks
- Inefficient algorithms

## Continuous Integration

The test suite is designed to run in CI/CD pipelines:
```bash
npm ci                 # Install locked dependencies
npm run test:unit       # Quick validation
npm test               # Full suite with coverage
```

## Related Documentation

- [TEST_REPORT.md](./TEST_REPORT.md) - Detailed test results and coverage
- [README.md](./README.md) - Application overview
- [jest.config.js](./jest.config.js) - Jest configuration
