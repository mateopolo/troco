// @vitest-environment jsdom
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import logger from '../../src/utils/logger';
import fs from 'fs';
import path from 'path';

describe('Logger & Console Cleanliness Audit [E2E-FAIL-01]', () => {
  let consoleErrorSpy;
  let consoleWarnSpy;
  let consoleLogSpy;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleLogSpy.mockRestore();
  });

  test('logger.error downgrades expected Firestore permission-denied errors to console.warn', () => {
    logger.error('FirebaseError: Missing or insufficient permissions.');
    expect(consoleErrorSpy).not.toHaveBeenCalled();
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('[WARN] [Firestore Expected Permission]'),
      expect.stringContaining('Missing or insufficient permissions')
    );
  });

  test('logger.error downgrades Property admin is undefined errors to console.warn', () => {
    logger.error('FirebaseError: Property admin is undefined on object.');
    expect(consoleErrorSpy).not.toHaveBeenCalled();
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('[WARN] [Firestore Expected Permission]'),
      expect.stringContaining('Property admin is undefined')
    );
  });

  test('logger.error still logs unexpected runtime errors to console.error in development', () => {
    logger.error('Unexpected critical application crash');
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '[ERROR]',
      'Unexpected critical application crash'
    );
  });

  test('Source code audit: no direct console.log exists in src/ outside logger.js', () => {
    const srcDir = path.resolve(__dirname, '../../src');
    const filesWithConsoleLog = [];

    function scanDir(dir) {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          scanDir(fullPath);
        } else if (/\.(js|jsx)$/.test(entry.name) && !entry.name.includes('.test.')) {
          if (fullPath.endsWith(path.join('src', 'utils', 'logger.js'))) continue;
          const content = fs.readFileSync(fullPath, 'utf8');
          if (content.includes('console.log(')) {
            filesWithConsoleLog.push(path.relative(srcDir, fullPath));
          }
        }
      }
    }

    scanDir(srcDir);
    expect(filesWithConsoleLog).toEqual([]);
  });

  test('Source code audit: no direct console.error exists in src/ outside logger.js', () => {
    const srcDir = path.resolve(__dirname, '../../src');
    const filesWithConsoleError = [];

    function scanDir(dir) {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          scanDir(fullPath);
        } else if (/\.(js|jsx)$/.test(entry.name) && !entry.name.includes('.test.')) {
          if (fullPath.endsWith(path.join('src', 'utils', 'logger.js'))) continue;
          const content = fs.readFileSync(fullPath, 'utf8');
          if (content.includes('console.error(')) {
            filesWithConsoleError.push(path.relative(srcDir, fullPath));
          }
        }
      }
    }

    scanDir(srcDir);
    expect(filesWithConsoleError).toEqual([]);
  });
});
