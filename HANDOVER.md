# Nuro Photo Studio — Handover

**Current milestone:** Phase 2 — Task 1 image import implemented; Phase 1 Task 7 runtime checks remain open
**Specification baseline:** NPS-TS-001 v1.0 (draft engineering baseline)  
**App version:** 0.1.0 (see Version history below)
**State:** Local image loading and preview are implemented; no editing operations or AI behavior yet

## What is here

- Independent Vite + vanilla ES module application shell under `www/`.
- Responsive dashboard, feature screen layouts and navigation shell.
- PWA manifest, app icons, and conservative service worker foundation.
- Electron main/preload with context isolation, sandbox, restrictive navigation, and narrow metadata bridge.
- Electron Builder Windows NSIS configuration.
- Architecture, privacy/security, initialization, release, model-policy and Phase 0 checklist docs.
- Shared vanilla DOM components and their API guide in `www/js/ui/components.js` and `docs/UI-COMPONENTS.md`.
- Dedicated local image loader in `www/js/editor/image-loader.js`, retaining original `File` data and using a releasable object URL for preview.
- Validation/build helper scripts and npm lockfile.

## Deliberate boundaries

- No relationship, source dependency, clone, or changes to `NuroTraders/bg-remover`.
- No AI runtime, model weights, inference, model download, or CDN runtime.
- No image upload or cloud service. Imported photos remain local.
- Project persistence and recent-project records are not implemented or fabricated. The selected appearance theme is saved locally as a UI preference.
- Signing, updates, analytics, persistence, ID compliance presets and production image algorithms are deferred.

## Collaboration rules

1. Include GitHub commit and push commands in each final implementation report. Do not commit or push unless the user explicitly asks.
2. Record every application version in the Version history section below. Whenever `package.json` version changes, add a matching dated note to `HANDOVER.md` with the version and user-visible changes; do not silently bump the version.
3. Keep this handover current after each task so another model or contributor can resume without relying on chat history. Include current milestone, completed work, constraints, validation results and next action.

## Version history

- **0.1.0 (current; checked 2026-11-03)** — Phase 0 starter version, retained through Phase 2 Task 1. Task 1 adds local JPG/JPEG, PNG and WebP import/preview without changing package version. No public GitHub Release/tag is recorded here.

## Phase 1 task plan

Completed:

1. **Design system:** centralized dark-first CSS tokens and shared UI styles, with a coordinated light theme available via `data-theme="light"` on the root element. Existing Phase 0 shell retained and restyled; no new dependencies or AI/image-processing behavior added.
2. **Application layout:** responsive branded sidebar, grouped navigation for all seven planned areas, active screen state, header actions, theme switch, and a keyboard-accessible mobile navigation drawer. Navigation data is maintained separately from rendering logic in `www/js/navigation.js`.
3. **Home dashboard:** reusable dashboard renderer with a welcome panel, editor action, four quick actions, empty recent-project state, feature shortcuts, and privacy tip. Upcoming actions are labeled and non-interactive; no import behavior or project data is added.
4. **Navigation and UI components:** added accessible vanilla DOM factories for buttons, icon buttons, cards, badges, native dialogs, keyboard dropdowns, timed toasts, form inputs, empty states, and loading indicators. Dashboard controls reuse the shared factories. API usage is documented in `docs/UI-COMPONENTS.md`.
5. **Feature screen layouts:** added responsive Photo Editor, Enhance & Restore, ID Photo Studio, Batch Processing, Model Manager and Settings layouts. Controls are clearly visual placeholders where behavior is not implemented; no import, image processing, AI, model installation or fake queue data is presented.
6. **Responsive design and theme switching:** added early theme restoration from local storage before stylesheet paint, persistent toggle updates, touch target sizing, and narrow-screen safeguards for panels, dialogs and menus. Reduced-motion styles remain enabled.
7. **Testing and stabilization:** build and structural validation pass; fixed two production asset path defects (theme initializer omitted from build and manifest/icon precache paths hashed by Vite). Static assets now live under `www/public/`. Runtime responsive, dialog, browser console, offline-cache and packaged Electron checks are still outstanding; do not declare Phase 1 complete until those checks are run.

Phase 2 Task 1 is implemented. Next: build the editor canvas viewport (fit, zoom and pan) around the imported image, keeping transforms non-destructive. Separately close the carried Phase 1 Task 7 runtime checks: narrow viewport behavior, browser console, live service-worker/offline behavior, and packaged Electron validation.

