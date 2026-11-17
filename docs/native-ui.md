# HiroGlifx Native UI (experimental)

A separately routed native .scroll DOM interpreter for issue #63. No Riftfall systems are changed.

## Run

From repository root:

    node hiro.js package add examples/native-ui examples/native-ui-library
    node hiro.js check examples/native-ui
    node hiro.js dev examples/native-ui 3000
    node hiro.js build examples/native-ui

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

## Static deployment

The build command emits a dependency-free static site to examples/native-ui/dist, including index.html, dashboard/index.html, form/index.html and the native runtime asset. Serve that directory from the site root on any static host; route folders have their own index.html. Existing legacy pages are intentionally not compiled with this native UI-only build path. The compiled output contains the resolved, integrity-verified .scroll source, not JavaScript application components.

## Verify

    node --test tests/native-ui.test.js
    node e2e/native-ui-smoke.js

Chromium e2e requires Playwright and its browser installed. The smoke test creates a fresh temp project, installs the package, exercises all three pages at desktop and mobile sizes, and writes actual screenshots to artifacts/native-ui-*.png.

## Limitations

This explicitly selected UI dialect shares class declaration and override semantics with native game classes but does not yet unify the complete game and DOM AST/interpreter. It does not implement keyed diffing, generalized slots, async data, or custom CSS scoped per instance. Form submissions are local demos; no backend persistence. The Modal class is a reusable starting primitive, not a production focus-trapped dialog. Arbitrary expressions, portals, sophisticated animation timelines, full form validation, and HMR preserving state remain unsupported. Updates currently rebuild DOM and attempt to restore focus. These boundaries need additional work before the entire issue #63 acceptance criteria can be considered complete.


## Experience layer: high-level native components

Issue #63's reference pages emphasize strong editorial composition, animated hero visuals, scroll stories, portfolio showcases, and interactive pricing. This release adds the following **authored in native .scroll**:

| Component | What it creates | Configuration |
| --- | --- | --- |
| CinematicHero | full-bleed aurora hero with animated accents and CTA | eyebrow, title, description, action, href |
| EditorialHero | inherited hero with oversized serif headline | same props, render override |
| StickyNavigation | translucent sticky navigation | brand, first, second |
| BentoTile, BentoWide, BentoMint | interactive bento-grid blocks | title, description, number |
| BentoShowcase | complete four-tile responsive bento section | eyebrow, title |
| MarqueeBand | continuously animated multi-copy text strip | text |
| RevealStory | viewport-triggered editorial story plus floating sphere | eyebrow, title, description |
| ShowcaseCarousel | animated 3-slide native carousel | heading, first, second, third |
| FAQItem | accessible expanded-state FAQ toggle | question, answer, open |
| PricingPanel | monthly/yearly pricing interaction | title, description, annual |
| PhotoTile | lazy-loaded image presentation with safe media URLs | src, alt, title |
| TestimonialQuote | editorial customer-quote panel | quote, person |
| KineticCTA | gradient editorial CTA section | eyebrow, title, action, href |
| FloatingDock | reusable compact link dock | defaults are overridable |

Build visually sophisticated sections **without duplicating their internal DOM**:

    ui application
    import native-ui

    .MyHero = (EditorialHero)
        $ eyebrow = "OUR CREATIVE STUDIO";
        $ title = "Built to move people.";
        $ action = "See our work";
        $ href = "/studio";
        break;

    .Main = ()
        : render(self) = [
            element page main root;
            component StickyNavigation nav page;
            component MyHero hero page;
            component MarqueeBand marquee page;
            prop marquee text "CREATE SOMETHING GREAT.";
            component BentoShowcase grid page;
            component ShowcaseCarousel gallery page;
            component PricingPanel price page;
            component FAQItem firstQuestion page;
            prop firstQuestion question "Is this actually HiroGlifx?";
            prop firstQuestion answer "Yes, every layout and event is authored in .scroll.";
            component KineticCTA finalCTA page;
        ]
        break;

Open /experiences for an animated product showcase and /studio for an editorial gallery plus a working pricing toggle and FAQ. Each is written in .scroll, not a JS component. Changes to the shared library carry through both sites and all original demos.

### Motion primitives

Inside render(self), use:

    motion hero reveal;
    motion card hover-rise;
    motion sphere float;
    motion art glow;
    motion logoStrip marquee;
    motion background spotlight;
    slide track active;
    show answer open;
    hide monthly annual;

These commands use a fixed, allowlisted animation vocabulary. reveal, rise, and scale use IntersectionObserver and disconnect when the component refreshes/unmounts. If the observer API is unavailable or the user prefers reduced motion, the element is immediately visible. All animations are disabled under prefers-reduced-motion: reduce. The slide command binds a numeric typed state field to a CSS motion variable, and the cycle action advances the state while wrapping at the end:

    : next(self) = [
        cycle active 0 2;
    ]

There is no JavaScript supplied by the application and no untrusted expression evaluation. Source validation rejects unknown motion presets, arbitrary DOM attributes, unsafe media URLs (at render), and non-numeric slide state.

Local media can be placed under assets/ and referenced as /assets/picture.webp. The dev server serves an allowlisted set of image types from inside the project root, with real-path checks. The static build copies safe image files. Remote images are accepted only via HTTPS. A native image should always specify alt and lazy loading.

### Design inspiration and boundaries

The reference links in issue #63 are benchmarks, not copied site assets. Oversight Supply includes sections spanning heroes, scroll stories, portfolio collages, pricing and CTAs; their interactions guided the choice of primitives rather than being reproduced verbatim.

The experience library is a useful high-level foundation, but it does not yet include GPU-powered fluid simulations, custom shader or WebGL hero scenes, highly specialized scroll-scrubbing timelines, physics-driven interaction, an authoring visual editor, or a full visual component playground. Reveal animations and the simple carousel are browser-native and bounded by design. A production-grade dialog still requires additional focus management.

### Browser validation

The Playwright smoke test checks 5 routes at desktop and mobile widths. It validates navigation, no horizontal overflow, counter clicks, form submissions, modal open/close, theme switching, carousel cycling, viewport reveals, image loading, FAQ expansion and the pricing switch. Screenshots of all five pages at both widths are uploaded as a GitHub Actions artifact. Full repository Node regressions and project build checks run in the same workflow.
