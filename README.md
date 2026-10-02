# skills

An [Agent Skill](https://agentskills.io) for AI coding agents working with [AGNT5](https://agnt5.com).
Written against AGNT5 Python SDK **0.13.6**, TypeScript `@agnt5/sdk` **0.10.5**, Go `sdk-go` **v0.10.3** and the September 2026 CLI.

Everything ships as **one skill, `agnt5`**, so your agent's skill list gets one entry instead
of eighteen. Its [`SKILL.md`](agnt5/SKILL.md) is a short router; the agent opens only the
reference it needs for the task at hand.

## Install

```bash
npx skills add https://github.com/agnt5dev/skills
```

To install to Claude Code only, without prompts:

```bash
npx skills add https://github.com/agnt5dev/skills -a claude-code -y
```

You'll be prompted to select which agents to target and the installation scope.

### Options

| Option | Description |
|--------|-------------|
| `-g, --global` | Install to user directory instead of project |
| `-a, --agent <agents...>` | Target specific agents (e.g., `claude-code`, `codex`) |
| `-l, --list` | List available skills without installing |
| `--copy` | Copy files instead of symlinking to agent directories |
| `-y, --yes` | Skip all confirmation prompts |
| `--all` | Install to all agents without prompts |

**Examples:**

```bash
# Install globally to Claude Code
npx skills add https://github.com/agnt5dev/skills -a claude-code -g -y

# Install to all agents without prompts
npx skills add https://github.com/agnt5dev/skills --all -g
```

Re-run the same command to update to the latest version, then start a new agent session.

### Upgrading from the separate `agnt5-*` skills

Earlier versions shipped 18 skills (`agnt5-workflows`, `agnt5-deploy`, `agnt5-run-investigation`,
…). Remove those installs (for Claude Code: delete the `agnt5-*` folders from `.claude/skills/`
or `~/.claude/skills/`) and install `agnt5` instead. All their content is in `agnt5/references/`.

## Layout

```
agnt5/
  SKILL.md                       router: what AGNT5 is, and which reference to read for a task
  references/<stage>/<topic>/
    overview.md                  the topic, with Python examples
    typescript.md, go.md         the same sections for the other SDKs
```

Topics are grouped by the AGNT5 lifecycle: **build** it, **ship** it, **improve** it, **debug** it.

### Build

| Topic | Covers |
|-------|--------|
| [`workflows`](agnt5/references/build/workflows/overview.md) | Functions (retries/backoff/timeouts) and durable workflows: keyed steps, parallel fan-out, durable sleep, cron, state, idempotency keys. |
| [`agents-tools`](agnt5/references/build/agents-tools/overview.md) | Agents and their tools: custom/built-in/MCP tools, sandboxes, callbacks, memory, handoffs, agents-as-tools. |
| [`agent-skills`](agnt5/references/build/agent-skills/overview.md) | Give an AGNT5 agent its own SKILL.md/AGENTS.md system at runtime — on-demand capabilities and standing project guidance. |
| [`models`](agnt5/references/build/models/overview.md) | Direct model calls (`lm.generate`/`stream`, `LM.<provider>()`, `ctx.Generate`): providers and keys, messages, structured output, streaming, and per-model quirks such as gpt-6. |
| [`prompts`](agnt5/references/build/prompts/overview.md) | Versioned, code-bundled Prompt artifacts, runtime model overrides, and prompt caching. |
| [`human-in-the-loop`](agnt5/references/build/human-in-the-loop/overview.md) | Add durable human approval, input, or selection pauses to a workflow. |
| [`webhooks-integrations`](agnt5/references/build/webhooks-integrations/overview.md) | Webhook and event triggers (Stripe, GitHub, Sentry, Slack, Standard Webhooks), chat bots, and calling workflows from your app. |
| [`ai-templates`](agnt5/references/build/ai-templates/overview.md) | Generate a complete AGNT5 project from a description (Python, TypeScript, Go), or scaffold from a template. |

### Ship

| Topic | Covers |
|-------|--------|
| [`project-init`](agnt5/references/ship/project-init/overview.md) | Install and authenticate the CLI, create or link a project, and run it locally (`uv sync`, `.env`, `agnt5 dev`, `agnt5 run`, troubleshooting). |
| [`deploy`](agnt5/references/ship/deploy/overview.md) | Secrets and provider credentials, `agnt5 deploy`, verify, `agnt5 deployment promote`, roll back, and scale. |
| [`serverless`](agnt5/references/ship/serverless/overview.md) | Run components without a worker: `serve()` for Python, Node, Cloudflare and Vercel, the Go `serverless` package, signing secrets, and the `agnt5 serverless` lifecycle. |
| [`client`](agnt5/references/ship/client/overview.md) | Call AGNT5 from your own backend: the Python, TypeScript and Go clients, sessions, batches, streaming results, and answering a paused human-in-the-loop run. |

### Improve

| Topic | Covers |
|-------|--------|
| [`testing`](agnt5/references/improve/testing/overview.md) | Test functions, workflows, tools and scorers without a worker, then smoke-test against `agnt5 dev` and production. |
| [`scorers`](agnt5/references/improve/scorers/overview.md) | Pick built-in deterministic/LLM-as-judge scorers or write and deploy a custom `@scorer`. |
| [`experiments`](agnt5/references/improve/experiments/overview.md) | Curate and version eval datasets, run a component or prompt against them, compare results, and gate CI. |
| [`online-evals`](agnt5/references/improve/online-evals/overview.md) | Score a sample of production runs in the background with live experiments. |

### Debug

| Topic | Covers |
|-------|--------|
| [`observe`](agnt5/references/debug/observe/overview.md) | Look up runs, traces, logs, and metrics; control automatic OpenAI/Agents SDK/ADK call capture. |
| [`run-investigation`](agnt5/references/debug/run-investigation/overview.md) | Find why one run failed, was slow, cost too much, or answered wrong: reads the run's events, logs, and deployment, compares with a healthy run, and returns a root cause with quoted evidence and a hand-off prompt for a coding agent. |
| [`pattern-analysis`](agnt5/references/debug/pattern-analysis/overview.md) | Find recurring behaviors across a project's runs (failure modes, cost or latency regressions, problems in one cohort or deployment) and report each with frequency and evidence. |

The two investigation guides work on your live AGNT5 data through the AGNT5 MCP server. They are
playbooks for an agent analyzing runs, not guides for writing code, and need the AGNT5 MCP
connected (`claude mcp add agnt5 -- agnt5 mcp`). See
[mcp-tools.md](agnt5/references/debug/mcp-tools.md) for the tools they use.

## Usage

Once installed, describe the task and the agent loads `agnt5`, then the matching reference. For example:

- "Create a new empty AGNT5 project" → `ship/project-init`
- "Create a new AGNT5 template for a document processing pipeline" → `build/ai-templates`
- "Write this workflow in TypeScript" → `build/workflows` and its `typescript.md`
- "Call this workflow from my FastAPI backend" → `ship/client`
- "Why did run 01a0d57b… fail?" → `debug/run-investigation`
- "Find patterns in today's runs for project a5sre" → `debug/pattern-analysis`

> Review skills before use — they run with full agent permissions.
