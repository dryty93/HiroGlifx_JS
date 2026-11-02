# QA testing and acceptance

Run on the `qa` branch from a clean checkout:

```bash
node --test experimental/tests/*.test.js
node experimental/cli.js experimental/examples/newsroom.scroll
```

The CLI should return `Agent composition works` and an execution trace. All tests must pass on the exact `qa` head.

Current scope:
- Deterministic agent blueprint composition
- Adjacent-file blueprint imports
- Standalone expression AST
- Standalone lexical environment
- Model/tool adapters, memory and DAG workflow primitives

**Not yet integrated:** the expression engine and lexical environment into the main `.scroll` parser/interpreter, first-class async agent execution, complete permission inheritance, durable state and full AI integration.

Do not promote `qa` to `main` until the PROJECT_SCOPE.md acceptance gates pass.
