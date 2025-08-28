# Story 0-5: Service Factory Pattern Refactoring

## Objective

Refactor the service layer from singleton pattern to Factory Pattern with Builder for improved testability, configuration management, and dependency injection.

## Background

The current codebase uses singleton pattern exports (e.g., `export const defaultReputationService = new ReputationService()`) which creates tight coupling, makes testing difficult, and prevents runtime configuration changes.

## Success Criteria

- [ ] Replace all singleton service exports with factory pattern
- [ ] Implement ServiceFactory class with static factory methods
- [ ] Create ServiceBuilder for fluent service configuration
- [ ] Update all service consumers to use factory pattern
- [ ] Add comprehensive tests for service factories
- [ ] Maintain backward compatibility during migration
- [ ] Zero singleton exports remaining in production code

## Technical Requirements

### Service Factory Implementation

#### 1. Create ServiceFactory Class

**File:** `src/lib/services/service-factory.ts`

```typescript
import { ReputationService } from '../analysis/reputation-service'
import { WhoisService } from '../analysis/whois-service'
import { SSLService } from '../analysis/ssl-service'
import { AIURLAnalyzer } from '../analysis/ai-url-analyzer'
import type {
  SafeBrowsingConfig,
  WhoisConfig,
  SSLConfig,
  AIAnalyzerConfig,
  ServicesConfig,
  AnalysisServices
} from '../../types/services'

export class ServiceFactory {
  static createReputationService(config?: Partial<SafeBrowsingConfig>): ReputationService {
    return new ReputationService(config)
  }
  
  static createWhoisService(config?: Partial<WhoisConfig>): WhoisService {
    return new WhoisService(config)
  }
  
  static createSSLService(config?: Partial<SSLConfig>): SSLService {
    return new SSLService(config)
  }
  
  static createAIURLAnalyzer(config?: Partial<AIAnalyzerConfig>): AIURLAnalyzer {
    return new AIURLAnalyzer(config)
  }
  
  static createLogger(config?: LoggerConfig): Logger {
    return new Logger(config)
  }
  
  static createAnalysisServices(config?: ServicesConfig): AnalysisServices {
    return {
      reputation: this.createReputationService(config?.reputation),
      whois: this.createWhoisService(config?.whois),
      ssl: this.createSSLService(config?.ssl),
      aiAnalyzer: this.createAIURLAnalyzer(config?.ai),
      logger: this.createLogger(config?.logger)
    }
  }
}
```

#### 2. Create ServiceBuilder Class

**File:** `src/lib/services/service-builder.ts`

```typescript
export class ServiceBuilder {
  private config: ServicesConfig = {}

  withReputationConfig(config: Partial<SafeBrowsingConfig>): ServiceBuilder {
    this.config.reputation = { ...this.config.reputation, ...config }
    return this
  }

  withWhoisConfig(config: Partial<WhoisConfig>): ServiceBuilder {
    this.config.whois = { ...this.config.whois, ...config }
    return this
  }

  withSSLConfig(config: Partial<SSLConfig>): ServiceBuilder {
    this.config.ssl = { ...this.config.ssl, ...config }
    return this
  }

  withAIConfig(config: Partial<AIAnalyzerConfig>): ServiceBuilder {
    this.config.ai = { ...this.config.ai, ...config }
    return this
  }

  withLoggerConfig(config: Partial<LoggerConfig>): ServiceBuilder {
    this.config.logger = { ...this.config.logger, ...config }
    return this
  }

  withEnvironment(env: 'development' | 'staging' | 'production'): ServiceBuilder {
    // Apply environment-specific defaults
    const envDefaults = this.getEnvironmentDefaults(env)
    this.config = { ...envDefaults, ...this.config }
    return this
  }

  withDefaults(): ServiceBuilder {
    this.config = {
      ...this.getDefaultConfig(),
      ...this.config
    }
    return this
  }

  build(): AnalysisServices {
    return ServiceFactory.createAnalysisServices(this.config)
  }

  private getEnvironmentDefaults(env: string): ServicesConfig {
    switch (env) {
      case 'production':
        return {
          reputation: { timeout: 5000, maxRetries: 3 },
          whois: { timeout: 10000, maxRetries: 2 },
          ssl: { timeout: 5000 },
          ai: { timeout: 30000, maxRetries: 2 },
          logger: { level: 'info' }
        }
      case 'staging':
        return {
          reputation: { timeout: 10000, maxRetries: 2 },
          whois: { timeout: 15000, maxRetries: 1 },
          ssl: { timeout: 10000 },
          ai: { timeout: 45000, maxRetries: 1 },
          logger: { level: 'debug' }
        }
      default: // development
        return {
          reputation: { timeout: 15000, maxRetries: 1 },
          whois: { timeout: 20000, maxRetries: 1 },
          ssl: { timeout: 15000 },
          ai: { timeout: 60000, maxRetries: 1 },
          logger: { level: 'debug' }
        }
    }
  }

  private getDefaultConfig(): ServicesConfig {
    return this.getEnvironmentDefaults('development')
  }
}
```

### Service Refactoring Tasks

#### Phase 1: Add Factory Support (Backward Compatible)

1. **Add factory files alongside existing singletons**
2. **Update type definitions** in `src/types/services.ts`
3. **Add comprehensive tests** for factory classes

#### Phase 2: Migrate Service Consumers

1. **Update API route handlers** to use factory pattern:

```typescript
// Before (using singleton)
import { defaultReputationService } from '@/lib/analysis/reputation-service'

// After (using factory)
import { ServiceBuilder } from '@/lib/services/service-builder'

const services = new ServiceBuilder()
  .withEnvironment(process.env.NODE_ENV as any)
  .withDefaults()
  .build()
```

