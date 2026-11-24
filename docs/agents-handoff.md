# HiroGlifx agents: execution and application handoff

## Implemented

Agent definitions use existing HiroGlifx `.scroll` classes, typed fields, inheritance,
and the installable `agentkit` package. The restrictive loader reads declarative
fields without evaluating `.scroll` methods. The native class compiler and package
installer are exercised by the agent tests.

The JavaScript host supplies an explicit capability allowlist, restricted argument
schemas, argument validation before any action in a batch, execution evidence,
step/call ceilings, model output limits, operation deadlines, and result verifiers.
A definition cannot grant itself capabilities, increase host budgets, or manufacture
a successful delivery receipt.

`createAgentRunner` now accepts a private durable store and an idempotency key.
Approvals pause before execution and resume the exact stored call and arguments.
One call's approval does not authorize later calls of the same tool. Earlier calls
are not replayed after a restart. Rejected actions end the run. External effects
whose outcome cannot be verified enter `needs_review`; restarting with the same
idempotency key returns that record without repeating the effect.

## Private ledger and approvals

```js
const {createAgentRunner} = require('./runtime/agent-executor');
const {createFileRunStore} = require('./runtime/agent-store');
const runner = createAgentRunner({
  model, tools, allowedTools,
  store: createFileRunStore('/private/persistent/hiro-agent-state')
});
const run = await runner.run({agent, task, idempotencyKey: '2026-11-23'});
// Only after the host has obtained approval for run.pending:
await runner.resume({
  runId: run.id, callId: run.pending.callId, decision: 'approve'
});
```

The directory must be private (0700 on Unix); records, claims, and locks are 0600.
Records contain the private task and tool outputs. Use an owned persistent disk,
not a public web root, Git checkout, CI artifact, or ephemeral server filesystem.
The file store is for one host with a shared local filesystem. It is not a
multi-host database or a distributed queue.

An atomic lock blocks concurrent execution. A crash may leave a `.lock` and a
`running` record. Inspect that record and the application's own delivery ledger,
confirm the old process stopped, and reconcile any in-flight operation before an
operator removes a stale lock. The runner does **not** automatically resume a
`running` or `needs_review` record. A tool timeout cannot prove that a remote side
effect did not happen. There is no exactly-once claim for arbitrary external tools.

## Native production workflow handoff

`JobApplications` and `CrealytesReview` in
`examples/agents/havabyte-team.scroll` require one verified preparation/delivery
capability. The Crea-Lytes workflow prepares a package for manual review and does
not publish to Instagram. The job workflow preserves verified employment history
and distinguishes preparation from employer-confirmed submission.

`run-agent-workflow.js` binds those definitions to fixed, host-configured application
commands. It uses no LLM call. Commands run in a separate process with `shell:false`,
fixed argv, an explicit inherited-environment allowlist, a timeout, bounded output,
and a last-line JSON receipt. This is process separation, **not** an OS security
sandbox: install and configure only trusted application code. A model cannot choose
an executable, arguments, environment variables, or a working directory.

Create a private (0600) JSON config outside the repository:

```json
{
  "stateDirectory": "/private/persistent/hiro-agent-state",
  "workflows": {
    "JobApplications": {
      "executable": "/opt/job-agent/.venv/bin/job-agent-prepare-worker",
      "args": ["--sources", "config/sources.json", "--limit", "5"],
      "cwd": "/opt/job-application-agent",
      "envNames": ["PATH", "DATABASE_URL", "GOOGLE_SERVICE_ACCOUNT_JSON", "JOB_TRACKER_SHEET_ID"],
      "timeoutMs": 180000
    },
    "CrealytesReview": {
      "executable": "/opt/agent-studio/.venv/bin/python",
      "args": ["manage.py", "run_crealytes_review", "--owner", "OWNER_USERNAME", "--live"],
      "cwd": "/opt/agent-studio/backend",
      "envNames": ["PATH", "DATABASE_URL", "DJANGO_SETTINGS_MODULE", "DJANGO_SECRET_KEY", "OPENAI_API_KEY", "AGENT_REVIEW_ENABLED", "AGENT_REVIEW_OWNER", "AGENT_REVIEW_BASE_URL", "AGENT_APPROVED_BRIEF", "AGENT_APPROVED_POSTS_JSON", "AGENT_ASSET_HOSTS"],
      "timeoutMs": 180000
    }
  }
}
```

Paths and owner above are deployment examples, not provisioned services. Adapt the
environment allowlist to the installed application's actual configuration; secrets
stay in its environment. Do not copy personal applicant data into this repository.

```sh
node scripts/run-agent-workflow.js --config /private/workflows.json --agent JobApplications
node scripts/run-agent-workflow.js --config /private/workflows.json --agent CrealytesReview
```

The private ledger claims one run per agent per `America/New_York` date, including
DST. Repeat cron invocations return the recorded result. Application commands keep
their own database deduplication too. Configure the existing scheduler to invoke
these commands at the desired local time; a `.scroll` schedule field is a hint,
not an installed scheduler. Merely installing this library does not deploy the
Python applications, configure credentials, or turn on a schedule.

### Delivery receipt contract

| Workflow | Accepted state | Required verified fields |
| --- | --- | --- |
| JobApplications | `prepared` or `succeeded` | `delivery_verified: true`, `submitted: 0` |
| CrealytesReview | `draft_ready` | Known approval state (`pending`, `accepted`, `rejected`, `revise`), `published: false` |

