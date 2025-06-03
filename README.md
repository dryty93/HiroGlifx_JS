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

.Server = ()
    [#port;
     $host;]
   : start_server= echo(K) ;

break;

 .Main = ()
    I imports = User~Server;
    & wsgi[30~1270008000] = Server;
    & buyer[late~pass~em~19] = User;
    # r = 3+2;
    $ a = 'de';
    break;

```

This scroll imports two classes from separate files and executes through the HiroGlifx VM. The resulting output is a json tree as shown below:

```
[{"name":"Iimports","val":"User~Server","type":".","parent":"User~Server"},{"name":"&wsgi","val":{"0":"#port=30","1":",$host=1270008000","name":"Server","imported_as":"&wsgi","body":",[#port;,$host;],:start_server=echo(K","parent":"Main","value":["30","1270008000]"],"look_up":{"key":["#port","$host",""],"params":[{"key_name":"#port","value":"30"},{"key_name":"$host","value":"1270008000]"}]}},"type":"&","parent":"Server","vals":["30","1270008000"]},{"name":"&buyer","val":{"0":"#port=30","1":",$host=1270008000","2":"$username=late","3":",$password=pass","name":"User","imported_as":"&buyer","body":",[$username;,$password;,$email;,#age;],:login=[,echo:a+b;],:logout=echo:a+b;,,break;,,,,","parent":"Main","value":["late","pass","em","19]"],"look_up":{"key":["$username","$password","$email","#age",""],"params":[{"key_name":"$username","value":"late"},{"key_name":"$password","value":"pass"},{"key_name":"$email","value":"em"},{"key_name":"#age","value":"19]"}]}},"type":"&","parent":"User","vals":["late","pass","em","19"]},{"name":"#r","val":5,"type":"#","parent":"Main"},{"name":"$a","val":"de","type":"$","parent":"Main"},{"name":"[object Object]","type":"[","parent":"Main"},{"name":"[object Object]","type":"[","parent":"Main"}]

```
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
