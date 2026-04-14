---
name: agnt5-ai-templates
description: Generate AGNT5 workflow templates from a blueprint description. Use when the user asks to create a new AGNT5 template, scaffold a new agent workflow, or build a new worker project with agents, functions, and workflows.
---

# AGNT5 Template Generation Guide

This file is a skill reference for Claude Code. When asked to create a new AGNT5 template, follow this guide precisely — **do not ask the user to point at a reference template again**.

---

## Template Directory Structure

Every template lives in its own directory at the root of this repo:

```
<template-name>/
├── app.py                          # Worker entry point (required)
├── pyproject.toml                  # Python project & dependencies (required)
├── agnt5.yaml                      # AGNT5 worker config (required)
├── .env.example                    # Environment variable template (required)
├── README.md                       # Usage docs (required)
└── src/
    └── <package_name>/
        ├── __init__.py             # Package exports
        ├── agents.py               # Agent definitions
        ├── workflows.py            # Workflow definition(s)
        ├── functions.py            # Stage functions
        └── tools.py                # Custom tools (if needed)
```

- **Package name** = template name in snake_case (e.g. `blog_creation`)
- **Template directory name** = template name in snake_case (e.g. `blog_creation`)

---

## Key Files — Boilerplate & Patterns

### `pyproject.toml`

```toml
[project]
name = "<template-name>-agnt5"
version = "1.0.0"
description = "<one-line description>"
requires-python = ">=3.11"

dependencies = [
    "agnt5>=0.4.2a2",
    "requests>=2.31.0",
    "beautifulsoup4>=4.12.0",
    "python-dotenv>=1.2.1",
]

[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"

[tool.hatch.build.targets.wheel]
packages = ["src/<package_name>"]

[tool.pytest.ini_options]
testpaths = ["tests"]
asyncio_mode = "auto"

[tool.black]
line-length = 100

[tool.ruff]
line-length = 100
target-version = "py311"
```

### `agnt5.yaml`

```yaml
name: agnt5-<template-name>
language: python
language_version: "3.11"
environment: development
variables: {}
worker:
  command: "uv run --no-sync python app.py"
```

### `.env.example`

```
# <Template Name> — Environment Variables
# Copy to .env and fill in your values

OPENAI_API_KEY="your-openai-api-key-here"

```

---

## Tool Definition Pattern (`tools.py`)

> Only create this file if agents need to call external APIs or perform actions outside their built-in knowledge. If no tools are needed, omit this file entirely.

```python
from agnt5 import tool, Context

@tool(auto_schema=True)
async def my_tool(ctx: Context, param: str) -> str:
    """One-line description of what this tool does."""
    # implementation
    return result

__all__ = ["my_tool"]
```

---

## Agent Definition Pattern (`agents.py`)

```python
from agnt5 import Agent
from <package_name>.tools import some_tool  # only if the agent uses tools

agent_prompt = """You are <AgentName>, <one-line role>.

Your responsibilities:
1. ...
2. ...

Output format:
LABEL:
[structured output]

Always start your response with "LABEL:" …"""

my_agent = Agent(
    name="AgentName",
    model="openai/gpt-4o-mini",   # or "anthropic/claude-haiku-4-5-20251001"
    instructions=agent_prompt,
    tools=[some_tool],            # omit if no tools needed
    max_tokens=8192,
    temperature=0.7,              # 0.0–1.0, default 0.7 (omit to use default)
    max_iterations=10,            # max reasoning loops, default 10 (omit to use default)
)

__all__ = ["my_agent"]
```

