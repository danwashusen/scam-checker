# Story 2-4: Explanation Generation System

## User Story

As a **user communication system**,
I want **to generate clear, user-appropriate explanations for risk assessments**,
So that **both technical and non-technical users understand why a site received its risk rating and what actions to take**.

## Story Context

**System Integration:**
- Integrates with: All risk assessment components and categorization system
- Technology: Template-based explanation engine with dynamic content generation
- Follows pattern: User persona-aware content generation
- Touch points: User interface, risk categorization, technical analysis data

## Acceptance Criteria

**Functional Requirements:**

1. **Dual-Audience Explanations**: Generate appropriate content for different user types
   - **Simple View**: Plain language explanations for general users
   - **Technical View**: Detailed analysis data for tech-savvy users
   - Automatic audience detection based on user preferences or behavior
   - Toggle capability between explanation levels

2. **Dynamic Content Generation**: Create contextual explanations based on analysis results
   - Risk factor prioritization (highlight primary concerns first)
   - Specific finding explanations (domain age, SSL issues, reputation problems)
   - Actionable recommendations tailored to risk level
   - Uncertainty acknowledgment when analysis is incomplete

3. **Explanation Templates**: Structured explanation system with consistent messaging
   - Risk category templates (Green/Yellow/Red explanations)
   - Factor-specific explanation modules (domain, SSL, reputation, content)
   - Combination logic for multiple risk factors
   - Customizable messaging for different deployment contexts

**Integration Requirements:**

4. Receives analysis data from all risk assessment components
5. Provides formatted explanations to user interface components
6. Supports explanation caching for consistent user experience
7. Integrates with accessibility features for screen readers

**Quality Requirements:**

8. Explanation generation completes in under 50ms
9. Content remains accurate and up-to-date with analysis methods
10. Explanations tested for clarity with target user groups
11. Template system enables rapid explanation updates

## Technical Notes

- **Template Engine**: Structured templates with variable substitution
- **User Detection**: Simple/Technical view preference with smart defaults
- **Content Strategy**: Progressive disclosure from simple to detailed information
- **Localization**: Template structure supports future multi-language expansion
- **Accessibility**: ARIA labels and screen reader compatibility

## Definition of Done

- [ ] Dual-audience explanation system generates appropriate content for user types
- [ ] Dynamic content generation creates contextual explanations based on findings
- [ ] Template system enables consistent and updatable explanation messaging
- [ ] Integration with all risk assessment components completed
- [ ] Explanation caching improves user experience consistency
- [ ] User interface displays explanations with appropriate formatting
- [ ] Unit tests cover explanation logic and template rendering
- [ ] User testing validates explanation clarity for both audiences
- [ ] Accessibility features support assistive technologies
- [ ] Documentation enables explanation template maintenance

## Risk Mitigation

- **Primary Risk**: Explanations that confuse users or provide inaccurate guidance
- **Mitigation**: User testing with both audiences, expert review of explanation content
- **Rollback**: Simple static explanations as fallback for complex cases

## Testing Requirements

- Test explanation accuracy with various risk scenarios
- Test user comprehension with both technical and non-technical audiences
- Test explanation consistency across repeated analyses
- Test template rendering with different data combinations
- Test explanation accessibility with screen readers
- Test explanation performance under load
- Validate explanation updates reflect analysis method changes

## Explanation Framework

**Simple View Examples:**

*Green (Safe):*
"✅ This site appears safe. We found no significant security concerns in our analysis."

*Yellow (Caution):*
"⚠️ Exercise caution with this site. We found some potential concerns:
- The domain is relatively new (registered 25 days ago)
- Limited reputation data available
We recommend being careful with personal information."

*Red (Danger):*
"🚨 High risk detected! We strongly recommend avoiding this site:
- Multiple security vendors have flagged this domain
- The site mimics a legitimate banking website
- SSL certificate issues detected
Do not enter personal or financial information."

**Technical View Examples:**

*Detailed Analysis:*
"Risk Score: 73/100 (High Risk)

Contributing Factors:
• Domain Analysis (25% weight): 85/100
  - Registered: 15 days ago (High risk threshold: <30 days)
  - Registrar: Unknown/unverified registrar
• SSL Certificate (20% weight): 45/100
  - Valid certificate from trusted CA
  - Domain validation only (not extended validation)
• Reputation Analysis (40% weight): 90/100
  - Flagged by 5/10 security vendors
  - Recent addition to phishing blacklists
• Content Analysis (15% weight): 70/100
  - Suspicious language patterns detected
  - Impersonation indicators present

Confidence Level: High (4/5) - Sufficient data for reliable assessment"

## Template Structure

**Base Template:**
```
Risk Level: {risk_category} ({score}/100)
Primary Message: {category_message}

{if simple_view}
  {simple_explanation}
{else}
  {technical_breakdown}
{endif}

Recommendations:
{recommendation_list}

{if uncertainty_present}
  Analysis Limitations: {uncertainty_explanation}
{endif}
```

**Factor-Specific Modules:**
- Domain Age Module
- SSL Certificate Module  
- Reputation Module
- Content Analysis Module
- Uncertainty/Confidence Module

## User Experience Requirements

- Explanations load instantly with risk assessment
- Technical details expandable/collapsible on demand
- Visual hierarchy guides user attention to key information
- Color coding consistent with risk levels
- Mobile-friendly formatting for all explanation lengths