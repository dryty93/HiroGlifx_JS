# HiroGlifx Agents — execution handoff

## Implemented
- Existing HiroGlifx .scroll typed-class fields, inheritance, and an agentkit manifest.
- Restricted agent definition loader; does not eval code or invoke .scroll methods.
- OpenAI Chat Completions model adapter plus host-supplied model/tool interface.
- Explicit tool allowlist, separate approval gates, bounded steps/calls, per-run events and errors.
- Manual CLI with read-only workspace file tools and path traversal protections.
- Offline mock-model tests in tests/agent-executor.test.js.

## Manual use
Set OPENAI_API_KEY in your shell (never commit it). Requires Node 20+.
    node --test tests/agent-executor.test.js
    node scripts/run-agent.js --agent HavabyteResearch --task "Read README.md and summarize it" --workspace .

API requests may incur usage charges. The CLI is not scheduled and exposes no remote write tools.

## Boundaries
Tool names inside the .scroll definitions are descriptive, not permissions. Host tool implementations must be explicitly registered and allowlisted. Tools with requiresApproval return awaiting_approval without execution unless their names are approved per run. In-flight resume is not yet implemented; hosts must obtain confirmation and start a new authorized run. Execution loop is JavaScript host code, not compiled .scroll bytecode.

## Next phases
1. Schema-validate tool arguments and enforce per-tool auth scopes and timeouts.
2. Persistent ledger and resumable, idempotent execution across approvals.
3. GitHub/web tool adapters with scoped authorization.
4. Coordinator delegation, QA gates and bounded parallel execution.
5. Native Agent Studio UI and ChatGPT plugin adapters.

## Before merging
Run tests once at the end, not on every commit. Confirm existing class syntax via class compiler and package installer; review permissions and failures. Live smoke tests require API credential and explicit authorization for billable calls.

## Migration
Agent definitions remain provider-neutral. ChatGPT plugin and tool migrations are separate integration work, not automatic.

## Operator definitions (next development slice)
Native typed fields now include `# maxSteps`, `# maxToolCalls` and
`? requireToolEvidence`. Optional string fields `$ requiredTool` and
`$ schedule` express an expected successful capability and a schedule hint
(manual, daily or weekly). The schedule hint is not a scheduler.
The effective limits can only reduce host limits; the host still authorizes all tools.
A required capability must have executed before a run can claim success.
Host tool adapters can provide a `verifyResult` predicate to check actual receipts;
this must be implemented by the adapter for external actions. Generic tool success
is not independent proof of a business outcome. Tool arguments are checked against
a restricted host-defined schema subset, not full JSON Schema. Existing tools without
schemas remain supported for compatibility. The CrealytesCampaign example is a native
scroll specification for an operator; no live publishing adapter or credentials are
included in HiroGlifx. App Cookbook PR #85 implements the separate Python pilot.
