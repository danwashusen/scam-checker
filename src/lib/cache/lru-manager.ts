/**
 * LRU Manager - Efficient Least Recently Used cache eviction management
 * 
 * Implements doubly-linked list with hash map for O(1) operations:
 * - addMostRecentlyUsed: O(1)
 * - markAccessed: O(1)
 * - getLeastRecentlyUsed: O(1)
 * - remove: O(1)
 * 
 * Uses sentinel nodes (head/tail) to simplify edge case handling
 */

interface LRUNode {
  key: string
  prev: LRUNode | null
  next: LRUNode | null
}

export class LRUManager {
  private head: LRUNode
  private tail: LRUNode
  private nodeMap: Map<string, LRUNode> = new Map()

  constructor() {
    // Create sentinel nodes to simplify edge cases
    this.head = this.createSentinelNode('HEAD')
    this.tail = this.createSentinelNode('TAIL')
    this.head.next = this.tail
    this.tail.prev = this.head
  }

  /**
   * Add a key as most recently used (or move existing key to front)
   */
  addMostRecentlyUsed(key: string): void {
    if (this.nodeMap.has(key)) {
      // Key already exists, move to head
      const existingNode = this.nodeMap.get(key)!
      this.moveToHead(existingNode)
      return
    }

    // Create new node and add to head
    const newNode = this.createNode(key)
    this.nodeMap.set(key, newNode)
    this.addToHead(newNode)
  }

  /**
   * Mark a key as accessed (move to front of LRU list)
   */
  markAccessed(key: string): void {
    if (this.nodeMap.has(key)) {
      const node = this.nodeMap.get(key)!
      this.moveToHead(node)
    }
  }

  /**
   * Get the least recently used key (from tail of list)
   * Returns null if list is empty
   */
  getLeastRecentlyUsed(): string | null {
    // Check if list is empty (only sentinel nodes)
    if (this.tail.prev === this.head) {
      return null
    }

    const lruNode = this.tail.prev!
    return lruNode.key
  }

  /**
   * Remove a key from the LRU tracking
   * Returns true if key was found and removed, false otherwise
   */
  remove(key: string): boolean {
    if (!this.nodeMap.has(key)) {
      return false
    }

    const node = this.nodeMap.get(key)!
    this.removeNode(node)
    this.nodeMap.delete(key)
    return true
  }

  /**
   * Remove and return the least recently used key
   * Returns null if list is empty
   */
  removeLeastRecentlyUsed(): string | null {
    const lruKey = this.getLeastRecentlyUsed()
    if (lruKey) {
      this.remove(lruKey)
    }
    return lruKey
  }

  /**
   * Get current size of LRU tracking
   */
  size(): number {
    return this.nodeMap.size
  }

  /**
   * Check if key is being tracked
   */
  has(key: string): boolean {
    return this.nodeMap.has(key)
  }

  /**
   * Clear all entries
   */
  clear(): void {
    this.nodeMap.clear()
    this.head.next = this.tail
    this.tail.prev = this.head
  }

  /**
   * Get all keys in LRU order (most recent first)
   */
  getKeysInLRUOrder(): string[] {
    const keys: string[] = []
    let current = this.head.next

    while (current && current !== this.tail) {
      keys.push(current.key)
      current = current.next
    }

    return keys
  }

  // Private helper methods

  private createSentinelNode(key: string): LRUNode {
    return {
      key,
      prev: null,
      next: null
    }
  }

  private createNode(key: string): LRUNode {
    return {
      key,
      prev: null,
      next: null
    }
  }

  private moveToHead(node: LRUNode): void {
    this.removeNode(node)
    this.addToHead(node)
  }

  private addToHead(node: LRUNode): void {
    node.next = this.head.next
    node.prev = this.head
    
    if (this.head.next) {
      this.head.next.prev = node
    }
    this.head.next = node
  }

  private removeNode(node: LRUNode): void {
    if (node.prev) {
      node.prev.next = node.next
    }
    if (node.next) {
      node.next.prev = node.prev
    }
  }
}