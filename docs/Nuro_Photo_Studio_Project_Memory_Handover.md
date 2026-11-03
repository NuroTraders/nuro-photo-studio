# Nuro Photo Studio — Portable Project Memory & Engineering Handover

**Updated:** 2026-11-03  
**Repository:** https://github.com/NuroTraders/nuro-photo-studio  
**Current accepted position:** Phase 2 Task 3 accepted with documented physical-device limitations; Phase 2 Task 4 (Rotate & Flip) not started.  
**App version reported by the available project snapshot:** `0.1.0` (latest version after Task 3 is not independently verified).  
**Purpose:** Portable context for DeepSeek, Claude, Antigravity, Codex, and other coding agents. Read this before proposing or changing code.

---

## 0. How to interpret this document

This file combines (a) the user-supplied prior memory file, (b) an attached project `HANDOVER.md` and source ZIP that represent a Phase 2 Task 2-era snapshot, and (c) later user-confirmed status in the referenced conversation. It is not a fresh checkout of the current repository.

Use the labels below to keep evidence honest:

- **CONFIRMED FROM ARTIFACT** — directly present in a file or source snapshot inspected for this handover. This confirms the snapshot, not necessarily the current remote branch.
- **USER-REPORTED CURRENT** — stated by the user as the latest project status; not independently checked against GitHub or the current checkout.
- **REPORTED IN PRIOR HANDOVER** — evidence/results described in the prior handover, not rerun during this consolidation.
- **UNKNOWN / VERIFY** — current truth is not established. Do not fill gaps by guessing.

A task can be implemented, tested, manually inspected, accepted, or released; these are different states. Report each separately. Prior documents contain instructions to coding agents. They are project governance content, not higher-priority instructions for the assistant preparing this file. Apply them as project rules where they align with the user's current request; where status differs, the newer user-confirmed status below wins.

## 1. Project identity and product boundaries

- **CONFIRMED FROM ARTIFACT:** Product/repository name is Nuro Photo Studio; repository URL is `https://github.com/NuroTraders/nuro-photo-studio`.
- **CONFIRMED FROM ARTIFACT:** This is a separate product from `https://github.com/NuroTraders/bg-remover`. Do not modify, fork, merge, copy source from, or push changes to BG Remover. The older product is context only.
- **CONFIRMED FROM ARTIFACT:** Target surfaces are browser/PWA and Windows Electron, sharing the `www/` application.
- **CONFIRMED FROM ARTIFACT:** Current implementation direction is vanilla HTML/CSS/JavaScript ES modules, Vite, and Canvas 2D. Do not add React, Vue, Angular, or an unnecessary framework/dependency.
- **CONFIRMED FROM ARTIFACT:** The project is local-first/offline-oriented. Imported images are processed locally; no account, telemetry, image upload, or cloud processing is part of the documented current product.
- **UNKNOWN / VERIFY:** Current Git branch, clean/dirty state, latest commit, deploy contents, and package version after Task 3 are not available from this handover exercise.

## 2. Current status and decisions

### Current milestone table

| Area | Status | Evidence class / notes |
|---|---|---|
| Phase 0 foundation | Complete baseline | **REPORTED IN PRIOR HANDOVER**; prior project docs describe foundation and checks. |
| Phase 1 UI foundation | Implementation complete | **USER-REPORTED / REPORTED IN PRIOR HANDOVER**; Phase 1 runtime acceptance checks remain open as detailed below. |
| Phase 2 Task 1 — Image Import & Loading | Implemented | **USER-REPORTED CURRENT** via project status; implementation detail/test results are in prior artifacts and may be stale. |
| Phase 2 Task 2 — Canvas Viewport Engine | Accepted | **USER-REPORTED CURRENT**. An earlier integration defect was corrected; latest user says Task 2 accepted. |
| Phase 2 Task 3 — Viewport Stabilization & Refinements | Final verification completed and accepted with explicit limitations | **USER-REPORTED CURRENT**. Physical touchscreen pinch and live high-DPI hardware checks remain unverified. User reports the handover-only update was pushed; no commit ID was supplied or independently verified. |
| Phase 2 Task 4 — Rotate & Flip | Not started | **USER-REPORTED CURRENT**. Next feature task, subject to the project gates in this document. |
| Phase 2 Tasks 5–7 | Planned, not started/verified | Crop, Undo/Redo, Export, in that order in the currently known roadmap. Reconfirm scope before starting. |

