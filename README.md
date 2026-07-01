# skills

A collection of [skills](https://github.com/anthropics/claude-code) for AI coding agents.

## Install

```bash
npx skills add https://github.com/agnt5dev/skills
```

To install all skills to Claude Code only, without prompts:

```bash
npx skills add https://github.com/agnt5dev/skills -s '*' -a claude-code -y
```

You'll be prompted to select which skills to install, which agents to target, and the installation scope.

### Options

| Option | Description |
|--------|-------------|
| `-g, --global` | Install to user directory instead of project |
| `-a, --agent <agents...>` | Target specific agents (e.g., `claude-code`, `codex`). See [Available Agents](https://github.com/anthropics/claude-code) |
| `-s, --skill <skills...>` | Install specific skills by name (use `'*'` for all skills) |
| `-l, --list` | List available skills without installing |
| `--copy` | Copy files instead of symlinking to agent directories |
| `-y, --yes` | Skip all confirmation prompts |
| `--all` | Install all skills to all agents without prompts |

**Examples:**

```bash
# Install a specific skill to Claude Code only
npx skills add https://github.com/agnt5dev/skills -s agnt5-ai-templates -a claude-code

# Install all skills globally without prompts
npx skills add https://github.com/agnt5dev/skills --all -g

# List available skills without installing
npx skills add https://github.com/agnt5dev/skills --list
```

## Available Skills

Skills are grouped by the AGNT5 lifecycle: **build** it, **run** it, **improve** it.

### Build

| Skill | Description |
|-------|-------------|
| `agnt5-project-init` | Create a brand-new, empty AGNT5 project from scratch (no blueprint or template) and authenticate the CLI. |
| `agnt5-ai-templates` | Generate AGNT5 workflow templates from a blueprint description. Scaffolds new agent workflows, workers, functions, and pipelines. |
| `agnt5-workflows` | Define functions (retries/backoff/timeouts) and durable workflows: checkpointed steps, parallel fan-out, durable sleep, state, and event/webhook triggers. |
| `agnt5-agents-tools` | Configure agents and the tools they call: custom tools, built-in provider tools, MCP, sandboxes, and multi-agent patterns. |
| `agnt5-agent-skills` | Give an AGNT5 agent its own SKILL.md/AGENTS.md system at runtime — on-demand capabilities and standing project guidance. |
| `agnt5-human-in-the-loop` | Add durable human approval, input, or selection pauses to a workflow. |
| `agnt5-webhooks-integrations` | Trigger workflows from external events (webhooks, Sentry, Stripe, GitHub, Slack) and connect AI provider or app integrations. |
| `agnt5-prompts` | Manage versioned, code-bundled Prompt artifacts and runtime model overrides. |

### Run

| Skill | Description |
|-------|-------------|
| `agnt5-local-development` | Set up and run AGNT5 worker templates in the dev environment. Handles dependency installation, `.env` config, `agnt5 dev`, and startup troubleshooting. |
| `agnt5-deploy` | Deploy a worker to a managed environment, set secrets, promote/roll back, and scale. |
| `agnt5-observe` | Inspect production runs, traces, logs, and metrics; debug failed or slow runs. |

### Improve

| Skill | Description |
|-------|-------------|
| `agnt5-datasets` | Curate eval datasets from production runs or manual examples and publish immutable versions. |
| `agnt5-scorers` | Pick built-in deterministic/LLM-as-judge scorers or write a custom scorer. |
| `agnt5-experiments` | Run a component or prompt against a dataset version, compare results, and gate CI. |
| `agnt5-online-evals` | Sample and score production runs asynchronously, with alerting on quality drops. |
| `agnt5-quality-cases` | Track a regression or production issue through a structured lifecycle to a verified fix. |

### Write

| Skill | Description |
|-------|-------------|
| `agnt5-blog-writing` | Write or edit a blog post for the AGNT5 blog in a voice that reads as genuinely human-written, not generic AI-blog prose. |

## Usage

Once installed, invoke a skill in your agent by describing the task it handles. For example:

- "Create a new empty AGNT5 project" → uses `agnt5-project-init`
- "Create a new AGNT5 template for a document processing pipeline" → uses `agnt5-ai-templates`
- "Set up and run this AGNT5 worker locally" → uses `agnt5-local-development`
- "Write a blog post about our new deploy pipeline" → uses `agnt5-blog-writing`

> Review skills before use — they run with full agent permissions.
