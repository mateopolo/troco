import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ChatInputBar from './chat/ChatInputBar';
import WorkspaceMessageCard from '../features/workspace/WorkspaceMessageCard';
import CloudOfficeSuiteModal from './CloudOfficeSuiteModal';

jest.mock('../firebase', () => ({
  db: {},
  storage: {},
}));

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  addDoc: jest.fn(() => Promise.resolve()),
  query: jest.fn(),
  where: jest.fn(),
  onSnapshot: jest.fn(() => jest.fn()),
  doc: jest.fn(),
  setDoc: jest.fn(() => Promise.resolve()),
  updateDoc: jest.fn(() => Promise.resolve()),
  serverTimestamp: jest.fn(() => ({})),
}));

jest.mock('firebase/storage', () => ({
  ref: jest.fn(),
  uploadBytes: jest.fn(() => Promise.resolve()),
  getDownloadURL: jest.fn(() => Promise.resolve('https://example.com/mock.jpg')),
}));

describe('WP-FIX-04 : TrocoSlides in Workspace Premium and WorkspaceMessageCard', () => {
  test('ChatInputBar renders TrocoSlides in Workspace Premium menu and clicking it triggers onOpenWorkspaceTool("slides")', () => {
    const mockOpenWorkspaceTool = jest.fn();
    const t = (k) => {
      const dict = {
        'workspace.workspace_premium': 'WORKSPACE PREMIUM',
        'workspace.tools_title': 'Outils Collaboratifs Workspace',
        'workspace.tools_aria': 'Outils Collaboratifs Workspace',
        'workspace.whiteboard_title': 'Tableau Blanc',
        'workspace.notes_title': 'Notes Partagées',
        'workspace.docs_title': 'Troco Docs',
        'workspace.sheets_title': 'Troco Sheets',
        'workspace.slides_title': 'Troco Slides',
        'workspace.slides_desc': 'Présentations & diapositives collaboratives',
        'workspace.slides_badge': 'SLIDES',
      };
      return dict[k] || k;
    };

    render(
      <ChatInputBar
        isMobile={false}
        darkMode={false}
        t={t}
        onOpenWorkspaceTool={mockOpenWorkspaceTool}
      />
    );

    // Open the Workspace menu by clicking on the "+" / workspace toggle button
    const openMenuButton = screen.getByTitle(/Outils Collaboratifs Workspace/i);
    fireEvent.click(openMenuButton);

    // Troco Slides item should be visible in the menu
    expect(screen.getByText('Troco Slides')).toBeInTheDocument();
    expect(screen.getByText('SLIDES')).toBeInTheDocument();
    expect(screen.getByText('Présentations & diapositives collaboratives')).toBeInTheDocument();

    // Click on Troco Slides
    const slidesButton = screen.getByText('Troco Slides').closest('button');
    fireEvent.click(slidesButton);

    expect(mockOpenWorkspaceTool).toHaveBeenCalledWith('slides');
  });

  test('WorkspaceMessageCard renders slides document card and triggers openWorkspaceTool("slides", id)', () => {
    const mockOpenWorkspaceTool = jest.fn();
    const slideMsg = {
      id: 'msg_slides_1',
      type: 'slides',
      workspaceType: 'slides',
      documentId: 'doc_slides_123',
      title: 'Présentation Stratégique Q4',
      snippet: 'Diapositive 1 : Vue d ensemble du projet',
    };

    render(
      <WorkspaceMessageCard
        msg={slideMsg}
        isMine={true}
        openWorkspaceTool={mockOpenWorkspaceTool}
      />
    );

    expect(screen.getByText('Troco Slides')).toBeInTheDocument();
    expect(screen.getAllByText('Présentation Stratégique Q4').length).toBeGreaterThan(0);

    const openBtn = screen.getByText('Ouvrir').closest('button');
    fireEvent.click(openBtn);

    expect(mockOpenWorkspaceTool).toHaveBeenCalledWith('slides', 'doc_slides_123');
  });

  test('CloudOfficeSuiteModal opens with initialTab="slides" and displays slides view', () => {
    render(
      <CloudOfficeSuiteModal
        isOpen={true}
        onClose={jest.fn()}
        initialTab="slides"
        documentId="doc_slides_test"
      />
    );

    // Should render Slides tab as active
    expect(screen.getAllByText(/Troco Slides/i).length).toBeGreaterThan(0);
  });
});
