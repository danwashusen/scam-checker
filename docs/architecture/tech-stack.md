# Tech Stack

| Category | Technology | Version | Purpose | Rationale |
|----------|------------|---------|---------|-----------|
| **Frontend Language** | TypeScript | 5.x | Type-safe frontend development | Prevents runtime errors, enhances developer experience |
| **Frontend Framework** | Next.js | 15.x | React-based fullstack framework | Latest features, improved performance, enhanced DX |
| **UI Component Library** | shadcn/ui | 2.x | Pre-built accessible components | Consistent design system, accessibility built-in, latest patterns |
| **Icon Library** | Lucide React | Latest | SVG icon system | Lightweight, customizable, perfect shadcn/ui integration |
| **State Management** | Zustand | 4.x | Lightweight state management | Simple API, perfect for dual-layer UI state |
| **Backend Language** | TypeScript | 5.x | Serverless function development | Shared types with frontend, familiar syntax |
| **Backend Framework** | AWS Lambda | Node.js 22.x | Serverless compute functions | Latest Node.js features, improved performance, AWS support |
| **API Style** | REST | OpenAPI 3.0 | HTTP-based API design | Simple, well-understood, excellent tooling |
| **Cache Interface** | NoOp (Pass-through) | Custom | Initial no-op caching with DynamoDB future | Start simple, add DynamoDB caching when cost-justified |
| **File Storage** | AWS S3 | Latest | Static assets and builds | Integrated with CloudFront, cost-effective |
| **Authentication** | AWS Cognito | Latest | User management (future) | Native AWS integration, JWT tokens |
| **Frontend Testing** | Jest + RTL | 29.x/14.x | Unit and integration testing | Standard React testing, great DX |
| **Backend Testing** | Jest + Supertest | 29.x/6.x | API testing | Node.js standard, AWS Lambda compatible |
| **E2E Testing** | Playwright | 1.x | End-to-end browser testing | Cross-browser, reliable, excellent reporting |
| **Build Tool** | Vite | 5.x | Fast development builds | Lightning fast HMR, optimized for TypeScript |
| **Bundler** | Next.js built-in | 15.x | Production bundling | Latest optimizations, automatic splitting |
| **IaC Tool** | Terraform | 1.6.x | Infrastructure provisioning | Version control, state management, AWS native |
| **CI/CD** | GitHub Actions | Latest | Automated deployment | Free for public repos, Terraform integration |
| **Monitoring** | CloudWatch | Latest | Logging and metrics | Native AWS integration, Lambda insights |
| **Logging** | AWS X-Ray | Latest | Distributed tracing | Track requests across Lambda functions |
| **CSS Framework** | Tailwind CSS | 3.x | Utility-first styling | Rapid development, consistent design tokens |
