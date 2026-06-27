import axios from "axios";

// Uses VITE_API_URL in production (set in your deploy platform's env vars),
// falls back to localhost for local development.
const baseURL = import.meta.env.VITE_API_URL || "http://localhost:5001/api";

const api = axios.create({
  baseURL,
  withCredentials: true, // sends/receives the httpOnly auth cookies
});

export default api;
