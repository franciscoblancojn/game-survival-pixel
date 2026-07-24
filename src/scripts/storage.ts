import { STORAGE_KEY, STORAGE_VERSION } from './constants.js';

interface StorageData {
  version: number;
  settings: {
    theme: string;
    username: string;
  };
}

const defaultData: StorageData = {
  version: STORAGE_VERSION,
  settings: {
    theme: 'light',
    username: '',
  },
};

export function loadData(): StorageData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...defaultData };
    const parsed = JSON.parse(raw) as StorageData;
    if (parsed.version !== STORAGE_VERSION) {
      return { ...defaultData };
    }
    return parsed;
  } catch {
    return { ...defaultData };
  }
}

export function saveData(data: StorageData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function resetData(): StorageData {
  localStorage.removeItem(STORAGE_KEY);
  return { ...defaultData };
}
