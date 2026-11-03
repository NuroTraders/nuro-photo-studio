(() => {
  const themeKey = 'nuro-photo-studio.theme';
  let theme = 'dark';
  try {
    const savedTheme = window.localStorage.getItem(themeKey);
    if (savedTheme === 'light' || savedTheme === 'dark') theme = savedTheme;
  } catch {
    // Storage may be unavailable in restricted browser contexts; keep the default theme.
  }
  document.documentElement.dataset.theme = theme;
  const themeColor = document.querySelector('meta[name="theme-color"]');
  if (themeColor) themeColor.content = theme === 'light' ? '#f3f6f3' : '#10151b';
})();
