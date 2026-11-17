import { createBadge, createButton, createCard, createEmptyState } from './ui/components.js';
import { ADJUSTMENT_RANGES, DEFAULT_ADJUSTMENTS, hasAdjustmentChanges } from './processing/adjustments.js';
import { FILTER_PRESETS, normalizeFilter } from './processing/filters.js';
import { MAX_OUTPUT_SIDE, getResizeOutputDimensions } from './processing/resize.js';
import { COMPARISON_LABELS } from './editor/comparison.js';
import { createIdPhotoStudio } from './features/id-photo-studio.js';

const screenCopy = {
  editor: { eyebrow: 'PHOTO WORKSPACE', title: 'Photo Editor', intro: 'Open a local image to rotate, crop, adjust color, apply a filter, resize the export, undo edits, and save a new copy. The original file remains unchanged.' },
  enhance: { eyebrow: 'ENHANCE & RESTORE', title: 'Bring out more detail', intro: 'Enhancement and restoration tools are planned. No image processing runs on this screen.' },
  'id-photo': { eyebrow: 'ID PHOTO STUDIO', title: 'Prepare a print-ready photo', intro: 'Set a custom physical photo size, align the framing with visual guides, and arrange copies on a printable sheet. Check the required size with the receiving authority.' },
  batch: { eyebrow: 'BATCH PROCESSING', title: 'Work through a set of photos', intro: 'Batch workflows are planned. There is no queue or image processing yet.' },
  models: { eyebrow: 'MODEL MANAGER', title: 'Optional on-device models', intro: 'No AI models are bundled or installed. Model management will be designed separately with clear source and license details.' },
  settings: { eyebrow: 'PREFERENCES', title: 'Settings', intro: 'Appearance is available from the theme control in the top bar. Additional app preferences are planned.' },
};

export function renderFeatureScreen(container, screenId, options = {}) {
  const content = screenCopy[screenId];
  if (!content) return false;
  container.replaceChildren();
  container.setAttribute('aria-labelledby', 'feature-screen-title');

  const intro = document.createElement('section');
  intro.className = 'feature-screen-intro';
  const eyebrow = document.createElement('p');
  eyebrow.className = 'eyebrow accent';
  eyebrow.textContent = content.eyebrow;
  const heading = document.createElement('h2');
  heading.id = 'feature-screen-title';
  heading.textContent = content.title;
  const lede = document.createElement('p');
  lede.className = 'lede';
  lede.textContent = content.intro;
  intro.append(eyebrow, heading, lede);
  container.append(intro);

  if (screenId === 'id-photo') {
    container.append(createIdPhotoStudio({
      image: options.idPhotoImage,
      settings: options.idPhotoSettings,
      canUseEditorImage: options.canUseEditorImage,
    }));
    const footer = createButton({ label: 'Back to Home', variant: 'secondary', className: 'feature-screen-home' });
    footer.dataset.navigate = 'home';
    container.append(footer);
    return true;
  }

  const layout = screenLayouts[screenId];
  const grid = document.createElement('div');
  grid.className = `feature-screen-grid ${layout.className || ''}`.trim();
  for (const panelSpec of layout.panels) {
    if (screenId === 'editor' && panelSpec.title === 'Image workspace') {
      grid.append(createEditorWorkspace(options));
    } else if (screenId === 'editor' && panelSpec.title === 'Properties') {
      grid.append(createEditorProperties(options.image?.document));
    } else {
      grid.append(createPanel(panelSpec));
    }
  }
  container.append(grid);

  const footer = createButton({ label: 'Back to Home', variant: 'secondary', className: 'feature-screen-home' });
  footer.dataset.navigate = 'home';
  container.append(footer);
  return true;
}

export function updateEditorImageUI(container, image) {
  const workspace = container.querySelector('.editor-workspace-panel');
  if (!workspace) return false;

  const badge = workspace.querySelector('[data-editor-image-badge]');
  if (badge) badge.textContent = image ? 'IMAGE READY' : 'LOCAL IMAGE';

  const openButton = workspace.querySelector('[data-open-image]');
  const actions = workspace.querySelector('.editor-import-actions');
  if (openButton) openButton.textContent = image ? 'Replace image' : 'Open Image';
  let closeButton = workspace.querySelector('[data-close-image]');
  if (image && !closeButton && actions) {
    closeButton = createButton({ label: 'Close image', variant: 'secondary' });
    closeButton.dataset.closeImage = 'true';
    actions.append(closeButton);
  } else if (!image && closeButton) {
    closeButton.remove();
  }

  const status = workspace.querySelector('[data-import-status]');
  if (status) {
    status.textContent = image
      ? 'Original file remains unchanged on this device.'
      : 'Files stay on this device. Nothing is uploaded.';
    status.classList.remove('is-error');
    status.setAttribute('role', 'status');
  }

  workspace.querySelectorAll('[data-viewport-action], [data-transform-action], [data-viewport-zoom], [data-crop-action], [data-crop-ratio], [data-crop-width], [data-crop-height], [data-crop-orientation], [data-adjustment], [data-adjustment-action], [data-image-filter], [data-resize-width], [data-resize-height], [data-resize-lock], [data-resize-action], [data-export-open]').forEach((control) => {
    control.disabled = !image;
  });

  const properties = container.querySelector('.editor-properties-panel');
  properties?.replaceWith(createEditorProperties(image?.document));
  return true;
}

