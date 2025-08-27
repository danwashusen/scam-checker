import { CacheManager, NoOpCache } from '../../../../src/lib/cache'
import type { CacheInterface, CacheEntry } from '../../../../src/lib/cache/cache-types'

// Mock cache implementation for testing
class MockCache<T> implements CacheInterface<T> {
  private store = new Map<string, T>()
  private stats = { gets: 0, sets: 0, deletes: 0 }

  async get(key: string): Promise<T | null> {
    this.stats.gets++
    return this.store.get(key) || null
  }

  async set(key: string, value: T, _ttl?: number): Promise<void> {
    this.stats.sets++
    this.store.set(key, value)
  }

  async delete(key: string): Promise<boolean> {
    this.stats.deletes++
    return this.store.delete(key)
  }

  async clear(): Promise<void> {
    this.store.clear()
  }

  async has(key: string): Promise<boolean> {
    return this.store.has(key)
  }

  async size(): Promise<number> {
    return this.store.size
  }

  async keys(): Promise<string[]> {
    return Array.from(this.store.keys())
  }

  getStats() {
    return this.stats
  }
}

interface TestData {
  id: string
  value: string
}

describe('CacheManager', () => {
  let cacheManager: CacheManager<TestData>
  let mockCache: MockCache<CacheEntry<TestData>>

  beforeEach(() => {
    mockCache = new MockCache<CacheEntry<TestData>>()
    cacheManager = new CacheManager<TestData>(
      {
        prefix: 'test',
        ttl: 1000, // 1 second
        maxSize: 100,
      },
      mockCache
    )
  })

  describe('get/set operations', () => {
    it('should store and retrieve data', async () => {
      const testData: TestData = { id: '1', value: 'test' }
      
      await cacheManager.set('key1', testData)
      const result = await cacheManager.get('key1')
      
      expect(result).toEqual(testData)
    })

    it('should return null for non-existent keys', async () => {
      const result = await cacheManager.get('nonexistent')
      expect(result).toBeNull()
    })

    it('should use prefixed keys', async () => {
      const testData: TestData = { id: '1', value: 'test' }
      
      await cacheManager.set('key1', testData)
      
      const keys = await mockCache.keys()
      expect(keys).toContain('test:key1')
    })

    it('should handle custom TTL', async () => {
      const testData: TestData = { id: '1', value: 'test' }
      
      await cacheManager.set('key1', testData, 2000) // 2 seconds
      const result = await cacheManager.get('key1')
      
      expect(result).toEqual(testData)
    })
  })

  describe('expiration handling', () => {
    beforeEach(() => {
      jest.useFakeTimers()
    })

    afterEach(() => {
      jest.useRealTimers()
    })

    it('should return null for expired entries', async () => {
      const testData: TestData = { id: '1', value: 'test' }
      
      await cacheManager.set('key1', testData, 1000)
      
      // Fast forward time past expiration
      jest.advanceTimersByTime(1500)
      
      const result = await cacheManager.get('key1')
      expect(result).toBeNull()
    })

    it('should remove expired entries when accessed', async () => {
      const testData: TestData = { id: '1', value: 'test' }
      
      await cacheManager.set('key1', testData, 1000)
      
      // Fast forward time past expiration
      jest.advanceTimersByTime(1500)
      
      await cacheManager.get('key1')
      
      // Check that expired entry was removed
      const hasKey = await mockCache.has('test:key1')
      expect(hasKey).toBeFalsy()
    })

    it('should return valid entries before expiration', async () => {
      const testData: TestData = { id: '1', value: 'test' }
      
      await cacheManager.set('key1', testData, 2000)
      
      // Fast forward time but not past expiration
      jest.advanceTimersByTime(1000)
      
      const result = await cacheManager.get('key1')
      expect(result).toEqual(testData)
    })
  })

  describe('cache statistics', () => {
    it('should track hits and misses', async () => {
      const testData: TestData = { id: '1', value: 'test' }
      
      await cacheManager.set('key1', testData)
      
      // Cache hit
      await cacheManager.get('key1')
      
      // Cache miss
      await cacheManager.get('key2')
      
      const stats = cacheManager.getStats()
      expect(stats.hits).toBe(1)
      expect(stats.misses).toBe(1)
      expect(stats.hitRate).toBe(0.5)
    })

    it('should calculate correct hit rate', async () => {
      const testData: TestData = { id: '1', value: 'test' }
      
      await cacheManager.set('key1', testData)
      
      // Multiple hits
      await cacheManager.get('key1')
      await cacheManager.get('key1')
      
      // One miss
      await cacheManager.get('key2')
      
      const stats = cacheManager.getStats()
      expect(stats.hits).toBe(2)
      expect(stats.misses).toBe(1)
      expect(stats.hitRate).toBeCloseTo(0.67, 2)
    })
  })

  describe('getOrSet pattern', () => {
    it('should return cached value if exists', async () => {
      const testData: TestData = { id: '1', value: 'cached' }
      await cacheManager.set('key1', testData)
      
      const factory = jest.fn().mockResolvedValue({ id: '1', value: 'factory' })
      
      const result = await cacheManager.getOrSet('key1', factory)
      
      expect(result).toEqual(testData)
      expect(factory).not.toHaveBeenCalled()
    })

    it('should call factory and cache result if not exists', async () => {
      const factoryData: TestData = { id: '1', value: 'factory' }
      const factory = jest.fn().mockResolvedValue(factoryData)
      
      const result = await cacheManager.getOrSet('key1', factory)
      
      expect(result).toEqual(factoryData)
      expect(factory).toHaveBeenCalledTimes(1)
      
      // Verify it was cached
      const cachedResult = await cacheManager.get('key1')
      expect(cachedResult).toEqual(factoryData)
    })
  })

  describe('cache operations', () => {
    it('should delete entries', async () => {
      const testData: TestData = { id: '1', value: 'test' }
      
      await cacheManager.set('key1', testData)
      const deleted = await cacheManager.delete('key1')
      
      expect(deleted).toBe(true)
      
      const result = await cacheManager.get('key1')
      expect(result).toBeNull()
    })

    it('should return false when deleting non-existent key', async () => {
      const deleted = await cacheManager.delete('nonexistent')
      expect(deleted).toBe(false)
    })

    it('should check if key exists', async () => {
      const testData: TestData = { id: '1', value: 'test' }
      
      await cacheManager.set('key1', testData)
      
      const exists = await cacheManager.has('key1')
      const notExists = await cacheManager.has('key2')
      
      expect(exists).toBe(true)
      expect(notExists).toBe(false)
    })

    it('should clear all entries', async () => {
      const testData: TestData = { id: '1', value: 'test' }
      
      await cacheManager.set('key1', testData)
      await cacheManager.set('key2', testData)
      
      await cacheManager.clear()
      
      const result1 = await cacheManager.get('key1')
      const result2 = await cacheManager.get('key2')
      
      expect(result1).toBeNull()
      expect(result2).toBeNull()
    })
  })

  describe('cleanup operations', () => {
    beforeEach(() => {
      jest.useFakeTimers()
    })

    afterEach(() => {
      jest.useRealTimers()
    })

    it('should clean up expired entries', async () => {
      const testData: TestData = { id: '1', value: 'test' }
      
      await cacheManager.set('key1', testData, 1000)
      await cacheManager.set('key2', testData, 2000)
      
      // Fast forward time past first entry expiration
      jest.advanceTimersByTime(1500)
      
      const cleanedCount = await cacheManager.cleanup()
      
      expect(cleanedCount).toBe(1)
      expect(await cacheManager.has('key1')).toBe(false)
      expect(await cacheManager.has('key2')).toBe(true)
    })
  })

  describe('error handling', () => {
    it('should handle cache errors gracefully', async () => {
      const failingCache = {
        get: jest.fn().mockRejectedValue(new Error('Cache error')),
        set: jest.fn().mockRejectedValue(new Error('Cache error')),
        delete: jest.fn().mockRejectedValue(new Error('Cache error')),
        has: jest.fn().mockRejectedValue(new Error('Cache error')),
        clear: jest.fn(),
        size: jest.fn(),
        keys: jest.fn(),
      } as unknown as jest.Mocked<CacheInterface<CacheEntry<TestData>>>

      const errorCacheManager = new CacheManager<TestData>(
        { prefix: 'test', ttl: 1000 },
        failingCache
      )

      // Should return null on get error
      const result = await errorCacheManager.get('key1')
      expect(result).toBeNull()

      // Should not throw on set error
      await expect(
        errorCacheManager.set('key1', { id: '1', value: 'test' })
      ).resolves.not.toThrow()

      // Should return false on delete error
      const deleted = await errorCacheManager.delete('key1')
      expect(deleted).toBe(false)

      // Should return false on has error
      const exists = await errorCacheManager.has('key1')
      expect(exists).toBe(false)
    })
  })
})

