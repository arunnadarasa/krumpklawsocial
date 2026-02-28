

## Fix Preview 502 Error

### Problem
The preview shows a 502 error because `better-sqlite3` is a native C++ addon that fails to compile in Lovable's cloud environment. When `npm install` fails on this package, the entire dev server cannot start.

### Solution
Move backend-only dependencies (`better-sqlite3`, `cors`, `express`, `socket.io`, `uuid`, `ethers`) from `dependencies` to `optionalDependencies`. This way, if they fail to install (as they will in Lovable's environment), the install process still succeeds and Vite can start normally.

### Changes

**`package.json`**
- Move these 6 packages from `dependencies` to a new `optionalDependencies` section:
  - `better-sqlite3`
  - `cors`
  - `express`
  - `socket.io`
  - `uuid`
  - `ethers`

This is safe because these packages are only used by the backend server (`src/server.js`) which runs on Fly.io, not in the Lovable preview. The Vite frontend never imports them directly.