export function updateEditorComparisonUI(container, active, { hasImage = false } = {}) {
  const button = container.querySelector('[data-comparison-toggle]');
  if (!button) return;
  button.disabled = !hasImage;
  button.textContent = active ? 'Show edited' : 'Before';
  button.title = active ? 'Show the edited image' : 'Compare with the original image';
  button.setAttribute('aria-label', active ? COMPARISON_LABELS.after : COMPARISON_LABELS.before);
  button.setAttribute('aria-pressed', String(active));
  const workspace = container.querySelector('.editor-workspace-panel');
  workspace?.classList.toggle('is-comparing', active);
}

export function updateEditorHistoryUI(container, { canUndo = false, canRedo = false, disabled = false } = {}) {
  const undo = container.querySelector('[data-history-action="undo"]');
  const redo = container.querySelector('[data-history-action="redo"]');
  if (undo) undo.disabled = disabled || !canUndo;
  if (redo) redo.disabled = disabled || !canRedo;
}

export function updateEditorAdjustmentsUI(container, adjustments = DEFAULT_ADJUSTMENTS, { hasImage = false, disabled = false } = {}) {
  const normalized = Object.fromEntries(Object.keys(DEFAULT_ADJUSTMENTS).map((key) => {
    const amount = Number(adjustments?.[key]);
    return [key, Number.isFinite(amount) ? amount : 0];
  }));
  for (const key of Object.keys(ADJUSTMENT_RANGES)) {
    const slider = container.querySelector(`[data-adjustment="${key}"]`);
    const output = container.querySelector(`[data-adjustment-value="${key}"]`);
    if (slider && document.activeElement !== slider) slider.value = String(normalized[key]);
    if (output) output.textContent = normalized[key] > 0 ? `+${normalized[key]}` : String(normalized[key]);
    if (slider) slider.disabled = !hasImage || disabled;
  }
  const reset = container.querySelector('[data-adjustment-action="reset"]');
  if (reset) reset.disabled = !hasImage || disabled || !hasAdjustmentChanges(normalized);
}

export function updateEditorFilterUI(container, filter = 'original', { hasImage = false, disabled = false } = {}) {
  const select = container.querySelector('[data-image-filter]');
  if (!select) return;
  select.value = normalizeFilter(filter);
  select.disabled = !hasImage || disabled;
}

export function updateEditorResizeUI(container, { hasImage = false, disabled = false, baseWidth = 0, baseHeight = 0, resize = null, force = false } = {}) {
  const widthInput = container.querySelector('[data-resize-width]');
  const heightInput = container.querySelector('[data-resize-height]');
  const lock = container.querySelector('[data-resize-lock]');
  const reset = container.querySelector('[data-resize-action="reset"]');
  const output = container.querySelector('[data-resize-output]');
  let dimensions = null;
  if (hasImage) dimensions = getResizeOutputDimensions(baseWidth, baseHeight, resize);
  if (widthInput) {
    widthInput.disabled = !hasImage || disabled;
    if (dimensions && (force || document.activeElement !== widthInput)) widthInput.value = String(dimensions.width);
  }
  if (heightInput) {
    heightInput.disabled = !hasImage || disabled;
    if (dimensions && (force || document.activeElement !== heightInput)) heightInput.value = String(dimensions.height);
  }
  if (lock) lock.disabled = !hasImage || disabled;
  if (reset) reset.disabled = !hasImage || disabled || !resize;
  if (output) output.textContent = dimensions ? `${dimensions.width.toLocaleString()} × ${dimensions.height.toLocaleString()} px` : '—';
}

export function updateEditorTransformUI(container, transform = {}) {
  const states = { 'flip-horizontal': Boolean(transform.flipHorizontal), 'flip-vertical': Boolean(transform.flipVertical) };
  for (const [action, pressed] of Object.entries(states)) {
    const button = container.querySelector(`[data-transform-action="${action}"]`);
    if (!button) continue;
    button.setAttribute('aria-pressed', String(pressed));
    button.classList.toggle('is-active', pressed);
  }
}

