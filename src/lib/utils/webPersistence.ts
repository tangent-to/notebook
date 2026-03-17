import type { Notebook } from '../types/notebook';

const STORAGE_KEY = 'tangent-notebook-autosave';
const STORAGE_META_KEY = 'tangent-notebook-meta';

export function saveToLocalStorage(notebook: Notebook): void {
  try {
    const data = JSON.stringify(notebook);
    localStorage.setItem(STORAGE_KEY, data);
    localStorage.setItem(STORAGE_META_KEY, JSON.stringify({
      savedAt: Date.now(),
      name: notebook.name,
      cellCount: notebook.cells.length
    }));
  } catch (e) {
    console.warn('Failed to save to localStorage:', e);
  }
}

export function loadFromLocalStorage(): Notebook | null {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return null;
    const notebook = JSON.parse(data);
    if (!notebook.id || !notebook.cells || !Array.isArray(notebook.cells)) return null;
    return notebook;
  } catch {
    return null;
  }
}

export function getLocalStorageMeta(): { savedAt: number; name: string; cellCount: number } | null {
  try {
    const meta = localStorage.getItem(STORAGE_META_KEY);
    if (!meta) return null;
    return JSON.parse(meta);
  } catch {
    return null;
  }
}

export function clearLocalStorage(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(STORAGE_META_KEY);
  } catch {
    // ignore
  }
}
