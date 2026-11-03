export async function registerServiceWorker() {
  if (!('serviceWorker' in navigator) || location.protocol === 'file:') return;
  try {
    await navigator.serviceWorker.register('./sw.js', { scope: './' });
  } catch (error) {
    console.info('Offline shell is unavailable in this session.', error);
  }
}
