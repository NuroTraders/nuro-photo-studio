# Nuro Photo Studio branding

This project uses the NasirPintu creator-brand model described in the supplied brand kit, adapted to the existing vanilla JavaScript app and its dark/light themes.

## Product-facing identity

- Creator: **NasirPintu** (Mohammad Nasiruddin Pintu), Creator, Product Architect & Open-Source Builder.
- Signature: **Crafted with ❤️ by NasirPintu**.
- Brand promise: free, private-by-design tools without paywalls, subscriptions or data tracking.
- The signature opens the About dialog, which presents the creator profile, supplied portrait, social links, collaboration credits, toolchain credits and privacy note.
- On narrow layouts, the same About entry is available from the top bar; on wider layouts it sits in the sidebar footer.

## Implementation guidance

- Keep the branding UI in `www/js/branding/about-credits.js` and its styles in `www/styles.css`.
- Use the shared native dialog component so focus handling, Escape dismissal and focus restoration stay consistent.
- Keep external social links explicit and safe (`target="_blank"`, `rel="noopener noreferrer"`).
- Use the owner-supplied portrait at `www/public/nasirpintu.jpg`; retain the text fallback if the image cannot load.
- Keep content responsive and theme-aware. Do not introduce React, Lucide, hosted fonts, analytics or external image processing for this branding model.
- The credits describe human-directed AI collaboration and build tooling; they do not imply AI services run in the app or receive user photos.

## Attribution

Social profiles and collaboration names/roles follow the project owner's supplied brand kit. Open-source package names/authors/licenses are reflected from the project toolchain and `package-lock.json`. See [LICENSES.md](LICENSES.md) for the current license inventory.
