---
name: agnt5-ai-templates
description: Generate AGNT5 workflow templates from a blueprint description. Use when the user describes specific agents, workflows, or functions to generate — not for a bare "create a new project" request with no blueprint (see agnt5-project-init for that). Covers Python, TypeScript, and Go.
---

# AGNT5 Template Generation Guide

This file is a skill reference for Claude Code. When asked to create a new AGNT5 template, follow this guide precisely — **do not ask the user to point at a reference template again**.

If the user just wants a blank/empty project with no described agents or workflows, use
the `agnt5-project-init` skill instead — it covers `agnt5 create`/`agnt5 init` without a
blueprint.

AGNT5 supports three languages: **Python** (primary), **TypeScript**, and **Go**. Default to Python unless the user specifies otherwise.

---

## Template Directory Structure

### Python

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
        ├── functions.py            # Stage functions (only if needed)
        └── tools.py                # Custom tools (only if needed)
```

- **Package name** = template name in snake_case (e.g. `blog_creation`)
- **Template directory name** = template name in snake_case

### TypeScript

```
<template-name>/
├── app.ts                          # Worker entry point (required)
├── package.json                    # Node project & dependencies (required)
├── tsconfig.json                   # TypeScript config (required)
├── agnt5.yaml                      # AGNT5 worker config (required)
├── .env.example                    # Environment variable template (required)
├── README.md                       # Usage docs (required)
└── src/
    ├── agents.ts                   # Agent definitions
    ├── functions.ts                # Step functions
    └── workflows.ts                # Workflow definitions
```

### Go

```
<template-name>/
├── main.go                         # Worker entry point (required)
├── go.mod                          # Go module (required)
├── agnt5.yaml                      # AGNT5 worker config (required)
├── .env.example                    # Environment variable template (required)
└── README.md                       # Usage docs (required)
```

---

## Key Files — Boilerplate & Patterns

### `pyproject.toml` (Python)

> The `agnt5` version below is a snapshot and will go stale. Before scaffolding, check the
> latest published version (`pip index versions agnt5` or the PyPI page) and use that instead
> of trusting this number.

```toml
[project]
name = "<template-name>-agnt5"
version = "1.0.0"
description = "<one-line description>"
requires-python = ">=3.12"

