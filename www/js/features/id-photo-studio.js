import { createButton, createCard } from '../ui/components.js';

export const PRINT_DPI = 300;
export const MAX_PRINT_SIDE = 12_000;
export const MAX_PRINT_PIXELS = 100_000_000;
export const PAPER_PRESETS = Object.freeze({
  a4: Object.freeze({ label: 'A4 · 210 × 297 mm', widthMm: 210, heightMm: 297 }),
  letter: Object.freeze({ label: 'Letter · 215.9 × 279.4 mm', widthMm: 215.9, heightMm: 279.4 }),
});
export const DEFAULT_ID_PHOTO_SETTINGS = Object.freeze({
  photoWidthMm: 35,
  photoHeightMm: 45,
  positionX: 50,
  positionY: 50,
  paper: 'a4',
  orientation: 'portrait',
  paperWidthMm: 210,
  paperHeightMm: 297,
  gapMm: 3,
  marginMm: 5,
});

export function normalizeIdPhotoSettings(settings = {}) {
  const result = { ...DEFAULT_ID_PHOTO_SETTINGS, ...settings };
  for (const key of ['photoWidthMm', 'photoHeightMm']) result[key] = clampNumber(result[key], 5, 200, DEFAULT_ID_PHOTO_SETTINGS[key]);
  for (const key of ['positionX', 'positionY']) result[key] = clampNumber(result[key], 0, 100, 50);
  for (const key of ['paperWidthMm', 'paperHeightMm']) result[key] = clampNumber(result[key], 50, 500, DEFAULT_ID_PHOTO_SETTINGS[key]);
  result.gapMm = clampNumber(result.gapMm, 0, 30, DEFAULT_ID_PHOTO_SETTINGS.gapMm);
  result.marginMm = clampNumber(result.marginMm, 0, 50, DEFAULT_ID_PHOTO_SETTINGS.marginMm);
  result.paper = ['a4', 'letter', 'custom'].includes(result.paper) ? result.paper : 'a4';
  result.orientation = result.orientation === 'landscape' ? 'landscape' : 'portrait';
  if (result.paper !== 'custom') {
    const preset = PAPER_PRESETS[result.paper];
    result.paperWidthMm = result.orientation === 'landscape' ? preset.heightMm : preset.widthMm;
    result.paperHeightMm = result.orientation === 'landscape' ? preset.widthMm : preset.heightMm;
  }
  return result;
}

export function getIdPhotoCropRect(sourceWidth, sourceHeight, settings = DEFAULT_ID_PHOTO_SETTINGS) {
  const values = normalizeIdPhotoSettings(settings);
  if (!(sourceWidth > 0 && sourceHeight > 0)) throw new RangeError('A valid source image is required.');
  const aspect = values.photoWidthMm / values.photoHeightMm;
  const sourceAspect = sourceWidth / sourceHeight;
  if (sourceAspect > aspect) {
    const width = sourceHeight * aspect;
    return { x: (sourceWidth - width) * values.positionX / 100, y: 0, width, height: sourceHeight };
  }
  const height = sourceWidth / aspect;
  return { x: 0, y: (sourceHeight - height) * values.positionY / 100, width: sourceWidth, height };
}

export function getPrintSheetLayout(settings = DEFAULT_ID_PHOTO_SETTINGS, dpi = PRINT_DPI) {
  const values = normalizeIdPhotoSettings(settings);
  const pageWidthMm = values.paperWidthMm;
  const pageHeightMm = values.paperHeightMm;
  const mmToPixels = dpi / 25.4;
  const width = Math.round(pageWidthMm * mmToPixels);
  const height = Math.round(pageHeightMm * mmToPixels);
  if (width > MAX_PRINT_SIDE || height > MAX_PRINT_SIDE || width * height > MAX_PRINT_PIXELS) {
    throw new RangeError('This print sheet is too large to prepare safely. Reduce the paper size.');
  }
  const margin = values.marginMm * mmToPixels;
  const photoWidth = values.photoWidthMm * mmToPixels;
  const photoHeight = values.photoHeightMm * mmToPixels;
  const gap = values.gapMm * mmToPixels;
  const usableWidth = width - margin * 2;
  const usableHeight = height - margin * 2;
  const columns = Math.floor((usableWidth + gap) / (photoWidth + gap));
  const rows = Math.floor((usableHeight + gap) / (photoHeight + gap));
  const copies = Math.max(0, columns) * Math.max(0, rows);
  if (!copies) throw new RangeError('The photo does not fit on this sheet. Reduce the photo size or choose a larger page.');
  if (copies > 200) throw new RangeError('This layout would place more than 200 photos on one sheet. Increase photo size or sheet margins.');
  const contentWidth = columns * photoWidth + Math.max(0, columns - 1) * gap;
  const contentHeight = rows * photoHeight + Math.max(0, rows - 1) * gap;
  return {
    width, height, pageWidthMm, pageHeightMm, photoWidth, photoHeight, gap,
    columns, rows, copies,
    left: (width - contentWidth) / 2,
    top: (height - contentHeight) / 2,
  };
}

