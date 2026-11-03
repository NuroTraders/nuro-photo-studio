import { createImageDocument } from '../core/image-document.js';

export function createImagePreview(imageElement) {
  let currentUrl;
  return {
    async show(file) {
      const nextUrl = URL.createObjectURL(file);
      const dimensions = await readDimensions(nextUrl);
      if (currentUrl) URL.revokeObjectURL(currentUrl);
      currentUrl = nextUrl;
      imageElement.src = currentUrl;
      return createImageDocument({ name: file.name, mimeType: file.type, size: file.size, ...dimensions });
    },
    dispose() {
      if (currentUrl) URL.revokeObjectURL(currentUrl);
      currentUrl = undefined;
    },
  };
}

function readDimensions(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
    image.onerror = reject;
    image.src = url;
  });
}
