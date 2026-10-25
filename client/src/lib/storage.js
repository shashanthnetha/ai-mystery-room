/**
 * Recent-case archive (localStorage). Device-local convenience only —
 * the server remains the source of truth for a case's state.
 */
const KEY = 'mystery_room.recent_cases';
const MAX = 8;

export function getRecentCases() {
  try {
    const raw = localStorage.getItem(KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list.slice(0, MAX) : [];
  } catch {
    return [];
  }
}

export function rememberCase({ id, title, difficulty, status }) {
  const list = getRecentCases().filter((c) => c.id !== id);
  list.unshift({ id, title, difficulty, status });
  try {
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)));
  } catch {
    /* storage full/blocked — non-fatal */
  }
  return list.slice(0, MAX);
}

export function forgetCase(id) {
  const list = getRecentCases().filter((c) => c.id !== id);
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* non-fatal */
  }
  return list;

}

export function updateCaseStatus(id, status) {
  const list = getRecentCases().map((c) => (c.id === id ? { ...c, status } : c));
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* non-fatal */
  }
  return list;
}
