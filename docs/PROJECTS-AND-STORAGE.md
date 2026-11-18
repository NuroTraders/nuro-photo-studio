# Projects and local storage design

## Status

Initial implementation: explicit save, reopen, and deletion of local projects is available through IndexedDB. The first saved version includes the original source photo, committed editor state, and ID Photo Studio settings. Rename, save-as, storage usage reporting, schema migration, and persisted undo/redo history remain follow-up work.

## User experience

- A project is created only when the user chooses **Save project**. Opening an image, editing it, or printing an ID sheet never silently saves image data.
- **Open project** lists saved projects with name, source dimensions, last-saved time, and storage size. **Open image** remains a separate action for an ordinary source file.
- Save uses an explicit project name and offers overwrite or save-as when a name already exists. A visible saved/unsaved state reflects changes since the last successful save.
- **Recent projects** is derived from saved project metadata only. It does not create recovery copies or retain unsaved source files.
- Users can rename and delete projects. Delete confirmation names the project and explains that its saved source photo and edits will be removed from this device.
- If a project cannot be restored, offer deletion and preserve the original saved record until the user chooses; do not silently discard it.

## Data and storage

- Use IndexedDB for a versioned project record shared by the browser/PWA and Electron renderer. Do not use `localStorage` for image bytes or project payloads.
- A saved record contains a schema version, stable project ID, user-facing name, created/updated timestamps, original image Blob, validated media type and dimensions, committed edit metadata/history, export settings, and ID Photo Studio working settings when present. It excludes object URLs, decoded bitmaps, canvas pixels, transient zoom/pan, open dialogs, and unsaved files.
- Saving the source Blob is permitted only as part of the explicit project save action. The source bytes are retained unchanged. The UI must disclose that a project includes a local copy of the source photo.
- Write each project as one atomic IndexedDB transaction. Update its saved timestamp and clear the dirty state only after transaction completion. On failure, retain the in-memory session and report that saving failed.
- Do not automatically evict projects. Display browser/Electron storage estimate when available, handle quota errors, and let users free space through explicit deletion. Never claim data is backed up or durable across browser data clearing/device loss.
- No cloud sync, account, telemetry, or service-worker caching of project data. The existing shell cache remains separate.

## Limits and validation

- Reuse the current import limits (100 MB per source, 80 megapixels, 20,000 pixels per side); reject unsupported/corrupt records on open with a recoverable error.
- Set a configurable project-count limit only if product requirements establish one. Do not invent a quota that risks blocking users; storage availability is browser-managed and must be checked at save time.
- Validate schema version, metadata ranges, edit state, dimensions, Blob type and Blob size on every open. Migrate known older schemas transactionally; unknown newer schemas open read-only only if safe, otherwise explain the version mismatch.
- Apply existing bounded history behavior. Persist committed edit snapshots, not continuous slider/pointer drafts.
- Never include project contents in diagnostic logs or error telemetry.

## Recovery and deletion

- An interrupted transaction must leave either the previous complete record or the new complete record, never a partial project.
- On startup, enumerate saved project metadata without decoding source images. Decode only after the user opens a project.
- Deletion removes the entire record in one transaction and updates the project list after success. If deletion fails, keep the record visible and report the failure.
- Browser site-data clearing may remove projects; explain this near project storage controls. Electron uninstall/OS cleanup behavior requires platform-specific release documentation before claiming retention guarantees.

## Acceptance criteria for implementation

1. Unsaved image import/edit/print does not write project data to persistent storage.
2. Explicit save, save-as, overwrite, reopen, rename, and delete work with valid local images.
3. Saved source bytes remain unchanged; restored edits render and export consistently with the current editor.
4. Quota, transaction, corrupt-record, and unsupported-schema errors preserve existing saved data and the active in-memory session.
5. Storage usage and data-removal implications are understandable, and project data never enters shell precache or network requests.
6. Browser/PWA and packaged Electron persistence behavior is documented and manually verified.
