let nextComponentId = 0;

function componentId(prefix) {
  nextComponentId += 1;
  return `${prefix}-${nextComponentId}`;
}

export function createButton({ label, variant = 'secondary', className = '', type = 'button', disabled = false, onClick } = {}) {
  const button = document.createElement('button');
  button.type = type;
  button.className = `button ${variant}${className ? ` ${className}` : ''}`;
  button.textContent = label ?? '';
  button.disabled = disabled;
  if (onClick) button.addEventListener('click', onClick);
  return button;
}

export function createIconButton({ label, icon, className = '', onClick, type = 'button' } = {}) {
  const button = document.createElement('button');
  button.type = type;
  button.className = `icon-button${className ? ` ${className}` : ''}`;
  button.setAttribute('aria-label', label ?? 'Action');
  button.title = label ?? '';
  const glyph = document.createElement('span');
  glyph.setAttribute('aria-hidden', 'true');
  glyph.textContent = icon ?? '';
  button.append(glyph);
  if (onClick) button.addEventListener('click', onClick);
  return button;
}

export function createCard({ className = '', tag = 'section', label, labelledBy } = {}) {
  const card = document.createElement(tag);
  card.className = `card${className ? ` ${className}` : ''}`;
  if (label) card.setAttribute('aria-label', label);
  if (labelledBy) card.setAttribute('aria-labelledby', labelledBy);
  return card;
}

export function createBadge({ label, tone = 'neutral', className = '' } = {}) {
  const badge = document.createElement('span');
  badge.className = `badge${tone !== 'neutral' ? ` ${tone}` : ''}${className ? ` ${className}` : ''}`;
  badge.textContent = label ?? '';
  return badge;
}

export function createDialog({ title, description = '', content, actions = [], closeLabel = 'Close dialog' } = {}) {
  const dialog = document.createElement('dialog');
  dialog.className = 'ui-dialog';
  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-modal', 'true');
  dialog.setAttribute('aria-label', title || 'Dialog');
  const panel = document.createElement('div');
  panel.className = 'ui-dialog-panel';
  const headingId = componentId('dialog-title');
  const heading = document.createElement('h2');
  heading.id = headingId;
  heading.textContent = title ?? '';
  dialog.setAttribute('aria-labelledby', headingId);
  const close = createIconButton({ label: closeLabel, icon: '×', className: 'ui-dialog-close', onClick: () => dialog.close() });
  const header = document.createElement('header');
  header.className = 'ui-dialog-header';
  header.append(heading, close);
  panel.append(header);
  if (description) {
    const summary = document.createElement('p');
    summary.className = 'ui-dialog-description';
    summary.textContent = description;
    panel.append(summary);
  }
  if (content instanceof Node) panel.append(content);
  else if (content != null) {
    const body = document.createElement('div');
    body.className = 'ui-dialog-content';
    body.textContent = String(content);
    panel.append(body);
  }
  if (actions.length) {
    const footer = document.createElement('footer');
    footer.className = 'ui-dialog-actions';
    for (const action of actions) {
      const button = createButton({ ...action, onClick: (event) => {
        action.onClick?.(event, dialog);
        if (action.closeOnClick !== false && dialog.open) dialog.close();
      } });
      footer.append(button);
    }
    panel.append(footer);
  }
  dialog.append(panel);
  let returnFocus = null;
  dialog.addEventListener('close', () => returnFocus?.focus?.());
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });
  return {
    element: dialog,
    open() {
      if (dialog.open) return;
      returnFocus = document.activeElement;
      dialog.showModal();
    },
    close() { if (dialog.open) dialog.close(); },
    destroy() { if (dialog.open) dialog.close(); dialog.remove(); },
  };
}

export function createDropdown({ label, items = [], className = '', onSelect } = {}) {
  const root = document.createElement('div');
  root.className = `ui-dropdown${className ? ` ${className}` : ''}`;
  const menuId = componentId('dropdown-menu');
  const trigger = createButton({ label, className: 'ui-dropdown-trigger' });
  trigger.setAttribute('aria-haspopup', 'menu');
  trigger.setAttribute('aria-expanded', 'false');
  trigger.setAttribute('aria-controls', menuId);
  const menu = document.createElement('div');
  menu.className = 'ui-dropdown-menu';
  menu.id = menuId;
  menu.setAttribute('role', 'menu');
  menu.hidden = true;
  const options = items.map((item) => {
    const option = createButton({ label: item.label, className: 'ui-dropdown-item', disabled: item.disabled });
    option.setAttribute('role', 'menuitem');
    option.tabIndex = -1;
    option.addEventListener('click', () => {
      onSelect?.(item.value, item);
      close(true);
    });
    menu.append(option);
    return option;
  });
  const outsideController = new AbortController();
  root.append(trigger, menu);

  function open(focus = 'none') {
    menu.hidden = false;
    trigger.setAttribute('aria-expanded', 'true');
    if (focus !== 'none') {
      const enabled = options.filter((option) => !option.disabled);
      const target = focus === 'last' ? enabled.at(-1) : enabled[0];
      (target || trigger).focus();
    }
  }
  function close(returnFocus = false) {
    menu.hidden = true;
    trigger.setAttribute('aria-expanded', 'false');
    if (returnFocus) trigger.focus();
  }
  trigger.addEventListener('click', () => menu.hidden ? open('first') : close());
  trigger.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); open(event.key === 'ArrowUp' ? 'last' : 'first'); }
  });
  menu.addEventListener('keydown', (event) => {
    const enabled = options.filter((option) => !option.disabled);
    const current = enabled.indexOf(document.activeElement);
    let next = current;
    if (event.key === 'ArrowDown') next = (current + 1) % enabled.length;
    else if (event.key === 'ArrowUp') next = (current - 1 + enabled.length) % enabled.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = enabled.length - 1;
    else if (event.key === 'Escape') { event.preventDefault(); close(true); return; }
    else return;
    event.preventDefault();
    enabled[next]?.focus();
  });
  document.addEventListener('pointerdown', (event) => {
    if (!root.contains(event.target)) close();
  }, { signal: outsideController.signal });
  return { element: root, trigger, menu, open: () => open('first'), close: () => close(), destroy: () => { outsideController.abort(); root.remove(); } };
}

