---
name: review-task
description: Self-review the current task's diff against its card and project rules before finishing. Use whenever the user types /review-task, "review this", "check my work", "did we miss anything", or before /finish-task on any non-trivial task. Produces a checklist with evidence and flags scope creep, permission gaps, and test weakening.
---

# Review the task

Run `git diff` (staged + unstaged) and read the task card. Then produce:

## 1. Acceptance criteria table
| Criterion | Met? | Evidence |

## 2. Scope check
List every changed file. Mark any not required by the card as **OUT OF SCOPE** and recommend revert or an IDEAS.md entry.

## 3. Project-rule check (answer each explicitly)
- Permissions: every new/changed endpoint has an explicit permission class and assignment scoping in `get_queryset`? Tests for wrong role and unassigned patient exist?
- Audit: writes to patient data call the audit helper?
- Offline models: new patient-created models have UUID pk, `device_updated_at`, `idempotency_key`, and are in the sync push allowlist only if intended?
- Patient copy: all new strings are i18n keys; no numbers/percentages/levels shown to patients; supportive tone; no "wrong/error/failed".
- Design system: touch targets ≥ 64px, tokens only, one primary action, fixed nav.
- Tests: any `skip`/`xfail`/loosened assertions? Any `except: pass`? Any test asserting a set of status codes?
- Migrations present and clean?
- Secrets: nothing hard-coded?
- No auto-generated diagnosis language anywhere.

## 4. Risks
Up to 3 things the mentor should look at closely, with file:line.

## 5. Verdict
`READY` or `NOT READY — fix: …`. If NOT READY, fix the items and re-run the review.
