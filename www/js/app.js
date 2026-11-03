import { registerServiceWorker } from './bootstrap.js';
import { renderDashboard } from './dashboard.js';
import { renderFeatureScreen, updateEditorImageUI, updateEditorCropUI, updateEditorHistoryUI, updateEditorTransformUI } from './feature-screens.js';
import { navigationItems } from './navigation.js';
import { loadImageFile, releaseLoadedImage, ImageImportError } from './editor/image-loader.js';
import { createAppState } from './core/state.js';
import { createEditHistory } from './core/edit-history.js';
import { createCanvasViewport } from './editor/viewport.js';
import { invertCropAspectRatio, swapCropAspectPreset } from './editor/crop-tool.js';
import {
  DEFAULT_TRANSFORM, rotateClockwise, rotateCounterClockwise,
  toggleFlipHorizontal, toggleFlipVertical,
} from './editor/transform-tool.js';

const dashboard = document.querySelector('#main');
const screenTitle = document.querySelector('#screen-title');
const navigation = document.querySelector('#navigation-items');
const sidebar = document.querySelector('#sidebar');
const menuToggle = document.querySelector('#menu-toggle');
const backdrop = document.querySelector('#sidebar-backdrop');
const themeToggle = document.querySelector('#theme-toggle');
const appState = createAppState();
let activeImage = null;
let importSequence = 0;
let activeScreen = 'home';
let editorViewport = null;
let activeTransform = { ...DEFAULT_TRANSFORM };
let activeCrop = null;
let cropMode = false;
let activeCropRatio = 'freeform';
let originalCropRatioInverted = false;
const editHistory = createEditHistory();

renderDashboard(dashboard);

let currentGroup = '';
for (const item of navigationItems) {
  if (item.group !== currentGroup) {
    currentGroup = item.group;
    const label = document.createElement('p');
    label.className = 'eyebrow navigation-group-label';
    label.textContent = item.group;
    navigation.append(label);
  }
  const link = document.createElement('button');
  link.className = 'nav-item';
  link.type = 'button';
  link.dataset.view = item.id;
  link.setAttribute('aria-current', item.id === 'home' ? 'page' : 'false');
  const icon = document.createElement('span');
  icon.className = 'nav-icon';
  icon.setAttribute('aria-hidden', 'true');
  icon.textContent = item.icon;
  const label = document.createElement('span');
  label.className = 'nav-label';
  label.textContent = item.label;
  link.append(icon, label);
  navigation.append(link);
}

function navigateTo(screenId) {
  const item = navigationItems.find((entry) => entry.id === screenId);
  if (!item) return;
  if (cropMode) editorViewport?.cancelCrop();
  cropMode = false;
  destroyEditorViewport();
  navigation.querySelectorAll('[data-view]').forEach((entry) => {
    const active = entry.dataset.view === item.id;
    entry.classList.toggle('active', active);
    entry.setAttribute('aria-current', active ? 'page' : 'false');
  });
  screenTitle.textContent = item.label;
  activeScreen = item.id;
  if (item.id === 'home') renderDashboard(dashboard);
  else if (item.id === 'editor') renderEditorScreen();
  else renderFeatureScreen(dashboard, item.id);
  closeMobileNavigation();
}

