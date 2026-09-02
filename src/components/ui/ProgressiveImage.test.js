import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ProgressiveImage } from './ProgressiveImage';

describe('Phase 47 : ProgressiveImage Component', () => {
  it('affiche le conteneur et la balise img avec les attributs appropriés', () => {
    render(
      <ProgressiveImage
        src="https://example.com/hd.jpg"
        placeholderSrc="https://example.com/tiny.jpg"
        alt="Test Image"
      />
    );

    const img = screen.getByAltText('Test Image');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', 'https://example.com/hd.jpg');
    expect(img).toHaveAttribute('loading', 'lazy');
  });

  it('gère l\'événement onLoad et bascule l\'opacité à 1', () => {
    const handleLoad = jest.fn();
    render(
      <ProgressiveImage
        src="https://example.com/hd.jpg"
        alt="Loaded Image"
        onLoad={handleLoad}
      />
    );

    const img = screen.getByAltText('Loaded Image');
    expect(img.style.opacity).toBe('0');

    fireEvent.load(img);

    expect(img.style.opacity).toBe('1');
    expect(handleLoad).toHaveBeenCalledTimes(1);
  });

  it('applique l\'image de fallback en cas d\'erreur', () => {
    const handleError = jest.fn();
    render(
      <ProgressiveImage
        src="https://example.com/broken.jpg"
        fallbackSrc="https://example.com/fallback.jpg"
        alt="Broken Image"
        onError={handleError}
      />
    );

    const img = screen.getByAltText('Broken Image');
    fireEvent.error(img);

    expect(img).toHaveAttribute('src', 'https://example.com/fallback.jpg');
    expect(handleError).toHaveBeenCalledTimes(1);
  });
});
