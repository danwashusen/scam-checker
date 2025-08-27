# AWS Infrastructure

## Purpose
AWS-specific infrastructure configurations for serverless deployment of the scam checker application. Manages Lambda functions, API Gateway, CloudFront, and supporting services.

## Organization
- **lambda/**: AWS Lambda function configurations and deployment packages
- **api-gateway/**: API Gateway configuration and routing rules
- **cloudfront/**: CloudFront distribution configuration for frontend

## Conventions
- **Serverless Architecture**: Use AWS Lambda for compute, API Gateway for routing
- **IAM Roles**: Least privilege principle for all service roles
- **Environment Variables**: Use Parameter Store or Secrets Manager for configuration
- **Monitoring**: CloudWatch logging and monitoring for all components
- **Cost Optimization**: Right-sizing and efficient resource usage

## Usage
AWS infrastructure is deployed using Infrastructure as Code tools and managed through CI/CD pipelines.

## Examples
```yaml
# Example Lambda function configuration
Functions:
  AnalyzeUrl:
    Handler: src/handlers/analyze.handler
    Runtime: nodejs22.x
    Environment:
      Variables:
        NODE_ENV: production
    Events:
      - http:
          path: /api/analyze
          method: post
```