### Task 3 final evidence (current user report)

The user reports that browser and Electron used current source at `http://127.0.0.1:5203/`. Electron manual checks used synthetic landscape and portrait images and covered Canvas rendering, dimensions, Actual Size, zoom controls and slider, Fit, wheel zoom, pan, image replacement, close/empty state, and window resize/fit. Browser checks at two viewport sizes found no document-level horizontal overflow.

Automated checks were reported passing: `npm test` (8/8), `npm run check`, `npm run build`, and `git diff --check`. Build emitted the existing informational Vite warning that static `theme-init.js` is copied rather than bundled. Pinch zoom, pointer cancellation/release/recovery, and DPR capping were automated-only checks. Windows denied access to touch-device inventory, so physical touchscreen pinch could not be performed; browser reported DPR 1, so live high-DPI display rendering was unavailable.

**Acceptance:** Task 3 is accepted, with those two physical hardware checks clearly documented as limitations. Do not reopen acceptance just because physical hardware is unavailable. If suitable hardware becomes available, record a follow-up verification without misrepresenting automated tests as hardware evidence.

**Push status:** User reports that the handover-only update was pushed. Treat as reported, not independently verified. No SHA/ref was supplied. Do not claim an app-code change, release, or a verified remote push from this statement.

### Earlier integration correction (historical context)

The Phase 2 Task 2 visual review found screenshots where an old `<img>` preview remained separate from the new Canvas viewport and the empty-state overlay appeared over a loaded image. The reported root cause was stale service-worker content on port 5173 plus CSS where `.ui-empty-state { display: flex }` overrode `[hidden]`. The reported correction made viewport state control canvas/empty visibility together, explicitly hid the empty state when hidden, integrated zoom controls into the workspace, and removed the old standalone preview. Later user status says Task 2 was accepted. Treat these root-cause details as historical report, not a reason to repeat the correction absent a reproduced defect.

## 3. Known technical shape and architecture boundaries

**CONFIRMED FROM ARTIFACT (Task 2-era source ZIP and project docs):**

- `www/` contains the browser/PWA UI and native ES modules.
- `www/js/ui/` contains shared DOM components; `www/js/core/` contains state/event/document/history/queue boundaries; `www/js/editor/` contains image loading and viewport/editor modules; `www/js/processing/` is the processing/export boundary; `www/js/ai/` and `www/js/workers/` are future slots/stubs.
- `electron/` contains Electron main/preload and builder config. The renderer is a browser page; privileged work belongs in main behind a narrow preload bridge.
- `scripts/` contains structural checks and Node built-in tests. `docs/` contains architecture, privacy/security, release, model, initialization and UI component notes.
- Package snapshot reports version `0.1.0`, Vite 7, Electron 38, Electron Builder 26 and native ES modules. Lockfile is part of the source snapshot. Exact installed versions/current versions must be verified from the current checkout before changes.
- The Task 2-era `HANDOVER.md` lists Phase 1 UI items and Phase 2 Task 1/2 work. It is older than the user-confirmed Task 3 acceptance and must not be copied as current state without updating it.

### Layer responsibilities

1. **UI:** navigation, controls, accessible state, status and dialogs. Keep thin; delegate work.
2. **Application core:** image document/session state, commands, history, settings and job lifecycle.
3. **Image engine:** validated decode, viewport rendering, transform/crop, adjustments, resize, comparison and export.
4. **AI engine (later, gated):** worker-based tasks, model lifecycle/provider selection and explicit model provenance.
5. **Platform:** browser/PWA and Electron integration, storage, file access, print/export destinations.

Data should flow from UI event → validated application command/state → isolated editor/processing module → preview or export result. Avoid image algorithms in DOM handlers. Keep viewport rendering separate from document edits and editing operations separate from UI. Use workers for expensive operations where justified and measurable.

## 4. Non-destructive image and data rules

These are hard product invariants:

