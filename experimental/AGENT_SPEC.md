# HiroGlifx Agent Composition Contract (Experimental)

## Core semantics
- A blueprint (`.Name`) defines reusable behavior; it does not execute on import.
- An import (`I imports = A ~ B;`) resolves blueprint dependencies.
- An instance (`&agent = Agent();`) creates an invocation target.
- An agent method (`:run($input) = { ... };`) defines a callable contract.
- A method call (`agent.run($input)`) synchronously invokes a child blueprint.
- Child agents cannot obtain network or filesystem capabilities implicitly.
- The current runtime uses deterministic method evaluation only; it does not call an LLM.

## Next language additions
Types and expression grammar, file-based imports with cycle detection, constructor parameters and instance isolation, async methods, model adapters, tool registry, and permission enforcement.

## Security principles
- No tool invocation by default.
- A child can only receive a subset of its parent's granted capabilities.
- Never treat model output as executable source code.
- Use explicit schema validation on external inputs and model outputs.
- Enforce depth, step, time, and budget limits at the runtime boundary.
- Side-effecting tools require idempotency keys and optional human approval.
