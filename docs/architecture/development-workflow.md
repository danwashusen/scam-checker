# Development Workflow

## For Humans (Operator Flow)
- Activate persona:
  - Senior (James): `/BMad:agents:dev` (agent shows `*help`).
  - Junior (Julee): `/BMad:agents:dev-junior` (agent shows `*help`).
- Plan the story (complex step – planning mode recommended):
  - Run `*plan-story-impl {story_path}`; review and iterate until the plan matches expectations.
  - On acceptance, the plan is saved/updated at `docs/stories/{story-filename}-implementation-plan.md`.
  - Note: “Enable Claude Code planning mode” applies to the planning step itself, not persona activation.
- Implement the story (persona‑driven):
  - As Julee: run `*develop-story {story_path}`. Junior requires a complete plan and follows it literally.
  - As James: optionally use `*develop-story {story_path}` for senior‑led implementation.
- Commands are persona‑driven: do not pass `developer_type`; behavior derives from the active agent persona.
- Review implementation:
  - As James: run `*review-story-impl {story_path}`; actionable feedback is added to the story (Must Fix, Should Improve, Consider for Future, Positives).
- Address review feedback (persona‑driven):
  - As Julee: run `*address-story-impl-review {story_path}`; resolve Must Fix first, then Should Improve.
- Manual checkpoints: after planning, after implementation, and after addressing feedback, manually verify diffs and the story’s File List (AI can make mistakes).

