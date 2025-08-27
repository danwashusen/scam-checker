# Definition of Done Checklist

This checklist MUST be completed before any story can be marked as "Done". No exceptions.

## Code Quality Requirements

### ✅ Linting & Code Standards
- [ ] **ESLint passes with zero errors**: `npm run lint` shows no errors
- [ ] **TypeScript compiles without errors**: `npm run type-check` passes
- [ ] **Code follows project coding standards**: Follows patterns in `docs/architecture/coding-standards.md`
- [ ] **No console.log or debugging code left in production code**

### ✅ Testing Requirements
- [ ] **All existing tests still pass**: `npm test` passes completely
- [ ] **New unit tests written for new functionality**: Coverage maintained/improved
- [ ] **Integration tests updated if needed**: `npm run test:integration` passes
- [ ] **Test coverage meets minimum threshold**: `npm run test:coverage` shows adequate coverage
- [ ] **Manual testing completed**: All acceptance criteria validated manually

### ✅ Build & Deployment
- [ ] **Application builds successfully**: `npm run build` completes without errors
- [ ] **No build warnings for new code**: Only pre-existing warnings acceptable
- [ ] **Application starts and runs**: `npm run dev` works correctly

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

**For Dev Agents**: You MUST run these commands and verify they pass before marking any story complete:
```bash
npm run lint          # Must pass with 0 errors
npm run type-check    # Must pass with 0 errors  
npm test              # Must pass all tests
npm run build         # Must build successfully
```

**For Scrum Master**: Verify this checklist is completed during story review before accepting "Done" status.

## Enforcement Commands

Before marking ANY story as Done, run this verification sequence:

```bash
# Quality Gates - ALL must pass
npm run lint && npm run type-check && npm test && npm run build
```

If ANY command fails, story CANNOT be marked Done until issues are resolved.