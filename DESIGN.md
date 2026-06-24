# Design System — Atmospheric Guardian

Creative north star: **Atmospheric Clarity**. Editorial dashboard feel — vital
environmental intelligence, not SaaS boilerplate. Asymmetry, high-contrast
type, tonal depth, glass + light.

## 1. Color

Tokens live in `src/styles.css` as `oklch()` values, mapped to Tailwind
utilities via `@theme inline`. Never hardcode hex in components.

| Token | Hex source | Use |
| --- | --- | --- |
| `--primary` | `#000d33` | Brand anchor, top-nav, primary CTAs |
| `--primary-container` | `#1a2a5c` | Gradient end-stop for primary CTAs |
| `--secondary` | `#0061a4` | Interactive accents, links, focus |
| `--secondary-container` | tonal `#0061a4`@12% | Ghost button bg, active nav |
| `--tertiary` | `#002106` | Deep eco accent |
| `--success` | `#28a745` | Healthy AQI, positive status |
| `--danger` / `--destructive` | `#ba1a1a` | Hazardous AQI, errors |
| `--background` / `--surface` | `#f8f9fa` | Canvas |
| `--surface-container-lowest` | `#ffffff` | Primary data cards |
| `--surface-container-low → highest` | `#f1f3f5 → #e0e2e4` | Tonal layering |
| `--on-surface` | `#191c1d` | Body text (never pure black) |
| `--on-surface-variant` | `#44474a` | Secondary text, labels |
| `--border` | `on-surface-variant @15%` | Ghost border only |

### Rules
- **No-Line Rule**: 1px solid borders are prohibited for sectioning. Separate
  regions with a surface-tier shift instead.
- **Surface hierarchy**: canvas (`bg-background`) → grouping
  (`bg-surface-container-low`) → data card (`bg-surface-container-lowest`).
- **Glass & Gradient**: floating elements (modals, tooltips, nav) use the
  `glass` utility (`backdrop-filter: blur(14px)` over translucent surface).
- Never use `#000000`. Use `--on-surface`.

## 2. Typography

- **Display / headings**: Plus Jakarta Sans (`font-display`). Generous leading,
  `-0.01em` tracking, weight 600–700.
- **Body / labels**: Inter (`font-sans`). High x-height, dense-data legible.
- **Hero metric**: `display-lg` utility — 3.5rem, weight 700, `-0.02em`.
- **Category headers**: `label-sm` utility — 0.6875rem, uppercase,
  `0.08em` tracking, `on-surface-variant` color.

Fonts are loaded via `<link>` in `src/routes/__root.tsx` (never `@import` a URL
in CSS on Tailwind v4).

## 3. Elevation

Depth = **tonal layering** first, shadow second. Stack a
`surface-container-lowest` card on a `surface-container-low` section before
reaching for a shadow.

Ambient shadows are extra-diffused and tinted (not true black):
- `shadow-[var(--shadow-ambient-sm)]` — resting cards
- `shadow-[var(--shadow-ambient-md)]` — hover lift, modals
- `shadow-[var(--shadow-ambient-lg)]` — popovers, dropdowns

## 4. Components

- **Primary button**: linear-gradient `primary → primary-container`, radius
  `lg` (0.5rem), ambient-sm shadow at rest, ambient-md on hover with
  `translateY(-1px)`.
- **Secondary button**: `bg-secondary-container text-secondary`, ghost style.
- **Data card**: `bg-surface-container-lowest`, no border, ambient-md shadow,
  2rem vertical rhythm between sections (never divider lines).
- **Status pill**: `rounded-full`, `label-sm` typography, tonal bg + matching
  `glow-success` / `glow-error` for active state.
- **Input**: `bg-surface-container-highest`, transparent border, 2px
  `secondary` bottom-line on focus (no heavy border ring).
- **Table**: no row dividers — zebra-stripe with `surface` ↔
  `surface-container-low`. Hover row = `secondary-container`.

## 5. Do / Don't

**Do** asymmetric layouts, generous whitespace, `glass` on sticky nav.
**Don't** use `border`/`divide` between rows, pure black text, default drop
shadows, or 1px solid sectioning lines.