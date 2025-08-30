# Definition of Done Checklist

This checklist MUST be completed before any story can be marked as "Done". No exceptions.

## Code Quality Requirements

### ✅ Linting & Code Standards

- [ ] **Lint passes with zero errors**: linting tools show no errors
- [ ] **Compiles without errors, including type checks**: build tools show no compilation issues and type checking passes
- [ ] **Code follows project coding standards**: Follows patterns in `docs/architecture/coding-standards.md`
- [ ] **No raw console logging or debugging code left in production code**

### ✅ Testing Requirements

- [ ] **All existing tests still pass**: testing passes completely
- [ ] **New unit tests written for new functionality**: testing tools show coverage maintained/improved
- [ ] **Integration and e2e tests updated if needed**: testing passes completely
- [ ] **Test coverage meets minimum threshold**: testing tools show adequate coverage
- [ ] **Manual testing completed**: All acceptance criteria validated manually

### ✅ Build & Deployment

- [ ] **Application builds successfully**: project builds without errors
- [ ] **No build warnings for new code**: Only pre-existing warnings acceptable
- [ ] **Application starts and runs**: project works correctly in development mode

### ✅ Documentation & Compliance

- [ ] **All acceptance criteria verified**: Each AC item explicitly tested and confirmed
- [ ] **All tasks/subtasks completed**: Every checkbox in Tasks section marked complete
- [ ] **File list updated**: All modified/created files documented in Dev Agent Record
- [ ] **Change log updated**: Story changes tracked with appropriate version bump

### ✅ Code Review Requirements

- [ ] **Self-review completed**: Dev agent has reviewed all changes
- [ ] **No obvious security issues**: No hardcoded secrets, proper validation, safe patterns
- [ ] **Performance considerations addressed**: No obvious performance regressions
- [ ] **Error handling implemented**: Proper error boundaries and user feedback

## Process Enforcement

**CRITICAL RULE**: If ANY item in this checklist is unchecked, the story status CANNOT be changed to "Done".

**For Dev Agents**: You MUST run project linting, type checking and all testing commands and verify they pass before marking any story "Ready for Review"
**For Junior Dev Agents**: You MUST run project linting, type checking and all testing commands and verify they pass before marking any story "Ready for Review by Senior"

**For Scrum Master**: Verify this checklist is completed during story review before accepting "Done" status.
