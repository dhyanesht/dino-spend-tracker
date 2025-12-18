# Feature Backlog

## Priority Definitions

| Priority | Definition | Timeline |
|----------|------------|----------|
| **P0** | Critical - MVP, blocks launch | Sprint 1-2 |
| **P1** | High - Core functionality | Sprint 3-4 |
| **P2** | Medium - Enhanced experience | Sprint 5-8 |
| **P3** | Low - Nice to have | Backlog |

---

## P0 - Critical (MVP) ✅ Complete

### Authentication Module

| Feature | Description | Status | Effort |
|---------|-------------|--------|--------|
| Email/password signup | Create account with email verification | ✅ | 3 pts |
| Email/password login | Authenticate existing users | ✅ | 2 pts |
| Session management | Persist and refresh JWT tokens | ✅ | 2 pts |
| Logout | Clear session and redirect | ✅ | 1 pt |
| Protected routes | Redirect unauthenticated users | ✅ | 2 pts |

### Transactions Module

| Feature | Description | Status | Effort |
|---------|-------------|--------|--------|
| Create transaction | Manual entry form | ✅ | 3 pts |
| View transactions | Sortable, filterable list | ✅ | 5 pts |
| Edit transaction | Inline or dialog editing | ✅ | 3 pts |
| Delete transactions | Single and bulk delete | ✅ | 2 pts |
| Transaction validation | Zod schema validation | ✅ | 2 pts |

### Categories Module

| Feature | Description | Status | Effort |
|---------|-------------|--------|--------|
| Create category | Name, type, color, budget | ✅ | 3 pts |
| Subcategories | Parent-child hierarchy | ✅ | 3 pts |
| Edit category | Update properties | ✅ | 2 pts |
| Delete category | With orphan handling | ✅ | 2 pts |
| Default categories | Seed common categories | ✅ | 2 pts |

### Import Module

| Feature | Description | Status | Effort |
|---------|-------------|--------|--------|
| CSV file upload | Drag-drop or file picker | ✅ | 2 pts |
| CSV parsing | Client-side parsing | ✅ | 3 pts |
| Column mapping | User-defined field mapping | ✅ | 5 pts |
| Preview & confirm | Review before import | ✅ | 3 pts |

### UI Module

| Feature | Description | Status | Effort |
|---------|-------------|--------|--------|
| Responsive layout | Mobile-first design | ✅ | 5 pts |
| Dashboard overview | Summary cards and charts | ✅ | 5 pts |
| Tab navigation | Desktop tabs, mobile bottom bar | ✅ | 3 pts |
| Loading states | Skeletons and spinners | ✅ | 2 pts |
| Error handling | Toast notifications | ✅ | 2 pts |

---

## P1 - High Priority ✅ Complete

### Analytics Module

| Feature | Description | Status | Effort |
|---------|-------------|--------|--------|
| Monthly trends chart | Line chart of spending over time | ✅ | 5 pts |
| Category comparison | Bar chart comparing categories | ✅ | 5 pts |
| Spending insights | AI-generated or calculated insights | ✅ | 3 pts |

### Budgets Module

| Feature | Description | Status | Effort |
|---------|-------------|--------|--------|
| Set category budget | Monthly budget per category | ✅ | 3 pts |
| Budget vs actual | Visual comparison | ✅ | 5 pts |
| Budget progress | Percentage and remaining | ✅ | 2 pts |

### Automation Module

| Feature | Description | Status | Effort |
|---------|-------------|--------|--------|
| Store mappings | Merchant → Category rules | ✅ | 5 pts |
| Auto-categorize | Apply rules on import | ✅ | 3 pts |

---

## P2 - Medium Priority ✅ Mostly Complete

### Analytics Module (Enhanced)

| Feature | Description | Status | Effort |
|---------|-------------|--------|--------|
| Year-over-year comparison | Compare to previous year | ✅ | 5 pts |
| Category groups | Aggregate multiple categories | ✅ | 8 pts |
| Budget performance chart | Visual budget adherence | ✅ | 5 pts |

### Automation Module (Enhanced)

| Feature | Description | Status | Effort |
|---------|-------------|--------|--------|
| AI categorization | LLM-powered suggestions | ✅ | 8 pts |
| Duplicate detection | Flag potential duplicates | ✅ | 5 pts |

### Export Module

| Feature | Description | Status | Effort |
|---------|-------------|--------|--------|
| Export categories (JSON) | Backup/restore categories | ✅ | 3 pts |
| Import categories (JSON) | Restore from backup | ✅ | 3 pts |

---

## P3 - Nice to Have (Backlog)

### Integration Module

| Feature | Description | Status | Effort |
|---------|-------------|--------|--------|
| Plaid bank connection | Automatic transaction sync | 🔄 Partial | 13 pts |
| Plaid account selection | Choose accounts to sync | ❌ | 5 pts |
| Recurring sync | Scheduled transaction fetch | ❌ | 8 pts |

### Analytics Module (Advanced)

| Feature | Description | Status | Effort |
|---------|-------------|--------|--------|
| Custom date ranges | User-defined periods | ❌ | 5 pts |
| Savings goals | Track progress to goals | ❌ | 8 pts |
| Spending forecasts | ML-based predictions | ❌ | 13 pts |

### Notifications Module

| Feature | Description | Status | Effort |
|---------|-------------|--------|--------|
| Budget alerts | Email when over budget | ❌ | 5 pts |
| Weekly summary | Scheduled email digest | ❌ | 8 pts |
| Push notifications | Browser push for alerts | ❌ | 5 pts |

### Export Module (Advanced)

| Feature | Description | Status | Effort |
|---------|-------------|--------|--------|
| PDF reports | Formatted monthly reports | ❌ | 8 pts |
| CSV export | Export filtered transactions | ❌ | 3 pts |
| API export | Programmatic data access | ❌ | 5 pts |

### Multi-user Module

| Feature | Description | Status | Effort |
|---------|-------------|--------|--------|
| Shared households | Multiple users, one budget | ❌ | 13 pts |
| Permission levels | Admin, editor, viewer | ❌ | 8 pts |
| Activity feed | See household changes | ❌ | 5 pts |

---

## Sprint Planning (Suggested)

### Sprint 9-10: Integration Focus
- Complete Plaid integration
- Add recurring sync

### Sprint 11-12: Analytics Enhancement
- Custom date ranges
- Savings goals

### Sprint 13-14: Communication
- Budget alerts
- Weekly summaries

### Sprint 15-16: Enterprise Features
- Audit logging
- GDPR compliance
- Multi-tenant architecture
