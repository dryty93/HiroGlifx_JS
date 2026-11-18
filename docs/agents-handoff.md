# HiroGlifx Agents — engineering handoff

## Objective
Make reusable, structured agent prompts a native HiroGlifx concept, without inventing a new parser dialect. First release: language-native **definition objects** with inherited roles, missions, workflows, tools, rules, approvals and output contracts. Future releases: host-controlled execution and a visual Agent Studio.

## What this PR intentionally does
- Adds `agentkit` as a reusable HiroGlifx package built with the existing `.Class = (Parent)`, typed fields, methods and `send()` pattern.
- Adds five agent role definitions and a Havabyte-specific import/override example.
- Demonstrates how an inherited `describe()` method can construct a model-facing instruction string.
- Records a strict separation between **prompt specification** and **agent execution**.
- Does not change core parser, runtimes, CLI, dependencies, workflows or CI.

## Phase 2: execution architecture
1. Add a host-side definition loader that resolves locked packages and validates each field with a versioned schema; reject unknown tools and unresolved imports.
2. Add model-provider adapters and an explicit capability registry. Tool names inside definitions must never grant permission by themselves.
3. Add a coordinator with typed task envelopes (id, purpose, inputs, constraints, deadline, allowed_tools, approval_state) and deterministic handoff results.
4. Add run ledger (persistent states: queued, running, awaiting_approval, succeeded, failed, cancelled), bounded budgets, retries and idempotency keys.
5. Add explicit approval gates for spending, posting, sending, publishing, deletion, deployments and external writes.
6. Add evidence and QA: linked source references, verification of actual tests, no claimed PRs or deployments without IDs.
7. Add provider-neutral plugin bridge, with separate adapters for ChatGPT plugins and other LLM providers.
8. Build Agent Studio with a field editor, import/export `.scroll`, permissions inspector, preview, and local dry run.

## Team roles / deliverables
- **Coordinator**: intake, delegation, handoffs, approval routing, final synthesis.
- **Researcher**: real user pain, sources, competitors, uncertainties.
- **Engineer**: changes on feature branches, local tests, PRs; never claim tests that were not run.
- **Growth**: audience, offer, acquisition experiments, measurable outcomes, approval before posting/spend.
- **QA**: independent audit of evidence, tool outcomes and acceptance criteria.

## Syntax / engineering constraints
- Match the class and method syntax in `examples/packages/enemykit/main.scroll` and `examples/polymorphism/arena.scroll`.
- Do not use `agent Foo { ... }`, `extends Foo`, JS object literals or unimplemented DSL keywords as if they are valid HiroGlifx.
- Check the existing `import agentkit` resolution convention before advertising turnkey project installs; register the package with the current package manager.
- Check whether multiline concatenation and local variables in `init` are supported by the target runtime; prefer explicit runtime fixture tests.
- Avoid GitHub Actions for iterative checks when local Node tests can verify behavior. No new workflows or manual dispatches.
- Keep prompts provider-independent. Migration to ChatGPT plugins requires connector/skill testing and cannot be assumed automatic.

## Acceptance criteria for a follow-up execution PR
- Real parse/execute tests for inherited `describe()`, overrides and imports in the correct runtime.
- Complete tool permission tests (deny-by-default, approval checks and least-privilege).
- Mock-model tests verifying run histories, cancellation, failure handling and provenance.
- At least one live provider integration behind explicit configuration; no keys committed.
- Browser-free tests run locally before requesting any paid CI.

## Security
Never store keys in `.scroll`. Never turn declarative tool descriptions into unconstrained host actions. Protect user data, cap budgets, and prevent instructions returned by tools from overriding system policy.

## Migration
ChatGPT custom GPT instructions/reference files can be migrated to plugins when account/workspace migration is available, but custom actions and capability grants need separate implementation/testing. This HiroGlifx format is independent of ChatGPT's product lifecycle.
