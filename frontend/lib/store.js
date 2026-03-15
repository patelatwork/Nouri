import { create } from "zustand";
import { syncScreenTime } from "@/lib/api";

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
  currentUserId: null,
  minutesToday: 0,
  breakPromptShown: false,
  hardBreakActive: false,
  _syncPending: false,

  hydrate: () => {
    if (typeof window === "undefined") return;
    // Read user from auth localStorage to get the userId
    const userStr = localStorage.getItem("nouri_user");
    if (!userStr) return;
    try {
      const user = JSON.parse(userStr);
      const userId = user?.id;
      if (!userId) return;
      const today = new Date().toISOString().slice(0, 10);
      const stored = localStorage.getItem(`nouri_screentime_${userId}_${today}`);
      if (stored) {
        set({ minutesToday: parseFloat(stored), currentUserId: userId });
      }
    } catch {
      // ignore parse errors
    }
  },

  startSession: (userId) => {
    const { minutesToday: current, currentUserId } = get();
    // If already hydrated for this user, only reset the timer—don't zero out minutes
    if (currentUserId === userId && current > 0) {
      set({ sessionStartedAt: Date.now(), breakPromptShown: false, hardBreakActive: false });
      return;
    }
    set({ sessionStartedAt: Date.now(), currentUserId: userId || null, minutesToday: 0, breakPromptShown: false, hardBreakActive: false });
    if (typeof window !== "undefined" && userId) {
      const today = new Date().toISOString().slice(0, 10);
      const stored = localStorage.getItem(`nouri_screentime_${userId}_${today}`);
      if (stored) set({ minutesToday: parseFloat(stored) });
    }
  },

  tick: () => {
    const { sessionStartedAt, minutesToday, currentUserId, _syncPending } = get();
    if (!sessionStartedAt) return;
    const elapsed = (Date.now() - sessionStartedAt) / 60000;
    const total = minutesToday + elapsed;

    if (typeof window !== "undefined" && currentUserId) {
      const today = new Date().toISOString().slice(0, 10);
      localStorage.setItem(`nouri_screentime_${currentUserId}_${today}`, String(total));

      // Sync to backend on each tick so server has persistent data
      if (!_syncPending) {
        set({ _syncPending: true });
        syncScreenTime({ date: today, minutes_spent: Math.round(total * 100) / 100 })
          .catch(() => {})
          .finally(() => set({ _syncPending: false }));
      }
    }
    set({ minutesToday: total, sessionStartedAt: Date.now() });
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