**Model options:**
| Model string | Use case |
|---|---|
| `openai/gpt-4o-mini` | Default — fast and cheap |
| `anthropic/claude-haiku-4-5-20251001` | Claude — fast |
| `anthropic/claude-sonnet-4-6` | Claude — balanced quality |
| `anthropic/claude-opus-4-6` | Claude — highest quality |
| `deepseek/deepseek-chat` | DeepSeek — fast and cheap (use when user requests DeepSeek) |
| `deepseek/deepseek-reasoner` | DeepSeek — chain-of-thought reasoning, ideal for math/science/coding |
| `mistral/mistral-small-latest` | Mistral — fast and efficient (use when user requests Mistral) |
| `openrouter/openai/gpt-4o-mini` | OpenRouter — routes to GPT-4o-mini (use when user requests OpenRouter) |
| `xai/grok-beta` | xAI Grok — general purpose (use when user requests xAI or Grok) |
| `xai/grok-2` | xAI Grok 2 — higher capability (use when user requests xAI or Grok with quality priority) |
| `groq/llama-3.3-70b-versatile` | Groq — ultra-fast inference (use when user requests Groq) |
| `google/gemini-2.0-flash` | Google Gemini — fast and cost-effective (use when user requests Google or Gemini) |
| `google/gemini-1.5-pro` | Google Gemini — higher capability (use when user requests Gemini with quality priority) |

---

## Agent Handoff Pattern (`agents.py`)

Handoffs let one agent delegate control to another specialized agent. The handoff is exposed to the LLM as a tool named `transfer_to_{agent_name}`.

> **Default: no handoffs.** Only add handoffs when the blueprint calls for a coordinator/router agent that dispatches to specialist agents based on the request type.

### Simple usage — pass agent directly (auto-wrapped with defaults)

```python
from agnt5 import Agent

specialist_agent = Agent(name="specialist", model="openai/gpt-4o-mini", instructions="...")

coordinator_agent = Agent(
    name="coordinator",
    model="openai/gpt-4o-mini",
    instructions="...",
    handoffs=[specialist_agent],   # auto-converted to Handoff with defaults
    max_tokens=8192,
)
```

### Advanced usage — `Handoff` / `handoff()` for custom config

```python
from agnt5 import Agent, handoff
# or: from agnt5.agent.handoff import Handoff

research_agent = Agent(name="researcher", model="openai/gpt-4o-mini", instructions="...")
writer_agent   = Agent(name="writer",     model="openai/gpt-4o-mini", instructions="...")

coordinator_agent = Agent(
    name="coordinator",
    model="openai/gpt-4o-mini",
    instructions="...",
    handoffs=[
        handoff(research_agent, description="Transfer for research tasks"),
        handoff(writer_agent,   description="Transfer for writing tasks"),
    ],
    max_tokens=8192,
)
```

**`handoff()` / `Handoff` parameters:**

| Parameter | Default | Description |
|---|---|---|
| `agent` | required | Target agent to hand off to |
| `description` | agent's instructions | Description shown to the LLM for the transfer tool |
| `tool_name` | `transfer_to_{agent_name}` | Custom name for the transfer tool |
| `pass_full_history` | `True` | Whether to pass the full conversation history to the target agent |

### When to use handoffs vs. workflow stages

| Use handoffs when… | Use workflow stages (`@function`) when… |
|---|---|
| A coordinator agent decides at runtime which specialist to call | The sequence of agents is fixed and known upfront |
| Different request types need completely different specialists | Each stage always runs in order |
| You want the LLM itself to route based on context | Orchestration logic lives in Python, not in the LLM |

---

## Function (Stage) Definition Pattern (`functions.py`)

```python
from agnt5 import function, FunctionContext
from <package_name>.agents import my_agent

@function
async def my_stage(ctx: FunctionContext, input_data: str) -> str:
    """One-line description of what this stage does."""
    ctx.logger.info("Stage started")

    result = await my_agent.run_sync(input_data, context=ctx)

    output = result.output
    if output.strip().startswith("LABEL:"):
        output = output.replace("LABEL:", "", 1).strip()

    ctx.logger.info("Stage complete")
    return output

__all__ = ["my_stage"]
```

### Streaming `@function`

If a stage needs to stream output chunk by chunk (e.g. token streaming, progress updates), use `yield` instead of `return`. The platform forwards each yielded chunk to the client in real time.