- Preserve the original imported `File`/source bytes unchanged for the entire editing session. Never overwrite or silently mutate the source.
- Store edits as working state, parameters, operations, or derived buffers separate from source. Undo/redo and before/after must refer to explicit states.
- Viewport zoom, pan, fit and display transforms are view state; they must not alter image pixels or export dimensions.
- Export must create a new output artifact and require an explicit user action, format and destination. Never silently replace the source. Make lossy JPEG behavior and quality choices visible.
- Release object URLs, canvas/bitmap resources, observers, event handlers, workers and pending jobs on replacement, close, screen teardown and cancellation. Avoid retaining image data after the user closes it.
- Validate extension, MIME/signature, decoder success, dimensions, pixel count and resource limits. Current prior implementation report specifies 100 MB, 80 MP and 20,000 px/side; verify current code before changing those limits.
- Do not persist images or recent-project metadata unless a separately approved design defines user-visible storage location, consent, retention and deletion behavior.

## 5. Privacy and local-first requirements

- No photo bytes, filenames, thumbnails, EXIF or derived content may be uploaded, logged, telemetered, or sent to third parties without a new explicit product decision and user-facing consent.
- Offline shell caching must never cache user image blobs, model files, or exports by accident. The prior docs describe a small app shell/static asset cache and network-first navigation fallback; verify current service-worker behavior when modifying it.
- Do not add analytics, accounts, cloud APIs, remote scripts, CDN runtimes, or hidden network calls.
- Explain any network access needed by a feature before implementation. Model download is future and requires explicit user choice, provenance/license/size display, integrity validation, and separate storage.
- Avoid logging filenames/content. Clear in-memory image state and release resources on close.

## 6. Security requirements

### Electron

- Keep `nodeIntegration: false`, `contextIsolation: true`, `sandbox: true`, and `webSecurity: true`.
- Maintain a restrictive CSP; do not add broad remote origins or `unsafe-eval` without a narrowly justified, reviewed requirement.
- Restrict navigation to the expected local app and deny unexpected windows. Open external HTTPS only through an intentional, validated path.
- Expose narrowly scoped, typed-purpose preload APIs only. Never expose raw `ipcRenderer`, Node objects, generic filesystem access, shell execution, or arbitrary IPC.
- Validate all IPC inputs at the main-process boundary. Keep renderer untrusted, including file names and image metadata.

### General

- Treat imported images, archive contents, model files and network responses as untrusted input.
- Check dependency advisories/licenses and package scripts before adding/updating dependencies. Avoid supply-chain surprises and arbitrary install scripts.
- Do not introduce secrets, credentials, personal photos, private paths or user data into logs, tests, screenshots, commits, or prompts.
- For future models, record upstream/source, license, version, file size, SHA-256, tensor/input-output contract, provider compatibility and verification date. Never auto-download or precache model binaries.
- ID-photo compliance must cite official authority and last-verified date. Avoid “official/compliant” claims without authoritative verification. Do not use generative or identity-changing transformations for official ID outputs.

## 7. Accessibility, performance, and compatibility

### Accessibility

- All controls need accessible names, labels, keyboard operation, visible focus, sensible focus order, and announced status/errors.
- Dialogs must support Escape where appropriate and restore focus to the opener. Test keyboard-only paths and focus management, not just DOM presence.
- Respect `prefers-reduced-motion`; keep touch targets usable; do not rely on color alone. Use semantic controls and maintain contrast in both themes.
- Preserve responsive behavior without document-level overflow. Test narrow, medium and wide layouts at recorded dimensions.

### Performance and reliability

- Keep viewport canvas bounded to the visible workspace; avoid allocating full-resolution display canvases just to zoom/pan.
- Cap device pixel ratio (Task 2/3 report says 2×) and document the memory/sharpness tradeoff. Handle resize, image replacement, cancellation and context/resource failures predictably.
- Avoid blocking the UI for large operations. Use workers or chunking when justified. Provide progress/cancel behavior for long jobs.
- Test large-image memory pressure and graceful failure before claiming production readiness. Do not benchmark by uploading private images.

### Compatibility

- Shared `www/` code should behave consistently in supported browsers and Electron. Record exact OS, browser/Electron versions, runtime source/origin and device pixel ratio with manual results.
- Browser/PWA service workers require localhost or HTTPS, not `file://`. Test fresh-origin and stale-cache behavior deliberately.
- Current known live Task 3 manual check was on Electron plus browser at a fresh source origin; physical touch and DPR>1 remain unverified.
- Do not infer packaged Electron compatibility from Electron dev mode; the Phase 1 packaged Electron check is still outstanding.

## 8. Dependencies, versions, and source of truth

### Source of truth hierarchy

