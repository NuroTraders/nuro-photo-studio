import { registerServiceWorker } from './bootstrap.js';
import { renderDashboard } from './dashboard.js';
import { renderFeatureScreen } from './feature-screens.js';
import { navigationItems } from './navigation.js';

const dashboard = document.querySelector('#main');
const screenTitle = document.querySelector('#screen-title');
const navigation = document.querySelector('#navigation-items');
const sidebar = document.querySelector('#sidebar');
const menuToggle = document.querySelector('#menu-toggle');
const backdrop = document.querySelector('#sidebar-backdrop');
const themeToggle = document.querySelector('#theme-toggle');

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
  if (item.id === 'home') renderDashboard(dashboard);
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

registerServiceWorker();

function closeMobileNavigation() {
  sidebar.classList.remove('is-open');
  backdrop.hidden = true;
  menuToggle.setAttribute('aria-expanded', 'false');
  menuToggle.setAttribute('aria-label', 'Open navigation');
}
