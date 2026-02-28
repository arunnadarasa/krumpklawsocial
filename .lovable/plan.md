

## Make "StreetKode Fam" Clickable

Currently the text reads: `powered by StreetKode Fam — https://asura.lovable.app` where only the URL is a link. The fix is to wrap "StreetKode Fam" itself in an anchor tag pointing to the same URL, and optionally remove the raw URL text since it becomes redundant.

### Changes

**3 locations across 2 files:**

1. **`src/pages/Index.tsx`** (lines 712 and 798) -- Wrap "StreetKode Fam" in an `<a>` tag linking to `https://asura.lovable.app`, remove the separate raw URL link.
2. **`src/pages/SubmoltFeed.tsx`** (line 88) -- Same change.

The new text will read:
```
powered by <a href="https://asura.lovable.app">StreetKode Fam</a>
```

Styled with `color: inherit` and `textDecoration: underline` to match the existing link style.

