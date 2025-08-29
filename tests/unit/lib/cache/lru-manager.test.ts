import { LRUManager } from '../../../../src/lib/cache/lru-manager'

describe('LRUManager', () => {
  let lruManager: LRUManager

  beforeEach(() => {
    lruManager = new LRUManager()
  })

  describe('Basic Operations', () => {
    it('should initialize empty', () => {
      expect(lruManager.size()).toBe(0)
      expect(lruManager.getLeastRecentlyUsed()).toBeNull()
      expect(lruManager.has('test')).toBe(false)
    })

    it('should add and track keys', () => {
      lruManager.addMostRecentlyUsed('key1')
      expect(lruManager.size()).toBe(1)
      expect(lruManager.has('key1')).toBe(true)
      expect(lruManager.getLeastRecentlyUsed()).toBe('key1')
    })

    it('should move existing key to front when re-added', () => {
      lruManager.addMostRecentlyUsed('key1')
      lruManager.addMostRecentlyUsed('key2')
      lruManager.addMostRecentlyUsed('key1') // Move key1 to front

      expect(lruManager.size()).toBe(2)
      expect(lruManager.getLeastRecentlyUsed()).toBe('key2')
    })

    it('should remove keys correctly', () => {
      lruManager.addMostRecentlyUsed('key1')
      lruManager.addMostRecentlyUsed('key2')

      expect(lruManager.remove('key1')).toBe(true)
      expect(lruManager.size()).toBe(1)
      expect(lruManager.has('key1')).toBe(false)
      expect(lruManager.getLeastRecentlyUsed()).toBe('key2')
    })

    it('should return false when removing non-existent key', () => {
      expect(lruManager.remove('nonexistent')).toBe(false)
      expect(lruManager.size()).toBe(0)
    })
  })

  describe('LRU Ordering', () => {
    it('should maintain LRU order with multiple keys', () => {
      lruManager.addMostRecentlyUsed('oldest')
      lruManager.addMostRecentlyUsed('middle')
      lruManager.addMostRecentlyUsed('newest')

      expect(lruManager.getLeastRecentlyUsed()).toBe('oldest')
    })

    it('should update LRU order when key is accessed', () => {
      lruManager.addMostRecentlyUsed('key1')
      lruManager.addMostRecentlyUsed('key2')
      lruManager.addMostRecentlyUsed('key3')

      // Access key1, should move it to front
      lruManager.markAccessed('key1')
      expect(lruManager.getLeastRecentlyUsed()).toBe('key2')
    })

    it('should return keys in LRU order', () => {
      lruManager.addMostRecentlyUsed('first')
      lruManager.addMostRecentlyUsed('second')
      lruManager.addMostRecentlyUsed('third')

      const keys = lruManager.getKeysInLRUOrder()
      expect(keys).toEqual(['third', 'second', 'first'])
    })

    it('should handle removeLeastRecentlyUsed correctly', () => {
      lruManager.addMostRecentlyUsed('key1')
      lruManager.addMostRecentlyUsed('key2')
      lruManager.addMostRecentlyUsed('key3')

      const removed = lruManager.removeLeastRecentlyUsed()
      expect(removed).toBe('key1')
      expect(lruManager.size()).toBe(2)
      expect(lruManager.has('key1')).toBe(false)
    })
  })

  describe('Edge Cases', () => {
    it('should handle markAccessed on non-existent key', () => {
      lruManager.markAccessed('nonexistent')
      expect(lruManager.size()).toBe(0)
    })

    it('should handle removeLeastRecentlyUsed on empty manager', () => {
      const removed = lruManager.removeLeastRecentlyUsed()
      expect(removed).toBeNull()
    })

    it('should clear all entries', () => {
      lruManager.addMostRecentlyUsed('key1')
      lruManager.addMostRecentlyUsed('key2')
      
      lruManager.clear()
      expect(lruManager.size()).toBe(0)
      expect(lruManager.getKeysInLRUOrder()).toEqual([])
    })
  })

  describe('Performance Requirements', () => {
    it('should handle large number of entries efficiently', () => {
      const startTime = Date.now()
      
      // Add 1000 entries
      for (let i = 0; i < 1000; i++) {
        lruManager.addMostRecentlyUsed(`key${i}`)
      }
      
      // Access some entries to test LRU updates
      for (let i = 0; i < 100; i++) {
        lruManager.markAccessed(`key${i}`)
      }
      
      // Remove some entries
      for (let i = 0; i < 100; i++) {
        lruManager.remove(`key${i}`)
      }
      
      const endTime = Date.now()
      expect(endTime - startTime).toBeLessThan(100) // Should complete within 100ms
      expect(lruManager.size()).toBe(900)
    })
  })
})