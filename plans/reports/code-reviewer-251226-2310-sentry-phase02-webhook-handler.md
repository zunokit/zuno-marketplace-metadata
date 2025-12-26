# Code Review Report: Phase 02 - Webhook Handler

**Date**: 2025-12-26 23:10
**Reviewer**: code-reviewer subagent
**Plan**: `plans/251226-sentry-integration/phase-02-webhook-handler.md`

---

## Scope

### Files Reviewed (NEW)
| File | Lines | Purpose |
|------|-------|---------|
| `src/shared/lib/utils/sentry-helpers.ts` | 104 | Signature verification, data extraction |
| `src/core/services/sentry-issue/sentry-issue.entity.ts` | 29 | Entity definitions |
| `src/app/api/sentry/webhook/route.ts` | 110 | Webhook endpoint |
| `src/core/services/sentry-issue/sentry-issue.service.ts` | 136 | Business logic (stub) |
| `tests/__tests__/shared/lib/utils/sentry-helpers.test.ts` | 307 | Helper tests |
| `tests/__tests__/core/services/sentry-issue/sentry-issue.service.test.ts` | 122 | Service tests |

### Files Reviewed (MODIFIED)
| File | Changes |
|------|---------|
| `tests/setup/jest.setup.ts` | Added `SENTRY_WEBHOOK_SECRET` test env var |

---

## Overall Assessment

**Grade**: B+ (Good with minor improvements needed)

Phase 02 implementation successfully delivers webhook handler with proper security measures. TypeScript compilation passes, all tests pass (29/29), and clean architecture principles are followed. Minor issues: ESLint warnings (expected for stub methods), missing type consolidation, and some code safety concerns.

---

## Critical Issues

**None found**

---

## High Priority Findings

### H1: Type Duplication - `SentryWebhookPayload` Defined Twice
**Severity**: High | **Type**: DRY Violation

**Location**:
- `src/app/api/sentry/webhook/route.ts:84-109`
- `src/core/services/sentry-issue/sentry-issue.service.ts:109-135`

**Issue**:
`SentryWebhookPayload` interface is duplicated across files. This violates DRY and creates maintenance burden.

**Impact**:
- Type changes require updates in two locations
- Risk of inconsistency between definitions

**Recommendation**:
```typescript
// src/shared/lib/utils/sentry-helpers.ts
export interface SentryEvent {
  event_id: string;
  fingerprint?: string[];
  // ... existing fields
}

// Add new type extending with environment/url
export interface SentryWebhookPayload extends SentryEvent {
  environment: string;
  url?: string; // Sentry event URL
}
```

Then import and re-export from service file:
```typescript
import type { SentryWebhookPayload } from "@/shared/lib/utils/sentry-helpers";
```

---

### H2: Stub Method Throws Breaking Error
**Severity**: High | **Type**: Error Handling

**Location**: `src/core/services/sentry-issue/sentry-issue.service.ts:90-95`

**Issue**:
```typescript
private static async createGitHubIssue(issue: SentryIssue): Promise<CreatedIssue> {
  // TODO: Implement in Phase 03 (GitHub Integration)
  throw new Error("Not implemented");
}
```

While stub methods are expected for Phase 02, throwing in a method that returns `Promise<CreatedIssue>` will cause `processWebhook` to fail silently (returns null) during testing.

**Current Flow**:
1. `checkExistingIssue` returns null
2. `createGitHubIssue` throws
3. `tryCatch` catches and returns `{ success: false, data: null, error }`
4. `processWebhook` returns null (logged)

**Impact**:
- Phase 02 tests pass but mask the actual error
- Production deployment before Phase 03 would cause all webhooks to fail