export function drawIdPhotoPreview(canvas, image, settings = DEFAULT_ID_PHOTO_SETTINGS) {
  const context = canvas?.getContext('2d');
  if (!context) return false;
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  if (!image) return false;
  const crop = getIdPhotoCropRect(image.naturalWidth, image.naturalHeight, settings);
  const scale = Math.min(canvas.width / crop.width, canvas.height / crop.height);
  const drawWidth = crop.width * scale;
  const drawHeight = crop.height * scale;
  const left = (canvas.width - drawWidth) / 2;
  const top = (canvas.height - drawHeight) / 2;
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.drawImage(image, crop.x, crop.y, crop.width, crop.height, left, top, drawWidth, drawHeight);
  drawPositionGuides(context, left, top, drawWidth, drawHeight);
  return true;
}

export function drawPrintSheet(canvas, image, settings = DEFAULT_ID_PHOTO_SETTINGS, dpi = 96) {
  const context = canvas?.getContext('2d');
  if (!context) return null;
  const layout = getPrintSheetLayout(settings, dpi);
  canvas.width = layout.width;
  canvas.height = layout.height;
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, layout.width, layout.height);
  if (!image) return layout;
  const crop = getIdPhotoCropRect(image.naturalWidth, image.naturalHeight, settings);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.strokeStyle = '#b8bec4';
  context.lineWidth = Math.max(0.5, dpi / 192);
  for (let row = 0; row < layout.rows; row += 1) {
    for (let column = 0; column < layout.columns; column += 1) {
      const x = layout.left + column * (layout.photoWidth + layout.gap);
      const y = layout.top + row * (layout.photoHeight + layout.gap);
      context.drawImage(image, crop.x, crop.y, crop.width, crop.height, x, y, layout.photoWidth, layout.photoHeight);
      context.strokeRect(x, y, layout.photoWidth, layout.photoHeight);
    }
  }
  return layout;
}

export function renderPrintSheetCanvas(image, settings = DEFAULT_ID_PHOTO_SETTINGS) {
  const canvas = document.createElement('canvas');
  const layout = drawPrintSheet(canvas, image, settings, PRINT_DPI);
  return { canvas, layout };
}

