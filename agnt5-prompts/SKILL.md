---
name: agnt5-prompts
description: Manage AGNT5 Prompt artifacts as versioned, code-bundled text - author prompts/<id>.mdx, select versions, override runtime model/temperature settings, and use prompt caching. Use when extracting inline prompt text into a managed Prompt or changing how a prompt version resolves in dev vs production.
---

# AGNT5 Prompts

A **Prompt** is a managed LLM prompt you can draft/test in AGNT5, then commit alongside your
application code for production — so the prompt version and code version move together.

## Run a Prompt

```python
from agnt5 import lm
from agnt5.lm import Prompt

response = await lm.generate(
    model="openai/gpt-4o-mini",
    prompt=Prompt(id="support_reply", variables={"customer": {"name": "Ada"}, "topic": "shipping"}),
)
print(response.text)
```

Don't pass raw `messages`/prompt text alongside `prompt=`; `prompt` replaces them for that
call.

## Commit a production Prompt

Create `prompts/<id>.mdx` in the application repo:

```mdx
---
id: support_reply
version: 3
version_id: 018f0000-0000-7000-8000-000000000003
model: openai/gpt-4o-mini
temperature: 0.2
max_tokens: 600
variables:
  - customer.name
  - topic
response_format: text
---

<System>
You are a concise support agent.
</System>

<User>
Reply to {{customer.name}} about {{topic}}.
</User>
```

Front matter drives routing/generation settings; the body renders into ordered chat messages
via `<System>`, `<User>`, `<Assistant>` blocks (no block present → treated as one user
message). Files must be Markdown or MDX — not `.json` or `prompts.lock`.

**Production resolution order:**
1. `AGNT5_PROMPT_OVERRIDE`
2. `AGNT5_PROMPTS_MANIFEST`
3. `prompts/<id>.mdx`
4. `prompts/<id>.md`
5. AGNT5 prompt-run API fallback (non-production draft/test only)

In production, the Prompt **must** be bundled with the deployed artifact — a missing Prompt
fails closed, it does not fall back to control-plane state.

## Select a version

```python
response = await lm.generate(
    model="openai/gpt-4o-mini",
    prompt=Prompt(id="support_reply", version="version-3"),
)
```

`version` matches either the file's `version` or `version_id`.

## Override runtime settings without changing the Prompt

Useful for Playground / experiments / one-off comparisons — workflow code stays unchanged:

```python
ctx.runtime.llm.model = "openai/gpt-4o"
ctx.runtime.llm.temperature = 0.6
ctx.runtime.llm.max_tokens = 800
ctx.runtime.llm.top_p = 0.9   # TypeScript: ctx.runtime.llm.topP

# per-prompt overrides for workflows with multiple prompts
ctx.runtime.prompts["draft"] = LLMRuntimeOptions(model="anthropic/claude-3-5-haiku-20241022", temperature=0.7)
ctx.runtime.prompts["review"] = LLMRuntimeOptions(model="openai/gpt-4o", temperature=0.3)
```

The Prompt file remains the source of truth for prompt *text*; runtime overrides only change
model execution settings for that run. Prompt-specific overrides win over the global default.

## Use inside workflows

Keep the LLM call inside a `@function`/checkpointed step so replay reuses the completed
result instead of re-calling the model:

```python
@function
async def draft_reply(ctx: FunctionContext, customer_name: str, topic: str) -> str:
    response = await lm.generate(
        model="openai/gpt-4o-mini",
        prompt=Prompt(id="support_reply", variables={"customer": {"name": customer_name}, "topic": topic}),
    )
    return response.text
```

## Compatibility note

Older code may use `prompt_ref="support_reply"` / `PromptRef`. Still supported, but new code
should use `prompt=Prompt(id=...)`.

## Prompt caching (Anthropic models only)

Server-side feature: reuses an identical leading prefix (tool defs → system prompt →
messages) without reprocessing — ~80-90% latency drop and ~10% token cost for the cached
portion. Automatic, no config needed; AGNT5 surfaces the numbers on `response.usage`:

| Field | Meaning |
|---|---|
| `cached_tokens` | Tokens read from cache (cache hit) |
| `cache_creation_tokens` | Tokens written to cache this call (cache write) |
| `prompt_tokens` | All input tokens, including reads and writes |

Cache TTL defaults to 5 minutes (resets on hit); a 1-hour TTL is available for longer gaps.
Minimum cacheable prefix is ~1024-4096 tokens (model-dependent) — short system prompts won't
cache.

**To get cache hits**: keep `instructions=`/`system_prompt` text byte-identical across calls
for the same agent role, put dynamic content (names, dates, request context) in the *user*
message not the system prompt, keep the tool list stable, use the same `model` string every
call.

**Silent invalidators** (every call becomes a cache miss):
- `datetime.now()` / `date.today()` embedded in system prompt text
- A UUID/random seed generated at startup and appended to instructions
- JSON-serializing a dict with unstable key order (use `sort_keys=True`)
- Conditional instruction blocks that vary by request data

## Source

- https://agnt5.com/docs/build/prompts -- `Prompt(id, variables, version)`, `prompts/<id>.mdx`
  file format and front matter, production resolution order, version selection, runtime LLM
  overrides (`ctx.runtime.llm`, `ctx.runtime.prompts[...]`), `PromptRef` compatibility note.
- https://agnt5.com/docs/build/prompt-caching -- prompt/context caching behavior, cache
  metrics, designing for cache hits, silent invalidators.
