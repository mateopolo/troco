import fs from 'fs';
import path from 'path';
import { BACKDROP_CLASSNAME, BACKDROP_STYLE } from './ui/modalBackdrop';

describe('UX-02: Uniformisation du Backdrop Opaque et Flouté sur TOUTES les Modales', () => {
  const universalModalPath = path.join(__dirname, 'ui/UniversalModal.jsx');
  const appJsPath = path.join(__dirname, '../App.js');
  const listingDetailPath = path.join(__dirname, 'ListingDetailModal.jsx');
  const cguModalPath = path.join(__dirname, 'CguModal.jsx');
  const cguConsentModalPath = path.join(__dirname, 'modals/CguConsentModal.jsx');
  const privacyCenterPath = path.join(__dirname, 'PrivacyCenterModal.jsx');
  const paymentModalPath = path.join(__dirname, 'PaymentModal.jsx');
  const transactionsHistoryPath = path.join(__dirname, 'TransactionsHistoryModal.jsx');
  const designStudioPath = path.join(__dirname, 'DesignStudioModal.jsx');
  const dealRatingPath = path.join(__dirname, 'DealRatingModal.jsx');
  const chatViewPath = path.join(__dirname, 'ChatView.jsx');

  test('1. modalBackdrop.js définit un standard sombre et hautement flouté (blur 16px minimum)', () => {
    expect(BACKDROP_CLASSNAME).toContain('bg-black/60');
    expect(BACKDROP_CLASSNAME).toContain('backdrop-blur-lg');
    expect(BACKDROP_STYLE.backgroundColor).toBe('rgba(0, 0, 0, 0.6)');
    expect(BACKDROP_STYLE.backdropFilter).toBe('blur(16px)');
    expect(BACKDROP_STYLE.WebkitBackdropFilter).toBe('blur(16px)');
  });

  test('2. UniversalModal adopte BACKDROP_CLASSNAME et BACKDROP_STYLE', () => {
    const content = fs.readFileSync(universalModalPath, 'utf-8');
    expect(content).toContain('BACKDROP_CLASSNAME');
    expect(content).toContain('BACKDROP_STYLE');
    expect(content).toContain('z-[99990]');
  });

  test('3. App.js selectedListing overlay utilise BACKDROP_CLASSNAME et BACKDROP_STYLE', () => {
    const orchestratorPath = path.join(__dirname, 'ModalOrchestrator.jsx');
    const targetFile = fs.existsSync(orchestratorPath) ? listingDetailPath : appJsPath;
    const content = fs.readFileSync(targetFile, 'utf-8');
    expect(content).toContain('BACKDROP_CLASSNAME');
    expect(content).toContain('BACKDROP_STYLE');
  });

  test('4. ListingDetailModal utilise BACKDROP_CLASSNAME et BACKDROP_STYLE avec z-index >= 99999', () => {
    const content = fs.readFileSync(listingDetailPath, 'utf-8');
    expect(content).toContain('BACKDROP_CLASSNAME');
    expect(content).toContain('BACKDROP_STYLE');
    expect(content).toContain('z-[99999]');
  });

  test('5. Les modales autonomes (CGU, RGPD, Paiement, Transactions, Design, Avis) appliquent modalBackdrop', () => {
    const cguContent = fs.readFileSync(cguModalPath, 'utf-8');
    const cguConsentContent = fs.readFileSync(cguConsentModalPath, 'utf-8');
    const privacyContent = fs.readFileSync(privacyCenterPath, 'utf-8');
    const paymentContent = fs.readFileSync(paymentModalPath, 'utf-8');
    const txContent = fs.readFileSync(transactionsHistoryPath, 'utf-8');
    const designContent = fs.readFileSync(designStudioPath, 'utf-8');
    const dealContent = fs.readFileSync(dealRatingPath, 'utf-8');

    expect(cguContent).toContain('BACKDROP_STYLE');
    expect(cguConsentContent).toContain('BACKDROP_STYLE');
    expect(privacyContent).toContain('BACKDROP_STYLE');
    expect(paymentContent).toContain('BACKDROP_STYLE');
    expect(txContent).toContain('BACKDROP_STYLE');
    expect(designContent).toContain('BACKDROP_STYLE');
    expect(dealContent).toContain('BACKDROP_STYLE');
  });

  test('6. ChatView modales internes appliquent BACKDROP_STYLE et BACKDROP_CLASSNAME', () => {
    const content = fs.readFileSync(chatViewPath, 'utf-8');
    expect(content).toContain('BACKDROP_CLASSNAME');
    expect(content).toContain('BACKDROP_STYLE');
  });
});
