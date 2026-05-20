/** Max edge length for avatars persisted in localStorage. */
const MAX_AVATAR_DIMENSION = 256;
const JPEG_QUALITY = 0.72;
/** Skip re-compression for already-small payloads (~50KB). */
const SKIP_COMPRESS_BELOW_CHARS = 50_000;

export function isBrowserEnvironment(): boolean {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

export function isInlineImageData(url: string): boolean {
  return url.startsWith('data:') || url.startsWith('blob:');
}

/**
 * Compress a data-URL image for localStorage (JPEG, max 256px).
 * HTTP URLs are returned unchanged.
 */
export async function compressProfileImageDataUrl(dataUrl: string): Promise<string> {
  if (!dataUrl?.trim()) {
    return dataUrl;
  }

  if (!isInlineImageData(dataUrl)) {
    return dataUrl;
  }

  if (!isBrowserEnvironment()) {
    return dataUrl;
  }

  if (dataUrl.length < SKIP_COMPRESS_BELOW_CHARS) {
    return dataUrl;
  }

  let quality = JPEG_QUALITY;
  let result = await resizeToJpegDataUrl(dataUrl, MAX_AVATAR_DIMENSION, quality);

  while (result.length > 120_000 && quality > 0.45) {
    quality -= 0.1;
    result = await resizeToJpegDataUrl(dataUrl, MAX_AVATAR_DIMENSION, quality);
  }

  return result;
}

export async function compressProfileImageFile(file: File): Promise<string> {
  const dataUrl = await readFileAsDataUrl(file);
  return compressProfileImageDataUrl(dataUrl);
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.readAsDataURL(file);
  });
}

function resizeToJpegDataUrl(
  dataUrl: string,
  maxDimension: number,
  quality: number,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let width = img.width;
      let height = img.height;

      if (width > height && width > maxDimension) {
        height = Math.round((height * maxDimension) / width);
        width = maxDimension;
      } else if (height > maxDimension) {
        width = Math.round((width * maxDimension) / height);
        height = maxDimension;
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas not available'));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => reject(new Error('Failed to decode image'));
    img.src = dataUrl;
  });
}