```python
from agnt5 import function, FunctionContext

@function
async def stream_stage(ctx: FunctionContext, input_data: str):
    """Stream output word by word."""
    words = input_data.split()
    for word in words:
        yield word + " "
```

> **Use streaming only when the caller needs real-time chunks.** For most templates a regular `return` is simpler and sufficient. The workflow's `_consume_streaming_result` automatically collects all chunks and assembles the final output when used inside `ctx.step()`.

---

## Workflow Definition Pattern (`workflows.py`)

> **Default: no HITL.** Build fully autonomous workflows unless the user explicitly asks for human review steps.

```python
from agnt5 import workflow, WorkflowContext
from <package_name>.functions import stage1, stage2

@workflow
async def my_workflow(
    ctx: WorkflowContext,
    message: str,
) -> dict:
    """Docstring describing the stages."""
    # Stage 1
    result1 = await ctx.task(stage1, message)

    # Stage 2
    result2 = await ctx.task(stage2, message, result1)

    return {
        "status": "completed",
        "output": result2,
    }

__all__ = ["my_workflow"]
```

### HITL — only when the user asks for it

If the user explicitly requests human-in-the-loop review steps, use `ctx.wait_for_user()`.

#### All `input_type` values

| `input_type` | Returns | When to use |
|---|---|---|
| `"text"` | `str` | Free-text — user types a response |
| `"approval"` | `str` (`"approve"` / `"reject"`) | Simple yes/no gate |
| `"select"` | `str` (option `id`) | User picks one option from a list |
| `"multiselect"` | `list[str]` (option `id`s) | User picks multiple options |

#### Optional modifiers

| Modifier | Type | Effect |
|---|---|---|
| `allow_custom=True` | `bool` | Adds a free-text "Other" entry to `select`/`multiselect` |
| `skippable=True` | `bool` | Adds a skip button — returns `None` if skipped |

#### Examples

**Text input:**
```python
name = await ctx.wait_for_user(question="What is your name?", input_type="text")
```

**Approval gate:**
```python
decision = await ctx.wait_for_user(
    question="Approve deployment to production?",
    input_type="approval",
    options=[
        {"id": "approve", "label": "Approve"},
        {"id": "reject",  "label": "Reject"},
    ],
)
if decision != "approve":
    return {"status": "rejected"}
```

**Select (single choice):**
```python
region = await ctx.wait_for_user(
    question="Pick a region:",
    input_type="select",
    options=[
        {"id": "us_east", "label": "US East"},
        {"id": "eu_west", "label": "EU West"},
    ],
)
```

**Multiselect:**
```python
channels = await ctx.wait_for_user(
    question="Select notification channels:",
    input_type="multiselect",
    options=[
        {"id": "email",  "label": "Email"},
        {"id": "slack",  "label": "Slack"},
        {"id": "sms",    "label": "SMS"},
    ],
)
# channels → list of selected ids e.g. ["email", "slack"]
```

**Select with `allow_custom`:**
```python
language = await ctx.wait_for_user(
    question="Pick a language:",
    input_type="select",
    options=[
        {"id": "python", "label": "Python"},
        {"id": "go",     "label": "Go"},
    ],
    allow_custom=True,   # user can type any value not in the list
)
```

**Skippable input (returns `None` if skipped):**
```python
notes = await ctx.wait_for_user(
    question="Additional notes? (optional)",
    input_type="text",
    skippable=True,
)
if notes is None:
    notes = ""   # handle skip
```

**Approve/edit/reject gate:**
```python
decision = await ctx.wait_for_user(
    question=f"Review the output:\n\n{result1}\n\nWhat would you like to do?",
    input_type="select",
    options=[
        {"id": "approve", "label": "Approve"},
        {"id": "edit",    "label": "Edit"},
        {"id": "reject",  "label": "Reject"},
    ],
)

if decision == "reject":
    return {"status": "rejected"}

if decision == "edit":
    result1 = await ctx.wait_for_user(
        question="Paste your revised version:",
        input_type="text",
    )
```

