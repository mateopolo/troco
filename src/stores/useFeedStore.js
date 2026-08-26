import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export const useFeedStore = create(
  persist(
    (set, get) => ({
      listings: [],
      searchQuery: '',
      selectedCategory: 'all',
      formatFilter: 'all',
      radiusKm: 20,
      isInfiniteRadius: true,
      viewMode: 'list', // 'list' | 'map' | 'carousel'
      selectedPayment: 'all',
      selectedLanguages: ['FR', 'EN'],
      hoveredCardId: null,
      customCategories: ['Tatouage', 'Coiffure & Tresses', 'Plomberie', 'Mécanique Auto', 'Soutien Scolaire', 'Menuiserie'],
      allReports: [],
      allFirestoreUsers: [],

      setListings: (listings) => set({ listings }),
      addListing: (newListing) => set((state) => ({
        listings: [newListing, ...state.listings]
      })),
      updateListing: (id, updatedFields) => set((state) => ({
        listings: state.listings.map((l) => (String(l.id) === String(id) ? { ...l, ...updatedFields } : l))
      })),
      removeListing: (id) => set((state) => ({
        listings: state.listings.filter((l) => String(l.id) !== String(id))
      })),

      setSearchQuery: (searchQuery) => set({ searchQuery }),
      setSelectedCategory: (selectedCategory) => set({ selectedCategory }),
      setFormatFilter: (formatFilter) => set({ formatFilter }),
      setRadiusKm: (radiusKm) => set({ radiusKm }),
      setIsInfiniteRadius: (isInfiniteRadius) => set({ isInfiniteRadius }),
      setViewMode: (viewMode) => set({ viewMode }),
      setSelectedPayment: (selectedPayment) => set({ selectedPayment }),
      setSelectedLanguages: (selectedLanguages) => set({ selectedLanguages }),
      setHoveredCardId: (hoveredCardId) => set({ hoveredCardId }),

      addCustomCategory: (cat) => set((state) => {
        const trimmed = (cat || '').trim();
        if (!trimmed || state.customCategories.includes(trimmed)) return state;
        return { customCategories: [...state.customCategories, trimmed] };
      }),

      setAllReports: (allReports) => set({ allReports }),
      setAllFirestoreUsers: (allFirestoreUsers) => set({ allFirestoreUsers }),
    }),
    {
      name: 'troco_feed_store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        searchQuery: state.searchQuery,
        selectedCategory: state.selectedCategory,
        formatFilter: state.formatFilter,
        radiusKm: state.radiusKm,
        isInfiniteRadius: state.isInfiniteRadius,
        viewMode: state.viewMode,
        customCategories: state.customCategories,
      }),
    }
  )
);
