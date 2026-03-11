import { create } from "zustand";

// ── Auth Store ──
export const useAuthStore = create((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,

  setAuth: (user, token) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("nouri_token", token);
      localStorage.setItem("nouri_user", JSON.stringify(user));
    }
    set({ user, token, isAuthenticated: true });
  },

  logout: () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("nouri_token");
      localStorage.removeItem("nouri_user");
    }
    set({ user: null, token: null, isAuthenticated: false });
  },

  hydrate: () => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("nouri_token");
      const userStr = localStorage.getItem("nouri_user");
      if (token && userStr) {
        try {
          const user = JSON.parse(userStr);
          set({ user, token, isAuthenticated: true });
        } catch {
          set({ user: null, token: null, isAuthenticated: false });
        }
      }
    }
  },
}));

// ── Screen Time Store ──
export const useScreenTimeStore = create((set, get) => ({
  sessionStartedAt: null,
  minutesToday: 0,
  breakPromptShown: false,
  hardBreakActive: false,

  startSession: () => {
    set({ sessionStartedAt: Date.now(), breakPromptShown: false, hardBreakActive: false });
    // Load persisted minutes
    if (typeof window !== "undefined") {
      const today = new Date().toISOString().slice(0, 10);
      const stored = localStorage.getItem(`nouri_screentime_${today}`);
      if (stored) set({ minutesToday: parseFloat(stored) });
    }
  },

  tick: () => {
    const { sessionStartedAt, minutesToday } = get();
    if (!sessionStartedAt) return;
    const elapsed = (Date.now() - sessionStartedAt) / 60000;
    const total = minutesToday + elapsed;

    if (typeof window !== "undefined") {
      const today = new Date().toISOString().slice(0, 10);
      localStorage.setItem(`nouri_screentime_${today}`, String(total));
    }
    set({ minutesToday: total });
  },

  showBreakPrompt: () => set({ breakPromptShown: true }),
  activateHardBreak: () => set({ hardBreakActive: true }),
  dismissBreak: () => set({ breakPromptShown: false }),
  endHardBreak: () => set({ hardBreakActive: false }),
}));

// ── Feed Store ──
export const useFeedStore = create((set) => ({
  feedMode: "recommended", // recommended | chronological
  setFeedMode: (mode) => set({ feedMode: mode }),
}));
