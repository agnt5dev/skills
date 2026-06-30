---
name: agnt5-agents-tools
description: Configure AGNT5 agents and the tools they call - custom @tool functions, built-in provider tools (web search, code interpreter), MCP client/server integration, sandboxed code execution, and multi-agent patterns (handoffs, agents-as-tools). Use when creating a new agent, giving an agent a capability, or wiring an external MCP server into an agent.
---

# AGNT5 Agents and Tools

An **Agent** is an LLM that runs in a loop: reads its instructions, calls tools as needed,
keeps going until it has a final answer.

## Creating an agent

```python
from agnt5 import Agent

agent = Agent(
    name="researcher",
    model="openai/gpt-4o-mini",
    instructions="You are a research assistant. Answer questions with cited sources.",
)
```

| Parameter | Required | Description |
|---|---|---|
| `name` | yes | Identifier for this agent |
| `model` | yes | `"provider/model-name"`, e.g. `"openai/gpt-4o"`, `"anthropic/claude-3-5-sonnet-20241022"` |
| `instructions` | yes | System prompt |
| `tools` | no | Custom tools or other `Agent`s (auto-wrapped as agents-as-tools) |
| `built_in_tools` | no | `list[BuiltInTool]` — provider-hosted tools |
| `handoffs` | no | Agents to delegate full control to |
| `sandbox` | no | `Sandbox()` for isolated file/code execution |
| `max_iterations` | no | Max reasoning loops, default `10` |
| `temperature` | no | 0-1, default `0.7` |
| `max_tokens` | no | Max response tokens |
| `top_p` | no | Top-p nucleus sampling, 0-1 |
| `model_config` | no | `ModelConfig` for a custom endpoint: `base_url`, `api_key`, `timeout`, `headers` |

Run with `result = await agent.run("...")` (full result: `result.output`,
`result.tool_calls` — e.g. `[{"name": "get_weather", "arguments": '{"city": "Paris"}', "iteration": 1}]`)
or stream with `async for event in agent.stream("..."):` and check `event.event_type`:

| Event type | When it fires |
|---|---|
| `agent.started` | Agent loop begins |
| `lm.content_block.delta` | A chunk of the LLM response arrives |
| `lm.content_block.completed` | LLM response block is complete |
| `tool_call.started` | A tool call begins |
| `tool_call.completed` | A tool call finishes |
| `agent.completed` | Agent loop ends, final answer available |

Inside a workflow, pass `context=ctx`: `await agent.run(task, context=ctx)`.

## Custom tools

```python
from agnt5.tool import tool
from agnt5.context import Context

@tool
async def get_weather(ctx: Context, city: str) -> str:
    """Get the current weather for a city.

    Args:
        city: Name of the city to check.
    """
    return f"Sunny, 22°C in {city}"

agent = Agent(name="assistant", model="openai/gpt-4o-mini",
              instructions="...", tools=[get_weather])
```

- First param must be `ctx: Context` (injected, not exposed to the model).
- Every other param becomes a model-fillable field — type hints + docstring `Args:` build the
  JSON schema.
- Sync functions auto-wrap in a thread pool. Tools register globally at import time.
- `@tool(name=..., description=..., confirmation=...)` — `name`/`description` override the
  model-facing name/description (default: function name / first docstring line);
  `confirmation` (bool, default `False`) is reserved for a future human-approval flow.

## Built-in tools (no custom code)

Run on the provider's infrastructure — use `built_in_tools=`, **not** `tools=`:

```python
from agnt5.lm import BuiltInTool

agent = Agent(
    name="researcher", model="openai/gpt-4o-mini",
    instructions="Always use web_search for current information.",
    built_in_tools=[BuiltInTool.WEB_SEARCH],
)
```

| Tool | What it does | Provider |
|---|---|---|
| `BuiltInTool.WEB_SEARCH` | Live web search with cited results | OpenAI, Anthropic |
| `BuiltInTool.CODE_INTERPRETER` | Run code in a provider-hosted sandbox | OpenAI only |
| `BuiltInTool.FILE_SEARCH` | Search files uploaded to the provider | OpenAI only |
| `BuiltInTool.WEB_FETCH` | Fetch the content of a specific URL | Anthropic only |

`built_in_tools`, `tools`, and `sandbox` can all be set on the same agent at once.

## MCP tools

Use `MCPClient` to pull tools from an existing external MCP server instead of writing custom
`@tool` code:

```python
from agnt5.mcp import MCPClient

mcp = MCPClient(id="repo-tools")
mcp.add_streamable_http_server("deepwiki", "https://mcp.deepwiki.com/mcp")
await mcp.connect()   # must connect before get_tools()/list_tools()

agent = Agent(name="repository_researcher", model="openai/gpt-4o-mini",
              instructions="...", tools=mcp.get_tools())
```

Transports: `add_streamable_http_server(name, url)` (current-spec remote), `add_sse_server(name, url, api_key=...)`
(legacy remote), `add_stdio_server(name, command, args=[...])` (local subprocess). Use
`async with mcp:` to connect/disconnect around one block.

| Method | What it does |
|---|---|
| `connect()` / `disconnect()` | Open/close connections to all configured servers |
| `get_tools()` | Return discovered tools as AGNT5 `Tool` objects for `Agent(tools=...)` |
| `list_tools()` | List every discovered tool with its source server |
| `list_server_tools(server)` | List tools from one server |
| `call_tool(server, name, args)` | Call a tool on a specific server |
| `call_tool_auto(name, args)` | Call the first matching tool name across connected servers |
| `is_connected(server)` | Check whether one server is connected |
| `connected_servers()` | Return connected server names |

