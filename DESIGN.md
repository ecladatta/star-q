---
version: alpha
name: STAR-Q
description: A writing desk for structured data. Dense neutral tooling for annotating texts and tables into RDF triples; the interface recedes so the annotated text is the product.
colors:
  paper: "#ffffff"
  ink: "#17181c"
  graphite: "#101114"
  bone: "#e9eaee"
  graphite-card: "#15161a"
  graphite-popover: "#1a1c21"
  porcelain: "#f2f3f5"
  fog: "#f1f2f4"
  charcoal: "#1f2126"
  mist: "#f5f6f8"
  carbon: "#1b1d22"
  slate: "#676a73"
  ash: "#9096a2"
  hairline: "#e4e6ea"
  graphite-hairline: "#26282e"
  input-stroke: "#d0d4db"
  graphite-stroke: "#33363d"
  signal-indigo: "#4f5bd0"
  bright-indigo: "#7e89e8"
  signal-red: "#d92d20"
  ember: "#f85149"
  commit-green: "#1a7f37"
  spring-green: "#3fb950"
  amber-wash: "#f6e8c4"
  amber-wash-ink: "#7d5609"
  subject-amber: "#d9962c"
  subject-amber-soft: "#f7e3ba"
  subject-amber-ink: "#7d5208"
  predicate-blue: "#3d7ac8"
  predicate-blue-soft: "#cfdff4"
  predicate-blue-ink: "#1d4f8f"
  object-green: "#47a26d"
  object-green-soft: "#cde8d5"
  object-green-ink: "#1e6b3c"
  qualifier-violet: "#8a7fdd"
  qualifier-violet-soft: "#e0dbf7"
  qualifier-violet-ink: "#4a3f9e"
  chart-teal: "#2f9e8f"
  chart-amber: "#d97706"
  chart-violet: "#7c6bd6"
  chart-rose: "#c4526a"
typography:
  title:
    fontFamily: "Geist, ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif"
    fontSize: 20px
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: -0.2px
  body:
    fontFamily: "Geist, ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif"
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.5
  dense:
    fontFamily: "Geist, ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif"
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Geist, ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif"
    fontSize: 13px
    fontWeight: 500
    lineHeight: 1.5
  data:
    fontFamily: "Geist Mono, ui-monospace, SFMono-Regular, Menlo, monospace"
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.5
rounded:
  sm: 4px
  md: 6px
  lg: 8px
  xl: 12px
spacing:
  sm: 4px
  md: 8px
  lg: 16px
  xl: 24px
  "2xl": 32px
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    typography: "{typography.label}"
    rounded: "{rounded.lg}"
    height: 32px
    padding: 10px
  button-outline:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.lg}"
    height: 32px
    padding: 10px
  text-input:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.lg}"
    height: 32px
    padding: 10px
  badge-pill:
    backgroundColor: "{colors.fog}"
    textColor: "{colors.ink}"
    typography: "{typography.data}"
    rounded: 999px
    height: 20px
    padding: 8px
  card:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: 16px
  top-nav-link:
    textColor: "{colors.slate}"
    typography: "{typography.label}"
    rounded: "{rounded.lg}"
    height: 32px
    padding: 10px
  corpus-tab:
    textColor: "{colors.slate}"
    typography: "{typography.dense}"
    height: 48px
    padding: 12px
---

# Design System: STAR-Q

## Overview

**Creative North Star: "The Writing Desk"**

STAR-Q is a writing desk for structured data: a dense, operate-mode tool in which the interface recedes so the annotated text and its subject-predicate-object triples are the product. The system sits in the craft register of GitHub and Linear — neutral paper and graphite grounds, hairline borders, monochrome primary actions, one indigo voice for focus, links, and active states. Color is not decoration here; it is ledger. The only sustained hues in the product are the four functional annotation roles — amber subject, blue predicate, green object, violet qualifier — and they appear where the data appears.

Density is a feature. Data teams live in this tool all day, so surfaces run 13-14px type on a 4px grid, tables are the default data surface (never card grids), and chrome is a 48px bar that never grows. Every surface answers three questions: what am I working on, what is its state, what next. The theme follows the OS with a persistent manual toggle: paper in light, graphite in dark, one neutral spine and one indigo in both.

