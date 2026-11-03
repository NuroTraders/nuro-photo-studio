const MIN_ZOOM = 0.01;
const MAX_ZOOM = 8;
const ZOOM_STEP = 1.2;
const MAX_DEVICE_PIXEL_RATIO = 2;

/** Draws a decoded source image into a viewport-sized canvas; it never writes to the source. */
export function createCanvasViewport(canvas, { emptyState = null, onZoomChange = () => {} } = {}) {
  const host = canvas.parentElement;
  const context = canvas.getContext('2d', { alpha: true, desynchronized: true });
  if (!host || !context) throw new Error('A canvas viewport needs a mounted canvas with a 2D context.');

  const controller = new AbortController();
  const { signal } = controller;
  let image = null;
  let zoom = 1;
  let panX = 0;
  let panY = 0;
  let fitMode = true;
  let width = 0;
  let height = 0;
  let pixelRatio = 1;
  let frame = 0;
  let drag = null;

  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'Image viewport. Use the zoom controls to inspect the image.');
  canvas.addEventListener('wheel', handleWheel, { passive: false, signal });
  canvas.addEventListener('pointerdown', handlePointerDown, { signal });
  canvas.addEventListener('pointermove', handlePointerMove, { signal });
  canvas.addEventListener('pointerup', finishPointer, { signal });
  canvas.addEventListener('pointercancel', finishPointer, { signal });
  canvas.addEventListener('lostpointercapture', finishPointer, { signal });
  canvas.addEventListener('keydown', handleKeyDown, { signal });
  window.addEventListener('resize', resize, { passive: true, signal });

  const resizeObserver = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(resize);
  resizeObserver?.observe(host);
  resize();

  return {
    setImage(nextImage) {
      image = nextImage && nextImage.naturalWidth > 0 && nextImage.naturalHeight > 0 ? nextImage : null;
      canvas.hidden = !image;
      if (emptyState) emptyState.hidden = Boolean(image);
      host.classList.toggle('has-image', Boolean(image));
      canvas.setAttribute('aria-label', image
        ? `Image viewport displaying ${image.alt || 'the imported image'}. Use the zoom controls to inspect it.`
        : 'Image viewport is empty.');
      drag = null;
      canvas.classList.remove('is-panning');
      if (image) fitToScreen();
      else {
        fitMode = true;
        zoom = 1;
        panX = 0;
        panY = 0;
        reportZoom();
        scheduleRender();
      }
    },
    fitToScreen,
    actualSize,
    zoomIn() { setZoom(zoom * ZOOM_STEP); },
    zoomOut() { setZoom(zoom / ZOOM_STEP); },
    setZoom,
    getState() { return { zoom, panX, panY, fitMode }; },
    destroy() {
      cancelAnimationFrame(frame);
      frame = 0;
      resizeObserver?.disconnect();
      controller.abort();
      image = null;
      drag = null;
      canvas.classList.remove('is-panning');
      canvas.width = 0;
      canvas.height = 0;
    },
  };

  function resize() {
    const rect = host.getBoundingClientRect();
    const nextWidth = Math.max(0, rect.width);
    const nextHeight = Math.max(0, rect.height);
    const nextRatio = Math.min(Math.max(window.devicePixelRatio || 1, 1), MAX_DEVICE_PIXEL_RATIO);
    const backingWidth = Math.max(1, Math.round(nextWidth * nextRatio));
    const backingHeight = Math.max(1, Math.round(nextHeight * nextRatio));
    const backingChanged = canvas.width !== backingWidth || canvas.height !== backingHeight;

    width = nextWidth;
    height = nextHeight;
    pixelRatio = nextRatio;
    if (backingChanged) {
      canvas.width = backingWidth;
      canvas.height = backingHeight;
    }
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

    if (image && fitMode) {
      zoom = fitZoom();
      panX = 0;
      panY = 0;
      reportZoom();
    }
    scheduleRender();
  }

  function fitZoom() {
    if (!image || width <= 0 || height <= 0) return MIN_ZOOM;
    return clamp(Math.min(width / image.naturalWidth, height / image.naturalHeight), MIN_ZOOM, MAX_ZOOM);
  }

  function fitToScreen() {
    fitMode = true;
    zoom = fitZoom();
    panX = 0;
    panY = 0;
    reportZoom();
    scheduleRender();
  }

  function actualSize() {
    fitMode = false;
    zoom = 1;
    panX = 0;
    panY = 0;
    reportZoom();
    scheduleRender();
  }

  function setZoom(nextZoom, anchorX = width / 2, anchorY = height / 2) {
    if (!image) return;
    const next = clamp(nextZoom, MIN_ZOOM, MAX_ZOOM);
    if (next === zoom) return;
    const centerX = width / 2;
    const centerY = height / 2;
    const imageX = (anchorX - centerX - panX) / zoom;
    const imageY = (anchorY - centerY - panY) / zoom;
    zoom = next;
    panX = anchorX - centerX - imageX * zoom;
    panY = anchorY - centerY - imageY * zoom;
    fitMode = false;
    reportZoom();
    scheduleRender();
  }

  function scheduleRender() {
    if (frame) return;
    frame = requestAnimationFrame(render);
  }

  function render() {
    frame = 0;
    context.clearRect(0, 0, width, height);
    if (!image || width <= 0 || height <= 0) return;
    const drawWidth = image.naturalWidth * zoom;
    const drawHeight = image.naturalHeight * zoom;
    const x = (width - drawWidth) / 2 + panX;
    const y = (height - drawHeight) / 2 + panY;
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    context.drawImage(image, x, y, drawWidth, drawHeight);
  }

  function reportZoom() {
    onZoomChange({ zoom, percent: Math.round(zoom * 100), fitMode });
  }

  function handleWheel(event) {
    if (!image) return;
    event.preventDefault();
    const rect = host.getBoundingClientRect();
    const anchorX = event.clientX - rect.left;
    const anchorY = event.clientY - rect.top;
    setZoom(zoom * Math.exp(-event.deltaY * 0.0015), anchorX, anchorY);
  }

  function handlePointerDown(event) {
    if (!image || event.button !== 0) return;
    event.preventDefault();
    drag = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, panX, panY };
    canvas.classList.add('is-panning');
    canvas.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event) {
    if (!drag || drag.pointerId !== event.pointerId) return;
    event.preventDefault();
    fitMode = false;
    panX = drag.panX + event.clientX - drag.x;
    panY = drag.panY + event.clientY - drag.y;
    scheduleRender();
  }

  function finishPointer(event) {
    if (!drag || drag.pointerId !== event.pointerId) return;
    drag = null;
    canvas.classList.remove('is-panning');
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
  }

  function handleKeyDown(event) {
    if (!image) return;
    const distance = event.shiftKey ? 80 : 24;
    if (event.key === '+' || event.key === '=') zoomIn();
    else if (event.key === '-') zoomOut();
    else if (event.key === '0' || event.key === 'Home') fitToScreen();
    else if (event.key === '1') actualSize();
    else if (event.key === 'ArrowLeft') panBy(distance, 0);
    else if (event.key === 'ArrowRight') panBy(-distance, 0);
    else if (event.key === 'ArrowUp') panBy(0, distance);
    else if (event.key === 'ArrowDown') panBy(0, -distance);
    else return;
    event.preventDefault();
  }

  function panBy(x, y) {
    fitMode = false;
    panX += x;
    panY += y;
    scheduleRender();
  }
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
