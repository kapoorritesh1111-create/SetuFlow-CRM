export const MOBILE_SCAN_MAX_ORIGINAL_IMAGE_BYTES = 10 * 1024 * 1024;
export const MOBILE_SCAN_MAX_UPLOAD_BYTES = 3 * 1024 * 1024;
export const MOBILE_SCAN_MAX_PDF_UPLOAD_BYTES = 3 * 1024 * 1024;
export const MOBILE_SCAN_MAX_IMAGE_EDGE = 1600;
export const MOBILE_SCAN_MIN_IMAGE_QUALITY = 0.58;
export const MOBILE_SCAN_INITIAL_IMAGE_QUALITY = 0.82;

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Unable to prepare the business card photo. Try a clearer image or upload a smaller file.'));
    }, type, quality);
  });
}

export async function prepareMobileScanFile(file: File): Promise<{ file: File; compressed: boolean; note: string }> {
  if (!file.type.startsWith('image/')) {
    if (file.type === 'application/pdf' && file.size > MOBILE_SCAN_MAX_PDF_UPLOAD_BYTES) {
      throw new Error('This PDF is too large for mobile scan. Upload a PDF under 3 MB, or take a photo of the card instead.');
    }
    return { file, compressed: false, note: 'File is ready for scan.' };
  }

  if (file.size > MOBILE_SCAN_MAX_ORIGINAL_IMAGE_BYTES) {
    throw new Error('This photo is too large for mobile scan. Retake the photo closer to the card or choose an image under 10 MB.');
  }

  if (file.size <= MOBILE_SCAN_MAX_UPLOAD_BYTES) {
    return { file, compressed: false, note: 'Photo is ready for scan.' };
  }

  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, MOBILE_SCAN_MAX_IMAGE_EDGE / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Unable to prepare the business card photo on this device.');
    context.drawImage(bitmap, 0, 0, width, height);

    let quality = MOBILE_SCAN_INITIAL_IMAGE_QUALITY;
    let blob = await canvasToBlob(canvas, 'image/jpeg', quality);
    while (blob.size > MOBILE_SCAN_MAX_UPLOAD_BYTES && quality > MOBILE_SCAN_MIN_IMAGE_QUALITY) {
      quality = Math.max(MOBILE_SCAN_MIN_IMAGE_QUALITY, quality - 0.08);
      blob = await canvasToBlob(canvas, 'image/jpeg', quality);
    }

    if (blob.size > MOBILE_SCAN_MAX_UPLOAD_BYTES) {
      throw new Error('The card photo is still too large after mobile optimization. Retake it closer to the card or crop the image first.');
    }

    const optimizedName = file.name.replace(/\.[^.]+$/, '') || 'business-card';
    const optimizedFile = new File([blob], `${optimizedName}-mobile-scan.jpg`, { type: 'image/jpeg', lastModified: Date.now() });
    return {
      file: optimizedFile,
      compressed: true,
      note: `Photo optimized for scan (${Math.round(file.size / 1024)} KB → ${Math.round(optimizedFile.size / 1024)} KB).`,
    };
  } finally {
    bitmap.close?.();
  }
}
