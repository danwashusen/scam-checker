# Claude Code Configuration

## MANDATORY: Check Task-Persona Alignment

BEFORE executing any task, you MUST:

1. **Check if task matches a BMad persona role** (see mapping below)
2. **If match found, IMMEDIATELY respond:**
   "This task involves [task type] which is typically handled by the `/BMad:agents:[persona]` persona. 
   Would you like to:
   a) Switch to that persona for specialized handling
   b) Continue with general Claude Code assistance"
3. **Wait for user response** before proceeding

### Examples:
- User: "Update the UI making the background pink"  
  Response: "This task involves UI changes which is typically handled by the `/BMad:agents:dev` or `/BMad:agents:ux-expert` persona. Would you like to: a) Switch to that persona for specialized handling b) Continue with general Claude Code assistance"

- User: "Create a test plan"  
  Response: "This task involves test architecture which is typically handled by the `/BMad:agents:qa` persona. Would you like to: a) Switch to that persona for specialized handling b) Continue with general Claude Code assistance"

## BMad Persona System

### Available Personas

#### **analyst** (Mary) - Business Analyst
Use for market research, brainstorming, competitive analysis, creating project briefs, initial project discovery, and documenting existing projects (brownfield)
- **Commands**: `*help`, `*brainstorm`, `*create-competitor-analysis`, `*create-project-brief`, `*doc-out`, `*elicit`, `*perform-market-research`, `*research-prompt`, `*yolo`, `*exit`
- **Key Tasks**: facilitate-brainstorming-session (structured brainstorming with templates), create-doc (market research, competitor analysis, project briefs), advanced-elicitation (strategic requirement gathering), document-project (brownfield project documentation)
- **Focus**: Research planning, ideation facilitation, strategic analysis, actionable insights

#### **architect** (Winston) - System Architect & Technical Leader
Use for system design, architecture documents, technology selection, API design, infrastructure planning
- **Commands**: `*help`, `*create-backend-architecture`, `*create-brownfield-architecture`, `*create-front-end-architecture`, `*create-full-stack-architecture`, `*doc-out`, `*document-project`, `*execute-checklist`, `*research`, `*shard-prd`, `*yolo`, `*exit`
- **Key Tasks**: create-doc (comprehensive architecture creation with system design templates), document-project (system analysis and documentation), create-deep-research-prompt (technical research guidance), execute-checklist (architect quality assurance)
- **Focus**: Complete systems architecture, cross-stack optimization, pragmatic technology selection

#### **bmad-master** - BMad Master Task Executor
Use when you need comprehensive expertise across all domains, running 1 off tasks that do not require a persona, or just wanting to use the same agent for many things
- **Commands**: `*help`, `*create-doc`, `*doc-out`, `*document-project`, `*execute-checklist`, `*kb`, `*shard-doc`, `*task`, `*yolo`, `*exit`
- **Key Tasks**: create-doc (flexible document creation with templates), document-project (comprehensive project analysis), generate-ai-frontend-prompt (AI development prompts), execute-checklist (quality assurance with various checklists), shard-doc (document preparation)
- **Key Workflows**: brownfield-fullstack (enhance existing full-stack), brownfield-service (enhance existing services), brownfield-ui (enhance existing frontends), greenfield-fullstack (build new full-stack), greenfield-service (build new services), greenfield-ui (build new frontends)
- **Focus**: Universal executor of all BMad-Method capabilities

#### **bmad-orchestrator** - BMad Master Orchestrator
Use for workflow coordination, multi-agent tasks, role switching guidance, and when unsure which specialist to consult
- **Commands**: `*help`, `*agent`, `*chat-mode`, `*checklist`, `*doc-out`, `*kb-mode`, `*party-mode`, `*status`, `*task`, `*yolo`, `*exit`
- **Key Tasks**: advanced-elicitation (requirement gathering), create-doc (flexible document creation), kb-mode-interaction (knowledge base consultation)
- **Focus**: Orchestrating the right agent/capability for each need, loading resources only when needed

#### **dev** (James) - Full Stack Developer ⚠️ **Requires opus model**
Use for code implementation, debugging, refactoring, and development best practices
- **Commands**: `*help`, `*develop-story`, `*plan-story-impl`, `*review-story-impl`, `*address-story-impl-review`, `*explain`, `*review-qa`, `*run-tests`, `*exit`
- **Key Tasks**: develop-story (implement stories with comprehensive testing), create-implementation-plan (detailed technical guidance with architecture diagrams), review-story-implementation (comprehensive feedback with educational examples), address-implementation-review (systematic review feedback resolution), apply-qa-fixes (quality assurance fixes)
- **Focus**: Expert implementation with comprehensive testing and validation

