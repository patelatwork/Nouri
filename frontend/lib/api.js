import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const api = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("nouri_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Auto-logout on 401 — stale/invalid token
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== "undefined") {
      // Only clear+redirect if we actually had a token (not anonymous access)
      if (localStorage.getItem("nouri_token")) {
        localStorage.removeItem("nouri_token");
        localStorage.removeItem("nouri_user");
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

// Auth
export const signup = (data) => api.post("/auth/signup", data).then((r) => r.data);
export const login = (data) => api.post("/auth/login", data).then((r) => r.data);

// Feed
export const getFeed = (page = 1) => api.get(`/feed?page=${page}`).then((r) => r.data);
export const getChronologicalFeed = (page = 1) => api.get(`/feed/chronological?page=${page}`).then((r) => r.data);

// Interactions
export const logInteraction = (postId, data) => api.post(`/interactions/${postId}`, data).then((r) => r.data);

// Explainability
export const explainPost = (postId) => api.get(`/explain/${postId}`).then((r) => r.data);

// User
export const getMe = () => api.get("/user/me").then((r) => r.data);
export const getInterests = () => api.get("/user/interests").then((r) => r.data);
export const updateInterests = (interests) => api.post("/user/interests/update", { interests }).then((r) => r.data);
export const getPreferences = () => api.get("/user/preferences").then((r) => r.data);
export const updatePreferences = (data) => api.put("/user/preferences", data).then((r) => r.data);
export const getWatchHistory = (page = 1) => api.get(`/user/watch-history?page=${page}`).then((r) => r.data);
export const syncScreenTime = (data) => api.post("/user/screen-time/sync", data).then((r) => r.data);
export const resetAlgorithm = () => api.post("/user/reset-algorithm").then((r) => r.data);

// Wellbeing
export const getWellbeingStats = () => api.get("/wellbeing/stats").then((r) => r.data);
export const submitWellbeingFeedback = (data) => api.post("/wellbeing/feedback", data).then((r) => r.data);

// Posts
export const uploadPost = (formData) =>
  api.post("/posts/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
    timeout: 300000, // 5 min timeout for video uploads
  }).then((r) => r.data);
export const getUserPosts = (userId) =>
  api.get(`/posts/user/${userId}`).then((r) => r.data);
export const ingestYouTube = (category, maxResults = 10) =>
  api.get(`/posts/ingest-youtube?category=${category}&max_results=${maxResults}`).then((r) => r.data);

// Bias Audit
export const getBiasAudit = () => api.get("/bias-audit").then((r) => r.data);

export default api;