export function createIdPhotoStudio({ image = null, settings = DEFAULT_ID_PHOTO_SETTINGS, canUseEditorImage = false } = {}) {
  const normalized = normalizeIdPhotoSettings(settings);
  const grid = document.createElement('div');
  grid.className = 'feature-screen-grid id-screen-grid';

  const setup = createCard({ tag: 'section', className: 'feature-panel id-photo-setup-panel' });
  addPanelHeading(setup, 'Photo framing', 'CUSTOM PHOTO SIZE');
  const sourceActions = document.createElement('div');
  sourceActions.className = 'id-photo-source-actions';
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = '.jpg,.jpeg,.png,.webp';
  fileInput.hidden = true;
  fileInput.dataset.idPhotoFileInput = 'true';
  const choose = createButton({ label: image ? 'Replace photo' : 'Choose a photo', variant: 'primary' });
  choose.dataset.idPhotoChoose = 'true';
  choose.addEventListener('click', () => fileInput.click());
  sourceActions.append(choose);
  if (canUseEditorImage) {
    const useEditor = createButton({ label: 'Use original editor photo', variant: 'secondary' });
    useEditor.dataset.idPhotoUseEditor = 'true';
    sourceActions.append(useEditor);
  }
  const close = createButton({ label: 'Remove photo', variant: 'secondary', disabled: !image });
  close.dataset.idPhotoClose = 'true';
  sourceActions.append(close);
  const sourceStatus = document.createElement('p');
  sourceStatus.className = 'id-photo-source-status';
  sourceStatus.dataset.idPhotoStatus = 'true';
  sourceStatus.setAttribute('role', 'status');
  sourceStatus.textContent = image ? `${image.alt || 'Photo loaded'} · ${image.naturalWidth} × ${image.naturalHeight} px` : 'Choose a local photo to begin. Nothing is uploaded.';
  setup.append(sourceActions, fileInput, sourceStatus);

  const dimensions = document.createElement('div');
  dimensions.className = 'id-photo-dimension-fields';
  dimensions.append(createNumberField('Photo width', 'photoWidthMm', normalized.photoWidthMm, 5, 200, 'mm'), createNumberField('Photo height', 'photoHeightMm', normalized.photoHeightMm, 5, 200, 'mm'));
  setup.append(dimensions);
  const photoCanvas = document.createElement('canvas');
  photoCanvas.className = 'id-photo-preview-canvas';
  photoCanvas.width = 400;
  photoCanvas.height = 520;
  photoCanvas.setAttribute('role', 'img');
  photoCanvas.setAttribute('aria-label', 'Photo framing preview with approximate alignment guides');
  photoCanvas.dataset.idPhotoPreview = 'true';
  setup.append(photoCanvas);
  const guideNote = document.createElement('p');
  guideNote.className = 'id-photo-guidance-note';
  guideNote.textContent = 'Guides are visual alignment aids. The eye line is approximate and may not match an issuing authority’s requirements.';
  setup.append(guideNote);
  setup.append(createRangeField('Horizontal position', 'positionX', normalized.positionX), createRangeField('Vertical position', 'positionY', normalized.positionY));
  const policy = document.createElement('p');
  policy.className = 'id-photo-policy-note';
  policy.textContent = 'Enter dimensions provided by the receiving authority. No official size or compliance preset is included. This workflow does not reshape, retouch, or otherwise alter identity.';
  setup.append(policy);
  grid.append(setup);

  const print = createCard({ tag: 'section', className: 'feature-panel id-photo-print-panel' });
  addPanelHeading(print, 'Print sheet', 'PHOTO LAYOUT');
  const pageFields = document.createElement('div');
  pageFields.className = 'id-photo-page-fields';
  const paperLabel = document.createElement('label');
  paperLabel.className = 'id-photo-control-field';
  paperLabel.append(createFieldLabel('Paper size'));
  const paper = document.createElement('select');
  paper.dataset.idPhotoSetting = 'paper';
  paper.setAttribute('aria-label', 'Print sheet paper size');
  for (const [value, label] of [['a4', PAPER_PRESETS.a4.label], ['letter', PAPER_PRESETS.letter.label], ['custom', 'Custom']]) {
    const option = document.createElement('option'); option.value = value; option.textContent = label; paper.append(option);
  }
  paper.value = normalized.paper;
  paperLabel.append(paper);
  pageFields.append(paperLabel);
  const orientationLabel = document.createElement('label');
  orientationLabel.className = 'id-photo-control-field';
  orientationLabel.append(createFieldLabel('Page orientation'));
  const orientation = document.createElement('select');
  orientation.dataset.idPhotoSetting = 'orientation';
  orientation.setAttribute('aria-label', 'Print sheet orientation');
  for (const [value, label] of [['portrait', 'Portrait'], ['landscape', 'Landscape']]) {
    const option = document.createElement('option'); option.value = value; option.textContent = label; orientation.append(option);
  }
  orientation.value = normalized.orientation;
  orientationLabel.append(orientation);
  pageFields.append(orientationLabel);
  pageFields.append(createNumberField('Page width', 'paperWidthMm', normalized.paperWidthMm, 50, 500, 'mm'));
  pageFields.append(createNumberField('Page height', 'paperHeightMm', normalized.paperHeightMm, 50, 500, 'mm'));
  pageFields.append(createNumberField('Photo gap', 'gapMm', normalized.gapMm, 0, 30, 'mm'));
  pageFields.append(createNumberField('Page margin', 'marginMm', normalized.marginMm, 0, 50, 'mm'));
  print.append(pageFields);
  const printCanvas = document.createElement('canvas');
  printCanvas.className = 'id-photo-sheet-canvas';
  printCanvas.width = 700;
  printCanvas.height = 990;
  printCanvas.setAttribute('role', 'img');
  printCanvas.setAttribute('aria-label', 'Print sheet preview');
  printCanvas.dataset.idPhotoSheet = 'true';
  print.append(printCanvas);
  const layoutStatus = document.createElement('p');
  layoutStatus.className = 'id-photo-layout-status';
  layoutStatus.dataset.idPhotoLayoutStatus = 'true';
  layoutStatus.setAttribute('role', 'status');
  layoutStatus.setAttribute('aria-live', 'polite');
  layoutStatus.textContent = image ? 'Preparing sheet…' : 'Add a photo to calculate the sheet layout.';
  print.append(layoutStatus);
  const printButton = createButton({ label: 'Print sheet', variant: 'primary', disabled: !image });
  printButton.dataset.idPhotoPrint = 'true';
  print.append(printButton);
  grid.append(print);
  return grid;
}

