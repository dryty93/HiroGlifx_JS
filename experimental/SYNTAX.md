# HiroGlifx .scroll syntax (indentation-first)

The preferred style uses **four spaces per level**, colon-ended block headers, and one statement per line. Existing brace-based files remain supported. The parser lowers indentation-style syntax to the same AST used by legacy files.

## Complete example

```scroll
.Calculator = ($base)
    :add($value):
        return $base + $value

.Main = ()
    I imports = Calculator
    &calc = Calculator(10)

    :run():
        $sum = calc.add(5)
        if $sum > 10:
            return {total: $sum, ok: true}
        else:
            return {total: $sum, ok: false}
```

Run from the repository root:

```sh
node experimental/cli.js experimental/examples/indentation-intro.scroll
```

## Syntax reference

| Construct | Syntax |
|---|---|
| Blueprint | .Main = () |
| Constructor parameters | .Worker = ($name, $base) |
| Import | I imports = Worker ~ Editor |
| Create instance | &worker = Worker("Taylor", 10) |
| Method | :run($topic): |
| Variable | $score = 5; access with $score |
| Call child agent | worker.run($topic) |
| Conditions | if $score > 5: then else: |
| Loop | while $score < 5: |
| Array | $scores = [1, 2, 3] |
| Object | $profile = {name: "Taylor"} |
| Metadata | @role = "Researcher" |
| AI call | ai.reason($topic) through async runtime |

Use parentheses for method declarations, calls, and constructors. Parentheses around if and while conditions are optional.

## Multi-line objects and arrays

Braces **remain for object literals**; they no longer delimit method, if, while, or else blocks.

```scroll
.Main = ()
    :run():
        $profile = {
            name: "Taylor",
            scores: [
                10,
                20
            ]
        }
        return $profile.scores[1]
```

## Compatibility and limitations

- A source file containing a colon-style method uses layout mode. Legacy files without colon-style methods are parsed as before.
- Do **not** mix block styles within one file; migrate one file at a time.
- Four spaces per level; no tabs. Blank lines and // comments are allowed.
- Methods and if/else/while blocks require a body. else must match the indentation of its if.
- Collections and calls can span lines inside braces, brackets or parentheses.
- The initial Browser Studio runs Main.run() without parameters; write a wrapper to exercise parameterized methods.
- Error offsets for layout syntax can refer to the translated code. Preserving precise original source spans is a future improvement.
- ai.reason() requires asynchronous execution and a configured provider; Browser Studio's Run Main is deterministic only.

## Legacy syntax remains valid

```scroll
.Main = ()
    :run() = {
        if (true) {
            return 12;
        } else {
            return 0;
        }
    };
```
