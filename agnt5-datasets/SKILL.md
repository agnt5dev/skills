---
name: agnt5-datasets
description: Curate AGNT5 eval datasets - create a dataset, add examples from production runs or manual input, bulk-upload JSONL/CSV, deduplicate, and publish immutable versions for experiments. Use when building or growing a test set that experiments or scorers will run against.
---

# AGNT5 Datasets

A **dataset** is a curated set of test cases that `agnt5-experiments` runs your components
against. Every dataset has one mutable **draft** (edits land here) and zero or more immutable
**versions** (experiments always run against a version, never the draft, so results stay
comparable over time).

Dataset item fields: `input` (JSON, required), `expected_output` (JSON, optional — scorers
compare against it), `metadata` (your own labels), `events` (trace events, captured when
importing from a run), `split` (e.g. `train`/`test`).

## Create

```bash
agnt5 datasets create --name support-agent-golden-set \
  --description "Curated support conversations with verified answers"
agnt5 datasets list --search support-agent     # find the dataset ID later
```

(Or Studio → project → **Evaluate → Datasets**.)

## Add examples

```bash
# From a production run — captures input/output/trace events for trace-level scorers
agnt5 inspect runs ls                                       # find the run ID first
agnt5 datasets add-run <dataset-id> <run-id> \
  --expected-output '{"answer": "Refund issued within 5 business days"}'
  # without --expected-output, the run's recorded output becomes the expected output

# Manual example
agnt5 datasets add-example <dataset-id> \
  --input '{"message": "Where is my order #4512?"}' \
  --expected-output '{"intent": "order_status"}'

# Bulk JSONL — one item per line, same fields as above
agnt5 datasets upload <dataset-id> --file examples.jsonl
cat examples.jsonl | agnt5 datasets upload <dataset-id>     # or pipe from stdin

# Bulk CSV — map columns to fields
agnt5 datasets upload-csv <dataset-id> --file examples.csv \
  --input-column question --expected-output-column answer --split-column split
  # --partial defaults true (valid rows import even if some rows fail);
  # pass --partial=false to make it all-or-nothing
```

JSONL line shape: `{"input": <json>, "expected_output": <json?>, "metadata": <object?>, "events": <json?>, "split": <string?>}`.

## Deduplicate

```bash
agnt5 datasets dedup preview <dataset-id> --include-preview     # see duplicate groups first
agnt5 datasets dedup apply <dataset-id>                         # keep earliest, remove rest
agnt5 datasets dedup apply <dataset-id> --remove-item-id <item-id>   # or target specific items
```

## Publish a version

```bash
agnt5 datasets publish <dataset-id> --description "Adds 40 cancellation cases from last week's runs"
```

Draft stays editable after publishing — keep curating, publish again when ready.

```bash
agnt5 datasets versions list <dataset-id>
agnt5 datasets versions export <dataset-id> <version-id>                          # as JSONL
agnt5 datasets versions compare <dataset-id> <base-version-id> <compare-version-id>  # added/removed/changed
agnt5 datasets versions restore-draft <dataset-id> <version-id>                   # reset draft to a version
agnt5 datasets examples list <dataset-id> --version 2 --include-payload
```

## Next step

Pass the published dataset version ID to `agnt5-experiments` to run a component/prompt
against it and score the results.

## Global flags

`--format table|json|jsonl` (jsonl for piping to `jq`), `--project-id <uuid>` (target a
specific project instead of the current context).

## Source

- https://agnt5.com/docs/improve/datasets -- draft vs. immutable version model, dataset item
  schema, `agnt5 datasets create/add-run/add-example/upload/upload-csv/dedup/publish/versions/examples`.
