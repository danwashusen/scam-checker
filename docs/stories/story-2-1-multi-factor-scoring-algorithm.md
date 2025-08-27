# Story 2-1: Multi-Factor Scoring Algorithm

## User Story

As a **risk assessment engine**,
I want **a sophisticated scoring algorithm that combines domain, SSL, and reputation data with appropriate weighting**,
So that **I can generate accurate 0-100 risk scores that reflect the true likelihood of a URL being malicious**.

## Story Context

**System Integration:**
- Integrates with: All Epic 1 analysis components (WHOIS, SSL, reputation)
- Technology: TypeScript scoring algorithms, configurable weighting system
- Follows pattern: Weighted aggregation with normalization
- Touch points: AI content analysis, risk categorization, user explanations

## Acceptance Criteria

**Functional Requirements:**

1. **Weighted Scoring System**: Implement configurable multi-factor scoring
   - Domain age scoring: 25% weight (newer domains = higher risk)
   - SSL certificate quality: 20% weight (poor SSL = higher risk)
   - Reputation analysis: 40% weight (threat intelligence primary factor)
   - Technical indicators: 15% weight (suspicious patterns)

2. **Score Normalization**: Ensure consistent 0-100 scoring across factors
   - Individual factor scores normalized to 0-100 range
   - Weighted combination produces final 0-100 score
   - Missing data handling with confidence adjustment
   - Score stability under different data availability scenarios

3. **Configurable Algorithm**: Allow scoring parameter adjustment
   - Adjustable weights for different risk factors
   - Threshold configuration for risk categories
   - A/B testing support for algorithm improvements
   - Historical scoring comparison and validation

**Integration Requirements:**

4. Receives analysis data from all Epic 1 components
5. Provides structured scoring output to categorization system
6. Supports partial data scenarios with confidence indicators
7. Logging enables scoring decision audit and improvement

**Quality Requirements:**

8. Scoring algorithm processes results in under 100ms
9. Score consistency maintained across repeated analyses
10. Algorithm handles edge cases and missing data gracefully
11. Comprehensive testing with known legitimate and malicious URLs

## Technical Notes

- **Scoring Framework**: Weighted average with confidence adjustments
- **Factor Weights**: Reputation (40%), Domain Age (25%), SSL (20%), Technical (15%)
- **Normalization**: Z-score normalization with configurable parameters
- **Missing Data**: Proportional weight redistribution to available factors
- **Validation**: Continuous comparison against labeled dataset

## Definition of Done

- [ ] Multi-factor scoring algorithm implemented with configurable weights
- [ ] Score normalization ensures consistent 0-100 output range
- [ ] Configuration system allows weight and threshold adjustments
- [ ] Integration with all Epic 1 analysis components completed
- [ ] Missing data scenarios handled with confidence scoring
- [ ] Algorithm performance meets sub-100ms processing requirements
- [ ] Unit tests cover all scoring scenarios and edge cases
- [ ] Validation tests using known good/bad URLs demonstrate accuracy
- [ ] Configuration documentation and tuning guide created
- [ ] Scoring audit trail enables decision transparency

## Risk Mitigation

- **Primary Risk**: Scoring algorithm producing inaccurate or biased results
- **Mitigation**: Comprehensive testing with diverse URL dataset and continuous validation
- **Rollback**: Simple rule-based scoring as emergency fallback

## Testing Requirements

- Test with known legitimate websites (should score 0-30)
- Test with confirmed scam/phishing sites (should score 70-100)
- Test with edge cases and missing data scenarios
- Test scoring consistency across repeated analyses
- Test configuration changes and weight adjustments
- Performance testing for scoring algorithm speed
- Validation testing against labeled threat intelligence dataset

## Scoring Factor Details

**Domain Age (25% weight):**
- 0-30 days: High risk (70-100 score)
- 31-90 days: Medium risk (40-70 score)
- 90+ days: Lower risk (0-40 score)
- Missing data: Use average risk (50 score)

**SSL Certificate (20% weight):**
- No SSL/invalid: High risk (80-100 score)
- Self-signed/weak: Medium risk (50-80 score)
- Valid DV certificate: Low-medium risk (20-50 score)
- EV certificate: Low risk (0-20 score)

**Reputation Analysis (40% weight):**
- Multiple blacklists: High risk (80-100 score)
- Single blacklist: Medium-high risk (60-80 score)
- Mixed reputation: Medium risk (30-60 score)
- Clean reputation: Low risk (0-30 score)

**Technical Indicators (15% weight):**
- Suspicious URL patterns
- Hosting provider reputation
- Domain registration patterns
- Content delivery indicators

## Algorithm Validation

- Minimum 90% accuracy on known scam URLs
- Maximum 10% false positive rate on legitimate URLs
- Consistent scoring within ±5 points on repeated analysis
- Performance under 100ms for score calculation