dependencies = [
    "agnt5~=0.8.7",
    "requests>=2.31.0",
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
target-version = "py312"
```

### `agnt5.yaml` (Python)

```yaml
name: <template-name>
language: python
language_version: "3.12"
environment: dev

deploy:
  resources:
    memory: 512Mi
    cpu: 500m
```

### `agnt5.yaml` (TypeScript)

```yaml
name: <template-name>
language: typescript
language_version: "22"
environment: dev

worker:
  command: "npx tsx app.ts"

deploy:
  resources:
    memory: 512Mi
    cpu: 500m
```

### `agnt5.yaml` (Go)

```yaml
name: <template-name>
language: go
language_version: "1.23"
environment: dev

worker:
  command: "go run ."

deploy:
  resources:
    memory: 512Mi
    cpu: 500m
```

### `package.json` (TypeScript)

> The `@agnt5/sdk` version below is a snapshot and will go stale. Before scaffolding, check
> the latest published version (`npm view @agnt5/sdk version`) and use that instead of
> trusting this number.

```json
{
  "name": "<template-name>",
  "version": "0.1.0",
  "type": "module",
  "private": true,
  "scripts": {
    "start": "npx tsx app.ts"
  },
  "dependencies": {
    "@agnt5/sdk": "^0.3.6"
  },
  "devDependencies": {
    "@types/node": "^25.0.0",
    "tsx": "^4.0.0",
    "typescript": "^5.0.0"
  }
}
```

### `go.mod` (Go)

> The `agnt5.dev/sdk-go` version below is a snapshot and will go stale. Before scaffolding,
> check the latest published version (`go list -m -versions agnt5.dev/sdk-go`) and use that
> instead of trusting this number.

```
module <template-name>

go 1.23.1

require agnt5.dev/sdk-go v0.1.0
```

### `.env.example`

```
# <Template Name> — Environment Variables
# Copy to .env and fill in your values

OPENAI_API_KEY="your-openai-api-key-here"
```

---

## Tool Definition Pattern (`tools.py` — Python only)

> Only create this file if agents need to call external APIs or perform actions outside their built-in knowledge. If no tools are needed, omit this file entirely.

```python
from agnt5.tool import tool
from agnt5.context import Context

@tool
async def my_tool(ctx: Context, param: str) -> str:
    """One-line description of what this tool does.

    Args:
        param: Description of the parameter.
    """
    # implementation
    return result

__all__ = ["my_tool"]
```

`@tool` decorator options:

| Parameter | Type | Default | Description |
|---|---|---|---|
| `name` | `str` | function's `__name__` | How the tool appears to the model |
| `description` | `str` | first line of docstring | What the model reads to decide when to call this tool |

- First parameter must be `ctx: Context` — injected automatically, not exposed to the model.
- Every other parameter becomes a field the model can fill in. Type hints and docstring `Args:` descriptions build the JSON schema.
- Sync functions are wrapped in a thread pool automatically.

### Built-in Tools (Python — no `tools.py` needed)

Built-in tools run on the provider's infrastructure. Use `built_in_tools=` on the agent (NOT `tools=`):

```python
from agnt5 import Agent
from agnt5.lm import BuiltInTool

agent = Agent(
    name="researcher",
    model="openai/gpt-4o-mini",
    instructions=(
        "You are a research assistant. Always use web search to find current "
        "information, never answer from training knowledge alone."
    ),
    built_in_tools=[BuiltInTool.WEB_SEARCH],
)
```

Available built-in tools:

| Tool | What it does | Provider |
|---|---|---|
| `BuiltInTool.WEB_SEARCH` | Live web search with cited results | OpenAI, Anthropic |
| `BuiltInTool.CODE_INTERPRETER` | Run code in a provider-hosted sandbox | OpenAI only |
| `BuiltInTool.FILE_SEARCH` | Search over files uploaded to the provider | OpenAI only |
| `BuiltInTool.WEB_FETCH` | Fetch the content of a specific URL | Anthropic only |

You can mix `built_in_tools` with custom `tools` and a `sandbox` on the same agent:

```python
from agnt5 import Agent, Sandbox
from agnt5.lm import BuiltInTool

agent = Agent(
    name="assistant",
    model="openai/gpt-4o-mini",
    instructions="Search the web for information and run code when needed.",
    built_in_tools=[BuiltInTool.WEB_SEARCH, BuiltInTool.CODE_INTERPRETER],
    sandbox=Sandbox(),
)
```

### MCP Tools (Python — no `tools.py` needed)

Use `MCPClient` when a tool already exists in an external MCP server:

```python
from agnt5 import Agent
from agnt5.mcp import MCPClient

mcp = MCPClient(id="repo-tools")
mcp.add_streamable_http_server("deepwiki", "https://mcp.deepwiki.com/mcp")
await mcp.connect()

agent = Agent(
    name="repository_researcher",
    model="openai/gpt-4o-mini",
    instructions="Use available tools to answer questions about code repositories.",
    tools=mcp.get_tools(),
)
```

### Agents as Tools (Python)

Pass another `Agent` directly in `tools`. The calling agent invokes it like any tool and gets the specialist's response back:

```python
lookup_agent = Agent(name="lookup", model="openai/gpt-4o-mini", instructions="...")
orchestrator = Agent(
    name="orchestrator",
    model="openai/gpt-4o-mini",
    instructions="Use lookup to find information, then summarize it.",
    tools=[lookup_agent],   # auto-wrapped as ask_lookup
)
```

---

## Agent Definition Pattern

### Python (`agents.py`)

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
    model="openai/gpt-4o-mini",
    instructions=agent_prompt,
    tools=[some_tool],            # omit if no tools needed
    max_tokens=8192,
    temperature=0.7,              # 0.0–1.0, default 0.7 (omit to use default)
    max_iterations=10,            # max reasoning loops, default 10 (omit to use default)
)

__all__ = ["my_agent"]
```

### TypeScript (`agents.ts`)

```typescript
import { Agent, LM } from '@agnt5/sdk';

export const myAgent = new Agent({
    name: 'AgentName',
    model: LM.openai(),
    modelName: 'openai/gpt-4o-mini',
    instructions: 'You are <AgentName>, <one-line role>...',
});
```

### Go (`main.go` — agents are inline)

Go agents are constructed inline in function/workflow handlers:

```go
import "agnt5.dev/sdk-go/agnt5"

agent := agnt5.NewAgent("agent_name",
    agnt5.WithModel("openai/gpt-4o-mini"),
    agnt5.WithInstructions("You are..."),
)
result, err := agent.Run(ctx, input)
```

**Model string format:** `"<provider>/<model-name>"`, e.g. `openai/gpt-4o-mini` (default),
`anthropic/claude-3-5-sonnet-20241022`. Specific model names change often — do not hardcode a
menu of them here; ask the user which model they want, or use the provider's current default
naming, and verify against the provider's own docs if unsure.

Provider prefixes with first-class Studio credential support: `openai`, `anthropic`, `google`
(or `gemini`), `groq`, `openrouter`, `mistral`, `deepseek`, `xai`. The SDK also accepts
`azure`, `bedrock`, `fireworks`, `together`, `huggingface` (or `hf`), and `ollama` for
local/advanced use — see https://agnt5.com/docs/integrations/ai-providers for the current
provider table and required API key env var per provider.

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

### Advanced usage — `handoff()` for custom config

```python
from agnt5 import Agent, handoff

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

**`handoff()` parameters:**

| Parameter | Default | Description |
|---|---|---|
| `agent` | required | Target agent to hand off to |
| `description` | agent's instructions | Description shown to the LLM for the transfer tool |
| `tool_name` | `transfer_to_{agent_name}` | Custom name for the transfer tool |
| `pass_full_history` | `True` | Whether to pass the full conversation history to the target agent |

### When to use handoffs vs. workflow stages

| Use handoffs when… | Use workflow stages when… |
|---|---|
| A coordinator agent decides at runtime which specialist to call | The sequence of agents is fixed and known upfront |
| Different request types need completely different specialists | Each stage always runs in order |
| You want the LLM itself to route based on context | Orchestration logic lives in Python, not in the LLM |

---

## Function (Stage) Definition Pattern

### Python (`functions.py`)

```python
from agnt5 import function, FunctionContext
from <package_name>.agents import my_agent

@function
async def my_stage(ctx: FunctionContext, input_data: str) -> str:
    """One-line description of what this stage does."""
    ctx.logger.info("Stage started")

    result = await my_agent.run(input_data, context=ctx)

    output = result.output
    if output.strip().startswith("LABEL:"):
        output = output.replace("LABEL:", "", 1).strip()

    ctx.logger.info("Stage complete")
    return output

__all__ = ["my_stage"]
```

### Streaming `@function` (Python)

```python
from agnt5 import function, FunctionContext

@function
async def stream_stage(ctx: FunctionContext, input_data: str):
    """Stream output word by word."""
    words = input_data.split()
    for word in words:
        yield word + " "
```

> Use streaming only when the caller needs real-time chunks. For most templates a regular `return` is simpler and sufficient.

### TypeScript (`functions.ts`)

```typescript
import { fn } from '@agnt5/sdk';
import type { Context } from '@agnt5/sdk';

export const myStage = fn('my_stage').run(
    async (ctx: Context, input: { data: string }): Promise<{ result: string }> => {
        ctx.logger.info('Stage started');
        // implementation
        return { result: 'output' };
    },
);
```

### Go (inline in `main.go`)

```go
agnt5.RegisterFunction(worker, "my_stage", func(ctx *agnt5.Context, in MyInput) (MyOutput, error) {
    ctx.Logger().Info("stage started", "input", in)
    return MyOutput{Result: "output"}, nil
})
```

---

## Workflow Definition Pattern

### Python (`workflows.py`)

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
    result1 = await ctx.step(stage1, message)

    # Stage 2
    result2 = await ctx.step(stage2, message, result1)

    return {
        "status": "completed",
        "output": result2,
    }

__all__ = ["my_workflow"]
```

> **Note:** `ctx.task()` is **deprecated** — always use `ctx.step()`.

### TypeScript (`workflows.ts`)

```typescript
import { workflow } from '@agnt5/sdk';
import type { Context } from '@agnt5/sdk';
import { stage1, stage2 } from './functions.js';

export const myWorkflow = workflow(
    'my_workflow',
    async (ctx: Context, input: { message: string }) => {
        const result1 = await stage1(ctx, { data: input.message });
        const result2 = await stage2(ctx, { data: result1.result });
        return { status: 'completed', output: result2.result };
    },
);
```

### Go (inline in `main.go`)

```go
agnt5.RegisterWorkflow(worker, "my_workflow", func(ctx *agnt5.Context, in MyInput) (MyOutput, error) {
    result, err := agnt5.Step(ctx, "step_name", func(context.Context) (string, error) {
        return "output", nil
    })
    if err != nil {
        return MyOutput{}, err
    }
    return MyOutput{Result: result}, nil
})
```

`agnt5.Step` is the Go equivalent of `ctx.step()` — it checkpoints the return value so a worker restart skips completed steps.

### HITL — only when the user asks for it (Python)

If the user explicitly requests human-in-the-loop review steps, use `ctx.wait_for_user()`.

> **Replay safety:** when `ctx.wait_for_user()` is called, the workflow pauses and saves
> state. When the user responds, AGNT5 re-runs the workflow function **from the top** — every
> line before the pause executes again, but `wait_for_user()` now returns the saved answer
> immediately instead of pausing. **Wrap any side effect that runs before a pause** (sending a
> notification, calling an external API, logging) in `if not ctx._is_replay:` so it only fires
> once. Never guard the `wait_for_user()` call itself — it must run on both passes.

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
    allow_custom=True,
)
```

**Skippable input:**
```python
notes = await ctx.wait_for_user(
    question="Additional notes? (optional)",
    input_type="text",
    skippable=True,
)
if notes is None:
    notes = ""
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