To expose AGNT5 tools/agents/workflows *as* an MCP server instead, use `MCPServer`:

```python
from agnt5.mcp import MCPServer

server = MCPServer(id="my-server", name="My AGNT5 Server", version="1.0.0",
                    tools={"greet": greet}, agents={"assistant": assistant})
await server.run_stdio()   # or server.run_http(host, port, path)
```

## Sandboxed code execution

Pass `Sandbox()` when an agent needs to write/read/list files or run `python`/`javascript`/
`bash` before answering. AGNT5 wires the standard sandbox capabilities automatically; custom
tools can reach the same workspace via `ctx.sandbox`.

```python
from agnt5 import Agent, Sandbox

agent = Agent(
    name="coder", model="openai/gpt-4o-mini",
    instructions="Use the sandbox workspace to write files and run code before answering.",
    sandbox=Sandbox(),   # or Sandbox(provider="daytona") to pick a specific provider
)
```

### Sandbox providers — credentials and setup

`Sandbox()` auto-detects the first configured provider; pass `provider=` explicitly when more
than one is configured.

| Provider | Selector | Required env vars |
|---|---|---|
| E2B | `e2b` | `E2B_API_KEY` |
| Daytona | `daytona` | `DAYTONA_API_KEY` |
| Vercel Sandbox | `vercel` | `VERCEL_TOKEN` or `VERCEL_OIDC_TOKEN`, plus `VERCEL_TEAM_ID`, `VERCEL_PROJECT_ID` |
| Northflank | `northflank` | `NORTHFLANK_API_TOKEN`, `NORTHFLANK_PROJECT_ID` |
| Together Code Interpreter | `together` | `TOGETHER_API_KEY` |

**Local dev** — put credentials in `.env` and start with the explicit env file:

```bash
AGNT5_SANDBOX_PROVIDER=e2b
E2B_API_KEY=e2b_...
```
```bash
agnt5 --env-file .env dev
```

**Deployed workers** — Studio → Settings → Integrations → add the sandbox provider
integration, store the credential at the narrowest scope that works, then deploy/restart so
the worker picks it up. The credential is never shown to the model — only the worker uses it
to create/manage the sandbox.

**Validate a provider before relying on it** — scaffold the `sandbox-smoke` template and run
its checks:

```bash
agnt5 create --template python/sandbox-smoke sandbox-smoke
cd sandbox-smoke && cp .env.example .env
agnt5 --env-file .env dev

agnt5 --env-file .env run sandbox_lifecycle_check \
  --input '{"provider": "e2b", "code": "print(6 * 7)", "language": "python"}'
agnt5 --env-file .env run sandbox_agent_tools_check --input '{"provider": "e2b"}'
agnt5 --env-file .env run sandbox_coding_agent_check \
  --input '{"provider": "e2b", "model": "openai/gpt-4o-mini"}'
```

| Symptom | Check |
|---|---|
| `Sandbox provider 'auto' is not configured` | Worker has no supported provider env vars — restart with `agnt5 --env-file .env dev` or update the deployed worker's environment |
| Provider creation fails | Provider key is valid and the account has sandbox access enabled |
| File ops fail but code execution works | Run `sandbox_agent_tools_check` to isolate write/list/read/execute |
| Shutdown doesn't complete | Provider-side quota, active sandbox limits, provider API status |

## Multi-agent patterns

**Agents as tools** — coordinator invokes a specialist, gets the result back, keeps
reasoning. Pass the `Agent` directly in `tools=[...]`; it auto-wraps as `ask_<name>`.

```python
coordinator = Agent(
    name="coordinator", model="openai/gpt-4o-mini",
    instructions="Use the researcher and analyst to answer complex questions.",
    tools=[research_agent, analyst_agent],
)
```

**Handoffs** — calling agent transfers control entirely; the specialist's output becomes the
final result. Good for routing/triage.

```python
from agnt5 import handoff

triage_agent = Agent(
    name="triage", model="openai/gpt-4o-mini",
    instructions="Route the user to the right specialist.",
    handoffs=[
        handoff(billing_agent, "Transfer for billing/payment questions"),
        handoff(technical_agent, "Transfer for technical/product issues"),
    ],
)
result = await triage_agent.run("My payment failed but I was still charged.")
print(result.handoff_to)   # "billing"
```

Pass agents directly (`handoffs=[billing_agent, technical_agent]`) for default-config
handoffs without `handoff()`. `handoff()` params: `agent` (required), `description`
(shown to the LLM), `tool_name` (default `transfer_to_{name}`), `pass_full_history`
(default `True`).

| Use handoffs when… | Use agents-as-tools when… |
|---|---|
| One specialist should fully own the rest of the conversation | The coordinator needs to synthesize results from multiple specialists |
| It's a routing/triage decision | It's a sub-task within a larger reasoning loop |

For HITL tools (`AskUserTool`, `RequestApprovalTool`), use the `agnt5-human-in-the-loop`
skill.

## Source

- https://agnt5.com/docs/build/agents -- `Agent(...)` constructor params, `run()`/`stream()`,
  handoffs, agents-as-tools.
- https://agnt5.com/docs/build/tools -- `@tool` decorator, built-in tools, sandbox workspaces,
  MCP tools, HITL tools.
- https://agnt5.com/docs/build/mcp -- `MCPClient` (stdio/HTTP/SSE transports), `MCPServer`
  (expose AGNT5 primitives over MCP).
- https://agnt5.com/docs/build/sandboxes -- `Sandbox()`, provider selection.
- https://agnt5.com/docs/integrations/sandbox-providers -- per-provider env vars, local/
  deployed credential setup, `sandbox-smoke` validation template, troubleshooting table.
