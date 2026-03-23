/**
 * Jest Setup File
 * Configure test environment and global mocks
 */

import * as path from 'path';
import * as fs from 'fs';

// Mock environment variables
process.env.GOOGLE_API_KEY = 'test_key_12345';
process.env.GOOGLE_APPLICATION_CREDENTIALS = '/test/path/credentials.json';
process.env.NODE_ENV = 'test';

// Suppress console output in tests unless explicitly checking for it
const originalError = console.error;
const originalWarn = console.warn;
const originalLog = console.log;

beforeAll(() => {
  console.error = jest.fn();
  console.warn = jest.fn();
  console.log = jest.fn();
});

afterAll(() => {
  console.error = originalError;
  console.warn = originalWarn;
  console.log = originalLog;
});

// Reset mocks after each test
afterEach(() => {
  jest.clearAllMocks();
});

// Global test utilities
global.testTimeout = 10000;
