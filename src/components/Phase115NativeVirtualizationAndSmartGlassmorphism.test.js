import React from 'react';
import { render } from '@testing-library/react';
import ListingCard from './ListingCard';
import FeedCardItem from './FeedCardItem';
import fs from 'fs';
import path from 'path';

// Mock Lucide icons
jest.mock('lucide-react', () => ({
  ChevronLeft: () => <span data-testid="chevron-left" />,
  ChevronRight: () => <span data-testid="chevron-right" />,
  Sparkles: () => <span data-testid="sparkles" />,
  Video: () => <span data-testid="video" />,
  Heart: () => <span data-testid="heart" />,
  Share2: () => <span data-testid="share" />,
  ShieldCheck: () => <span data-testid="shield-check" />,
  MapPin: () => <span data-testid="map-pin" />,
  Clock: () => <span data-testid="clock" />,
  MessageSquare: () => <span data-testid="message-square" />,
  Check: () => <span data-testid="check" />,
  Award: () => <span data-testid="award" />,
  Star: () => <span data-testid="star" />,
  Flame: () => <span data-testid="flame" />,
  ArrowRight: () => <span data-testid="arrow-right" />,
  Tag: () => <span data-testid="tag" />,
  Globe: () => <span data-testid="globe" />,
}));

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, style, className, whileInView, initial, animate, viewport, variants, transition, ...props }) => (
      <div data-testid="motion-div" className={className} style={style} {...props}>
        {children}
      </div>
    ),
  },
  AnimatePresence: ({ children }) => <>{children}</>,
}));

describe('Phase 115 : Virtualisation Native & Smart Glassmorphism (Feed OOM Fix)', () => {
  const dummyItem = {
    id: 'test-listing-115',
    title: 'Cours de Piano Jazz Débutant',
    category: 'Musique',
    compensation: '15 € / h',
    author: 'Jean Dupont',
    authorUid: 'uid-123',
    gallery: ['https://images.unsplash.com/photo-1?w=400', 'https://images.unsplash.com/photo-2?w=400'],
    isDemo: true,
  };

  const defaultProps = {
    handleOpenListing: jest.fn(),
    handleStartDiscussion: jest.fn(),
    currentLang: 'FR',
    t: (k) => k,
    darkMode: true,
    formatCompensation: (c) => c,
    getListingDisplayContent: (it) => it,
    getSuggestedMedia: () => ({ gallery: ['https://images.unsplash.com/photo-1?w=400'] }),
    getFallbackImage: () => 'https://images.unsplash.com/fallback.jpg',
    localizeLocation: (loc) => loc || 'Paris, France',
    localizeTags: (tags) => tags || ['Musique', 'Cours'],
    showingOriginalListings: {},
    toggleOriginalListing: jest.fn(),
    profile: { name: 'Jean Dupont', avatar: 'https://images.unsplash.com/avatar.jpg' },
  };

  test('1. ListingCard wrapper injects contentVisibility: auto and containIntrinsicSize: 0 420px', () => {
    const { container } = render(
      <ListingCard
        item={dummyItem}
        {...defaultProps}
      />
    );

    const cardWrapper = container.querySelector('.premium-card');
    expect(cardWrapper).toBeInTheDocument();
    expect(cardWrapper.style.contentVisibility).toBe('auto');
    expect(cardWrapper.style.containIntrinsicSize).toMatch(/0(px)? 420px/);
  });

  test('2. ListingCard has zero backdropFilter or backdrop-blur in its rendered DOM and uses solid alphas', () => {
    const { container } = render(
      <ListingCard
        item={dummyItem}
        {...defaultProps}
      />
    );

    const allElements = container.querySelectorAll('*');
    allElements.forEach((el) => {
      const inlineStyle = el.getAttribute('style') || '';
      expect(inlineStyle).not.toContain('backdrop-filter');
      expect(inlineStyle).not.toContain('backdropFilter');
      expect(inlineStyle).not.toContain('backdrop-blur');
    });

    const listingCardContent = fs.readFileSync(path.join(__dirname, 'ListingCard.jsx'), 'utf-8');
    expect(listingCardContent).toContain('rgba(26, 22, 19, 0.92)');
    expect(listingCardContent).toContain('1px solid rgba(255, 255, 255, 0.08)');
  });

  test('3. FeedCardItem wrapper injects contentVisibility: auto and containIntrinsicSize: 0 420px', () => {
    const { container } = render(
      <FeedCardItem
        item={dummyItem}
        {...defaultProps}
        hoveredCardId={null}
        setHoveredCardId={jest.fn()}
        hoverSlideIndex={{}}
      />
    );

    const cardWrapper = container.querySelector('.feed-card-item');
    expect(cardWrapper).toBeInTheDocument();
    expect(cardWrapper.style.contentVisibility).toBe('auto');
    expect(cardWrapper.style.containIntrinsicSize).toMatch(/0(px)? 420px/);
  });

  test('4. FeedCardItem has zero backdropFilter or backdrop-blur in its rendered DOM and uses solid alphas', () => {
    const { container } = render(
      <FeedCardItem
        item={dummyItem}
        {...defaultProps}
        hoveredCardId={null}
        setHoveredCardId={jest.fn()}
        hoverSlideIndex={{}}
      />
    );

    const allElements = container.querySelectorAll('*');
    allElements.forEach((el) => {
      const inlineStyle = el.getAttribute('style') || '';
      expect(inlineStyle).not.toContain('backdrop-filter');
      expect(inlineStyle).not.toContain('backdropFilter');
      expect(inlineStyle).not.toContain('backdrop-blur');
    });

    const feedCardItemContent = fs.readFileSync(path.join(__dirname, 'FeedCardItem.jsx'), 'utf-8');
    expect(feedCardItemContent).toContain('rgba(26, 22, 19, 0.92)');
    expect(feedCardItemContent).toContain('1px solid rgba(255, 255, 255, 0.08)');
  });

  test('5. FeedView.jsx lazy loads InteractiveMapView via React.lazy and has zero synchronous Leaflet imports', () => {
    const feedViewContent = fs.readFileSync(path.join(__dirname, 'FeedView.jsx'), 'utf-8');

    // Vérifie l'import paresseux
    expect(feedViewContent).toContain("React.lazy(() => import('./InteractiveMapView'))");

    // Vérifie l'absence d'import synchrone de leaflet ou react-leaflet
    expect(feedViewContent).not.toMatch(/import\s+.*\s+from\s+['"]react-leaflet['"]/);
    expect(feedViewContent).not.toMatch(/import\s+L\s+from\s+['"]leaflet['"]/);

    // Vérifie que le wrapper motion.div a la virtualisation native
    expect(feedViewContent).toContain("contentVisibility: 'auto'");
    expect(feedViewContent).toContain("containIntrinsicSize: '0 420px'");
  });
});
