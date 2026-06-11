import { logger } from '../utils/logger.js';

export type CacheStatus = 'HIT' | 'STALE' | 'MISS';

interface CacheEntry<T> {
  data: T;
  fetchedAt: number;
  expiresAt: number;
}

export class MemoryCache<T> {
  private entry: CacheEntry<T> | null = null;
  private refreshTimer: ReturnType<typeof setInterval> | null = null;
  private refreshing = false;

  constructor(
    private readonly name: string,
    private readonly ttlMs: number,
    private readonly loader: () => Promise<T>
  ) {}

  start(): void {
    this.refreshTimer = setInterval(() => void this.refresh(false), this.ttlMs);
  }

  stop(): void {
    if (this.refreshTimer) clearInterval(this.refreshTimer);
  }

  async refresh(force = false): Promise<void> {
    if (this.refreshing && !force) return;
    this.refreshing = true;
    try {
      const data = await this.loader();
      const now = Date.now();
      this.entry = { data, fetchedAt: now, expiresAt: now + this.ttlMs };
      logger.info({ cache: this.name, count: Array.isArray(data) ? data.length : 1 }, 'Cache refreshed');
    } catch (err) {
      logger.warn({ err, cache: this.name }, 'Cache refresh failed');
      if (!this.entry) throw err;
    } finally {
      this.refreshing = false;
    }
  }

  get(): { data: T; status: CacheStatus } {
    if (!this.entry) {
      throw new Error(`Cache ${this.name} not initialized`);
    }
    const now = Date.now();
    const status: CacheStatus = now <= this.entry.expiresAt ? 'HIT' : 'STALE';
    return { data: this.entry.data, status };
  }

  getMeta() {
    if (!this.entry) return { initialized: false };
    return {
      initialized: true,
      fetchedAt: this.entry.fetchedAt,
      expiresAt: this.entry.expiresAt,
      stale: Date.now() > this.entry.expiresAt,
    };
  }
}
