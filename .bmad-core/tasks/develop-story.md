<!-- Powered by BMAD™ Core -->

# develop-story

Implement a story by following requirements, executing tasks sequentially, and ensuring all acceptance criteria are met with proper testing and validation.

## Inputs

```yaml
required:
  - story_path: 'Path to story file to implement'
  - developer_type: 'Type of developer executing (senior|junior)'
optional:
  - implementation_plan_path: 'Path to implementation plan (required for junior developers)'
  - skip_ui_check: 'Skip UI documentation check if explicitly not needed'
```

## Prerequisites

### For Senior Developers

- Story must exist and be in "Approved" status (not draft)
- All architecture documents from devLoadAlwaysFiles must be loaded
- Story contains complete acceptance criteria and tasks

### For Junior Developers

- Story must exist and have an implementation plan at `{story-filename}-implementation-plan.md`
- Implementation plan must contain required sections: Tasks, Technical Details, Dependencies, Testing Strategy
- If implementation plan missing or incomplete, HALT and request senior developer create one

## Development Process

### 1. Story Validation and Setup

#### 1.1 Load Story Context

- Load the complete story file
- Verify story status is appropriate for development
- Extract acceptance criteria, tasks, and dev notes
- Review any existing Dev Agent Record entries

#### 1.2 Implementation Plan Check

##### For Senior Developers (developer_type=senior)

- Check for implementation plan at: `{story-directory}/{story-filename}-implementation-plan.md`
- If exists:
  - **THOROUGHLY READ AND UNDERSTAND the entire implementation plan:**
    - Study all architectural decisions and their rationale
    - Review all Mermaid diagrams (component, sequence, flowcharts) step-by-step
    - Understand pseudo-code algorithms and business logic flows
    - Analyze the planned data flow and integration patterns
    - Review test scenarios and edge cases identified in the plan
    - Understand WHY each technical decision was made
  - Consider plan recommendations but use professional judgment based on full understanding
  - When deviating from plan based on expertise:
    - Document deviation in implementation plan by adding/updating "Plan Amendments" section
    - Include: original approach, actual implementation, technical justification
    - Update affected sections to reflect actual implementation
  - Ensure plan remains accurate for future reference and knowledge sharing
- If no plan exists: Proceed using expertise and story requirements

##### For Junior Developers (developer_type=junior)

- Construct implementation plan path: `{story-directory}/{story-filename}-implementation-plan.md`
- Attempt to read implementation plan file
- If file does not exist:
  - Display: "❌ IMPLEMENTATION PLAN REQUIRED"
  - Display: "I need a detailed implementation plan from James before I can help with this story."
  - Display: "Expected file: {story-filename}-implementation-plan.md"
  - HALT - do not proceed with any development work
- If file exists but is incomplete:
  - Display: "⚠️ INCOMPLETE IMPLEMENTATION PLAN"
  - Display: "Required sections: Tasks, Technical Details, Dependencies, Testing Strategy"
  - HALT - do not proceed until plan is complete
- If file exists and is complete:
  - **THOROUGHLY STUDY AND UNDERSTAND the entire implementation plan:**
    - Read all sections multiple times until fully understood
    - Study all Mermaid diagrams - trace through each sequence diagram step by step
    - Understand every line of pseudo-code before attempting implementation
    - Review architectural decisions and understand WHY each was made
    - Study test scenarios to understand expected behavior and edge cases
    - Analyze data flow patterns and integration approaches
    - If ANY part is unclear: Add questions to implementation plan Questions section before starting
  - Only proceed to implementation after fully understanding the complete plan

### 2. UI Documentation Check

**CRITICAL: This check must be performed for ALL stories before implementation begins**

#### 2.1 Analyze Story for UI Components

- Scan story acceptance criteria and tasks for UI-related keywords:
  - Components, forms, layouts, styling, user interactions
  - Frontend, UI, UX, interface, display, render
  - Button, input, modal, page, screen, view
  - CSS, styles, responsive, mobile, desktop

#### 2.2 Load UI Documentation if Needed

If story involves ANY UI changes:

