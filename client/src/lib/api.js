import axios from 'axios';

/**
 * API client. In dev the Vite proxy forwards /api → localhost:5000.
 * In production VITE_API_URL is the deployed backend origin.
 */
const baseURL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL.replace(/\/+$/, '')}/api`
  : '/api';

const api = axios.create({
  baseURL,
  timeout: 120_000, // generous: Gemini generation can take ~30-60s
  headers: { 'Content-Type': 'application/json' },
});

/** Human-friendly error copy for any thrown axios/server error. */
export function getErrorMessage(err, fallback = 'Something went wrong at HQ. Please try again.') {
  if (err?.response?.data?.message) return err.response.data.message;
  if (err?.code === 'ECONNABORTED') return 'The oracle took too long to answer. Please try again.';
  if (err?.message === 'Network Error') {
    return "The line to HQ is dead — check your connection and try again.";
  }
  return err?.message || fallback;
}

/**
 * Dispatch helper that never throws on game-logic errors — it returns
 * [data, errorMessage] and lets callers decide how to render failures.
 */
export async function apiCall(promise) {
  try {
    const res = await promise;
    return [res.data, null];
  } catch (err) {
    return [null, getErrorMessage(err, 'The trail went cold unexpectedly. Try again.')];
  }
}

export default api;