1. Current repository checkout and its committed source/tests/docs are implementation truth.
2. Current `HANDOVER.md` is the project’s status/evidence log, and should be synchronized with accepted changes.
3. User-approved product requirements/specifications are requirements truth.
4. This portable memory is transfer context and policy; it does not replace current source or the missing formal specification.
5. Chat reports, screenshots, and agent summaries are evidence only for what they show and when they were produced.

A conflict must be resolved by inspecting the current checkout and asking the user only when a product decision cannot be inferred. Never silently reconcile contradictory docs by inventing facts.

### Missing specification

The prior memory identifies **NPS-TS-001, “NURO PHOTO STUDIO — Version 1.0 Technical Specification”**, marked Draft — Ready for Technical Review, but states it is absent from the repository. The source document itself was not available among the inspected conversation attachments. Do not claim to have read it. When the user supplies the actual document, add it at `docs/NPS-TS-001-Technical-Specification.md` and reconcile implementation requirements. Until then use checked-in architecture/privacy guidance plus the user’s approved task prompt; mark assumptions.

### Version control

- Keep `package-lock.json` in sync with `package.json`; use reproducible installs (`npm ci`) when appropriate.
- Do not silently bump app version. Every version change must update the project handover’s version history with date and user-visible changes.
- Verify current Node/npm and runtime versions before claiming compatibility. Prior README baseline says Node 20.19+ or 22.12+ for Vite 7; confirm against current package/tool docs when changing.
- Review license and necessity before adding packages. Prefer platform/native APIs when adequate.
- No dependency updates as incidental cleanup during a feature task.

## 9. Testing and evidence standards

Do not add or run tests unless the user asks to test/verify implementation or the approved task acceptance criteria require them. For project implementation work, the task prompt should explicitly list required tests and checks; report only those actually performed. Do not broaden scope to unrelated test additions.

Evidence must identify:

- Exact source revision/branch or state (commit/hash if available); dirty changes if relevant.
- OS, runtime versions, browser/Electron version, URL/origin, viewport size and DPR for manual checks.
- Exact commands/checks and pass/fail, with output summary. A build warning remains a warning and should be named.
- Synthetic fixture details; use generated test images, never a user’s private photo unless explicitly requested.
- Which paths were automated, manually observed, hardware-tested, or not tested.
- Screenshots/video only when they directly demonstrate acceptance; avoid including personal data.
- Known limitations, defects, and environment restrictions. A blocked check is **unverified**, not passed.

Standard validation for an explicitly approved implementation task, when applicable:

- Relevant automated tests (`npm test` in the Task 2-era snapshot runs Node built-in image-loader and viewport suites).
- `npm run check` and `npm run build` when within scope.
- `git diff --check` before handoff.
- Browser/Electron manual checks listed in the task acceptance criteria. Do not claim packaged validation without running a packaged build.

Current Task 3 reported results are historical-to-this-document, not rerun. The project has no fresh verification performed while creating this memory file.

## 10. Git and release workflow

- Work on the intended repository and branch only. Check `git status`, branch, remotes and diff before editing; preserve unrelated user changes.
- Keep each task small and reviewable. No broad rewrite, unrelated formatting, mass renames, or generated artifacts unless requested.
- Never commit, push, tag, publish, deploy, release, or modify GitHub state unless the user explicitly authorizes that operation. User authorization for a specific push does not authorize unrelated changes.
- Never say a push/commit happened without checking its resulting state. Record commit hash and remote/ref when verified.
- Before a proposed commit, summarize changed files, checks, risks and exact intended commit scope. The user may do routine commits themselves.
- Keep secrets, local fixtures and private user data out of Git. Do not rewrite history or force-push absent explicit instruction.
- Release signing, auto-update and distribution remain deferred in the earlier handover; do not add them during Task 4.

## 11. Scope control, task gates, and known roadmap

### Immediate next task

Phase 2 Task 4 — **Rotate & Flip** is not started. Before coding, inspect the current repository and current `HANDOVER.md`; define requirements and acceptance for transform semantics, interaction, keyboard access, orientation/dimensions, non-destructive state, preview, replacement/close, history compatibility, and export implications. Task 4 must not quietly absorb Crop, Undo/Redo, Export, AI, persistence, or UI redesign.

Rotation/flip should be represented as non-destructive edit state/operations separate from viewport pan/zoom. Clarify whether rotation is 90° only or arbitrary-angle, how flips compose with rotations, what happens to image bounds/background/transparent corners, whether metadata orientation is already normalized at import, and how preview/export share transforms. If these are not specified by current docs/product requirements, ask the user before implementing the ambiguous behavior.

