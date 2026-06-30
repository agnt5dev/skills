---
name: agnt5-experiments
description: Run an AGNT5 component or prompt against a dataset version, score every item, compare runs, and gate CI on pass-rate thresholds; or run lighter-weight inline evals with client.eval()/batch_eval() during development. Use when comparing a prompt/model/code change against a baseline before shipping it.
---

# AGNT5 Experiments

An **experiment** binds a target (deployed component or Prompt) to a dataset version and a
set of scorers (see `agnt5-datasets`, `agnt5-scorers`). Each **experiment run** executes the
target against every dataset item, scores the outputs, and produces a comparable pass/fail
summary. Both the experiment definition and the dataset are versioned/immutable, so two runs
over the same dataset version are directly comparable.

## When to use this vs. batch eval

| Use `agnt5 experiments` (this, platform-tracked) | Use `client.eval()`/`batch_eval()` (SDK, code-only) |
|---|---|
| Need to gate CI on a threshold | Quick local regression check during development |
| Comparing across deployments/dataset versions over time | One-off quality check, no need to persist results |
| Need Studio visibility, annotations, rescoring | Don't need the full platform overhead |

## Create and run (CLI)

```bash
agnt5 experiments create --name support-agent-quality \
  --dataset-id <dataset-id> --dataset-version-id <dataset-version-id> \
  --target-type component --deployment-id <deployment-id> \
  --component-name support_agent --component-type agent \
  --builtin-scorer json_valid --builtin-scorer correctness \
  --config '{"passed_threshold":1}'

# Target a Prompt instead of a component:
agnt5 experiments create --name support-prompt-comparison \
  --dataset-id <dataset-id> --dataset-version-id <dataset-version-id> \
  --target-type prompt --deployment-id <deployment-id> \
  --prompt-id <prompt-id> --prompt-version-id <prompt-version-id> \
  --builtin-scorer correctness

agnt5 experiments run <experiment-id>                          # fire and forget
agnt5 experiments run <experiment-id> --wait --timeout 15m      # block, non-zero exit if gate fails
agnt5 experiments run <experiment-id> --deployment-id <candidate-id> --name "pr-1234"  # compare a candidate
```

Required for create: `--name`, `--dataset-id`, `--dataset-version-id`, a target
(`--target-type component --deployment-id --component-name --component-type` or
`--target-type prompt --prompt-id`), at least one `--builtin-scorer <name|json>` or
`--scorer-id <uuid>`.

## Inspect results

```bash
agnt5 experiments runs list <experiment-id>
agnt5 experiments runs show <run-id>            # status, pass rate, per-scorer aggregates
agnt5 reports summary <run-id>                  # same, standalone
agnt5 reports failures <run-id>                 # failed items only
agnt5 scores list --run-id <run-id>
agnt5 experiments runs cancel <experiment-id> <run-id>
```

## Compare two runs

```bash
agnt5 experiments runs compare <base-run-id> <compare-run-id>
```

Shows aggregate score movement and which items flipped pass/fail.

## Gate CI on results

```bash
agnt5 experiments run <experiment-id> --deployment-id "$CANDIDATE_DEPLOYMENT_ID" \
  --name "ci-$GIT_SHA" --wait --fail-on-gate
agnt5 reports wait <run-id> --timeout 15m       # or wait on an already-started run
agnt5 reports ci <run-id>                       # print the gate verdict
agnt5 reports export <run-id> --artifact-format csv --out-file eval-results.csv
```

| Exit code | Meaning |
|---|---|
| `0` | Gate passed |
| `2` | CI gate failed (pass rate below threshold) |
| `3` | Run failed or cancelled |
| `4` | Wait timed out |

`--fail-on-gate` defaults `true` with `--wait`; pass `--fail-on-gate=false` to inspect the
result yourself instead of failing the pipeline. Threshold lives on the experiment's
`--config '{"passed_threshold": <0..1>}'`, not in the pipeline script.

## Turn failures into a regression test