navigation.addEventListener('click', (event) => {
  const button = event.target.closest('[data-view]');
  if (button) navigateTo(button.dataset.view);
});
dashboard.addEventListener('click', (event) => {
  const button = event.target.closest('[data-navigate]');
  if (button) navigateTo(button.dataset.navigate);
  if (event.target.closest('[data-close-image]')) closeCurrentImage();
  const viewportAction = event.target.closest('[data-viewport-action]')?.dataset.viewportAction;
  if (viewportAction) runViewportAction(viewportAction);
  const transformAction = event.target.closest('[data-transform-action]')?.dataset.transformAction;
  if (transformAction) runTransformAction(transformAction);
  const cropAction = event.target.closest('[data-crop-action]')?.dataset.cropAction;
  if (cropAction) runCropAction(cropAction);
  if (event.target.closest('[data-crop-orientation]')) toggleCropOrientation();
  const historyAction = event.target.closest('[data-history-action]')?.dataset.historyAction;
  if (historyAction) runHistoryAction(historyAction);
});
dashboard.addEventListener('input', (event) => {
  if (event.target.matches('[data-viewport-zoom]')) {
    editorViewport?.setZoom(Number(event.target.value) / 100);
  } else if (event.target.matches('[data-crop-width], [data-crop-height]')) {
    const value = Number(event.target.value);
    if (!Number.isFinite(value) || value <= 0 || !editorViewport) return;
    const state = editorViewport.getState();
    editorViewport.setCropDimensions(
      event.target.matches('[data-crop-width]') ? value : state.draftCrop?.width,
      event.target.matches('[data-crop-height]') ? value : state.draftCrop?.height,
      event.target.matches('[data-crop-width]') ? 'width' : 'height',
    );
    updateCropUI();
  }
});

dashboard.addEventListener('change', (event) => {
  if (event.target.matches('[data-crop-ratio]')) {
    activeCropRatio = event.target.value;
    originalCropRatioInverted = false;
    editorViewport?.setCropAspectRatio(resolveCropAspectRatio());
    updateCropUI();
    return;
  }
  if (event.target.matches('[data-crop-width], [data-crop-height]')) {
    updateCropUI(true);
    return;
  }
  const input = event.target.closest('[data-image-file-input]');
  if (!input) return;
  const files = [...(input.files || [])];
  input.value = '';
  if (files.length > 1) {
    setImportStatus('Choose one image at a time.', true);
    return;
  }
  if (files[0]) importImage(files[0]);
});

dashboard.addEventListener('dragover', (event) => {
  const dropzone = event.target.closest('[data-editor-dropzone]');
  if (!dropzone || !event.dataTransfer?.types.includes('Files')) return;
  event.preventDefault();
  dropzone.classList.add('is-dragging');
  if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
});
dashboard.addEventListener('dragleave', (event) => {
  const dropzone = event.target.closest('[data-editor-dropzone]');
  if (dropzone && !dropzone.contains(event.relatedTarget)) dropzone.classList.remove('is-dragging');
});
dashboard.addEventListener('drop', (event) => {
  const dropzone = event.target.closest('[data-editor-dropzone]');
  if (!dropzone) return;
  event.preventDefault();
  dropzone.classList.remove('is-dragging');
  const files = [...(event.dataTransfer?.files || [])];
  if (files.length > 1) {
    setImportStatus('Drop one image at a time.', true);
    return;
  }
  if (files[0]) importImage(files[0]);
});

async function importImage(file) {
  const sequence = ++importSequence;
  setImportStatus(`Opening ${file.name}…`);
  const dropzone = dashboard.querySelector('[data-editor-dropzone]');
  dropzone?.setAttribute('aria-busy', 'true');
  try {
    const loadedImage = await loadImageFile(file);
    if (sequence !== importSequence) {
      releaseLoadedImage(loadedImage);
      return;
    }
    const previousImage = activeImage;
    activeImage = loadedImage;
    activeTransform = { ...DEFAULT_TRANSFORM };
    activeCrop = null;
    cropMode = false;
    activeCropRatio = 'freeform';
    originalCropRatioInverted = false;
    editHistory.reset(createEditSnapshot());
    appState.setActiveDocument(loadedImage.document);
    if (activeScreen !== 'editor') navigateTo('editor');
    else if (editorViewport) {
      editorViewport.setImage(loadedImage.image);
      editorViewport.setTransform(activeTransform);
      editorViewport.setCropAspectRatio(null);
      updateEditorImageUI(dashboard, loadedImage);
      updateCropUI();
      updateHistoryUI();
    } else renderEditorScreen();
    releaseLoadedImage(previousImage);
  } catch (error) {
    if (sequence !== importSequence) return;
    const message = error instanceof ImageImportError
      ? error.message
      : 'The image could not be opened. Try choosing a different file.';
    setImportStatus(message, true);
  }
}

