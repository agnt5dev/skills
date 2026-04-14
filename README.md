# skills

A collection of [skills](https://github.com/anthropics/claude-code) for AI coding agents.

## Install

```bash
npx skills add https://github.com/agnt5dev/skills
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

| Skill | Description |
|-------|-------------|
| `agnt5-ai-templates` | Generate AGNT5 workflow templates from a blueprint description. Scaffolds new agent workflows, workers, functions, and pipelines. |
| `agnt5-dev-environment` | Set up and run AGNT5 worker templates in the dev environment. Handles dependency installation, `.env` config, `agnt5 dev`, and startup troubleshooting. |

## Usage

Once installed, invoke a skill in your agent by describing the task it handles. For example:

- "Create a new AGNT5 template for a document processing pipeline" → uses `agnt5-ai-templates`
- "Set up and run this AGNT5 worker locally" → uses `agnt5-dev-environment`

> Review skills before use — they run with full agent permissions.
