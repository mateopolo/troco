import React from 'react';
import MapSection from './MapSection';

/**
 * InteractiveMapView.jsx
 * Export alias pour MapSection offrant la carte interactive avec mode plein écran immersif et gestes à deux doigts.
 */
export function InteractiveMapView(props) {
  return <MapSection {...props} />;
}

export default InteractiveMapView;
