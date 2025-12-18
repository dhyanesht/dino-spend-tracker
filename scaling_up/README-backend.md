# Spend Tracker Backend

## Overview

Serverless backend powered by Supabase, providing:
- PostgreSQL database with Row Level Security
- JWT-based authentication
- Edge Functions for custom logic
- Auto-generated REST API

## Architecture

```
┌─────────────────────────────────────────┐
│           Supabase Platform            │
├─────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────────┐  │
│  │   Auth      │  │  Edge Functions │  │
│  │  (GoTrue)   │  │     (Deno)      │  │
│  └─────────────┘  └─────────────────┘  │
│  ┌─────────────┐  ┌─────────────────┐  │
│  │  PostgREST  │  │   PostgreSQL    │  │
│  │  (REST API) │  │   (Database)    │  │
│  └─────────────┘  └─────────────────┘  │
└─────────────────────────────────────────┘
```

## Setup

### Prerequisites

- [Supabase CLI](https://supabase.com/docs/guides/cli)
- [Deno](https://deno.land/) (for local edge function development)
- Node.js 18+ (for tooling)

### Environment Variables

Create a `.env` file:

```env
SUPABASE_URL=https://oskhweltnnifpzxahyij.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
LOVABLE_API_KEY=<lovable-api-key>
```

### Database Setup

```bash
# Login to Supabase
supabase login

# Link to project
supabase link --project-ref oskhweltnnifpzxahyij

# Apply migrations
supabase db push

# Or run specific migration
supabase migration up
```

### Edge Functions

```bash
# Serve locally
supabase functions serve categorize-transactions --env-file .env

# Deploy to production
supabase functions deploy categorize-transactions

# View logs
supabase functions logs categorize-transactions
```

---

## API Reference

### Authentication

All endpoints require authentication via JWT token:

```http
Authorization: Bearer <access_token>
```

Get token via Supabase Auth:
```typescript
const { data: { session } } = await supabase.auth.getSession();
const token = session?.access_token;
```

### Base URL

```
https://oskhweltnnifpzxahyij.supabase.co
```

---

### Transactions API

#### List Transactions

```http
GET /rest/v1/transactions
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `select` | string | Columns to return |
| `order` | string | Sort order (e.g., `date.desc`) |
| `limit` | number | Max results (default: 1000) |
| `offset` | number | Pagination offset |
| `date` | string | Filter by date (e.g., `gte.2024-01-01`) |
| `category` | string | Filter by category |

**Example:**
```bash
curl -X GET \
  'https://oskhweltnnifpzxahyij.supabase.co/rest/v1/transactions?order=date.desc&limit=50' \
  -H 'Authorization: Bearer <token>' \
  -H 'apikey: <anon-key>'
```

**Response:**
```json
[
  {
    "id": "uuid",
    "user_id": "uuid",
    "description": "AMAZON.COM",
    "amount": 49.99,
    "category": "Online Shopping",
    "date": "2024-01-15",
    "type": "expense",
    "created_at": "2024-01-15T10:30:00Z"
  }
]
```

#### Create Transaction

```http
POST /rest/v1/transactions
```

**Request Body:**
```json
{
  "description": "Grocery Store",
  "amount": 75.50,
  "category": "Groceries",
  "date": "2024-01-15",
  "type": "expense"
}
```

**Response:** `201 Created`
```json
{
  "id": "new-uuid",
  "user_id": "user-uuid",
  ...
}
```

#### Update Transaction

```http
PATCH /rest/v1/transactions?id=eq.<uuid>
```

**Request Body:**
```json
{
  "category": "Restaurants"
}
```

#### Delete Transactions

```http
DELETE /rest/v1/transactions?id=in.(<uuid1>,<uuid2>)
```

---

### Categories API

#### List Categories

```http
GET /rest/v1/categories
```

**Filter Examples:**
```http
# Parent categories only
GET /rest/v1/categories?parent_category=is.null

# Subcategories only
GET /rest/v1/categories?parent_category=not.is.null

# Subcategories of specific parent
GET /rest/v1/categories?parent_category=eq.Food%20%26%20Dining
```

#### Create Category

```http
POST /rest/v1/categories
```

**Request Body:**
```json
{
  "name": "Coffee Shops",
  "type": "expense",
  "parent_category": "Food & Dining",
  "monthly_budget": 100,
  "color": "#8B4513"
}
```

---

### Edge Functions

#### Categorize Transactions

**Endpoint:** `POST /functions/v1/categorize-transactions`

**Purpose:** AI-powered automatic categorization of transactions.

**Request:**
```json
{
  "transactions": [
    {
      "description": "STARBUCKS #12345",
      "amount": 5.75,
      "date": "2024-01-15"
    }
  ],
  "categories": [
    { "name": "Coffee Shops", "parent": "Food & Dining" },
    { "name": "Restaurants", "parent": "Food & Dining" }
  ]
}
```

**Response:**
```json
{
  "categorizations": [
    {
      "description": "STARBUCKS #12345",
      "suggested_category": "Coffee Shops",
      "confidence": 0.95
    }
  ]
}
```

**Error Codes:**
| Code | Description |
|------|-------------|
| 400 | Invalid request format |
| 401 | Unauthorized |
| 429 | Rate limit exceeded |
| 500 | AI service error |

#### Seed Category Groups

**Endpoint:** `POST /functions/v1/seed-category-groups`

**Purpose:** Initialize default category groups for new users.

**Request:**
```json
{
  "user_id": "uuid"
}
```

---

## Database Schema

### Tables

| Table | Description |
|-------|-------------|
| `transactions` | User financial transactions |
| `categories` | Spending categories (hierarchical) |
| `category_groups` | Custom category groupings |
| `category_group_mappings` | Category ↔ Group relationships |
| `stores` | Store-to-category mappings |
| `user_roles` | Admin/user role assignments |

### Row Level Security

All tables have RLS enabled. Policies ensure:
- Users can only access their own data
- Admins can access all data (via `has_role` function)

---

## Deployment

### Automatic (Lovable)

Edge functions deploy automatically when code is pushed via Lovable.

### Manual

```bash
# Deploy all functions
supabase functions deploy

# Deploy specific function
supabase functions deploy categorize-transactions

# Apply database changes
supabase db push
```

### Environment Secrets

Set via Supabase Dashboard:
1. Go to Project Settings → Edge Functions
2. Add secrets: `LOVABLE_API_KEY`, etc.

Or via CLI:
```bash
supabase secrets set LOVABLE_API_KEY=<value>
```

---

## Monitoring

### Logs

```bash
# Edge function logs
supabase functions logs categorize-transactions --tail

# Database logs
# View in Supabase Dashboard → Logs
```

### Metrics

Available in Supabase Dashboard:
- API request counts
- Database query performance
- Edge function invocations
- Auth events

---

## Security Considerations

1. **Never expose service role key** in client code
2. **All tables have RLS** - data is isolated per user
3. **Input validation** via Zod schemas and DB constraints
4. **CORS headers** configured for edge functions
5. **JWT validation** on all protected endpoints
