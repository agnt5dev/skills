---
name: agnt5-human-in-the-loop
description: Add durable human-in-the-loop pauses to an AGNT5 workflow with ctx.wait_for_user() (text, approval, select, multiselect) or agent-level AskUserTool/RequestApprovalTool. Use when a workflow needs human approval, input, or a choice before continuing, including replay-safety guidance for code that runs before a pause.
---

# AGNT5 Human-in-the-loop

`ctx.wait_for_user()` pauses a workflow durably mid-execution, shows a question to the user,
and resumes from that exact point once they respond — the pause survives worker restarts.

## `ctx.wait_for_user()` parameters

| Parameter | Default | Description |
|---|---|---|
| `question` | required | Text shown to the user |
| `input_type` | `"text"` | `"text"`, `"approval"`, `"select"`, or `"multiselect"` |
| `options` | `None` | List of `{"id": ..., "label": ...}` dicts (required for approval/select/multiselect) |
| `allow_custom` | `False` | Adds a free-text "Something else" option to select/multiselect |
| `skippable` | `False` | Adds a Skip button; returns `None` when skipped |

## Input types

```python
# text — free-form
name = await ctx.wait_for_user("What should we call this report?")

# approval — yes/no gate
decision = await ctx.wait_for_user(
    question="Deploy to production?", input_type="approval",
    options=[{"id": "approve", "label": "Approve"}, {"id": "reject", "label": "Reject"}],
)
if decision == "reject":
    return {"status": "cancelled"}

# select — single choice, returns the chosen id
fmt = await ctx.wait_for_user(
    question="Which output format?", input_type="select",
    options=[{"id": "pdf", "label": "PDF"}, {"id": "markdown", "label": "Markdown"}],
)

# multiselect — comma-separated string of chosen ids
topics = await ctx.wait_for_user(
    question="Which topics?", input_type="multiselect",
    options=[{"id": "market", "label": "Market"}, {"id": "tech", "label": "Tech"}],
)
selected = topics.split(",") if topics else []
```

`skippable=True` → handle `None`: `note = await ctx.wait_for_user(..., skippable=True); instructions = note or "default"`.
You can call `wait_for_user()` any number of times in one workflow, including inside `if`
blocks — each call gets its own pause index tracked correctly across replays.

## Replay safety (read before generating HITL code)

When `wait_for_user()` is called the first time, the workflow saves state and pauses. When
the user responds, AGNT5 re-runs the **entire workflow function from the top** — everything
before the pause executes again, but this time `wait_for_user()` finds the saved answer and
returns immediately instead of pausing.

```
First run:   generate_draft() → wait_for_user() → pauses
On resume:   generate_draft() → wait_for_user() → returns saved answer → publish()
```

**Rule: guard side effects, never guard the pause.**

```python
if not ctx._is_replay:
    ctx.logger.info("Draft ready, waiting for approval...")   # fires once, not twice

decision = await ctx.wait_for_user(   # never guard this call itself
    question=f"Approve this draft?\n\n{draft}", input_type="approval",
    options=[{"id": "approve", "label": "Approve"}, {"id": "discard", "label": "Discard"}],
)
```

Anything that must not repeat on resume — sending a notification, calling an external API,
charging a card — needs the `if not ctx._is_replay:` guard if it runs before a pause.

## Multi-step HITL with state

```python
name = await ctx.wait_for_user(question="What is your name?", input_type="text")
ctx.state.set("user_name", name)

role = await ctx.wait_for_user(
    question=f"Hi {name}, what is your role?", input_type="select",
    options=[{"id": "engineer", "label": "Engineer"}, {"id": "manager", "label": "Manager"}],
)
```

## Agent-level HITL tools

Let an agent itself ask a question or request approval mid-run. Both need a workflow context
(durable suspension requires it) — **instantiate inside the `@workflow` function**, not at
module level:

```python
from agnt5.tool import AskUserTool, RequestApprovalTool

@workflow
async def agent_with_hitl(ctx: WorkflowContext, task: str) -> dict:
    agent = Agent(
        name="assistant", model="openai/gpt-4o-mini",
        instructions="Ask for clarification when ambiguous. Request approval before changes.",
        tools=[AskUserTool(ctx), RequestApprovalTool(ctx)],
    )
    result = await agent.run(task, context=ctx)
    return {"response": result.output}
```

| Tool | Behavior |
|---|---|
| `AskUserTool(ctx)` | Agent calls `ask_user` with a question; workflow pauses for a text reply |
| `RequestApprovalTool(ctx)` | Agent calls `request_approval`; workflow pauses with Approve/Reject |

## Edge cases

- **`text` input with unexpected content**: returns whatever the user typed as a plain
  string — validate/convert yourself (`float(raw)` etc., catch `ValueError`).
- **Conditional pauses**: fine to put `wait_for_user()` inside an `if` — only the branch that
  actually executes gets a pause index, and that stays correct across replays.

## Source

- https://agnt5.com/docs/build/human-in-the-loop -- `ctx.wait_for_user()` parameters and all
  `input_type` values, multiple pauses per workflow, replay semantics
  (`if not ctx._is_replay:`), edge cases.
- https://agnt5.com/docs/build/tools (HITL tools section) -- `AskUserTool(ctx)`,
  `RequestApprovalTool(ctx)`, must be instantiated inside the `@workflow` function.
