---
name: agnt5-quality-cases
description: Track a behavior regression, eval failure, or production incident through AGNT5's structured quality-case lifecycle (open, triaged, investigating, candidate_ready, verified, shipped, closed), linked to the runs, scores, and datasets that produced it. Use when opening, updating, or resolving a quality issue.
---

# AGNT5 Quality Cases

A **quality case** tracks a behavior problem from discovery to resolution, linked directly to
the runs/scores/datasets/deployments already in AGNT5 — no separate issue tracker needed.
Open one when an online-eval alert fires (`agnt5-online-evals`), an experiment run regresses
(`agnt5-experiments`), or a production run fails unexpectedly. Studio: **Evaluate → Quality
cases**.

## Anatomy

| Field | Notes |
|---|---|
| `title`, `description` | Summary + detail |
| `category` | `behavior_quality`, `eval_regression`, `production_failure`, `deployment_health`, `runtime_infra`, `support_request`, `release_risk` |
| `severity` | `low`, `medium`, `high`, `critical` |
| `status` | See lifecycle below |
| `source_type` | `eval_run_item`, `eval_alert`, `runtime_run`, `guardrail_decision`, `deployment_failure`, `worker_health`, `runtime_cluster`, `manual`, `support_ticket` |
| `expected_behavior` / `observed_behavior` | What should have happened vs. what did |
| `labels` | Free-form tags |

## Lifecycle

```
open → triaged → investigating → candidate_ready → verified → shipped → closed
```

| Status | Meaning |
|---|---|
| `open` | Newly created, not reviewed |
| `triaged` | Severity/category confirmed |
| `investigating` | Root-cause analysis in progress |
| `candidate_ready` | A fix candidate is ready for eval |
| `verified` | Eval results confirm the fix works |
| `shipped` | Fix deployed to production |
| `closed` | Resolved or won't fix |

## Create

From Claude with the AGNT5 MCP server connected, prefer the
`create_quality_case`/`get_quality_case`/`list_quality_cases` tools instead of raw curl — no
token handling needed.

```bash
curl -X POST "https://api.agnt5.com/api/v1/projects/<project-id>/quality/cases" \
  -H "Authorization: Bearer <token>" -H "Content-Type: application/json" \
  -d '{
    "title": "Support agent cites wrong order status",
    "description": "Agent reported order as shipped when still processing for 3 of 50 eval items.",
    "category": "behavior_quality", "severity": "high", "source_type": "eval_run_item",
    "experiment_run_id": "<run-id>",
    "expected_behavior": "Agent returns current status from orders API",
    "observed_behavior": "Agent returned stale cached status",
    "labels": ["orders", "caching"]
  }'
```

Or Studio → **Evaluate → Quality cases → New case** (can link a run/experiment/alert at
creation time). Or from a failing experiment run: Studio run page → select failing items →
**Actions → Create quality case**. From Claude with AGNT5 connected, use the MCP tools
`create_quality_case` / `get_quality_case` / `list_quality_cases` directly — same fields as
the REST API.

## Update

```bash
curl -X PATCH "https://api.agnt5.com/api/v1/projects/<project-id>/quality/cases/<case-id>" \
  -H "Authorization: Bearer <token>" -H "Content-Type: application/json" \
  -d '{"status": "investigating", "description": "Root cause: prompt does not refresh order cache. Fixing in PR #42."}'
```

## List and filter

```bash
curl ".../quality/cases?status=open&severity=high" -H "Authorization: Bearer <token>"
curl ".../quality/cases?category=eval_regression" -H "Authorization: Bearer <token>"
curl ".../quality/cases?label=orders" -H "Authorization: Bearer <token>"
```

Combinable filters: `status`, `severity`, `category`, `source_type`, `label`.

## Verify a fix before shipping

Once a fix is `candidate_ready`, build a regression dataset from the failing items (see
`agnt5-experiments`):

```bash
agnt5 experiments runs regression-dataset <run-id> --name "order-status-regression" --start-run --wait
```

Then link it and move the case forward as the gate passes:

```bash
curl -X PATCH ".../quality/cases/<case-id>" -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" -d '{"status": "verified"}'
# ... and "shipped" after the fix deploys
```

Link a run item to an existing case directly:

```bash
curl -X POST ".../quality/cases/<case-id>/links" -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"link_type": "experiment_run_item", "link_id": "<run-item-id>"}'
```

## Audit trail

Every status change, note, or link auto-creates a case event. Add one explicitly:

```bash
curl -X POST ".../quality/cases/<case-id>/events" -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"event_type": "note_added", "note": "Confirmed stale cache reproduces on 10% of cold-start runs."}'
```

Event types: `note_added`, `investigation_added`, `candidate_linked`,
`release_evidence_linked`.

## Source

- https://agnt5.com/docs/improve/quality-cases -- case anatomy, categories, severities, lifecycle
  statuses, creating a case (Studio / REST / MCP tools `create_quality_case`/
  `get_quality_case`/`list_quality_cases`), updating, listing/filtering, building a regression
  dataset from a case, audit-trail events, source types.