Confirmed refusals: the stock SaaS dashboard — no card grids, no marketing chrome, no default-shadcn surfaces, no emoji or glyph icons, no decorative gradients or imagery. Neutral is the identity; the annotations carry the color.

**Key Characteristics:**

- Neutral ground (paper / graphite) with hairline borders; depth by tone step, not shadow
- Monochrome primary button; one indigo accent reserved for focus, links, and active states
- Dense 13-14px type on a 4px grid; 8px control radius
- Four-hue functional annotation coding: amber subject, blue predicate, green object, violet qualifier
- GitHub-register navigation: 48px top bar, left rail under /admin, tab bar under /corpus/[id]
- Geist Sans for prose and UI; Geist Mono for counts, IDs, dates, and data columns
- Dual theme follows the OS with a persistent manual toggle

## Colors

A near-absent palette in which every hue is functional: a neutral ground, one indigo voice, four data-annotation roles, and a small set of state signals.

### Primary

- **Ink** (#17181c): text and the monochrome primary fill in light mode; in dark the roles invert and the primary button becomes **Porcelain** (#f2f3f5) with graphite text.
- **Signal Indigo** (#4f5bd0): the single accent — focus rings, links, the active tab underline, text selection (22% tint), and the current-annotation ring. In dark it rises to **Bright Indigo** (#7e89e8).

### Data annotation

The product's functional coding. Each role carries three values — a core for rings and markers, a soft for field fills, an ink for text on the soft. Dark mode inverts each pair: deep soft fields, light role ink, brighter core.

- **Subject Amber** (#d9962c, soft #f7e3ba, ink #7d5208): the subject of a triple — the entity an assertion is about.
- **Predicate Blue** (#3d7ac8, soft #cfdff4, ink #1d4f8f): the predicate — the relation linking subject to object.
- **Object Green** (#47a26d, soft #cde8d5, ink #1e6b3c): the object — what the predicate points at.
- **Qualifier Violet** (#8a7fdd, soft #e0dbf7, ink #4a3f9e): qualifiers and their values — the provenance and range-check context attached to a triple.

### State

- **Signal Red** (#d92d20, dark **Ember** #f85149): destructive actions and errors.
- **Commit Green** (#1a7f37, dark **Spring Green** #3fb950): success and completed states.
- **Amber Wash** (#f6e8c4) with **Amber Wash Ink** (#7d5609): warnings and constraint notices — the "guide, don't block" surface.

### Neutral

- **Paper** (#ffffff): the light ground — page, card, and popover.
- **Graphite** (#101114): the dark ground; card steps to #15161a and popover to #1a1c21.
- **Fog** (#f1f2f4, dark **Charcoal** #1f2126): secondary surface — active nav pills, secondary buttons.
- **Mist** (#f5f6f8, dark **Carbon** #1b1d22): muted ground — admin rail, row hover, table footers, disabled fills.
- **Slate** (#676a73, dark **Ash** #9096a2): secondary text — descriptions, metadata, inactive nav.
- **Hairline** (#e4e6ea, dark **Graphite Hairline** #26282e): the 1px border used everywhere; the default border color on every element.
- **Input Stroke** (#d0d4db, dark **Graphite Stroke** #33363d): interactive strokes, one notch darker than hairline.

### Named Rules

**The One Indigo Rule.** Signal Indigo appears on a small fraction of any screen at most — focus, links, active states, selection. Its rarity is the point.

**The Accent Pairing Rule.** `--accent-foreground` (#ffffff) is valid only on a filled `bg-accent` surface. Text-only interactive elements use `text-accent`; on paper it reads near-white and disappears.

**The Ledger Rule.** The four annotation hues appear only on annotations — marks in source text, chips, tags, and their immediate context — never as UI chrome, never decoratively.

## Typography

**Display Font:** none — the tool has no display type; the largest text is the 20px page title.
**Body Font:** Geist (self-hosted variable font, weights 100-900; fallbacks ui-sans-serif, system-ui, -apple-system, Segoe UI, Helvetica, Arial)
**Label/Mono Font:** Geist Mono (self-hosted variable font, weights 100-900; fallbacks ui-monospace, SFMono-Regular, Menlo)

**Character:** Engineering-neutral. One humanist sans carries every word of the UI; a mono carries every measured thing. The pairing says instrument, not brochure.

### Hierarchy

- **Title** (600, 20px, line-height 1.3, tracking -0.2px): page headers only — one per view.
- **Body** (400, 14px, 1.5): the base; prose, form text, editor text.
- **Dense** (400, 13px, 1.5): tables, navigation, metadata rows — the workhorse of dense surfaces.
- **Label** (500, 13px, 1.5): nav items, button text, badges — the slightly louder voice at dense sizes.
- **Data** (Geist Mono, 400, 13px, 1.5): counts, IDs, slugs, timestamps, numeric columns — tabular by construction.

### Named Rules

**The Mono-for-Data Rule.** If a string is measured — a count, an ID, a date, a slug, a percentage — it is set in Geist Mono. Sans is for saying things; mono is for reading off values.

**The One Title Rule.** One 20px title per view; everything below it is 14 or 13. Hierarchy comes from those steps, not from display type.

## Layout

The app is a fixed full-height frame: a 48px top bar that never scrolls, and content below that scrolls independently. The grid is 4px; page padding steps 16 / 24 / 32px across breakpoints. Density is the default: content runs 13-14px, controls and rows are 24-40px tall, and whitespace is measured rather than generous.

Navigation is in the GitHub register:

- **Top bar (all views):** wordmark at left; primary items — Corpora, Browse, Teams, Invitations, Admin (admin-only) — as 32px pills in 13px medium; a right cluster of Search (Cmd+K), theme toggle, and account avatar. Below 768px the items collapse into a hamburger dropdown.
- **Section depth:** /admin/* adds a 208px left rail on mist ground with a 48px header and 32px pill items; /corpus/[id] adds a 48px tab bar (corpus title + Overview / Access / Analytics) under the top bar; the document editor is full-width with its own corpus header.
- **Active-state semantics:** a top item lights only when its section owns the URL — Corpora exactly on `/`, Admin on `/admin/*`; inside a corpus or document no top item is lit, because the section chrome (rail or tab bar) owns the context.
- **PageHeader pattern:** 20px title + 13px muted description on one row, actions right-aligned.
- **Mobile:** the admin rail and corpus tab bar become horizontal scroll strips; content padding tightens to 16px.

## Elevation & Depth

The system is flat at rest. Surfaces separate by 1px hairline borders and tonal stepping (paper to card to popover; the admin rail sits on mist at 40% opacity), never by shadow. Shadow is reserved for two floating roles, and it is soft and low — graphite-tinted in light mode, pure black in dark mode.

### Shadow Vocabulary

- **Popover** (`0 1px 2px rgb(16 17 20 / 0.05), 0 4px 16px -4px rgb(16 17 20 / 0.12)`; dark: `0 1px 2px rgb(0 0 0 / 0.4), 0 8px 24px -8px rgb(0 0 0 / 0.6)`): dropdown menus, select and dialog triggers — anything that pops out of the page.
- **Overlay** (`0 2px 4px rgb(16 17 20 / 0.06), 0 16px 48px -8px rgb(16 17 20 / 0.22)`; dark: `0 2px 4px rgb(0 0 0 / 0.4), 0 24px 64px -12px rgb(0 0 0 / 0.7)`): dialogs, command palette, toasts — anything above everything.

### Named Rules

**The Flat Desk Rule.** Surfaces at rest carry no shadow. If a resting surface needs to lift, the answer is a border or a tone step, not a box-shadow.

## Shapes

Corners are quiet: a 4 / 6 / 8 / 12px scale. Controls (buttons, inputs, nav pills) use 8px; annotation marks use 4px; small buttons and chips compress to 6-10px; cards and dialog containers use 8-12px. Pills (badges, avatars, the scrollbar thumb) are fully rounded. The dominant form language is the 1px hairline border — used for separation instead of shadow — with interactive strokes one notch darker at input-stroke. No clipping, no bevels, no heavy icon geometry.

**The Hairline Rule.** Separation is a 1px line at `--border`. Shadows, double borders, and gradient edges are not part of the form language.

## Components

### Buttons

- **Shape:** 8px radius; heights 24 / 28 / 32 / 36px (xs / sm / default / lg); 10px horizontal padding by default; 16px icons.
- **Primary:** ink fill (#17181c) with near-white text; in dark, a porcelain (#f2f3f5) fill with graphite text. The primary action is the loudest element on the screen.
- **Hover / Focus:** hover drops the fill to 80% opacity; focus-visible adds a 3px indigo ring at 50% plus an indigo border; press translates down 1px.
- **Secondary / Ghost / Tertiary:** outline (hairline stroke, transparent, mist fill on hover); secondary (fog fill); ghost (text-only, mist fill on hover); destructive (10% red tint with red text — solid red is reserved for text and icons); link (underlines on hover).

### Chips

- **Style:** fully rounded pills, 12px medium text, 8px horizontal padding: default = ink fill; secondary = fog fill; warning = amber wash; destructive = solid red.
- **State:** the outline variant serves filters and metadata; chips carry counts (in mono), roles, and statuses.

### Cards / Containers

- **Corner Style:** 8px.
- **Background:** paper; dark card one tone above graphite.
- **Shadow Strategy:** none at rest (see Elevation & Depth); popover/overlay shadows only when floating.
- **Border:** 1px hairline.
- **Internal Padding:** 16px.

### Inputs / Fields

- **Style:** 32px tall, 8px radius, input-stroke border, transparent fill (dark: faint stroke-tinted fill), 10px horizontal padding, 14px text stepping to 13px at 768px and up, slate placeholders.
- **Focus:** the same indigo treatment as buttons — 3px ring at 50% plus indigo border.
- **Error / Disabled:** destructive border with a 20% red ring; disabled takes a muted fill at 50% opacity and a not-allowed cursor.

### Navigation

- **Top bar:** 48px tall, paper ground, 1px hairline below; wordmark at 15px semibold; items are 13px medium pills — inactive slate, hover foreground, active fog fill with ink text. The right cluster is 32px icon buttons (search, theme, avatar).
- **Corpus tab bar:** 48px under the top bar; the corpus title (13px semibold, truncated) at left, tabs sitting on the baseline: active is a 2px underline in ink riding the bar's hairline, hover is a 1px hairline underline, text goes slate to ink; 16px stroke icons at 1.75 weight.
- **Admin rail:** 208px wide on mist at 40% opacity, hairline at its right edge; 48px header (13px semibold, links to /admin); items are 32px with 16px icons and 13px labels — active is a fog pill with ink text; count badges are 11px mono pills.
- **Mobile:** hamburger dropdown below 768px; rail and tab bar become horizontal scroll strips.

### Annotation Mark (signature)

The product's signature component: a span over source text in the document editor. 4px radius, 4px inline padding, a soft role fill with a 25%-alpha inset ring of the role core (subject amber, predicate blue, object green, qualifier violet). The current annotation lifts to full opacity with a 2px indigo ring at 70%; all others rest at 70% opacity. A trailing tag (0.7em, medium) renders the role or qualifier label. Marks stay selectable text — never buttons.

### Tables

Dense hairline tables are the default data surface: 40px header rows in medium weight, 8px cell padding, 1px row hairlines, hover and selection tinted mist, numeric and ID columns in mono, sorting indicated by 16px chevron icons in headers.

## Do's and Don'ts

### Do:

- **Do** set counts, IDs, dates, and slugs in Geist Mono (The Mono-for-Data Rule).
- **Do** keep Signal Indigo scarce — focus, links, active states only (The One Indigo Rule).
- **Do** reserve `--accent-foreground` for filled `bg-accent` surfaces; pair `text-accent` with plain backgrounds (The Accent Pairing Rule).
- **Do** reach for a hairline border or a tone step before any shadow (The Flat Desk Rule).
- **Do** use tables for collections of records — 13px cells, 1px row borders.
- **Do** carry every new surface with both light (paper) and dark (graphite) values in the same change.
- **Do** use lucide stroke icons at 16-24px, weight 1.75, for all iconography.

### Don't:

- **Don't** use `--accent-foreground` for text on paper — it is near-white in light mode and disappears.
- **Don't** light a top-nav item inside a corpus or document; the section chrome owns the context.
- **Don't** add card grids, marketing chrome, hero sections, or imagery — the first viewport is the corpora table.
- **Don't** decorate with the annotation hues; they mean data (The Ledger Rule).
- **Don't** lift resting surfaces with shadows; shadows belong to popovers and overlays only.
- **Don't** use emoji or glyph icons anywhere in the UI.
- **Don't** use solid destructive fill on buttons; the 10% tint is the button, the solid red is the text.
