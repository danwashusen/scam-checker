# External APIs

## Node.js WHOIS Library

- **Purpose:** Domain age analysis and registration information via direct WHOIS queries
- **Documentation:** https://www.npmjs.com/package/whois
- **Implementation:** Server-side Node.js library in Lambda functions
- **Authentication:** None required (direct WHOIS protocol queries)
- **Rate Limits:** No external API limits, only WHOIS server rate limiting

## Google Safe Browsing API

- **Purpose:** URL reputation and threat detection (malware, phishing, unwanted software)
- **Documentation:** https://developers.google.com/safe-browsing/v4/
- **Base URL(s):** `https://safebrowsing.googleapis.com/v4/`
- **Authentication:** API key as parameter (`key={api_key}`)
- **Rate Limits:** 10,000 requests/day (free), higher limits available

## OpenAI/Claude API

- **Purpose:** Comprehensive AI analysis of domain and website characteristics
- **Documentation:** https://platform.openai.com/docs or https://docs.anthropic.com/
- **Base URL(s):** `https://api.openai.com/v1/` or `https://api.anthropic.com/v1/`
- **Authentication:** Bearer token (`Authorization: Bearer {token}`)
- **Rate Limits:** Varies by tier and model
