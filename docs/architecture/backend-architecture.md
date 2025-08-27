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
│   └── cacheService.ts        # Cache abstraction
└── utils/
    ├── logger.ts               # CloudWatch logging
    └── errors.ts               # Error handling
```

## Authentication and Authorization

For MVP - no authentication required. Future implementation would include API key validation via Lambda Authorizer.