export function updateIdPhotoStudio(container, image, settings = DEFAULT_ID_PHOTO_SETTINGS) {
  const normalized = normalizeIdPhotoSettings(settings);
  for (const input of container.querySelectorAll('[data-id-photo-number], [data-id-photo-range]')) {
    if (document.activeElement !== input) input.value = String(normalized[input.dataset.idPhotoSetting]);
  }
  const paper = container.querySelector('[data-id-photo-setting="paper"]');
  if (paper) paper.value = normalized.paper;
  const orientation = container.querySelector('[data-id-photo-setting="orientation"]');
  if (orientation) { orientation.value = normalized.orientation; orientation.disabled = normalized.paper === 'custom'; }
  const choose = container.querySelector('[data-id-photo-choose]');
  if (choose) choose.textContent = image ? 'Replace photo' : 'Choose a photo';
  const close = container.querySelector('[data-id-photo-close]');
  if (close) close.disabled = !image;
  const status = container.querySelector('[data-id-photo-status]');
  if (status) {
    status.textContent = image
      ? `${image.alt || 'Photo loaded'} · ${image.naturalWidth} × ${image.naturalHeight} px`
      : 'Choose a local photo to begin. Nothing is uploaded.';
    status.setAttribute('role', 'status');
  }
  for (const key of ['paperWidthMm', 'paperHeightMm']) {
    const field = container.querySelector(`[data-id-photo-setting="${key}"]`);
    if (field) field.disabled = normalized.paper !== 'custom';
  }
  const cropAspect = normalized.photoWidthMm / normalized.photoHeightMm;
  const sourceAspect = image ? image.naturalWidth / image.naturalHeight : cropAspect;
  const needsHorizontalCrop = sourceAspect > cropAspect;
  const hasAdjustableCrop = Math.abs(sourceAspect - cropAspect) > 0.0001;
  const positionX = container.querySelector('[data-id-photo-setting="positionX"]');
  const positionY = container.querySelector('[data-id-photo-setting="positionY"]');
  if (positionX) positionX.disabled = !image || !hasAdjustableCrop || !needsHorizontalCrop;
  if (positionY) positionY.disabled = !image || !hasAdjustableCrop || needsHorizontalCrop;
  const photoCanvas = container.querySelector('[data-id-photo-preview]');
  if (photoCanvas) drawIdPhotoPreview(photoCanvas, image, normalized);
  const sheetCanvas = container.querySelector('[data-id-photo-sheet]');
  const layoutStatus = container.querySelector('[data-id-photo-layout-status]');
  const printButton = container.querySelector('[data-id-photo-print]');
  if (!image) {
    if (layoutStatus) layoutStatus.textContent = 'Add a photo to calculate the sheet layout.';
    if (printButton) printButton.disabled = true;
    return;
  }
  try {
    const layout = drawPrintSheet(sheetCanvas, image, normalized, 96);
    const crop = getIdPhotoCropRect(image.naturalWidth, image.naturalHeight, normalized);
    const sourceDpi = Math.round(Math.min(crop.width / (normalized.photoWidthMm / 25.4), crop.height / (normalized.photoHeightMm / 25.4)));
    if (layoutStatus) layoutStatus.textContent = `${layout.copies} photos · ${layout.columns} columns × ${layout.rows} rows · ${layout.pageWidthMm} × ${layout.pageHeightMm} mm · source ${sourceDpi} DPI · sheet ${PRINT_DPI} DPI`;
    if (printButton) printButton.disabled = false;
  } catch (error) {
    if (layoutStatus) layoutStatus.textContent = error instanceof Error ? error.message : 'This print layout is not available.';
    if (printButton) printButton.disabled = true;
    if (sheetCanvas) {
      const context = sheetCanvas.getContext('2d');
      context?.clearRect(0, 0, sheetCanvas.width, sheetCanvas.height);
    }
  }
}

