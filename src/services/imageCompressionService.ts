export interface ImageSizeCheckResult {
  dataUrl: string;
  originalSize: number;
  width: number;
  height: number;
}

// Maximum image size: 1MB
export const MAX_IMAGE_SIZE_MB = 1;
export const MAX_IMAGE_SIZE_BYTES = MAX_IMAGE_SIZE_MB * 1024 * 1024;

/**
 * Check image size and convert to Base64 (for Firestore storage)
 * @param file - The image file to check
 * @returns Base64 data URL and size info
 */
export async function processImageFile(
  file: File
): Promise<ImageSizeCheckResult> {
  try {
    // Step 1: Check if file size exceeds 1MB
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
      throw new Error(
        `Image size (${sizeMB}MB) exceeds the maximum limit of ${MAX_IMAGE_SIZE_MB}MB. Please use a smaller image.`
      );
    }

    // Step 2: Convert to Base64
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    // Step 3: Get image dimensions
    const dimensions = await getImageDimensions(dataUrl);

    return {
      dataUrl,
      originalSize: file.size,
      width: dimensions.width,
      height: dimensions.height,
    };
  } catch (error) {
    throw error;
  }
}

/**
 * Get image dimensions from data URL
 */
function getImageDimensions(dataUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.width, height: img.height });
    img.onerror = reject;
    img.src = dataUrl;
  });
}

/**
 * Get document content size info
 */
export function getDocumentSizeInfo(content: string): {
  sizeKB: number;
  sizeMB: number;
  imageCount: number;
} {
  const sizeBytes = new Blob([content]).size;
  const sizeKB = sizeBytes / 1024;
  const sizeMB = sizeKB / 1024;
  const imageCount = (content.match(/<img[^>]+>/g) || []).length;

  return {
    sizeKB,
    sizeMB,
    imageCount,
  };
}
