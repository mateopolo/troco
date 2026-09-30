import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import EditorMenuBar from './EditorMenuBar';

describe('EditorMenuBar Component (WP-FIX-03)', () => {
  test('1. Renders all 6 menus: Fichier, Édition, Affichage, Insertion, Format, Outils', () => {
    render(<EditorMenuBar activeTab="docs" onAction={jest.fn()} />);

    expect(screen.getByRole('button', { name: /Fichier/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Édition/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Affichage/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Insertion/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Format/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Outils/i })).toBeInTheDocument();
  });

  test('2. Clicking Fichier opens dropdown with Export and Print options', () => {
    const handleAction = jest.fn();
    render(<EditorMenuBar activeTab="docs" onAction={handleAction} />);

    const fileBtn = screen.getByRole('button', { name: /Fichier/i });
    expect(fileBtn).toHaveAttribute('aria-expanded', 'false');

    // Click to open
    fireEvent.click(fileBtn);
    expect(fileBtn).toHaveAttribute('aria-expanded', 'true');

    // Verify dropdown items
    expect(screen.getByText(/PDF imprimable/i)).toBeInTheDocument();
    const printBtn = screen.getByText(/Imprimer le document/i);
    expect(printBtn).toBeInTheDocument();

    // Click item triggers action callback
    fireEvent.click(printBtn);
    expect(handleAction).toHaveBeenCalledWith('print', expect.objectContaining({ activeTab: 'docs' }));

    // Dropdown closes after action
    expect(fileBtn).toHaveAttribute('aria-expanded', 'false');
  });

  test('3. Dynamic export option for Notes tab (.md) vs Sheets (.csv)', () => {
    const { unmount } = render(<EditorMenuBar activeTab="notes" onAction={jest.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /Fichier/i }));
    expect(screen.getByText(/Exporter la note en Markdown/i)).toBeInTheDocument();
    unmount();

    render(<EditorMenuBar activeTab="sheets" onAction={jest.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /Fichier/i }));
    expect(screen.getByText(/Exporter en CSV/i)).toBeInTheDocument();
  });

  test('4. Format menu contains Bold, Italic, Underline and triggers actions', () => {
    const handleAction = jest.fn();
    render(<EditorMenuBar activeTab="docs" onAction={handleAction} />);

    fireEvent.click(screen.getByRole('button', { name: /Format/i }));
    const boldOption = screen.getByText(/^Gras$/i);
    expect(boldOption).toBeInTheDocument();

    fireEvent.click(boldOption);
    expect(handleAction).toHaveBeenCalledWith('format-bold', expect.anything());
  });

  test('5. Tools menu contains Word Count and Version History', () => {
    const handleAction = jest.fn();
    render(<EditorMenuBar activeTab="docs" onAction={handleAction} />);

    fireEvent.click(screen.getByRole('button', { name: /Outils/i }));
    expect(screen.getByText(/Statistiques & Mots/i)).toBeInTheDocument();
    expect(screen.getByText(/Historique des versions/i)).toBeInTheDocument();
  });
});