export function createToastRegion({ duration = 3500, label = 'Notifications' } = {}) {
  const region = document.createElement('div');
  region.className = 'ui-toast-region';
  region.setAttribute('aria-label', label);
  region.setAttribute('aria-live', 'polite');
  region.setAttribute('aria-relevant', 'additions');
  document.body.append(region);
  const timers = new Map();
  const toasts = new Map();

  function dismiss(id) {
    const toast = toasts.get(id);
    if (!toast) return;
    clearTimeout(timers.get(id));
    timers.delete(id);
    toasts.delete(id);
    toast.remove();
  }
  function show(message, { tone = 'neutral', timeout = duration, dismissLabel = 'Dismiss notification' } = {}) {
    const id = componentId('toast');
    const toast = document.createElement('div');
    toast.className = `ui-toast${tone !== 'neutral' ? ` ${tone}` : ''}`;
    toast.dataset.toastId = id;
    toast.setAttribute('role', tone === 'danger' ? 'alert' : 'status');
    const text = document.createElement('span');
    text.className = 'ui-toast-message';
    text.textContent = message;
    const dismissButton = createIconButton({ label: dismissLabel, icon: '×', className: 'ui-toast-dismiss', onClick: () => dismiss(id) });
    toast.append(text, dismissButton);
    region.append(toast);
    toasts.set(id, toast);
    if (timeout > 0) timers.set(id, setTimeout(() => dismiss(id), timeout));
    return id;
  }
  return {
    element: region,
    show,
    dismiss,
    clear() { for (const id of [...toasts.keys()]) dismiss(id); region.replaceChildren(); },
    destroy() { for (const id of [...toasts.keys()]) dismiss(id); region.remove(); },
  };
}

export function createInput({ label, id = componentId('field'), type = 'text', value = '', placeholder = '', description = '', required = false, autocomplete, disabled = false } = {}) {
  const wrapper = document.createElement('div');
  wrapper.className = 'ui-field';
  const labelElement = document.createElement('label');
  labelElement.className = 'field-label';
  labelElement.htmlFor = id;
  labelElement.textContent = label ?? '';
  const input = document.createElement('input');
  input.className = 'field-control';
  input.id = id;
  input.type = type;
  input.value = value;
  input.placeholder = placeholder;
  input.required = required;
  input.disabled = disabled;
  if (autocomplete) input.autocomplete = autocomplete;
  wrapper.append(labelElement, input);
  if (description) {
    const hint = document.createElement('small');
    hint.className = 'ui-field-hint';
    hint.id = `${id}-hint`;
    hint.textContent = description;
    input.setAttribute('aria-describedby', hint.id);
    wrapper.append(hint);
  }
  const error = document.createElement('small');
  error.className = 'ui-field-error';
  error.id = `${id}-error`;
  error.hidden = true;
  wrapper.append(error);
  return {
    element: wrapper,
    input,
    setError(message = '') {
      error.textContent = message;
      error.hidden = !message;
      input.setAttribute('aria-invalid', String(Boolean(message)));
      if (message) input.setAttribute('aria-describedby', [description && `${id}-hint`, `${id}-error`].filter(Boolean).join(' '));
      else if (description) input.setAttribute('aria-describedby', `${id}-hint`);
      else input.removeAttribute('aria-describedby');
    },
  };
}

export function createEmptyState({ icon = '◇', title, description, action } = {}) {
  const state = document.createElement('div');
  state.className = 'ui-empty-state';
  state.setAttribute('role', 'status');
  const glyph = document.createElement('span');
  glyph.className = 'ui-empty-state-icon';
  glyph.setAttribute('aria-hidden', 'true');
  glyph.textContent = icon;
  const heading = document.createElement('h3');
  heading.textContent = title ?? '';
  const copy = document.createElement('p');
  copy.textContent = description ?? '';
  state.append(glyph, heading, copy);
  if (action) state.append(createButton(action));
  return state;
}

export function createLoadingIndicator({ label = 'Loading', visible = true } = {}) {
  const indicator = document.createElement('div');
  indicator.className = 'ui-loading';
  indicator.setAttribute('role', 'status');
  indicator.setAttribute('aria-live', 'polite');
  const spinner = document.createElement('span');
  spinner.className = 'ui-loading-spinner';
  spinner.setAttribute('aria-hidden', 'true');
  const text = document.createElement('span');
  text.className = 'ui-loading-label';
  text.textContent = label;
  indicator.append(spinner, text);
  indicator.hidden = !visible;
  return {
    element: indicator,
    setLabel(nextLabel) { text.textContent = nextLabel; },
    show() { indicator.hidden = false; },
    hide() { indicator.hidden = true; },
  };
}
