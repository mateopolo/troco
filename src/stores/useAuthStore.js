import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

const DEFAULT_PROFILE = {
  name: 'MATEO POLO',
  username: '@mateopolo',
  email: 'mateopolo91@gmail.com',
  avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80',
  bio: 'Créateur de contenus, développeur Python et passionné de musique. Je propose des services flexibles et des échanges de qualité.',
  location: 'Paris, France',
  languages: ['FR', 'EN', 'ES', 'IT'],
  loginMethod: 'Google',
  euroBalance: 128.00,
  trocoTokens: 12,
  isTrocoPlus: false,
  subscriptionPlan: null,
  subscriptionStartDate: null,
  subscriptionRenewalDate: null,
  kycVerified: false,
  kycVerifiedAt: null,
  onboardingCompleted: true,
  cguAcceptedAt: new Date().toISOString(),
  skills: ['Prod musicale & Ableton Live', 'Scripts Python'],
  equipment: ['MacBook Pro 14', 'Microphone USB'],
  socialLinks: ['https://github.com/mateopolo', 'https://linkedin.com/in/mateopolo'],
  portfolioImages: [],
  swapHistory: [],
  dealsCompleted: 6,
  dealsInProgress: 1,
  rating: 5.0,
  reviews: 6,
};

export const useAuthStore = create(
  persist(
    (set, get) => ({
      profile: DEFAULT_PROFILE,
      isAuthenticated: true,
      authLoading: false,
      authError: '',
      isEditingProfile: false,
      profileDraft: DEFAULT_PROFILE,
      saveMessage: '',

      setProfile: (newProfile) => set((state) => {
        const updated = typeof newProfile === 'function' ? newProfile(state.profile) : { ...state.profile, ...newProfile };
        return {
          profile: updated,
          profileDraft: state.isEditingProfile ? state.profileDraft : updated
        };
      }),

      updateProfileField: (key, value) => set((state) => ({
        profile: { ...state.profile, [key]: value },
        profileDraft: { ...state.profileDraft, [key]: value }
      })),

      setProfileDraft: (updater) => set((state) => ({
        profileDraft: typeof updater === 'function' ? updater(state.profileDraft) : { ...state.profileDraft, ...updater }
      })),

      setIsEditingProfile: (isEditing) => set((state) => ({
        isEditingProfile: isEditing,
        profileDraft: isEditing ? { ...state.profile } : state.profileDraft
      })),

      setSaveMessage: (saveMessage) => set({ saveMessage }),

      setAuthLoading: (authLoading) => set({ authLoading }),
      setAuthError: (authError) => set({ authError }),

      addSkill: (skill) => set((state) => {
        const val = (skill || '').trim();
        if (!val || state.profile.skills.includes(val)) return state;
        const nextSkills = [...state.profile.skills, val];
        return {
          profile: { ...state.profile, skills: nextSkills },
          profileDraft: { ...state.profileDraft, skills: nextSkills }
        };
      }),

      removeSkill: (skill) => set((state) => {
        const nextSkills = state.profile.skills.filter((s) => s !== skill);
        return {
          profile: { ...state.profile, skills: nextSkills },
          profileDraft: { ...state.profileDraft, skills: nextSkills }
        };
      }),

      addEquipment: (item) => set((state) => {
        const val = (item || '').trim();
        if (!val || state.profile.equipment.includes(val)) return state;
        const nextEquipment = [...state.profile.equipment, val];
        return {
          profile: { ...state.profile, equipment: nextEquipment },
          profileDraft: { ...state.profileDraft, equipment: nextEquipment }
        };
      }),

      removeEquipment: (item) => set((state) => {
        const nextEquipment = state.profile.equipment.filter((e) => e !== item);
        return {
          profile: { ...state.profile, equipment: nextEquipment },
          profileDraft: { ...state.profileDraft, equipment: nextEquipment }
        };
      }),

      addPortfolioImage: (urlOrBase64) => set((state) => {
        if (!urlOrBase64) return state;
        const nextImages = [...(state.profile.portfolioImages || []), urlOrBase64];
        return {
          profile: { ...state.profile, portfolioImages: nextImages },
          profileDraft: { ...state.profileDraft, portfolioImages: nextImages }
        };
      }),

      removePortfolioImage: (index) => set((state) => {
        const nextImages = (state.profile.portfolioImages || []).filter((_, i) => i !== index);
        return {
          profile: { ...state.profile, portfolioImages: nextImages },
          profileDraft: { ...state.profileDraft, portfolioImages: nextImages }
        };
      }),

      addSocialLink: (url) => set((state) => {
        const val = (url || '').trim();
        const current = Array.isArray(state.profile.socialLinks) ? state.profile.socialLinks : [];
        if (!val || current.includes(val)) return state;
        const nextLinks = [...current, val];
        return {
          profile: { ...state.profile, socialLinks: nextLinks },
          profileDraft: { ...state.profileDraft, socialLinks: nextLinks }
        };
      }),

      removeSocialLink: (indexOrUrl) => set((state) => {
        const current = Array.isArray(state.profile.socialLinks) ? state.profile.socialLinks : [];
        const nextLinks = typeof indexOrUrl === 'number'
          ? current.filter((_, i) => i !== indexOrUrl)
          : current.filter((link) => link !== indexOrUrl);
        return {
          profile: { ...state.profile, socialLinks: nextLinks },
          profileDraft: { ...state.profileDraft, socialLinks: nextLinks }
        };
      }),

      setSocialLinks: (socialLinks) => set((state) => {
        const nextLinks = Array.isArray(socialLinks) ? socialLinks : [];
        return {
          profile: { ...state.profile, socialLinks: nextLinks },
          profileDraft: { ...state.profileDraft, socialLinks: nextLinks }
        };
      }),

      resetToDefault: () => set({
        profile: DEFAULT_PROFILE,
        profileDraft: DEFAULT_PROFILE,
        isAuthenticated: false
      })
    }),
    {
      name: 'troco_auth_store',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