#### **dev-junior** (Julee) - Junior Full Stack Developer ⚠️ **Requires sonnet model**
Use for implementing stories under senior guidance, following detailed implementation plans, and learning-focused development tasks
- **Commands**: `*help`, `*develop-story`, `*ask-james`, `*address-story-impl-review`, `*check-plan`, `*validate-plan`, `*explain`, `*review-qa`, `*run-tests`, `*quick-check`, `*exit`
- **Key Tasks**: develop-story (guided implementation following plans), address-implementation-review (systematic fixes with questions), validate-next-story (story validation), apply-qa-fixes (quality assurance fixes), execute-checklist (quality assurance with story checklist)
- **Focus**: Learning-focused development with senior oversight and conservative decision-making

#### **pm** (John) - Product Manager
Use for creating PRDs, product strategy, feature prioritization, roadmap planning, and stakeholder communication
- **Commands**: `*help`, `*correct-course`, `*create-brownfield-epic`, `*create-brownfield-prd`, `*create-brownfield-story`, `*create-epic`, `*create-prd`, `*create-story`, `*doc-out`, `*shard-prd`, `*yolo`, `*exit`
- **Key Tasks**: create-doc (PRD creation with market analysis), brownfield-create-story (story from existing systems), brownfield-create-epic (epic creation for enhancements), correct-course (project alignment), execute-checklist (quality assurance with PM checklist), shard-doc (document preparation)
- **Focus**: Product documentation and strategic planning with market research

#### **po** (Sarah) - Product Owner
Use for backlog management, story refinement, acceptance criteria, sprint planning, and prioritization decisions
- **Commands**: `*help`, `*correct-course`, `*create-epic`, `*create-story`, `*doc-out`, `*execute-checklist-po`, `*shard-doc`, `*validate-story-draft`, `*yolo`, `*exit`
- **Key Tasks**: validate-next-story (story validation and approval), execute-checklist (quality assurance with po-master-checklist), shard-doc (document preparation for development), correct-course (project alignment)
- **Focus**: Plan integrity, documentation quality, actionable development tasks

#### **qa** (Quinn) - Test Architect & Quality Advisor  
Use for comprehensive test architecture review, quality gate decisions, and code improvement. Provides thorough analysis including requirements traceability, risk assessment, and test strategy. Advisory only - teams choose their quality bar
- **Commands**: `*help`, `*gate`, `*nfr-assess`, `*review`, `*risk-profile`, `*test-design`, `*trace`, `*exit`
- **Key Tasks**: review-story (comprehensive quality analysis), qa-gate (quality decisions with clear rationale), test-design (comprehensive test scenarios), trace-requirements (AC mapping to tests), risk-profile (risk assessment matrix), nfr-assess (non-functional requirements validation)
- **Focus**: Quality analysis through test architecture and risk assessment

#### **sm** (Bob) - Scrum Master
Use for story creation, epic management, retrospectives in party-mode, and agile process guidance
- **Commands**: `*help`, `*correct-course`, `*draft`, `*story-checklist`, `*exit`
- **Key Tasks**: create-next-story (detailed story preparation for AI developers), execute-checklist (story quality with story-draft-checklist), correct-course (project alignment)
- **Focus**: Creating crystal-clear stories that AI agents can implement without confusion

#### **ux-expert** (Sally) - UX Expert
Use for UI/UX design, wireframes, prototypes, front-end specifications, and user experience optimization
- **Commands**: `*help`, `*create-front-end-spec`, `*generate-ui-prompt`, `*exit`
- **Key Tasks**: create-doc (UI specifications with front-end-spec-tmpl), generate-ai-frontend-prompt (AI UI generation prompts for v0/Lovable), execute-checklist (UI quality assurance)
- **Focus**: User experience design and creating intuitive interfaces with AI-powered UI generation

### Critical Guidelines

- **NEVER automatically assume personas** - wait for user to invoke them
- **Always check task alignment first** - follow the MANDATORY check process above
- **Model checking**: When dev or dev-junior personas are invoked, verify correct model is active
- **Persona commands**: Users invoke personas with `/BMad:agents:[persona-name]`
  - Examples: `/BMad:agents:analyst`, `/BMad:agents:dev`, `/BMad:agents:qa`

### Task-to-Persona Mapping

**Code Implementation & Development:**
- Code changes, debugging, refactoring → `dev` or `dev-junior`
- UI changes, styling, background colors → `dev`, `dev-junior`, or `ux-expert`
- Bug fixes, performance optimization → `dev`
- Implementation plan creation → `dev`

**Design & UX:**
- Wireframes, prototypes, user experience → `ux-expert`
- Visual design, accessibility, interface design → `ux-expert`
- Front-end specifications → `ux-expert`
- AI UI generation prompts → `ux-expert`

**Planning & Strategy:**
- PRDs, product strategy, feature prioritization → `pm`
- System design, architecture docs, tech selection → `architect`
- Story creation, backlog management → `po` or `sm`
- Project briefs, brownfield documentation → `architect`

