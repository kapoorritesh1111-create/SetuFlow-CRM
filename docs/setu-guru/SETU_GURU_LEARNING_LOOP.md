# Setu Guru Learning Loop

_Last updated: 2026-05-06_

## Goal

Setu Guru should get better from real usage without becoming unsafe or inventing product behavior.

## Data to capture per question

| Field | Why it matters |
| --- | --- |
| `organization_id` | Detect organization-specific setup gaps. |
| `user_id` | Support follow-up and quality review. |
| `role` | Explain permission limitations accurately. |
| `route_path` | Make answers page-aware. |
| `question` | Identify repeated questions. |
| `retrieved_sources` | Audit which docs supported the answer. |
| `answer` | Review answer quality. |
| `feedback` | Measure helpfulness. |
| `resolution_status` | Track unresolved issues. |
| `created_at` | Trend issues over time. |

## Suggested Supabase table

```sql
create table if not exists setu_guru_feedback (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid null references organizations(id),
  user_id uuid null references auth.users(id),
  role text null,
  route_path text null,
  question text not null,
  retrieved_sources jsonb not null default '[]'::jsonb,
  answer text null,
  feedback text null check (feedback in ('helpful', 'not_helpful', 'missing_detail', 'wrong_route', 'outdated', 'unresolved')),
  resolution_status text not null default 'new' check (resolution_status in ('new', 'reviewing', 'doc_update_needed', 'resolved', 'dismissed')),
  reviewer_notes text null,
  created_at timestamptz not null default now()
);
```

## Review rhythm

- Daily during rollout: review unresolved and missing-detail items.
- Weekly after rollout: update knowledge docs for repeated misses.
- Monthly: audit old answers against current release changes.

## Quality metrics

| Metric | Target |
| --- | --- |
| Helpful rate | 80%+ |
| Wrong-route rate | Under 5% |
| Unresolved blocker rate | Under 10% |
| Missing-doc repeats | Zero repeated misses after doc update |

## Improvement workflow

1. User asks Setu Guru a question.
2. Bot answers with cited knowledge and route context.
3. User gives feedback.
4. Feedback goes to admin review queue.
5. Product/admin approves new or corrected knowledge.
6. Docs are updated and re-indexed.
7. Future answers use the updated source.

## Guardrail

Feedback can suggest a knowledge update, but it must not directly modify policy, pricing rules, roles, compliance logic, or order execution rules.
