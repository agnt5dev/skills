---
name: agnt5-workflows
description: Define AGNT5 functions and workflows - @function with retries, backoff, and timeouts; durable workflow steps via ctx.step(), parallel/gather/batch/map fan-out, durable sleep, run/session state, and event or webhook triggers. Use when wrapping a unit of work in a retryable/timeout-bound function, adding or restructuring workflow orchestration logic, composing functions and agents into a pipeline, or making an existing flow durable/checkpointed.
---

# AGNT5 Workflows

A **workflow** is a durable orchestrator: if it crashes mid-run, it restarts and resumes from
the last completed step instead of starting over. A **function** is the stateless unit of
work a workflow checkpoints around.

## Defining a workflow

```python
from agnt5 import workflow, WorkflowContext

@workflow
async def onboarding_workflow(ctx: WorkflowContext, user_email: str) -> dict:
    account = await ctx.step(create_account, user_email)
    await ctx.step(send_welcome_email, account["id"])
    return {"status": "done", "account_id": account["id"]}
```

First parameter must be `ctx: WorkflowContext`; everything after is the input the caller
passes. `@workflow(name=..., triggers=[...])` accepts an explicit `name` (defaults to the
function name) and event/webhook `triggers`.

## Defining a function

```python
from agnt5 import function, FunctionContext

@function(name="send_email", retries=3, backoff="exponential", timeout_ms=10000)
async def send_email(ctx: FunctionContext, to: str, subject: str, body: str) -> str:
    ctx.logger.info("Sending email", to=to, attempt=ctx.attempt)
    return f"Sent to {to}"
```

`@function` parameters: `name`, `retries` (`int | RetryPolicy`), `backoff`
(`"constant" | "linear" | "exponential"`), `timeout_ms`. `FunctionContext` gives you
`ctx.run_id`, `ctx.attempt` (0 = first try), `ctx.logger`, `ctx.sleep(seconds)`. Sync
functions are auto-wrapped in a thread pool.

## Steps: the unit of durable work

Use `ctx.step()` to call a `@function` from inside a workflow. The result is checkpointed
after the first successful run — on replay, the cached result returns immediately and the
function does **not** run again.

| Call style | Checkpointed | Use when |
|---|---|---|
| `await ctx.step(fn, *args)` | Yes | Always, inside a workflow |
| `await fn(ctx, *args)` | No | One-off calls where replay re-running is fine |

> `ctx.task()` is **deprecated** — if you see it in older example code, replace it with
> `ctx.step()`.

```python
@workflow
async def order_workflow(ctx: WorkflowContext, order_id: str) -> dict:
    order = await ctx.step(validate_order, order_id)
    if not order["valid"]:
        return {"status": "invalid", "order_id": order_id}

    # Checkpointed: never charged twice even if the workflow restarts here
    charge = await ctx.step(charge_customer, order_id, order["total"])
    await ctx.step(send_confirmation, order_id, charge["charge_id"])
    return {"status": "complete", "order_id": order_id, "charge_id": charge["charge_id"]}
```

## Running in parallel

| Method | Use when… |
|---|---|
| `ctx.parallel(*tasks)` | Small fixed number of independent stages (2-5); results come back in call order |
| `ctx.gather(**tasks)` | Same as `parallel()` but you want results addressable by name |
| `ctx.batch(func, items, max_concurrency=10)` | Many items (10+), need concurrency control and per-item error handling |
| `ctx.map(func, items, max_concurrency=10)` | Like `batch()` but you only need the outputs and want to fail-fast |

```python
# parallel — positional, ordered
sales, inventory, customers = await ctx.parallel(
    ctx.step(fetch_sales, report_id),
    ctx.step(fetch_inventory, report_id),
    ctx.step(fetch_customers, report_id),
)

# gather — named
data = await ctx.gather(
    revenue=fetch_revenue(),
    users=fetch_active_users(),
)
# data["revenue"], data["users"]

# batch — many items, controlled concurrency, partial failure tolerant
result = await ctx.batch(
    process_document,
    [{"doc_id": d} for d in doc_ids],
    max_concurrency=20,
    continue_on_failure=True,
    timeout_per_item=30.0,
)
# result.stats.completed_items, result.stats.failed_items, result.outputs

# map — simpler wrapper, raises on any failure
outputs = await ctx.map(process_document, [{"doc_id": d} for d in doc_ids])
```

## Durable sleep

`ctx.sleep(seconds, name=...)` pauses the workflow and survives restarts — if the worker
crashes mid-wait, it resumes and sleeps only for the remaining time (unlike `asyncio.sleep`).

```python
await ctx.step(send_confirmation, user_id)
await ctx.sleep(24 * 60 * 60, name="wait_24h")
await ctx.step(send_follow_up, user_id)
```

## State

| Scope | Access | Persists |
|---|---|---|
| Run | `ctx.state` | Current run only, cleared when the run finishes |
| Session | `ctx.session.state` | Across multiple runs sharing the same `session_id` |

```python
await ctx.state.set("phase", "started")
count = await ctx.session.state.get("visit_count", 0)
await ctx.session.state.set("visit_count", count + 1)
```

## Triggers

```python
from agnt5.types import event, webhook

@workflow(triggers=[event("user.signed_up")])
async def welcome_workflow(ctx: WorkflowContext, user_id: str) -> str: ...

@workflow(triggers=[webhook("stripe", event="payment_intent.succeeded")])
async def payment_workflow(ctx: WorkflowContext, amount: int, currency: str) -> str: ...
```

For full webhook setup (signature verification, provider event names, idempotency), use the
`agnt5-webhooks-integrations` skill. For pausing a workflow on `ctx.wait_for_user()`, use the
`agnt5-human-in-the-loop` skill.

## Common mistake to avoid

Calling a `@function` directly (`await fn(ctx, ...)`) instead of through `ctx.step()` inside
a workflow — it silently loses checkpointing and re-runs on every replay. Always use
`ctx.step()` for anything that must not repeat (charges, emails, external side effects).

## Source

- https://agnt5.com/docs/build/workflows -- `@workflow`, `ctx.step()`,
  `ctx.parallel()`/`ctx.gather()`/`ctx.batch()`/`ctx.map()`, `ctx.sleep()`, run/session state,
  event and webhook triggers.
- https://agnt5.com/docs/build/functions -- `@function`, retries, backoff, timeouts,
  `FunctionContext`.

Cross-check currency before trusting anything beyond this: https://agnt5.com/docs/build/workflows/defining-a-workflow
is an older, stale duplicate of https://agnt5.com/docs/build/workflows -- ignore it in favor
of the latter.
