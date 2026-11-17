# HiroGlifx Native UI (experimental)

A separately routed native .scroll DOM interpreter for issue #63. No Riftfall systems are changed.

## Run

From repository root:

    node hiro.js package add examples/native-ui examples/native-ui-library
    node hiro.js check examples/native-ui
    node hiro.js dev examples/native-ui 3000

Open / for the landing page, /dashboard for the interactive dashboard, /form for the form. The package manager pins the package SHA-256 content hash and checks it at every build. Package add runs only once.

## Native UI classes

A UI page begins with ui application, and an import native-ui line. UI libraries begin with ui library. All application structure and event behavior is written in native .scroll:

    .CounterButton = (PrimaryButton)
        : render(self) = [
            element button button root;
            class button "hg-button hg-button-primary";
            attr button type "button";
            text button "Clicked {count} times";
            on button click activate;
        ]
        : activate(self) = [
            increment count 1;
        ]
        break;

Class fields are typed using dollar, number sign and question mark prefixes. Extending a class inherits typed fields and methods. An overridden render or event method is dispatched from the concrete child class. The library includes Component, Layout, Stack, Grid, Section, Text, Heading, Button, PrimaryButton, SuccessButton, Link, Input, Card, MetricCard, Modal, Navigation, Tabs and Form.

Element directives: element ID TAG PARENT, component CLASS ID PARENT, prop CHILD FIELD VALUE, text ID VALUE, class ID CSS_CLASSES, attr ID NAME VALUE, bind ID FIELD, on ID EVENT METHOD. Use root as the parent of a component's top-level DOM element. Strings support typed field interpolation with {field}. Event actions support set, toggle, increment and local navigate. DOM text uses textContent, not innerHTML. Attribute names, semantic tag names and event types are allowlisted. There is no eval, Function, arbitrary JavaScript import, or raw HTML.

Styles supply dark tokens and a light override using data-hg-theme=light, responsive grids, focus-visible states, transitions, and reduced-motion support.

## Verify

    node --test tests/native-ui.test.js
    node e2e/native-ui-smoke.js

Chromium e2e requires Playwright and its browser installed. The smoke test creates a fresh temp project, installs the package, exercises all three pages at desktop and mobile sizes, and writes actual screenshots to artifacts/native-ui-*.png.

## Limitations

This explicitly selected UI dialect shares class declaration and override semantics with native game classes but does not yet unify the complete game and DOM AST/interpreter. It does not implement keyed diffing, generalized slots, async data, production static bundling, or custom CSS scoped per instance. Form submissions are local demos; no backend persistence. The Modal class is a reusable starting primitive, not a production focus-trapped dialog. Arbitrary expressions, portals, sophisticated animation timelines, full form validation, and HMR preserving state remain unsupported. Updates currently rebuild DOM and attempt to restore focus. These boundaries need additional work before the entire issue #63 acceptance criteria can be considered complete.