2. **Update Lambda handlers** to use factory pattern
3. **Update orchestrator classes** to accept injected services
4. **Update all test files** to use mock factories

#### Phase 3: Remove Singleton Exports

1. **Remove singleton exports** from service files:
   - `src/lib/analysis/reputation-service.ts` - Remove `defaultReputationService`
   - `src/lib/analysis/whois-service.ts` - Remove `defaultWhoisService`
   - `src/lib/analysis/ssl-service.ts` - Remove `defaultSSLService`
   - `src/lib/analysis/ai-url-analyzer.ts` - Remove `defaultAIURLAnalyzer`
   - `src/lib/logger.ts` - Remove `logger` export, export only Logger class

2. **Export only class definitions** from service files
3. **Update all imports** to use factory pattern
4. **Verify no remaining singleton usage**

### Testing Strategy

#### Unit Tests

**File:** `src/lib/services/__tests__/service-factory.test.ts`

```typescript
describe('ServiceFactory', () => {
  it('should create reputation service with default config', () => {
    const service = ServiceFactory.createReputationService()
    expect(service).toBeInstanceOf(ReputationService)
  })

  it('should create reputation service with custom config', () => {
    const config = { apiKey: 'test-key', timeout: 1000 }
    const service = ServiceFactory.createReputationService(config)
    expect(service.config.apiKey).toBe('test-key')
    expect(service.config.timeout).toBe(1000)
  })

  it('should create complete analysis services bundle', () => {
    const services = ServiceFactory.createAnalysisServices()
    expect(services.reputation).toBeInstanceOf(ReputationService)
    expect(services.whois).toBeInstanceOf(WhoisService)
    expect(services.ssl).toBeInstanceOf(SSLService)
    expect(services.aiAnalyzer).toBeInstanceOf(AIURLAnalyzer)
  })
})
```

**File:** `src/lib/services/__tests__/service-builder.test.ts`

```typescript
describe('ServiceBuilder', () => {
  it('should build services with fluent API', () => {
    const services = new ServiceBuilder()
      .withReputationConfig({ apiKey: 'test-key' })
      .withEnvironment('production')
      .build()
    
    expect(services.reputation.config.apiKey).toBe('test-key')
  })

  it('should apply environment-specific defaults', () => {
    const services = new ServiceBuilder()
      .withEnvironment('production')
      .build()
    
    expect(services.reputation.config.timeout).toBe(5000)
    expect(services.reputation.config.maxRetries).toBe(3)
  })
})
```

#### Integration Tests

**File:** `src/lib/services/__tests__/service-integration.test.ts`

Test that services created by factory work correctly together in the analysis orchestrator.

### Migration Checklist

#### Service Files Updates
- [ ] `src/lib/analysis/reputation-service.ts` - Remove singleton export
- [ ] `src/lib/analysis/whois-service.ts` - Remove singleton export  
- [ ] `src/lib/analysis/ssl-service.ts` - Remove singleton export
- [ ] `src/lib/analysis/ai-url-analyzer.ts` - Remove singleton export
- [ ] `src/lib/logger.ts` - Remove singleton export

#### Consumer Updates
- [ ] `src/app/api/analyze/route.ts` - Update to use factory
- [ ] `src/lib/analysis/orchestrator.ts` - Accept injected services
- [ ] All Lambda handlers - Update to use factory
- [ ] All test files - Update to use mock factories

#### Type Definitions
- [ ] `src/types/services.ts` - Add factory-related types
- [ ] Update all service config interfaces

#### Tests
- [ ] Add factory unit tests
- [ ] Add builder unit tests  
- [ ] Add service integration tests
- [ ] Update all existing service tests
- [ ] Add migration regression tests

## Definition of Done

- [ ] All singleton exports removed from service files
- [ ] ServiceFactory class implemented with full test coverage
- [ ] ServiceBuilder class implemented with fluent API
- [ ] All service consumers updated to use factory pattern
- [ ] Environment-specific service configuration working
- [ ] All tests passing with improved service isolation
- [ ] Documentation updated to reflect factory pattern usage
- [ ] Code review completed and approved
- [ ] No performance regression from singleton to factory pattern

## Dependencies

- Story 1-4: Reputation API Integration (completed)
- Story 1-2: WHOIS Integration (completed)
- Story 1-3: SSL Certificate Analysis (completed)
- Story 2-2: AI Content Analysis Integration (completed)

## Estimated Effort

**Total: 5 story points**
- Factory implementation: 2 points
- Service consumer updates: 2 points  
- Testing and validation: 1 point

## Risks & Mitigations

**Risk:** Breaking changes during migration
**Mitigation:** Phased approach with backward compatibility

**Risk:** Performance impact from factory instantiation
**Mitigation:** Benchmark tests and lazy initialization where needed

**Risk:** Incomplete migration leaving mixed patterns
**Mitigation:** Automated tests to verify no singleton usage remains

## Implementation Notes

- Maintain constructor compatibility in service classes
- Use dependency injection in orchestrator classes
- Consider lazy initialization for expensive services
- Add factory pattern to coding standards documentation
- Update developer onboarding documentation

## Acceptance Testing

1. **Factory Creation:** All services can be created via factory with custom configs
2. **Builder Pattern:** Services can be configured using fluent builder API
3. **Environment Configs:** Different environments apply appropriate defaults
4. **Service Isolation:** Tests show no shared state between service instances
5. **Performance:** No significant performance degradation vs singleton pattern
6. **Migration Complete:** Zero singleton exports detected in codebase scan