function createEditorWorkspace({ image, onOpenImage } = {}) {
  const panel = createCard({ tag: 'section', className: 'feature-panel editor-workspace-panel' });
  panel.setAttribute('aria-labelledby', 'panel-image-workspace');
  panel.dataset.editorDropzone = 'true';

  const header = document.createElement('div');
  header.className = 'feature-panel-heading';
  const titleGroup = document.createElement('div');
  const eyebrow = document.createElement('p');
  eyebrow.className = 'eyebrow';
  eyebrow.textContent = 'CANVAS';
  const title = document.createElement('h3');
  title.id = 'panel-image-workspace';
  title.textContent = 'Image workspace';
  titleGroup.append(eyebrow, title);
  const imageBadge = createBadge({ label: image ? 'IMAGE READY' : 'LOCAL IMAGE' });
  imageBadge.dataset.editorImageBadge = 'true';
  const headerActions = document.createElement('div');
  headerActions.className = 'editor-workspace-header-actions';
  const comparisonButton = createButton({ label: 'Before', variant: 'secondary', className: 'comparison-toggle-button', disabled: !image });
  comparisonButton.dataset.comparisonToggle = 'true';
  comparisonButton.setAttribute('aria-label', 'Show original image');
  comparisonButton.setAttribute('aria-pressed', 'false');
  comparisonButton.title = 'Compare with the original image';
  const exportButton = createButton({ label: 'Export', variant: 'primary', disabled: !image });
  exportButton.dataset.exportOpen = 'true';
  exportButton.setAttribute('aria-haspopup', 'dialog');
  exportButton.title = 'Export edited image';
  headerActions.append(comparisonButton, exportButton, imageBadge);
  header.append(titleGroup, headerActions);

  const canvas = document.createElement('div');
  canvas.className = 'canvas-viewport-stage';
  canvas.dataset.viewportStage = 'true';
  const canvasElement = document.createElement('canvas');
  canvasElement.className = 'canvas-viewport-canvas';
  canvasElement.dataset.canvasViewport = 'true';
  canvasElement.hidden = true;
  const empty = placeholder({ icon: '▧', title: 'Your workspace is empty', description: 'Choose a JPG, PNG, or WebP image, or drag one into this workspace.' });
  empty.classList.add('canvas-viewport-empty');
  empty.dataset.canvasEmptyState = 'true';
  canvas.append(canvasElement, empty);

  const fileInput = document.createElement('input');
  fileInput.className = 'editor-file-input';
  fileInput.type = 'file';
  fileInput.id = 'editor-image-file';
  fileInput.hidden = true;
  fileInput.accept = '.jpg,.jpeg,.png,.webp';
  fileInput.tabIndex = -1;
  fileInput.setAttribute('aria-label', 'Choose an image file');
  fileInput.dataset.imageFileInput = 'true';

  const actions = document.createElement('div');
  actions.className = 'editor-import-actions';
  const openButton = createButton({ label: image ? 'Replace image' : 'Open Image', variant: 'primary' });
  openButton.setAttribute('aria-controls', fileInput.id);
  openButton.dataset.openImage = 'true';
  openButton.addEventListener('click', onOpenImage);
  actions.append(openButton);
  if (image) {
    const closeButton = createButton({ label: 'Close image', variant: 'secondary' });
    closeButton.dataset.closeImage = 'true';
    actions.append(closeButton);
  }
  const status = document.createElement('p');
  status.className = 'editor-import-status';
  status.dataset.importStatus = 'true';
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  status.textContent = image ? 'Original file remains unchanged on this device.' : 'Files stay on this device. Nothing is uploaded.';

  panel.append(header, canvas, createViewportControls(Boolean(image)), fileInput, actions, status);
  return panel;
}

function createEditorProperties(documentInfo) {
  if (!documentInfo) {
    return createPanel({ title: 'Properties', eyebrow: 'IMAGE DETAILS', className: 'editor-properties-panel', content: () => placeholder({ icon: '⌁', title: 'No image selected', description: 'Dimensions and file information will appear here after you open an image.' }) });
  }
  const panel = createCard({ tag: 'section', className: 'feature-panel editor-properties-panel' });
  panel.setAttribute('aria-labelledby', 'panel-editor-properties');
  const header = document.createElement('div');
  header.className = 'feature-panel-heading';
  const eyebrow = document.createElement('p');
  eyebrow.className = 'eyebrow';
  eyebrow.textContent = 'IMAGE DETAILS';
  const title = document.createElement('h3');
  title.id = 'panel-editor-properties';
  title.textContent = 'Properties';
  const titleGroup = document.createElement('div');
  titleGroup.append(eyebrow, title);

  const details = document.createElement('dl');
  details.className = 'editor-image-details';
  const rows = [
    ['File name', documentInfo.name],
    ['Format', documentInfo.mimeType.replace('image/', '').toUpperCase().replace('JPEG', 'JPG')],
    ['Dimensions', `${documentInfo.width.toLocaleString()} × ${documentInfo.height.toLocaleString()} px`],
    ['File size', formatFileSize(documentInfo.size)],
  ];
  for (const [label, value] of rows) {
    const row = document.createElement('div');
    row.className = 'editor-image-detail-row';
    const term = document.createElement('dt');
    term.textContent = label;
    const description = document.createElement('dd');
    description.textContent = value;
    row.append(term, description);
    details.append(row);
  }
  const note = document.createElement('p');
  note.className = 'editor-source-note';
  note.textContent = documentInfo.orientation >= 2 && documentInfo.orientation <= 8
    ? 'Embedded photo orientation is applied for display. The original file is preserved.'
    : 'The original image file is preserved unchanged.';
  header.append(titleGroup);
  panel.append(header, details, note);
  return panel;
}

