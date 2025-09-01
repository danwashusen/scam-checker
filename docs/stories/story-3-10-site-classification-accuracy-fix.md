# Story 3-10: Site Classification Accuracy Fix

## Status
Draft

## User Story

**As a** user relying on scam detection results,
**I want** trusted websites to be accurately classified as safe and malicious sites to be properly flagged,
**so that** I can trust the application's assessments and avoid false positives that undermine credibility.

## Acceptance Criteria

1. **Trusted Site Whitelist Implementation**: Ensure well-known safe sites are properly classified
   - Wikipedia.org, Google.com, GitHub.com, and similar trusted domains receive high safety scores (80+)
   - Implement domain reputation checking against known safe site databases
   - Override suspicious signals for verified trusted domains when appropriate
   - Maintain whitelist of established, reputable domains

2. **Malicious Site Detection Accuracy**: Properly identify and flag dangerous sites
   - Known phishing/scam test domains receive low safety scores (below 30)
   - Integrate with reliable threat intelligence sources
   - Implement proper indicators of compromise (IoC) checking
   - Flag newly registered domains with suspicious characteristics

3. **False Positive Prevention**: Implement safeguards against incorrect classifications
   - Domain age verification (older, established sites get reputation boost)
   - SSL certificate validation from trusted authorities
   - Cross-reference with multiple reputation sources
   - Confidence scoring to indicate assessment reliability

4. **Classification Logic Validation**: Ensure scoring factors work correctly
   - Domain registration age contributes positively to safety score
   - Valid SSL certificates from trusted CAs increase safety score
   - Clean reputation history across threat databases increases score
   - Suspicious patterns (typosquatting, suspicious TLD, etc.) decrease score

5. **Real-World Testing**: Validate with actual test cases
   - Test suite includes 10+ verified safe domains (major companies, institutions)
   - Test suite includes 5+ known malicious/test domains
   - Document expected score ranges for each test case
   - Automated regression testing to prevent future false positives

## Tasks / Subtasks

- [ ] **Analyze Current Classification Logic** (AC: 1, 4)
  - [ ] Review existing domain scoring algorithms
  - [ ] Identify why trusted sites are getting false positive results
  - [ ] Map out all factors contributing to final safety score
  - [ ] Document current scoring weights and thresholds

- [ ] **Implement Trusted Domain Handling** (AC: 1)
  - [ ] Create whitelist of verified safe domains (Wikipedia, Google, GitHub, etc.)
  - [ ] Add domain reputation database integration
  - [ ] Implement override logic for whitelisted domains
  - [ ] Add domain age verification with positive scoring

- [ ] **Fix SSL Certificate Scoring** (AC: 3, 4)
  - [ ] Validate SSL certificate chain and authority trust
  - [ ] Fix scoring logic for Let's Encrypt and other valid CAs
  - [ ] Implement proper certificate age and validity scoring
  - [ ] Address any SSL false positive triggers

- [ ] **Enhance Threat Detection** (AC: 2, 4)
  - [ ] Integrate with reliable threat intelligence APIs
  - [ ] Implement proper malicious domain flagging
  - [ ] Add typosquatting and suspicious TLD detection
  - [ ] Create confidence scoring for detection accuracy

- [ ] **Build Comprehensive Test Suite** (AC: 5)
  - [ ] Create test cases for verified safe sites (Wikipedia, Google, GitHub, etc.)
  - [ ] Add test cases for known malicious/test domains
  - [ ] Implement automated regression testing
  - [ ] Document expected score ranges and rationale

- [ ] **Implement Scoring Transparency** (AC: 3, 4)
  - [ ] Add confidence indicators to results
  - [ ] Provide breakdown of scoring factors
  - [ ] Implement "unknown" status for insufficient data
  - [ ] Add reasoning explanations for classifications

## Dev Notes

### Critical Context
This is a **BLOCKER** issue that creates dangerous false positives. Users cannot trust an application that flags Wikipedia as dangerous while potentially missing actual threats. This undermines the entire value proposition of the scam checker.

### Current Problematic Behavior
- Wikipedia.org flagged as "DANGER" despite being universally trusted
- Legitimate sites with Let's Encrypt certificates potentially penalized
- Overly aggressive scoring penalizes established, safe websites
- Lack of domain reputation cross-referencing

### Root Cause Analysis Required
- Why is domain age not contributing positively to safety?
- Are valid SSL certificates being properly recognized?
- Is the scoring algorithm too conservative/aggressive?
- Are there missing reputation data sources?

### Classification Accuracy Requirements
- **High-confidence safe sites**: Score 80+ (Wikipedia, Google, major universities)
- **Medium-confidence sites**: Score 40-79 (smaller but legitimate businesses)  
- **Low-confidence/unknown**: Score 30-50 (new sites with limited data)
- **Suspicious sites**: Score 10-30 (suspicious patterns but not confirmed malicious)
- **Confirmed malicious**: Score 0-10 (verified threats)

### Relevant Source Tree
- **Scoring algorithms**: Backend API scoring logic and weight calculations
- **Domain reputation**: Integration with threat intelligence APIs
- **SSL validation**: Certificate checking and trust chain validation
- **Database**: Domain whitelist/blacklist storage and caching
- **API responses**: Score calculation and reasoning data

### Testing Standards
- **Test file location**: `tests/unit/api/` and `tests/integration/analysis/`
- **Test frameworks**: Jest for unit tests, custom integration test suite
- **Required tests**: Domain classification, SSL scoring, reputation checking
- **Test data**: Curated list of safe/suspicious/malicious domains
- **Performance tests**: Classification speed and accuracy metrics

### Integration Requirements
- Must work with existing multi-factor scoring system (Story 2-1)
- Integrates with SSL certificate analysis (Story 1-3) 
- Coordinates with reputation API integration (Story 1-4)
- Feeds into risk categorization thresholds (Story 2-3)

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|---------|
| 2025-09-01 | 1.0 | Initial story creation based on design review findings | Bob (Scrum Master) |

## Dev Agent Record

*This section will be populated by the development agent during implementation*

## QA Results

*This section will be populated by the QA agent after review*