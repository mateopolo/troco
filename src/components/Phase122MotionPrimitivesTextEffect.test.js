import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TextEffect } from './core/text-effect';
import { cn } from '../lib/utils';
import ListingCard from './ListingCard';
import FeedCardItem from './FeedCardItem';

beforeAll(() => {
  global.IntersectionObserver = class {
    constructor() {}
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

describe('Phase 122: Motion Primitives Text Effect Integration', () => {
  describe('1. cn Utility', () => {
    it('merges tailwind classes and resolves conflicts correctly', () => {
      expect(cn('p-4', 'p-2')).toBe('p-2');
      expect(cn('font-bold', false && 'italic', 'text-sm')).toBe('font-bold text-sm');
    });
  });

  describe('2. TextEffect Component', () => {
    it('renders text with accessibility container and visible segments', () => {
      render(
        <TextEffect preset="fade-in-blur" speedReveal={1.1} speedSegment={0.3}>
          Leçon de piano pour débutants
        </TextEffect>
      );

      // Testing Library should find the accessible text
      const element = screen.getByText('Leçon de piano pour débutants');
      expect(element).toBeInTheDocument();
    });

    it('renders as custom HTML tag when "as" prop is provided', () => {
      const { container } = render(
        <TextEffect as="h2" preset="fade-in-blur" speedReveal={1.1} speedSegment={0.3}>
          Titre H2 Animé
        </TextEffect>
      );

      const h2 = container.querySelector('h2');
      expect(h2).toBeInTheDocument();
      expect(screen.getByText('Titre H2 Animé')).toBeInTheDocument();
    });

    it('supports char-based segmentation when per="char"', () => {
      const { container } = render(
        <TextEffect preset="fade-in-blur" per="char">
          Troco
        </TextEffect>
      );

      const ariaHidden = container.querySelector('[aria-hidden="true"]');
      expect(ariaHidden).toBeInTheDocument();
      // Should have separate spans for each character
      expect(ariaHidden.querySelectorAll('span').length).toBe(5);
    });
  });

  describe('3. ListingCard Integration & Non-Regression', () => {
    const mockListing = {
      id: 'listing-1',
      title: 'Cours de guitare acoustique',
      description: 'Apprenez la guitare rapidement avec un prof sympa.',
      location: 'Paris, France',
      compensation: '25€/h',
      tags: ['Musique', 'Guitare'],
      category: 'Services',
      gallery: ['https://example.com/guitar.jpg'],
    };

    it('renders the title inside TextEffect and retains virtualized styles', () => {
      const { container } = render(
        <ListingCard
          item={mockListing}
          currentLang="FR"
          showingOriginalListings={{}}
        />
      );

      // Title should be present
      expect(screen.getByText('Cours de guitare acoustique')).toBeInTheDocument();

      // Virtualization rule check (content-visibility: auto, contain-intrinsic-size: 0 420px)
      const card = container.querySelector('.premium-card');
      expect(card).toBeInTheDocument();
      expect(card.style.contentVisibility).toBe('auto');
      expect(card.style.containIntrinsicSize).toBe('0 420px');
    });
  });

  describe('4. FeedCardItem Integration & Non-Regression', () => {
    const mockFeedItem = {
      id: 'feed-item-1',
      title: 'Atelier Cuisine Italienne',
      description: 'Préparation de pâtes fraîches maison.',
      location: 'Lyon, France',
      compensation: 'Échange',
      category: 'Cuisine',
      gallery: ['https://example.com/cooking.jpg'],
    };

    it('renders the title inside TextEffect and retains virtualized styles', () => {
      const { container } = render(
        <FeedCardItem
          item={mockFeedItem}
          currentLang="FR"
          showingOriginalListings={{}}
          formatCompensation={(c) => c}
          getListingDisplayContent={(it) => it}
        />
      );

      // Title should be present
      expect(screen.getByText('Atelier Cuisine Italienne')).toBeInTheDocument();

      // Virtualization rule check (content-visibility: auto, contain-intrinsic-size: 0 420px)
      const card = container.querySelector('.premium-card');
      expect(card).toBeInTheDocument();
      expect(card.style.contentVisibility).toBe('auto');
      expect(card.style.containIntrinsicSize).toBe('0 420px');
    });
  });
});
