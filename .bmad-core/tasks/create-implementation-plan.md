<!-- Powered by BMAD™ Core -->

# Create Implementation Plan Task

## Purpose

Generate an extremely detailed, prescriptive implementation plan that enables less advanced models to execute story development without making complex architectural decisions. This task leverages models with superior reasoning capabilities to create comprehensive technical guidance.

## CRITICAL Prerequisites

- **Story Status**: Target story must exist and be in "Approved" status
- **Architecture Context**: All relevant architecture documents must be accessible

## SEQUENTIAL Task Execution

**IMPORTANT WORKFLOW NOTE**: 
- For new implementation plans: Execute sections 1, 3.1-3.9 to generate complete plan
- Upon user acceptance of plan: Immediately execute section 3.10 to save file
- For existing plan re-evaluation: Execute sections 1, 2 to update existing plan file

### 1. Verify Planning Mode and Context

#### 1.1 Confirm Planning Mode
- Always tell the user that you are attempting to generate an enhanced implementation plan before proceeding further
- Verify that we are operating in planning mode
- If not in planning mode, HALT and instruct: "This task requires planning mode. Please enable planning mode before proceeding."

#### 1.2 Load Target Story
- Identify the target story file from user input
- Load and validate story structure and status
- Ensure story has complete Acceptance Criteria and basic Tasks/Subtasks
- Extract story context, requirements, and existing Dev Notes

#### 1.3 Check for Existing Implementation Plan
- **CRITICAL**: Check if implementation plan file already exists
- Implementation plan file naming convention: `{story-filename}-implementation-plan.md`
- Example: For `story-2-1-multi-factor-scoring-algorithm.md`, check for `story-2-1-multi-factor-scoring-algorithm-implementation-plan.md`
- If implementation plan exists:
  - Load existing implementation plan content
  - Note creation date and last modification time
  - Proceed to re-evaluation workflow (Section 2)
- If implementation plan does not exist:
  - Proceed to new implementation plan generation workflow (Section 3)
  - Plan will be saved to new file upon completion

#### 1.4 Load Architecture Context
- Load all architecture documents specified in `devLoadAlwaysFiles` from core-config.yaml
- Read additional architecture docs based on story type (frontend/backend/fullstack)
- Extract existing code patterns, conventions, and technical standards
- Identify relevant libraries, frameworks, and design patterns already in use

### 2. Re-Evaluate Existing Implementation Plan (If Plan File Exists)

#### 2.1 Implementation Status Assessment
- **CRITICAL**: Compare existing implementation plan against current codebase state
- Identify which plan components have been implemented:
  - Check for files/modules mentioned in the plan
  - Verify if architectural decisions have been implemented
  - Assess completion of component structures and interfaces
  - Review implementation of data flow strategies

#### 2.2 Codebase Evolution Analysis
- **CRITICAL**: Analyze changes since plan creation that affect the plan
- Identify new patterns, libraries, or conventions introduced
- Check for architectural changes that impact the plan
- Note dependency updates or new framework integrations
- Document any conflicts between plan and current codebase state

#### 2.3 Plan Amendment Generation
- **CRITICAL**: Generate specific amendments to existing plan based on analysis
- Document what has been implemented vs. what remains
- Suggest updates to outdated architectural decisions
- Recommend adjustments based on new codebase patterns
- Note any new risks or pitfalls discovered
- Update test strategies based on current testing infrastructure

#### 2.4 Updated Plan Output
- Create updated implementation plan with:
  - Original plan sections (preserved for context)
  - "Plan Amendments" section with specific updates
  - "Implementation Status" section tracking completion
  - Updated metadata (last reviewed date, amendments made)
- Save updated plan to the same implementation plan file
- **HALT** after completing re-evaluation - do not proceed to Section 3

### 3. Generate New Implementation Plan (If No Plan File Exists)

### 3.1 Analyze Existing Codebase Patterns

#### 3.1.1 Code Pattern Analysis
- Thoroughly examine existing source code in relevant directories
- Identify established patterns for:
  - Component/module organization
  - Error handling approaches
  - Data validation strategies
  - Testing structures and conventions
  - API integration patterns
  - State management approaches
  - Caching

#### 3.1.2 Technical Stack Assessment
- Document current technology stack and versions
- Identify preferred libraries and their usage patterns
- Note any constraints or limitations in the current setup
- Catalog available utilities and helper functions

#### 3.1.3 Integration Point Mapping
- Map all external service integrations
- Document internal service communication patterns
- Identify data flow paths and transformation points
- Note authentication and authorization mechanisms

