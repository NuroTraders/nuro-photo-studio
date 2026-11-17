# ID Photo Studio and print sheets

## Current behavior

- The feature accepts one local JPG/JPEG, PNG, or WebP photo. It can reuse the editor's original decoded source image without duplicating its large bitmap; editor crops, transforms, filters, and adjustments are not transferred. Photos selected directly in ID Photo Studio have an independently owned object URL.
- Photo width and height are user-defined in millimeters. The initial 35 × 45 mm values are editable starting values only; they are not a country preset or a claim about any issuer's rules.
- Horizontal or vertical position controls frame the source image to the selected aspect ratio. The preview includes an approximate eye-line, centerline, and inner framing guide. The guides are visual aids, not measurement or compliance tools.
- Print sheets support A4, Letter, and custom page dimensions, with editable page orientation for the standard formats, spacing, and margins. Layouts are centered, and the UI reports copy count, source pixel density, and the 300 DPI sheet render density.
- The print action creates a detached, white-background sheet from the decoded source and opens the system/browser print dialog. It does not change the source file or create image edits in the editor history. Confirm print-driver paper size and disable fit-to-page scaling when exact physical dimensions matter; printer hardware margins can affect the result.
- No face/body reshaping, retouching, generative fill, background replacement, or identity-changing restoration is performed.

## Standards and verification

The A4 and Letter values in this feature are **paper sheet formats only**. ISO/IEC 23385:2022 lists A4 paper as 210 × 297 mm and Letter as 215.9 × 279.4 mm among supported photo-print sheet formats: [ISO/IEC 23385:2022](https://www.iso.org/standard/75388.html). Verified against the ISO page on 2026-11-17.

No country, passport, visa, driver's-license, or other issuing-authority photo dimensions or positioning requirements are built in. Users must enter the dimensions and requirements supplied by the receiving authority. Do not describe an output as official, compliant, or accepted by an authority based solely on this feature.

## Resource and privacy boundary

Photo decoding, previews, sheet generation, and printing stay on the device. A separate object URL is released when the selected ID photo is removed or the app page is closed. Print-sheet raster dimensions are limited to 12,000 pixels per side and 100 megapixels; an individual sheet is limited to 200 copies. Source files remain unchanged.
