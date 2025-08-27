export interface CacheEntry<T> {
  data: T
  expiresAt: number
  createdAt: number
}

export interface CacheOptions {
  prefix: string
  ttl: number // Time to live in milliseconds
  maxSize?: number // Maximum cache size (default: 1000)
}

export interface CacheInterface<T> {
  get(key: string): Promise<T | null>
  set(key: string, value: T, ttl?: number): Promise<void>
  delete(key: string): Promise<boolean>
  clear(): Promise<void>
  has(key: string): Promise<boolean>
  size(): Promise<number>
  keys(): Promise<string[]>
}

export interface CacheStats {
  hits: number
  misses: number
  hitRate: number
  size: number
  maxSize: number
  memoryUsage?: number
}

export interface CacheConfig {
  enabled: boolean
  defaultTtl: number
  maxSize: number
  cleanupInterval: number // How often to clean expired entries (ms)
}