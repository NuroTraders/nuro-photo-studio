export function createEventBus() {
  const events = new EventTarget();
  return {
    emit(type, detail) { events.dispatchEvent(new CustomEvent(type, { detail })); },
    on(type, listener, options) { events.addEventListener(type, listener, options); },
    off(type, listener, options) { events.removeEventListener(type, listener, options); },
  };
}