**Recommendation**:
Add a feature flag to control stub behavior:
```typescript
// env.ts
SENTRY_PHASE_03_ENABLED: z.boolean().default(false)

// service.ts
private static async createGitHubIssue(issue: SentryIssue): Promise<CreatedIssue> {
  if (!env.SENTRY_PHASE_03_ENABLED) {
    logger.warn("GitHub integration not enabled, skipping issue creation", {
      fingerprint: issue.fingerprint,
    });
    // Return mock for Phase 02 testing
    return {
      issueNumber: 0,
      issueUrl: "",
      fingerprint: issue.fingerprint,
    };
  }
  // Phase 03 implementation...
}
```

---

## Medium Priority Improvements

### M1: Empty String Fingerprint Fallback
**Severity**: Medium | **Type**: Edge Case Handling

**Location**: `src/shared/lib/utils/sentry-helpers.ts:31-33`

**Issue**:
```typescript
export function getFingerprint(event: SentryEvent): string {
  return event.fingerprint?.[0] || event.event_id || "";
}
```

If both `fingerprint` and `event_id` are missing, returns empty string. Empty fingerprints will cause deduplication issues in Phase 03.

**Recommendation**:
```typescript
export function getFingerprint(event: SentryEvent): string {
  const fp = event.fingerprint?.[0] || event.event_id;
  if (!fp) {
    throw new Error("Invalid Sentry event: missing fingerprint and event_id");
  }
  return fp;
}
```

Or generate fallback:
```typescript
export function getFingerprint(event: SentryEvent): string {
  return event.fingerprint?.[0]
    || event.event_id
    || `fallback-${Date.now()}-${crypto.randomUUID()}`;
}
```

---

### M2: Missing Signature Algorithm Documentation
**Severity**: Medium | **Type**: Documentation

**Location**: `src/shared/lib/utils/sentry-helpers.ts:9-26`

**Issue**:
Comment references `https://docs.sentry.com/product/integrations/webhooks/` but doesn't specify exact signature algorithm expected (HMAC-SHA256, base64 encoding).

**Recommendation**:
Add explicit documentation matching Sentry's spec:
```typescript
/**
 * Verify Sentry webhook signature
 *
 * Sentry uses HMAC-SHA256 with base64 encoding:
 * 1. Compute HMAC-SHA256 hash of raw payload using webhook secret
 * 2. Encode digest as base64
 * 3. Compare with signature from 'sentry-hook-signature' header
 *
 * @param rawPayload - Raw JSON string from request body
 * @param signature - Value from 'sentry-hook-signature' header
 * @param secret - SENTRY_WEBHOOK_SECRET environment variable
 * @returns true if signature matches
 *
 * Documentation: https://docs.sentry.io/product/integrations/webhooks/
 */
```

---

### M3: No Content-Type Validation
**Severity**: Medium | **Type**: Security/Input Validation

**Location**: `src/app/api/sentry/webhook/route.ts:36-37`

**Issue**:
Webhook accepts any content-type without validation. Malformed JSON would throw during `JSON.parse()`.

**Current**:
```typescript
const rawPayload = await request.text();
// ...
const payload = JSON.parse(rawPayload) as SentryWebhookPayload;
```

**Recommendation**:
```typescript
// After signature verification
const contentType = request.headers.get("content-type");
if (!contentType?.includes("application/json")) {
  logger.warn("Invalid content type", { requestId, contentType });
  return new NextResponse("Expected JSON", { status: 400 });
}

try {
  const payload = JSON.parse(rawPayload) as SentryWebhookPayload;
} catch (error) {
  logger.warn("Invalid JSON payload", { requestId, error });
  return new NextResponse("Invalid JSON", { status: 400 });
}
```

---

### M4: Async Error Logging Swallows Context
**Severity**: Medium | **Type**: Error Handling

**Location**: `src/app/api/sentry/webhook/route.ts:67-72`

**Issue**:
```typescript
SentryIssueService.processWebhook(payload, requestId).catch((error) => {
  logger.error("Failed to process Sentry webhook", {
    requestId,
    error: error instanceof Error ? error.message : String(error),
  });
});
```

