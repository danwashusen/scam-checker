# Backend Architecture

## Service Architecture

### Serverless Architecture

#### Function Organization
```
lambda/
├── functions/
│   ├── analyze/
│   │   ├── handler.ts          # Main analysis handler
│   │   ├── orchestrator.ts     # Analysis orchestration logic
│   │   └── index.ts           # Lambda entry point
│   └── health/
│       └── handler.ts          # Health check handler
├── services/
│   ├── whoisService.ts        # WHOIS library integration
│   ├── safeBrowsingService.ts # Google Safe Browsing API
│   ├── aiAnalysisService.ts   # OpenAI/Claude integration
│   ├── scoringService.ts      # Risk scoring logic
│   ├── cacheService.ts        # Cache abstraction
│   ├── service-factory.ts     # Service factory pattern
│   └── service-builder.ts     # Service configuration builder
└── utils/
    ├── logger.ts               # CloudWatch logging
    └── errors.ts               # Error handling
```

### Service Factory Pattern

The backend uses a **Factory Pattern with Builder** to manage service instantiation, replacing singleton patterns for better testability and configuration management.

#### ServiceFactory Class

**Purpose:** Centralized service creation with configuration support
**Location:** `src/lib/services/service-factory.ts`

```typescript
export class ServiceFactory {
  static createReputationService(config?: Partial<SafeBrowsingConfig>): ReputationService {
    return new ReputationService(config)
  }
  
  static createWhoisService(config?: WhoisConfig): WhoisService {
    return new WhoisService(config)
  }
  
  static createSSLService(config?: SSLConfig): SSLService {
    return new SSLService(config)
  }
  
  static createAIURLAnalyzer(config?: AIAnalyzerConfig): AIURLAnalyzer {
    return new AIURLAnalyzer(config)
  }
  
  static createAnalysisServices(config?: ServicesConfig): AnalysisServices {
    return {
      reputation: this.createReputationService(config?.reputation),
      whois: this.createWhoisService(config?.whois),
      ssl: this.createSSLService(config?.ssl),
      aiAnalyzer: this.createAIURLAnalyzer(config?.ai)
    }
  }
}
```

#### ServiceBuilder Pattern

**Purpose:** Fluent API for complex service configuration
**Location:** `src/lib/services/service-builder.ts`

```typescript
export class ServiceBuilder {
  private config: ServicesConfig = {}

  withReputationConfig(config: Partial<SafeBrowsingConfig>): ServiceBuilder {
    this.config.reputation = { ...this.config.reputation, ...config }
    return this
  }

  withEnvironment(env: 'development' | 'staging' | 'production'): ServiceBuilder {
    // Apply environment-specific defaults
    return this
  }

  build(): AnalysisServices {
    return ServiceFactory.createAnalysisServices(this.config)
  }
}
```

#### Service Configuration

Services are configured at Lambda function initialization:

```typescript
// lambda/functions/analyze/handler.ts
const services = new ServiceBuilder()
  .withEnvironment(process.env.NODE_ENV as any)
  .withReputationConfig({
    apiKey: process.env.GOOGLE_SAFE_BROWSING_API_KEY,
    timeout: 5000
  })
  .build()

export const handler = async (event: APIGatewayProxyEvent) => {
  const orchestrator = new AnalysisOrchestrator(services)
  // ... handler logic
}
```

### Benefits of Factory Pattern

- **Testability:** Easy to inject mock services in unit tests
- **Configuration:** Environment-specific service configuration
- **Isolation:** No shared state between Lambda invocations
- **Flexibility:** Runtime service selection based on conditions
- **Type Safety:** Full TypeScript support with proper inference

## Authentication and Authorization

For MVP - no authentication required. Future implementation would include API key validation via Lambda Authorizer.
