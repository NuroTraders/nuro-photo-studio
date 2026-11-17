# Nuro Photo Studio — Project Memory for New Chats

**Updated:** 2026-11-17 (ID Photo Studio and print sheet step implemented)
**Repository:** `NuroTraders/nuro-photo-studio` — https://github.com/NuroTraders/nuro-photo-studio
**Current version:** `0.2.0`
**Purpose:** Portable project context, verified repository position, product boundaries, roadmap, and handoff instructions. Read this and the live `HANDOVER.md` before editing.

---

## 1. Current checkout and evidence

Verified in this workspace on 2026-11-17:

- Workspace: `C:\Users\User\Desktop\nuro-photo-studio-phase-0`.
- Branch: `main`.
- Base `HEAD`: `514a168` (`Add original and edited comparison`); full hash `514a168958cf39ab8343c845505c31793ab3b943`. The working tree contains uncommitted ID Photo Studio/print-sheet implementation and documentation changes; check `git status` before continuing.
- `origin/main` resolves to the same commit. The configured fetch and push remote is `https://github.com/NuroTraders/nuro-photo-studio.git`.
- `package.json` and the root package entry in `package-lock.json` both report `0.2.0`. Sidebar and About screen strings report `v0.2.0` / `0.2.0`.
- The branding, deterministic filters/export resizing, and Before/After comparison are committed and pushed through `514a168`. At the user's request, the unrelated `fold-project-complete.zip` and root `public/` folder were moved intact to `C:\Users\User\Desktop\Nuro Photo Studio Local Files\`; they are outside the repository. Current uncommitted changes implement ID Photo Studio/print sheets and update source/docs. Steps 2 and 3 were accepted; step 4 awaits review.
- The last recorded Task 7 checks (run at implementation time, not rerun during this documentation update): `npm test` passed 35/35, `npm run check` passed with 21 required files, `npm run build` passed, and `git diff --check` passed. Vite reports the existing informational notice that static `theme-init.js` cannot be bundled without `type="module"`; Git prints working-copy LF/CRLF notices.
- The coding agent did not launch a browser/Electron runtime for Task 7 because the task explicitly prohibited it. On 2026-11-17 the user confirmed manual verification of Crop, Undo/Redo, and Export was completed and all three were okay; treat Tasks 5–7 as user-accepted. Do not claim a coding-agent runtime test.

Evidence terms in this memory:

- **Verified now:** checked directly in this checkout during the date above.
- **Recorded in HANDOVER:** historical check result described by the repo handover, not rerun now.
- **User acceptance:** explicitly reported by the user in the task trail; this is distinct from implementation and automated checks.
- **Pending:** not demonstrated or accepted in the available record.

## 2. Project identity and product direction

Nuro Photo Studio is an independent local-first photo editor for browser/PWA and Windows Electron. Both use the same `www/` application. The current implementation uses vanilla HTML/CSS, native JavaScript ES modules, Vite for development/build, Canvas 2D, and no production dependencies.

The repo is separate from `NuroTraders/bg-remover`. Never copy from, modify, merge with, or push to that repository.

Product principles:

- Images stay on the user’s device. Do not add uploads, telemetry, accounts, analytics, CDN code, cloud processing, or hidden network calls.
- Preserve the imported `File` and source bytes unchanged. Store edits as metadata/state and create a new output on explicit export.
- Keep viewport zoom, pan, fit, and DPR-bounded preview separate from image edit state and full-resolution output.
- Keep UI handlers thin. Put editor geometry and export/render logic in editor or processing modules; keep session/history concerns in core.
- Use only the native platform unless a dependency has a clear need, license, maintenance, and bundle-impact review. No new dependency is needed for current tasks.
- Do not persist projects, source images, or recent-project metadata until an explicit storage and deletion design is approved.
- Keep Electron `nodeIntegration: false`, `contextIsolation: true`, `sandbox: true`, `webSecurity: true`, restrictive CSP, narrow preload API, and denied unexpected navigation/windows.

### Current brand implementation (2026-11-17)

The user supplied the NasirPintu brand kit and Fold toolkit screenshots as visual/reference material and requested adapting that branding model to Nuro Photo Studio. The implementation adds a persistent creator signature (sidebar on wide layouts, top bar on narrow layouts) that opens an accessible About/Credits dialog. It includes the owner-supplied creator portrait, social links, provided AI collaboration credits, actual MIT build/desktop toolchain credits, and the local-only/no-telemetry privacy statement. `docs/BRANDING.md` records maintenance guidance; `docs/LICENSES.md` reflects current dependencies/assets. UI implementation is vanilla JS/CSS using the shared native dialog. Do not import the React/Lucide sample or imply that credited AI services are used to process photos. The branding is committed in `f80088e` and pushed. User provided screenshots of both the dialog's opening and scrolled states and confirmed “implemented okay”; record branding as user-visually-reviewed and accepted. The coding agent did not launch the UI.

