---
name: agnt5-observe
description: Inspect AGNT5 production behavior - list and describe runs, read execution traces (steps, tool calls, LLM spans), stream or query logs, and read throughput/latency/cost metrics, from the CLI, API, or Studio. Use when debugging a failed or slow run, or investigating why a deployed workflow behaved unexpectedly.
---

# AGNT5 Observe

A **run** is one execution of a workflow/function/agent. A **trace** is its full execution
timeline — a span tree (workflow → steps → function calls → agent iterations → LLM calls →
tool calls). **Logs** are structured output scoped to the run that produced them.

## Debug a failed run — the standard sequence

```bash
agnt5 inspect runs ls --status failed --since 1h
agnt5 inspect runs describe <runId>
agnt5 inspect logs -r <runId> --severity ERROR
agnt5 inspect trace -r <runId>
```

## Runs

```bash
agnt5 inspect runs ls
agnt5 inspect runs ls --status failed --since 1h
agnt5 inspect runs ls --component my_workflow -w          # watch mode, refresh every 2s
agnt5 inspect runs ls --output json | jq '.[].run_id'
agnt5 inspect runs describe <runId>
```

| Flag | Description |
|---|---|
| `--status` | `completed`, `failed`, `running`, `pending` |
| `--component <name>` / `--component-type <type>` | Filter by component |
| `--since <window>` | e.g. `1h`, `24h`, `7d` |
| `--limit <n>` | Default 20 |
| `-w` | Watch mode |
| `--output json` / `-o json` | Machine-readable |

Each run records: run ID, component name+type, status, duration, queue time, step count,
retries, LLM call count, LLM cost, error (on failure). `describe` also prints next-step
commands (`agnt5 inspect logs -r ...`, `agnt5 inspect trace -r ...`).

## Traces

```bash
agnt5 inspect trace -r <runId>             # tree view, error spans highlighted red
agnt5 inspect trace -r <runId> --flat      # flat list by start time — useful for long traces
agnt5 inspect trace -r <runId> --verbose   # include span attrs: inputs/outputs/model/tokens
agnt5 inspect trace -r <runId> --output json > trace.json
```

Tree example:
```
workflow.travel_booking_workflow      [27.9s]
agent.travel_booking_agent            [27.0s]
chat openai/gpt-5-mini                [8.9s]
tool.search_flights                   [197ms]
```

In Studio: open the run → **Trace** tab — interactive tree, updates live while running.

## Logs

```bash
agnt5 inspect logs -r <runId>
agnt5 inspect logs -r <runId> --severity ERROR
agnt5 inspect logs -r <runId> --follow      # live stream while a run is in progress
agnt5 inspect logs -r <runId> --tail 20
```

## Metrics (Studio only)

- **Analytics** — summary for a time window: total executions, success rate, P95 latency,
  total LLM cost; charts for executions/latency over time, LLM usage by model, top errors.
- **Metrics** — per-component breakdown; filters: deployment, component, status; granularity
  `auto|1m|5m|1h|1d`; auto-refresh; UTC toggle.

Time ranges: `1h`, `3h`, `24h`, `7d`, `30d`, or custom.

## Machine-readable output (any CLI command)

`--output json` / `-o json` forces JSON; `--output text` forces text. Precedence: explicit
flag > deprecated `--json` (still works, warns on stderr) > `AGNT5_OUTPUT`/`OUTPUT_FORMAT` env
vars > auto-detect (text on a TTY, JSON when piped/redirected — so
`agnt5 inspect runs ls | jq` gets structured output automatically).

Envelope shape: `{"data": {...}}` on success, `{"data": [...], "meta": {...}}` with
pagination, `{"error": {"message", "code", "category", "suggestions"}}` on failure
(stderr, non-zero exit). If the upstream API already nests under `"data"`, the CLI hoists it
so double-nesting never appears.

## Source

- https://agnt5.com/docs/run/deploying (Runs, Traces, Logs, Metrics, Common workflows,
  Machine-readable output sections) -- `agnt5 inspect runs ls/describe`,
  `agnt5 inspect trace -r <runId>`, `agnt5 inspect logs -r <runId>`, REST endpoints, Studio
  Analytics/Metrics pages, global `--output json` envelope shape.
