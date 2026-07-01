---
name: agnt5-project-init
description: Create a brand-new, empty AGNT5 project from scratch (no blueprint or template) and authenticate the CLI. Use when the user asks to create a new AGNT5 project/worker without describing agents or workflows to generate — just a blank project shell to build up manually.
---

# AGNT5 Project Init

## 0. Install and authenticate the CLI (one-time, machine-wide)

Skip if `agnt5 version` already succeeds and `agnt5 auth status` shows a signed-in user.

```bash
curl -LsSf https://agnt5.com/cli.sh | bash    # macOS, Linux, WSL2
brew install agnt5/tap/agnt5                  # macOS only, alternative
agnt5 version                                 # verify
agnt5 auth login                              # browser OAuth, writes key to ~/.agnt5/config.yaml
agnt5 auth status                             # confirms signed-in user + environment
```

For CI / non-interactive environments: `agnt5 auth login --api-key agnt5_sk_...` or
`export AGNT5_API_KEY=agnt5_sk_...`.

Full install/PATH troubleshooting lives in the `agnt5-local-development` skill — use this
condensed version here and defer to that skill if `agnt5 version` still fails after install.

## 1. Create the empty project

Two entry points, depending on whether you already have a directory:

**Starting fresh (no directory yet)** — `agnt5 create` makes a new directory, scaffolds a
blank starter project into it, and registers it on AGNT5:

```bash
agnt5 create my-project              # new dir, scaffolds blank starter, registers on AGNT5
agnt5 create my-project --local      # same, but skip registering on AGNT5 (fully offline)
```

**Already in a directory you want to become the project** — `agnt5 init` (alias `link`) sets
up the *current* directory:

```bash
agnt5 init my-project                       # scaffold + link the current directory
agnt5 init                                  # inspect current dir, offer to scaffold or link
agnt5 init --new --name my-project          # force: create a fresh empty project + link in one step
agnt5 init --project <project-id>           # link to an existing project instead of creating one
```

**Do not pass `--template <language>/<name>`** to either command for a blank project — that
scaffolds a specific blueprint template, which is the `agnt5-ai-templates` skill's job (used
when the user describes agents/workflows to generate). Omitting `--template` is what makes
the project empty.

## 2. Flags reference

| Flag | Applies to | Effect |
|---|---|---|
| `--local` | `create` | Scaffold locally without registering on AGNT5 |
| `--dry-run` | `create`, `init` | Show what would be created/linked without executing |
| `--new` | `init` | Create a fresh empty project and link to it, instead of picking an existing one |
| `--name <name>` | `init` | Project name, used with `--new` (alternative to positional arg) |
| `--project <id>` | `init` | Link to an existing project by ID/ref instead of scaffolding |
| `--language <lang>` | `create`, `init` | Language for scaffolding (defaults to `agnt5.yaml` or `python`) |
| `--workspace <id>` | `init` | Workspace to link within, skips the workspace picker prompt |
| `-v, --verbose` | `create`, `init` | Show verbose output |

## 3. What actually gets created

Per `agnt5 init`'s own behavior (same scaffolding logic `agnt5 create` wraps):

- **Empty directory** → offers to scaffold a minimal starter project, then links it.
- **Existing code, no `agnt5.yaml`** → adds a minimal `agnt5.yaml`, then links.
- **Already an AGNT5 directory** → links (or updates an existing link).

Linking walks you through picking a workspace, then a project within it (or offers to
create a new one) — unless `--project`, `--workspace`, or `--new` short-circuit the prompts.

## 4. Verify and next steps

```bash
agnt5 auth status   # confirm signed-in user + environment
agnt5 info           # confirm the project this directory is linked to
```

Once the empty project is created and linked, hand off to the `agnt5-local-development`
skill for `uv sync` → `.env` setup → `agnt5 dev` to start building inside it.

## Quick Reference

| Step | Command |
|------|---------|
| Install CLI | `curl -LsSf https://agnt5.com/cli.sh \| bash` |
| Authenticate | `agnt5 auth login` |
| New dir, registered | `agnt5 create <name>` |
| New dir, local-only | `agnt5 create <name> --local` |
| Current dir, forced empty | `agnt5 init --new --name <name>` |
| Link to existing project | `agnt5 init --project <project-id>` |
| Verify | `agnt5 auth status` / `agnt5 info` |
| Next | `agnt5-local-development` skill (`uv sync`, `.env`, `agnt5 dev`) |

## Source

- https://agnt5.com/docs/install-cli -- CLI install, `agnt5 create`/`agnt5 init` scaffolding
  commands, `agnt5 auth login`/`auth status`.
