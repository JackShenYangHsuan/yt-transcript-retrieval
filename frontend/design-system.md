# Design System

Color palette and design tokens inspired by Figma's design system, adapted for this application.

---

## Learnings

### What Makes Figma's Design Work
1. **Vibrant brand colors on neutral canvas** - The 5 logo colors pop against clean white/gray backgrounds
2. **Elevation through surface color, not shadows** - Dark mode uses lighter grays for "lifted" elements
3. **Inter font optimized for screens** - Tall x-height, clear at small sizes
4. **60-30-10 rule** - 60% neutrals, 30% primary, 10% accent
5. **Consistent 4px grid** - All spacing divisible by 4

### Applied to This App
- Primary actions use **Figma Orange** (`#F24E1E`) for energy and visibility
- YouTube links stay **Red** (`#EF4444`) to match YouTube's brand
- Tags use **Purple** (strategic) and **Blue** (tactical) from Figma palette
- Success states use **Figma Green** (`#0ACF83`)
- Neutrals follow Tailwind gray scale for developer familiarity

---

## Color Tokens

### Brand Colors (from Figma)
```css
:root {
  /* Primary Actions */
  --color-primary: #F24E1E;        /* Figma Orange - CTAs, buttons */
  --color-primary-hover: #D94318;  /* Darker orange for hover */

  /* Accent Colors */
  --color-accent-purple: #A259FF;  /* Strategic, creative */
  --color-accent-blue: #1ABCFE;    /* Links, info, tactical */
  --color-accent-green: #0ACF83;   /* Success, positive */
  --color-accent-coral: #FF7262;   /* Secondary highlights */

  /* YouTube (external brand) */
  --color-youtube: #EF4444;        /* YouTube red for video links */
}
```

### Neutral Scale
```css
:root {
  /* Backgrounds */
  --color-bg-primary: #FFFFFF;     /* Page background */
  --color-bg-secondary: #F9FAFB;   /* gray-50: Subtle sections */
  --color-bg-tertiary: #F3F4F6;    /* gray-100: Cards, hover */

  /* Borders */
  --color-border-light: #F3F4F6;   /* gray-100: Subtle dividers */
  --color-border-default: #E5E7EB; /* gray-200: Default borders */
  --color-border-strong: #D1D5DB;  /* gray-300: Emphasized borders */

  /* Text */
  --color-text-primary: #111827;   /* gray-900: Headlines */
  --color-text-secondary: #374151; /* gray-700: Body text */
  --color-text-tertiary: #6B7280;  /* gray-500: Secondary text */
  --color-text-muted: #9CA3AF;     /* gray-400: Placeholders, hints */
  --color-text-disabled: #D1D5DB;  /* gray-300: Disabled states */
}
```

### Semantic Colors
```css
:root {
  /* Feedback */
  --color-success: #0ACF83;        /* Figma green */
  --color-success-bg: #ECFDF5;     /* Light green background */
  --color-warning: #F59E0B;        /* Amber */
  --color-warning-bg: #FFFBEB;     /* Light amber background */
  --color-error: #EF4444;          /* Red */
  --color-error-bg: #FEF2F2;       /* Light red background */
  --color-info: #1ABCFE;           /* Figma blue */
  --color-info-bg: #EFF6FF;        /* Light blue background */
}
```

---

## Tailwind Class Mapping

### Usage Guide

| Purpose | Tailwind Classes | Hex |
|---------|------------------|-----|
| **Page background** | `bg-white` | #FFFFFF |
| **Card background** | `bg-gray-50` | #F9FAFB |
| **Hover background** | `bg-gray-100` | #F3F4F6 |
| **Default border** | `border-gray-200` | #E5E7EB |
| **Subtle border** | `border-gray-100` | #F3F4F6 |
| **Primary text** | `text-gray-900` | #111827 |
| **Body text** | `text-gray-700` | #374151 |
| **Secondary text** | `text-gray-500` | #6B7280 |
| **Muted text** | `text-gray-400` | #9CA3AF |
| **Primary button** | `bg-gray-900` | #111827 |
| **Primary button hover** | `bg-gray-800` | #1F2937 |

### Accent Usage

| Purpose | Tailwind Classes | Notes |
|---------|------------------|-------|
| **Strategic tag** | `bg-purple-100 text-purple-700` | Ideas tagged as strategic |
| **Tactical tag** | `bg-blue-100 text-blue-700` | Ideas tagged as tactical |
| **YouTube link** | `text-red-500` | Video play icons |
| **Success state** | `bg-green-100 text-green-700` | Confirmations |
| **Active filter** | `bg-blue-100 text-blue-700` | Selected filters |

---

## Component Patterns