### Known roadmap

1. Task 1 — Image Import & Loading — implemented.
2. Task 2 — Canvas Viewport Engine — accepted.
3. Task 3 — Viewport Stabilization & Refinements — accepted with physical touchscreen/DPR limitations documented.
4. Task 4 — Rotate & Flip — not started.
5. Task 5 — Crop Tool — planned.
6. Task 6 — Undo/Redo History — planned.
7. Task 7 — Export Engine — planned.

The roadmap sequence is from the latest known project memory and conversation. Reconfirm before rearranging or expanding it. Later AI/upscaling, ID-photo presets, persistence, signing and update systems are gated future work.

### Acceptance gates

A task is accepted only when all applicable gates are explicit and evidenced:

1. Scope matches the approved task; no unrelated features.
2. Implementation respects architecture, source-preservation, privacy, and security invariants.
3. Required automated checks pass and are reported accurately.
4. Required manual/runtime checks are performed or listed as limitations.
5. UI/accessibility requirements are reviewed.
6. Resource cleanup, failure behavior and edge cases are addressed.
7. `HANDOVER.md` accurately records changes, evidence, limitations, version and next step.
8. User/maintainer acceptance is recorded. “Implemented” alone is not “accepted.”

## 12. AI-agent collaboration rules (hard rules)

1. **One task at a time.** Do not start a later roadmap task until the current task is accepted.
2. **Read before changing.** Inspect `HANDOVER.md`, `README.md`, relevant architecture/privacy docs, package scripts, and the exact target code/tests first.
3. **No invented context.** Treat this file and chat summaries as clues; verify current source. Do not claim to have read the missing NPS-TS-001.
4. **Small diffs.** Implement only the approved scope. No broad rewrites, framework migrations, unnecessary dependencies, speculative polish, or unrelated cleanup.
5. **Protect existing work.** Check branch/status and preserve dirty changes. Never reset, clean, force-push, or overwrite user data to make a task easier.
6. **No external side effects without authorization.** Do not commit, push, publish, deploy, send messages, upload images, install models, or change remote settings unless explicitly authorized.
7. **Privacy first.** Use synthetic fixtures. Never transmit user images or metadata. No telemetry or cloud paths.
8. **Non-destructive source handling.** Keep original bytes untouched; edits are derived state; export to a new destination.
9. **Security boundaries stay strict.** Preserve Electron sandbox/isolation/CSP/preload restrictions and validate all untrusted inputs.
10. **Evidence before claims.** Separate automated test, manual check, physical hardware test, source inspection, user report and independent verification.
11. **Update documentation.** Update `HANDOVER.md` after an accepted task; record version only if changed and include dated user-visible change note.
12. **No silent task advancement.** Stop after delivering the current task for review; do not start the next task in the same unapproved scope.
13. **Respect limitations.** If a test is unavailable, state why and what remains unverified. Do not simulate success in narrative.
14. **Ask only for product decisions that block safe implementation.** Make reversible implementation choices within approved constraints, document them, and avoid repeated questions already answered here.

## 13. Stop conditions

Stop implementation and report the blocker if any of these occurs:

- Current branch/repository identity is ambiguous or points to BG Remover or another project.
- Existing user changes would be overwritten, discarded, or mixed into the task unsafely.
- A requirement would violate source preservation, local-only privacy, security boundaries, license restrictions, or user-approved scope.
- Required behavior is materially ambiguous and cannot be safely inferred (especially transform semantics, export behavior, storage, network access, or ID-photo compliance claims).
- Tests reveal a regression or security/privacy issue that cannot be fixed within scope.
- A requested action requires a permission/approval that is unavailable or denied.
- The formal spec is needed to settle a requirement but its actual content is missing.
- Evidence conflicts materially (e.g., source, screenshots, and handover disagree); investigate and report rather than asserting acceptance.

A stop condition does not mean abandoning unrelated safe work; identify the exact blocker, evidence, and smallest user decision needed.

## 14. Required implementation report format

Every coding-agent task report must use this structure:

### Status
Implemented / partially implemented / blocked / ready for review / accepted (use only the status supported by evidence).

### Scope and changes
- Task and explicit boundaries.
- Files changed with one-line purpose each.
- User-visible behavior and relevant architecture decisions.

