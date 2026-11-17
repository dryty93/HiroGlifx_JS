# HiroGlifx Native Experience Catalog

Reusable experience primitives and full website sections, all authored in `.scroll`. This catalog extends the foundation delivered in PR #67. The website examples are **visual inspiration**; the classes are original implementations, not copied source or a claim of one-to-one replication of all external sites.

## Get started

```bash
node hiro.js init my-studio --ui
node hiro.js ui list my-studio
node hiro.js ui add my-studio SplitHero campaign
node hiro.js dev my-studio 3000
node hiro.js check my-studio
node hiro.js build my-studio
```

The starter includes `/catalog` with four collections: `/catalog-heroes`, `/catalog-portfolios`, `/catalog-stories`, and `/catalog-conversion`. Visit these pages to see source-authored components working in a real browser. `ui add` creates an editable `.scroll` page that imports the integrity-verified `native-ui` library; `ui list` shows available class names.

## Catalog

| Experience family | Native classes | What they provide |
| --- | --- | --- |
| Heroes | CinematicHero, EditorialHero, SplitHero, GlassHero, ProductHero, PosterHero, OrbitHero, VideoHero | Editorial typography, ambient motion, glass treatment, split layouts, device frames, orbit visuals, poster media |
| Portfolios and galleries | CollagePortfolio, HorizontalPortfolio, EditorialPortfolio, OrbitHero, CaseStudyFeature, PhotoTile | Mixed-span cards, snap-scrolling gallery, collage compositions, portfolio features |
| Scroll and narrative | StickyScrollytelling, TimelineStory, ProcessSteps, RevealStory, ScrollProgress | Sticky visual pane, chapter sections, reveal motion, timeline progression |
| Visual blocks | BentoTile, BentoWide, BentoMint, BentoShowcase, TiltBento, SpotlightCard, FeatureSpotlight | Bento composition, interactive tilt and pointer spotlight, large highlights |
| Product and integrations | ProductHero, ProductMockup, IntegrationCloud, StatsStrip, BeforeAfterSlider | Device previews, integration cards, three metrics, draggable CSS comparison wipe |
| Interactive content | ShowcaseCarousel, TabbedShowcase, FAQItem, Modal, MagazineGrid, PeopleGrid, QuoteWall, TestimonialQuote | Slide state, tab visibility, expanded FAQs, editorial content, social proof |
| Conversion and commerce | PricingPanel, ComparisonTable, NewsletterCTA, MagneticCTA, KineticCTA | Period switching, semantic table, local demo form, magnetic CTA |
| Navigation and utilities | StickyNavigation, Navigation, FloatingDock, MegaFooter, MarqueeBand, NotFoundExperience | Navigation, responsive footer, ticker, intentional 404 screen |

The library also contains foundational Button, PrimaryButton, Link, Form, Input, Card, Section, Stack, Grid and related components.

## Compose a full page in HiroGlifx

```scroll
ui application
import native-ui

.Main = ()
    : render(self) = [
        element page main root;
        component StickyNavigation nav page;
        component SplitHero hero page;
        prop hero eyebrow "DESIGNED TO MOVE YOU";
        prop hero title "Every idea deserves an experience.";
        prop hero description "Native interfaces with visual impact.";
        prop hero action "See our work";
        prop hero href "/portfolio";
        component CollagePortfolio gallery page;
        prop gallery title "Selected work";
        component StickyScrollytelling story page;
        prop story title "Built for the journey";
        component BeforeAfterSlider comparison page;
        prop comparison title "See the difference";
        component ComparisonTable prices page;
        prop prices title "Choose your plan";
        component MagneticCTA finalCTA page;
        prop finalCTA title "Create something memorable";
        component MegaFooter footer page;
        prop footer title "MY STUDIO";
    ]
    break;
```

The `component`, `prop`, `motion`, `stylevar`, `slide`, `show`, `hide`, and state-action commands remain HiroGlifx language statements. The browser host owns only safe DOM rendering and predefined motion behavior. No application DOM components need to be handwritten in JavaScript.

## Customize by inheritance

```scroll
.CampaignHero = (SplitHero)
    $ eyebrow = "OUR NEXT CHAPTER";
    $ title = "Your brand. Reimagined.";
    $ description = "An experience that sticks.";
    break;
```

Pass other values using `prop`. Class fields are typed and inherited. When you need distinct structure, override `: render(self) = [ ... ]`; polymorphic dispatch chooses the subclass implementation.

## Native interactions

- `motion panel reveal`, `motion panel rise`, and `motion panel blur-in` provide entrance treatments.
- `motion artwork float`, `motion art rotate`, `motion tile tilt`, and `motion panel spotlight` provide decorative movement and pointer effects.
- `motion button magnetic` provides a pointer-reactive CTA. Keyboard interaction remains native anchor/button behavior.
- `motion track marquee`, `motion line scroll-progress`, and `motion stage zoom-scroll` support continuous, scroll-linked presentation.
- `stylevar panel --hg-wipe amount` binds a typed numeric state field to an allowlisted CSS variable; `bind range amount` updates it from a native range slider.
- `cycle active 0 2`, `toggle open`, `set message "..."` and `show answer open` implement bounded native interaction.

Effects are allowlisted, support reduced-motion behavior, and clean up listeners and viewport observers. Safe local media paths and HTTPS URLs are supported; no arbitrary JavaScript or HTML injection is required.

## Working video

The `VideoHero` has a typed `videoSrc` property. For local playback, put your MP4 or WebM in the project's `assets/` folder, then configure the component:

```scroll
component VideoHero video page;
prop video title "Our latest film";
prop video src "/assets/studio-placeholder.svg";
prop video videoSrc "/assets/showreel.mp4";
```

The browser host validates the media URL, and the dev server and static builder support local `.mp4` and `.webm`. Without `videoSrc`, the component displays its poster with controls but has no playable footage. No bundled third-party stock media is implied.

## Boundaries

This covers major *families* of the inspiration sites through original reusable classes. The linked galleries contain many distinct designs and can change over time; there is no defensible one-to-one promise that every individual reference, premium asset, shader, experimental WebGL simulation, physics interaction, or cinematic timeline has been cloned or implemented. Advanced shader effects, multi-track scroll choreography, virtualized collections, general-purpose slot APIs, and a drag-and-drop designer remain outside this implementation. Custom media and branding still need to be supplied for a specific project.

## Verification

Run `node --test tests/native-ui.test.js`, `node e2e/native-ui-smoke.js`, and `node e2e/native-catalog-smoke.js` (Playwright/Chromium required). CI validates all existing HiroGlifx regressions, class imports, app builds, browser interactions, desktop/mobile screenshots, responsive overflow, and safe media boundaries.
