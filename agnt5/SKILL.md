---
name: agnt5
description: Build, ship, evaluate and debug AGNT5 apps (Python, TypeScript, Go SDKs, agnt5 CLI, Studio). Use for any AGNT5 task - install the CLI, create, generate or run a project (agnt5 create/init/dev); write functions and durable workflows (ctx.step, retries, cron, state), agents and tools (MCP, sandboxes, memory, handoffs), agent skills/AGENTS.md, human-in-the-loop pauses, prompts and caching, direct model calls, webhook/event triggers and chat bots; call AGNT5 from a backend (Client); deploy, promote, roll back, secrets, agnt5.yaml, serverless endpoints; tests, scorers, experiments and CI gates, online evals; look up runs, traces, logs, metrics. Also use to investigate one run that failed, was slow, cost too much or answered wrong ("why did run X fail"), or to find recurring failures, cost or latency regressions across runs ("what's going wrong", "why is cost up").
---

# AGNT5

AGNT5 runs durable AI components: **functions** (retryable units of work), **workflows**
(durable orchestrators that resume from the last completed step after a crash), **agents**
(an LLM loop with tools), **tools**, and **scorers**. You register them on a **worker**, run it
locally with `agnt5 dev`, and ship it with `agnt5 deploy` (or as a serverless endpoint). Every
execution is a **run** you can inspect in Studio, the CLI, or the AGNT5 MCP server.

Written against Python SDK **0.13.6**, TypeScript `@agnt5/sdk` **0.10.5**, Go `sdk-go` **v0.10.3**
and the September 2026 CLI.

## How to use this skill

1. Find the task in the tables below and open that topic's `overview.md`. Read only the
   topics the task needs; follow their cross-links when they point elsewhere.
2. Every topic lives at `references/<stage>/<topic>/`. `overview.md` shows the Python API;
   the same folder has `typescript.md` and `go.md` with the exact
   signatures for that SDK and what it does not support. For a TypeScript or Go project, read
   that file too — it overrides the Python examples.
3. `client`, `models`, `serverless` and `testing` are the exception: `overview.md` covers all
   three SDKs, and the per-language detail is in `python.md`, `typescript.md` and `go.md`.

## Build

| Task | Read |
|---|---|
| Functions with retries/backoff/timeouts; durable workflows: `ctx.step` keys, parallel fan-out, durable sleep, cron, chat workflows, run/session/user state, `ctx.emit`, streaming, idempotency keys | [build/workflows](references/build/workflows/overview.md) |
| Agents and tools: `Agent(...)` options, `@tool`, built-in and MCP tools, sandboxes, callbacks/guardrails, memory, handoffs, agents-as-tools, a rejected model call | [build/agents-tools](references/build/agents-tools/overview.md) (+ `sandbox-providers.md`) |
| Give an agent SKILL.md folders or AGENTS.md guidance at runtime | [build/agent-skills](references/build/agent-skills/overview.md) |
| Call a model directly (`lm.generate`/`stream`, `LM.<provider>()`, `ctx.Generate`), providers and API keys, structured output, model quirks, 400/invalid-model errors | [build/models](references/build/models/overview.md) |
| Versioned `prompts/<id>.mdx` artifacts, pinning versions, runtime model overrides, prompt caching | [build/prompts](references/build/prompts/overview.md) |
| Pause a workflow or agent for approval, a question, or a selection; answer a paused run | [build/human-in-the-loop](references/build/human-in-the-loop/overview.md) |
| Webhook/event triggers (Stripe, GitHub, Sentry, Slack, Standard Webhooks), `POST /v1/events`, chat bots | [build/webhooks-integrations](references/build/webhooks-integrations/overview.md) |
| Generate a whole project from a description ("build me an agent that…") or from a template | [build/ai-templates](references/build/ai-templates/overview.md) (+ `providers.md`) |

## Ship

| Task | Read |
|---|---|
| Install/update/log in to the CLI, create or link a blank project, `.env`, `agnt5 dev`, `agnt5 run`, a worker that won't start | [ship/project-init](references/ship/project-init/overview.md) |
| Secrets and provider keys, `agnt5 deploy`, `agnt5.yaml`, what gets bundled, deploy failures, promote, roll back, scale | [ship/deploy](references/ship/deploy/overview.md) |
| Run components as a signed HTTP endpoint (FastAPI, Express, Cloudflare, Vercel, Cloud Run), `agnt5 serverless` lifecycle, external signals | [ship/serverless](references/ship/serverless/overview.md) |
| Call deployed components from your backend, scripts or CI: clients, service keys, run vs submit, streaming, sessions, batches, resuming a paused run | [ship/client](references/ship/client/overview.md) |

## Improve

| Task | Read |
|---|---|
| Unit-test components without a worker, fake a model, smoke-test against `agnt5 dev` or a deployment | [improve/testing](references/improve/testing/overview.md) |
| Define "correct": built-in checks, LLM-as-judge presets, custom `@scorer`, project scorer IDs, `config_error`, reading scores | [improve/scorers](references/improve/scorers/overview.md) |
| Eval datasets, experiment runs, comparing runs, CI pass-rate gates, `client.eval()` | [improve/experiments](references/improve/experiments/overview.md) |
| Score a sample of live production runs continuously (online evals) | [improve/online-evals](references/improve/online-evals/overview.md) |

## Debug

| Task | Read |
|---|---|
| Look up runs, traces, logs and metrics; follow or cancel a run; add spans/log attributes; automatic OpenAI/Agents SDK/ADK capture | [debug/observe](references/debug/observe/overview.md) |
| Root-cause **one** run: failed, slow, expensive, or wrong answer (given a run or trace ID) | [debug/run-investigation](references/debug/run-investigation/overview.md) |
| Find **recurring** behaviors across many runs: failure modes, cost/latency regressions, cohort problems, quality drift | [debug/pattern-analysis](references/debug/pattern-analysis/overview.md) |
| Connect the AGNT5 MCP server and see which tools the investigation guides use | [debug/mcp-tools](references/debug/mcp-tools.md) |

The two investigation guides are playbooks for analyzing live data through the AGNT5 MCP
server (`claude mcp add agnt5 -- agnt5 mcp`), not guides for writing code. They are
read-only: recommend fixes, never deploy, roll back, or edit anything while investigating.
