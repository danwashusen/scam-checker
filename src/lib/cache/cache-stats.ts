import type { CacheStats } from './cache-types'
import { Logger } from '../logger'

const logger = new Logger()

/**
 * Cache performance metrics and statistics tracking
 */
export interface CacheMetrics {
  service: string
  hitRate: number
  missRate: number
  totalRequests: number
  averageResponseTime: number
  memoryUsage?: {
    current: number
    max: number
    percentage: number
  }
  evictionCount: number
  entryCount: number
  lastUpdated: number
}

/**
 * Performance report aggregation
 */
export interface PerformanceReport {
  overall: {
    totalCacheSize: number
    totalMemoryUsage: number
    averageHitRate: number
    totalEvictions: number
  }
  services: CacheMetrics[]
  recommendations: string[]
  timestamp: number
}

/**
 * Statistics collection and analysis for cache performance monitoring
 */
export class CacheStatistics {
  private serviceMetrics: Map<string, CacheMetrics> = new Map()
  private performanceHistory: PerformanceReport[] = []
  private readonly maxHistorySize = 100

  /**
   * Update statistics for a service
   */
  updateServiceStats(
    service: string, 
    stats: CacheStats, 
    memoryUsage?: { current: number; max: number; percentage: number }
  ): void {
    const metrics: CacheMetrics = {
      service,
      hitRate: stats.hitRate,
      missRate: 1 - stats.hitRate,
      totalRequests: stats.hits + stats.misses,
      averageResponseTime: 0, // Would need to be tracked separately
      memoryUsage,
      evictionCount: 0, // Would need to be tracked separately
      entryCount: stats.size,
      lastUpdated: Date.now()
    }

    this.serviceMetrics.set(service, metrics)
  }

  /**
   * Track cache hit/miss for performance monitoring
   */
  trackHitRate(service: string, hit: boolean): void {
    const existing = this.serviceMetrics.get(service)
    if (existing) {
      if (hit) {
        existing.hitRate = (existing.hitRate * existing.totalRequests + 1) / (existing.totalRequests + 1)
      } else {
        existing.hitRate = (existing.hitRate * existing.totalRequests) / (existing.totalRequests + 1)
      }
      existing.missRate = 1 - existing.hitRate
      existing.totalRequests++
      existing.lastUpdated = Date.now()
    }
  }

  /**
   * Track memory usage for a service
   */
  trackMemoryUsage(service: string, bytes: number, maxBytes: number): void {
    const existing = this.serviceMetrics.get(service)
    if (existing) {
      existing.memoryUsage = {
        current: bytes,
        max: maxBytes,
        percentage: maxBytes > 0 ? (bytes / maxBytes) * 100 : 0
      }
      existing.lastUpdated = Date.now()
    }
  }

  /**
   * Track cache evictions
   */
  trackEviction(service: string): void {
    const existing = this.serviceMetrics.get(service)
    if (existing) {
      existing.evictionCount++
      existing.lastUpdated = Date.now()
    }
  }

  /**
   * Get current metrics for all services
   */
  collectStats(): Map<string, CacheMetrics> {
    return new Map(this.serviceMetrics)
  }

  /**
   * Get metrics for a specific service
   */
  getServiceStats(service: string): CacheMetrics | undefined {
    return this.serviceMetrics.get(service)
  }

  /**
   * Generate comprehensive performance report
   */
  getPerformanceReport(): PerformanceReport {
    const services = Array.from(this.serviceMetrics.values())
    
    const overall = this.calculateOverallMetrics(services)
    const recommendations = this.generateRecommendations(services)
    
    const report: PerformanceReport = {
      overall,
      services,
      recommendations,
      timestamp: Date.now()
    }

    // Add to history
    this.performanceHistory.push(report)
    if (this.performanceHistory.length > this.maxHistorySize) {
      this.performanceHistory.shift()
    }

    return report
  }

  /**
   * Get performance history
   */
  getPerformanceHistory(limit?: number): PerformanceReport[] {
    const history = [...this.performanceHistory]
    return limit ? history.slice(-limit) : history
  }

