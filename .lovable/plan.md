

## Make Desktop Responsive

### Problem
The Battle, League, and Communities pages use the `.container` CSS class which forces a `grid-template-columns: 300px 1fr` layout meant for the feed page with its sidebar. Since these pages have no sidebar, the content gets pushed into a narrow column. They also have restrictive inline `maxWidth` values (800-1000px) that waste screen space on desktop.

### Changes

**1. Add a single-column container class in `src/index.css`**

A new `.container-single` class that provides a wide, centered layout without the 2-column grid:
- No grid, just `max-width: 1200px` with auto margins and `2rem` padding
- A mobile override at 768px reducing padding to `1rem`

**2. Update `src/pages/BattlePage.tsx`**
- Change `className="container"` to `className="container-single"` on all `<main>` elements
- Remove the inline `maxWidth: 800` constraint so content fills the wider container

**3. Update `src/pages/LeaguePage.tsx`**
- Change `className="container"` to `className="container-single"`
- Remove the inline `maxWidth: 900` constraint

**4. Update `src/pages/Communities.tsx`**
- Change `className="container"` to `className="container-single"`
- Remove the inline `maxWidth: 1000` constraint

**5. Add hamburger menu to all three pages**

Each page has its own hardcoded header that doesn't collapse on mobile. Add the same hamburger pattern from Index.tsx:
- Import `useState`, add `mobileNavOpen` toggle state
- Add hamburger button (hidden on desktop, shown on mobile)
- Add `mobile-open` class toggle on the `nav` element
- Mark non-essential nav links with `hide-mobile` class

### Files Modified
1. `src/index.css` -- Add `.container-single` class with mobile override
2. `src/pages/BattlePage.tsx` -- Use `.container-single`, remove maxWidth, add hamburger nav
3. `src/pages/LeaguePage.tsx` -- Use `.container-single`, remove maxWidth, add hamburger nav
4. `src/pages/Communities.tsx` -- Use `.container-single`, remove maxWidth, add hamburger nav

