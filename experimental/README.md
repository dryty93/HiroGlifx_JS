# HiroGlifx Experimental — Agent Blueprints

This experimental implementation preserves the original `.scroll` idea: `.` declares a blueprint, `I imports` loads reusable blueprints, and `&` instantiates one.

## Quick start

```bash
node experimental/cli.js experimental/examples/newsroom.scroll
node --test experimental/tests/*.test.js
```

No dependencies or API keys are required for the deterministic demonstration.

## Grammar (v0)

```
Program      := Blueprint*
Blueprint    := "." Identifier "=" "(" Statement* ")" | "." Identifier "=" "()" Statement* "break" ";"
Statement    := "I" "imports" "=" Identifier ("~" Identifier)* ";"
              | "&" Identifier "=" Identifier "(" Arguments? ")" ";"
              | "$" Identifier "=" String ";"
              | ":" Identifier "(" Parameters? ")" "=" "{" Statement* "}" ";"
              | "return" Expression ";"
              | "echo" "(" Expression ")" ";"
              | "$" Identifier "=" Expression ";"
Expression   := String | Identifier | Identifier "." Identifier "(" Arguments? ")" | "$" Identifier
Arguments    := Expression ("," Expression)*
Parameters   := "$" Identifier ("," "$" Identifier)*
```

This is a **small agent-composition interpreter**, not yet a general-purpose language or autonomous LLM runtime. Child-agent invocation is deterministic; the example does not pretend to call an AI model. Imported blueprints are registered, not executed. Future work: type schemas, async model/tool adapters, permissions, durable checkpoints, and approval gates.

Legacy implementation remains at the repository root for comparison.
