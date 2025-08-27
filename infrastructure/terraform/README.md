# Terraform Configuration

## Purpose
Terraform Infrastructure as Code configurations for managing AWS resources. Provides declarative infrastructure management with state tracking and version control.

## Organization
- **main.tf**: Main Terraform configuration with resource definitions
- **variables.tf**: Input variables and their descriptions
- **outputs.tf**: Output values for use by other systems or modules

## Conventions
- **Modular Design**: Use Terraform modules for reusable components
- **State Management**: Remote state storage in S3 with DynamoDB locking
- **Environment Files**: Separate .tfvars files for each environment
- **Validation**: Use terraform validate and plan before apply
- **Documentation**: Clear variable descriptions and resource comments

## Usage
Terraform manages the complete AWS infrastructure lifecycle through declarative configuration files.

## Examples
```hcl
# main.tf
resource "aws_lambda_function" "analyze_url" {
  filename         = "analyze-url.zip"
  function_name    = "scam-checker-analyze-url"
  role            = aws_iam_role.lambda_exec.arn
  handler         = "index.handler"
  runtime         = "nodejs22.x"
  
  environment {
    variables = {
      NODE_ENV = var.environment
    }
  }
}

# variables.tf
variable "environment" {
  description = "Environment name (dev, staging, production)"
  type        = string
  default     = "dev"
}
```