function setImportStatus(message, isError = false) {
  const status = dashboard.querySelector('[data-import-status]');
  if (!status) return;
  status.textContent = message;
  status.classList.toggle('is-error', isError);
  status.setAttribute('role', isError ? 'alert' : 'status');
  dashboard.querySelector('[data-editor-dropzone]')?.setAttribute('aria-busy', 'false');
}

function closeCurrentImage() {
  importSequence += 1;
  editorViewport?.setImage(null);
  activeTransform = { ...DEFAULT_TRANSFORM };
  activeCrop = null;
  cropMode = false;
  activeCropRatio = 'freeform';
  originalCropRatioInverted = false;
  editHistory.reset(createEditSnapshot());
  releaseLoadedImage(activeImage);
  activeImage = null;
  appState.setActiveDocument(null);
  if (!updateEditorImageUI(dashboard, null)) renderEditorScreen();
  else updateCropUI();
  dashboard.querySelector('[data-open-image]')?.focus();
}

function renderEditorScreen() {
  destroyEditorViewport();
  renderFeatureScreen(dashboard, 'editor', {
    image: activeImage,
    onOpenImage: () => dashboard.querySelector('[data-image-file-input]')?.click(),
  });
  const canvas = dashboard.querySelector('[data-canvas-viewport]');
  if (!canvas) return;
  editorViewport = createCanvasViewport(canvas, {
    emptyState: dashboard.querySelector('[data-canvas-empty-state]'),
    onZoomChange: updateZoomControls,
    onRotate: runTransformAction,
    onCropApply: (crop) => {
      activeCrop = crop;
      cropMode = false;
      editHistory.push(createEditSnapshot());
      updateCropUI();
      updateHistoryUI();
    },
    onCropCancel: () => { cropMode = false; updateCropUI(); updateHistoryUI(); },
    onCropChange: () => updateCropUI(),
  });
  editorViewport.setImage(activeImage?.image ?? null);
  editorViewport.setTransform(activeTransform);
  if (activeCrop) editorViewport.setCrop(activeCrop);
  editorViewport.setCropAspectRatio(resolveCropAspectRatio());
  updateCropUI();
  updateHistoryUI();
  updateTransformUI();
}

function destroyEditorViewport() {
  editorViewport?.destroy();
  editorViewport = null;
}

function runViewportAction(action) {
  if (!editorViewport || cropMode) return;
  if (action === 'zoom-in') editorViewport.zoomIn();
  else if (action === 'zoom-out') editorViewport.zoomOut();
  else if (action === 'fit') editorViewport.fitToScreen();
  else if (action === 'actual-size') editorViewport.actualSize();
}

function runTransformAction(action) {
  if (!activeImage || !editorViewport || cropMode) return;
  if (action === 'rotate-cw') activeTransform = rotateClockwise(activeTransform);
  else if (action === 'rotate-ccw') activeTransform = rotateCounterClockwise(activeTransform);
  else if (action === 'flip-horizontal') activeTransform = toggleFlipHorizontal(activeTransform);
  else if (action === 'flip-vertical') activeTransform = toggleFlipVertical(activeTransform);
  else return;
  editorViewport.setTransform(activeTransform);
  editorViewport.setCropAspectRatio(resolveCropAspectRatio());
  editHistory.push(createEditSnapshot());
  updateHistoryUI();
  updateTransformUI();
}

function runCropAction(action) {
  if (!activeImage || !editorViewport) return;
  if (action === 'begin') {
    editorViewport.setCropAspectRatio(resolveCropAspectRatio());
    cropMode = editorViewport.beginCrop();
  }
  else if (action === 'apply') { activeCrop = editorViewport.applyCrop(); cropMode = false; }
  else if (action === 'cancel') { editorViewport.cancelCrop(); cropMode = false; }
  else if (action === 'reset') {
    editorViewport.resetCrop();
    activeCrop = null;
    activeCropRatio = 'freeform';
    originalCropRatioInverted = false;
    cropMode = false;
    editHistory.push(createEditSnapshot());
  }
  updateCropUI();
  updateHistoryUI();
}

