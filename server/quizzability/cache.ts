// ─────────────────────────────────────────────────────────────
// Quizzability Scoring Engine — In-Memory Cache
// Caches all external API results per theme (keyed by normalized
// theme string) since API calls are expensive/rate-limited.
// ─────────────────────────────────────────────────────────────

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

/**
 * Simple in-memory TTL cache.
 * Keyed by normalized theme string, so "Istorie" and "istorie" share a slot.
 */
export class ThemeCache<T> {
  private store = new Map<string, CacheEntry<T>>();
  private readonly ttlMs: number;

  /**
   * @param ttlMinutes How long entries survive before expiring. Default: 60 min.
   */
  constructor(ttlMinutes: number = 60) {
    this.ttlMs = ttlMinutes * 60 * 1000;
  }

  /** Normalize a theme string into a cache key. */
  private normalizeKey(theme: string): string {
    return theme
      .toLowerCase()
      .trim()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // strip diacritics for key matching
      .replace(/\s+/g, " ");
  }

  /** Get a cached value, or undefined if missing/expired. */
  get(theme: string): T | undefined {
    const key = this.normalizeKey(theme);
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (Date.now() - entry.timestamp > this.ttlMs) {
      this.store.delete(key);
      return undefined;
    }
    return entry.data;
  }

  /** Store a value in the cache. */
  set(theme: string, data: T): void {
    const key = this.normalizeKey(theme);
    this.store.set(key, { data, timestamp: Date.now() });
  }

  /** Check if a non-expired entry exists. */
  has(theme: string): boolean {
    return this.get(theme) !== undefined;
  }

  /** Remove all entries. */
  clear(): void {
    this.store.clear();
  }

  /** Current number of (possibly expired) entries. */
  get size(): number {
    return this.store.size;
  }
}
