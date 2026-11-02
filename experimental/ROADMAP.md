# HiroGlifx Stages 1–6 — Delivery Tracker

Status as of 2026-11-01. This is a workstream tracker, not a claim of completion.

| Stage | Goal | Status | Acceptance gate |
|---|---|---|---|
| 1 | Stabilize parser/runtime, CI, reproducible tests | IN PROGRESS | CI green; CLI example verified |
| 2 | Core language: values, expressions, conditions, loops, lexical scope | NOT COMPLETE | Conformance suite passing |
| 3 | Real multi-file imports, instance state, dependency graph | NOT COMPLETE | Cross-file nested agent test passing |
| 4 | Async model providers and structured AI outputs | IN PROGRESS | Real provider integration + mocked contract tests |
| 5 | Tools, memory, permissions, secrets | IN PROGRESS | Denied capabilities demonstrably blocked; persistent memory tested |
| 6 | Multi-agent delegation, parallelism, retries, cancellation | IN PROGRESS | Nested and parallel agent workflows with failure handling |

## Implemented experimental pieces
- Lexer, parser, blueprint runtime, CLI, nested blueprint example
- Corrected quoted-string parsing
- GitHub Actions test workflow (run status not yet verified)
- Mock model provider and provider registry
- Tool registry with explicit allowlist
- Bounded sequential step orchestrator
- Initial tests for runtime and agent primitives

## Required PR sequence
1. Stabilize v0 parser/runtime and verify CI (existing PR #5).
2. Expression grammar, data types, lexical environments, and conformance tests.
3. Multi-file module loader, import graph, instance isolation, and integration tests.
4. Async model adapters, structured output contracts, streaming and usage accounting.
5. Tool capability system, secret isolation, persistent memory and security tests.
6. Agent graph scheduler, delegation, parallel execution, cancellation, retry and end-to-end tests.

Do not merge the experimental work into main until tests are green and the user approves.
