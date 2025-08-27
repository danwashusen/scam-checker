# Process Enforcement Guide

## Story Completion Process - MANDATORY WORKFLOW

### For Development Agents

**⚠️ CRITICAL RULE**: You CANNOT mark any story as "Done" until ALL Definition of Done checklist items are completed.

#### Step-by-Step Process:
1. **Complete all Tasks/Subtasks** in the story
2. **Run the mandatory verification sequence**:
   ```bash
   npm run lint && npm run type-check && npm test && npm run build
   ```
3. **ALL commands must pass with ZERO errors** before proceeding
4. **Complete the Definition of Done checklist** in the story document
5. **Update the File List** with all modified/created files
6. **Add completion notes** documenting any issues encountered
7. **Only then** change story status to "Done"

#### If ANY Verification Fails:
- **DO NOT** mark story as Done
- **FIX** the issues first
- **Re-run** the verification sequence
- **Only proceed** when all checks pass

### For Scrum Masters

**⚠️ VERIFICATION RESPONSIBILITY**: You must verify DoD compliance before accepting "Done" status.

#### Review Checklist:
1. **Verify Definition of Done section is complete** - all checkboxes marked
2. **Confirm verification commands were run** - look for evidence in completion notes
3. **Check that File List is updated** - should show all affected files
4. **Validate all Acceptance Criteria addressed** - each AC item should be tested
5. **Review completion notes** for any red flags or issues

### For QA Agents

**Your role is VALIDATION**, not initial DoD checking. By the time you see a story, DoD should already be complete.

#### QA Process:
1. **Verify story shows "Done" status** with complete DoD checklist
2. **Perform independent verification** of acceptance criteria
3. **Run your own testing** to validate functionality
4. **Document results** in QA Results section
5. **Flag any issues** that require story to be reopened

## Process Escalation

### If Dev Agent Marks Story Done Without DoD Completion:
1. **Scrum Master**: Immediately change status back to "InProgress"
2. **Document the issue** in story Change Log
3. **Require DoD completion** before allowing Done status again
4. **Consider process coaching** if pattern continues

### If Issues Found After "Done" Status:
1. **QA Agent**: Document findings in QA Results
2. **Scrum Master**: Evaluate if story needs to be reopened
3. **If reopening**: Change status to "InProgress" and document reasons
4. **Track rework** in story metrics for process improvement

## Quality Gates Summary

**Every story must pass these gates IN ORDER:**

1. ✅ **Development Complete** - All tasks/subtasks done
2. ✅ **Quality Verification** - All DoD checklist items complete
3. ✅ **Technical Validation** - All commands pass: lint, type-check, test, build
4. ✅ **Documentation Updated** - File list, completion notes, change log current
5. ✅ **Status Update** - Story marked "Done" only after above complete
6. ✅ **QA Validation** - Independent verification by QA Agent

**NO EXCEPTIONS TO THIS PROCESS**

## Commands Quick Reference

### Verification Sequence (MANDATORY before Done status):
```bash
npm run lint          # ESLint must pass with 0 errors
npm run type-check    # TypeScript must compile without errors  
npm test              # All tests must pass
npm run build         # Build must complete successfully
```

### Additional Testing Commands:
```bash
npm run test:unit         # Run unit tests only
npm run test:integration  # Run integration tests only
npm run test:e2e         # Run end-to-end tests
npm run test:coverage    # Generate coverage report
```

## Automation Opportunities

**Future Improvements:**
- GitHub pre-commit hooks to enforce lint/test passing
- Automated DoD checklist validation
- Story status automation based on verification results
- Quality metrics dashboard

This guide ensures consistent quality and prevents stories from being marked complete prematurely.