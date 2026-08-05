const localApiUrl =
  import.meta.env.VITE_API_URL?.trim() ||
  "http://localhost:5000/api";

export const API_BASE_URL = import.meta.env.PROD
  ? "/api"
  : localApiUrl.replace(/\/+$/, "");

console.log("API_BASE_URL:", API_BASE_URL);