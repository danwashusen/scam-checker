# Deployment and Utility Scripts

## Purpose
Automation scripts for deployment, environment setup, and operational tasks. Provides consistent and repeatable processes for managing the application lifecycle.

## Organization
- **deploy.sh**: Main deployment script for different environments
- **local-setup.sh**: Local development environment setup
- Additional utility scripts for specific operational tasks

## Conventions
- **Error Handling**: Robust error handling with meaningful messages
- **Logging**: Clear logging of all operations and their results
- **Idempotent**: Scripts should be safe to run multiple times
- **Environment Aware**: Support for different environments (dev, staging, production)
- **Documentation**: Clear usage instructions and parameter descriptions

## Usage
Scripts automate common operations and are used in CI/CD pipelines and local development workflows.

## Examples
```bash
# deploy.sh
#!/bin/bash
set -e

ENVIRONMENT=${1:-dev}
echo "Deploying to environment: $ENVIRONMENT"

# Build the application
npm run build

# Deploy infrastructure
terraform apply -var-file="environments/$ENVIRONMENT.tfvars" -auto-approve

# Deploy application code
aws s3 sync dist/ s3://scam-checker-$ENVIRONMENT-frontend/

echo "Deployment to $ENVIRONMENT completed successfully"

# Usage
./deploy.sh production
```