**Conditional HITL — only pause when a condition is met:**
```python
if amount >= 1000:
    decision = await ctx.wait_for_user(
        question=f"Approve expense of ${amount:.2f}?",
        input_type="approval",
        options=[
            {"id": "approve", "label": "Approve"},
            {"id": "reject",  "label": "Reject"},
        ],
    )
    if decision != "approve":
        return {"status": "rejected", "amount": amount}
```

**Multi-step HITL with `ctx.state`:**

Use `ctx.state` to persist values across multiple HITL pauses in the same workflow:

```python
name = await ctx.wait_for_user(question="What is your name?", input_type="text")
ctx.state.set("user_name", name)

role = await ctx.wait_for_user(
    question=f"Hi {name}, what is your role?",
    input_type="select",
    options=[
        {"id": "engineer", "label": "Engineer"},
        {"id": "manager",  "label": "Manager"},
    ],
)
ctx.state.set("role", role)

# Retrieve later
saved_name = ctx.state.get("user_name")
```

#### Agent-level HITL tools

Instead of pausing the workflow, agents can ask questions or request approval **mid-run** using built-in tools. Pass them via `tools=[]` when building the agent inside the workflow (they need the live `ctx`):

```python
from agnt5.tool import AskUserTool, RequestApprovalTool

@workflow
async def my_workflow(ctx: WorkflowContext, task: str) -> dict:
    agent = Agent(
        name="my_agent",
        model="openai/gpt-4o-mini",
        instructions="Ask clarifying questions before starting, then do the task.",
        tools=[AskUserTool(ctx), RequestApprovalTool(ctx)],
        max_iterations=10,
    )
    result = await agent.run_sync(task, context=ctx)
    return {"output": result.output}
```

| Tool | What the agent does |
|---|---|
| `AskUserTool(ctx)` | Agent asks the user a clarifying question and waits for a text reply |
| `RequestApprovalTool(ctx)` | Agent describes an action and waits for approve/reject before proceeding |

> **Important:** Always instantiate these tools inside the `@workflow` function, not at module level, because they require the live `WorkflowContext`.


---

## Parallel Processing Pattern (`workflows.py`)

> **Default: sequential.** Use parallel patterns only when stages are independent and can run concurrently.

All three methods live on `WorkflowContext` (`ctx`).

### `ctx.parallel(*tasks)` — small fan-out, positional results

```python
from agnt5 import workflow, WorkflowContext

@workflow
async def my_workflow(ctx: WorkflowContext, data: str) -> dict:
    result_a, result_b = await ctx.parallel(
        ctx.step(stage_a, data),
        ctx.step(stage_b, data),
    )
    return {"a": result_a, "b": result_b}
```

Returns a list in the same order as the inputs. Use when you have a small, fixed number of independent stages.

### `ctx.gather(**tasks)` — named fan-out

```python
results = await ctx.gather(
    research=ctx.step(research_stage, topic),
    outline=ctx.step(outline_stage, topic),
)
# Access by name: results["research"], results["outline"]
```

Returns a `dict[name → result]`. Prefer over `parallel()` when you want self-documenting named results.

### `ctx.batch(func, items, max_concurrency=10)` — large-scale, controlled concurrency

Use when you need to run the same `@function` over many items. The platform manages concurrency, retries, and observability.

```python
from agnt5 import workflow, WorkflowContext

@workflow
async def batch_workflow(ctx: WorkflowContext, doc_ids: list) -> dict:
    result = await ctx.batch(
        process_document,                          # must be a @function
        [{"doc_id": d} for d in doc_ids],
        max_concurrency=20,
        continue_on_failure=True,                  # keep going if some items fail
        timeout_per_item=30.0,                     # seconds per item (optional)
    )
    return {
        "completed": result.stats.completed_items,
        "failed": result.stats.failed_items,
        "outputs": result.outputs,                 # list sorted by original index
    }
```

