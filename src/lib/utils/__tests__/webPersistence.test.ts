import { describe, it, expect, beforeEach, vi } from 'vitest';
import { saveToLocalStorage, loadFromLocalStorage, getLocalStorageMeta, clearLocalStorage } from '../webPersistence';
import type { Notebook } from '../../types/notebook';

// Mock localStorage
const storage = new Map<string, string>();
const localStorageMock = {
  getItem: vi.fn((key: string) => storage.get(key) ?? null),
  setItem: vi.fn((key: string, value: string) => storage.set(key, value)),
  removeItem: vi.fn((key: string) => storage.delete(key)),
  clear: vi.fn(() => storage.clear()),
  get length() { return storage.size; },
  key: vi.fn((index: number) => Array.from(storage.keys())[index] ?? null),
};

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

function makeNotebook(): Notebook {
  return {
    id: 'test-nb',
    name: 'Test',
    cells: [{ id: 'c1', type: 'code', content: 'x = 1' }],
    createdAt: 1000,
    updatedAt: 2000,
  };
}

describe('webPersistence', () => {
  beforeEach(() => {
    storage.clear();
  });

  it('saves and loads a notebook', () => {
    const nb = makeNotebook();
    saveToLocalStorage(nb);
    const loaded = loadFromLocalStorage();
    expect(loaded).not.toBeNull();
    expect(loaded!.id).toBe('test-nb');
    expect(loaded!.cells).toHaveLength(1);
  });

  it('returns null when nothing saved', () => {
    expect(loadFromLocalStorage()).toBeNull();
  });

  it('saves and retrieves metadata', () => {
    const nb = makeNotebook();
    saveToLocalStorage(nb);
    const meta = getLocalStorageMeta();
    expect(meta).not.toBeNull();
    expect(meta!.name).toBe('Test');
    expect(meta!.cellCount).toBe(1);
  });

  it('clears storage', () => {
    saveToLocalStorage(makeNotebook());
    clearLocalStorage();
    expect(loadFromLocalStorage()).toBeNull();
    expect(getLocalStorageMeta()).toBeNull();
  });

  it('returns null for invalid JSON', () => {
    storage.set('tangent-notebook-autosave', 'not json');
    expect(loadFromLocalStorage()).toBeNull();
  });

  it('returns null for object missing required fields', () => {
    storage.set('tangent-notebook-autosave', JSON.stringify({ foo: 'bar' }));
    expect(loadFromLocalStorage()).toBeNull();
  });
});