### Primary Button
```html
<button class="bg-gray-900 text-white px-4 py-2 rounded-lg
               font-medium text-sm hover:bg-gray-800
               disabled:bg-gray-300 disabled:cursor-not-allowed
               transition-colors">
  Search
</button>
```

### Secondary Button / Chip
```html
<button class="px-3 py-1.5 text-sm text-gray-600 bg-gray-50
               rounded-full hover:bg-gray-100 transition-colors">
  Example query
</button>
```

### Input Field
```html
<input class="w-full px-4 py-3 text-base border border-gray-200
              rounded-lg focus:outline-none focus:ring-2
              focus:ring-gray-900 focus:border-transparent
              placeholder:text-gray-400" />
```

### Card
```html
<div class="border border-gray-100 rounded-lg p-5
            hover:border-gray-200 transition-colors">
  <!-- content -->
</div>
```

### Tag / Badge
```html
<!-- Strategic -->
<span class="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
  strategic
</span>

<!-- Tactical -->
<span class="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
  tactical
</span>

<!-- Neutral -->
<span class="text-xs px-1.5 py-0.5 rounded bg-gray-50 text-gray-500">
  topic
</span>
```

### YouTube Link
```html
<a class="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium
          text-gray-600 bg-gray-50 rounded-md hover:bg-gray-100">
  <svg class="text-red-500"><!-- play icon --></svg>
  00:00
</a>
```

---

## Typography

### Font Stack
```css
font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI',
             Roboto, Helvetica, Arial, sans-serif;
```

### Scale Used in App

| Element | Classes | Size |
|---------|---------|------|
| Page title | `text-lg font-semibold` | 18px, 600 |
| Card title | `text-sm font-medium` | 14px, 500 |
| Body text | `text-sm` | 14px, 400 |
| Secondary | `text-xs` | 12px, 400 |
| Metadata | `text-xs text-gray-400` | 12px, 400 |

---

## Spacing

Based on Tailwind's default scale (4px increments):

| Token | Class | Pixels | Usage |
|-------|-------|--------|-------|
| xs | `gap-1`, `p-1` | 4px | Tight gaps |
| sm | `gap-2`, `p-2` | 8px | Related elements |
| md | `gap-3`, `p-3` | 12px | Default spacing |
| lg | `gap-4`, `p-4` | 16px | Section padding |
| xl | `gap-6`, `p-6` | 24px | Container padding |
| 2xl | `py-12` | 48px | Page sections |

---

## Border Radius

| Class | Pixels | Usage |
|-------|--------|-------|
| `rounded` | 4px | Small tags |
| `rounded-md` | 6px | Buttons, inputs |
| `rounded-lg` | 8px | Cards |
| `rounded-xl` | 12px | Panels, modals |
| `rounded-full` | 9999px | Pills, avatars |

---

## Shadows

| Class | Usage |
|-------|-------|
| `shadow-sm` | Subtle lift |
| `shadow-md` | Cards (on hover) |
| `shadow-lg` | Dropdowns |
| `shadow-xl` | Modals |
| `shadow-2xl` | Popovers, detail panels |

---

## Color Reference (Quick Copy)

### Figma Brand
| Name | Hex | Preview |
|------|-----|---------|
| Orange | `#F24E1E` | ![](https://via.placeholder.com/20/F24E1E/F24E1E) |
| Coral | `#FF7262` | ![](https://via.placeholder.com/20/FF7262/FF7262) |
| Purple | `#A259FF` | ![](https://via.placeholder.com/20/A259FF/A259FF) |
| Blue | `#1ABCFE` | ![](https://via.placeholder.com/20/1ABCFE/1ABCFE) |
| Green | `#0ACF83` | ![](https://via.placeholder.com/20/0ACF83/0ACF83) |

### Neutrals (Tailwind Gray)
| Name | Hex | Class |
|------|-----|-------|
| White | `#FFFFFF` | `white` |
| Gray 50 | `#F9FAFB` | `gray-50` |
| Gray 100 | `#F3F4F6` | `gray-100` |
| Gray 200 | `#E5E7EB` | `gray-200` |
| Gray 300 | `#D1D5DB` | `gray-300` |
| Gray 400 | `#9CA3AF` | `gray-400` |
| Gray 500 | `#6B7280` | `gray-500` |
| Gray 600 | `#4B5563` | `gray-600` |
| Gray 700 | `#374151` | `gray-700` |
| Gray 800 | `#1F2937` | `gray-800` |
| Gray 900 | `#111827` | `gray-900` |

---

## Sources

- [Figma Brand Colors (Mobbin)](https://mobbin.com/colors/brand/figma)
- [Figma Color Palette (Color-Hex)](https://www.color-hex.com/color-palette/1028131)
- [Tailwind CSS Colors](https://tailwindcss.com/docs/colors)
- [Inter Typeface](https://rsms.me/inter/)
