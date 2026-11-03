# UI component APIs

Shared browser UI primitives live in `www/js/ui/components.js`. They use native DOM elements and the existing design tokens in `www/styles.css`; they do not add a framework or dependency. Import only the components a screen needs.

## Buttons, cards and badges

```js
import { createButton, createIconButton, createCard, createBadge } from './ui/components.js';

const save = createButton({ label: 'Save', variant: 'primary', onClick: saveChanges });
const close = createIconButton({ label: 'Close panel', icon: '×', onClick: closePanel });
const panel = createCard({ tag: 'section', className: 'settings-card', labelledBy: 'settings-title' });
const status = createBadge({ label: 'Ready', tone: 'success' });
```

- `createButton({ label, variant, className, type, disabled, onClick })` returns a native button. Variants use the shared `.button` styles.
- `createIconButton({ label, icon, className, type, onClick })` returns a labeled icon button. The icon is hidden from assistive technology.
- `createCard({ tag, className, label, labelledBy })` returns a semantic container using the shared `.card` style.
- `createBadge({ label, tone, className })` returns a text badge. Supported tones are `neutral`, `success`, `warning`, and `danger`.

## Dialogs

```js
import { createDialog } from './ui/components.js';

const dialog = createDialog({
  title: 'Discard changes?',
  description: 'Your unsaved changes will be lost.',
  actions: [
    { label: 'Keep editing', variant: 'secondary' },
    { label: 'Discard', variant: 'primary', onClick: discardChanges },
  ],
});
document.body.append(dialog.element);
dialog.open();
// Later: dialog.close() or dialog.destroy(). Escape is handled by native <dialog>.
```

The returned controller has `element`, `open()`, `close()`, and `destroy()`. Opening uses `showModal()`, traps focus through the platform dialog behavior, supports Escape and backdrop dismissal, and restores focus to the previously focused element after close. `actions` accept button options and may set `closeOnClick: false` when the dialog should remain open.

## Dropdown menus

```js
import { createDropdown } from './ui/components.js';

const menu = createDropdown({
  label: 'More actions',
  items: [{ label: 'Duplicate', value: 'duplicate' }, { label: 'Remove', value: 'remove' }],
  onSelect: (value) => runAction(value),
});
toolbar.append(menu.element);
// Later: menu.open(), menu.close(), or menu.destroy().
```

Items have `{ label, value, disabled }`. Arrow keys move through enabled items; Home and End jump to the first and last; Escape closes and returns focus to the trigger. Clicks outside close the menu. `destroy()` removes its outside-click listener.

## Toast notifications

```js
import { createToastRegion } from './ui/components.js';

const toasts = createToastRegion({ duration: 3500 });
const id = toasts.show('Settings saved.', { tone: 'success' });
toasts.dismiss(id); // or toasts.clear(), toasts.destroy()
```

The region is mounted to `document.body`. `show(message, { tone, timeout, dismissLabel })` returns an ID. A timeout of `0` keeps the toast until dismissed. Tones are `neutral`, `success`, `warning`, and `danger`; danger messages use an alert role. Each toast has a labeled dismiss button.

## Form input

```js
import { createInput } from './ui/components.js';

const email = createInput({ label: 'Email address', type: 'email', required: true, description: 'Used for account recovery.' });
form.append(email.element);
email.setError('Enter a valid email address.');
console.log(email.input.value);
```

Options include `label`, `id`, `type`, `value`, `placeholder`, `description`, `required`, `autocomplete`, and `disabled`. The return value has `element`, `input`, and `setError(message)`. The label is programmatically associated and hint/error text is connected with `aria-describedby`.

## Empty states and loading indicators

```js
import { createEmptyState, createLoadingIndicator } from './ui/components.js';

const empty = createEmptyState({ icon: '▱', title: 'No projects', description: 'Create a project to see it here.' });
const loading = createLoadingIndicator({ label: 'Loading projects' });
loading.hide(); // or loading.show(), loading.setLabel('Refreshing')
```

`createEmptyState({ icon, title, description, action })` optionally accepts the same button options as `createButton`. `createLoadingIndicator({ label, visible })` returns `{ element, setLabel(), show(), hide() }` and exposes a polite status label for assistive technology.

## Styling and accessibility

Component classes are documented alongside their CSS in the reusable component section of `www/styles.css`. Controls inherit token colors, visible `:focus-visible` outlines, reduced-motion support, and light/dark theme values. Prefer native button/input/dialog semantics; keep labels descriptive and do not add clickable `div` elements.
