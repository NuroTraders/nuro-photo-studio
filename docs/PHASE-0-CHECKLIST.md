# Phase 0 acceptance checklist

## Setup and web

- [ ] Node.js 20.19+ or 22.12+ and npm available.
- [ ] `npm install` completes and `package-lock.json` is present.
- [ ] `npm run check` succeeds.
- [ ] `npm run dev` opens the responsive shell at the local Vite URL.
- [ ] JPG, PNG, and WebP can be selected for temporary local preview; invalid types are rejected.
- [ ] `npm run build` and `npm run preview` succeed.
- [ ] PWA manifest and icon assets load; service worker registers on localhost/HTTPS.
- [ ] After one successful load, airplane/offline mode opens the cached shell.

## Electron

- [ ] `npm run electron:dev` opens the app in Electron.
- [ ] `npm run electron:pack` creates an unpacked Windows app.
- [ ] `npm run electron:dist` creates an NSIS installer on Windows.
- [ ] Renderer Node access is disabled; context isolation and sandbox are enabled.
- [ ] Preload exposes only `getMetadata`; no generic file/IPC API is present.
- [ ] Unexpected navigation and renderer-created windows are denied.

## Scope and handover

- [ ] No AI runtime, model, inference, automatic model download, or external CDN dependency.
- [ ] No image upload, account, or cloud processing path.
- [ ] No BG Remover source/reference dependency or repository mutation.
- [ ] README, architecture, initialization, security, plan and handover docs match the implementation.
- [ ] Record operating system, Node/npm versions, command results and any unresolved issues in HANDOVER.md.