function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} bytes`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function createPanel({ title, eyebrow, className = '', content, badge }) {
  const panel = createCard({ tag: 'section', className: `feature-panel ${className}`.trim() });
  const titleId = `panel-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  panel.setAttribute('aria-labelledby', titleId);
  const header = document.createElement('div');
  header.className = 'feature-panel-heading';
  const headingGroup = document.createElement('div');
  if (eyebrow) {
    const label = document.createElement('p');
    label.className = 'eyebrow';
    label.textContent = eyebrow;
    headingGroup.append(label);
  }
  const heading = document.createElement('h3');
  heading.id = titleId;
  heading.textContent = title;
  headingGroup.append(heading);
  header.append(headingGroup);
  if (badge) header.append(createBadge({ label: badge }));
  panel.append(header);
  if (typeof content === 'function') panel.append(content());
  else if (content) panel.append(content);
  return panel;
}

function placeholder({ icon = '◇', title, description }) {
  return createEmptyState({ icon, title, description });
}

function textLine(className, text) {
  const element = document.createElement('p');
  element.className = className;
  element.textContent = text;
  return element;
}

function statusTile(label, value, detail) {
  const tile = document.createElement('div');
  tile.className = 'status-tile';
  const caption = document.createElement('span');
  caption.className = 'status-tile-label';
  caption.textContent = label;
  const main = document.createElement('strong');
  main.textContent = value;
  const supporting = document.createElement('small');
  supporting.textContent = detail;
  tile.append(caption, main, supporting);
  return tile;
}

const screenLayouts = {
  editor: {
    className: 'editor-screen-grid',
    panels: [
      { title: 'Image workspace' },
      { title: 'Properties' },
    ],
  },
  enhance: {
    panels: [
      { title: 'Enhance', eyebrow: 'DETAIL & TONE', badge: 'UPCOMING', content: () => placeholder({ icon: '✧', title: 'Enhancement tools are planned', description: 'No enhancement, sharpening, or image processing is available yet.' }) },
      { title: 'Restore', eyebrow: 'PHOTO RESTORATION', badge: 'UPCOMING', content: () => placeholder({ icon: '✦', title: 'Restoration tools are planned', description: 'Repair and restoration workflows are not available yet.' }) },
    ],
  },
  batch: {
    className: 'batch-screen-grid',
    panels: [
      { title: 'Batch queue', eyebrow: '0 ITEMS', badge: 'NOT ACTIVE', className: 'batch-queue-panel', content: () => placeholder({ icon: '▤', title: 'Your queue is empty', description: 'Adding images and batch processing will be available in a future phase.' }) },
      { title: 'Add images', eyebrow: 'IMPORT', badge: 'UPCOMING', content: () => placeholder({ icon: '＋', title: 'Batch import is not available', description: 'This placeholder does not open a file picker or modify images.' }) },
      { title: 'Processing summary', eyebrow: 'SUMMARY', content: () => {
        const summary = document.createElement('div');
        summary.className = 'status-tile-grid';
        summary.append(statusTile('Queued', '—', 'No queue yet'), statusTile('Completed', '—', 'No processing has run'));
        return summary;
      } },
    ],
  },
  models: {
    className: 'models-screen-grid',
    panels: [
      { title: 'Available models', eyebrow: 'MODEL LIBRARY', badge: 'NO MODELS CONFIGURED', className: 'model-list-panel', content: () => placeholder({ icon: '◈', title: 'No models are listed', description: 'A verified model catalog has not been configured. No model files are installed.' }) },
      { title: 'Installation status', eyebrow: 'LOCAL STATUS', content: () => statusTile('Installed models', 'None', 'Model installation is not available') },
      { title: 'Storage', eyebrow: 'LOCAL MODEL STORAGE', content: () => statusTile('Model storage', 'Not in use', 'No model storage is configured') },
    ],
  },
  settings: {
    panels: [
      { title: 'Appearance', eyebrow: 'THEME', content: () => {
        const appearance = document.createElement('div');
        appearance.className = 'settings-row';
        appearance.append(textLine('settings-row-title', 'Color theme'), textLine('settings-row-description', 'Use the theme switch in the top bar to change between dark and light themes.'));
        return appearance;
      } },
      { title: 'Application preferences', eyebrow: 'PREFERENCES', badge: 'MORE OPTIONS COMING SOON', content: () => placeholder({ icon: '⚙', title: 'Additional preferences are planned', description: 'No non-theme preference controls are available yet.' }) },
      { title: 'Storage', eyebrow: 'LOCAL DATA', content: () => statusTile('Saved app data', 'None', 'Project and preference storage is not implemented') },
      { title: 'About', eyebrow: 'NURO PHOTO STUDIO', content: () => {
        const about = document.createElement('div');
        about.className = 'about-info';
        about.append(statusTile('App version', '0.2.0', 'Current project version'), textLine('about-copy', 'Private by design. Photo files are not uploaded by this app shell.'));
        return about;
      } },
    ],
  },
};