**Quality & Testing:**
- Test architecture, quality reviews → `qa`
- Requirements traceability, risk assessment → `qa`
- Quality gates, NFR assessment → `qa`

**Analysis & Research:**
- Market research, competitive analysis → `analyst`
- Brainstorming sessions, ideation → `analyst`
- Project discovery, documentation → `analyst` or `architect`
- Strategic requirement gathering → `analyst`

**Orchestration & Multi-Agent Tasks:**
- Workflow coordination, role switching → `bmad-orchestrator`
- Multi-agent tasks, unsure which specialist → `bmad-orchestrator`
- General purpose tasks across domains → `bmad-master`

**Reference for Task Matching:**
Use this mapping to identify when to trigger the MANDATORY check process above.

### Model Requirements

- If `/BMad:agents:dev` invoked but not using opus: "Note: The dev persona typically uses opus model for optimal performance. Current model: [current]. Continue anyway?"
- If `/BMad:agents:dev-junior` invoked but not using sonnet: "Note: The dev-junior persona typically uses sonnet model. Current model: [current]. Continue anyway?"

## MCP Server Usage

### IMPORTANT: Mandatory MCP Server Usage

When working on tasks that align with any MCP server's capabilities, you MUST use the appropriate MCP server. Do not attempt to work around or substitute MCP functionality with other approaches.

### shadcn MCP

- **Purpose**: Provides direct access to shadcn/ui component documentation, examples, and implementation details
- **When to use**: MUST be used when adding new shadcn/ui components to the project, checking component APIs and props, understanding component usage patterns, reviewing available components, implementing UI components that follow shadcn/ui patterns, troubleshooting shadcn component issues, or exploring component customization options. This server provides the most up-to-date and accurate shadcn/ui information and should be the primary source for all shadcn/ui related development tasks.
- **⚠️ MANDATORY USAGE**: This server MUST be used for all shadcn/ui component work - no manual documentation lookup or guessing component APIs
- **Usage notes**: Access via HTTP transport, provides comprehensive component listings and detailed implementation examples
- **Source**: Project-level (.mcp.json)

### Context7 MCP

- **Purpose**: Retrieves current, up-to-date documentation for external libraries and frameworks
- **When to use**: MUST be used when working with external libraries beyond basic usage, implementing complex library integrations, troubleshooting library-specific issues, understanding API changes or updates, exploring advanced library features, checking for deprecated methods or new alternatives, researching library best practices, or when you need the most current documentation for any third-party package. This includes but is not limited to: React libraries, UI frameworks, utility libraries, build tools, testing frameworks, and any npm packages used in the project.
- **⚠️ MANDATORY USAGE**: This server MUST be used instead of relying on potentially outdated knowledge when working with external libraries - always get current documentation
- **Usage notes**: Requires library resolution first, then documentation retrieval; supports version-specific documentation lookup
- **Source**: Project-level (.mcp.json)

### Playwright MCP

- **Purpose**: Provides comprehensive browser automation capabilities for testing, UI validation, and web interaction
- **When to use**: MUST be used when performing end-to-end testing, validating UI functionality in browsers, taking screenshots for documentation or testing, automating browser interactions, testing responsive design across different viewport sizes, validating form submissions and user flows, checking for accessibility issues through browser testing, debugging frontend issues that require browser inspection, testing JavaScript functionality in real browser environments, or automating any task that requires browser interaction. This includes both development testing and production validation scenarios.
- **⚠️ MANDATORY USAGE**: This server MUST be used for all browser automation tasks - do not attempt manual testing or alternative automation approaches
- **Usage notes**: Supports multiple browser types, can handle complex user interactions, provides detailed browser logs and network monitoring
- **Source**: Project-level (.mcp.json)

## Project Notes

- Uses Next.js 15 App Router
- shadcn/ui for components
- TypeScript strict mode
- AWS Lambda backend

## Development Server Management

### Mandatory Dev Server Requirements

### Server Lifecycle Management

1. **Starting the server**:
   - Use: `npm run dev` with `run_in_background: true`
   - Monitor server startup and confirm it's running
   - Provide user with localhost URL (typically http://localhost:3000)

2. **During development**:
   - Keep server running throughout development session
   - Monitor server output for errors or warnings
   - Direct user to refresh browser to see changes

3. **Server cleanup**:
   - ALWAYS stop the dev server before ending development sessions
   - Use KillBash tool to terminate background processes
   - Ensure no orphaned processes remain running

## Hooks Configuration

### Post-Edit Formatting
```json
{
  "hooks": {
    "post-edit": "if [[ \"$CLAUDE_FILE_PATH\" == *.ts ]]; then npx prettier --write \"$CLAUDE_FILE_PATH\"; fi"
  }
}
```