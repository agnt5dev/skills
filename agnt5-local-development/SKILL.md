---
name: agnt5-local-development
description: Set up and run AGNT5 worker templates in the development environment. Use when the user wants to install the AGNT5 CLI, authenticate, install dependencies, initialize a project, configure .env, run agnt5 dev, trigger a workflow locally, or troubleshoot worker startup errors for a template directory.
---

# AGNT5 Local Development

## 0. Install and authenticate the CLI (one-time, machine-wide)

Skip if `agnt5 version` already succeeds and `agnt5 auth status` shows a signed-in user.

```bash
curl -LsSf https://agnt5.com/cli.sh | bash    # macOS, Linux, WSL2
brew install agnt5/tap/agnt5                  # macOS only, alternative
```

Installer writes `agnt5` to `~/.agnt5/bin` and appends it to `PATH`. Open a new terminal, or
reload the current shell (`source ~/.zshrc` / `~/.bashrc` / `~/.config/fish/config.fish`).

```bash
agnt5 version       # verify
agnt5 auth login    # browser OAuth via PropelAuth, writes key to ~/.agnt5/config.yaml
agnt5 auth status   # confirms signed-in user, active environment, API base URL
```

For CI / non-interactive environments, skip the browser flow:

```bash
agnt5 auth login --api-key agnt5_sk_...
# or
export AGNT5_API_KEY=agnt5_sk_...
```

**`command not found: agnt5`** — PATH hasn't picked up the new entry:

```bash
echo $PATH | tr ':' '\n' | grep agnt5
export PATH="$HOME/.agnt5/bin:$PATH"   # bash, zsh — if nothing printed above
fish_add_path "$HOME/.agnt5/bin"       # fish
```

If `agnt5 version` still fails after fixing PATH, the binary didn't download — re-run the
install command and check its output before further PATH debugging.

## 1. Install project dependencies

```bash
uv sync
```

Creates a local `.venv`, installs everything from `pyproject.toml`. The
`VIRTUAL_ENV does not match the project environment path` warning from uv is harmless —
the project-local `.venv` takes precedence; no action needed.

## 2. Configure environment variables

```bash
cp .env.example .env
# fill in real API keys, e.g.:
export OPENAI_API_KEY=sk-...
```

Required keys vary by template — check `.env.example`. `agnt5 dev` reloads on `.env` saves,
so no manual restart needed after editing it.

## 3. Link the project (only if not already linked)

```bash
agnt5 init
```

Skip if the project was already scaffolded with `agnt5 create --template ...` or via the
`agnt5-ai-templates` skill against a real project ID — those already write project metadata
into `agnt5.yaml`. `agnt5 init` (alias `agnt5 link`) sets up the **current directory**; run
again with no name to relink, or `agnt5 init --project <project-id>` to bind to a specific one.

To create a brand-new **empty** project instead of relinking an existing one, see the
`agnt5-project-init` skill (`agnt5 create <name>` or `agnt5 init --new --name <name>`).

## 4. Start the worker

```bash
agnt5 dev
```

Boots the AGNT5 runtime and your worker together, with hot reload. Healthy startup:

```
╭──────────────────────────────────────────────────────────────────╮
│  ⭓  agnt5 dev                                                    │
│     20260530-9694ef · managed                                    │
│     ~/path/to/your/project                                       │
╰──────────────────────────────────────────────────────────────────╯
  worker       uv run --no-sync python app.py (pid 21991)
  coordinator  http://grpc.agnt5.com:3418
  watch        3 dirs · .py .ts .js .go .env

  Starting <service-name> worker…

  <service-name> v1.0.0
  ────────────────────────────────────────
  ◆ workflows (1)
    └── <workflow_name>
  ● agents (1)
    └── <AgentName>
  ◇ tools (3)
    ├── tool_one
    ├── tool_two
    └── tool_three
  ────────────────────────────────────────

  Connecting to coordinator (http://grpc.agnt5.com:3418)...
  Connected to coordinator (http://grpc.agnt5.com:3418)
```

It also prints a project-scoped **Studio URL**
(`https://app.agnt5.com/projects/<project-id>/components`) — open that exact link.

## 5. Trigger a run

**Via Studio**: open the printed Studio URL, pick the workflow/agent/tool/function, set the
input JSON, click **Run**. The run appears immediately with a live-updating trace tree —
click any node to see inputs/outputs/LLM calls. Studio also handles HITL pauses.

**Via the CLI** (no `--env` ⇒ routes to the local dev worker automatically):

```bash
agnt5 run hello_world --input '{"name": "Alice"}'                                    # function, streams output
agnt5 run my_workflow --type workflow --input '{"message": "..."}'                   # JSON on completion
agnt5 run my_tool --type tool --input '{"adults": 2}'
agnt5 run my_agent --type agent --input '{"message": "..."}'                         # input needs "message"
```

`--type` defaults to `function` and auto-detects the real type if omitted. Pipe/redirect for
scripting: `agnt5 run my_workflow --type workflow --input '{}' | jq` or `> result.json`. Add
`--env <environment-name>` to hit a deployed environment instead of the local worker.

## Hot reload

Watches 3 directories (project root, `src/`, `src/<package_name>/`) for `.py`, `.ts`, `.js`,
`.go`, `.env` changes — same behavior across Python/TypeScript/Go templates:

- **Code changes** — saved file → worker restarts and re-registers in seconds.
- **`.env` changes** — picked up on reload, no manual restart.

Deployment secrets are set separately at deploy time (`agnt5-deploy` skill).

## Stopping the worker

`Ctrl+C` — flushes in-flight events before exiting. The `CancelledError`/`KeyboardInterrupt`
traceback printed after is expected, not an error.

## Common errors

| Error | Fix |
|---|---|
| `ModuleNotFoundError: No module named 'agnt5'` | `uv sync` — deps not installed yet |
| `managed mode requires AGNT5_TENANT_ID in metadata` | `agnt5 init`, select/create a project, re-run `agnt5 dev` |
| `ValueError: ... OPENAI_API_KEY must be set` | `cp .env.example .env` and fill in the key |
| Worker connects but runs fail immediately | An API key required at runtime is missing from `.env` |
| Auth errors after `agnt5 dev` / `agnt5 deploy` | `agnt5 auth login` (run `agnt5 auth logout` first if you switched accounts) |
| Port/connection errors | `agnt5 context list` then `agnt5 context use managed` if on the wrong context |

## Re-initializing after moving the project

```bash
uv sync          # reinstall deps
agnt5 init       # re-link — choose "Link to existing"
agnt5 dev
```

## Quick Reference

| Step | Command |
|------|---------|
| Install CLI | `curl -LsSf https://agnt5.com/cli.sh \| bash` |
| Authenticate | `agnt5 auth login` |
| Install deps | `uv sync` |
| Configure secrets | `cp .env.example .env` then edit |
| Link project | `agnt5 init` |
| Start worker | `agnt5 dev` |
| Trigger locally | `agnt5 run <name> --type workflow\|function\|tool\|agent --input '{...}'` |
| Stop worker | `Ctrl+C` |
| Switch context | `agnt5 context use managed` |
| Check auth | `agnt5 auth status` |

## Source

- https://agnt5.com/docs/install-cli -- CLI install, verification, `agnt5 auth login`/
  `auth status`, PATH troubleshooting.
- https://agnt5.com/docs/build/local-development -- `agnt5 dev` lifecycle, zero-restart dev,
  Studio triggering, creating an X-API-KEY / service key, running from the CLI, triggering
  via the API.
