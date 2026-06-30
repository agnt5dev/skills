---
name: agnt5-scorers
description: Score AGNT5 component outputs - pick built-in deterministic checks (exact_match, json_schema, tool_called, ...), built-in LLM-as-judge presets (correctness, faithfulness, ...), or write a custom @scorer function, including trace assertions for glassbox checks. Use when defining what "correct" means for an experiment or online eval.
---

# AGNT5 Scorers

A **scorer** returns a score (0.0-1.0), a pass/fail verdict, and an optional explanation for
one component output. `agnt5-experiments` and online evals attach one or more scorers and run
them against every dataset item.

## Three scorer classes — pick the cheapest that works

| Class | Needs deployment? | When to use |
|---|---|---|
| **Built-in deterministic** | No — AGNT5-owned logic | Exact/structural checks: format, substring, tool calls, limits |
| **Built-in LLM-as-judge** | No — AGNT5-owned, configurable model/rubric | Subjective quality: correctness, helpfulness, tone |
| **Custom (`@scorer`)** | Yes — registers and deploys with your worker | Anything the built-ins can't express |

Default to deterministic first. Reach for LLM-as-judge only when there's no deterministic
check that captures "correct." Only write custom code when neither built-in covers it.

## Built-in deterministic scorers

Output scorers: `exact_match`, `contains`, `regex_match`, `json_valid`, `json_schema`,
`numeric_range`, `levenshtein`, `structured_assertions`.

Trace scorers (need `events` on the dataset item — captured when importing from a run):
`tool_called` / `tool_not_called`, `tool_sequence` / `tool_sequence_in_order` /
`tool_sequence_exact` / `tool_sequence_any_order`, `tool_trajectory`, `tool_params_match`,
`max_tool_calls` / `max_llm_calls`, `max_tokens`, `duration_under`, `no_errors`,
`state_equals`.

```bash
agnt5 experiments create --name support-agent-quality \
  --dataset-id <dataset-id> --dataset-version-id <dataset-version-id> \
  --deployment-id <deployment-id> --component-name support_agent --component-type agent \
  --builtin-scorer json_valid \
  --builtin-scorer '{"name":"tool_called","config":{"tool":"search_orders"}}' \
  --builtin-scorer '{"name":"max_llm_calls","config":{"max":5}}'
```

Bare name = default behavior; JSON object = name + config.

## Built-in LLM-as-judge scorers

`llm_judge` (generic — you supply criteria/rubric), `correctness` (matches input + expected),
`faithfulness` (no hallucination vs. configured context fields). Needs a provider credential
configured as a project secret (e.g. `OPENAI_API_KEY`).

```bash
--builtin-scorer correctness \
--builtin-scorer '{"name":"llm_judge","config":{"criteria":"Is the response concise and actionable?","model":"openai/gpt-4o-mini"}}'
```

### SDK evaluator presets (for `client.eval()`/`batch_eval()`, see `agnt5-experiments`)

```python
from agnt5.eval import Correctness, Helpfulness, Faithfulness

scorers = [
    Correctness(),
    Helpfulness(model="openai/gpt-4o"),
    Faithfulness(context_fields=["retrieved_chunks"]),
]
```

Full preset list: `Correctness`, `Faithfulness`, `Helpfulness`, `Coherence`, `Conciseness`,
`ResponseRelevance`, `InstructionFollowing`, `GoalSuccess`, `Refusal`, `Harmfulness`,
`Stereotyping`. All accept `model` (default `openai/gpt-4o-mini`), `temperature` (default
`0.0`), `threshold` (default `0.7`), `include_input`.

## Custom scorers

```python
from agnt5.eval import scorer, EvalContext, ScorerResult

@scorer(name="cites_order_id", description="Reply must cite the order ID from the input")
def cites_order_id(ctx: EvalContext) -> ScorerResult:
    order_id = ctx.input.get("order_id", "")
    cited = order_id in str(ctx.output)
    return ScorerResult(score=1.0 if cited else 0.0, passed=cited,
                         explanation=f"Order ID {order_id} {'found' if cited else 'missing'}")
```

`EvalContext` carries `input`, `output`, `expected`, `run_id`, `trace_id`, `events`. Custom
scorers register and deploy like any component — after deploy, attach by ID:
`agnt5 experiments create ... --scorer-id <scorer-id>`.

## Trace assertions (glassbox testing)

For asserting on *execution behavior* rather than output content — used inside a custom
scorer or directly in batch-eval code (no CLI scorer name maps to these):

```python
from agnt5.eval import TraceAssertion, trace_scorer, EvalContext, ScorerResult
from agnt5 import scorer

@scorer(name="efficiency_check", scope="trace")
def efficiency_check(ctx: EvalContext) -> ScorerResult:
    result = trace_scorer(ctx.events, [
        TraceAssertion.max_tokens(2000),
        TraceAssertion.max_lm_calls(4),
        TraceAssertion.no_errors(),
        TraceAssertion.duration_under(15000),
    ])
    return ScorerResult(score=result.score, passed=result.passed, explanation=result.explanation)
```

Assertions: `max_tokens(n)`, `max_lm_calls(n)`, `no_errors()`, `duration_under(ms)`,
`event_sequence([...])`, `step_memoized(name)`, `event_count(type, min)`. `trace_scorer()`
returns score = proportion of assertions passed.

## Inspect scores

```bash
agnt5 scores list --run-id <run-id>
agnt5 scores list --run-id <run-id> --scorer-id <scorer-id>
agnt5 scores list --component-name support_agent --since 2h
agnt5 scores list --root-run-id <root-run-id>            # live production scores (online evals)
agnt5 scores evidence <score-id> --include scorer_input,scorer_output,evidence
```

Filters on `scores list`: `--run-id`, `--run-item-id`, `--scorer-id`, `--scorer-version-id`,
`--subject-type`, `--subject-id`, `--session-id`, `--root-run-id`, `--component-name`,
`--component-type`, `--since`, `--until`.

Scorer error types: `input_error`, `config_error`, `provider_error`, `auth_error`,
`artifact_error`, `timeout_error` (built-ins); `scorer_not_found` (custom only).

## Source

- https://agnt5.com/docs/improve/scorers -- the three scorer classes (built-in deterministic, built-in
  LLM-as-judge, custom), full built-in scorer name tables, SDK evaluator presets
  (`Correctness`, `Faithfulness`, `Helpfulness`, ...), `@scorer` decorator and
  `EvalContext`/`ScorerResult`, `TraceAssertion`/`trace_scorer()` for glassbox checks,
  inspecting scores via `agnt5 scores list/evidence`.