function createViewportControls(hasImage = false) {
  const controls = document.createElement('div');
  controls.className = 'viewport-controls';
  const toolbar = document.createElement('div');
  toolbar.className = 'viewport-toolbar';
  toolbar.setAttribute('role', 'group');
  toolbar.setAttribute('aria-label', 'Canvas zoom controls');

  const zoomOut = createButton({ label: '−', variant: 'secondary', className: 'viewport-step-button', disabled: !hasImage });
  zoomOut.setAttribute('aria-label', 'Zoom out');
  zoomOut.dataset.viewportAction = 'zoom-out';
  const slider = document.createElement('input');
  slider.className = 'viewport-zoom-slider';
  slider.type = 'range';
  slider.min = '1';
  slider.max = '800';
  slider.step = '1';
  slider.value = '100';
  slider.disabled = !hasImage;
  slider.setAttribute('aria-label', 'Zoom level');
  slider.dataset.viewportZoom = 'true';
  const zoomLabel = document.createElement('output');
  zoomLabel.className = 'viewport-zoom-label';
  zoomLabel.dataset.viewportZoomLabel = 'true';
  zoomLabel.setAttribute('aria-live', 'polite');
  zoomLabel.textContent = '100%';
  const zoomIn = createButton({ label: '+', variant: 'secondary', className: 'viewport-step-button', disabled: !hasImage });
  zoomIn.setAttribute('aria-label', 'Zoom in');
  zoomIn.dataset.viewportAction = 'zoom-in';
  const fit = createButton({ label: 'Fit to screen', variant: 'secondary', disabled: !hasImage });
  fit.dataset.viewportAction = 'fit';
  const actual = createButton({ label: 'Actual size', variant: 'secondary', disabled: !hasImage });
  actual.dataset.viewportAction = 'actual-size';
  toolbar.append(zoomOut, slider, zoomLabel, zoomIn, fit, actual);
  controls.append(toolbar);

  const transformToolbar = document.createElement('div');
  transformToolbar.className = 'viewport-toolbar transform-toolbar';
  transformToolbar.setAttribute('role', 'group');
  transformToolbar.setAttribute('aria-label', 'Image rotation and flip controls');
  for (const [action, label, title, paths] of [
    ['rotate-ccw', 'Rotate 90° counter-clockwise (Shift+R)', 'Rotate counter-clockwise', ['M3.5 9a7 7 0 1 1 2.2 6.1', 'M3.5 3.5V9H9']],
    ['rotate-cw', 'Rotate 90° clockwise (R)', 'Rotate clockwise', ['M16.5 9a7 7 0 1 0-2.2 6.1', 'M16.5 3.5V9H11']],
    ['flip-horizontal', 'Flip horizontally', 'Flip horizontal', ['M10 3v14', 'M6 6 3 10l3 4', 'M14 6l3 4-3 4']],
    ['flip-vertical', 'Flip vertically', 'Flip vertical', ['M3 10h14', 'M6 6 10 3l4 3', 'M6 14l4 3 4-3']],
  ]) {
    const button = createButton({ label: '', variant: 'secondary', className: 'transform-icon-button', disabled: !hasImage });
    button.setAttribute('aria-label', label);
    if (action.startsWith('flip-')) button.setAttribute('aria-pressed', 'false');
    button.title = title;
    button.append(createSvgIcon(paths));
    button.dataset.transformAction = action;
    transformToolbar.append(button);
  }
  controls.append(transformToolbar);

  const historyToolbar = document.createElement('div');
  historyToolbar.className = 'viewport-toolbar history-toolbar';
  historyToolbar.setAttribute('role', 'group');
  historyToolbar.setAttribute('aria-label', 'Edit history controls');
  for (const [action, label, title, path] of [
    ['undo', 'Undo', 'Undo (Ctrl+Z)', 'M8 7 3 11l5 4M3 11h8a6 6 0 0 1 6 6'],
    ['redo', 'Redo', 'Redo (Ctrl+Y / Ctrl+Shift+Z)', 'M12 7l5 4-5 4m5-4H9a6 6 0 0 0-6 6'],
  ]) {
    const button = createButton({ label: '', variant: 'secondary', className: 'transform-icon-button history-icon-button', disabled: true });
    button.setAttribute('aria-label', label);
    button.title = title;
    button.dataset.historyAction = action;
    button.append(createSvgIcon([path]));
    historyToolbar.append(button);
  }
  controls.append(historyToolbar);

  const adjustmentPanel = document.createElement('section');
  adjustmentPanel.className = 'adjustment-panel';
  adjustmentPanel.setAttribute('aria-labelledby', 'editor-adjustments-title');
  adjustmentPanel.setAttribute('aria-describedby', 'editor-adjustments-note');
  const adjustmentHeader = document.createElement('div');
  adjustmentHeader.className = 'adjustment-panel-header';
  const adjustmentTitle = document.createElement('h4');
  adjustmentTitle.id = 'editor-adjustments-title';
  adjustmentTitle.textContent = 'Color & tone';
  const resetAdjustments = createButton({ label: 'Reset', variant: 'secondary', className: 'adjustment-reset-button', disabled: true });
  resetAdjustments.dataset.adjustmentAction = 'reset';
  resetAdjustments.title = 'Reset color and tone adjustments';
  adjustmentHeader.append(adjustmentTitle, resetAdjustments);
  const adjustmentNote = document.createElement('p');
  adjustmentNote.className = 'adjustment-panel-note';
  adjustmentNote.id = 'editor-adjustments-note';
  adjustmentNote.textContent = '0 is neutral. The original image remains unchanged.';
  const adjustmentGrid = document.createElement('div');
  adjustmentGrid.className = 'adjustment-grid';
  for (const [key, config] of Object.entries(ADJUSTMENT_RANGES)) {
    const field = document.createElement('label');
    field.className = 'adjustment-field';
    const fieldHeader = document.createElement('span');
    fieldHeader.className = 'adjustment-field-header';
    const label = document.createElement('span');
    label.textContent = config.label;
    const output = document.createElement('output');
    output.dataset.adjustmentValue = key;
    output.setAttribute('aria-live', 'polite');
    output.textContent = '0';
    fieldHeader.append(label, output);
    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = String(config.min);
    slider.max = String(config.max);
    slider.step = String(config.step);
    slider.value = '0';
    slider.disabled = !hasImage;
    slider.dataset.adjustment = key;
    slider.setAttribute('aria-label', config.label);
    field.append(fieldHeader, slider);
    adjustmentGrid.append(field);
  }
  adjustmentPanel.append(adjustmentHeader, adjustmentNote, adjustmentGrid);
  controls.append(adjustmentPanel);

  const filterPanel = document.createElement('section');
  filterPanel.className = 'filter-panel';
  const filterLabel = document.createElement('label');
  filterLabel.className = 'filter-select-field';
  const filterTitle = document.createElement('span');
  filterTitle.textContent = 'Filter';
  const filterSelect = document.createElement('select');
  filterSelect.className = 'filter-select';
  filterSelect.dataset.imageFilter = 'true';
  filterSelect.setAttribute('aria-label', 'Image filter');
  filterSelect.disabled = !hasImage;
  for (const [value, preset] of Object.entries(FILTER_PRESETS)) {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = preset.label;
    filterSelect.append(option);
  }
  filterLabel.append(filterTitle, filterSelect);
  filterPanel.append(filterLabel);
  controls.append(filterPanel);

  const resizePanel = document.createElement('section');
  resizePanel.className = 'resize-panel';
  resizePanel.setAttribute('aria-labelledby', 'editor-resize-title');
  resizePanel.setAttribute('aria-describedby', 'editor-resize-note');
  const resizeHeader = document.createElement('div');
  resizeHeader.className = 'adjustment-panel-header';
  const resizeTitle = document.createElement('h4');
  resizeTitle.id = 'editor-resize-title';
  resizeTitle.textContent = 'Resize export';
  const resetResize = createButton({ label: 'Reset', variant: 'secondary', className: 'adjustment-reset-button', disabled: true });
  resetResize.dataset.resizeAction = 'reset';
  resetResize.title = 'Use the original effective image dimensions';
  resizeHeader.append(resizeTitle, resetResize);
  const resizeNote = document.createElement('p');
  resizeNote.className = 'adjustment-panel-note';
  resizeNote.id = 'editor-resize-note';
  resizeNote.textContent = 'The canvas preview stays fit to screen; these dimensions apply to export.';
  const resizeFields = document.createElement('div');
  resizeFields.className = 'resize-dimensions';
  for (const [dimension, labelText] of [['width', 'Width'], ['height', 'Height']]) {
    const field = document.createElement('label');
    field.className = 'resize-field';
    const label = document.createElement('span');
    label.textContent = labelText;
    const input = document.createElement('input');
    input.type = 'number';
    input.min = '1';
    input.max = String(MAX_OUTPUT_SIDE);
    input.step = '1';
    input.inputMode = 'numeric';
    input.disabled = !hasImage;
    input.dataset[dimension === 'width' ? 'resizeWidth' : 'resizeHeight'] = 'true';
    input.setAttribute('aria-label', `Export width in pixels`);
    if (dimension === 'height') input.setAttribute('aria-label', 'Export height in pixels');
    field.append(label, input);
    resizeFields.append(field);
  }
  const resizeLockLabel = document.createElement('label');
  resizeLockLabel.className = 'resize-lock-label';
  const resizeLock = document.createElement('input');
  resizeLock.type = 'checkbox';
  resizeLock.checked = true;
  resizeLock.disabled = !hasImage;
  resizeLock.dataset.resizeLock = 'true';
  resizeLockLabel.append(resizeLock, document.createTextNode(' Lock aspect ratio'));
  const resizeOutput = document.createElement('p');
  resizeOutput.className = 'resize-output';
  resizeOutput.dataset.resizeOutput = 'true';
  resizeOutput.setAttribute('aria-live', 'polite');
  resizeOutput.textContent = '—';
  const resizeError = document.createElement('p');
  resizeError.className = 'resize-error';
  resizeError.dataset.resizeError = 'true';
  resizeError.setAttribute('role', 'status');
  resizeError.setAttribute('aria-live', 'polite');
  resizeError.hidden = true;
  resizePanel.append(resizeHeader, resizeNote, resizeFields, resizeLockLabel, resizeOutput, resizeError);
  controls.append(resizePanel);

  const upcoming = document.createElement('div');
  upcoming.className = 'viewport-upcoming-tools';
  const upcomingLabel = document.createElement('p');
  upcomingLabel.className = 'eyebrow';
  upcomingLabel.textContent = 'UPCOMING EDITING TOOLS';
  const tools = document.createElement('div');
  tools.className = 'tool-placeholder-list';
  for (const tool of ['Compare']) {
    const item = document.createElement('span');
    item.className = 'tool-placeholder';
    item.textContent = tool;
    tools.append(item);
  }
  upcoming.append(upcomingLabel, tools);
  controls.append(upcoming);

  const cropToolbar = document.createElement('div');
  cropToolbar.className = 'viewport-toolbar crop-toolbar';
  cropToolbar.setAttribute('role', 'group');
  cropToolbar.setAttribute('aria-label', 'Crop controls');
  const cropBegin = createButton({ label: 'Crop', variant: 'secondary', className: 'crop-action-button', disabled: !hasImage });
  cropBegin.setAttribute('aria-label', 'Crop');
  cropBegin.title = 'Crop image';
  cropBegin.dataset.cropAction = 'begin';
  cropToolbar.append(cropBegin);

  const cropSettings = document.createElement('div');
  cropSettings.className = 'crop-settings';
  cropSettings.hidden = true;
  const ratioLabel = document.createElement('label');
  ratioLabel.className = 'crop-ratio-control';
  ratioLabel.append(document.createTextNode('Ratio '));
  const ratioSelect = document.createElement('select');
  ratioSelect.className = 'crop-ratio-select';
  ratioSelect.dataset.cropRatio = 'true';
  ratioSelect.setAttribute('aria-label', 'Crop aspect ratio');
  ratioSelect.title = 'Choose crop aspect ratio';
  ratioSelect.disabled = !hasImage;
  for (const [value, label] of [
    ['freeform', 'Freeform'], ['original', 'Original'], ['1:1', '1:1'], ['4:3', '4:3'], ['3:4', '3:4'],
    ['16:9', '16:9'], ['9:16', '9:16'], ['3:2', '3:2'], ['2:3', '2:3'],
  ]) {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = label;
    ratioSelect.append(option);
  }
  ratioLabel.append(ratioSelect);
  cropSettings.append(ratioLabel);

  const orientationButton = createButton({ label: '', variant: 'secondary', className: 'crop-orientation-button', disabled: !hasImage });
  orientationButton.append(createSvgIcon(['M2.5 4h6v12h-6z', 'M11.5 6h6v8h-6z', 'M6 2.5 8.5 4.5 6 6.5', 'M14 17.5l-2.5-2 2.5-2']));
  orientationButton.setAttribute('aria-label', 'Rotate crop orientation');
  orientationButton.title = 'Rotate crop orientation / Swap W×H (X)';
  orientationButton.dataset.cropOrientation = 'true';
  cropSettings.append(orientationButton);

  const dimensions = document.createElement('div');
  dimensions.className = 'crop-pixel-dimensions';
  dimensions.dataset.cropDimensions = 'true';
  dimensions.setAttribute('role', 'group');
  dimensions.setAttribute('aria-label', 'Crop pixel dimensions');
  for (const [dimension, labelText] of [['width', 'W'], ['height', 'H']]) {
    if (dimension === 'height') {
      const multiply = document.createElement('span');
      multiply.className = 'crop-dimensions-multiply';
      multiply.setAttribute('aria-hidden', 'true');
      multiply.textContent = '×';
      dimensions.append(multiply);
    }
    const field = document.createElement('label');
    field.className = 'crop-pixel-field';
    const label = document.createElement('span');
    label.textContent = labelText;
    const input = document.createElement('input');
    input.type = 'number';
    input.min = '20';
    input.step = '1';
    input.inputMode = 'numeric';
    input.disabled = !hasImage;
    input.dataset[`crop${dimension[0].toUpperCase()}${dimension.slice(1)}`] = 'true';
    input.setAttribute('aria-label', `Crop ${dimension} in pixels`);
    field.append(label, input);
    dimensions.append(field);
  }
  const pixelSuffix = document.createElement('span');
  pixelSuffix.className = 'crop-pixel-suffix';
  pixelSuffix.textContent = 'px';
  dimensions.append(pixelSuffix);
  cropSettings.append(dimensions);
  cropToolbar.append(cropSettings);

  for (const [action, label, ariaLabel, variant, icon] of [
    ['apply', 'Apply', 'Apply crop', 'primary', ['M4 10.5 8.2 14.5 16 5.5']],
    ['cancel', 'Cancel', 'Cancel crop', 'secondary', null],
    ['reset', 'Reset', 'Reset crop', 'secondary', null],
  ]) {
    const button = createButton({ label, variant, className: `crop-action-button crop-action-${action}`, disabled: !hasImage });
    button.setAttribute('aria-label', ariaLabel);
    button.title = ariaLabel;
    if (icon) { button.replaceChildren(createSvgIcon(icon)); button.append(document.createTextNode(' Apply')); }
    button.dataset.cropAction = action;
    button.hidden = action !== 'reset';
    cropToolbar.append(button);
  }
  controls.append(cropToolbar);
  return controls;
}