## 3. Implementation status

| Work | Current status | Evidence / caveats |
|---|---|---|
| Phase 0 foundation and Phase 1 UI shell | Implemented | Check `HANDOVER.md`; several old browser/PWA/Electron runtime checks remain open. |
| Phase 2 Task 1: image import/loading | Implemented | Local JPG/JPEG, PNG, WebP validation/decode, EXIF dimension handling, limits, replacement/close cleanup. Original file retained. Historical automated tests pass; some real-format/runtime manual checks may remain. |
| Task 2: canvas viewport | Accepted by user | Fit, actual size, zoom, pan, resize, DPR cap and lifecycle. Earlier integration issues are historical and reported corrected. |
| Task 3: viewport stabilization | Accepted by user with limits | Physical touch pinch and live DPR>1 rendering were not verified in the recorded test; do not present mocks as hardware evidence. |
| Task 4: rotate/flip | Accepted by user in the Task 5 brief | 90° rotate, flips and shortcuts; non-destructive transform metadata. |
| Task 5: crop | Implemented and accepted by user (2026-11-17) | User confirmed manual verification completed. Draw/resize/move, preview/apply/cancel/reset, aspect presets, W/H and orientation toggle/X. |
| Task 6: undo/redo | Implemented and accepted by user (2026-11-17) | User confirmed manual verification completed. Bounded 50-entry session memento history for rotate, flip, applied crop and crop reset; history resets on replace/close. |
| Task 7: export and version bump | Implemented and accepted by user (2026-11-17) | User confirmed manual verification completed. Full-resolution offscreen render to PNG/JPEG/WebP; quality control for lossy formats; version `0.2.0`. The coding agent ran only required command-line checks. |
| Export engine behavior | Implemented in `www/js/processing/export-engine.js` | Uses original decoded source and edit state, never viewport canvas; crop coordinates in source space; quarter-turn bounds; blob download and temporary URL cleanup. Large-image memory pressure remains a manual/real-device follow-up. |
| Color/tone adjustment starter (roadmap step 1) | Implemented and accepted by user (2026-11-17) | Brightness, contrast, saturation range -100..100 with 0 neutral. Live Canvas 2D preview, grouped reset, adjustment-aware undo/redo and matching full-resolution export filters. |
| Deterministic filters and resize (roadmap step 2) | Implemented and accepted (2026-11-17) | Original, Grayscale, Sepia, Vintage, Warm and Cool; custom output width/height, aspect lock, export dimension readout, 20,000-pixel-side and 80 MP caps. History and full-resolution export integration. Earlier command-line checks passed; tests and runtime validation were not run. |
| Before/After comparison (roadmap step 3) | Implemented and accepted (2026-11-17) | Workspace toggle shows untouched decoded source with all edit metadata bypassed; restores prior edited zoom/pan; controls are disabled while comparing. Not part of edit history or export. |
| ID Photo Studio and print sheets (roadmap step 4) | Implemented; awaiting user review | Separate local source; custom physical photo dimensions; approximate framing guides; A4/Letter/custom paper, orientation, margins/gap, copy layout, 300 DPI system print. No country-specific ID rules or identity-changing operations. No checks/runtime were run. ISO sheet-size source and verification date in `docs/ID-PHOTO.md`. |

The user has accepted Tasks 5–7; do not ask them to repeat that confirmation. For future tasks, distinguish implementation, automated checks, user manual verification and release status.

## 4. Architecture and important paths

- `www/js/app.js` — thin application wiring for navigation, import, transforms, crop, adjustments, history, export dialog and service worker.
- `www/js/core/` — `state.js`, `image-document.js`, `edit-history.js`, `event-bus.js`, `job-queue.js`, `settings.js`.
- `www/js/editor/` — `image-loader.js`, `viewport.js`, `transform-tool.js`, `crop-tool.js`, plus comparison/canvas boundaries.
- `www/js/processing/` — `adjustments.js` provides brightness/contrast/saturation metadata; `filters.js` provides deterministic preset filters; `resize.js` validates output dimensions; `export-engine.js` applies adjustments/filters and resizes the detached full-resolution canvas.
- `www/js/features/` — `id-photo-studio.js` implements custom-size photo framing and print sheets; enhancement and upscaling remain planned/stubs.
- `www/js/ai/` and `www/js/workers/` — future boundaries; no model runtime/inference is implemented.
- `www/js/feature-screens.js`, `www/js/ui/components.js`, `www/styles.css` — feature layouts, reusable DOM controls/dialogs, and styles.
- `scripts/` — project check and Node built-in suites for image loader, viewport, transforms, crop, history and export.
- `electron/` — main/preload/packaging. Preserve existing security boundaries.
- `docs/HANDOVER.md` does not exist; canonical implementation/status log is root `HANDOVER.md`.
- `docs/ARCHITECTURE.md`, `docs/INITIALIZATION-PLAN.md`, `docs/PRIVACY-AND-SECURITY.md`, `docs/RELEASE.md`, `docs/MODELS.md`, `docs/LICENSES.md`, and `docs/PHASE-0-CHECKLIST.md` record design and future gates.