describe('NoOpCache', () => {
  let noOpCache: NoOpCache<TestData>

  beforeEach(() => {
    noOpCache = new NoOpCache<TestData>()
  })

  it('should always return null for get operations', async () => {
    const result = await noOpCache.get('any-key')
    expect(result).toBeNull()
  })

  it('should not store anything on set operations', async () => {
    await noOpCache.set('key1', { id: '1', value: 'test' })
    const result = await noOpCache.get('key1')
    expect(result).toBeNull()
  })

  it('should always return false for has operations', async () => {
    await noOpCache.set('key1', { id: '1', value: 'test' })
    const exists = await noOpCache.has('key1')
    expect(exists).toBe(false)
  })

  it('should always return 0 for size operations', async () => {
    await noOpCache.set('key1', { id: '1', value: 'test' })
    const size = await noOpCache.size()
    expect(size).toBe(0)
  })

  it('should always return empty array for keys operations', async () => {
    await noOpCache.set('key1', { id: '1', value: 'test' })
    const keys = await noOpCache.keys()
    expect(keys).toEqual([])
  })

  it('should track misses in stats', async () => {
    await noOpCache.get('key1')
    await noOpCache.get('key2')
    
    const stats = noOpCache.getStats()
    expect(stats.misses).toBe(2)
    expect(stats.hits).toBe(0)
    expect(stats.hitRate).toBe(0)
  })
})