**Multi-step HITL with `ctx.state`:**

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

saved_name = ctx.state.get("user_name")
```

#### Agent-level HITL tools (Python)

Agents can ask questions or request approval **mid-run** using built-in tools. Instantiate inside the `@workflow` function (they need the live `ctx`):

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
    result = await agent.run(task, context=ctx)
    return {"output": result.output}
```

| Tool | What the agent does |
|---|---|
| `AskUserTool(ctx)` | Agent asks the user a clarifying question and waits for a text reply |
| `RequestApprovalTool(ctx)` | Agent describes an action and waits for approve/reject before proceeding |

> **Always instantiate these tools inside the `@workflow` function**, not at module level.

---

## Parallel Processing Pattern (Python `workflows.py`)

> **Default: sequential.** Use parallel patterns only when stages are independent and can run concurrently.

### `ctx.parallel(*tasks)` — small fan-out, positional results

```python
@workflow
async def my_workflow(ctx: WorkflowContext, data: str) -> dict:
    result_a, result_b = await ctx.parallel(
        ctx.step(stage_a, data),
        ctx.step(stage_b, data),
    )
    return {"a": result_a, "b": result_b}
```

### `ctx.gather(**tasks)` — named fan-out

```python
results = await ctx.gather(
    research=ctx.step(research_stage, topic),
    outline=ctx.step(outline_stage, topic),
)
# Access by name: results["research"], results["outline"]
```