export function printIdPhotoSheet(image, settings = DEFAULT_ID_PHOTO_SETTINGS) {
  const { canvas, layout } = renderPrintSheetCanvas(image, settings);
  const surface = document.createElement('div');
  surface.className = 'id-photo-print-output';
  surface.dataset.printOutput = 'true';
  surface.style.setProperty('--print-page-width', `${layout.pageWidthMm}mm`);
  surface.style.setProperty('--print-page-height', `${layout.pageHeightMm}mm`);
  surface.append(canvas);
  const pageStyle = document.createElement('style');
  pageStyle.dataset.printPage = 'true';
  pageStyle.textContent = `@page { size: ${layout.pageWidthMm}mm ${layout.pageHeightMm}mm; margin: 0; } @media print { html, body { width: ${layout.pageWidthMm}mm !important; height: ${layout.pageHeightMm}mm !important; } }`;
  document.head.append(pageStyle);
  document.body.append(surface);
  try {
    window.print();
  } finally {
    surface.remove();
    pageStyle.remove();
  }
  return layout;
}

function drawPositionGuides(context, x, y, width, height) {
  context.save();
  context.setLineDash([5, 5]);
  context.lineWidth = 1.25;
  context.strokeStyle = 'rgba(20, 28, 32, 0.85)';
  context.beginPath();
  context.rect(x + width * 0.08, y + height * 0.08, width * 0.84, height * 0.84);
  context.moveTo(x + width / 2, y);
  context.lineTo(x + width / 2, y + height);
  context.moveTo(x, y + height * 0.4);
  context.lineTo(x + width, y + height * 0.4);
  context.stroke();
  context.restore();
}

function createNumberField(label, key, value, min, max, suffix) {
  const field = document.createElement('label');
  field.className = 'id-photo-control-field';
  field.append(createFieldLabel(label));
  const row = document.createElement('span');
  row.className = 'id-photo-number-row';
  const input = document.createElement('input');
  input.type = 'number'; input.min = String(min); input.max = String(max); input.step = '0.1'; input.value = String(value);
  input.dataset.idPhotoSetting = key;
  input.dataset.idPhotoNumber = 'true';
  input.setAttribute('aria-label', `${label} in ${suffix}`);
  row.append(input, document.createTextNode(suffix));
  field.append(row);
  return field;
}

function createRangeField(label, key, value) {
  const field = document.createElement('label');
  field.className = 'id-photo-range-field';
  const title = createFieldLabel(label);
  const output = document.createElement('output');
  output.dataset.idPhotoRangeValue = key;
  output.textContent = `${value}%`;
  title.append(output);
  const input = document.createElement('input');
  input.type = 'range'; input.min = '0'; input.max = '100'; input.step = '1'; input.value = String(value);
  input.dataset.idPhotoSetting = key; input.dataset.idPhotoRange = 'true';
  input.setAttribute('aria-label', label);
  input.addEventListener('input', () => { output.textContent = `${input.value}%`; });
  field.append(title, input);
  return field;
}

function createFieldLabel(text) {
  const label = document.createElement('span');
  label.className = 'id-photo-field-label';
  label.textContent = text;
  return label;
}

function addPanelHeading(panel, title, eyebrowText) {
  const header = document.createElement('header');
  header.className = 'feature-panel-heading';
  const group = document.createElement('div');
  const eyebrow = document.createElement('p'); eyebrow.className = 'eyebrow'; eyebrow.textContent = eyebrowText;
  const heading = document.createElement('h3'); heading.textContent = title;
  group.append(eyebrow, heading); header.append(group); panel.append(header);
}

function clampNumber(value, min, max, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback;
}
