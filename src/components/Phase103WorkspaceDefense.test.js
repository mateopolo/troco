import React from 'react';
import { render, screen } from '@testing-library/react';
import WorkspaceMessageCard from '../features/workspace/WorkspaceMessageCard';
import NotesModal from './NotesModal';
import CloudOfficeSuiteModal from './CloudOfficeSuiteModal';

jest.mock('../firebase', () => ({
  db: {},
}));

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  onSnapshot: jest.fn(() => jest.fn()),
  doc: jest.fn(),
  setDoc: jest.fn(() => Promise.resolve()),
  serverTimestamp: jest.fn(() => ({})),
}));

describe('PHASE 103 : Workspace Message Card & Modal Opening Defense', () => {
  test('WorkspaceMessageCard renders "Document indisponible" when message is null or empty', () => {
    const { container } = render(<WorkspaceMessageCard msg={null} message={null} />);
    expect(screen.getByText('Document indisponible')).toBeInTheDocument();
  });

  test('WorkspaceMessageCard uses safeTitle and safeSnippet without TypeError when fields are missing', () => {
    const corruptedMsg = {
      id: 'corrupted_1',
      type: 'docs',
      // snippet, thumbnailBase64, title are undefined
    };

    render(<WorkspaceMessageCard msg={corruptedMsg} />);
    expect(screen.getAllByText(/Document partagé/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Cliquez pour ouvrir le document.../i)).toBeInTheDocument();
  });

  test('NotesModal returns null if !isOpen', () => {
    const { container } = render(
      <NotesModal isOpen={false} />
    );
    expect(container.firstChild).toBeNull();
  });

  test('CloudOfficeSuiteModal returns null if !isOpen', () => {
    const { container } = render(
      <CloudOfficeSuiteModal isOpen={false} />
    );
    expect(container.firstChild).toBeNull();
  });
});
