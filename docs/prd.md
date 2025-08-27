Scam Checker Web App (Final)

  One-Liner Description

  A web application that analyzes URLs for scam indicators using domain age, SSL quality, public APIs, and AI
  content analysis to generate a safety score.

  Target Users

  Primary Users: General Consumers (Non-Tech-Savvy)
  - Need simple, clear risk indicators without technical jargon
  - Want easy-to-understand explanations of potential threats
  - Require intuitive, minimal-friction experience
  - Expect immediate, actionable recommendations (safe/caution/danger)

  Secondary Users: Tech-Savvy Users & Developers
  - Want detailed technical analysis and raw data
  - Need API access for integration into their own tools
  - Desire deeper insights into detection methodology
  - Appreciate expandable technical details and diagnostic information

  Core Features (Phase 1 - MVP)

  1. URL Input & Analysis - Clean, simple form to submit URLs for checking
  2. Dual-Layer Risk Display:
     - Simple View: Clear 0-100 score with color-coded risk levels (Green/Yellow/Red)
     - Technical View: Expandable detailed breakdown for tech-savvy users
  3. Multi-Factor Scoring - Combine domain age, SSL cert quality, and reputation data
  4. AI Content Analysis - Use AI to evaluate page content for scam patterns
  5. User-Appropriate Explanations:
     - Plain language warnings and recommendations for general users
     - Technical details and raw data available on-demand
  6. REST API Endpoint - /api/analyze endpoint for programmatic access by developers

  Future Features (Phase 2)

  - URL history tracking (browser local storage)
  - Bulk URL checking
  - Community reporting

  Tech Stack Decision

  - Frontend:
    - Next.js (already initialized)
    - Tailwind CSS for utility styling
    - shadcn/ui for components and blocks with MCP server available for enhanced detail
    - Lucide for icons
  - Backend: Next.js API routes for analysis endpoints
  - External APIs:
    - Node.js WHOIS library for domain age
    - SSL Labs or similar for cert checking
    - Google Safe Browsing API for reputation
    - OpenAI/Claude API for content analysis
  - Caching: In-memory cache for API results (no database)
  - Testing: Jest for unit and integration tests
  - Deployment: The app will be deployed on AWS using servlerless tech

  Basic User Flow

  1. User enters suspicious URL (via web or API)
  2. System performs multi-point analysis
  3. Display/return risk score with visual indicators
  4. Show detailed breakdown of findings
  5. Provide recommendations (safe/caution/danger)