# Requirements Specification

## Functional Requirements

| ID | Requirement | Priority | Module | Status |
|----|-------------|----------|--------|--------|
| FR-01 | CSV import with column mapping | P0 | Import | ✅ Implemented |
| FR-02 | Transaction CRUD operations | P0 | Transactions | ✅ Implemented |
| FR-03 | Category hierarchy (parent/child) | P0 | Categories | ✅ Implemented |
| FR-04 | User authentication (email/password) | P0 | Auth | ✅ Implemented |
| FR-05 | Monthly budget tracking | P1 | Budgets | ✅ Implemented |
| FR-06 | Spending trends visualization | P1 | Analytics | ✅ Implemented |
| FR-07 | Store-to-category mapping | P1 | Automation | ✅ Implemented |
| FR-08 | Category group aggregation | P2 | Analytics | ✅ Implemented |
| FR-09 | AI-powered categorization | P2 | Automation | ✅ Implemented |
| FR-10 | Duplicate transaction detection | P2 | Import | ✅ Implemented |
| FR-11 | Data export (JSON/CSV) | P2 | Export | ✅ Implemented |
| FR-12 | Year-over-year comparison | P2 | Analytics | ✅ Implemented |
| FR-13 | Bank API integration (Plaid) | P3 | Integration | 🔄 Partial |
| FR-14 | Custom date range filtering | P3 | Analytics | ❌ Not Started |
| FR-15 | Budget alerts/notifications | P3 | Notifications | ❌ Not Started |
| FR-16 | PDF report generation | P3 | Export | ❌ Not Started |
| FR-17 | Shared household accounts | P3 | Multi-user | ❌ Not Started |

---

## Non-Functional Requirements

### Performance

| ID | Requirement | Target | Current State | Test Method |
|----|-------------|--------|---------------|-------------|
| NFR-01 | Initial page load | < 2s | ~1.5s ✅ | Lighthouse |
| NFR-02 | API response time | < 500ms | ~300ms ✅ | Network timing |
| NFR-03 | Chart render time | < 1s | ~800ms ✅ | Performance API |
| NFR-04 | CSV parsing (1000 rows) | < 3s | ~2s ✅ | Manual test |

### Scalability

| ID | Requirement | Target | Current State | Gap |
|----|-------------|--------|---------------|-----|
| NFR-05 | Concurrent users | 1000+ | ~100 | Connection pooling needed |
| NFR-06 | Transactions per user | 100,000+ | 1000 (query limit) | Pagination needed |
| NFR-07 | Database size | 100GB+ | Limited by plan | Upgrade needed |

### Reliability

| ID | Requirement | Target | Current State | Gap |
|----|-------------|--------|---------------|-----|
| NFR-08 | Uptime SLA | 99.9% | ~99.5% | Multi-region needed |
| NFR-09 | Data backup | Daily | Supabase managed ✅ | - |
| NFR-10 | Recovery time | < 1 hour | Unknown | DR plan needed |

### Security

| ID | Requirement | Target | Current State | Gap |
|----|-------------|--------|---------------|-----|
| NFR-11 | Authentication | JWT-based | ✅ Supabase Auth | - |
| NFR-12 | Authorization | Row-level | ✅ RLS policies | - |
| NFR-13 | Data encryption | At rest & transit | Transit only | At-rest config needed |
| NFR-14 | Audit logging | All mutations | ❌ Not implemented | High priority |
| NFR-15 | Input validation | All endpoints | ✅ Zod schemas | - |

### Usability

| ID | Requirement | Target | Current State |
|----|-------------|--------|---------------|
| NFR-16 | Mobile responsive | Yes | ✅ Implemented |
| NFR-17 | Accessibility (WCAG) | AA | Partial |
| NFR-18 | Browser support | Chrome, Firefox, Safari, Edge | ✅ |
| NFR-19 | Offline support | Basic | ❌ Not implemented |

### Compliance

| ID | Requirement | Target | Current State | Gap |
|----|-------------|--------|---------------|-----|
| NFR-20 | GDPR data export | Article 20 | ❌ | Export endpoint needed |
| NFR-21 | GDPR data deletion | Article 17 | ❌ | Cascade delete needed |
| NFR-22 | Data retention policy | Configurable | ❌ | Policy definition needed |
| NFR-23 | Cookie consent | Required | ❌ | Banner needed |

---

## Acceptance Criteria Template

### FR-01: CSV Import

**Given** a logged-in user with a valid CSV file  
**When** they upload the file and map columns  
**Then** transactions are created with correct data  
**And** the dashboard updates to reflect new transactions  
**And** duplicate warnings are shown if applicable

### FR-05: Monthly Budget Tracking

**Given** a user has set a budget for a category  
**When** they view the budget tab  
**Then** they see current spending vs budget  
**And** visual indicators show over/under budget status  
**And** percentage completion is displayed
