import fs from 'fs';
import path from 'path';

describe('PHASE 106 : Kill-Switch CSS Pour OOM Crash iOS', () => {
  test('index.css contains the global mobile kill-switch media query disabling backdrop-filter and hiding liquid-iridescence-container', () => {
    const cssPath = path.resolve(__dirname, '../index.css');
    const cssContent = fs.readFileSync(cssPath, 'utf8');

    // Verification 1: Media query @media (max-width: 768px) exists
    expect(cssContent).toContain('@media (max-width: 768px)');

    // Verification 2: Universal selector backdrop-filter kill-switch is present
    expect(cssContent).toMatch(/@media\s*\(max-width:\s*768px\)\s*\{[\s\S]*?\*\s*\{[\s\S]*?-webkit-backdrop-filter:\s*none\s*!important;[\s\S]*?backdrop-filter:\s*none\s*!important;[\s\S]*?\}/);

    // Verification 3: liquid-iridescence-container is hidden
    expect(cssContent).toMatch(/\.liquid-iridescence-container\s*\{\s*display:\s*none\s*!important;\s*\}/);
  });

  test('Modal components provide solid background fallback for mobile contrast (bg-black/95 or bg-black/90)', () => {
    const modalsDir = path.resolve(__dirname, 'modals');
    const langModal = fs.readFileSync(path.join(modalsDir, 'LanguageSelectModal.jsx'), 'utf8');
    const catModal = fs.readFileSync(path.join(modalsDir, 'CategoryPickerModal.jsx'), 'utf8');
    const boostModal = fs.readFileSync(path.join(modalsDir, 'BoostListingModal.jsx'), 'utf8');
    const cguModal = fs.readFileSync(path.join(modalsDir, 'CguConsentModal.jsx'), 'utf8');

    expect(langModal).toContain('bg-black/95');
    expect(catModal).toContain('bg-black/95');
    expect(boostModal).toContain('bg-black/95');
    expect(cguModal).toContain('bg-black/95');
  });
});
