import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import CloudOfficeSuiteModal from './CloudOfficeSuiteModal';
import TrocoDocs from './TrocoDocs';

// Mock Firebase
jest.mock('../firebase', () => ({
  db: {},
  storage: {},
}));

jest.mock('firebase/firestore', () => ({
  doc: jest.fn(() => ({ id: 'mock-doc' })),
  onSnapshot: jest.fn(() => () => {}),
  setDoc: jest.fn(() => Promise.resolve()),
  updateDoc: jest.fn(() => Promise.resolve()),
  serverTimestamp: jest.fn(() => 123456789),
}));

describe('PHASE 136: Rich Text Editor Toolbar Functional Activation & Focus Protection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    document.execCommand = jest.fn();
  });

  test('1. Connects native document.execCommand to all formatting buttons and dropdowns', () => {
    render(
      <CloudOfficeSuiteModal
        isOpen={true}
        onClose={jest.fn()}
        initialTab="docs"
      />
    );

    // Bouton Gras
    const boldBtn = screen.getByTitle(/Gras/i);
    fireEvent.click(boldBtn);
    expect(document.execCommand).toHaveBeenCalledWith('bold', false, null);

    // Bouton Italique
    const italicBtn = screen.getByTitle(/Italique/i);
    fireEvent.click(italicBtn);
    expect(document.execCommand).toHaveBeenCalledWith('italic', false, null);

    // Boutons d'alignement (gauche, centre, droite)
    const alignLeftBtn = screen.getByTitle(/Aligner à gauche/i);
    fireEvent.click(alignLeftBtn);
    expect(document.execCommand).toHaveBeenCalledWith('justifyLeft', false, null);

    const alignCenterBtn = screen.getByTitle(/Centrer/i);
    fireEvent.click(alignCenterBtn);
    expect(document.execCommand).toHaveBeenCalledWith('justifyCenter', false, null);

    const alignRightBtn = screen.getByTitle(/Aligner à droite/i);
    fireEvent.click(alignRightBtn);
    expect(document.execCommand).toHaveBeenCalledWith('justifyRight', false, null);

    // Sélecteur de Police (Dropdown)
    const fontSelect = screen.getByTitle('Police de caractères');
    fireEvent.change(fontSelect, { target: { value: 'Arial, sans-serif' } });
    expect(document.execCommand).toHaveBeenCalledWith('fontName', false, 'Arial, sans-serif');

    // Sélecteur de Titre (formatBlock H1/H2)
    const styleSelect = screen.getByTitle(/Style de paragraphe/i);
    fireEvent.change(styleSelect, { target: { value: '<h2>' } });
    expect(document.execCommand).toHaveBeenCalledWith('formatBlock', false, '<h2>');

    // Sélecteur de Couleur (foreColor)
    const colorInput = screen.getByTitle(/Couleur du texte/i).querySelector('input[type="color"]');
    expect(colorInput).toBeInTheDocument();
    fireEvent.change(colorInput, { target: { value: '#ff0000' } });
    expect(document.execCommand).toHaveBeenCalledWith('foreColor', false, '#ff0000');
  });

  test('2. Focus protection via onMouseDown preventDefault on toolbar buttons', () => {
    render(
      <TrocoDocs
        isOpen={true}
        onClose={jest.fn()}
        initialTab="docs"
      />
    );

    const boldBtn = screen.getByTitle(/Gras/i);
    const italicBtn = screen.getByTitle(/Italique/i);
    const alignCenterBtn = screen.getByTitle(/Centrer/i);

    const boldMouseDown = fireEvent.mouseDown(boldBtn);
    expect(boldMouseDown).toBe(false); // defaultPrevented === true returns false

    const italicMouseDown = fireEvent.mouseDown(italicBtn);
    expect(italicMouseDown).toBe(false);

    const alignMouseDown = fireEvent.mouseDown(alignCenterBtn);
    expect(alignMouseDown).toBe(false);
  });

  test('3. contentEditable editor sheet is rendered and connected', () => {
    render(
      <TrocoDocs
        isOpen={true}
        onClose={jest.fn()}
        initialTab="docs"
      />
    );

    const editor = screen.getByPlaceholderText(/Rédigez ici vos comptes-rendus/i);
    expect(editor).toBeInTheDocument();
    expect(editor).toHaveAttribute('contenteditable', 'true');
  });
});
