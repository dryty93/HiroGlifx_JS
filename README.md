# HiroGlifx_JS

**HiroGlifx_JS** is a symbolic, scroll-based domain-specific language (DSL) that compiles into JavaScript logic for rapidly prototyping client-side and server-side applications.

This project represents a unique experiment in human-readable, symbolic programming and demonstrates how abstract command structures can be interpreted and executed by a custom-built JavaScript virtual machine.

---

## 🔍 Key Features

- **Scroll-Based Syntax**: Declare variables and commands using symbolic notation like `$`, `#`, `&`, etc.
- **Custom Parser & VM**: Includes a hand-built tokenizer, parser, and runtime that interprets HiroGlifx scroll files into executable JavaScript.
- **Scope Resolution**: Variable scoping logic supports nesting and global resolution.
- **Built-In Functions**: Scrolls can define `if`, `loop`, `write`, and other fundamental logic constructs using HiroGlifx's native keywords.
- **Dual-Purpose**: Capable of powering both frontend (via browser) and backend-style automation via Node.js logic.

---

## 🧠 Example Syntax

```scroll
.User = ()
    [$username;
     $password;
     $email;
     #age;]
     : login<a~b~c> = [
        echo:a+b;]
     : logout<a~b~c> =echo:a+b;

   break;

```

This scroll compiles into valid JavaScript and executes through the HiroGlifx VM.

---

## 🗂️ Project Structure

| File                  | Purpose |
|-----------------------|---------|
| `Parser.js`           | Converts scroll syntax into an AST (abstract syntax tree) |
| `HG_VM.js`            | Virtual machine that executes compiled scroll code |
| `Tokenizer.js`        | Lexical analyzer to identify tokens |
| `Scope.js`            | Manages variable and scope resolution |
| `main.js`             | Entry point to run scrolls in the browser |
| `index.html`          | Basic UI interface for loading scrolls |
| `String.scroll`       | Sample scroll showcasing string manipulation |
| `server.scroll`       | Server-side usage example |

---

## 🚀 How to Run

1. Clone the repo:
   ```bash
   git clone https://github.com/dryty93/HiroGlifx_JS.git
   cd HiroGlifx_JS
   ```

2. Open `index.html` in your browser to run in client-side mode.

3. Modify and run scrolls by editing `main.js` and `.scroll` files.

---

## 📦 Use Cases

- Prompt DSL for LLM automation and chaining
- Teaching symbolic logic and runtime interpretation
- Custom scripting engine for internal tools or agents
- Personal experimentation with language design

---

## 📌 Why This Project Matters

HiroGlifx_JS isn’t just a quirky DSL — it shows you can:
- Build compilers and interpreters from scratch
- Design logical runtime engines and scope resolvers
- Structure domain-specific languages for task automation

This project reflects strong skills in language design, abstraction, backend runtime logic, and creative problem-solving — a great asset in AI tooling, DevTools, and backend automation roles.

---

## 👤 Author

**Tyler-Joshua Dryden**  
Creator of HiroGlifx and backend engineer focused on LLM tooling, automation, and internal product architecture.  
[GitHub Profile →](https://github.com/dryty93)
