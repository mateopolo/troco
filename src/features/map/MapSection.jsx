import React from 'react';
import InteractiveMapView from './InteractiveMapView';

/**
 * MapSection.jsx
 * Composant de carte interactive avec support plein écran via React Portal et gestion des gestes tactiles.
 */
export function MapSection(props) {
  return <InteractiveMapView {...props} />;
}

export default MapSection;
