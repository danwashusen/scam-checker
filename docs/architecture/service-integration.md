# Service Integration

## Service Abstraction Layer

The application implements a **provider-agnostic service architecture** enabling flexible integration with multiple external APIs through consistent interfaces:

### WhoisService (Direct Implementation)
- **Purpose:** Domain age analysis and WHOIS registration data
- **Implementation:** Node.js `whois` library v2.15.0 with direct protocol queries
- **Key Features:**
  - Domain age calculation with registration/expiration date parsing
  - Registrar information extraction
  - Error handling for inaccessible or malformed WHOIS records
  - Configurable timeout and retry logic
- **Performance:** Direct protocol queries, no external API dependencies
- **Caching:** 24-hour TTL for WHOIS records (minimal change frequency)

### ReputationService (Configurable Provider)
- **Purpose:** URL threat detection and reputation analysis
- **Current Provider:** Google Safe Browsing API v4
- **Implementation:** HTTP API integration with threat database lookup
- **Key Features:**
  - Multiple threat type detection (malware, phishing, unwanted software)
  - Bulk URL checking capabilities
  - Provider abstraction for future reputation service integration
- **Authentication:** API key-based authentication
- **Rate Limits:** 10,000 requests/day (free tier), scalable pricing available
- **Caching:** 30-minute TTL for reputation checks (balance security vs performance)

### AIService (Multi-Provider Support)
- **Purpose:** Intelligent domain and URL pattern analysis
- **Supported Providers:** OpenAI (GPT-4), Anthropic (Claude)
- **Implementation:** Provider-specific adapters with unified response format
- **Key Features:**
  - Configurable AI provider selection via environment variables
  - Advanced prompt management for URL risk assessment
  - Cost tracking and budget controls
  - Fallback strategies between providers
- **Analysis Capabilities:**
  - Domain name pattern recognition
  - URL structure analysis
  - Content risk assessment
  - Scam indicator identification
- **Cost Optimization:** 1-hour TTL caching, token usage monitoring
- **Rate Limiting:** Provider-specific limits with automatic backoff

### SSLService (Certificate Analysis)
- **Purpose:** SSL/TLS certificate validation and risk assessment
- **Implementation:** Node.js `tls` module with certificate chain analysis
- **Key Features:**
  - Certificate authority validation
  - Expiration date monitoring
  - Self-signed certificate detection
  - Certificate chain trust verification
- **Performance:** Direct TLS handshake, no external API dependencies
- **Caching:** 6-hour TTL for certificate data (balance security vs performance)

## Service Orchestration

### AnalysisOrchestrator
- **Coordination:** Manages parallel execution of all service calls
- **Timeout Management:** Individual service timeouts with overall request limits
- **Error Recovery:** Partial result aggregation when services fail
- **Performance Optimization:** Concurrent service execution reduces total response time
- **Observability:** Service-level performance metrics and error tracking
