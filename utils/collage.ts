import { UnsplashImage } from '@/services/unsplash';

export interface CollageImage {
  id: string;
  url: string;
  x: number;
  y: number;
  width: number;
  height: number;
  scale: number;
  rotation: number;
  originalWidth: number;
  originalHeight: number;
}

export type ScreenRatio = '9:16' | '16:9';

/**
 * Calculate screen dimensions based on ratio
 */
export function getScreenDimensions(ratio: ScreenRatio, maxWidth: number = 400): { width: number; height: number } {
  if (ratio === '9:16') {
    // Phone portrait: 9:16
    return {
      width: maxWidth,
      height: Math.round(maxWidth * (16 / 9)),
    };
  } else {
    // Desktop landscape: 16:9
    return {
      width: maxWidth,
      height: Math.round(maxWidth * (9 / 16)),
    };
  }
}

/**
 * Generate a natural, non-symmetrical collage
 */
export function generateCollage(
  images: UnsplashImage[],
  screenWidth: number,
  screenHeight: number
): CollageImage[] {
  const collageImages: CollageImage[] = [];
  const baseImageSize = Math.min(screenWidth, screenHeight) * 0.3; // Base size relative to screen

  for (const image of images) {
    // Calculate aspect ratio
    const aspectRatio = image.width / image.height;
    
    // Random scale between 0.8 and 1.2
    const scale = 0.8 + Math.random() * 0.4;
    
    // Calculate dimensions with scale
    const width = baseImageSize * scale;
    const height = width / aspectRatio;
    
    // Random rotation between -5 and +5 degrees
    const rotation = (Math.random() - 0.5) * 10;
    
    // Generate random position, ensuring image stays within bounds
    // Allow slight overlaps, but keep images mostly visible
    const maxX = screenWidth - width * 0.8; // Leave some margin
    const maxY = screenHeight - height * 0.8;
    
    const x = Math.max(0, Math.random() * maxX);
    const y = Math.max(0, Math.random() * maxY);
    
    collageImages.push({
      id: image.id,
      url: image.urls.regular,
      x,
      y,
      width,
      height,
      scale,
      rotation,
      originalWidth: image.width,
      originalHeight: image.height,
    });
  }

  return collageImages;
}

