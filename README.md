# Nuro Photo Studio

**Phase 2 early build · app version 0.1.0**

**Live preview:** [Nuro Photo Studio on GitHub Pages](https://nurotraders.github.io/nuro-photo-studio/)

Independent offline-first photo editor foundation for browser/PWA and Windows Electron. Phase 0 establishes the project, interfaces, security defaults, and delivery workflow. It does not implement editing algorithms, AI inference, model downloads, accounts, or cloud services.

## Requirements

- Node.js 20.19+ or 22.12+ and npm (Vite 7 requirement)
- Windows for the Electron Windows packaging target; browser development works on supported desktop platforms

## Setup and run

```sh
npm install
npm run dev
```

Open the local URL printed by Vite. The app includes a responsive dashboard, theme switch, navigation, and shared UI components. In Photo Editor, open a local JPG/JPEG, PNG or WebP image, or drop one into the workspace. Imports are limited to 100 MB, 80 megapixels and 20,000 pixels per side. The image remains on-device and its original file is held unchanged; project saving and editing operations are not yet available.

## PWA preview

```sh
npm run build
npm run preview
```

Serve the built site over localhost or HTTPS. Service workers do not register from `file://`. The Pages workflow copies the service worker into the Vite build output. It precaches the small app shell, caches same-origin static assets as they are requested, and uses a network-first navigation fallback. It does not cache user images or model files. After an online visit, reload once while online before trying the shell offline.

For GitHub Pages, the workflow in `.github/workflows/deploy-pages.yml` builds the app into `dist/` and deploys it when changes reach `main`. The web app is publicly reachable at the live preview URL.

## Electron

```sh
npm run electron:dev
npm run electron:pack
npm run electron:dist
```

`electron:dev` starts Vite and launches Electron after the dev server reports ready. `electron:pack` creates an unpacked package; `electron:dist` builds a Windows NSIS installer. Build Windows installers on Windows. The packaged app loads the same built `www/` shell.

## Project map

```text
www/                 Browser app, PWA assets, ES modules
www/js/core/         State, event bus, document/history and queue boundaries
www/js/ui/           Reusable accessible DOM components
www/js/editor/       Loader, canvas and viewport boundaries
www/js/processing/   Adjustments and export boundaries
www/js/features/     Enhancement, ID photo, print and upscaling feature slots
www/js/ai/           Future runtime/provider/model boundaries (stubs only)
www/js/workers/      Future worker entry points
electron/            Main, preload and electron-builder configuration
scripts/             Project checks and build helpers
docs/                Architecture, initialization plan, models, privacy, release
```

## Architecture and scope

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md), [docs/INITIALIZATION-PLAN.md](docs/INITIALIZATION-PLAN.md), and [HANDOVER.md](HANDOVER.md). The application uses plain HTML/CSS and native JavaScript modules; Vite is only the dev server and production bundler. Electron uses context isolation, sandboxing, no Node integration in the renderer, a restrictive Content Security Policy, and a narrow preload API. Browser and desktop share the same `www/` UI.

No code, package, asset, or configuration is imported from or coupled to `NuroTraders/bg-remover`. The prior conversation served as product context only. No AI runtime, model, download URL, or inference implementation is included.

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Vite development server |
| `npm run build` | Build web/PWA shell into `dist/` |
| `npm test` | Run built-in image loader validation and resource lifecycle checks |
| `npm run preview` | Preview production web build |
| `npm run electron:dev` | Run Vite + Electron locally |
| `npm run electron:pack` | Package unpacked desktop app |
| `npm run electron:dist` | Build Windows installer |
| `npm run check` | Syntax and required-file checks |

## Security and privacy notes

- Imported images remain local and are not sent to the network. The source `File` is retained unchanged in memory; closing the image releases its preview object URL. No project persistence exists yet.
- Do not load arbitrary remote content in Electron. Keep navigation restricted to the local app and deny unexpected window creation.
- Keep `contextIsolation`, `sandbox`, and `webSecurity` enabled; keep `nodeIntegration` disabled.
- Add new preload methods only for narrowly scoped, validated tasks. Never expose raw `ipcRenderer`, filesystem, shell, or generic IPC methods.
- CSP currently blocks remote scripts, objects, and framing. If a future local dependency requires additional origins, document and narrowly scope the change.
- A future model manager must require explicit user action, show license/source/size, verify SHA-256, and store models separately from the app shell. Do not precache large model binaries.
- Official ID-photo rules vary by issuing authority. Country presets must cite authoritative sources and a verification date; avoid claiming compliance until verified.

## Phase 0 acceptance

- [ ] Clean `npm install` succeeds and lockfile is committed.
- [ ] `npm run dev` opens the responsive application shell.
- [ ] `npm run build` produces a browser/PWA build.
- [ ] Service worker installs on localhost/HTTPS and the shell opens offline after first visit.
- [ ] Electron development launch works and packaged Windows build can be produced on Windows.
- [ ] Renderer has no Node integration; preload exposes only app version and platform metadata.
- [ ] Unsupported Electron navigation and window creation are denied.
- [ ] No image upload, model download, inference, or BG Remover dependency is present.
- [ ] Phase 0 task plan and handover are updated before Phase 1 starts.

See [docs/PHASE-0-CHECKLIST.md](docs/PHASE-0-CHECKLIST.md) for a reviewable checklist.

## Assumptions

1. The referenced v1.0 specification is the baseline: vanilla ES modules, Canvas 2D direction, offline-first web/PWA and Electron, modular engine boundaries, optional local AI later.
2. Vite is accepted as a lightweight build tool to serve native modules, produce a production bundle, and share assets with Electron.
3. Electron Builder with NSIS is the initial Windows packaging path; signing and auto-update are deferred.
4. Phase 0 provides architecture slots, not production image editing. Detailed functional requirements in the v1.0 specification are scheduled for later phases.
5. No source from BG Remover is copied. This archive is a standalone project initialization.

## License

MIT for the starter implementation; see [LICENSE](LICENSE). Future model weights and third-party assets require separate license review.