The job preparation command can persist private resume packets and a queue before
an authenticated Drive bridge delivers the actual files. That intermediate receipt
has `delivery_verified: false` and does **not** complete the HiroGlifx delivery run.
Bind a command that finishes the authorized delivery bridge when full delivery is
required. An exit code alone or a `prepared_count` is insufficient proof.

The host wraps the application's verified receipt in `hiro-workflow-receipt-v1`
with the run ID, agent, Eastern day, and final state. Live receipts must come from
real application commands; test fixtures demonstrate the contract, not production
deployment or business outcomes.

## Agent Studio and ephemeral cron hosts

`JobPreparation` is the native preparation-only workflow. It verifies the stored
packet count and queue count, while preserving `delivery_verified:false` until the
actual private file bridge runs. The existing `JobApplications` workflow still
requires verified file delivery. Neither is an employer-submission capability.

An ephemeral Render cron can use `processStore` instead of `stateDirectory`:

```json
{
  "processStore": {
    "executable": "/opt/job-agent/.venv/bin/python",
    "args": ["-m", "job_agent.hiro_store"],
    "cwd": "/opt/job-agent",
    "envNames": ["PATH", "DATABASE_URL"],
    "namespace": "jobs-private-owner-key"
  },
  "studio": {
    "baseUrl": "https://studio.example",
    "producer": "job-worker",
    "tokenEnv": "AGENT_STUDIO_TOKEN"
  },
  "workflows": {
    "JobPreparation": {
      "executable": "/opt/job-agent/.venv/bin/python",
      "args": ["-m", "job_agent.preparation_worker"],
      "cwd": "/opt/job-agent",
      "envNames": ["PATH", "DATABASE_URL", "GOOGLE_SERVICE_ACCOUNT_JSON", "JOB_TRACKER_SHEET_ID"],
      "timeoutMs": 180000,
      "providerSpendMode": "none",
      "reservationMicrousd": 0
    }
  }
}
```

The process store accepts only an installed, fixed executable and arguments. It
passes JSON over stdin and a strict environment allowlist. The PostgreSQL helper
in the job application agent stores snapshots with revision compare-and-swap,
unique daily claims and durable token-owned locks. A process crash cannot erase
its claim or unlock its run. Inspect and reconcile the native and application
ledgers before explicitly recovering a stale lock; there is no automatic retry
of an uncertain external effect. This avoids requiring a persistent disk on cron.

Studio integration reserves the host-declared maximum provider cost **before**
the command can execute. Zero requires the explicit `providerSpendMode:"none"`
binding used for deterministic preparation/import. A nonzero reservation is kept
as uncertain until actual accounting is available; missing cost is not zero.
Hosting allowances are configured separately in Studio. This controls only
integrated calls, not provider-wide bills or unrelated ChatGPT activity.

Receipt ingestion uses `studio-run-event-v1`, a bearer credential scoped to one
producer/owner, and a stable event identity per observed execution state. Both
job preparation and later file-delivery snapshots use the underlying job run ID
in the `job_preparation` workflow, so a five-packet replay is still five packets.
The native execution UUID remains in the receipt. Actual employer submissions
are separate `job_applications` events and require confirmation URLs.

If telemetry is unconfirmed, a later invocation may resend the same immutable
event, while the native daily claim returns its existing record. It must not
rerun the worker merely to repair telemetry. Nonterminal concurrent observations
do not settle the cost reservation. No producer token, applicant answers or
resume bytes are placed in stdout or committed configuration.

`scripts/import-studio-review.js --package /private/completed-package.json` is a
fixed command for the `CrealytesReview` workflow. It posts an existing finished
HTTPS creative package to Studio's owner-scoped `review-packages` endpoint. The
input file must be private and at most 30KB. Inputs cannot set acceptance,
feedback, sales outcomes or publication. Exact imports preserve the application's
existing package and real owner decision; a previously reviewed import is not
silently reset to pending. Configure producer scopes for both `crealytes_content`
(the import endpoint) and `crealytes_review` (native run telemetry), and use the
explicit zero-provider-spend reservation. This command does not generate media.

The client rejects HTTP (except explicitly enabled loopback test fixtures),
credential-bearing URLs, redirects and mismatched receipts. The host needs Node
20 or newer and only built-in Node modules. All commands and credentials remain
host configuration; none are chosen by a model.

## Manual research CLI

Requires Node 20+. Set `OPENAI_API_KEY` in the shell, never in source control.

```sh
node scripts/run-agent.js --agent HavabyteResearch --task "Read README.md and summarize it" --workspace .
```

This CLI remains an opt-in read-only workspace helper. API requests may incur
usage charges. Model steps, output tokens, and timeouts are capped; this is not a
dollar-denominated account budget. Application-specific monthly budgets belong to
the application backend. No GitHub write, outreach, social publishing, or purchase
tools are supplied by default.

## Verification

```sh
node --test tests/agent-*.test.js
node --test tests/*.test.js
```

The focused suite covers native compilation/package installation, schemas,
approvals, budget bounds, receipt verification, cross-process deduplication,
restart/resume, uncertain effects, timeouts, private storage, and a real subprocess
handoff. No paid API calls or external publications are needed for these tests.