  /**
   * Get performance trends over time
   */
  getPerformanceTrends(): {
    hitRateTrend: number
    memoryUsageTrend: number
    evictionTrend: number
  } {
    if (this.performanceHistory.length < 2) {
      return { hitRateTrend: 0, memoryUsageTrend: 0, evictionTrend: 0 }
    }

    const recent = this.performanceHistory.slice(-10) // Last 10 reports
    const oldest = recent[0]
    const newest = recent[recent.length - 1]

    return {
      hitRateTrend: newest.overall.averageHitRate - oldest.overall.averageHitRate,
      memoryUsageTrend: newest.overall.totalMemoryUsage - oldest.overall.totalMemoryUsage,
      evictionTrend: newest.overall.totalEvictions - oldest.overall.totalEvictions
    }
  }

  /**
   * Log performance summary
   */
  logPerformanceSummary(): void {
    const report = this.getPerformanceReport()
    
    logger.info('Cache Performance Summary', {
      overall: report.overall,
      serviceCount: report.services.length,
      recommendationCount: report.recommendations.length
    })

    // Log individual service performance
    for (const service of report.services) {
      if (service.hitRate < 0.6) {
        logger.warn(`Low cache hit rate for ${service.service}`, {
          hitRate: service.hitRate,
          totalRequests: service.totalRequests
        })
      }
    }

    // Log recommendations
    if (report.recommendations.length > 0) {
      logger.info('Cache Performance Recommendations', {
        recommendations: report.recommendations
      })
    }
  }

  /**
   * Reset statistics for a service
   */
  resetServiceStats(service: string): void {
    this.serviceMetrics.delete(service)
  }

  /**
   * Reset all statistics
   */
  resetAllStats(): void {
    this.serviceMetrics.clear()
    this.performanceHistory.length = 0
  }

  // Private helper methods

  private calculateOverallMetrics(services: CacheMetrics[]): PerformanceReport['overall'] {
    if (services.length === 0) {
      return {
        totalCacheSize: 0,
        totalMemoryUsage: 0,
        averageHitRate: 0,
        totalEvictions: 0
      }
    }

    const totalRequests = services.reduce((sum, s) => sum + s.totalRequests, 0)
    const weightedHitRate = services.reduce((sum, s) => sum + (s.hitRate * s.totalRequests), 0)

    return {
      totalCacheSize: services.reduce((sum, s) => sum + s.entryCount, 0),
      totalMemoryUsage: services.reduce((sum, s) => sum + (s.memoryUsage?.current || 0), 0),
      averageHitRate: totalRequests > 0 ? weightedHitRate / totalRequests : 0,
      totalEvictions: services.reduce((sum, s) => sum + s.evictionCount, 0)
    }
  }

  private generateRecommendations(services: CacheMetrics[]): string[] {
    const recommendations: string[] = []

    for (const service of services) {
      // Low hit rate recommendations
      if (service.hitRate < 0.6) {
        recommendations.push(`Consider increasing TTL for ${service.service} cache (current hit rate: ${(service.hitRate * 100).toFixed(1)}%)`)
      }

      // High memory usage recommendations
      if (service.memoryUsage && service.memoryUsage.percentage > 85) {
        recommendations.push(`${service.service} cache memory usage is high (${service.memoryUsage.percentage.toFixed(1)}%) - consider increasing memory limit or reducing TTL`)
      }

      // High eviction rate recommendations
      if (service.evictionCount > service.entryCount * 0.1) {
        recommendations.push(`High eviction rate for ${service.service} - consider increasing cache size or memory limit`)
      }

      // Low cache utilization recommendations
      if (service.entryCount === 0 && service.totalRequests > 0) {
        recommendations.push(`${service.service} cache is not being utilized despite requests - check cache configuration`)
      }
    }

    // Overall system recommendations
    const overall = this.calculateOverallMetrics(services)
    if (overall.averageHitRate < 0.6) {
      recommendations.push('Overall cache hit rate is below target (60%) - review caching strategy and TTL settings')
    }

    if (overall.totalEvictions > overall.totalCacheSize * 0.1) {
      recommendations.push('High overall eviction rate - consider increasing memory limits across services')
    }

    return recommendations
  }
}