# Infrastructure as Code

## Purpose
Infrastructure configuration and deployment automation for the scam checker application. Manages AWS resources, deployment pipelines, and operational scripts.

## Organization
- **aws/**: AWS-specific infrastructure configurations
- **terraform/**: Infrastructure as Code using Terraform (if used)
- **scripts/**: Deployment and utility scripts

## Conventions
- **Version Control**: All infrastructure is version controlled
- **Environment Separation**: Separate configurations for dev, staging, production
- **Naming**: Consistent resource naming conventions
- **Documentation**: Clear documentation for all infrastructure components
- **Security**: Follow AWS security best practices

## Usage
Infrastructure components are deployed through automated processes and maintained as code to ensure consistency and repeatability.

## Examples
```bash
# Deploy infrastructure
./scripts/deploy.sh production

# Set up local development environment
./scripts/local-setup.sh

# Validate Terraform configuration
terraform plan -var-file=environments/production.tfvars
```