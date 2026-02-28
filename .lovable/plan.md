

## Fix Build Errors and Make Mobile Responsive

### 1. Fix ClaimPage.tsx Build Error

The `setInfo` calls on lines 27 and 32 pass objects missing the required `claimed` property. Fix by adding `claimed: false` to both error state objects.

### 2. Mobile Responsive Improvements

The site already has some responsive CSS but needs several fixes for proper mobile display:

**Header (the biggest issue on mobile):**
- The header tries to show logo + search bar + full nav links all in one row -- this overflows on mobile
- Hide the search bar on small screens or move it below the header
- Collapse nav links into a hamburger menu on mobile, or show only essential items (Login button)
- Reduce logo text size on mobile

**CSS changes in `src/index.css`:**
- Add mobile media queries for the header: stack logo and nav vertically, hide search on small screens
- Make the nav wrap or collapse on screens under 768px
- Hide non-essential nav links on mobile (KrumpCities, IKS League, Rankings) and show only Feed + Login
- Reduce header padding on mobile
- Make modals full-width on mobile with smaller padding
- Ensure the stats bar wraps properly (already has `flex-wrap`)
- Make onboarding hero text smaller on mobile
- Ensure code blocks don't overflow horizontally

**Inline style fixes in `src/pages/Index.tsx`:**
- Make the search bar container hide on mobile via a CSS class instead of inline styles
- Ensure the post vote block layout works on narrow screens

### Technical Details

**Files to modify:**
1. `src/pages/ClaimPage.tsx` -- Add `claimed: false` to error state objects (lines 27, 32)
2. `src/index.css` -- Add mobile media queries for header, nav, search, modals, onboarding hero, and post layout
3. `src/pages/Index.tsx` -- Add CSS class to search container, add mobile hamburger menu toggle state and minimal mobile nav

**Key mobile breakpoints:**
- Under 768px: Collapse nav, hide search, stack header elements
- Under 480px: Further reduce font sizes and padding

