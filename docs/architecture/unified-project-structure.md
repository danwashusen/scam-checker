# Unified Project Structure

```plaintext
scam-checker/
├── README.md                          # Project overview and setup
├── .gitignore                         # Git ignore patterns
├── .env.example                       # Environment variables template
├── .env.local                         # Local environment variables (gitignored)
├── package.json                       # Dependencies and scripts
├── next.config.ts                     # Next.js configuration
├── tailwind.config.ts                 # Tailwind CSS configuration
├── tsconfig.json                      # TypeScript configuration
├── jest.config.js                     # Jest testing configuration
├── cypress.config.ts                  # Cypress E2E testing configuration
│
├── src/                              # Application source code
│   ├── app/                          # Next.js App Router directory
│   │   ├── globals.css               # Global styles
│   │   ├── layout.tsx                # Root layout component
│   │   ├── page.tsx                  # Home page component
│   │   ├── loading.tsx               # Loading UI component
│   │   ├── error.tsx                 # Error UI component
│   │   └── api/                      # API route handlers (development)
│   │       └── analyze/              # URL analysis endpoints
│   │           └── route.ts          # Main analysis API endpoint
│   │
│   ├── components/                   # Reusable React components
│   │   ├── ui/                       # Base UI components (shadcn/ui)
│   │   │   ├── button.tsx
│   │   │   ├── input.tsx
│   │   │   ├── card.tsx
│   │   │   └── ...                   # Other shadcn/ui components
│   │   ├── analysis/                 # URL analysis specific components
│   │   │   ├── url-input-form.tsx
│   │   │   ├── risk-display.tsx
│   │   │   ├── technical-details.tsx
│   │   │   └── explanation-panel.tsx
│   │   └── layout/                   # Layout and navigation components
│   │       ├── header.tsx
│   │       ├── footer.tsx
│   │       └── navigation.tsx
│   │
│   ├── lib/                          # Shared utilities and configurations
│   │   ├── utils.ts                  # General utility functions
│   │   ├── validation.ts             # URL validation logic
│   │   ├── cache.ts                  # Caching utilities
│   │   └── analysis/                 # Analysis engine utilities
│   │       ├── whois.ts              # WHOIS integration
│   │       ├── ssl.ts                # SSL certificate analysis
│   │       ├── reputation.ts         # Reputation API integration
│   │       ├── scoring.ts            # Risk scoring algorithm
│   │       └── ai-analysis.ts        # AI content analysis
│   │
│   ├── types/                        # TypeScript type definitions
│   │   ├── analysis.ts               # Analysis result types
│   │   ├── api.ts                    # API request/response types
│   │   └── ui.ts                     # UI component prop types
│   │
│   └── hooks/                        # Custom React hooks
│       ├── use-analysis.ts           # URL analysis hook
│       └── use-debounce.ts           # Input debouncing hook
│
├── public/                           # Static assets
│   ├── images/                       # Image assets
│   ├── icons/                        # Icon assets
│   └── favicon.ico                   # Site favicon
│
├── tests/                            # Test files
│   ├── __mocks__/                    # Mock implementations
│   ├── unit/                         # Unit tests
│   │   ├── components/               # Component tests
│   │   ├── lib/                      # Utility function tests
│   │   └── api/                      # API route tests
│   ├── integration/                  # Integration tests
│   │   └── analysis-flow.test.ts     # End-to-end analysis tests
│   └── e2e/                         # End-to-end tests (Cypress)
│       └── analysis-workflow.cy.ts   # Complete user workflow tests
│
├── infrastructure/                   # Infrastructure as Code
│   ├── aws/                          # AWS-specific infrastructure
│   │   ├── lambda/                   # Lambda function configurations
│   │   ├── api-gateway/              # API Gateway configurations
│   │   └── cloudfront/               # CloudFront configurations
│   ├── terraform/                    # Terraform configurations (if used)
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   └── outputs.tf
│   └── scripts/                      # Deployment and utility scripts
│       ├── deploy.sh                 # Deployment script
│       └── local-setup.sh           # Local environment setup
│
└── docs/                            # Project documentation
    ├── prd/                          # Product requirements (sharded)
    ├── architecture/                 # Architecture documentation (sharded)  
    ├── epic-*.md                     # Epic documentation files
    └── stories/                      # User story files
```
