---
name: agnt5-dev-environment
description: Set up and run AGNT5 worker templates in the development environment. Use when the user wants to install dependencies, initialize a project, configure .env, run agnt5 dev, or troubleshoot worker startup errors for a template directory.
---

# AGNT5 Worker Runner

This skill covers the full lifecycle of running an AGNT5 worker template locally — from first install through a live `agnt5 dev` session connected to the managed cloud coordinator.

## Full Setup Sequence (new template)

Run these steps in order inside the template directory (e.g. `weather_agent/`):

### 1. Install dependencies

```bash
uv sync
```

Creates a local `.venv` and installs all packages from `pyproject.toml`.

> **Note:** If you see `VIRTUAL_ENV does not match the project environment path`, that warning is safe to ignore — uv uses the project-local `.venv`, not the repo-root one.

### 2. Configure environment variables

```bash
cp .env.example .env
# Then fill in .env with real API keys
```

Required keys vary by template — check `.env.example`. Common keys:
- `OPENAI_API_KEY` — required by any agent using OpenAI models
- `OPENWEATHER_API_KEY` — required by the weather agent
- `ANTHROPIC_API_KEY` — required by agents using Claude models

### 3. Initialize the project on the server

```bash
agnt5 init
```

This links the local `agnt5.yaml` to a project on the AGNT5 platform:
- Choose **Create new project** if this template has never been deployed
- Choose **Link to existing project** if re-initializing a known project
- Select a workspace when prompted

You only need to run `agnt5 init` once per template. It writes project metadata to `agnt5.yaml`.

### 4. Start the worker

```bash
agnt5 dev
```

Starts the worker with hot-reload. Connects to the managed coordinator at `https://grpc.agnt5.com:3418`.

A healthy startup looks like:

```
  weather-agent v1.0.0
  ────────────────────────────────────────
  ◆ workflows (1)
    └── weather_agent_workflow
  ● agents (1)
    └── WeatherAgent
  ◇ tools (3)
    ├── check_severe_weather
    ├── get_current_weather
    └── get_forecast
  ────────────────────────────────────────
  Dashboard: https://app.agnt5.com

[INFO] Connected to coordinator (https://grpc.agnt5.com:3418)
```

### 5. Test via the dashboard

Open https://app.agnt5.com, navigate to your project, and trigger a run from the UI.

---

## Common Errors & Fixes

### `ModuleNotFoundError: No module named 'agnt5'`

Dependencies not installed yet.

```bash
uv sync
```

### `managed mode requires AGNT5_TENANT_ID in metadata`

Project not initialized — the worker doesn't know which tenant to register under.

```bash
agnt5 init
```

Then select or create a project and re-run `agnt5 dev`.

### `ValueError: Invalid configuration: OPENAI_API_KEY must be set`

The `.env` file is missing or the key is not filled in.

```bash
cp .env.example .env
# Edit .env and set OPENAI_API_KEY=sk-...
```

### `VIRTUAL_ENV does not match the project environment path`

This warning from uv is harmless. The project-local `.venv` takes precedence. No action needed.

### Worker connects but runs fail immediately

Check that all required API keys are set in `.env`. The worker starts successfully but agents fail at runtime when keys are missing.

### Port or connection errors

Verify you are logged in to the right context:

```bash
agnt5 context list
agnt5 context use managed   # switch to managed if needed
```

---

## Hot Reload

`agnt5 dev` watches for file changes in:
- `.` (root)
- `src/`
- `src/<package_name>/`

Saving any `.py` or `.env` file triggers an automatic worker restart. No manual restart needed during development.

---

## Stopping the Worker

Press `Ctrl+C`. The worker flushes in-flight events before exiting. The `CancelledError` / `KeyboardInterrupt` traceback printed after Ctrl+C is expected and not an error.

---

## Re-initializing After Moving a Template

If you move the template directory or clone it on a new machine:

```bash
uv sync          # reinstall deps
agnt5 init       # re-link to the project (choose "Link to existing")
agnt5 dev        # start worker
```

---

## Quick Reference

| Step | Command |
|------|---------|
| Install deps | `uv sync` |
| Configure secrets | `cp .env.example .env` then edit |
| Initialize project | `agnt5 init` |
| Start worker | `agnt5 dev` |
| Stop worker | `Ctrl+C` |
| Switch context | `agnt5 context use managed` |
| Check auth | `agnt5 auth status` |
