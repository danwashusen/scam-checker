# Directories (authoritative)
```
tests/
  unit/
    components/      # React components (RTL)
    services/        # Backend/service units
    utils/           # Pure utilities
    lib/             # Frontend libs (validation, api-client, etc.)
  integration/
    api/             # Route handlers / Lambda handlers w/ Supertest
    services/        # Service composition + config edges
    workflows/       # API-level workflows (no browser)
  e2e/
    user-flows/      # Stubbed browser flows (deterministic)
    live/            # Live-local browser flows (real services)
```
## E2E — User-flows (deterministic, PR-blocking)
**Purpose:** Validate business-critical journeys in the browser, quickly and deterministically.

**Prescriptions**
- **Locators:** `getByRole` / `getByLabel` / `getByPlaceholder` or `getByTestId`. Add stable `data-testid` where needed.
- **Auto-wait:** use locator API; never `waitForTimeout`.
- **Stubs:** route only *external and flaky* calls (e.g., Safe Browsing, WHOIS, AI). Keep contract-level assertions minimal.
- **Tame UI flake:** disable animations; set `timezoneId: 'Australia/Melbourne'`, `locale: 'en-AU'`.
- **Artifacts:** `trace: 'on-first-retry'`, screenshots/videos on failure.
- **Scope:** happy path + one failure path per journey. Push branching to unit/integration.
## E2E — Live-local (real DB + real APIs, optional/nightly)
**Purpose:** Smoke the **real wiring** end-to-end on the local dev stack.

**Prescriptions**
- **No stubs.** The app must be configured with **provider sandbox/test keys**.
- **Isolation:** per-test tenant/user; clean up after.
- **Concurrency:** `workers: 1` (serialize) unless proven safe.
- **Small surface:** ~3–6 flows max (login, analyze URL, error path, uploads/email loops).
- **CI:** run nightly and on demand; non-blocking for PRs but tracked.
## Integration tests (Jest)
**Purpose:** Validate module composition and external edges without the browser.

**Prescriptions**
- **API routes / Lambdas:** test with **Supertest** (or framework request helpers) in a node environment; cover auth, validation, error mapping, and 3P failure modes.
- **HTTP boundaries:** use **MSW (node)** to simulate external HTTP (Safe Browsing, WHOIS, AI). Prefer MSW over ad-hoc `nock` for unified mocks across browser/node.
- **Config matrix:** run with representative environment flags (feature toggles, cache on/off).
## Unit tests (Jest)
**Purpose:** Validate pure logic deterministically and exhaustively.

**Prescriptions**
- **Targets:** scoring, validators (Zod schemas), normalization, mappers, small services.
- **Granularity:** single responsibility per test; table-driven when useful.
- **Snapshots:** only for stable, intentionally serialized output; otherwise prefer explicit assertions.
- **Coverage:** 80%+ per package; do not chase coverage with meaningless tests.
## React component tests (Jest + RTL)
**Purpose:** Validate component contracts and user-observable behavior.

**Prescriptions**
- **Queries first:** `getByRole` / `getByLabel` / `getByText` (avoid class/DOM structure assertions).
- **Stateful UI:** test interactions (typing, clicking, toggling view modes), not implementation details.
- **Network:** mock via **MSW (browser)**; assert user-visible outcomes (spinners, errors, rendered results).
- **Accessibility:** ensure roles/names are present; include at least one expectation that would fail on an a11y regression per complex component.
## Mocking policy (Jest) — opinionated
1. **Mock at the boundary.**  
   - External HTTP (Safe Browsing, WHOIS, AI): **MSW** only.  
   - Time/randomness: `jest.useFakeTimers()` + seeded randomness.  
   - File/OS/crypto only if necessary; prefer real implementations in Node where stable.
2. **Don’t mock what you own.**  
   - Internal modules/services should be tested *real* in unit/integration unless isolation is required for a specific failure mode. Prefer **spies** (`jest.spyOn`) over full module mocks to assert calls.
3. **Determinism > cleverness.**  
   - No network in unit/integration tests; no sleeps; no real time.  
   - Stick to **fixed inputs and explicit assertions**. Avoid broad snapshots.
4. **One source of truth for HTTP mocks.**  
   - Reuse **MSW handlers** across unit (node), integration, and RTL tests to keep contracts consistent. Handlers live in `tests/__mocks__/http/…`.
5. **Contract tests for external APIs.**  
   - For each provider, include: happy path, rate limit, timeout, malformed response. Handlers mimic real payloads.
## Playwright configuration (normative)
- Two projects:
  - `stubbed` → `testMatch: ['e2e/user-flows/**/*.spec.ts']`, fixture enables stubs via `page.route`.
  - `live-local` → `testMatch: ['e2e/live/**/*.spec.ts']`, fixture **does not** install routes; `workers: 1`.
- Shared `use`: `baseURL` (env-overrideable), `testIdAttribute: 'data-testid'`, `trace`, `screenshot`, `video`, `timezoneId`, `locale`.
## Test data & factories
- Use minimal **factory utilities** (plain functions or `@faker-js/faker` with a fixed seed) per domain type.  
- Keep factories in `tests/__mocks__/factories/**`. Never inline opaque JSON blobs in tests.
## Required scripts
- `test`, `test:unit`, `test:integration`, `test:e2e:user-flows`, `test:e2e:live`, `test:all` (run live last).
- CI must treat `test:e2e:user-flows` as **required**; schedule `test:e2e:live` nightly.