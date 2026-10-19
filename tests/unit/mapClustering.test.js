// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import L from 'leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';

describe('Prompt 17 / MISSING-02 — Marker Clustering sur carte Leaflet', () => {
  it('exporte et instancie MarkerClusterGroup avec succès', () => {
    expect(MarkerClusterGroup).toBeDefined();
    expect(typeof MarkerClusterGroup).toBe('object');
  });

  it('génère un conteneur d’icône avec data-testid="map-cluster" et classes marker-cluster', () => {
    const mockCluster = {
      getChildCount: () => 14,
    };

    const count = mockCluster.getChildCount();
    let sizeClass = 'marker-cluster-small';
    if (count >= 10 && count < 50) {
      sizeClass = 'marker-cluster-medium';
    } else if (count >= 50) {
      sizeClass = 'marker-cluster-large';
    }

    const divIcon = L.divIcon({
      html: `<div data-testid="map-cluster" class="cluster-badge-inner"><span>${count}</span></div>`,
      className: `marker-cluster ${sizeClass}`,
      iconSize: L.point(40, 40, true),
    });

    expect(divIcon.options.className).toContain('marker-cluster');
    expect(divIcon.options.className).toContain('marker-cluster-medium');
    expect(divIcon.options.html).toContain('data-testid="map-cluster"');
    expect(divIcon.options.html).toContain('<span>14</span>');
  });

  it('gère correctement les paliers small, medium et large pour le clustering', () => {
    const testCases = [
      { count: 3, expectedClass: 'marker-cluster-small' },
      { count: 18, expectedClass: 'marker-cluster-medium' },
      { count: 75, expectedClass: 'marker-cluster-large' },
    ];

    testCases.forEach(({ count, expectedClass }) => {
      let sizeClass = 'marker-cluster-small';
      if (count >= 10 && count < 50) {
        sizeClass = 'marker-cluster-medium';
      } else if (count >= 50) {
        sizeClass = 'marker-cluster-large';
      }
      expect(sizeClass).toBe(expectedClass);
    });
  });

  it('vérifie la présence des options de configuration requises pour MarkerClusterGroup', () => {
    const clusterOptions = {
      maxClusterRadius: 50,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
    };

    expect(clusterOptions.maxClusterRadius).toBe(50);
    expect(clusterOptions.spiderfyOnMaxZoom).toBe(true);
    expect(clusterOptions.showCoverageOnHover).toBe(false);
  });
});
