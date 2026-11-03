import { dashboardFeatureShortcuts, dashboardQuickActions } from './navigation.js';
import { createBadge, createButton, createCard, createEmptyState } from './ui/components.js';

export function renderDashboard(container) {
  container.replaceChildren();

  const hero = document.createElement('section');
  hero.className = 'dashboard-hero';
  hero.setAttribute('aria-labelledby', 'dashboard-title');
  hero.innerHTML = `
    <div class="hero-copy">
      <p class="eyebrow accent">YOUR PRIVATE CREATIVE SPACE</p>
      <h2 id="dashboard-title">Make more of<br />every <em>moment.</em></h2>
      <p class="lede">A thoughtful place to prepare and work with your photos. Your files stay on this device.</p>
    </div>
    <div class="hero-action-wrap">
      <p class="action-note">Photo importing is coming in a future phase.</p>
    </div>`;
  const openPhoto = createButton({ label: '＋  Open Photo  →', variant: 'primary', className: 'hero-action' });
  openPhoto.dataset.navigate = 'editor';
  openPhoto.setAttribute('aria-label', 'Open Photo: go to Photo Editor');
  openPhoto.innerHTML = '<span class="action-icon" aria-hidden="true">＋</span><span><strong>Open Photo</strong><small>Go to Photo Editor</small></span><span class="action-arrow" aria-hidden="true">→</span>';
  hero.querySelector('.hero-action-wrap').prepend(openPhoto);
  container.append(hero);

  const quickSection = document.createElement('section');
  quickSection.className = 'dashboard-section';
  quickSection.setAttribute('aria-labelledby', 'quick-actions-title');
  quickSection.innerHTML = `<div class="section-heading"><div><p class="eyebrow">GET STARTED</p><h2 id="quick-actions-title">Quick actions</h2></div></div>`;
  const quickGrid = document.createElement('div');
  quickGrid.className = 'quick-action-grid';
  for (const action of dashboardQuickActions) {
    const card = action.available
      ? createButton({ label: action.title, className: 'quick-action-card is-available' })
      : document.createElement('article');
    if (!action.available) card.className = 'quick-action-card is-upcoming';
    if (action.available) {
      card.type = 'button';
      card.dataset.navigate = action.id;
      card.setAttribute('aria-label', `${action.title}: ${action.description}`);
    }
    card.innerHTML = `<span class="quick-action-icon" aria-hidden="true">${action.icon}</span><span class="quick-action-copy"><strong>${action.title}</strong><span>${action.description}</span></span><span class="feature-status${action.available ? ' available' : ''}">${action.status}</span>`;
    quickGrid.append(card);
  }
  quickSection.append(quickGrid);
  container.append(quickSection);

  const lowerGrid = document.createElement('div');
  lowerGrid.className = 'dashboard-lower-grid';

  const recent = createCard({ className: 'dashboard-panel recent-panel', tag: 'section', labelledBy: 'recent-title' });
  recent.innerHTML = `<div class="section-heading"><div><p class="eyebrow">YOUR WORK</p><h2 id="recent-title">Recent projects</h2></div></div>`;
  const recentEmpty = createEmptyState({ icon: '▱', title: 'No recent projects yet', description: 'Your projects will appear here when project saving is available.' });
  recentEmpty.classList.add('recent-empty');
  recentEmpty.append(createBadge({ label: 'Nothing stored' }));
  recent.append(recentEmpty);

  const features = createCard({ className: 'dashboard-panel features-panel', tag: 'section', labelledBy: 'features-title' });
  features.innerHTML = `<div class="section-heading"><div><p class="eyebrow">EXPLORE</p><h2 id="features-title">Feature shortcuts</h2></div></div>`;
  const featureList = document.createElement('div');
  featureList.className = 'feature-shortcut-list';
  for (const feature of dashboardFeatureShortcuts) {
    const shortcut = createButton({ label: feature.title, className: 'feature-shortcut' });
    shortcut.dataset.navigate = feature.id;
    shortcut.innerHTML = `<span class="shortcut-icon" aria-hidden="true">${feature.icon}</span><span class="shortcut-copy"><strong>${feature.title}</strong><small>${feature.description}</small></span><span class="shortcut-arrow" aria-hidden="true">→</span>`;
    featureList.append(shortcut);
  }
  features.append(featureList);
  lowerGrid.append(recent, features);
  container.append(lowerGrid);

  const tip = document.createElement('aside');
  tip.className = 'dashboard-tip';
  tip.setAttribute('aria-label', 'Helpful tip');
  tip.innerHTML = `<span class="tip-icon" aria-hidden="true">✦</span><div><p class="eyebrow">A NOTE ABOUT YOUR PHOTOS</p><p>When editing arrives, your images will be processed locally. No account or upload is required.</p></div><span class="tip-tag">PRIVATE BY DESIGN</span>`;
  container.append(tip);
}
