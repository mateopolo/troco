// @vitest-environment jsdom
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CloudOfficeSuiteModal from '../../src/components/CloudOfficeSuiteModal';
import TrocoDocs from '../../src/components/TrocoDocs';
import TrocoSheets from '../../src/components/TrocoSheets';
import TrocoSlides from '../../src/components/TrocoSlides';
import fileSaver from 'file-saver';
import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';

// Mock Firebase
vi.mock('../../src/firebase', () => ({
  db: {},
  storage: {},
}));

vi.mock('firebase/firestore', () => ({
  doc: vi.fn(() => ({ id: 'mock-doc' })),
  onSnapshot: vi.fn(() => () => {}),
  setDoc: vi.fn(() => Promise.resolve()),
  updateDoc: vi.fn(() => Promise.resolve()),
  collection: vi.fn(),
  addDoc: vi.fn(() => Promise.resolve()),
  serverTimestamp: vi.fn(() => 123456789),
}));

vi.mock('firebase/storage', () => ({
  ref: vi.fn(),
  uploadBytes: vi.fn(() => Promise.resolve({ ref: {} })),
  getDownloadURL: vi.fn(() => Promise.resolve('https://troco.app/test.png')),
}));

// Mock file-saver
vi.mock('file-saver', () => {
  const saveAsMock = vi.fn();
  return {
    default: saveAsMock,
    saveAs: saveAsMock,
  };
});

