import { create } from 'zustand';

export const useFeedStore = create((set, get) => ({
  listings: [],
  searchQuery: '',
  selectedCategory: 'all',
  formatFilter: 'all',
  radiusKm: 20,
  isInfiniteRadius: true,
  viewMode: 'list',
  selectedPayment: 'all',
  selectedLanguages: ['FR', 'EN'],
  hoveredCardId: null,

  setListings: (listings) => set({ listings }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setSelectedCategory: (selectedCategory) => set({ selectedCategory }),
  setFormatFilter: (formatFilter) => set({ formatFilter }),
  setRadiusKm: (radiusKm) => set({ radiusKm }),
  setIsInfiniteRadius: (isInfiniteRadius) => set({ isInfiniteRadius }),
  setViewMode: (viewMode) => set({ viewMode }),
  setSelectedPayment: (selectedPayment) => set({ selectedPayment }),
  setSelectedLanguages: (selectedLanguages) => set({ selectedLanguages }),
  setHoveredCardId: (hoveredCardId) => set({ hoveredCardId }),
}));
