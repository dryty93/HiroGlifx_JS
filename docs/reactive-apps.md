# HiroGlifx Phase 2 — Reactive apps

Open `playground-phase2.html` to edit and run the example with a live preview. The new `AppRuntime` extends the Phase 1 `Runtime` without changing legacy `HG_VM.js`, `Parser.js` or `Tokenizer.js`.

## Supported syntax

```scroll
.Main = [
  state count 0;
  state name "friend";
  use Header hero;
  text tally "";
  bind text tally "Clicks: {count}";
  button add "Add";
  on click add => increment count;
  input nameField "Your name";
  bind input nameField name;
  on input nameField => set name @value;
  text greeting "";
  bind text greeting "Hello, {name}!";
]

.Header = [
  text heading "Welcome!";
]
```

The `.Main = [ ... ]` structure, optional semicolon command terminators, and reusable component blocks are **a narrow compatibility syntax**; the existing symbolic parser's full feature set is not yet integrated. Component instances have prefixed element IDs (e.g. `hero-heading`). State keys are currently global, not component-scoped. Components must be defined only once. Avoid circular references; expansion has a maximum depth of eight.

### Commands added

- `state <key> <initial>`: define reactive string, number, or boolean state
- `set <key> <value>`: replace existing state
- `increment <key> [step]`: increment numeric state (default +1)
- `input <id> <placeholder>`: add a plain text input
- `bind text <id> "Your value: {key}"`: render state placeholders into element text content
- `bind input <id> <key>`: synchronize an input value with state on state changes
- `on click <id> => increment <key>`: add an increment button action
- `on input <id> => set <key> @value`: update state from an input
- `use <ComponentName> <instanceId>`: expand a reusable block

All Phase 1 UI and animation commands remain available.

## Run tests

```bash
node --test tests/*.test.js
```

## Limitations and planned follow-up

This is **not a complete full-stack application framework yet**. Missing: request-aware backend logic, persisted database state, authentication/authorization, routing, secure cross-origin browser automation permissions, scoped component state, sandboxed preview, and comprehensive symbolic-VM compatibility. AppRuntime's browser form support is limited to text fields and event state bindings. No arbitrary JavaScript from a scroll file is executed.

The preview shares the hosting document. Only open trusted scroll files there until a sandboxed iframe runner is added.