describe('[MOY-06] Troco Office Suite Native Document Exports', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('1. TrocoDocs - PDF Native Generation via jsPDF', () => {
    it('renders Docs export buttons with download icons and proper data-testid', () => {
      render(
        <TrocoDocs
          isOpen={true}
          onClose={vi.fn()}
          document={{ title: 'Contrat Prestation Troc', content: 'Cahier des charges collaboratif' }}
        />
      );

      const pdfBtn = screen.getByTestId('export-doc-pdf-btn');
      expect(pdfBtn).toBeDefined();
      expect(pdfBtn.textContent).toContain('PDF');

      const docxBtn = screen.getByTestId('export-doc-docx-btn');
      expect(docxBtn).toBeDefined();
      expect(docxBtn.textContent).toContain('DOCX');
    });

    it('triggers native PDF generation and saves file as .pdf via file-saver when clicking export PDF', async () => {
      render(
        <TrocoDocs
          isOpen={true}
          onClose={vi.fn()}
          document={{ title: 'Rapport Stratégique Troco', content: '# Mission 1\nSpécifications techniques\n- Point A\n- Point B' }}
        />
      );

      const pdfBtn = screen.getByTestId('export-doc-pdf-btn');
      fireEvent.click(pdfBtn);

      await waitFor(() => {
        expect(fileSaver).toHaveBeenCalled();
        const callArgs = fileSaver.mock.calls[0];
        const blob = callArgs[0];
        const filename = callArgs[1];
        expect(filename).toBe('rapport_strat_gique_troco.pdf');
        expect(blob).toBeDefined();
        expect(blob.type).toContain('pdf');
      });
    });

    it('triggers Word document (.docx) export via file-saver when clicking export DOCX', async () => {
      render(
        <TrocoDocs
          isOpen={true}
          onClose={vi.fn()}
          document={{ title: 'Spécifications Projet', content: 'Contenu Word' }}
        />
      );

      const docxBtn = screen.getByTestId('export-doc-docx-btn');
      fireEvent.click(docxBtn);

      await waitFor(() => {
        expect(fileSaver).toHaveBeenCalled();
        const callArgs = fileSaver.mock.calls[0];
        const filename = callArgs[1];
        expect(filename).toBe('sp_cifications_projet.docx');
      });
    });
  });

  describe('2. TrocoSheets - Excel Native Generation via XLSX', () => {
    it('renders Sheets export buttons with XLSX and CSV', () => {
      render(
        <TrocoSheets
          isOpen={true}
          onClose={vi.fn()}
          document={{
            sheetTitle: 'Budget Échange Q3',
            cells: { A1: 'Poste', B1: 'Montant', A2: 'Design', B2: '150' },
          }}
        />
      );

      const xlsxBtn = screen.getByTestId('export-sheet-xlsx-btn');
      expect(xlsxBtn).toBeDefined();
      expect(xlsxBtn.textContent).toContain('XLSX');

      const csvBtn = screen.getByTestId('export-sheet-csv-btn');
      expect(csvBtn).toBeDefined();
      expect(csvBtn.textContent).toContain('CSV');
    });

    it('generates real XLSX file via xlsx library and triggers download via file-saver', async () => {
      render(
        <TrocoSheets
          isOpen={true}
          onClose={vi.fn()}
          document={{
            sheetTitle: 'Comptabilité Jetons',
            cells: { A1: 'Membre', B1: 'Jetons', A2: 'Alice', B2: '500' },
          }}
        />
      );

      const xlsxBtn = screen.getByTestId('export-sheet-xlsx-btn');
      fireEvent.click(xlsxBtn);

      await waitFor(() => {
        expect(fileSaver).toHaveBeenCalled();
        const callArgs = fileSaver.mock.calls[0];
        const blob = callArgs[0];
        const filename = callArgs[1];
        expect(filename).toBe('comptabilit__jetons.xlsx');
        expect(blob).toBeDefined();
        expect(blob.type).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      });
    });
  });

  describe('3. TrocoSlides - Landscape PDF Generation', () => {
    it('renders Slides export buttons including PDF (Paysage) and PPTX', () => {
      render(
        <TrocoSlides
          isOpen={true}
          onClose={vi.fn()}
          document={{
            slidesTitle: 'Présentation Pitch Troco',
            slidesData: [
              { title: 'Introduction', subtitle: 'Vision globale', bullets: ['Troc décentralisé', 'Gains en jetons'] },
            ],
          }}
        />
      );

      const pdfBtn = screen.getByTestId('export-slides-pdf-btn');
      expect(pdfBtn).toBeDefined();
      expect(pdfBtn.textContent).toContain('PDF');

      const pptxBtn = screen.getByTestId('export-slides-pptx-btn');
      expect(pptxBtn).toBeDefined();
      expect(pptxBtn.textContent).toContain('PPTX');
    });

    it('generates a landscape PDF via jsPDF and triggers download via file-saver', async () => {
      render(
        <TrocoSlides
          isOpen={true}
          onClose={vi.fn()}
          document={{
            slidesTitle: 'Pitch Deck Série A',
            slides: [
              { title: 'Slide 1 - Opportunité', subtitle: 'Marché du troc', bullets: ['10M transactions ciblées'] },
              { title: 'Slide 2 - Solution', subtitle: 'Suite Troco Pro', bullets: ['Bureau collaboratif', 'Escrow sécurisé'] },
            ],
          }}
        />
      );

      const pdfBtn = screen.getByTestId('export-slides-pdf-btn');
      fireEvent.click(pdfBtn);

      await waitFor(() => {
        expect(fileSaver).toHaveBeenCalled();
        const callArgs = fileSaver.mock.calls[0];
        const blob = callArgs[0];
        const filename = callArgs[1];
        expect(filename).toBe('pitch_deck_s_rie_a.pdf');
        expect(blob).toBeDefined();
        expect(blob.type).toContain('pdf');
      });
    });

    it('triggers PowerPoint (.pptx) download via file-saver when clicking PPTX', async () => {
      render(
        <TrocoSlides
          isOpen={true}
          onClose={vi.fn()}
          document={{
            slidesTitle: 'Deck Partenaire',
            slides: [{ title: 'Slide 1', bullets: [] }],
          }}
        />
      );

      const pptxBtn = screen.getByTestId('export-slides-pptx-btn');
      fireEvent.click(pptxBtn);

      await waitFor(() => {
        expect(fileSaver).toHaveBeenCalled();
        const callArgs = fileSaver.mock.calls[0];
        const filename = callArgs[1];
        expect(filename).toBe('deck_partenaire.pptx');
      });
    });
  });
});
