# Raindrop Design Inspiration → HiroGlifx Native UI

Source: https://dryden-inc718.raindrop.page/design-inspiration-77211371 (public Design Inspiration collection, 40 bookmarks as observed November 17, 2026). This implementation uses the **actual saved reference names and notes**. A bookmark to a gallery, design tool or premium asset library is *not* itself a single screen, component definition, or license to copy its underlying assets.

## Evaluation and implementation

| Saved reference / category | Evidence in the collection | HiroGlifx native coverage |
| --- | --- | --- |
| Supahero, Land-book, Landdding, Godly, The Internet Designs, Recent Design, Supply Sections | Landing pages, hero composition and section arrangements | Existing `CinematicHero`, `SplitHero`, `GlassHero`, `BentoShowcase`, `StickyScrollytelling`, plus new `GradientMeshBackground` |
| Navbar Gallery, Footer Design | Navigation and header treatments; the source Navbar Gallery distinguishes sticky, dropdown, mega, sidebar, search, announcement, fullscreen and breadcrumbs | **NEW** `AnnouncementRibbon`, `MegaNavigation`, `FullscreenNavigation`, `BreadcrumbTrail`, `SidebarWorkspace`, `CommandPalette`; existing `StickyNavigation`, `MegaFooter` |
| Transitions.dev, Motion In Design, 60fps, Obsidian UI, Origin Kit | Microinteractions, state transitions, shimmer, hover and animated UI | **NEW** `ToastNotification`, `AnimatedPillTabs`, `SkeletonMorph`, `ShimmerHeadline`, `HoverCardStack`, `SuccessBurst`, `MotionButtonRow`; existing `TiltBento`, `ShowcaseCarousel` and motion presets |
| Bencho, Reverse UI, beUI | Interactive interface components, hover cards, card stacks and stateful controls | **NEW** `HoverCardStack`, `StarRating`, `CommandPalette`, `AnimatedPillTabs`, `SuccessBurst`, `MotionButtonRow`; existing native component primitives |
| Board UI, Astryx, Devault, Mobbin | Application screens, dashboards, design systems and user flow references | **NEW** `DashboardAnalytics`, `SidebarWorkspace`; existing `MetricCard`, `Form`, `Tabs`, `Navigation`, `ComparisonTable`; full calendar/drag-drop apps remain outside this phase |
| Digital Card Packs — Inspora | Saved specifically as a reward/card reveal for Joshua's Learning Lab | **NEW** `RewardCardPack`, keyboard-operable button with actual hidden/revealed state and reusable reward props |
| Sheep Grazing Grass — Inspora | Saved specifically as a character/ambient/idle loop for Joshua's Learning Lab | **NEW** `IdleMascot`, original CSS-illustrated sheep with idle/grazing movement and reduced-motion handling |
| Backgrounds Supply, Inspora | Motion / background assets and visual inspiration | **NEW** `GradientMeshBackground`, `ShimmerHeadline` and native motion styles; no proprietary asset redistribution |
| CTA Gallery | CTA placement and conversion design | **NEW** `MotionButtonRow`, existing `MagneticCTA`, `KineticCTA`, `NewsletterCTA` |
| On.Design, Directoryyy, DesignBookmark | Resource directories/discovery | Reference catalog, not an individual component |
| Fontshare | Font exploration | Design/reference source, not redistributed font binaries |
| UX Pilot Labs, v0 Templates, One Prompt Design, Taste, Iter0 | AI design/coding templates and prompt examples | Authoring guidance; no native component implied by the bookmark alone |
| Supply Videos | AI video kits / production | Existing `VideoHero` supports local or HTTPS media, but no copying or generation of proprietary video kits |
| WeDoFlow, Horizon X | Templates and assets | Design inspiration only; assets are not bundled |

**Important source limitation:** The public Raindrop collection was accessible. The two individual Inspora article pages returned HTTP 429 when checked, so the reward and sheep components are grounded in the saved Raindrop descriptions, **not** in a claimed frame-by-frame reconstruction of those animations.

## New native components (18)

`AnnouncementRibbon`, `MegaNavigation`, `FullscreenNavigation`, `BreadcrumbTrail`, `SidebarWorkspace`, `CommandPalette`, `AnimatedPillTabs`, `ToastNotification`, `RewardCardPack`, `IdleMascot`, `HoverCardStack`, `SkeletonMorph`, `ShimmerHeadline`, `GradientMeshBackground`, `DashboardAnalytics`, `SuccessBurst`, `StarRating`, `MotionButtonRow`.

All are `.scroll` classes in `examples/native-ui-library/main.scroll`, using typed fields, inheritance, composition and state/event handlers. Rendering, layout and motion remain restricted host services. All interactions are original, with no borrowed React source and no proprietary graphics.

## Try every component

From the repository root on this branch:

```bash
node hiro.js showcase 3000
```

Then open `http://127.0.0.1:3000/raindrop-inspiration` for the dedicated 18-component gallery, or `/showcase` for the living **84-class** catalog. The standalone showcase command sets up a temporary verified local package, avoiding manual lockfile installation.

### Example: reward card reveal

```scroll
ui application
import native-ui

.Main = ()
    : render(self) = [
        element page main root;
        component RewardCardPack prize page;
        prop prize label "Learning Lab Mystery Pack";
        prop prize reward "+250 points";
    ]
    break;
```

### Example: native, reactive command filter

```scroll
.MyPalette = (Component)
    $ query = "";
    : render(self) = [
        element panel section root;
        element search input panel;
        attr search type "search";
        bind search query;
        element result p panel;
        text result "Open documentation";
        filter result query;
    ]
    break;
```

The `filter` directive hides unmatched text-only entries as the user types **without rebuilding or losing focus on the input**. This is a fixed, safe, local text filter, not arbitrary JavaScript execution or a network search.

## Verification

`node --test tests/native-ui.test.js` validates the exported classes and the new gallery. `node e2e/raindrop-native-smoke.js` tests desktop/mobile gallery layout and working reveal, search filtering, navigation, reward, rating, tabs, toast, loading and celebration states. `node e2e/all-experiences-smoke.js` asserts that every class is represented in the general showroom.

## Remaining boundaries

A curated list of 40 *reference sources* does not imply thousands of individual designs are reproduced. No literal recreation of Mobbin's mobile screens, Bencho's entire catalog, Reverse UI's premium effects or 60fps/Transitions animation libraries is claimed. The gallery is a tested set of **18 additional reusable primitives**. Advanced physics confetti, professional vector character animation, rich data charting, keyboard-trapped modal dialogs, fully functional command routing, complete upload pipelines and proprietary shader simulations remain future work.