## Agent Protocols During Task Execution
- When executing `*plan-story-impl` (Senior): Produce and maintain a prescriptive implementation plan file adjacent to the story. The plan must include Architectural Decisions, Component Structure, Data Flow, Test Strategy, a Traceability Matrix mapping each Acceptance Criterion to concrete test IDs and modules, a Dependency Policy, Observability guidance, and Rollout/Recovery. Update Plan Amendments and Traceability whenever deviating.
- When executing `*develop-story` (Senior & Junior):
  - Preconditions: For junior work, a complete plan must exist. Halt if missing or incomplete.
  - Process: Implement per plan and project standards (see [Coding Standards](#coding-standards)), enforce project structure (see [Unified Project Structure](#unified-project-structure)), and follow [Testing Strategy](#testing-strategy) for lane selection and coverage depth.
  - Validation cadence: Run lint + type‑check (`npm run check`) and relevant tests after each meaningful change; seniors validate after every file change. Maintain the story’s File List accurately.
  - UI work: For any UI/client changes, perform visual verification with Playwright MCP against [Front‑end Spec](./front-end-spec.md) in addition to unit/integration/E2E tests.
    - Viewports: Desktop (Desktop Chrome), Tablet (iPad Pro), Mobile (iPhone 12) as configured in Playwright.
    - Scope: Validate layout, states, and interactions for affected screens/components against spec sections (e.g., Unified Results header, Risk Gauge, Recommendation Alert, Interactive URL behavior, Key Findings, Technical Accordion).
    - Artifacts: Capture screenshots and, where relevant, short videos via Playwright MCP; link artifact paths (e.g., `playwright-report`) in the story’s Dev Agent Record.
    - Ownership: The UX Expert solely owns `docs/front-end-spec.md`. Developers must not modify the spec.
    - Gate: If visuals deviate from the spec, either correct the implementation to comply or raise a question to the UX Expert. Do not move the story to Ready for Review until the discrepancy is resolved. Do not update the spec yourself.
    - Reference: See `CLAUDE.md` → “Playwright MCP” (mandatory usage).
  - Constraints: Do not introduce unapproved dependencies; do not change API contracts unless explicitly documented in the plan and aligned with [API Specification](#api-specification). Timebox uncertainty and document questions (junior) or Plan Amendments (senior).
- When executing `*review-story-impl` (Senior): Evaluate alignment with the plan, [Coding Standards](#coding-standards), Architecture, Security, Performance, and [Testing Strategy](#testing-strategy). Add a “Dev Review Feedback” section to the story with categorized items (Must Fix, Should Improve, Consider for Future, Positive Highlights). Block approval if traceability is broken, unapproved dependencies exist, undocumented API changes are detected, or project structure conventions are violated.
  - Visual verification (Playwright MCP): For frontend changes (e.g., `*review-story-impl 3-18`), run Playwright MCP checks against [Front‑end Spec](./front-end-spec.md) across Desktop/Tablet/Mobile.
    - Confirm: Unified results header composition, risk gauge placement/animation, recommendation alert variants, URL link warning dialogs by risk tier, responsive truncation rules, Key Findings prominence, and technical accordion behavior.
    - Ownership: UX Expert owns `docs/front-end-spec.md`; developers must not modify it.
    - Require: Screenshot set and notes for any deviations; block approval if visuals don’t match the spec or lack rationale/approved spec updates. If compliance is not feasible, ensure a question is raised to the UX Expert and keep the story out of Approved/merge state until resolved.
  - When executing `*address-story-impl-review` (Junior & Senior): Resolve Must Fix items first, then Should Improve. After each change, re‑run validations and targeted tests, update the story’s File List, and synchronize the plan (Traceability/Amendments). Prepare the story for final review with all validations green.

Shared references: [Coding Standards](#coding-standards), [Testing Strategy](#testing-strategy), [API Specification](#api-specification), [Frontend Architecture](#frontend-architecture), [Unified Project Structure](#unified-project-structure).

## Local Setup
- Node v22.x; npm v10+; Playwright browsers (`npx playwright install --with-deps`).
- App URL: `http://localhost:3000`. Support “live-local” tests using real dev DB and sandbox/test keys where applicable.

## Story State Transitions
- Draft → Approved → In Dev → Ready for Review → Changes Required | Approved → Done
- Require passing validations/tests and complete artifacts (plan, File List, review section) at each transition.

## Validations and Tests
- Project validation: `npm run check` (lint + type-check).
- Unit: `npm run test:unit`; Integration: `npm run test:integration`.
- E2E UI: Playwright projects below; run user-flows on PRs, live-local on demand/nightly.
- Cadence: Senior after each file; Junior frequently + at checkpoints; halt on repeated failures/timeboxes.
- Visual checks: For any UI-related changes, run Playwright MCP visual verification against `docs/front-end-spec.md` (Desktop/Tablet/Mobile). Developers must not edit the spec; escalate discrepancies to the UX Expert and pause progression to Ready for Review until resolved.

## Playwright Projects (Canonical)
- Projects are defined in `playwright.config.ts`:
  - `stubbed` → `testMatch` targets `tests/e2e/user-flows/**`. Use stubs via test fixtures (e.g., `page.route`) to stabilize external/unstable endpoints.
  - `live-local` → `testMatch` targets `tests/e2e/live/**`. No stubs; `workers: 1` to avoid state bleed and API limits.

## Test Lanes and Structure
```
tests/
  unit/                      # Jest unit
  integration/               # Jest integration
  e2e/
    user-flows/              # Deterministic, stubbed browser flows  (PR-blocking)
    live/                    # Live-local flows, real DB + real APIs (optional)
```
- Deterministic user-flows: critical journeys + 1–2 edges; stabilize via routing/mocks and fixed seeds/time.
- Live-local flows: minimal coverage of core journeys; hit real providers with test/sandbox creds.

## Required Scripts
- `test` → `jest --coverage`
- `test:unit` → `jest tests/unit`
- `test:integration` → `jest tests/integration`
- `test:e2e:user-flows` → `playwright test --project=stubbed`
- `test:e2e:live` → `BASE_URL=http://localhost:3000 playwright test --project=live-local`

## Data, Auth, Stability
- Auth: optionally generate and reuse a `storageState` in global setup.
- Data: seed through API/DB helpers; tests must not depend on order. Clean up in live tests.
- Stability: eliminate randomness/time in stubbed flows using deterministic seeds and frozen clocks where applicable.