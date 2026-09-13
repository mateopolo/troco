import React from 'react';
import InteractiveMapView from './InteractiveMapView';

/**
 * MapSection.jsx
 * Composant de carte interactive avec support plein écran via React Portal et gestion des gestes tactiles.
 */
function MapSection(props) {
  return <InteractiveMapView {...props} />;
}

const areMapSectionPropsEqual = (previous, next) => {
  const previousCenter = previous.mapCenter || [];
  const nextCenter = next.mapCenter || [];

  return previous.listings?.length === next.listings?.length &&
    previousCenter[0] === nextCenter[0] &&
    previousCenter[1] === nextCenter[1] &&
    previous.mapZoom === next.mapZoom &&
    previous.darkMode === next.darkMode;
};

const MemoizedMapSection = React.memo(MapSection, areMapSectionPropsEqual);

export { MemoizedMapSection as MapSection };
export default MemoizedMapSection;