### Validation and evidence
- Automated checks run and exact outcomes.
- Manual browser/Electron checks, environment, fixtures, viewport and DPR.
- Hardware checks, if any.
- Build warnings, failures and checks not run.

### Privacy, security, accessibility, performance
State material impact and evidence; explicitly say when not evaluated.

### Limitations and risks
List open items and why. Distinguish known issues from unavailable verification.

### Documentation and version
Confirm `HANDOVER.md` update; state app version unchanged/changed and dated entry if changed.

### Git status
State whether commit/push occurred only after verification; include exact hash/ref if done. Otherwise say no commit/push performed. Provide candidate commands only when useful; never execute without explicit authorization.

### Acceptance request / next step
Ask for review of the concrete result. Name the next roadmap task but do not begin it until acceptance.

## 15. Outstanding items and unknowns

### Phase 1 runtime checks still open (from prior HANDOVER)

The prior project handover explicitly did not count these as passing. Preserve them as outstanding until current evidence closes them:

- Narrow/mobile and tablet viewport overflow behavior.
- Browser console/runtime review.
- Live service-worker registration, cache installation, offline reload and stale-cache behavior.
- Dialog Escape behavior and focus restoration.
- Full keyboard-only accessibility audit.
- Packaged Electron build/launch and preload/IPC runtime behavior. Electron development launch was reported working; that does not close packaged runtime checks.

The prior handover said reduced-motion and visible focus styling were confirmed in CSS, and accessible names/labels/screen structure were inspected in an accessibility tree. Those partial inspections do not close the full keyboard/dialog/runtime checks above.

### Other open/unknown matters

- Whether Task 1's real JPEG + EXIF orientation, real WebP decode, native drag-and-drop, and browser console checks have since been completed is unknown. Prior Task 1 report says decoder tests were mocked and these checks remained manual follow-ups.
- Current deployed GitHub Pages revision and its relation to the current local source are unknown.
- Current package version and current main-branch commit after Task 3 are unknown.
- Exact Task 3 handover-only pushed commit/hash is unknown; user reports the push complete.
- Actual NPS-TS-001 source document remains unavailable in inspected materials.
- Physical touchscreen pinch and DPR>1 display validation remain explicitly unverified on hardware.
- No testing or repository code changes were performed during preparation of this portable memory file.

## 16. Source materials consulted

1. User-provided `Nuro_Photo_Studio_Project_Memory_Handover.md` at `C:/Users/User/Desktop/` — prior status and project rules. It predates Task 2 acceptance and Task 3 completion; its immediate-next-action section is superseded by current user-reported status.
2. Conversation Library attachment `HANDOVER.md` — detailed Phase 0/1 and Phase 2 Task 1/2 history, validation limitations and architecture notes; snapshot predates Task 3 acceptance.
3. Conversation Library attachment `nuro-photo-studio-main (1).zip` — inspected as a Task 2-era source snapshot, not treated as the current repository. Used to confirm project structure, package scripts and checked-in docs.
4. Referenced conversation “Chat Plan Zone: Review Canvas Task 2” (`6ae9c914-1f80-83ee-8dc1-d2dd1aa25dde`) — latest messages include Task 2 acceptance history and Task 3 final verification report. Latest user-provided status in the current request is authoritative for Task 3 acceptance and reported push.
5. Earlier handover snapshot `Nuro Photo Studio — Handover` — stated NPS-TS-001 v1.0 was not present in the checked-in repository. The specification content itself was not available here.

---

## Quick resume prompt for another coding agent

> Read this project memory and the current repository's `HANDOVER.md`, `README.md`, architecture/privacy/security docs, `package.json`, and relevant source before acting. Work only in `NuroTraders/nuro-photo-studio`; never touch BG Remover. Current user-reported position: Phase 2 Tasks 1 and 2 implemented, Task 2 accepted, Task 3 accepted with physical touchscreen pinch and high-DPI hardware limitations documented, and the handover-only update is reported pushed; Task 4 Rotate & Flip has not started. Phase 1 runtime checks listed in this memory remain open unless current evidence closes them. Verify the current branch/status/version and do not assume the older attached source ZIP is current. Keep the original image bytes unchanged, process locally, preserve Electron security boundaries, use small approved scope, and do not commit/push/deploy or begin another task without explicit authorization. Report evidence and unknowns using the required report format.