function createEditSnapshot() {
  return {
    ...activeTransform,
    crop: activeCrop ? { x: activeCrop.x, y: activeCrop.y, width: activeCrop.width, height: activeCrop.height } : null,
    aspectRatio: activeCropRatio === 'freeform'
      ? null
      : activeCropRatio === 'original' && originalCropRatioInverted ? 'original:inverted' : activeCropRatio,
  };
}

function updateHistoryUI() {
  if (activeScreen !== 'editor') return;
  updateEditorHistoryUI(dashboard, {
    canUndo: editHistory.canUndo,
    canRedo: editHistory.canRedo,
    disabled: !activeImage || cropMode,
  });
}

function runHistoryAction(action) {
  if (!activeImage || cropMode || activeScreen !== 'editor') return;
  const restored = action === 'undo' ? editHistory.undo() : action === 'redo' ? editHistory.redo() : null;
  if (!restored) return;
  activeTransform = {
    rotation: restored.rotation,
    flipHorizontal: restored.flipHorizontal,
    flipVertical: restored.flipVertical,
  };
  activeCrop = restored.crop;
  activeCropRatio = restored.aspectRatio?.startsWith('original') ? 'original' : restored.aspectRatio || 'freeform';
  originalCropRatioInverted = restored.aspectRatio === 'original:inverted';
  editorViewport?.setTransform(activeTransform);
  editorViewport?.setCrop(activeCrop);
  editorViewport?.setCropAspectRatio(resolveCropAspectRatio());
  updateCropUI(true);
  updateHistoryUI();
  updateTransformUI();
}

function updateTransformUI() {
  if (activeScreen === 'editor') updateEditorTransformUI(dashboard, activeTransform);
}

function toggleCropOrientation() {
  if (!cropMode || !editorViewport) return;
  if (activeCropRatio === 'original') originalCropRatioInverted = !originalCropRatioInverted;
  else activeCropRatio = swapCropAspectPreset(activeCropRatio);
  editorViewport.swapCropOrientation(resolveCropAspectRatio());
  updateCropUI();
}

function updateCropUI(forceDimensions = false) {
  if (activeScreen !== 'editor') return;
  const state = editorViewport?.getState();
  updateEditorCropUI(dashboard, {
    hasImage: Boolean(activeImage), cropMode, hasCrop: Boolean(activeCrop),
    draftCrop: state?.draftCrop, cropBounds: state?.cropBounds, ratioPreset: activeCropRatio,
    originalOrientation: resolveCropAspectRatio() >= 1 ? 'Landscape' : 'Portrait', forceDimensions,
  });
  updateHistoryUI();
  updateTransformUI();
}

function resolveCropAspectRatio() {
  if (activeCropRatio === 'freeform') return null;
  if (activeCropRatio === 'original') {
    if (!activeImage) return null;
    const rotated = activeTransform.rotation === 90 || activeTransform.rotation === 270;
    const ratio = rotated
      ? activeImage.image.naturalHeight / activeImage.image.naturalWidth
      : activeImage.image.naturalWidth / activeImage.image.naturalHeight;
    return originalCropRatioInverted ? invertCropAspectRatio(ratio) : ratio;
  }
  const [width, height] = activeCropRatio.split(':').map(Number);
  return width > 0 && height > 0 ? width / height : null;
}

function updateZoomControls({ percent }) {
  const slider = dashboard.querySelector('[data-viewport-zoom]');
  const output = dashboard.querySelector('[data-viewport-zoom-label]');
  if (slider) slider.value = String(Math.min(800, Math.max(1, percent)));
  if (output) output.value = `${percent}%`;
}

window.addEventListener('pagehide', (event) => {
  if (event.persisted) return;
  importSequence += 1;
  destroyEditorViewport();
  releaseLoadedImage(activeImage);
  activeImage = null;
  activeTransform = { ...DEFAULT_TRANSFORM };
  activeCrop = null;
  activeCropRatio = 'freeform';
  originalCropRatioInverted = false;
  cropMode = false;
  editHistory.reset(createEditSnapshot());
});