1. Define an image document that retains the original source and separates working state.
2. Add validated import for JPG/JPEG, PNG and WebP; report unsupported files and size limits.
3. Implement canvas viewport, fit/zoom/pan, rotation, crop and undo/redo through isolated engine modules.
4. Add before/after comparison and safe export to PNG/JPEG/WebP without overwriting source.
5. Add preview-resolution rendering and full-resolution export path; test large-image memory failures.
6. Add interaction and integration checks for browser and Electron.

Keep UI components thin. Image algorithms belong in `editor/` or `processing/`, not in DOM event handlers. Preserve local-only processing and do not begin model integration until its own phase has approved model/license/runtime details.

## Decisions and open items

- Vite provides dev/build only; no frontend framework.
- Electron loads the same `www/` application served locally in development and from packaged files in production.
- Browser image preview uses an object URL and releases the previous URL on replacement/page teardown.
- Model registry schema and download policy belong to a later phase; `www/models/manifest.json` is intentionally empty.
- Before ID presets are implemented, identify official source material per jurisdiction and track verification dates.

## Update log

- Phase 0: initial project skeleton authored from the referenced v1.0 specification and proposal context.
- PWA Pages follow-up: use the explicit project-site start URL and scope, publish the service worker with the Vite build, and keep precache entries aligned with production output.
- Phase 1 Task 1: established dark-default design tokens, reusable controls and shell component styles, visible keyboard focus, and a token-coordinated light theme. Checked with `npm run check` and `npm run build`.
- Phase 1 Task 4: added reusable UI component factories and API documentation; dashboard cards, buttons, badges and empty state now use shared components. `npm run check`, changed-module syntax checks, and `git diff --check` pass. Browser interaction/console review remains pending.
- Phase 1 Task 5: replaced generic navigation placeholders with responsive layouts for all six planned feature screens, using shared cards, badges, empty states and buttons. Confirmed with project and JavaScript syntax checks; manual browser/console review remains pending.
- Phase 1 Task 6: theme selection applies immediately and persists locally across reloads; pre-paint restoration is served from Vite's `www/public/` directory. Responsive touch/layout refinements are in place. Task 7 build review caught and fixed the original theme script being omitted from `dist`.
- Phase 1 Task 7 stabilization (2026-11-03): `npm ci` completed after network access was approved (npm reported upstream deprecation notices); `npm run check`, `npm run build`, changed-module/Electron syntax checks, manifest JSON parsing, workflow-equivalent PWA shell asset checks and `git diff --check` passed. Build emits Vite's informational warning that the synchronous pre-paint `theme-init.js` script is copied as a static file and is not bundled. Electron development app started and the six feature screens plus Home were visually opened; the saved light theme remained selected after reload. Electron security settings were inspected and retained. The service-worker/manifest/icon mismatch was reproduced by checking production build output and fixed by serving the manifest and icon at the stable paths expected by `sw.js`.
- Task 7 not yet accepted: IAB/Chrome could not reach the local server during the final browser attempt, so mobile/tablet viewport overflow, browser console, live service-worker registration/cache install/offline reload, and dialog Escape/focus restoration were not dynamically verified. Reduced-motion and visible focus rules were confirmed in CSS; accessible names/labels and screen structure were inspected in the app accessibility tree, but a full keyboard-only audit was not performed. Electron dev launch worked; packaged Electron launch and preload/IPC runtime behavior remain unverified. No failures were observed in the checks that ran; unverified items are not counted as passing.
- Phase 2 Task 1 (2026-11-03): added strict local JPG/JPEG, PNG and WebP validation, header-based dimension and EXIF orientation inspection, decode/error handling, a 100 MB/80 MP/20,000-pixel-side safety limit, preview loading in the existing Photo Editor, drag-and-drop, image properties, and close/release behavior. The original `File` is retained in the image document and is never rewritten. Added Node built-in tests (`npm test`) without new dependencies. A synthetic PNG was opened in Electron dev; the preview and 1 × 1 dimensions appeared, then Close image returned the workspace to empty. Test fixture was removed after the check. The referenced NPS-TS-001 v1.0 technical specification was not present in this checkout; implementation used the checked-in architecture/privacy guidance and user-supplied requirements. Unit tests mock the browser image decoder, so actual browser decoding of JPG/WebP and a native drag/drop gesture still need manual validation.
