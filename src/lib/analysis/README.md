# Analysis Engine Utilities

## Purpose
Core analysis engine components that handle URL analysis, risk scoring, and external API integrations. These utilities power the main functionality of the scam checker.

## Organization
- **whois.ts**: WHOIS domain information lookup
- **ssl.ts**: SSL certificate analysis and validation
- **reputation.ts**: Reputation API integrations (VirusTotal, etc.)
- **scoring.ts**: Multi-factor risk scoring algorithm
- **ai-analysis.ts**: AI-powered content analysis

## Conventions
- **Async Operations**: All analysis functions return Promises
- **Error Resilience**: Graceful degradation when services are unavailable
- **Rate Limiting**: Respect external API rate limits
- **Caching**: Cache results to improve performance
- **Composability**: Functions can be used independently or together

## Usage
These utilities are called by API routes and hooks to perform URL analysis. They integrate with external services and combine results into comprehensive risk assessments.

## Examples
```typescript
// analysis/scoring.ts
import { analyzeWhois } from './whois'
import { analyzeSsl } from './ssl'
import { checkReputation } from './reputation'

export interface AnalysisResult {
  url: string
  riskScore: number
  factors: RiskFactor[]
  explanation: string
}

export async function analyzeUrl(url: string): Promise<AnalysisResult> {
  const [whoisData, sslData, reputationData] = await Promise.allSettled([
    analyzeWhois(url),
    analyzeSsl(url),
    checkReputation(url)
  ])
  
  return calculateRiskScore(url, whoisData, sslData, reputationData)
}
```