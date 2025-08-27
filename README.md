# Scam Checker

A comprehensive URL analysis tool that helps users identify potentially malicious websites through multi-factor risk assessment.

## Overview

Scam Checker analyzes URLs using multiple data sources including WHOIS information, SSL certificate validation, reputation databases, and AI-powered content analysis to provide comprehensive risk assessments with clear explanations.

## Features

- **Multi-Factor Analysis**: Combines WHOIS, SSL, reputation, and content analysis
- **Risk Scoring**: Clear risk levels (Low, Medium, High) with detailed explanations
- **Real-Time Results**: Fast analysis with caching for improved performance
- **User-Friendly Interface**: Clean, responsive design built with Next.js and shadcn/ui
- **Technical Details**: In-depth technical information for advanced users

## Tech Stack

- **Frontend**: Next.js 15, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: AWS Lambda (Node.js 22.x), API Gateway
- **Infrastructure**: AWS (S3, CloudFront), Terraform
- **Testing**: Jest, React Testing Library, Playwright
- **Development**: TypeScript, ESLint, Prettier

## Project Structure

```
scam-checker/
├── src/                    # Application source code
│   ├── app/               # Next.js App Router (pages, layouts, API routes)
│   ├── components/        # React components (UI, analysis, layout)
│   ├── lib/              # Utilities and analysis engine
│   ├── types/            # TypeScript type definitions
│   └── hooks/            # Custom React hooks
├── tests/                # Testing suite
│   ├── unit/             # Unit tests
│   ├── integration/      # Integration tests
│   └── e2e/              # End-to-end tests
├── infrastructure/       # Infrastructure as Code
│   ├── aws/              # AWS configurations
│   ├── terraform/        # Terraform configurations
│   └── scripts/          # Deployment scripts
├── public/               # Static assets
└── docs/                 # Project documentation
```

## Getting Started

### Prerequisites

- Node.js 22.x or later
- npm or yarn package manager
- AWS CLI (for deployment)

### Development Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd scam-checker
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your API keys and configuration
   ```

4. **Run development server**
   ```bash
   npm run dev
   ```

5. **Open the application**
   Navigate to [http://localhost:3000](http://localhost:3000)

### Testing

```bash
# Run all tests
npm test

# Run unit tests
npm run test:unit

# Run integration tests
npm run test:integration

# Run e2e tests
npm run test:e2e

# Generate coverage report
npm run test:coverage
```

### Building

```bash
# Build for production
npm run build

# Start production server
npm start
```

## API Documentation

### Analyze URL Endpoint

**POST** `/api/analyze`

**Request Body:**
```json
{
  "url": "https://example.com"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "url": "https://example.com",
    "riskScore": 0.2,
    "riskLevel": "low",
    "factors": [
      {
        "type": "whois",
        "score": 0.1,
        "description": "Domain registered recently"
      }
    ],
    "explanation": "This URL appears to be safe based on our analysis.",
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
}
```

## Deployment

### AWS Serverless Deployment

1. **Configure AWS credentials**
   ```bash
   aws configure
   ```

2. **Deploy infrastructure**
   ```bash
   cd infrastructure
   ./scripts/deploy.sh production
   ```

3. **Verify deployment**
   Check the deployed application URL in the AWS Console or Terraform outputs.

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Security

For security concerns, please email security@example.com instead of using the issue tracker.

## Support

- Documentation: See the `/docs` directory
- Issues: Use GitHub Issues for bug reports and feature requests
- Questions: Start a GitHub Discussion