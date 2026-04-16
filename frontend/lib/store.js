import { create } from "zustand";
import { syncScreenTime } from "@/lib/api";

// Returns today's date string in local time (YYYY-MM-DD), matching the backend's date()
const getLocalDateStr = () => {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

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

  // Reads the persisted minutes for today from localStorage and loads them into state.
  // Call this on any page that needs to display screen time (not just the feed).
  hydrate: (userId) => {
    if (typeof window === "undefined") return;
    // Resolve userId from param or fall back to localStorage
    let uid = userId;
    if (!uid) {
      try {
        const userStr = localStorage.getItem("nouri_user");
        if (userStr) uid = JSON.parse(userStr)?.id;
      } catch { /* ignore */ }
    }
    if (!uid) return;
    const today = getLocalDateStr();
    const stored = localStorage.getItem(`nouri_screentime_${uid}_${today}`);
    const minutes = stored ? parseFloat(stored) : 0;
    // Only update if we have more data or a different user
    const { currentUserId, minutesToday } = get();
    if (uid !== currentUserId || minutes > minutesToday) {
      set({ minutesToday: minutes, currentUserId: uid });
    }
  },

  startSession: (userId) => {
    if (!userId) return;
    const today = getLocalDateStr();
    const stored = localStorage.getItem(`nouri_screentime_${userId}_${today}`);
    const persistedMinutes = stored ? parseFloat(stored) : 0;

    const { currentUserId } = get();
    if (currentUserId === userId) {
      // Same user — just restart the clock from current accumulated minutes
      set({ sessionStartedAt: Date.now(), minutesToday: persistedMinutes, breakPromptShown: false, hardBreakActive: false });
    } else {
      // Different/new user — load their persisted minutes fresh
      set({
        sessionStartedAt: Date.now(),
        currentUserId: userId,
        minutesToday: persistedMinutes,
        breakPromptShown: false,
        hardBreakActive: false,
      });
    }
  },

  tick: () => {
    const { sessionStartedAt, minutesToday, currentUserId, _syncPending } = get();
    if (!sessionStartedAt) return;
    const elapsed = (Date.now() - sessionStartedAt) / 60000;
    const total = minutesToday + elapsed;

    if (typeof window !== "undefined" && currentUserId) {
      const today = getLocalDateStr();
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

  // Call this when navigating away from an active session (e.g. feed unmount).
  // Flushes the elapsed time since the last tick to localStorage so no time is lost.
  endSession: () => {
    const { sessionStartedAt, minutesToday, currentUserId } = get();
    if (!sessionStartedAt || !currentUserId) return;

    const elapsed = (Date.now() - sessionStartedAt) / 60000;
    const total = minutesToday + elapsed;

    if (typeof window !== "undefined") {
      const today = getLocalDateStr();
      localStorage.setItem(`nouri_screentime_${currentUserId}_${today}`, String(total));

      // Best-effort backend sync — fire and forget
      syncScreenTime({ date: today, minutes_spent: Math.round(total * 100) / 100 }).catch(() => {});
    }

    // Update in-memory state so any still-mounted component (like profile) sees correct value
    set({ minutesToday: total, sessionStartedAt: null });
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
