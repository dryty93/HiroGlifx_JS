# HiroGlifx Agent Blueprint Roadmap

## Phase 0 — Experimental foundation (this branch)
- [x] Preserve original root implementation
- [x] Define a minimal agent composition grammar
- [x] Build standalone lexer/parser/runtime
- [x] Demonstrate nested blueprint imports and method delegation
- [x] Add no-cost CLI example and initial tests
- [ ] Run CI on GitHub and address failures

## Phase 1 — Robust semantics
- [ ] Formal grammar, typed AST, diagnostics with line/column
- [ ] Explicit import paths and multi-file resolution with cycle detection
- [ ] Blueprint parameters and instance-scoped state
- [ ] Schema-validated inputs/outputs and static import validation
- [ ] Operator precedence, booleans, numbers, collections, conditions

## Phase 2 — Real agents
- [ ] Async agent invocation and provider-neutral model interface
- [ ] Prompt templates, structured output, tool registry
- [ ] Per-agent tool permissions and runtime enforcement
- [ ] Mock provider tests before any paid calls

## Phase 3 — Orchestration
- [ ] Deterministic DAG workflows and explicit dynamic delegation
- [ ] Parallelism, cancellation, timeouts, retries, budget ceilings
- [ ] Human approvals for sensitive operations
- [ ] Durable execution logs, checkpoint/resume

## Phase 4 — Developer experience
- [ ] Formatter, linter, VS Code extension
- [ ] Agent graph visualization, trace viewer, documentation
- [ ] Publish experimental package after security and compatibility review

## Non-goals for first release
No autonomous filesystem/network access by default, no production deployments, and no promises of arbitrary JavaScript compatibility.
