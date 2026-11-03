import { registerServiceWorker } from './bootstrap.js';
import { createImagePreview } from './editor/image-loader.js';
import { createAppState } from './core/state.js';
import { navigationItems } from './navigation.js';

const state = createAppState();
const picker = document.querySelector('#file-input');
const preview = document.querySelector('#preview');
const emptyState = document.querySelector('#empty-state');
const meta = document.querySelector('#image-meta');
const title = document.querySelector('#canvas-title');
const screenTitle = document.querySelector('#screen-title');
const navigation = document.querySelector('#navigation-items');
const sidebar = document.querySelector('#sidebar');
const menuToggle = document.querySelector('#menu-toggle');
const backdrop = document.querySelector('#sidebar-backdrop');
const themeToggle = document.querySelector('#theme-toggle');
let imagePreview = createImagePreview(preview);

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

navigation.addEventListener('click', (event) => {
  const button = event.target.closest('[data-view]');
  if (!button) return;
  const item = navigationItems.find((entry) => entry.id === button.dataset.view);
  if (!item) return;
  navigation.querySelectorAll('[data-view]').forEach((entry) => {
    const active = entry === button;
    entry.classList.toggle('active', active);
    entry.setAttribute('aria-current', active ? 'page' : 'false');
  });
  screenTitle.textContent = item.label;
  if (item.id === 'editor' && state.activeDocument) title.textContent = state.activeDocument.name;
  closeMobileNavigation();
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
  if (event.key === 'Escape' && sidebar.classList.contains('is-open')) {
    closeMobileNavigation();
    menuToggle.focus();
  }
});

const root = document.documentElement;
const themeMeta = document.querySelector('meta[name="theme-color"]');
themeToggle.addEventListener('click', () => {
  const light = root.dataset.theme !== 'light';
  root.dataset.theme = light ? 'light' : 'dark';
  themeToggle.setAttribute('aria-pressed', String(light));
  themeToggle.setAttribute('aria-label', light ? 'Switch to dark theme' : 'Switch to light theme');
  themeToggle.querySelector('.theme-label').textContent = light ? 'Dark theme' : 'Light theme';
  themeMeta.content = light ? '#f3f6f3' : '#10151b';
});

window.addEventListener('pagehide', () => imagePreview.dispose(), { once: true });
registerServiceWorker();

function closeMobileNavigation() {
  sidebar.classList.remove('is-open');
  backdrop.hidden = true;
  menuToggle.setAttribute('aria-expanded', 'false');
  menuToggle.setAttribute('aria-label', 'Open navigation');
}

function formatBytes(bytes) {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