### 3.2 Generate Architectural Decisions

#### 3.2.1 Design Pattern Selection
- **CRITICAL**: Choose specific design patterns based on story requirements
- Document WHY each pattern was selected (provide clear rationale)
- Reference existing codebase examples where patterns are already used
- Specify how patterns will be adapted for this specific story

#### 3.2.2 Library and Framework Choices
- Select specific libraries needed for implementation
- Document version requirements and compatibility considerations
- Explain why chosen over alternatives (with specific reasons)
- Note any new dependencies that need approval

#### 3.2.3 Module Organization Strategy
- Define exact file structure and naming conventions
- Specify interface boundaries and responsibilities
- Document how new code integrates with existing architecture
- Plan for future extensibility and maintenance

### 3.3 Define Component Structure

#### 3.3.1 Detailed Module Design
- Specify exact class/function/component structures
- Define public APIs and method signatures
- Document parameter types and return values
- Plan internal implementation boundaries

#### 3.3.2 Interface and Type Definitions
- Create comprehensive type definitions
- Specify data contracts between components
- Define validation rules and constraints
- Plan for error propagation and handling

#### 3.3.3 Dependency Management
- Map all dependencies between new components
- Plan dependency injection patterns
- Define service registration and lifecycle management
- Document circular dependency prevention strategies

### 3.4 Generate System Architecture Diagrams

#### 3.4.1 Component Relationship Mapping
- **CRITICAL**: Create Mermaid graph diagrams showing component dependencies
- Map module interactions and data flow between components
- Document service communication patterns and boundaries
- Show external service integration points
- Include database schema relationships where applicable

**Example Format:**
```mermaid
graph TD
    A[URL Input] --> B[Validation Service]
    B --> C{Valid?}
    C -->|Yes| D[Analysis Orchestrator]
    C -->|No| E[Error Handler]
    D --> F[Reputation Service]
    D --> G[SSL Service] 
    D --> H[WHOIS Service]
    D --> I[AI Analysis Service]
    F --> J[Results Aggregator]
    G --> J
    H --> J
    I --> J
    J --> K[Risk Calculator]
    K --> L[Response Formatter]
```

#### 3.4.2 Data Flow Architecture
- Create visual representation of data movement through system
- Document state management patterns and data persistence flows
- Show caching layers and invalidation strategies
- Map validation and transformation points

### 3.5 Create Interaction Sequence Diagrams

#### 3.5.1 User Flow Sequences  
- **CRITICAL**: Generate Mermaid sequence diagrams for each acceptance criteria
- Map participant interactions (User, UI, API, Services, Database, External APIs)
- Document message flows, responses, and error paths
- Include conditional logic (alt/opt blocks) and loops
- Show async operations and callbacks

**Example Format:**
```mermaid
sequenceDiagram
    participant U as User
    participant UI as Frontend
    participant API as Backend API
    participant RS as Reputation Service
    participant DB as Database
    
    U->>UI: Submit URL for analysis
    UI->>UI: Validate URL format
    alt Invalid URL
        UI-->>U: Show validation error
    else Valid URL
        UI->>API: POST /analyze {url}
        API->>DB: Check cache for URL
        alt Cached result exists
            DB-->>API: Return cached data
            API-->>UI: Return analysis results
        else No cache
            API->>RS: Check reputation
            par Parallel Analysis
                RS->>RS: Query external API
            and
                API->>API: Perform SSL check
            and  
                API->>API: WHOIS lookup
            end
            API->>API: Aggregate results
            API->>DB: Cache results
            API-->>UI: Return analysis
        end
        UI-->>U: Display results
    end
```

#### 3.5.2 System Integration Sequences
- Map service-to-service communications and API calls
- Document async operations, callbacks, and event flows
- Show error propagation and recovery mechanisms
- Include authentication and authorization sequences

#### 3.5.3 Error Handling Flow Diagrams
- Create sequence diagrams for error scenarios
- Document error boundaries and containment strategies  
- Show graceful degradation and fallback patterns
- Map logging and monitoring touchpoints

### 3.6 Generate Implementation Pseudo-Code

#### 3.6.1 Core Algorithm Pseudo-Code
- **CRITICAL**: Create language-agnostic pseudo-code for complex business logic
- Document step-by-step algorithmic flows with clear sequences
- Include conditional logic (IF/ELSE/SWITCH) and iteration (FOR/WHILE)
- Show data processing pipelines and transformation steps
- Document validation logic sequences and error handling

