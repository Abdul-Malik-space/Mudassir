const configuredApiUrl =
  import.meta.env.VITE_API_URL?.trim() ||
  "/api";

export const API_BASE_URL =
  configuredApiUrl.replace(/\/+$/, "");