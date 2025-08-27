# Development Workflow

## Local Development Setup

### Prerequisites
```bash
node --version  # v22.x required
npm --version   # v10.x or higher
aws --version   # AWS CLI v2
terraform --version  # v1.6.x
```

### Development Commands
```bash
# Start all services (frontend + mock API)
npm run dev

# Run tests
npm run test          # All tests
npm run test:unit     # Unit tests only
npm run test:e2e      # E2E tests

# Build commands
npm run build         # Build frontend
npm run build:lambda  # Build Lambda functions
```