- **MUST** read `docs/front-end-spec.md` if it exists
- **MUST** read any UI/front-end related files in `docs/architecture/`:
  - Search for files containing: frontend, ui, component, style, design
- Document key UI patterns and requirements found:
  - Component structure patterns
  - Styling conventions
  - State management approaches
  - Form handling patterns
  - Responsive design requirements
- For junior developers: Add questions to implementation plan if UI requirements unclear

#### 2.3 Skip Condition

- Only skip this check if `skip_ui_check=true` is explicitly passed
- Never skip for stories that mention UI/frontend in any capacity

### 3. Implementation Execution

#### 3.1 Task Processing Workflow

**For Each Task in Story:**

1. **Read Task**: Load the current task and all its subtasks
2. **Implement Task**:
   - For senior: Use expertise to implement based on requirements
   - For junior: Follow implementation plan step-by-step literally
3. **Write Tests**: Create comprehensive tests for the functionality
4. **Execute Validations**: Run project validation commands (lint, type-check, tests)
5. **Update Progress**: Only if ALL validations pass, mark task checkbox with [x]
6. **Update File List**: Add all new/modified/deleted files to story File List section
7. **Repeat**: Continue to next task until all complete

#### 3.2 Junior Developer Conservative Approach (if developer_type=junior)

**When Uncertain (confidence < 80%):**

- Add question to implementation plan Questions section
- Format: "**Q{number}: {Brief Title}** - {Detailed explanation with context}"
- Include: Current task, specific uncertainty, attempted approaches, why guidance needed
- Never assume implementation details not explicitly covered in plan
- If multiple valid approaches exist: Document options, ask for preference
- If debugging takes >30 minutes: Document issue and ask for help

#### 3.3 Code Quality Standards

**After Each Implementation Step:**

- Run project validation commands immediately
- Fix any lint or type errors before proceeding
- Ensure code follows project patterns and conventions
- Add appropriate error handling and edge case coverage
- Write clear, maintainable code with proper abstractions

### 4. Story File Updates

**CRITICAL: Only update these specific sections of the story file:**

#### 4.1 Authorized Sections for Updates

- Tasks/Subtasks checkboxes (mark with [x] when complete)
- Dev Agent Record section and ALL subsections:
  - Agent Model Used
  - Debug Log References
  - Completion Notes List
  - File List (MUST be kept current)
  - Change Log
- Status field (only when ready for review)

#### 4.2 Prohibited Sections

**DO NOT modify:**

- Story description
- Acceptance Criteria
- Dev Notes (unless adding critical information)
- Testing sections
- Any other sections not explicitly listed above

### 5. Blocking Conditions

**HALT development immediately if:**

#### 5.1 General Blockers

- Unapproved dependencies needed (confirm with user first)
- Ambiguous requirements after checking story and notes
- 3+ consecutive failures attempting same implementation
- Missing critical configuration
- Failing regression tests

#### 5.2 Junior-Specific Blockers

- No implementation plan exists
- Implementation plan incomplete
- Confidence < 80% on technical decision
- 2+ failures attempting same task
- Ambiguous requirement not covered in plan

### 6. Completion Criteria

#### 6.1 Ready for Review Checklist

- [ ] All tasks and subtasks marked [x]
- [ ] All acceptance criteria have tests
- [ ] Full test suite passes without errors
- [ ] Project validation commands pass (lint, type-check)
- [ ] File List is complete and accurate
- [ ] No blocking issues remain

#### 6.2 Final Steps

1. Run the task `execute-checklist` for checklist `story-dod-checklist`
2. Ensure all Definition of Done items are checked
3. Set story status to "Ready for Review"
4. For junior developers: Ensure all questions are documented in implementation plan
5. HALT - await review feedback

## Success Criteria

The story development is successful when:

- All acceptance criteria are demonstrably met
- Complete test coverage exists and passes
- Code follows all project standards and patterns
- File List accurately reflects all changes
- No regressions introduced
- Story is ready for comprehensive review

## Notes

- Senior developers should complete most stories in one session
- Junior developers may need multiple iterations with question resolution
- Always prioritize code quality over speed
- When in doubt, ask for clarification rather than assume
- UI consistency is paramount - never skip UI documentation checks for UI stories