The formal `NPS-TS-001 v1.0 Technical Specification` is referenced in prior project material but is not present in this checkout. Do not claim to have read it. Current user task prompts plus checked-in docs and source are the implementation truth.

## 5. Consolidated roadmap — planned work

The repo’s documents use two naming systems: the recent conversation calls the core editor work “Phase 2 Tasks 1–7”; `docs/INITIALIZATION-PLAN.md` calls the later product areas Phases 2–6. Preserve both labels when useful and do not renumber without user direction.

### Immediate: review ID Photo Studio and print sheets (step 4)

1. Phase 2 core editor Tasks 1–7 are accepted by the user (2026-11-17).
2. The user accepted the brightness/contrast/saturation starter (step 1) on 2026-11-17.
3. Step 2 is accepted by the user. It adds deterministic presets and custom export dimensions with aspect lock, dimension readout, and 20,000-pixel-side / 80 MP bounds; filter and resize metadata participate in history and full-resolution export.
4. Step 3 Before/After comparison has been accepted by the user.
5. Step 4 is implemented and awaits user review: custom dimensions, approximate positioning guides, and A4/Letter/custom paper layouts with a 300 DPI print action. Country-specific ID rules are not included. See `docs/ID-PHOTO.md` for exact scope, standards source, and verification date. Automated checks and runtime review were not run.
6. After step 4 review, separately design project/session workflow and storage policy.
7. Keep the carried Phase 1 runtime/release checks (responsive layouts, browser dialog/focus, service worker/offline behavior, packaged Electron) visible as a separate quality/release follow-up; they do not block planning the next feature unless a new task specifies otherwise.

### Classical editing continuation (initialization-plan Phase 2)

- Consider further color controls (for example, exposure, highlights/shadows, or temperature) only after their ranges and pixel behavior are specified.
- Extend deterministic presets only from a defined look/preview and export contract.
- Add more resize workflows only with explicit preview-resolution and memory behavior.
- Integrate these edits with history and the existing full-resolution export pipeline.
- Preserve source bytes; decide and test numerical ranges, interaction behavior, pixel/color handling, alpha behavior and history grouping before implementing.

### Comparison and project workflow

- Before/after comparison uses the `www/js/editor/comparison.js` boundary and `www/js/editor/viewport.js`; current comparison is a temporary original/edited toggle, with no split slider yet. The user accepted step 3.
- ID photo and print layout are implemented in `www/js/features/id-photo-studio.js`; the feature screen and event wiring live in `www/js/feature-screens.js` and `www/js/app.js`. Paper sheet source/date and the no-compliance boundary are in `docs/ID-PHOTO.md`. User review is pending.
- Project saving/recent projects are explicitly absent. If later approved, design local storage location, data format, quota, retention, deletion, recovery and consent first; do not silently persist image bytes.
- Batch processing is represented in the UI but not implemented. Define file limits, per-item errors, cancellation, memory use and explicit output destination before work.

### ID Photo Studio and print layout (initialization-plan Phase 3)

- User-defined physical photo sizes, approximate positioning guides, and print sheet layouts are implemented. Any future background controls need a separate explicit scope; no background replacement is included.
- Any jurisdiction/country preset must cite the authoritative government/issuing authority, jurisdiction, exact rule, source URL and last-verified date. Recheck changing rules. Do not claim “official” or “compliant” without current evidence.
- Do not generatively alter identity or use identity-changing restoration for official ID output. Keep print/layout/export outputs explicit and non-destructive.

### Optional on-device AI (initialization-plan Phases 4–5)

- Upscaling and face detection/restoration are optional future work, not current commitments to a specific vendor/model.
- Before model work: document source, license, version, size, SHA-256, tensor/input-output contract, runtime/provider compatibility, hardware/memory, fallback behavior, download destination, quota/cleanup, and verification date. Require user-initiated download and consent. Never precache models or send photos to cloud services.
- Clearly disclose face/identity effects. Exclude identity-changing effects from official ID workflows.
- Use workers for expensive operations; keep UI responsive with progress and cancellation. Do not add ONNX/runtime dependencies until a scoped task approves them.

### Production release (initialization-plan Phase 6)

