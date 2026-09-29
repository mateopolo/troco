import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { collection, doc, getDocs, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import logger from '../utils/logger';

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

      // ---- FILTRES SAUVEGARDÉS (FAC-05) ----
      savedFilters: [],
      isLoadingSavedFilters: false,

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

      // ---- ACTIONS FILTRES SAUVEGARDÉS (users/{uid}/savedFilters) ----
      loadSavedFilters: async (uid) => {
        if (!uid || !db) return;
        set({ isLoadingSavedFilters: true });
        try {
          const colRef = collection(db, 'users', String(uid), 'savedFilters');
          const snapshot = await getDocs(colRef);
          const loaded = [];
          snapshot.forEach((docSnap) => {
            loaded.push({
              id: docSnap.id,
              ...docSnap.data(),
            });
          });
          // Trier du plus récent au plus ancien
          loaded.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
          set({ savedFilters: loaded, isLoadingSavedFilters: false });
        } catch (err) {
          logger.warn('[useFeedStore] loadSavedFilters error:', err);
          set({ isLoadingSavedFilters: false });
        }
      },

      addSavedFilter: async (uid, name, customFilters = null) => {
        if (!uid || !name || !db) return null;
        const state = get();
        const filterId = `filter_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const filtersPayload = customFilters || {
          radiusKm: state.radiusKm,
          isInfiniteRadius: state.isInfiniteRadius,
          selectedPayment: state.selectedPayment,
          selectedLanguages: state.selectedLanguages,
          selectedCategory: state.selectedCategory,
          formatFilter: state.formatFilter,
        };

        const docData = {
          name: name.trim(),
          filters: filtersPayload,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        try {
          const docRef = doc(db, 'users', String(uid), 'savedFilters', filterId);
          await setDoc(docRef, docData);
          const newFilter = { id: filterId, ...docData };
          set((s) => ({
            savedFilters: [newFilter, ...s.savedFilters],
          }));
          return newFilter;
        } catch (err) {
          logger.error('[useFeedStore] addSavedFilter error:', err);
          return null;
        }
      },

      renameSavedFilter: async (uid, filterId, newName) => {
        if (!uid || !filterId || !newName || !db) return false;
        const trimmed = newName.trim();
        try {
          const docRef = doc(db, 'users', String(uid), 'savedFilters', String(filterId));
          await updateDoc(docRef, { name: trimmed, updatedAt: Date.now() });
          set((s) => ({
            savedFilters: s.savedFilters.map((f) =>
              f.id === filterId ? { ...f, name: trimmed, updatedAt: Date.now() } : f
            ),
          }));
          return true;
        } catch (err) {
          logger.error('[useFeedStore] renameSavedFilter error:', err);
          return false;
        }
      },

      deleteSavedFilter: async (uid, filterId) => {
        if (!uid || !filterId || !db) return false;
        try {
          const docRef = doc(db, 'users', String(uid), 'savedFilters', String(filterId));
          await deleteDoc(docRef);
          set((s) => ({
            savedFilters: s.savedFilters.filter((f) => f.id !== filterId),
          }));
          return true;
        } catch (err) {
          logger.error('[useFeedStore] deleteSavedFilter error:', err);
          return false;
        }
      },

      applySavedFilter: (savedFilter) => {
        if (!savedFilter || !savedFilter.filters) return;
        const f = savedFilter.filters;
        set({
          radiusKm: f.radiusKm !== undefined ? f.radiusKm : get().radiusKm,
          isInfiniteRadius: f.isInfiniteRadius !== undefined ? f.isInfiniteRadius : get().isInfiniteRadius,
          selectedPayment: f.selectedPayment || get().selectedPayment,
          selectedLanguages: f.selectedLanguages || get().selectedLanguages,
          selectedCategory: f.selectedCategory || get().selectedCategory,
          formatFilter: f.formatFilter || get().formatFilter,
        });
      },
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
        savedFilters: state.savedFilters,
      }),
    }
  )
);

export default useFeedStore;
