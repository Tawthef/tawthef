# Tawthef UI Context

## Visual Direction

Tawthef uses a professional, trustworthy, modern recruitment-SaaS visual language.

The interface should feel:

- Clear
- Credible
- Efficient
- Human-centered
- Professional
- Suitable for candidates, recruiters, and administrators
- Consistent across desktop and mobile

Avoid:

- Overly playful visuals
- Excessive gradients
- Dense dashboards without hierarchy
- Unrelated redesigns between roles
- AI-generated-looking placeholder artwork
- Decorative animation that harms usability
- Hardcoded one-off styles when tokens or shared components exist

## Brand Direction

The established Tawthef identity uses:

- Deep recruitment-platform blue
- White
- Light blue surfaces
- Neutral gray content surfaces
- Green for verified/success states
- Amber for pending/partial states
- Red for destructive, rejected, or failed states
- Purple may be used selectively for candidate-verification workflows where already approved

Before changing tokens, inspect the existing Tailwind configuration, CSS variables, logo assets, and shared components. Existing production brand tokens are authoritative.

## Color Tokens

Use existing project variables where present. Do not replace working tokens merely to match this document.

Recommended semantic roles:

| Role | Preferred token |
|---|---|
| Page background | `--background` |
| Main text | `--foreground` |
| Card surface | `--card` |
| Card text | `--card-foreground` |
| Primary brand | `--primary` |
| Primary text contrast | `--primary-foreground` |
| Secondary surface | `--secondary` |
| Muted surface | `--muted` |
| Muted text | `--muted-foreground` |
| Border | `--border` |
| Input border | `--input` |
| Focus ring | `--ring` |
| Destructive | `--destructive` |
| Success | project semantic success token |
| Warning | project semantic warning token |

Rules:

- Prefer semantic classes and CSS variables.
- Do not scatter new hardcoded hex values across components.
- If a new semantic state is needed, add a token centrally and document it.
- Maintain sufficient contrast.

## Typography

Use the project’s existing font configuration.

Hierarchy:

- Page title: clear and compact
- Section heading: strong but subordinate to page title
- Card title: concise
- Body: readable at common desktop and mobile sizes
- Supporting metadata: muted, never too faint
- KPI values: visually dominant without oversized layout shifts

Do not introduce a second UI font without approval.

## Component System

- TailwindCSS
- shadcn/ui
- Existing Tawthef reusable components
- Lucide React or the existing icon library

Rules:

- Reuse before creating.
- Compose primitives rather than duplicating complete components.
- Do not directly rewrite generated `components/ui/*` primitives unless the task requires a shared correction.
- Use consistent button variants, form controls, dialogs, badges, tabs, cards, dropdowns, tables, and feedback states.
- Keep icon style and stroke weight consistent.

## Border Radius

Follow the existing project radius scale.

General guidance:

- Inputs and compact controls: existing small/default radius
- Cards: existing card radius
- Dialogs and major overlays: existing large radius
- Share-banner outline: custom curvature is allowed only within the banner composition

Do not introduce inconsistent radii page by page.

## Spacing

- Use the existing spacing scale.
- Keep card padding consistent across dashboards.
- Align card headers and content.
- Avoid cramped mobile layouts.
- Avoid excessive empty space in operational tables and dashboards.
- Use grid layouts to reduce unnecessary vertical scrolling where appropriate.

## Dashboard Patterns

Shared dashboard expectations:

- Role-appropriate page header
- Consistent KPI card system
- Clear loading state
- Error feedback with recovery action where appropriate
- Honest empty state
- Activity or timeline components where applicable
- Responsive grid
- No horizontal overflow
- Consistent chart containers
- Quick actions using shared patterns

Admin, recruiter, and candidate dashboards should feel like the same product.

## Forms

- Labels remain visible.
- Required fields are clear.
- Validation errors appear near the field.
- Submit buttons show progress and prevent duplicate submission.
- Successful actions provide feedback.
- Destructive actions require confirmation.
- Large forms should use meaningful sections.
- Do not clear user-entered data after recoverable errors.

## Tables and Lists

- Provide search/filter controls only when meaningful.
- Use pagination or virtualization for large result sets.
- Preserve readable mobile alternatives.
- Avoid forcing large desktop tables into narrow screens.
- Show status using consistent semantic badges.
- Empty results explain whether no data exists or filters returned no matches.

## Realtime Feedback

Realtime updates should feel stable:

- Avoid full-page flicker.
- Preserve user scroll and selection where possible.
- Do not reset open modals or forms unnecessarily.
- Use query invalidation or targeted cache updates.
- Notifications and unread counts should update without duplicate events.

## Mobile Rules

- Test common phone widths.
- Avoid horizontal page scrolling.
- Use two-column KPI grids when space permits.
- Stack when readability requires it.
- Use compact headers and filters.
- Maintain touch targets.
- Convert drag-only actions into accessible tap/menu alternatives.
- Keep modal content within the viewport.
- Maintain image and screenshot aspect ratios.

## Onboarding Share Banner

Route:

- `/welcome/share`

Composition:

- 1200 × 1200 export
- Blue gradient
- Tawthef white logo
- Thin white curved inner outline
- Candidate name
- Candidate role
- Profile image
- Bottom CTA
- Professional SaaS appearance

Behavior:

- Preview and export must use the same design source.
- Mobile preview may scale but must not recompose differently.
- Export must remain exactly 1200 × 1200.
- Avatar positioning must remain stable for uploaded image and fallback.
- Preserve download, caption copy, LinkedIn sharing, first-login redirect, and `share_banner_shown`.
- The preview must not crop content that appears in the export.
- Decorative elements must stay within safe margins.

## Landing Page Product Showcase

- Use real Tawthef screenshots only.
- Do not show placeholder skeletons as finished product visuals.
- Use clean browser/application frames.
- Keep screenshots legible.
- Candidate, recruiter, admin, pipeline, and AI-ranking screens may be included when genuinely implemented.
- Carousel behavior must be accessible and responsive.
- Autoplay, when used, must pause on interaction and respect reduced motion.
- Do not advertise unfinished modules as completed.

## Status Semantics

Use consistent meaning:

- Verified / success: green
- Pending / partial / attention: amber
- Rejected / destructive / failed: red
- Informational / active: brand blue
- Neutral / inactive: gray
- Candidate-verification workflow accent: purple only where consistent with approved design

Do not rely on color alone; include labels and icons where useful.

## Accessibility

- Keyboard-accessible controls
- Visible focus states
- Semantic buttons and links
- Dialog focus management
- Accessible labels
- Sufficient contrast
- Alternative text for meaningful images
- Reduced-motion support
- No critical information conveyed only through color
