// Navigation labels and display metadata stay independent from DOM rendering.
export const navigationItems = [
  { id: 'home', label: 'Home', icon: '⌂', group: 'Workspace' },
  { id: 'editor', label: 'Photo Editor', icon: '▧', group: 'Workspace' },
  { id: 'enhance', label: 'Enhance & Restore', icon: '✧', group: 'Tools' },
  { id: 'id-photo', label: 'ID Photo Studio', icon: '▣', group: 'Tools' },
  { id: 'batch', label: 'Batch Processing', icon: '▤', group: 'Tools' },
  { id: 'models', label: 'Model Manager', icon: '◈', group: 'Manage' },
  { id: 'settings', label: 'Settings', icon: '⚙', group: 'Manage' },
];

export const dashboardQuickActions = [
  { id: 'editor', title: 'Photo Editor', description: 'Open the editing workspace for a photo.', icon: '▧', status: 'Available', available: true },
  { id: 'enhance', title: 'Enhance & Restore', description: 'Improve detail and restore older images.', icon: '✧', status: 'Coming soon', available: false },
  { id: 'id-photo', title: 'ID Photo Studio', description: 'Prepare a photo for an ID or passport.', icon: '▣', status: 'Coming soon', available: false },
  { id: 'batch', title: 'Batch Processing', description: 'Apply a workflow to a group of photos.', icon: '▤', status: 'Coming soon', available: false },
];

export const dashboardFeatureShortcuts = [
  { id: 'editor', title: 'Photo Editor', description: 'Work with a photo in the editor.', icon: '▧' },
  { id: 'models', title: 'Model Manager', description: 'Review optional on-device model settings.', icon: '◈' },
  { id: 'settings', title: 'Settings', description: 'Manage app preferences.', icon: '⚙' },
];
