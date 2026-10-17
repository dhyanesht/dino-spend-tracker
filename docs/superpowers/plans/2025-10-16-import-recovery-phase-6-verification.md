# Phase 6 — Verification (Merged)

Includes original Task 12 plus review acceptance tests.

## Unit
- npm run lint, npm run test:unit pass.

## Integration (DB)
- RLS cross-user blocked.
- cleanup_import_batch atomicity, search_path=public.
- Constraints uniqueness/FK/check.

## Acceptance tests (from review)
- Repeated import no duplicates.
- Concurrent submissions.
- Ambiguous duplicates not auto-discarded.
- Partial failure recoverable.
- Interrupted client no duplicates on retry.
- Selective retry.
- Undo isolation.
- Edited transactions policy.
- Linked transfers handled.
- Audit preservation.
- Authorization.
- Storage cleanup.

Run npm run test. Commit.