### `ctx.batch(func, items, max_concurrency=10)` — large-scale, controlled concurrency

```python
@workflow
async def batch_workflow(ctx: WorkflowContext, doc_ids: list) -> dict:
    result = await ctx.batch(
        process_document,
        [{"doc_id": d} for d in doc_ids],
        max_concurrency=20,
        continue_on_failure=True,
        timeout_per_item=30.0,
    )
    return {
        "completed": result.stats.completed_items,
        "failed": result.stats.failed_items,
        "outputs": result.outputs,
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

### `ctx.map(func, items, max_concurrency=10)` — batch, fail-fast

```python
outputs = await ctx.map(
    process_item,
    [{"id": i} for i in ids],
    max_concurrency=10,
)
```

### TypeScript parallel patterns

```typescript
// Promise.all for concurrent steps
const results = await Promise.all(
    items.map((item) => myStep(ctx, { item })),
);
```

### When to use which (Python)

| Method | Use when… |
|---|---|
| `ctx.parallel()` | Small fixed number of independent stages (2–5) |
| `ctx.gather()` | Same as `parallel()` but you want named results |
| `ctx.batch()` | Many items (10+), need concurrency control and per-item error handling |
| `ctx.map()` | Like `batch()` but you only need the outputs and want to fail-fast |

---

## Memory Service (Python)

AGNT5 provides two memory types for agents that need to retain information:

### Working Memory — ephemeral, within a run

```python
from agnt5.memory import WorkingMemory

memory = WorkingMemory()
memory.add("key", "value")
value = memory.get("key")
```

### Semantic Memory — persistent, vector-based, across runs

```python
from agnt5.memory import SemanticMemory