menuToggle.addEventListener('click', () => {
  const open = !sidebar.classList.contains('is-open');
  sidebar.classList.toggle('is-open', open);
  backdrop.hidden = !open;
  menuToggle.setAttribute('aria-expanded', String(open));
  menuToggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
  if (open) navigation.querySelector('[data-view].active')?.focus();
});
backdrop.addEventListener('click', closeMobileNavigation);
document.addEventListener('keydown', (event) => {
  const historyModifier = event.ctrlKey || event.metaKey;
  const isUndo = historyModifier && !event.shiftKey && event.key.toLowerCase() === 'z';
  const isRedo = historyModifier && (event.key.toLowerCase() === 'y' || (event.shiftKey && event.key.toLowerCase() === 'z'));
  const target = event.target;
  if (!event.defaultPrevented && (isUndo || isRedo) && activeScreen === 'editor' && activeImage && !cropMode
    && !event.altKey && !document.querySelector('dialog[open]')
    && !target?.matches?.('input, textarea, select, [contenteditable="true"]') && !target?.isContentEditable) {
    runHistoryAction(isUndo ? 'undo' : 'redo');
    event.preventDefault();
    return;
  }
  if (event.key === 'Escape' && cropMode && activeScreen === 'editor') {
    editorViewport?.cancelCrop();
    cropMode = false;
    updateCropUI();
    return;
  }
  if (!event.defaultPrevented && event.key.toLowerCase() === 'x' && cropMode && activeScreen === 'editor'
    && !event.ctrlKey && !event.altKey && !event.metaKey && !document.querySelector('dialog[open]')) {
    const workspace = dashboard.querySelector('.editor-workspace-panel');
    const target = event.target;
    if (workspace?.contains(target) && !target.matches('input, textarea, select, [contenteditable="true"]') && !target.isContentEditable) {
      toggleCropOrientation();
      event.preventDefault();
      return;
    }
  }
  if (!event.defaultPrevented && activeScreen === 'editor' && activeImage && event.key.toLowerCase() === 'r'
    && !event.ctrlKey && !event.altKey && !event.metaKey && !document.querySelector('dialog[open]')) {
    const workspace = dashboard.querySelector('.editor-workspace-panel');
    const target = event.target;
    if (workspace?.contains(target) && !target.matches('input, textarea, select, [contenteditable="true"]') && !target.isContentEditable) {
      runTransformAction(event.shiftKey ? 'rotate-ccw' : 'rotate-cw');
      event.preventDefault();
      return;
    }
  }
  if (event.key === 'Escape' && sidebar.classList.contains('is-open')) {
    closeMobileNavigation();
    menuToggle.focus();
  }
});

const root = document.documentElement;
const themeMeta = document.querySelector('meta[name="theme-color"]');
const themeKey = 'nuro-photo-studio.theme';

function applyTheme(theme, persist = false) {
  const selectedTheme = theme === 'light' ? 'light' : 'dark';
  root.dataset.theme = selectedTheme;
  const isLight = selectedTheme === 'light';
  themeToggle.setAttribute('aria-pressed', String(isLight));
  themeToggle.setAttribute('aria-label', `Switch to ${isLight ? 'dark' : 'light'} theme`);
  themeToggle.querySelector('.theme-label').textContent = `${isLight ? 'Dark' : 'Light'} theme`;
  themeToggle.querySelector('.theme-icon').textContent = isLight ? '☾' : '☼';
  themeMeta.content = isLight ? '#f3f6f3' : '#10151b';
  if (persist) {
    try {
      window.localStorage.setItem(themeKey, selectedTheme);
    } catch {
      // Keep the in-session choice even if persistent storage is unavailable.
    }
  }
}

applyTheme(root.dataset.theme);
themeToggle.addEventListener('click', () => {
  applyTheme(root.dataset.theme === 'light' ? 'dark' : 'light', true);
});

registerServiceWorker();

function closeMobileNavigation() {
  sidebar.classList.remove('is-open');
  backdrop.hidden = true;
  menuToggle.setAttribute('aria-expanded', 'false');
  menuToggle.setAttribute('aria-label', 'Open navigation');
}