**Example Format:**
```
FUNCTION analyzeUrl(url)
    // Input validation
    IF NOT isValidUrl(url) THEN
        RETURN Error("Invalid URL format")
    END IF
    
    // Check cache first
    cachedResult = cache.get(url)
    IF cachedResult EXISTS AND NOT isExpired(cachedResult) THEN
        LOG("Cache hit for URL: " + url)
        RETURN cachedResult
    END IF
    
    // Initialize analysis context
    analysisContext = {
        url: url,
        timestamp: getCurrentTime(),
        riskFactors: []
    }
    
    // Parallel analysis execution
    PARALLEL
        reputationScore = performReputationAnalysis(url)
        sslInfo = performSslAnalysis(url)  
        whoisData = performWhoisAnalysis(url)
        aiAnalysis = performAiAnalysis(url)
    END PARALLEL
    
    // Risk calculation logic
    overallRisk = 0
    FOR EACH riskFactor IN [reputationScore, sslInfo, whoisData, aiAnalysis]
        IF riskFactor.hasErrors THEN
            LOG("Error in analysis: " + riskFactor.error)
            CONTINUE
        END IF
        overallRisk = overallRisk + (riskFactor.score * riskFactor.weight)
    END FOR
    
    // Normalize and categorize risk
    normalizedRisk = min(max(overallRisk, 0), 100)
    riskCategory = CASE normalizedRisk
        WHEN < 30 THEN "LOW"
        WHEN < 70 THEN "MEDIUM"  
        ELSE "HIGH"
    END CASE
    
    // Build result object
    result = {
        url: url,
        analysis: {
            reputation: reputationScore,
            ssl: sslInfo,
            whois: whoisData,
            ai: aiAnalysis
        },
        overallRisk: normalizedRisk,
        riskCategory: riskCategory,
        timestamp: analysisContext.timestamp
    }
    
    // Cache and return
    cache.set(url, result, TTL=3600)
    LOG("Analysis completed for URL: " + url)
    RETURN result
END FUNCTION
```

#### 3.6.2 State Management Pseudo-Code  
- Define state transitions and update procedures
- Document side effects and triggers for state changes
- Show validation rules and business constraints
- Include rollback and error recovery logic

#### 3.6.3 Business Logic Decision Trees
- Create pseudo-code for complex decision-making processes
- Document branching logic and condition evaluations
- Show scoring algorithms and weighting calculations
- Include rule engine patterns and configuration handling

### 3.7 Create Test Scenario Diagrams

#### 3.7.1 Test Case Flow Charts
- **CRITICAL**: Generate Mermaid flowcharts for test scenarios covering each acceptance criteria
- Create decision trees showing all test paths including edge cases
- Document boundary conditions and negative test scenarios
- Map integration test flows and end-to-end user journeys

**Example Format:**
```mermaid
graph TD
    A[Start: URL Analysis Test] --> B{Is URL format valid?}
    B -->|Valid| C[Test successful validation]
    B -->|Invalid| D[Test error handling]
    C --> E{Is service available?}
    E -->|Yes| F[Test full analysis path]
    E -->|No| G[Test service unavailable path]
    F --> H{Results returned?}
    H -->|Yes| I[Verify result format]
    H -->|No| J[Test timeout handling]
    I --> K[Test risk calculation]
    K --> L[Verify caching behavior]
    D --> M[Verify error message format]
    G --> N[Verify fallback behavior]
```

#### 3.7.2 Mock Interaction Patterns
- Document external service mocking strategies with sequence diagrams
- Define test data fixtures and setup procedures
- Show test database setup and teardown flows
- Map performance test scenarios and load patterns

#### 3.7.3 Integration Test Sequences
- Create sequence diagrams for integration test scenarios
- Document API contract testing approaches
- Show cross-service communication test patterns
- Define monitoring and observability validation tests

### 3.8 Document Code Patterns and Conventions

#### 3.8.1 Existing Pattern Adoption
- **CRITICAL**: Identify and document existing codebase patterns to follow
- Specify naming conventions and code organization rules
- Document commenting and documentation requirements
- Note any project-specific coding standards

#### 3.8.2 Reusable Components and Utilities
- Identify existing utilities that should be reused
- Plan for new reusable components creation
- Document component interfaces and usage patterns
- Plan for component testing and documentation

### 3.9 Identify Potential Pitfalls and Mitigation

#### 3.9.1 Technical Risk Assessment
- **CRITICAL**: Identify known pitfalls specific to the chosen approach
- Document common mistakes and how to avoid them
- Plan for technical debt considerations
- Define code quality gates and validation steps

#### 3.9.2 Performance and Security Considerations
- Identify potential performance bottlenecks
- Document security vulnerabilities and protection measures
- Plan for scalability and resource optimization
- Define monitoring and alerting strategies