`BatchResult` fields:
| Field | Description |
|---|---|
| `result.outputs` | All outputs sorted by index (failed items return `None`) |
| `result.successful_outputs()` | Outputs from successful items only |
| `result.failed_items()` | List of `BatchItemResult` for failed items |
| `result.stats.completed_items` | Count of successes |
| `result.stats.failed_items` | Count of failures |
| `result.status` | `"completed"`, `"partial_failure"`, or `"failed"` |

### `ctx.map(func, items, max_concurrency=10)` — batch, outputs only

Thin wrapper over `batch()` with `continue_on_failure=False`. Raises `BatchError` if any item fails.

```python
outputs = await ctx.map(
    process_item,
    [{"id": i} for i in ids],
    max_concurrency=10,
)
# outputs[i] corresponds to ids[i]
```

### When to use which

| Method | Use when… |
|---|---|
| `ctx.parallel()` | Small fixed number of independent stages (2–5) |
| `ctx.gather()` | Same as `parallel()` but you want named results |
| `ctx.batch()` | Many items (10+), need concurrency control and per-item error handling |
| `ctx.map()` | Like `batch()` but you only need the outputs and want to fail-fast |

> **Note:** `ctx.task()` is **deprecated** — use `ctx.step()` instead.

---

## Worker Entry Point (`app.py`)

```python
#!/usr/bin/env python3
"""<Template Name> — AGNT5 Worker."""

import asyncio, logging, os, sys
from agnt5 import Worker
from <package_name>.workflows import my_workflow
from <package_name>.functions import stage1, stage2
from <package_name>.agents import agent1, agent2
from <package_name>.tools import tool1, tool2

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

SERVICE_NAME = "<template-name>"

async def main() -> int:
    logger.info("Starting %s worker…", SERVICE_NAME)
    coordinator_endpoint = os.getenv("AGNT5_COORDINATOR_ENDPOINT", "http://localhost:34186")

    try:
        worker = Worker(
            service_name=SERVICE_NAME,
            service_version="1.0.0",
            coordinator_endpoint=coordinator_endpoint,
            runtime="standalone",
            workflows=[my_workflow],
            functions=[stage1, stage2],
            agents=[agent1, agent2],
            tools=[tool1, tool2],
        )
        await worker.run()
    except Exception as e:
        logger.error("Worker failed: %s", e, exc_info=True)
        return 1
    return 0

if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
```

---

## Step-by-Step: Creating a New Template

Given a blueprint description, follow these steps in order:

1. **Parse the blueprint** — identify:
   - Number and names of agents
   - Workflow stages and their order
   - Required tools (research? web fetch? custom?)
   - Input parameters and final output format
   - HITL checkpoints — **only if the user explicitly requests human review steps**
   - Handoff pattern — **only if a coordinator/router agent dispatches to specialists at runtime**

2. **Create the directory** — `<template-name>/` at the repo root

3. **Write files in this order:**
   1. `src/<package>/tools.py` — tools first (agents depend on them)
   2. `src/<package>/agents.py` — one `Agent()` per blueprint agent
   3. `src/<package>/functions.py` — one `@function` per workflow stage **only if the workflow has distinct stages that benefit from separate functions**; skip this file if the workflow is simple enough to call agents directly
   4. `src/<package>/workflows.py` — the `@workflow` (autonomous by default; add HITL only if requested)
   5. `src/<package>/__init__.py` — re-export everything
   6. `app.py` — `Worker(...)` with all components
   7. `pyproject.toml`, `agnt5.yaml`, `.env.example`, `README.md`

4. **Naming conventions:**
   - Agent class names: `PascalCase` (e.g. `BlogCreationManager`)
   - Agent instance variables: `snake_case_agent` (e.g. `blog_manager_agent`)
   - Function names: `verb_noun` (e.g. `research_topic`, `create_outline`)
   - Workflow name: `<template_name>_workflow`

