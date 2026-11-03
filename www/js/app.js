import { registerServiceWorker } from './bootstrap.js';
import { renderDashboard } from './dashboard.js';
import { renderFeatureScreen } from './feature-screens.js';
import { navigationItems } from './navigation.js';
import { loadImageFile, releaseLoadedImage, ImageImportError } from './editor/image-loader.js';
import { createAppState } from './core/state.js';

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
  navigation.querySelectorAll('[data-view]').forEach((entry) => {
    const active = entry.dataset.view === item.id;
    entry.classList.toggle('active', active);
    entry.setAttribute('aria-current', active ? 'page' : 'false');
  });
  screenTitle.textContent = item.label;
  activeScreen = item.id;
  if (item.id === 'home') renderDashboard(dashboard);
  else renderFeatureScreen(dashboard, item.id, {
    image: activeImage,
    onOpenImage: () => dashboard.querySelector('[data-image-file-input]')?.click(),
  });
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
});

dashboard.addEventListener('change', (event) => {
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
    releaseLoadedImage(activeImage);
    activeImage = loadedImage;
    appState.setActiveDocument(loadedImage.document);
    if (activeScreen !== 'editor') navigateTo('editor');
    else renderFeatureScreen(dashboard, 'editor', {
      image: activeImage,
      onOpenImage: () => dashboard.querySelector('[data-image-file-input]')?.click(),
    });
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
  releaseLoadedImage(activeImage);
  activeImage = null;
  appState.setActiveDocument(null);
  renderFeatureScreen(dashboard, 'editor', {
    onOpenImage: () => dashboard.querySelector('[data-image-file-input]')?.click(),
  });
  dashboard.querySelector('[data-open-image]')?.focus();
}

window.addEventListener('pagehide', (event) => {
  if (event.persisted) return;
  importSequence += 1;
  releaseLoadedImage(activeImage);
  activeImage = null;
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
