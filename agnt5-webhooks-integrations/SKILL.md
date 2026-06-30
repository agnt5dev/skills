---
name: agnt5-webhooks-integrations
description: Trigger AGNT5 workflows from external events - Standard Webhooks, Sentry, Stripe, GitHub, or Slack, including signature verification and idempotent delivery, plus connecting AI provider credentials and integrating an existing application via the run API. Use when adding an external event trigger or connecting a third-party service.
---

# AGNT5 Webhooks and Integrations

A webhook lets an external system start a workflow by POSTing an event to AGNT5. The gateway
verifies the signature, turns the delivery into a durable event, and starts every workflow
subscribed to it. AGNT5 handles receipt, verification, deduplication, and dispatch — you only
write the workflow and declare what it listens for.

## Declare a trigger

```python
from agnt5 import workflow, webhook

@workflow(name="triage_issue", triggers=[webhook("sentry", event="issue.created")])
async def triage_issue(ctx, event: dict) -> dict:
    payload = json.loads(event["body"])   # raw body string — parse it yourself
    issue = payload["data"]["issue"]
    ...
```

`source` is one of `standard`, `sentry`, `stripe`, `github`, `slack`. A single event can fan
out to multiple workflows — every workflow whose trigger matches `{source}.{event}` starts
independently.

## What the workflow receives

```json
{
  "_webhook": true,
  "source": "sentry",
  "integration_id": "int_abc123",
  "event_type": "sentry.issue.created",
  "idempotency_key": "req_9f3c…",
  "timestamp": 1733337600,
  "headers": { "sentry-hook-resource": "issue" },
  "body": "{\"action\":\"created\",\"data\":{ … }}"
}
```

`body` is the raw request body as a **string** — parse it yourself so you operate on exactly
the bytes that were signature-verified. `headers` keys are lowercased.

## Set up an integration (once per source)

1. **Studio → Integrations → New**, pick the source.
2. Pick the **environment** whose deployment should receive triggers.
3. Provide the **signing secret** — AGNT5 generates one for GitHub and Standard Webhooks
   (copy it into the publisher); paste the provider-issued one for Stripe, Slack, Sentry.
4. Copy the **webhook URL** (`…/v1/webhooks/{source}/{integration_id}`) into the provider's
   webhook settings.

## Signature verification (handled automatically, know the model)

| Source | Header | Signed payload | Replay window |
|---|---|---|---|
| `standard` | `webhook-signature` (`v1,<base64>`) | `{id}.{timestamp}.{body}` | 5 min |
| `sentry` | `sentry-hook-signature` (hex) | raw body | n/a |
| `stripe` | `Stripe-Signature` (`t=…,v1=…`) | `{timestamp}.{body}` | 5 min |
| `github` | `X-Hub-Signature-256` (`sha256=…`) | raw body | n/a |
| `slack` | `X-Slack-Signature` (`v0=…`) + timestamp | `v0:{timestamp}:{body}` | 5 min |

Unsigned/mismatched deliveries get a `401` before any workflow runs.

## Delivery semantics — make handlers idempotent

Delivery is **at-least-once**. Retries are deduped by the provider's per-delivery id
(`webhook-id` / `Request-ID` / Stripe event `id` / `X-GitHub-Delivery`) — a retry replays the
original run, it doesn't start a new one. Two exceptions where a workflow can fire more than
once for the same event:

- **Slack** has no stable per-delivery id, so its retries are never deduped.
- The idempotency cache is per-gateway-instance and time-bounded — a retry after a gateway
  restart, or on a different node in a multi-node deployment, sees a cold cache.

**Key your side effects off `event_type` + `idempotency_key` (or an id in the body) so a
re-delivery is a no-op.** AGNT5 guarantees at-least-once, not exactly-once.

## Event names by source

| Source | What you pass as `event` | Resulting name |
|---|---|---|
| `standard` | the `webhook-event` header value | `standard.<event>` |
| `sentry` | `<resource>.<action>` | `sentry.issue.created` |
| `stripe` | the body `type` | `stripe.payment_intent.succeeded` |
| `github` | `<event>.<action>` or `<event>` | `github.issues.opened` |
| `slack` | the event-callback `type` | `slack.app_mention` |

Slack events are named `slack.<event.type>`, e.g. `slack.app_mention` (needs
`app_mentions:read` scope), `slack.message`, `slack.reaction_added`. Sentry's Studio setup
also requires creating a matching custom integration in Sentry's own
**Settings → Integrations → Custom Integrations** and pasting AGNT5's webhook URL there.

## AI provider credentials

Model calls (`"provider/model"` strings like `openai/gpt-4o-mini`) need a credential
configured before they'll work in a deployed worker:

```bash
# Local dev — export before agnt5 dev
export OPENAI_API_KEY=sk-...
export ANTHROPIC_API_KEY=sk-ant-...
```

For deployed workers: **Studio → Settings → Integrations**, add the provider, choose the
narrowest scope (workspace / project / environment-specific). Supported with first-class
Studio credentials: `openai`, `anthropic`, `google`/`gemini`, `groq`, `openrouter`,
`mistral`, `deepseek`, `xai`. SDK-only (no Studio integration yet): `azure`, `bedrock`,
`ollama`, `huggingface`. Code never sees the raw key — AGNT5 injects it as an env var or
resolves it at runtime.

## Integration storage model

Every integration = a **provider** (e.g. `openai`, `sentry`) + one or more **secrets**, role
`api_key` (calls a provider API) or `webhook_secret` (verifies an inbound delivery). Scope an
integration at **workspace** (every project) or **project** level; a secret can additionally
be pinned to one **environment** so staging and production differ. Secrets are encrypted at
rest and only decrypted at point of use.

## Integrating an existing application (non-webhook)

To call a deployed AGNT5 workflow/agent/tool from your own app instead of receiving an
inbound webhook, trigger it with `agnt5 run` against the deployed environment — see
`agnt5-deploy` for the full command and `--env` flag. App code starts the workflow and
records the returned run ID; AGNT5 owns durable execution; Studio owns run inspection (see
`agnt5-observe`).

## Source

- https://agnt5.com/docs/build/webhooks -- `webhook()` trigger, event envelope shape,
  signature verification per source, delivery/idempotency semantics, event naming.
- https://agnt5.com/docs/integrations/event-sources/overview and per-provider pages
  (https://agnt5.com/docs/integrations/event-sources/slack,
  https://agnt5.com/docs/integrations/event-sources/sentry, and others under that directory)
  -- provider-specific setup.
- https://agnt5.com/docs/integrations/ai-providers -- supported model providers, API key env
  vars, Studio credential scoping.
- https://agnt5.com/docs/integrations/overview -- how integrations and signing secrets are
  stored.
- https://agnt5.com/docs/run/deploying (triggering via API section) and
  https://agnt5.com/docs/build/local-development (X-API-KEY, triggering via API) --
  integrating an existing app by calling a deployed workflow/agent over HTTP.
