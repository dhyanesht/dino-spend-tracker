# Import History, Recovery, and Audit Trail — Implementation Plan (Index)

This plan was reorganized into phases per review. Read phases in order.

| Phase | File |
|-------|------|
| 1. Audit existing implementation | [2025-10-16-import-recovery-phase-1-audit.md](./2025-10-16-import-recovery-phase-1-audit.md) |
| 2. Lifecycle and schema design | [2025-10-16-import-recovery-phase-2-design.md](./2025-10-16-import-recovery-phase-2-design.md) |
| 3. Safe processing | [2025-10-16-import-recovery-phase-3-processing.md](./2025-10-16-import-recovery-phase-3-processing.md) |
| 4. Audited undo | [2025-10-16-import-recovery-phase-4-undo.md](./2025-10-16-import-recovery-phase-4-undo.md) |
| 5. User experience | [2025-10-16-import-recovery-phase-5-ux.md](./2025-10-16-import-recovery-phase-5-ux.md) |
| 6. Verification | [2025-10-16-import-recovery-phase-6-verification.md](./2025-10-16-import-recovery-phase-6-verification.md) |

## Key decisions (from review)

- Undo preserves batch record and history (audit retention); batch not deleted.
- Simplified lifecycle: `processing`, `completed`, `partial`, `failed` (no `uploaded`/`interrupted`/`undone`).
- Idempotency enforced via DB constraints (idempotency key, row uniqueness), not frontend checks alone.
- Interrupted imports recoverable via persisted pending/failed rows + retry reconciliation.
- Source indicator in transaction details only, not every row.
- DB-level integration tests required; unit tests alone insufficient.
- Agent must inspect repository before assuming schema/hook signatures.
