---
name: agnt5-deploy
description: Deploy an AGNT5 worker to a managed environment - set secrets, deploy to preview/staging/production, verify the deployment, promote a verified build forward, roll back, and scale replicas. Use when shipping a worker outside local development or managing environment-scoped configuration.
---

# AGNT5 Deploy

Deploying moves your worker off your laptop onto AGNT5's managed infrastructure. Prereq:
`agnt5 auth login`.

## Set secrets and integrations before deploying

```bash
agnt5 secrets set --name OPENAI_API_KEY --type api_key            # prompted securely
echo "sk-..." | agnt5 secrets set --name OPENAI_API_KEY --type api_key --stdin
agnt5 secrets list
```

Run inside the project directory — no `--project` flag needed. Connect AI providers / inbound
webhook sources via **Studio → Settings → Integrations** (see `agnt5-webhooks-integrations`).

## Deploy

```bash
agnt5 deploy                     # preview (default environment)
agnt5 deploy --env staging
agnt5 deploy --env production    # asks for confirmation
agnt5 deploy --env staging --min-replicas 1 --max-replicas 4
```

Output includes a Studio deployment URL and the exact `agnt5 logs <deployment-id>` command to
tail it. **Usual flow: deploy to preview → verify → promote the same build forward** — don't
redeploy per environment.

## Verify

```bash
agnt5 deployments --environment production
agnt5 logs <deployment-id> --follow
agnt5 logs <deployment-id> --tail 50
```

## Test the deployed worker

```bash
# workflow — returns final JSON when the run completes
agnt5 run my_workflow --type workflow --input '{"message": "..."}' --env production

# function — streams output as SSE (also the default --type if omitted)
agnt5 run my_function --type function --input '{"x": 1}' --env production

# tool — returns the tool result as JSON
agnt5 run my_tool --type tool --input '{"q": "..."}' --env production

# agent — input must include a "message" field
agnt5 run my_agent --type agent --input '{"message": "..."}' --env production
```

If `--type` is omitted, the CLI defaults to `function` and auto-retries the correct endpoint
if it's actually a workflow/tool/agent. Redirect for scripting:
`agnt5 run my_workflow --type workflow --input '{}' --env production > result.json`.

## Environments — promote, don't redeploy

An **environment** is a named pointer to a deployment (preview/staging/production by
default). The deployment image is immutable; promote/rollback just move the pointer, so the
exact build verified in staging is what serves production.

**Promote** (Studio → Deployments → select the verified deployment → Promote → pick target,
optionally adjust replicas → confirm):

```bash
curl -X POST 'https://api.agnt5.com/api/v1/deployments/promote' \
  -H "X-API-KEY: <token>" -H "Content-Type: application/json" \
  -d '{"source_deployment_id": "<deployment-id>", "target_environment_id": "<environment-id>"}'
```

Create the key first: `agnt5 service-keys create --name <name> --project <project-id>` — see
https://agnt5.com/docs/build/local-development (Creating an X-API-KEY section) for the full
walkthrough.

**Rollback** — points the environment at the previously serving deployment from its promotion
history (a pointer move, not a rebuild):

```bash
# Studio → Deployments → environment tab → Rollback
# API: POST /api/v1/deployments/rollback
```

> Rollback changes which code serves traffic, not your data or secrets — if the bad deploy
> also changed a secret or external state, revert those separately.

## Scale / stop / resume

```bash
agnt5 deployment status     # replicas, uptime of the latest deployment
agnt5 deployment errors     # scheduling failures, image pull errors
# Scale: Studio Scale action, or POST /api/v1/deployments/<id>/scale-up|scale-down
# Stop: Studio Terminate (image/record persist, can resume)
# Resume: Studio Start
```

## Environment-scoped secrets

```bash
agnt5 secrets set --name OPENAI_API_KEY --type api_key                              # project-wide
agnt5 secrets set --name OPENAI_API_KEY --type api_key --environment <environment-id>  # env-only override
agnt5 secrets list --environment <environment-id>
```

An environment-scoped secret overrides the project-scoped one of the same name for
deployments serving that environment.

## Triggering via the API instead of the CLI

Copy the exact curl command (workspace/deployment IDs prefilled) from the component page in
Studio, replacing `X-API-KEY` with your service key — see `agnt5-webhooks-integrations` for
creating one.

## Source

- https://agnt5.com/docs/run/deploying (Set secrets/integrations, Deploy, Verify, Deployment
  logs, Testing after deployment sections) -- `agnt5 secrets set/list`,
  `agnt5 deploy [--env ...]`, `agnt5 deployments`, `agnt5 logs <deployment-id>`, running a
  deployed component via `agnt5 run --type ... --env ...`.
- https://agnt5.com/docs/run/environments -- environment-as-pointer model, promote/rollback,
  replica bounds, environment-scoped secrets.

Cross-check currency before writing: https://agnt5.com/cli/commands,
https://agnt5.com/cli/deploy, and https://agnt5.com/cli/configuration document some
flags/commands that conflict with the more recently verified
https://agnt5.com/docs/run/deploying and https://agnt5.com/docs/run/environments -- prefer
the `docs/run/*` pages where they disagree.
