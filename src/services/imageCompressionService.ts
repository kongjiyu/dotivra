import imageCompression from 'browser-image-compression';

export interface ImageUploadOptions {
  maxSizeMB?: number;
  maxWidthOrHeight?: number;
  useWebWorker?: boolean;
  quality?: number;
}

export interface ImageCompressionResult {
  dataUrl: string;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  width: number;
  height: number;
}

// Safe limits for Firestore Base64 storage
export const MAX_IMAGE_SIZE_KB = 200; // Target 200KB per image max
export const MAX_IMAGE_WIDTH = 1200; // Max width to reduce size
export const MAX_IMAGES_PER_DOCUMENT = 5; // Limit number of images
export const MAX_DOCUMENT_SIZE_KB = 800; // Leave 200KB buffer before 1MB limit

/**
 * Compress an image file and convert to Base64 (for Firestore storage)
 * @param file - The image file to compress
 * @param options - Compression options
 * @returns Base64 data URL and size info
 */
export async function compressImageToBase64(
  file: File,
  options: ImageUploadOptions = {}
): Promise<ImageCompressionResult> {
  const {
    maxSizeMB = 0.2, // Target 200KB max (aggressive compression)
    maxWidthOrHeight = MAX_IMAGE_WIDTH, // 1200px max
    useWebWorker = true,
    quality = 0.7, // 70% quality for smaller size
  } = options;

  try {
    console.log('🗜️ Compressing image:', {
      name: file.name,
      originalSize: `${(file.size / 1024).toFixed(2)} KB`,
    });

    // Step 1: Compress the image aggressively
    const compressedFile = await imageCompression(file, {
      maxSizeMB,
      maxWidthOrHeight,
      useWebWorker,
      initialQuality: quality,
    });

    console.log('✅ Image compressed:', {
      name: compressedFile.name,
      compressedSize: `${(compressedFile.size / 1024).toFixed(2)} KB`,
      ratio: `${((1 - compressedFile.size / file.size) * 100).toFixed(1)}% reduction`,
    });

    // Step 2: Check if still too large
    const compressedSizeKB = compressedFile.size / 1024;
    if (compressedSizeKB > MAX_IMAGE_SIZE_KB) {
      throw new Error(
        `Image too large after compression: ${compressedSizeKB.toFixed(0)}KB. ` +
        `Maximum allowed: ${MAX_IMAGE_SIZE_KB}KB. Please use a smaller image.`
      );
    }

    // Step 3: Convert to Base64
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(compressedFile);
    });

    // Step 4: Get image dimensions
    const dimensions = await getImageDimensions(dataUrl);

    console.log('✅ Image ready for Firestore:', {
      size: `${compressedSizeKB.toFixed(2)} KB`,
      dimensions: `${dimensions.width}x${dimensions.height}`,
    });

    return {
      dataUrl,
      originalSize: file.size,
      compressedSize: compressedFile.size,
      compressionRatio: (1 - compressedFile.size / file.size) * 100,
      width: dimensions.width,
      height: dimensions.height,
    };
  } catch (error) {
    console.error('❌ Image compression failed:', error);
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
 * Check if adding an image would exceed document size limit
 * @param currentContent - Current document HTML content
 * @param imageSize - Size of image to add (in bytes)
 * @returns Whether it's safe to add the image
 */
export function canAddImage(currentContent: string, imageSize: number): {
  canAdd: boolean;
  reason?: string;
  currentSizeKB: number;
  newSizeKB: number;
  limitKB: number;
} {
  const currentSizeKB = new Blob([currentContent]).size / 1024;
  const imageSizeKB = imageSize / 1024;
  const newSizeKB = currentSizeKB + imageSizeKB;

  // Count existing images
  const imageCount = (currentContent.match(/<img[^>]+>/g) || []).length;

  if (imageCount >= MAX_IMAGES_PER_DOCUMENT) {
    return {
      canAdd: false,
      reason: `Maximum ${MAX_IMAGES_PER_DOCUMENT} images per document. Please remove an existing image first.`,
      currentSizeKB,
      newSizeKB,
      limitKB: MAX_DOCUMENT_SIZE_KB,
    };
  }

  if (newSizeKB > MAX_DOCUMENT_SIZE_KB) {
    return {
      canAdd: false,
      reason: `Document size would exceed ${MAX_DOCUMENT_SIZE_KB}KB limit. Current: ${currentSizeKB.toFixed(0)}KB, New: ${newSizeKB.toFixed(0)}KB`,
      currentSizeKB,
      newSizeKB,
      limitKB: MAX_DOCUMENT_SIZE_KB,
    };
  }

  return {
    canAdd: true,
    currentSizeKB,
    newSizeKB,
    limitKB: MAX_DOCUMENT_SIZE_KB,
  };
}

/**
 * Get document content size info
 */
export function getDocumentSizeInfo(content: string): {
  sizeKB: number;
  sizeMB: number;
  imageCount: number;
  percentOfLimit: number;
  isNearLimit: boolean; // >700KB
  exceedsLimit: boolean; // >1MB
} {
  const sizeBytes = new Blob([content]).size;
  const sizeKB = sizeBytes / 1024;
  const sizeMB = sizeKB / 1024;
  const imageCount = (content.match(/<img[^>]+>/g) || []).length;
  const percentOfLimit = (sizeKB / MAX_DOCUMENT_SIZE_KB) * 100;

  return {
    sizeKB,
    sizeMB,
    imageCount,
    percentOfLimit,
    isNearLimit: sizeKB > 700, // Warning threshold
    exceedsLimit: sizeKB > 1024, // 1MB Firestore limit
  };
}