5. **Tool rules:**
   - **Do not create `tools.py` or any `@tool` definitions by default.** Only add tools if agents genuinely need to call external APIs, search the web, fetch URLs, or perform actions outside their built-in knowledge.
   - If no tools are needed, omit `tools.py` entirely and remove it from `app.py` and `__init__.py`.
   - Do not pass an empty `tools=[]` to `Agent()` — omit the argument entirely when there are no tools.

6. **Handoff rules:**
   - **Do not add handoffs by default.** Only use handoffs when the blueprint explicitly calls for a coordinator/router pattern where an LLM decides at runtime which specialist agent to call.
   - Pass the target agent directly to `handoffs=[agent]` for simple cases; use `handoff(agent, description="…")` when you need a custom description or tool name.
   - Do not use handoffs just to chain agents in a fixed sequence — use `@function` stages in a `@workflow` for that.
   - Agents that receive handoffs do not need to be listed in the coordinator's `tools=[]`; handoffs are a separate mechanism.

7. **Function rules:**
   - **Do not create `functions.py` or `@function` stages by default.** Only add them if the workflow has genuinely distinct processing stages that need to run as separate tasks.
   - A single-agent or simple linear workflow does not need wrapper functions — call the agent directly from the workflow.
   - If `functions.py` is not needed, omit it entirely (do not create the file) and remove it from `app.py` and `__init__.py`.

8. **HITL rules:**
   - **Do not add HITL by default.** Workflows should run fully autonomously unless the user explicitly asks for human review steps.
   - Choose the right `input_type`: `"approval"` for yes/no gates, `"select"` for single choice, `"multiselect"` for multiple choice, `"text"` for free-form input.
   - Add `skippable=True` when the step is optional; always handle the `None` return.
   - Add `allow_custom=True` to `select`/`multiselect` when the user may need a value not in the list.
   - For conditional HITL, wrap `ctx.wait_for_user()` in a Python `if` — only pause when the condition is met.
   - For multi-step HITL, use `ctx.state.set()`/`ctx.state.get()` to pass values between pauses.
   - For agent-level HITL (agent asks questions mid-run), use `AskUserTool(ctx)` and/or `RequestApprovalTool(ctx)` from `agnt5.tool` — always instantiate inside the `@workflow` function, not at module level.
   - Always handle all outcomes: approve → continue, edit → collect text + continue, reject → return early with `"status": "rejected"`.

9. **Model selection:**
   - Default to `openai/gpt-4o-mini` (matches existing templates)
   - Switch to Claude models only if the blueprint specifies it or the user asks
   - Switch to DeepSeek models if the user requests DeepSeek: use `deepseek/deepseek-chat` for general tasks and `deepseek/deepseek-reasoner` for reasoning-heavy stages (math, science, coding)
   - When using DeepSeek, set `.env.example` to `DEEPSEEK_API_KEY` instead of `OPENAI_API_KEY`
   - Switch to Mistral models if the user requests Mistral: use `mistral/mistral-small-latest` as the model string
   - When using Mistral, set `.env.example` to `MISTRAL_API_KEY` instead of `OPENAI_API_KEY`
   - Switch to OpenRouter if the user requests OpenRouter: use `openrouter/<provider>/<model>` (e.g. `openrouter/openai/gpt-4o-mini`)
   - When using OpenRouter, set `.env.example` to `OPENROUTER_API_KEY` instead of `OPENAI_API_KEY`
   - Switch to xAI models if the user requests xAI or Grok: use `xai/grok-beta` for general tasks or `xai/grok-2` for higher quality
   - When using xAI, set `.env.example` to `XAI_API_KEY` instead of `OPENAI_API_KEY`
   - Switch to Groq if the user requests Groq: use `groq/llama-3.3-70b-versatile` as the model string
   - When using Groq, set `.env.example` to `GROQ_API_KEY` instead of `OPENAI_API_KEY`
   - Switch to Google Gemini if the user requests Google or Gemini: use `google/gemini-2.0-flash` for speed
   - When using Google, set `.env.example` to `GOOGLE_API_KEY` instead of `OPENAI_API_KEY`

---

