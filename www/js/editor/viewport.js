import { DEFAULT_TRANSFORM, getTransformedDimensions, normalizeTransform } from './transform-tool.js';
import {
  clampCropRect, createFullCrop, mapCropRectToSource, mapCropRectToVisual,
  conformCropRectToAspect, createCropFromPoints, moveCropRect, resizeCropRect, resizeCropToDimensions, swapCropRectDimensions,
} from './crop-tool.js';

const MIN_ZOOM = 0.01;
const MAX_ZOOM = 8;
const ZOOM_STEP = 1.2;
const MAX_DEVICE_PIXEL_RATIO = 2;
const CROP_HANDLES = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];
const CROP_HANDLE_SIZE = 12;

/** Draws a decoded source image into a viewport-sized canvas; it never writes to the source. */
export function createCanvasViewport(canvas, {
  emptyState = null, onZoomChange = () => {}, onRotate = () => {},
  onCropApply = () => {}, onCropCancel = () => {}, onCropChange = () => {},
} = {}) {
  const host = canvas.parentElement;
  const context = canvas.getContext('2d', { alpha: true, desynchronized: true });
  if (!host || !context) throw new Error('A canvas viewport needs a mounted canvas with a 2D context.');

  const controller = new AbortController();
  const { signal } = controller;
  let image = null;
  let transform = { ...DEFAULT_TRANSFORM };
  let crop = null;
  let cropMode = false;
  let draftCrop = null;
  let cropViewState = null;
  let cropDrag = null;
  let selectedCropHandle = 'se';
  let cropAspectRatio = null;
  let zoom = 1;
  let panX = 0;
  let panY = 0;
  let fitMode = true;
  let width = 0;
  let height = 0;
  let pixelRatio = 1;
  let frame = 0;
  const pointers = new Map();
  let gesture = null;

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
      transform = { ...DEFAULT_TRANSFORM };
      crop = null;
      cropMode = false;
      draftCrop = null;
      cropViewState = null;
      cropDrag = null;
      cropAspectRatio = null;
      clearCropCursorClasses();
      canvas.classList.remove('is-crop-mode');
      canvas.hidden = !image;
      if (emptyState) emptyState.hidden = Boolean(image);
      host.classList.toggle('has-image', Boolean(image));
      canvas.setAttribute('aria-label', image
        ? `Image viewport displaying ${image.alt || 'the imported image'}. Use the zoom controls to inspect it.`
        : 'Image viewport is empty.');
      cancelGesture();
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
    beginCrop,
    applyCrop,
    cancelCrop,
    resetCrop,
    setCrop(nextCrop) {
      crop = image && nextCrop ? clampCropRect(nextCrop, sourceBounds()) : null;
      fitToScreen();
    },
    setCropAspectRatio(ratio) {
      cropAspectRatio = Number.isFinite(ratio) && ratio > 0 ? ratio : null;
      if (cropMode && draftCrop) {
        const bounds = getTransformedDimensions(image.naturalWidth, image.naturalHeight, transform);
        if (cropAspectRatio) draftCrop = conformCropRectToAspect(draftCrop, bounds, cropAspectRatio);
        notifyCropChange();
        scheduleRender();
      }
    },
    setCropDimensions(requestedWidth, requestedHeight, changedDimension) {
      if (!cropMode || !draftCrop) return null;
      const bounds = getTransformedDimensions(image.naturalWidth, image.naturalHeight, transform);
      draftCrop = resizeCropToDimensions(draftCrop, requestedWidth, requestedHeight, changedDimension, bounds, cropAspectRatio);
      notifyCropChange();
      scheduleRender();
      return { ...draftCrop };
    },
    swapCropOrientation(aspectRatio = null) {
      if (!cropMode || !draftCrop) return null;
      const bounds = getTransformedDimensions(image.naturalWidth, image.naturalHeight, transform);
      draftCrop = swapCropRectDimensions(draftCrop, bounds);
      cropAspectRatio = Number.isFinite(aspectRatio) && aspectRatio > 0 ? aspectRatio : null;
      notifyCropChange();
      scheduleRender();
      return { ...draftCrop };
    },
    setTransform(nextTransform) {
      transform = normalizeTransform(nextTransform);
      panX = 0;
      panY = 0;
      if (fitMode) zoom = fitZoom();
      reportZoom();
      scheduleRender();
    },
    actualSize,
    zoomIn() { setZoom(zoom * ZOOM_STEP); },
    zoomOut() { setZoom(zoom / ZOOM_STEP); },
    setZoom,
    getState() {
      return {
        zoom, panX, panY, fitMode,
        transform: { ...transform },
        crop: crop ? { ...crop } : null,
        cropMode,
        draftCrop: draftCrop ? { ...draftCrop } : null,
        cropAspectRatio,
        cropBounds: image ? getTransformedDimensions(image.naturalWidth, image.naturalHeight, transform) : null,
      };
    },
    destroy() {
      cancelAnimationFrame(frame);
      frame = 0;
      resizeObserver?.disconnect();
      controller.abort();
      image = null;
      transform = { ...DEFAULT_TRANSFORM };
      crop = null;
      cropMode = false;
      draftCrop = null;
      cropDrag = null;
      cropAspectRatio = null;
      canvas.classList.remove('is-crop-mode');
      cancelGesture();
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
    const bounds = viewportBounds();
    return clamp(Math.min(width / bounds.width, height / bounds.height), MIN_ZOOM, MAX_ZOOM);
  }

  function viewportBounds() {
    const full = getTransformedDimensions(image.naturalWidth, image.naturalHeight, transform);
    if (cropMode) return full;
    const visualCrop = getVisualCrop();
    return { width: visualCrop.width, height: visualCrop.height };
  }

  function sourceBounds() {
    return { width: image.naturalWidth, height: image.naturalHeight };
  }

  function fullVisualCrop() {
    const bounds = getTransformedDimensions(image.naturalWidth, image.naturalHeight, transform);
    return createFullCrop(bounds.width, bounds.height);
  }

  function getVisualCrop() {
    if (cropMode) return fullVisualCrop();
    if (!crop) return fullVisualCrop();
    return mapCropRectToVisual(crop, image.naturalWidth, image.naturalHeight, transform);
  }

  function beginCrop() {
    if (!image || cropMode) return false;
    cancelGesture();
    cropViewState = { zoom, panX, panY, fitMode };
    cropMode = true;
    const bounds = getTransformedDimensions(image.naturalWidth, image.naturalHeight, transform);
    draftCrop = crop
      ? mapCropRectToVisual(crop, image.naturalWidth, image.naturalHeight, transform)
      : createFullCrop(bounds.width, bounds.height);
    draftCrop = clampCropRect(draftCrop, bounds);
    if (cropAspectRatio) draftCrop = conformCropRectToAspect(draftCrop, bounds, cropAspectRatio);
    selectedCropHandle = 'se';
    fitMode = true;
    zoom = fitZoom();
    panX = 0;
    panY = 0;
    canvas.classList.add('is-crop-mode');
    updateCropAriaLabel();
    reportZoom();
    scheduleRender();
    canvas.focus();
    return true;
  }

  function applyCrop() {
    if (!image || !cropMode || !draftCrop) return null;
    crop = mapCropRectToSource(draftCrop, image.naturalWidth, image.naturalHeight, transform);
    cropMode = false;
    draftCrop = null;
    cropViewState = null;
    cropDrag = null;
    clearCropCursorClasses();
    canvas.classList.remove('is-crop-mode');
    updateCanvasAriaLabel();
    fitMode = true;
    zoom = fitZoom();
    panX = 0;
    panY = 0;
    reportZoom();
    scheduleRender();
    const applied = { ...crop };
    onCropApply(applied);
    return applied;
  }

  function cancelCrop() {
    if (!cropMode) return false;
    const restore = cropViewState;
    cropMode = false;
    draftCrop = null;
    cropViewState = null;
    cropDrag = null;
    clearCropCursorClasses();
    canvas.classList.remove('is-crop-mode');
    updateCanvasAriaLabel();
    if (restore) ({ zoom, panX, panY, fitMode } = restore);
    else {
      fitMode = true;
      zoom = fitZoom();
      panX = 0;
      panY = 0;
    }
    reportZoom();
    scheduleRender();
    onCropCancel();
    return true;
  }

  function resetCrop() {
    if (!image) return;
    if (cropMode) cancelCrop();
    crop = null;
    cropAspectRatio = null;
    fitToScreen();
  }

  function updateCanvasAriaLabel() {
    canvas.setAttribute('aria-label', image
      ? `Image viewport displaying ${image.alt || 'the imported image'}. Use the zoom controls to inspect it.`
      : 'Image viewport is empty.');
  }

  function updateCropAriaLabel() {
    canvas.setAttribute('aria-label', `Crop mode. Selected ${selectedCropHandle} handle. Use bracket keys to select a handle, arrow keys to adjust it, Shift plus an arrow for a 10 pixel step, Enter to apply, or Escape to cancel.`);
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
    const fullBounds = getTransformedDimensions(image.naturalWidth, image.naturalHeight, transform);
    const visualCrop = getVisualCrop();
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    context.save();
    try {
      context.translate(width / 2 + panX, height / 2 + panY);
      context.scale(zoom, zoom);
      if (crop && !cropMode) {
        context.beginPath();
        context.rect(-visualCrop.width / 2, -visualCrop.height / 2, visualCrop.width, visualCrop.height);
        context.clip();
        context.translate(
          fullBounds.width / 2 - visualCrop.x - visualCrop.width / 2,
          fullBounds.height / 2 - visualCrop.y - visualCrop.height / 2,
        );
      }
      context.rotate(transform.rotation * Math.PI / 180);
      context.scale(transform.flipHorizontal ? -1 : 1, transform.flipVertical ? -1 : 1);
      context.drawImage(image, -image.naturalWidth / 2, -image.naturalHeight / 2, image.naturalWidth, image.naturalHeight);
    } finally {
      context.restore();
    }
    if (cropMode && draftCrop) renderCropOverlay(fullBounds);
  }

  function renderCropOverlay(fullBounds) {
    const imageLeft = (width - fullBounds.width * zoom) / 2 + panX;
    const imageTop = (height - fullBounds.height * zoom) / 2 + panY;
    const box = {
      x: imageLeft + draftCrop.x * zoom,
      y: imageTop + draftCrop.y * zoom,
      width: draftCrop.width * zoom,
      height: draftCrop.height * zoom,
    };
    const right = box.x + box.width;
    const bottom = box.y + box.height;
    context.save();
    try {
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      context.fillStyle = 'rgba(0, 0, 0, 0.65)';
      context.fillRect(0, 0, width, Math.max(0, box.y));
      context.fillRect(0, bottom, width, Math.max(0, height - bottom));
      context.fillRect(0, box.y, Math.max(0, box.x), box.height);
      context.fillRect(right, box.y, Math.max(0, width - right), box.height);
      context.strokeStyle = 'rgba(255, 255, 255, 0.85)';
      context.lineWidth = 1.5;
      context.strokeRect(box.x, box.y, box.width, box.height);
      context.save();
      context.beginPath();
      context.strokeStyle = 'rgba(255, 255, 255, 0.28)';
      context.lineWidth = 1;
      for (const fraction of [1 / 3, 2 / 3]) {
        const x = box.x + box.width * fraction, y = box.y + box.height * fraction;
        context.moveTo(x, box.y); context.lineTo(x, bottom);
        context.moveTo(box.x, y); context.lineTo(right, y);
      }
      context.stroke();
      context.restore();
      drawCropGrips(context, box);
    } finally {
      context.restore();
    }
  }

  function reportZoom() {
    onZoomChange({ zoom, percent: Math.round(zoom * 100), fitMode });
  }

  function notifyCropChange() {
    if (draftCrop) onCropChange({ ...draftCrop, aspectRatio: cropAspectRatio });
  }

  function handleWheel(event) {
    if (!image) return;
    event.preventDefault();
    const rect = host.getBoundingClientRect();
    const anchorX = event.clientX - rect.left;
    const anchorY = event.clientY - rect.top;
    const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? height : 1;
    const delta = clamp(event.deltaY * unit, -2400, 2400);
    setZoom(zoom * Math.exp(-delta * 0.0015), anchorX, anchorY);
  }

  function handlePointerDown(event) {
    if (!image || event.button !== 0 || pointers.has(event.pointerId)) return;
    event.preventDefault();
    if (cropMode) {
      const point = canvasPoint(event);
      const box = cropScreenBox();
      const handle = hitCropHandle(point, box);
      const isFull = draftCrop.x <= 0.0001 && draftCrop.y <= 0.0001
        && Math.abs(draftCrop.width - getTransformedDimensions(image.naturalWidth, image.naturalHeight, transform).width) <= 0.0001
        && Math.abs(draftCrop.height - getTransformedDimensions(image.naturalWidth, image.naturalHeight, transform).height) <= 0.0001;
      const cropPoint = screenToCropPoint(point);
      const mode = handle ? 'resize' : insideCrop(point, box) && !isFull ? 'move' : 'draw';
      cropDrag = {
        pointerId: event.pointerId, x: point.x, y: point.y, start: { ...draftCrop },
        anchor: cropPoint, handle: handle || 'se', mode,
      };
      canvas.setPointerCapture(event.pointerId);
      return;
    }
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    canvas.setPointerCapture(event.pointerId);
    beginGesture();
  }

  function handlePointerMove(event) {
    if (cropMode && !cropDrag) {
      updateCropCursor(canvasPoint(event));
      return;
    }
    if (cropMode && cropDrag?.pointerId === event.pointerId) {
      event.preventDefault();
      const point = canvasPoint(event);
      const bounds = getTransformedDimensions(image.naturalWidth, image.naturalHeight, transform);
      if (cropDrag.mode === 'draw') {
        draftCrop = createCropFromPoints(cropDrag.anchor, screenToCropPoint(point), bounds, undefined, cropAspectRatio);
      } else {
        const dx = (point.x - cropDrag.x) / zoom;
        const dy = (point.y - cropDrag.y) / zoom;
        draftCrop = cropDrag.mode === 'move'
          ? moveCropRect(cropDrag.start, dx, dy, bounds)
          : resizeCropRect(cropDrag.start, cropDrag.handle, dx, dy, bounds, undefined, cropAspectRatio);
      }
      notifyCropChange();
      scheduleRender();
      return;
    }
    if (!pointers.has(event.pointerId) || !gesture) return;
    event.preventDefault();
    pointers.set(event.pointerId, { ...pointers.get(event.pointerId), x: event.clientX, y: event.clientY });
    fitMode = false;
    if (gesture.type === 'pinch' && pointers.size >= 2) {
      const [first, second] = [...pointers.values()];
      const midpoint = midpointOf(first, second);
      const distance = Math.max(1, distanceBetween(first, second));
      const nextZoom = clamp(gesture.zoom * distance / gesture.distance, MIN_ZOOM, MAX_ZOOM);
      const imageX = (gesture.midpoint.x - width / 2 - gesture.panX) / gesture.zoom;
      const imageY = (gesture.midpoint.y - height / 2 - gesture.panY) / gesture.zoom;
      zoom = nextZoom;
      panX = midpoint.x - width / 2 - imageX * zoom;
      panY = midpoint.y - height / 2 - imageY * zoom;
      reportZoom();
    } else if (gesture.type === 'pan') {
      const point = pointers.get(gesture.pointerId);
      panX = gesture.panX + point.x - gesture.x;
      panY = gesture.panY + point.y - gesture.y;
    }
    scheduleRender();
  }

  function finishPointer(event) {
    if (cropDrag?.pointerId === event.pointerId) {
      cropDrag = null;
      if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
      return;
    }
    if (!pointers.has(event.pointerId)) return;
    pointers.delete(event.pointerId);
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    beginGesture();
  }

  function beginGesture() {
    if (pointers.size >= 2) {
      const [first, second] = [...pointers.values()];
      gesture = {
        type: 'pinch', zoom, panX, panY,
        distance: Math.max(1, distanceBetween(first, second)),
        midpoint: midpointOf(first, second),
      };
      canvas.classList.add('is-panning');
    } else if (pointers.size === 1) {
      const [pointerId, point] = pointers.entries().next().value;
      gesture = { type: 'pan', pointerId, x: point.x, y: point.y, panX, panY };
      canvas.classList.add('is-panning');
    } else {
      gesture = null;
      canvas.classList.remove('is-panning');
    }
  }

  function cancelGesture() {
    const captured = [...pointers.keys()].filter((pointerId) => canvas.hasPointerCapture(pointerId));
    pointers.clear();
    gesture = null;
    canvas.classList.remove('is-panning');
    for (const pointerId of captured) {
      if (canvas.hasPointerCapture(pointerId)) canvas.releasePointerCapture(pointerId);
    }
  }

  function handleKeyDown(event) {
    if (!image) return;
    if (cropMode) {
      if (event.key === 'Escape') { cancelCrop(); event.preventDefault(); return; }
      if (event.key === 'Enter') { applyCrop(); event.preventDefault(); return; }
      if (event.key === '[' || event.key === ']') {
        const index = CROP_HANDLES.indexOf(selectedCropHandle);
        selectedCropHandle = CROP_HANDLES[(index + (event.key === ']' ? 1 : 7)) % 8];
        updateCropAriaLabel(); scheduleRender(); event.preventDefault(); return;
      }
      const directions = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
      if (directions[event.key]) {
        const [dx, dy] = directions[event.key];
        const bounds = getTransformedDimensions(image.naturalWidth, image.naturalHeight, transform);
        draftCrop = resizeCropRect(draftCrop, selectedCropHandle, dx * (event.shiftKey ? 10 : 1), dy * (event.shiftKey ? 10 : 1), bounds, undefined, cropAspectRatio);
        notifyCropChange();
        scheduleRender(); event.preventDefault();
      }
      return;
    }
    if (event.target === canvas && !event.ctrlKey && !event.altKey && !event.metaKey && !document.querySelector('dialog[open]')
      && !event.target.isContentEditable && event.key.toLowerCase() === 'r') {
      onRotate(event.shiftKey ? 'rotate-ccw' : 'rotate-cw');
      event.preventDefault();
      return;
    }
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

  function canvasPoint(event) {
    const rect = host.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function cropScreenBox() {
    const bounds = getTransformedDimensions(image.naturalWidth, image.naturalHeight, transform);
    const x = (width - bounds.width * zoom) / 2 + panX + draftCrop.x * zoom;
    const y = (height - bounds.height * zoom) / 2 + panY + draftCrop.y * zoom;
    return { x, y, width: draftCrop.width * zoom, height: draftCrop.height * zoom };
  }

  function screenToCropPoint(point) {
    const bounds = getTransformedDimensions(image.naturalWidth, image.naturalHeight, transform);
    const left = (width - bounds.width * zoom) / 2 + panX;
    const top = (height - bounds.height * zoom) / 2 + panY;
    return {
      x: clamp((point.x - left) / zoom, 0, bounds.width),
      y: clamp((point.y - top) / zoom, 0, bounds.height),
    };
  }

  function updateCropCursor(point) {
    clearCropCursorClasses();
    const box = cropScreenBox();
    const handle = hitCropHandle(point, box);
    const bounds = getTransformedDimensions(image.naturalWidth, image.naturalHeight, transform);
    const isFull = draftCrop.x <= 0.0001 && draftCrop.y <= 0.0001
      && Math.abs(draftCrop.width - bounds.width) <= 0.0001
      && Math.abs(draftCrop.height - bounds.height) <= 0.0001;
    if (handle) canvas.classList.add(`is-crop-${handle}`);
    else if (insideCrop(point, box) && !isFull) canvas.classList.add('is-crop-move');
  }

  function clearCropCursorClasses() {
    for (const name of [...CROP_HANDLES.map((handle) => `is-crop-${handle}`), 'is-crop-move']) canvas.classList.remove(name);
  }
}

function cropHandlePoints(box) {
  const { x, y, width, height } = box;
  const midX = x + width / 2, midY = y + height / 2;
  return [
    { handle: 'nw', x, y }, { handle: 'n', x: midX, y }, { handle: 'ne', x: x + width, y },
    { handle: 'e', x: x + width, y: midY }, { handle: 'se', x: x + width, y: y + height },
    { handle: 's', x: midX, y: y + height }, { handle: 'sw', x, y: y + height }, { handle: 'w', x, y: midY },
  ];
}

function hitCropHandle(point, box) {
  return cropHandlePoints(box).find((handle) => Math.abs(point.x - handle.x) <= CROP_HANDLE_SIZE && Math.abs(point.y - handle.y) <= CROP_HANDLE_SIZE)?.handle || null;
}

function insideCrop(point, box) { return point.x >= box.x && point.x <= box.x + box.width && point.y >= box.y && point.y <= box.y + box.height; }

function drawCropGrips(context, box) {
  const { x, y, width, height } = box;
  const right = x + width, bottom = y + height;
  const midX = x + width / 2, midY = y + height / 2;
  const length = Math.min(16, width / 4, height / 4);
  context.save();
  context.strokeStyle = '#ffffff';
  context.lineWidth = 2;
  context.lineCap = 'square';
  context.beginPath();
  for (const [cx, cy, sx, sy] of [[x, y, 1, 1], [right, y, -1, 1], [right, bottom, -1, -1], [x, bottom, 1, -1]]) {
    context.moveTo(cx, cy + sy * length); context.lineTo(cx, cy); context.lineTo(cx + sx * length, cy);
  }
  context.stroke();
  context.lineWidth = 2.5;
  context.lineCap = 'round';
  context.beginPath();
  context.moveTo(midX - 9, y); context.lineTo(midX + 9, y);
  context.moveTo(midX - 9, bottom); context.lineTo(midX + 9, bottom);
  context.moveTo(x, midY - 9); context.lineTo(x, midY + 9);
  context.moveTo(right, midY - 9); context.lineTo(right, midY + 9);
  context.stroke();
  context.restore();
}

function midpointOf(a, b) {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

function distanceBetween(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
