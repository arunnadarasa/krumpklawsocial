// Backend API base - points to Fly.io (backend only)
export const API_BASE =
  import.meta.env.VITE_API_BASE || "https://krumpklaw.fly.dev";

export const API_URL = `${API_BASE}/api`;
