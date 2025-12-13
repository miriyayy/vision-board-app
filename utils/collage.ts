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
export type CollageMode = 'free' | 'grid';

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
export function generateFreeCollage(
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

/**
 * Generate a symmetric grid collage
 */
export function generateGridCollage(
  images: UnsplashImage[],
  screenWidth: number,
  screenHeight: number
): CollageImage[] {
  if (images.length === 0) return [];

  const collageImages: CollageImage[] = [];
  
  // Calculate optimal grid dimensions
  const imageCount = images.length;
  const aspectRatio = screenWidth / screenHeight;
  
  // Start with approximate columns based on aspect ratio
  let cols = Math.ceil(Math.sqrt(imageCount * aspectRatio));
  let rows = Math.ceil(imageCount / cols);
  
  // Adjust to minimize empty space
  while ((rows - 1) * cols >= imageCount) {
    rows--;
  }
  while (rows * (cols - 1) >= imageCount && cols > 1) {
    cols--;
  }
  rows = Math.ceil(imageCount / cols);
  
  // Calculate cell dimensions
  const gap = 4;
  const totalGapWidth = gap * (cols - 1);
  const totalGapHeight = gap * (rows - 1);
  const cellWidth = (screenWidth - totalGapWidth) / cols;
  const cellHeight = (screenHeight - totalGapHeight) / rows;
  
  // Use the smaller dimension to ensure square or near-square cells
  const cellSize = Math.min(cellWidth, cellHeight);
  const actualCellWidth = cellSize;
  const actualCellHeight = cellSize;
  
  // Recalculate gaps to center the grid
  const totalUsedWidth = cols * actualCellWidth + (cols - 1) * gap;
  const totalUsedHeight = rows * actualCellHeight + (rows - 1) * gap;
  const offsetX = (screenWidth - totalUsedWidth) / 2;
  const offsetY = (screenHeight - totalUsedHeight) / 2;

  for (let i = 0; i < images.length; i++) {
    const image = images[i];
    const row = Math.floor(i / cols);
    const col = i % cols;
    
    const x = offsetX + col * (actualCellWidth + gap);
    const y = offsetY + row * (actualCellHeight + gap);
    
    collageImages.push({
      id: image.id,
      url: image.urls.regular,
      x,
      y,
      width: actualCellWidth,
      height: actualCellHeight,
      scale: 1,
      rotation: 0,
      originalWidth: image.width,
      originalHeight: image.height,
    });
  }

  return collageImages;
}

/**
 * Generate collage based on mode
 */
export function generateCollage(
  images: UnsplashImage[],
  screenWidth: number,
  screenHeight: number,
  mode: CollageMode = 'free'
): CollageImage[] {
  if (mode === 'grid') {
    return generateGridCollage(images, screenWidth, screenHeight);
  }
  return generateFreeCollage(images, screenWidth, screenHeight);
}

