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
| CrealytesReview | `draft_ready` | `approval: "pending"`, `published: false` |

The job preparation command can persist private resume packets and a queue before
an authenticated Drive bridge delivers the actual files. That intermediate receipt
has `delivery_verified: false` and does **not** complete the HiroGlifx delivery run.
Bind a command that finishes the authorized delivery bridge when full delivery is
required. An exit code alone or a `prepared_count` is insufficient proof.

The host wraps the application's verified receipt in `hiro-workflow-receipt-v1`
with the run ID, agent, Eastern day, and final state. Live receipts must come from
real application commands; test fixtures demonstrate the contract, not production
deployment or business outcomes.

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
