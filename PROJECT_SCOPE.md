# HiroGlifx — Project Scope and Status

**Baseline:** November 2026  
**Integration branch:** `qa`  
**Stable historical branch:** `main`  
**Current maturity:** Experimental proof of concept; not production-ready.

## Mission

HiroGlifx is a blueprint-based programming language for defining and composing AI agents. Developers should define agents in `.scroll` files, import them into other agents, and build increasingly complex systems through reusable blueprints.

**Core concept: agents built from agents.**

Keep the original language identity:
- `.` defines a blueprint.
- `I imports` resolves another blueprint.
- `&` creates an instance.
- `:` defines a method.
- A method call executes or delegates work.

Importing an agent must not execute it. Deterministic execution is the default; model-directed delegation is explicitly enabled.

## Goals

1. Create a reliable parser, typed AST, and interpreter for a small programming language.
2. Support cross-file blueprint imports, instance state, methods, and recursive agent composition.
3. Add provider-neutral AI models, structured outputs, and streaming.
4. Provide a secure tool registry, explicit permissions, memory, and secrets management.
5. Support sequential and parallel workflows, retries, cancellation, checkpoints, and human approval.
6. Offer a developer CLI, agent graph, tracing, debugging, tests, documentation, and deployment.
7. Preserve the original 2021 code for reference until the replacement is validated.

## Architecture

```text
.scroll source
  -> Lexer -> Parser -> Typed AST -> Semantic checks
  -> Module / Blueprint Registry -> Instance Runtime
  -> Agent Orchestrator
       | Model adapters
       | Tool registry + permissions
       | Memory + execution state
       | Trace + cost reporting
  -> CLI / Visual tools / Deployment
```

## What exists on qa

| Area | Implemented | Limitations |
|---|---|---|
| Original language | 2021 files preserved at repository root | Historical prototype |
| Lexer/parser | Restricted blueprint, method, import, instance, call, assignment and return grammar | No full grammar, types or control flow |
| Blueprint runtime | Nested deterministic method calls and recursion depth limit | No isolated per-instance state |
| Multi-file loader | Adjacent `Name.scroll` imports, missing-import checks, root boundary, file limit | Module graph needs more validation |
| CLI | `experimental/cli.js` and newsroom demo | Not installable as `hiro` |
| Expression evaluator | Arithmetic, comparisons, booleans, precedence | Separate module; not integrated with scroll parser |
| Model registry | Mock provider and provider-neutral interface | Not wired into scroll execution |
| OpenAI adapter | Responses API HTTP adapter and usage extraction | Mock-tested; no verified live model call |
| Tool registry | Explicit allowlist before registered tool execution | No inherited capability enforcement |
| Memory | Namespaced in-memory or JSON-file key/value store | No durable transactional storage or access policy |
| Orchestration | Bounded sequential steps and separate parallel DAG workflow | No full blueprint delegation integration |
| Tests | Runtime, modules, expressions, adapters, tools, workflow tests | Not a complete language or security suite |
| CI | Experimental GitHub Actions workflow | Push trigger does not include qa |

## PR history

- [PR #5](https://github.com/dryty93/HiroGlifx_JS/pull/5): initial language, CLI, module loader, tests — merged into `qa`.
- [PR #6](https://github.com/dryty93/HiroGlifx_JS/pull/6): model adapter, memory, workflow foundations — merged into `qa`.
- [PR #7](https://github.com/dryty93/HiroGlifx_JS/pull/7): independent expression engine — merged into `qa`.

The latest feature-branch GitHub Actions runs passed. A separate passing CI run on the consolidated `qa` head has not been verified.

## Delivery roadmap

| Stage | Goal | Status | Completion requirement |
|---|---|---|---|
| 1 | Stabilize parser/runtime, CLI, tests and QA CI | Mostly implemented | Clean-checkout tests and QA CI pass |
| 2 | Complete language: values, expressions, scope, functions, conditions, loops | Partial | Integrated language conformance suite passes |
| 3 | Multi-file imports, constructors, instance state and composition | Partial | Isolated instances and cross-file agent e2e tests |
| 4 | Real AI model calls, schemas, streaming, usage | Partial foundation | Scroll agent invokes model; opt-in live integration test |
| 5 | Tools, memory, permissions and secrets | Partial foundation | Delegated permissions enforced; storage/security tests |
| 6 | Delegation, parallel workflows, retries and cancellation | Partial foundation | Multi-agent scroll e2e tests including failures |
| 7 | Durable jobs, checkpoints and resumption | Not started | Restart/resume without duplicate side effects |
| 8 | Observability, tracing, cost and debugging | Not started | Full run inspection and diagnostic tools |
| 9 | Browser IDE and agent graph visualization | Not started | Local author/run/debug workflow |
| 10 | CLI distribution, formatter, VS Code and templates | Not started | Installable documented developer experience |
| 11 | Deployment and HTTP/webhook integrations | Not started | Reproducible supported deployment |
| 12 | Security, performance, documentation, v1.0 release | Not started | Release checklist and regression suite pass |

## Immediate work priorities

1. Update GitHub Actions to run on `qa`, then verify merged-head tests and CLI execution.
2. Integrate expression parsing into the language interpreter and implement control flow, types, lexical scope, and diagnostics.
3. Complete multi-file blueprint resolution, constructor parameters and independent instance state.
4. Connect `.scroll` agents to async model providers and validated tool calls.
5. Enforce capability inheritance, secret isolation, durable memory and approval boundaries.
6. Implement nested/parallel agent delegation with timeouts, retries, cancellation, budgets and end-to-end tests.

## Definition of done

A stage is complete only when implementation, documentation, relevant unit/integration/e2e tests and security-negative tests pass on the exact integration candidate. A merged PR alone does not prove a stage complete.

**v0.1:** Tested deterministic language with cross-file agent composition.  
**v0.3:** Real AI agents with validated outputs and permission-controlled tools.  
**v0.7:** Reliable, observable, durable multi-agent workflows.  
**v1.0:** Documented, installable, deployable and security-reviewed developer platform.

## Branch and release policy

- `main`: preserved historical branch; no direct experimental work.
- `qa`: integration branch for all feature PRs.
- `feature/*`, `fix/*`, `docs/*`: short-lived branches based on `qa`.
- Promote tested `qa` into `main` via a reviewed release PR after explicit approval. Avoid force-pushing or swapping refs.
- Update this scope file when a PR changes milestone status or requirements.

## Initial non-goals

No custom native compiler, general replacement for Python/JavaScript, unrestricted agent tool access, unreviewed marketplace, or unbounded AI spending.

## Risks

The key risks are fragmented interpreter/agent runtimes, unsafe delegated permissions, uncontrolled costs, duplicate side effects during retries, and a misleading green CI suite without integration coverage. Address these through a unified AST/runtime, deny-by-default permissions, hard budgets, idempotency, and QA end-to-end tests.

## Current commands

```bash
node --test experimental/tests/*.test.js
node experimental/cli.js experimental/examples/newsroom.scroll
```

These exercise a deterministic prototype, not a complete AI-agent platform.
