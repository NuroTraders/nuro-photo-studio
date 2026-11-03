import { registerServiceWorker } from './bootstrap.js';
import { createImagePreview } from './editor/image-loader.js';
import { createAppState } from './core/state.js';

const state = createAppState();
const picker = document.querySelector('#file-input');
const preview = document.querySelector('#preview');
const emptyState = document.querySelector('#empty-state');
const meta = document.querySelector('#image-meta');
const title = document.querySelector('#canvas-title');
let imagePreview = createImagePreview(preview);

for (const button of document.querySelectorAll('#open-image, #start-editing, #empty-open')) {
  button.addEventListener('click', () => picker.click());
}

picker.addEventListener('change', async () => {
  const file = picker.files?.[0];
  picker.value = '';
  if (!file) return;
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    meta.textContent = 'Choose a JPG, PNG, or WebP image.';
    return;
  }
  try {
    const documentInfo = await imagePreview.show(file);
    state.setActiveDocument(documentInfo);
    emptyState.hidden = true;
    preview.hidden = false;
    title.textContent = documentInfo.name;
    meta.textContent = `${documentInfo.width} × ${documentInfo.height} · ${formatBytes(file.size)}`;
  } catch {
    meta.textContent = 'This image could not be previewed. Try another file.';
  }
});

for (const button of document.querySelectorAll('[data-view]')) {
  button.addEventListener('click', () => {
    if (button.disabled) return;
    document.querySelectorAll('[data-view]').forEach((item) => item.classList.toggle('active', item === button));
    if (button.dataset.view === 'editor' && state.activeDocument) title.textContent = state.activeDocument.name;
  });
}

window.addEventListener('pagehide', () => imagePreview.dispose(), { once: true });
registerServiceWorker();

function formatBytes(bytes) {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
