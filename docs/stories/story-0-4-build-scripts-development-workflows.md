# Story 0-4: Build Scripts & Development Workflows

## User Story

As a **developer**,
I want **comprehensive build scripts and development workflows in package.json**,
So that **I can efficiently develop, test, build, and run the application locally with simple commands**.

## Story Context

**System Integration:**
- Integrates with: Next.js frontend, serverless backend, testing frameworks
- Technology: npm scripts, Next.js build system, serverless local development
- Follows pattern: Standard Node.js project workflow conventions
- Touch points: Development environment, CI/CD pipeline, local testing

## Acceptance Criteria

**Functional Requirements:**

1. **Development Scripts**: Create scripts for efficient local development
   - `npm run dev` - Start local development server with hot reload
   - `npm run dev:full` - Start both frontend and local serverless backend
   - `npm run dev:backend` - Start only local serverless functions
   - `npm run dev:db` - Start local database/cache services (if needed)

2. **Build and Production Scripts**: Scripts for building and production testing
   - `npm run build` - Build optimized production version
   - `npm run build:analyze` - Build with bundle analysis
   - `npm run start` - Start production build locally
   - `npm run export` - Generate static export (if supported)

3. **Testing Scripts**: Comprehensive testing workflow commands
   - `npm run test` - Run unit tests with watch mode
   - `npm run test:ci` - Run all tests for CI (no watch mode)
   - `npm run test:unit` - Run only unit tests
   - `npm run test:integration` - Run integration tests
   - `npm run test:e2e` - Run end-to-end tests
   - `npm run test:coverage` - Generate test coverage report

**Integration Requirements:**

4. Scripts work seamlessly with Next.js development server
5. Local serverless development integrates with frontend
6. Testing scripts support multiple testing frameworks
7. Build scripts optimize for both development and production

**Quality Requirements:**

8. Development server starts in under 10 seconds
9. Build process completes in under 2 minutes
10. Test execution provides clear feedback and reporting
11. Scripts include proper error handling and informative output

## Technical Notes

- **Next.js Integration**: Leverage Next.js built-in development and build commands
- **Serverless Local**: Use AWS SAM Local, Serverless Offline, or similar
- **Parallel Execution**: Use npm-run-all for concurrent script execution
- **Environment Management**: Scripts handle different environment configurations
- **Cross-Platform**: Ensure scripts work on Windows, macOS, and Linux

## Definition of Done

- [ ] Development scripts enable efficient local development workflow
- [ ] Build and production scripts create optimized application builds
- [ ] Testing scripts support comprehensive testing strategy
- [ ] Scripts integrate seamlessly with Next.js and serverless frameworks
- [ ] Environment configuration properly managed across different scripts
- [ ] Error handling provides clear feedback for script failures
- [ ] Performance meets timing requirements for development efficiency
- [ ] Cross-platform compatibility validated
- [ ] Documentation explains script usage and workflows
- [ ] Integration with CI/CD pipeline validated

## Risk Mitigation

- **Primary Risk**: Complex script dependencies creating unreliable development environment
- **Mitigation**: Simple, focused scripts with clear dependencies and error handling
- **Rollback**: Basic Next.js scripts as fallback for development

## Testing Requirements

- Test all scripts on different operating systems
- Validate script execution with clean npm install
- Test concurrent script execution (dev:full)
- Test script error handling and recovery
- Validate integration with CI/CD environment
- Performance testing for build and test execution times

## Package.json Scripts Configuration

```json
{
  "name": "scam-checker",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    // Development Scripts
    "dev": "next dev",
    "dev:debug": "NODE_OPTIONS='--inspect' next dev",
    "dev:full": "npm-run-all --parallel dev dev:backend",
    "dev:backend": "serverless offline --stage local",
    "dev:functions": "sam local start-api --port 3001",
    
    // Build Scripts  
    "build": "next build",
    "build:analyze": "ANALYZE=true next build",
    "build:standalone": "next build && next export",
    "build:functions": "serverless package --stage production",
    
    // Production Scripts
    "start": "next start",
    "start:prod": "NODE_ENV=production next start",
    "preview": "npm run build && npm run start",
    
    // Testing Scripts
    "test": "jest --watch",
    "test:ci": "jest --ci --coverage --watchAll=false",
    "test:unit": "jest --testPathPattern=unit",
    "test:integration": "jest --testPathPattern=integration",
    "test:e2e": "cypress run",
    "test:e2e:open": "cypress open",
    "test:coverage": "jest --coverage --watchAll=false",
    
    // Code Quality Scripts
    "lint": "next lint",
    "lint:fix": "next lint --fix",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "typecheck": "tsc --noEmit",
    
    // Database/Infrastructure Scripts (if needed)
    "db:migrate": "prisma migrate dev",
    "db:seed": "prisma db seed",
    "db:studio": "prisma studio",
    
    // Deployment Scripts
    "deploy:dev": "serverless deploy --stage development",
    "deploy:staging": "serverless deploy --stage staging", 
    "deploy:prod": "serverless deploy --stage production",
    "deploy:functions": "serverless deploy function --stage production",
    
    // Utility Scripts
    "clean": "rm -rf .next node_modules/.cache dist",
    "clean:install": "npm run clean && rm -rf node_modules && npm install",
    "setup": "npm install && npm run build",
    "postinstall": "prisma generate",
    
    // Analysis Scripts
    "analyze": "npm run build:analyze",
    "bundle:analyze": "@next/bundle-analyzer",
    "size": "size-limit",
    
    // Security Scripts
    "audit": "npm audit",
    "audit:fix": "npm audit fix",
    "security": "npm run audit && npm run lint:security",
    "lint:security": "eslint . --ext .ts,.tsx --config .eslintrc.security.js"
  }
}
```

## Development Workflow Examples

**Daily Development:**
```bash
# Start full development environment
npm run dev:full

# Run tests in watch mode (separate terminal)
npm run test

# Format code before commit
npm run format
```

**Pre-commit Workflow:**
```bash
# Check code quality
npm run lint
npm run typecheck
npm run format:check

# Run full test suite
npm run test:ci

# Test production build
npm run build
```

**Local Testing Workflow:**
```bash
# Test specific areas
npm run test:unit
npm run test:integration  
npm run test:e2e

# Generate coverage report
npm run test:coverage
```

## Environment-Specific Configurations

**Development Environment:**
- Hot reload enabled
- Debug logging active
- Local API endpoints
- Mock external services
- Fast build optimizations

**Production Environment:**
- Full optimizations enabled
- Production API endpoints
- Error tracking configured  
- Performance monitoring active
- Security headers enabled

## Concurrent Script Execution

Using `npm-run-all` for parallel execution:

```json
{
  "scripts": {
    "dev:full": "npm-run-all --parallel dev dev:backend",
    "test:all": "npm-run-all test:unit test:integration test:e2e",
    "quality": "npm-run-all lint typecheck format:check",
    "build:all": "npm-run-all build build:functions"
  }
}
```

## Performance Optimizations

- **Development**: Fast refresh, incremental compilation
- **Testing**: Parallel test execution, smart test selection
- **Building**: Incremental builds, caching strategies
- **Deployment**: Optimized bundle sizes, efficient uploads