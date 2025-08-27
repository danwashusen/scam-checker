import type { CacheInterface, CacheStats } from './cache-types'

/**
 * NoOpCache - Pass-through cache implementation that doesn't actually cache anything
 * Used as the default cache implementation for MVP, provides the interface
 * without any actual caching behavior
 */
export class NoOpCache<T> implements CacheInterface<T> {
  private _stats: CacheStats = {
    hits: 0,
    misses: 0,
    hitRate: 0,
    size: 0,
    maxSize: 0,
  }

  async get(_key: string): Promise<T | null> {
    this._stats.misses++
    this._stats.hitRate = this._stats.hits / (this._stats.hits + this._stats.misses)
    return null
  }

  async set(_key: string, _value: T, _ttl?: number): Promise<void> {
    // No-op - doesn't actually store anything
    return
  }

  async delete(_key: string): Promise<boolean> {
    return false
  }

  async clear(): Promise<void> {
    // No-op
    return
  }

  async has(_key: string): Promise<boolean> {
    return false
  }

  async size(): Promise<number> {
    return 0
  }

  async keys(): Promise<string[]> {
    return []
  }

  getStats(): CacheStats {
    return { ...this._stats }
  }
}