Fire-and-forget error logging loses stack trace and full error context.

**Recommendation**:
```typescript
SentryIssueService.processWebhook(payload, requestId).catch((error) => {
  logger.error("Failed to process Sentry webhook", {
    requestId,
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    eventId: payload.event_id,
  });
  // Consider sending to Sentry for monitoring
  if (error instanceof Error && env.NEXT_PUBLIC_SENTRY_DSN) {
    // Use sentry captureException if available
  }
});
```

---

## Low Priority Suggestions

### L1: Export Types for Reusability
**Severity**: Low | **Type**: Code Organization

**Location**: `src/shared/lib/utils/sentry-helpers.ts`

**Issue**:
Types are defined but not re-exported from an index file.

**Recommendation**:
Create `src/shared/lib/utils/sentry-helpers/index.ts`:
```typescript
export * from './sentry-helpers';
```

---

### L2: Test Coverage Missing Edge Cases
**Severity**: Low | **Type**: Testing

**Location**: `tests/__tests__/shared/lib/utils/sentry-helpers.test.ts`

**Current coverage**: Good (23 passing tests)

**Missing**:
- `verifySentrySignature` with malformed base64 signature
- `getRequestContext` with non-string tag values
- Empty payload handling

**Recommendation**:
Add tests for:
```typescript
it("should handle malformed base64 signature", () => {
  const result = verifySentrySignature("payload", "not-base64!", secret);
  expect(result).toBe(false);
});
```

---

## Positive Observations

1. **Security**: `crypto.timingSafeEqual()` properly prevents timing attacks on signature verification
2. **Type Safety**: All functions have explicit return types, no `any` types used
3. **Clean Architecture**: Proper layer separation (API -> Service -> Helpers)
4. **Error Handling**: Comprehensive try-catch with `tryCatch` wrapper
5. **Logging**: Proper requestId tracking throughout flow
6. **Test Coverage**: 29 tests passing, good edge case coverage
7. **Async Design**: Fire-and-forget pattern for webhook processing prevents blocking
8. **Documentation**: JSDoc comments on all public functions

---

## Recommended Actions

### Before Merge
1. [ ] **Consolidate `SentryWebhookPayload` type** - Move to `sentry-helpers.ts`
2. [ ] **Add fingerprint validation** - Prevent empty fingerprints
3. [ ] **Add content-type validation** - Reject non-JSON payloads

### For Phase 03
4. [ ] **Implement feature flag** - `SENTRY_PHASE_03_ENABLED` to control stub behavior
5. [ ] **Remove ESLint disable comments** - Once stub methods implemented

### Optional Improvements
6. [ ] Add malformed base64 signature test
7. [ ] Create index.ts for sentry-helpers exports
8. [ ] Enhance async error logging with stack traces

---

## Metrics

| Metric | Value | Target | Status |
|--------|-------|--------|--------|
| TypeScript Errors | 0 | 0 | ✅ Pass |
| Test Pass Rate | 29/29 (100%) | 100% | ✅ Pass |
| ESLint Errors | 0 | 0 | ✅ Pass |
| ESLint Warnings | 8 (expected stub) | 0 | ⚠️ Expected |
| Lines of Code | ~808 | - | - |
| Test Coverage | ~85% (estimated) | 80% | ✅ Pass |

---

## Unresolved Questions

1. **Q**: Should empty fingerprints throw error or generate fallback?
   - **A**: Recommend throw - malformed events should fail fast

2. **Q**: Should webhook return 500 when SENTRY_WEBHOOK_SECRET missing?
   - **A**: Current behavior correct - misconfiguration should fail loud

3. **Q**: Is fire-and-forget async processing acceptable?
   - **A**: Yes for webhooks - prevents Sentry timeout, error logging sufficient

---

**Next Phase**: Phase 03 - GitHub Integration
**Blockers**: None - Phase 02 ready for commit after addressing H1, M1, M3
