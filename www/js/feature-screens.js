import { createBadge, createButton, createCard, createEmptyState } from './ui/components.js';

const screenCopy = {
  editor: { eyebrow: 'PHOTO WORKSPACE', title: 'Photo Editor', intro: 'A focused workspace for your photo. Import and editing tools will be added in a future phase.' },
  enhance: { eyebrow: 'ENHANCE & RESTORE', title: 'Bring out more detail', intro: 'Enhancement and restoration tools are planned. No image processing runs on this screen.' },
  'id-photo': { eyebrow: 'ID PHOTO STUDIO', title: 'Prepare an ID photo', intro: 'Photo sizes, background controls, positioning guides, and print layouts are planned for a later phase.' },
  batch: { eyebrow: 'BATCH PROCESSING', title: 'Work through a set of photos', intro: 'Batch workflows are planned. There is no queue or image processing yet.' },
  models: { eyebrow: 'MODEL MANAGER', title: 'Optional on-device models', intro: 'No AI models are bundled or installed. Model management will be designed separately with clear source and license details.' },
  settings: { eyebrow: 'PREFERENCES', title: 'Settings', intro: 'Appearance is available from the theme control in the top bar. Additional app preferences are planned.' },
};

export function renderFeatureScreen(container, screenId) {
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

  const layout = screenLayouts[screenId];
  const grid = document.createElement('div');
  grid.className = `feature-screen-grid ${layout.className || ''}`.trim();
  for (const panelSpec of layout.panels) grid.append(createPanel(panelSpec));
  container.append(grid);

  const footer = createButton({ label: 'Back to Home', variant: 'secondary', className: 'feature-screen-home' });
  footer.dataset.navigate = 'home';
  container.append(footer);
  return true;
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

function visualControl(label, value) {
  const control = document.createElement('div');
  control.className = 'visual-control-placeholder';
  const labelNode = document.createElement('span');
  labelNode.className = 'field-label';
  labelNode.textContent = label;
  const valueNode = document.createElement('div');
  valueNode.className = 'visual-control-value';
  valueNode.textContent = value;
  const note = document.createElement('small');
  note.textContent = 'Control coming soon';
  control.append(labelNode, valueNode, note);
  return control;
}

const screenLayouts = {
  editor: {
    className: 'editor-screen-grid',
    panels: [
      { title: 'Image workspace', eyebrow: 'CANVAS', className: 'editor-workspace-panel', badge: 'IMPORT NOT AVAILABLE', content: () => {
        const canvas = document.createElement('div');
        canvas.className = 'editor-canvas-placeholder';
        canvas.append(placeholder({ icon: '▧', title: 'Your workspace is empty', description: 'Image importing will be added in a future phase.' }));
        return canvas;
      } },
      { title: 'Editing tools', eyebrow: 'TOOLBAR', className: 'editor-toolbar-panel', badge: 'PLANNED', content: () => {
        const tools = document.createElement('div');
        tools.className = 'tool-placeholder-list';
        for (const tool of ['Crop', 'Rotate', 'Adjust', 'Compare', 'Export']) {
          const item = document.createElement('span');
          item.className = 'tool-placeholder';
          item.textContent = tool;
          tools.append(item);
        }
        return tools;
      } },
      { title: 'Properties', eyebrow: 'IMAGE DETAILS', className: 'editor-properties-panel', content: () => placeholder({ icon: '⌁', title: 'No image selected', description: 'Image dimensions and properties will appear here after importing is available.' }) },
    ],
  },
  enhance: {
    panels: [
      { title: 'Enhance', eyebrow: 'DETAIL & TONE', badge: 'UPCOMING', content: () => placeholder({ icon: '✧', title: 'Enhancement tools are planned', description: 'No enhancement, sharpening, or image processing is available yet.' }) },
      { title: 'Restore', eyebrow: 'PHOTO RESTORATION', badge: 'UPCOMING', content: () => placeholder({ icon: '✦', title: 'Restoration tools are planned', description: 'Repair and restoration workflows are not available yet.' }) },
    ],
  },
  'id-photo': {
    className: 'id-screen-grid',
    panels: [
      { title: 'Photo size', eyebrow: 'DOCUMENT SIZE', badge: 'PLANNED', content: () => visualControl('Preset', 'Choose a country and photo size') },
      { title: 'Background & positioning', eyebrow: 'PHOTO SETUP', badge: 'PLANNED', content: () => {
        const controls = document.createElement('div');
        controls.className = 'visual-control-grid';
        controls.append(visualControl('Background', 'Select a background'), visualControl('Position', 'Align subject in frame'));
        return controls;
      } },
      { title: 'Print layout preview', eyebrow: 'PRINT SHEET', badge: 'PLANNED', className: 'print-preview-panel', content: () => {
        const preview = document.createElement('div');
        preview.className = 'print-preview-placeholder';
        preview.append(placeholder({ icon: '▤', title: 'Print preview will appear here', description: 'Photo guides and print sheets are not implemented.' }));
        return preview;
      } },
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
        about.append(statusTile('App version', '0.1.0', 'Current project version'), textLine('about-copy', 'Private by design. Photo files are not uploaded by this app shell.'));
        return about;
      } },
    ],
  },
};
