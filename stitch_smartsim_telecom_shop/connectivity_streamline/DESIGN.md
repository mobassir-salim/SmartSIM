---
name: Connectivity Streamline
colors:
  surface: '#fbf8ff'
  surface-dim: '#d9d9e7'
  surface-bright: '#fbf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f2ff'
  surface-container: '#ededfb'
  surface-container-high: '#e7e7f5'
  surface-container-highest: '#e1e1ef'
  on-surface: '#191b25'
  on-surface-variant: '#434656'
  inverse-surface: '#2e303a'
  inverse-on-surface: '#f0effe'
  outline: '#737688'
  outline-variant: '#c3c5d9'
  surface-tint: '#004ced'
  primary: '#003ec7'
  on-primary: '#ffffff'
  primary-container: '#0052ff'
  on-primary-container: '#dfe3ff'
  inverse-primary: '#b7c4ff'
  secondary: '#006688'
  on-secondary: '#ffffff'
  secondary-container: '#00c1fd'
  on-secondary-container: '#004b65'
  tertiary: '#952200'
  on-tertiary: '#ffffff'
  tertiary-container: '#bf3003'
  on-tertiary-container: '#ffddd5'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dde1ff'
  primary-fixed-dim: '#b7c4ff'
  on-primary-fixed: '#001452'
  on-primary-fixed-variant: '#0038b6'
  secondary-fixed: '#c2e8ff'
  secondary-fixed-dim: '#75d1ff'
  on-secondary-fixed: '#001e2b'
  on-secondary-fixed-variant: '#004d67'
  tertiary-fixed: '#ffdbd2'
  tertiary-fixed-dim: '#ffb4a1'
  on-tertiary-fixed: '#3c0800'
  on-tertiary-fixed-variant: '#891e00'
  background: '#fbf8ff'
  on-background: '#191b25'
  surface-variant: '#e1e1ef'
  success-green: '#10B981'
  warning-amber: '#F59E0B'
  error-red: '#EF4444'
  surface-gray: '#F8FAFC'
  border-subtle: '#E2E8F0'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-sm:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  container-max: 1280px
  gutter: 24px
  margin-mobile: 16px
  stack-sm: 8px
  stack-md: 16px
  stack-lg: 32px
---

## Brand & Style

The design system is anchored in the **Corporate / Modern** aesthetic, specifically tailored for a high-trust telecom e-commerce environment. The brand personality is efficient, transparent, and technologically advanced. It aims to evoke a sense of reliability and ease, stripping away the traditional complexity of telecom services in favor of a streamlined "shop" experience.

The visual direction prioritizes clarity through a rigorous "clean" approach:
- **Generous Whitespace:** Utilizing air to separate complex data points like data limits and SIM types.
- **Utility-First:** Every element serves a functional purpose, reducing cognitive load during the purchasing funnel.
- **Modern Professionalism:** A balance of soft geometric shapes and a vibrant technical palette to feel contemporary yet established.

## Colors

The palette is led by **Vibrant Blue**, a color chosen to represent both technical precision and institutional trust. This is supported by a secondary bright cyan to provide energy and visual interest in interactive states.

- **Primary Blue:** Used for main actions (CTAs), active navigation states, and brand-critical iconography.
- **Neutral Scale:** A range of cool grays (from Slate-50 to Slate-900) manages the hierarchy of information. Backgrounds should primarily stay at `#FFFFFF`, with `#F8FAFC` used for section differentiation or card backgrounds.
- **Functional Colors:** Standardized success, warning, and error colors are used for system feedback, such as wallet transaction statuses or stock availability.

## Typography

This design system utilizes **Inter** for all roles to ensure maximum legibility and a systematic, clean appearance. The typographic scale is designed for high-density information environments (like plan comparisons) while maintaining a premium e-commerce feel.

- **Weight Usage:** Use Semibold (600) for headers to provide strong anchoring. Use Medium (500) for interactive labels and buttons.
- **Tracking:** Apply slight negative letter-spacing on larger headlines to maintain a tight, professional look.
- **Readability:** Body text uses a generous 1.5x line-height to ensure that long descriptions of plan features or terms of service remain accessible.

## Layout & Spacing

The design system employs a **Fluid Grid** model with a maximum container width of 1280px for desktop screens.

- **Grid Logic:** A 12-column system is used for desktop and tablet, collapsing to a single column on mobile.
- **Rhythm:** An 8px base unit drives all spacing decisions. Consistent padding (stack-md) should be applied within cards, while larger gaps (stack-lg) should separate distinct content sections.
- **Responsive Behavior:** On mobile, margins reduce to 16px to maximize screen real estate for product listings. Elements like the "Add to Cart" bar should pin to the bottom of the viewport on mobile devices.

## Elevation & Depth

To maintain the "clean and modern" requirement, this design system avoids heavy shadows, instead using **Tonal Layers** and **Low-Contrast Outlines**.

- **Level 0 (Base):** The primary canvas background (#FFFFFF).
- **Level 1 (Cards/Sections):** Subtle borders (1px solid #E2E8F0) are preferred over shadows for defining SIM card or Plan units.
- **Level 2 (Interactive):** When an element is hovered (like a product card), apply a very soft, diffused ambient shadow: `0 4px 12px rgba(0, 0, 0, 0.05)`.
- **Level 3 (Overlays):** Modals and dropdowns use a slightly more pronounced shadow and a 4px backdrop blur on the background layer to maintain focus.

## Shapes

The shape language is **Rounded**, using a 0.5rem (8px) base radius. This strikes a balance between the precision of a technology brand and the approachability of a consumer service.

- **Standard Elements:** Buttons, input fields, and small cards use the base 8px radius.
- **Large Elements:** Featured containers or marketing banners (rounded-lg/xl) use 16px to 24px radii to create a friendlier, softer appearance.
- **Interactive States:** Focus rings should follow the shape of the parent element with a 2px offset.

## Components

- **Buttons:** Primary buttons use a solid Blue fill with white text. Secondary buttons use a transparent background with a blue border. All buttons have a minimum height of 48px for touch-accessibility in the shop.
- **Chips:** Used for SIM categories (e.g., "eSIM", "Prepaid"). These use a light tinted background (Primary Blue at 10% opacity) and bold label-sm text.
- **Input Fields:** Use a light gray background (#F8FAFC) with a 1px border. On focus, the border transitions to Primary Blue with a subtle glow.
- **Cards (The "Shop" Unit):** Product cards are the core component. They feature a white background, 1px border, and a dedicated section for "Price" using Headline-MD.
- **Progress Indicators:** For the purchase flow (Cart -> Wallet -> Complete), use a horizontal stepper with Primary Blue for completed steps and Slate-300 for upcoming ones.
- **Status Badges:** Compact, rounded badges for wallet transaction history (e.g., "Success", "Pending") using the functional color palette.