function createSvgIcon(paths) {
  const namespace = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(namespace, 'svg');
  svg.setAttribute('viewBox', '0 0 20 20');
  svg.setAttribute('width', '20');
  svg.setAttribute('height', '20');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  for (const definition of paths) {
    const path = document.createElementNS(namespace, 'path');
    path.setAttribute('d', definition);
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', 'currentColor');
    path.setAttribute('stroke-width', '1.8');
    path.setAttribute('stroke-linecap', 'round');
    path.setAttribute('stroke-linejoin', 'round');
    svg.append(path);
  }
  return svg;
}

export function updateEditorCropUI(container, { hasImage, cropMode, hasCrop, draftCrop, cropBounds, ratioPreset = 'freeform', originalOrientation = 'Landscape', forceDimensions = false, comparisonMode = false }) {
  const controls = container.querySelectorAll('[data-crop-action]');
  controls.forEach((button) => {
    const action = button.dataset.cropAction;
    button.disabled = !hasImage || comparisonMode;
    button.hidden = (action === 'begin' && cropMode) || ((action === 'apply' || action === 'cancel') && !cropMode);
    if (action === 'reset') button.disabled = !hasImage || comparisonMode || (!hasCrop && !cropMode);
  });
  const settings = container.querySelector('.crop-settings');
  const ratio = container.querySelector('[data-crop-ratio]');
  if (settings) settings.hidden = !cropMode;
  if (ratio) { ratio.disabled = !hasImage || comparisonMode || !cropMode; ratio.value = ratioPreset; }
  const originalOption = ratio?.querySelector('option[value="original"]');
  if (originalOption) originalOption.textContent = `Original (${originalOrientation})`;
  const orientationButton = container.querySelector('[data-crop-orientation]');
  if (orientationButton) { orientationButton.disabled = !hasImage || comparisonMode || !cropMode; orientationButton.hidden = !cropMode; }
  for (const [dimension, dataKey] of [['width', 'cropWidth'], ['height', 'cropHeight']]) {
    const input = container.querySelector(`[data-${dataKey.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}]`);
    if (!input) continue;
    input.disabled = !hasImage || comparisonMode || !cropMode;
    if (cropBounds) input.max = String(Math.floor(cropBounds[dimension]));
    if (draftCrop && (forceDimensions || document.activeElement !== input)) input.value = String(Math.max(1, Math.round(draftCrop[dimension])));
  }
  container.querySelectorAll('[data-transform-action], [data-viewport-action], [data-viewport-zoom], [data-adjustment], [data-adjustment-action], [data-image-filter], [data-resize-width], [data-resize-height], [data-resize-lock], [data-resize-action]').forEach((control) => {
    control.disabled = !hasImage || cropMode || comparisonMode;
  });
}