- Complete browser/PWA fresh-origin, responsive, keyboard/dialog/focus, console, service worker install/offline reload and stale-cache checks.
- Complete Windows Electron development and packaged installer checks separately; dev launch does not prove packaged behavior. Inspect preload/IPC and restrictive navigation/security settings.
- Test recovery/cancellation, export formats, large-image memory pressure, and supported OS/browser/runtime versions. Record exact environment, viewport, DPR, fixture type, commands and unverified items.
- Signing, updater, distribution, release channel, icons/asset licensing and support policy remain open decisions. Do not publish/deploy/release or create tags without explicit authorization.

### Other planned UI areas

Enhance/Restore, Model Manager, Batch Processing, Upscaling, Settings beyond theme, and any split-slider Before/After comparison remain planned product areas. They are not functional merely because placeholder screens or module stubs exist. Scope and acceptance criteria per feature before coding.

## 6. Risks and technical follow-ups

- Full-resolution Canvas allocation and `toBlob` can fail for large images. Existing import caps are 100 MB, 80 MP, and 20,000 pixels per side, but output canvas memory can still be substantial. Test graceful errors and cleanup on representative devices.
- Confirm actual browser/Electron PNG/JPEG/WebP support; `toBlob` can return null or a fallback MIME. The engine surfaces an error if the returned blob type differs when declared.
- Verify crop coordinate mapping and orientation with manual, synthetic asymmetric images; automated geometry checks do not prove every Canvas rasterization case.
- Export URL is revoked after triggering the anchor. Validate this lifecycle in supported browsers/Electron as manual runtime evidence.
- UI modal uses native `<dialog>` and `showModal`; verify focus trap/return and Escape behavior in runtime checks.
- Keep filenames sanitized and ensure extensions match selected format. Never overwrite the source file.
- Task 7 build has the known informational static-script warning. Do not call it a failure unless behavior is broken; preserve the pre-paint `theme-init.js` behavior unless revisiting with a specific reason.
- The former local items `fold-project-complete.zip` and `public/` are preserved outside the repository at `C:\Users\User\Desktop\Nuro Photo Studio Local Files\` per user request. Do not move, inspect, or stage them unless asked.

## 7. Validation and evidence rules

For implementation tasks, follow the exact current user test restrictions. Task 7 explicitly prohibited launching browsers, Electron, servers or manual UI tests, and required only:

```text
npm test
npm run check
npm run build
git diff --check
```

That restriction applied to Task 7’s coding-agent validation; a future task can set its own rules. Do not claim manual verification from unit tests. Record warnings and distinguish implemented, tested, manually observed, user accepted and released.

Current Task 7 automated evidence is recorded above and in `HANDOVER.md`; it was run before this memory refresh. This documentation-only update did not rerun tests/build. For docs-only changes, use `git diff --check` if requested or appropriate, and preserve unrelated workspace data.

## 8. Collaboration and Git rules

- Work only in `NuroTraders/nuro-photo-studio`. Start each new task by checking status, branch, remotes, recent commits, and relevant docs/source.
- Preserve all unrelated tracked and untracked work. Never reset, clean, overwrite or stage broadly. In particular, do not stage the current untracked ZIP or `public/` automatically.
- Keep source images on-device; do not use personal photos in tests, logs or screenshots. Prefer generated fixtures.
- Do not add dependencies or change app version except when the task asks and the matching docs are updated.
- Do not commit, push, tag, deploy, publish or release unless the user explicitly authorizes that action. The user prefers commit/push commands in implementation reports, but writing commands is not authorization to execute them.
- A new-chat report should give repo path, branch, commit, dirty/untracked state, changed files, exact validation, known warning, manual status, limitations, and next user decision.

## 9. Suggested prompt for a new chat

> Read `docs/Nuro_Photo_Studio_Project_Memory_Handover.md`, root `HANDOVER.md`, `README.md`, `docs/ARCHITECTURE.md`, `docs/BRANDING.md`, `docs/ID-PHOTO.md`, and source relevant to my task. Work only in `NuroTraders/nuro-photo-studio`. The pushed base is branch `main`, `HEAD`/`origin/main` `514a168958cf39ab8343c845505c31793ab3b943`, version `0.2.0`; check Git status because step 4 ID Photo Studio/print-sheet changes are uncommitted. Preserve the ZIP and `public/` folder at `C:\Users\User\Desktop\Nuro Photo Studio Local Files\`. Branding and core Tasks 1–7 are accepted. Steps 1–3 (adjustments, filters/resize, Before/After) were accepted by the user. Step 4 is implemented and awaits review: separate local source, custom physical dimensions, approximate framing guides, A4/Letter/custom paper/orientation, centered copies, and a 300 DPI print action. No jurisdiction-specific ID requirements or identity-changing edits are included; source details are in `docs/ID-PHOTO.md`. Tests/runtime UI were not run for step 4. After approval, design project/session workflow and local-storage policy. Carried Phase 1 runtime/release checks remain open. Preserve source photos; do not add cloud processing or commit/push unless explicitly asked. Include explicit commit and push commands in implementation reports, but do not execute without authorization.
