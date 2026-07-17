import { STORAGE_KEY, STORAGE_VERSION } from './constants.js';

const defaultData = {
  version: STORAGE_VERSION,
  settings: {
    theme: 'light',
    username: '',
  },
};

export function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...defaultData };
    const parsed = JSON.parse(raw);
    if (parsed.version !== STORAGE_VERSION) {
      return { ...defaultData };
    }
    return parsed;
  } catch {
    return { ...defaultData };
  }
}

export function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function resetData() {
  localStorage.removeItem(STORAGE_KEY);
  return { ...defaultData };
}