```bash
agnt5 experiments runs regression-dataset <run-id> --name support-agent-regressions --start-run --wait
# rerun against a specific fix candidate:
agnt5 experiments runs regression-dataset <run-id> --name support-agent-regressions \
  --start-run --deployment-id <candidate-deployment-id> --wait
```

Builds a dataset from the failed items, creates a regression experiment over it, and (with
`--start-run`) kicks off the first rerun immediately. Feeds `agnt5-quality-cases`.

## Rescore without re-executing

After fixing a scorer's logic/threshold, rescore a **completed** run's existing outputs:

```bash
curl -X POST "https://api.agnt5.com/api/v1/projects/<project-id>/experiments/<experiment-id>/runs/<run-id>/rescore" \
  -H "Authorization: Bearer <token>" -H "Content-Type: application/json" \
  -d '{"reason": "updated_rubric", "replace_latest": true}'
agnt5 reports ci <run-id>     # check the updated verdict
```

Optional: `scorer_version_ids`, `run_item_ids` to narrow scope, `idempotency_key`.

## Annotate run items (human label vs. scorer verdict)

```bash
curl -X POST ".../experiments/<experiment-id>/runs/<run-id>/items/<item-id>/annotations" \
  -H "Authorization: Bearer <token>" -H "Content-Type: application/json" \
  -d '{"name": "human_label", "label": "pass", "metadata": {"reviewer": "alice"}}'
```

Stored separately from scores, used for meta-evaluation (scorer accuracy vs. human judgment).

## Inline evals from code: `client.eval()` / `client.batch_eval()`

Needs a running worker (`AGNT5_GATEWAY_URL`, falls back to `https://gw.agnt5.com`):

```python
from agnt5 import Client
from agnt5.eval import Correctness

client = Client()
result = client.eval(component="support_agent", component_type="agent",
                      input_data={"message": "Where is my order #1234?"},
                      expected="Your order #1234 is in transit", scorers=[Correctness()])
print(result.passed, result.output)
```

```python
from agnt5 import Client, BatchEvalItem

client = Client()
result = client.batch_eval(
    component="support_agent", component_type="agent",
    items=[
        BatchEvalItem(input={"message": "Where is my order #1234?"}, expected="...", item_id="order-status"),
        BatchEvalItem(input={"message": "Cancel order #5678"}, expected="...", item_id="order-cancel"),
    ],
    scorers=["exact_match"],          # strings, preset instances, or LLMJudge(...) — mix freely
    max_concurrency=10,               # start at 3-5 during development
    timeout=60.0,
)
print(f"Pass rate: {result.pass_rate:.0%}")
for item in result.results:
    print(item.item_id, "PASS" if item.passed else "FAIL", item.duration_ms)
```

Item input forms (mix freely): plain dicts + separate `expected` list; dicts with
`input`/`expected` keys; `BatchEvalItem(input, expected?, item_id?)` for full control.

`BatchEvalResult`: `batch_id`, `status` (`completed`/`partial_failure`/`failed`), `results`,
`stats`, `pass_rate`, `passing_items()`, `failing_items()` (scoring failures),
`failed_items()` (evaluation errors — distinct from scoring failures, check both).

TypeScript: `client.batchEval(component, items, { scorers, componentType, maxConcurrency })`,
same types from `@agnt5/sdk`, reads `AGNT5_GATEWAY_URL` from `process.env`.

## Output and project targeting (all eval commands)

`--format table|json|jsonl` (jsonl for `jq` piping), `--project-id <uuid>`.

## Source

- https://agnt5.com/docs/improve/experiments -- `agnt5 experiments create/run/runs
  list|show|compare|regression-dataset`, `agnt5 reports summary|failures|ci|wait|export`, CI
  gating exit codes, rescoring a completed run, annotating run items.
- https://agnt5.com/docs/improve/batch-eval -- `client.eval()`/`client.batch_eval()` SDK
  methods, input formats, concurrency/timeouts, reading `BatchEvalResult`.