#### 3.9.3 Maintenance and Extensibility Planning
- Document future extension points and patterns
- Plan for backward compatibility requirements
- Define deprecation and migration strategies
- Document knowledge transfer and onboarding requirements

### 3.10 Save Implementation Plan to File (Execute Immediately After Plan Acceptance)

#### 3.10.1 Create Implementation Plan Document
- **CRITICAL**: As soon as the user accepts the complete implementation plan, immediately save it as separate markdown file
- File name: `{story-filename}-implementation-plan.md`
- Save in same directory as story file (`docs/stories/`)
- **TIMING**: This step executes immediately upon plan acceptance, not at task completion

#### 3.10.2 Implementation Plan File Structure
- **File Header**: Include metadata and story reference
- **All Required Sections**: Complete implementation plan content from sections 3.1-3.9
- **Creation Metadata**: Date created, BMad version, model used

**Implementation Plan File Template:**
```markdown
# Implementation Plan: {Story Title}

## Metadata
- **Story File**: {story-filename}.md
- **Created**: {current-date}
- **Last Updated**: {current-date}
- **BMad Version**: {version}
- **Generated By**: {model-name}

## Story Reference
[Brief summary of story and acceptance criteria]

## Implementation Plan Sections
[All sections from Section 4 below]

## Implementation Status
- [ ] Planning Complete
- [ ] Architecture Decisions Implemented
- [ ] Component Structure Built
- [ ] Integration Points Connected
- [ ] Testing Complete
- [ ] Story Acceptance Criteria Met
```

## Output Requirements

### Implementation Plan File Content

The implementation plan file must contain ALL sections:

1. **Architectural Decisions**: Complete with rationale and examples
2. **Component Structure**: Detailed with interfaces and boundaries
3. **Data Flow Strategy**: Comprehensive with patterns and policies
4. **Integration Points**: Specific with contracts and error handling
5. **Error Handling Strategy**: Detailed with scenarios and responses
6. **Test Strategy**: Exact with scenarios and data
7. **Step-by-Step Implementation**: Ordered with checkpoints
8. **Code Patterns & Conventions**: Specific with examples
9. **Potential Pitfalls & Mitigation**: Comprehensive with solutions

### Quality Standards

- **Specificity**: All guidance must be actionable and specific
- **Rationale**: Every decision must include clear reasoning
- **Examples**: Reference existing codebase patterns where applicable
- **Completeness**: Cover all aspects of the story implementation
- **Clarity**: Write for Sonnet 4 to execute without interpretation

### Validation Checklist

Before completing the task, verify:

- [ ] All Implementation Plan sections are fully populated
- [ ] Every architectural decision includes rationale
- [ ] Specific code patterns and examples are provided
- [ ] Test scenarios cover all acceptance criteria
- [ ] Implementation steps are sequential and checkpointed
- [ ] Potential pitfalls are identified with mitigation strategies
- [ ] Integration with existing codebase is clearly documented
- [ ] Error handling covers all failure scenarios

## Success Criteria

### For New Implementation Plans:
The implementation plan is complete when:

1. **Sonnet 4 Readiness**: The plan contains sufficient detail for Sonnet 4 to implement without making architectural decisions
2. **Decision Completeness**: All significant technical decisions are made and documented with rationale
3. **Pattern Consistency**: The plan follows established codebase patterns and conventions
4. **Risk Mitigation**: All known risks are identified with specific mitigation strategies
5. **Test Coverage**: Complete test strategy covers all functionality and edge cases
6. **Implementation Clarity**: Step-by-step implementation is clear and unambiguous
7. **Immediate File Save**: Implementation plan saved to separate markdown file immediately upon user acceptance

### For Existing Implementation Plan Re-evaluation:
The plan re-evaluation is complete when:

1. **Current State Assessment**: Complete analysis of implementation status vs. original plan
2. **Gap Analysis**: Clear identification of completed, pending, and modified requirements
3. **Amendment Documentation**: Specific updates to plan based on codebase evolution
4. **Updated Guidance**: Revised implementation steps reflecting current state
5. **Risk Updates**: New or changed risks identified and mitigated
6. **File Updates**: Implementation plan file updated with amendments and new metadata

## Notes

- This task should typically take 15-30 minutes to complete thoroughly
- The quality of the implementation plan directly impacts the success of the subsequent development execution
- Focus on being prescriptive rather than descriptive - tell Sonnet 4 exactly what to do, not what to consider
- When in doubt, be more detailed rather than less detailed