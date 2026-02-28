

## Fix Persistent 502 Preview Error

### Problem
The preview still shows a 502 error despite moving backend dependencies to `optionalDependencies`. The Lovable cloud environment likely still attempts to compile native C++ addons like `better-sqlite3` even when they're optional, causing the entire install/dev-server process to fail.

### Solution
Completely remove the backend-only packages from `package.json`. These are only needed when deploying to Fly.io (which has its own `npm install`), not for the Vite frontend preview.

Also remove `nodemon` and `@flydotio/dockerfile` from `devDependencies` as they may also contribute to install failures and are not needed for the frontend.

### Changes

**`package.json`**
1. Remove the entire `optionalDependencies` block (better-sqlite3, cors, ethers, express, socket.io, uuid)
2. Remove `nodemon` and `@flydotio/dockerfile` from `devDependencies`
3. Remove the `"main": "src/server.js"` field (not relevant for Vite)
4. Remove backend-only scripts (`dev:server`, `setup`, `import-battles`, `reset`) that reference Node server files

This is safe because:
- The backend runs on Fly.io with its own Dockerfile and `npm install`
- The Vite frontend never imports these packages
- The Fly.io deployment can install these packages via the Dockerfile directly