memory = SemanticMemory()
await memory.store("some fact or document chunk")
results = await memory.search("query", top_k=5)
```

Pass memory to an agent via `tools` or `memory=` parameter when building the agent.

---

## Worker Entry Point

### Python (`app.py`)

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

### TypeScript (`app.ts`)

```typescript
import { Worker } from '@agnt5/sdk';

// Importing the modules registers their functions/workflows via decorators.
import './src/functions.js';
import './src/workflows.js';

async function main() {
    const coordinatorEndpoint =
        process.env.AGNT5_COORDINATOR_ENDPOINT || 'http://localhost:34180';

    const worker = new Worker('<template-name>', {
        serviceVersion: '0.1.0',
        coordinatorEndpoint,
    });

    await worker.run();
}

main().catch((error) => {
    console.error('Worker error:', error);
    process.exit(1);
});
```

### Go (`main.go`)

```go
package main

import (
    "context"
    "log"

    "agnt5.dev/sdk-go/agnt5"
)

type MyInput struct {
    Message string `json:"message"`
}

type MyOutput struct {
    Result string `json:"result"`
}

func main() {
    worker := agnt5.NewWorker("<template-name>",
        agnt5.WithMaxConcurrency(16),
    )

    err := agnt5.RegisterFunction(worker, "my_function", func(ctx *agnt5.Context, in MyInput) (MyOutput, error) {
        ctx.Logger().Info("running function", "message", in.Message)
        return MyOutput{Result: in.Message}, nil
    })
    if err != nil {
        log.Fatal(err)
    }

    err = agnt5.RegisterWorkflow(worker, "my_workflow", func(ctx *agnt5.Context, in MyInput) (MyOutput, error) {
        result, err := agnt5.Step(ctx, "process", func(context.Context) (string, error) {
            return in.Message, nil
        })
        if err != nil {
            return MyOutput{}, err
        }
        return MyOutput{Result: result}, nil
    })
    if err != nil {
        log.Fatal(err)
    }

    if err := worker.Run(context.Background()); err != nil {
        log.Fatal(err)
    }
}
```

---

## Available Templates (Reference)

AGNT5 ships ready-made templates you can scaffold directly instead of hand-writing every file
from a blueprint, when the blueprint closely matches an existing one:

```bash
agnt5 create --template <language>/<template-name> <project-name>
# e.g. agnt5 create --template python/weather-agent my-weather-agent
```

The list of available templates and their current versions changes over time — do not
hardcode it here. Check the current set with `agnt5 create --template` (no value, to list
options) or https://agnt5.com/docs/quickstart and the templates section of the docs site
before recommending one by name. Use the from-scratch blueprint workflow in this skill when
no existing template is a close match, or when the user wants a custom combination of agents/
tools/workflows.

---

## Step-by-Step: Creating a New Template

Given a blueprint description, follow these steps in order:

1. **Choose the language** — default Python unless the user specifies TypeScript or Go.

2. **Parse the blueprint** — identify:
   - Number and names of agents
   - Workflow stages and their order
   - Required tools (research? web fetch? custom?)
   - Input parameters and final output format
   - HITL checkpoints — **only if the user explicitly requests human review steps**
   - Handoff pattern — **only if a coordinator/router agent dispatches to specialists at runtime**

3. **Create the directory** — `<template-name>/` at the repo root

4. **Write files in order:**

   **Python:**
   1. `src/<package>/tools.py` — tools first (agents depend on them)
   2. `src/<package>/agents.py` — one `Agent()` per blueprint agent
   3. `src/<package>/functions.py` — only if the workflow has distinct processing stages
   4. `src/<package>/workflows.py` — the `@workflow` (autonomous by default; add HITL only if requested)
   5. `src/<package>/__init__.py` — re-export everything
   6. `app.py` — `Worker(...)` with all components
   7. `pyproject.toml`, `agnt5.yaml`, `.env.example`, `README.md`

   **TypeScript:**
   1. `src/agents.ts` — agent definitions
   2. `src/functions.ts` — step functions using `fn('name').run(...)`
   3. `src/workflows.ts` — workflows using `workflow('name', ...)`
   4. `app.ts` — `Worker` entry point, imports modules to register them
   5. `package.json`, `tsconfig.json`, `agnt5.yaml`, `.env.example`, `README.md`

   **Go:**
   1. `main.go` — all-in-one: `agnt5.NewWorker`, `agnt5.RegisterFunction`, `agnt5.RegisterWorkflow`, `worker.Run`
   2. `go.mod`, `agnt5.yaml`, `.env.example`, `README.md`

5. **Naming conventions (Python):**
   - Agent class names: `PascalCase` (e.g. `BlogCreationManager`)
   - Agent instance variables: `snake_case_agent` (e.g. `blog_manager_agent`)
   - Function names: `verb_noun` (e.g. `research_topic`, `create_outline`)
   - Workflow name: `<template_name>_workflow`

6. **Tool rules (Python):**
   - **Do not create `tools.py` by default.** Only add if agents need to call external APIs that aren't covered by built-in or MCP tools.
   - For web search / URL fetching: use `built_in_tools=[BuiltInTool.WEB_SEARCH]` or `BuiltInTool.WEB_FETCH` — no custom code needed.
   - For external MCP servers: use `MCPClient` and pass `mcp.get_tools()` to `tools=`.
   - Omit `tools.py` entirely and remove from `app.py` and `__init__.py` if not needed.
   - Do not pass an empty `tools=[]` to `Agent()` — omit the argument entirely.
   - `built_in_tools=` and `tools=` are separate parameters — do not confuse them.

7. **Handoff rules (Python):**
   - **Do not add handoffs by default.** Only use for coordinator/router LLM-dispatched patterns.
   - Pass agent directly to `handoffs=[agent]` for simple cases; use `handoff(agent, description="…")` for custom description.
   - Do not use handoffs for fixed-sequence chaining — use `@function` stages instead.

8. **Function rules:**
   - **Python:** Do not create `functions.py` by default. Only add for genuinely distinct processing stages. A simple linear workflow can call agents directly from the workflow.
   - **TypeScript:** Functions (`fn(...)`) are the standard way to define steps — always create them.
   - **Go:** Register functions inline in `main.go` via `agnt5.RegisterFunction`.

9. **HITL rules (Python):**
   - **Do not add HITL by default.** Only when user explicitly asks.
   - Choose the right `input_type`; handle all outcomes; use `ctx.state` for multi-step HITL.
   - For agent-level HITL, use `AskUserTool(ctx)` / `RequestApprovalTool(ctx)` instantiated inside `@workflow`.

10. **Model selection:**
    - Default to `openai/gpt-4o-mini` for all languages
    - Switch providers only when the user requests it
    - Update `.env.example` with the correct API key name for the chosen provider:
      - Claude → `ANTHROPIC_API_KEY`
      - DeepSeek → `DEEPSEEK_API_KEY`
      - Mistral → `MISTRAL_API_KEY`
      - OpenRouter → `OPENROUTER_API_KEY`
      - xAI → `XAI_API_KEY`
      - Groq → `GROQ_API_KEY`
      - Google → `GOOGLE_API_KEY`
      - Azure → `AZURE_OPENAI_API_KEY` + `AZURE_OPENAI_ENDPOINT`
      - Bedrock → `AWS_ACCESS_KEY_ID` + `AWS_SECRET_ACCESS_KEY`
      - Fireworks → `FIREWORKS_API_KEY`
      - Together → `TOGETHER_API_KEY`
      - Hugging Face → `HUGGINGFACE_API_KEY`
      - Ollama → no key needed (local)

---

## Source

- https://agnt5.com/docs/build/agents -- `Agent(...)`, `run()`/`stream()`, handoffs,
  agents-as-tools.
- https://agnt5.com/docs/build/tools -- `@tool`, built-in tools, MCP tools, HITL tools.
- https://agnt5.com/docs/build/workflows -- `@workflow`, `ctx.step()`, parallel/gather/batch/
  map, durable sleep, state.
- https://agnt5.com/docs/build/functions -- `@function`, retries, backoff, timeouts.
- https://agnt5.com/docs/build/human-in-the-loop -- `ctx.wait_for_user()`, replay safety.
- https://agnt5.com/docs/build/mcp -- `MCPClient`/`MCPServer`.
- https://agnt5.com/docs/integrations/ai-providers -- supported model providers and API key
  env vars.
- https://agnt5.com/docs/install-cli -- `agnt5 create --template ...` scaffolding command.

Cross-check currency before trusting any version pin, model name, or template list above --
those are the parts of this skill most likely to drift from the docs over time.
