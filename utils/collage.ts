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
 * Calculate total coverage area of collage images
 */
function calculateCoverage(collageImages: CollageImage[]): number {
  return collageImages.reduce((total, img) => total + img.width * img.height, 0);
}

/**
 * Generate a single free-style image placement
 */
function generateFreeImagePlacement(
  image: UnsplashImage,
  screenWidth: number,
  screenHeight: number,
  baseImageSize: number
): CollageImage {
  const aspectRatio = image.width / image.height;
  const scale = 0.8 + Math.random() * 0.4;
  const width = baseImageSize * scale;
  const height = width / aspectRatio;
  const rotation = (Math.random() - 0.5) * 10;
  const maxX = screenWidth - width * 0.8;
  const maxY = screenHeight - height * 0.8;
  const x = Math.max(0, Math.random() * maxX);
  const y = Math.max(0, Math.random() * maxY);

  return {
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
  };
}

/**
 * Generate a natural, non-symmetrical collage
 */
export function generateFreeCollage(
  images: UnsplashImage[],
  screenWidth: number,
  screenHeight: number
): CollageImage[] {
  if (images.length === 0) return [];

  const collageImages: CollageImage[] = [];
  const screenArea = screenWidth * screenHeight;
  const targetCoverage = screenArea * 1.1; // 110% coverage target
  const baseImageSize = Math.min(screenWidth, screenHeight) * 0.3;

  // Generate initial collage
  for (const image of images) {
    const placement = generateFreeImagePlacement(image, screenWidth, screenHeight, baseImageSize);
    collageImages.push(placement);
  }

  // Check coverage and add more images if needed
  // Only duplicate as last resort if we don't have enough unique images
  let currentCoverage = calculateCoverage(collageImages);
  let imageIndex = 0;
  const maxIterations = Math.min(images.length * 2, 50); // Prevent excessive duplication
  let iterations = 0;

  // Only duplicate if we truly don't have enough images and coverage is insufficient
  while (currentCoverage < targetCoverage && iterations < maxIterations && imageIndex < images.length * 2) {
    const imageToReuse = images[imageIndex % images.length];
    const placement = generateFreeImagePlacement(imageToReuse, screenWidth, screenHeight, baseImageSize);
    
    // Create unique ID for duplicate
    const uniqueId = `${imageToReuse.id}-dup-${collageImages.length}`;
    collageImages.push({
      ...placement,
      id: uniqueId,
    });
    
    currentCoverage = calculateCoverage(collageImages);
    imageIndex++;
    iterations++;
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

  const screenArea = screenWidth * screenHeight;
  const targetCoverage = screenArea * 1.1; // 110% coverage target
  
  // Start with original image count
  let imageCount = images.length;
  let collageImages: CollageImage[] = [];
  const gap = 4;
  
  // Only expand image pool as last resort if we truly need more
  let expandedImages = [...images];

  // Calculate grid with current image count
  const aspectRatio = screenWidth / screenHeight;
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
  const totalGapWidth = gap * (cols - 1);
  const totalGapHeight = gap * (rows - 1);
  const cellWidth = (screenWidth - totalGapWidth) / cols;
  const cellHeight = (screenHeight - totalGapHeight) / rows;
  const cellSize = Math.min(cellWidth, cellHeight);
  const actualCellWidth = cellSize;
  const actualCellHeight = cellSize;
  const cellArea = actualCellWidth * actualCellHeight;
  
  // Check if we need more images to reach target coverage
  currentCoverage = imageCount * cellArea;
  
  if (currentCoverage < targetCoverage) {
    // Calculate how many more cells we need
    const additionalCellsNeeded = Math.ceil((targetCoverage - currentCoverage) / cellArea);
    const newImageCount = imageCount + additionalCellsNeeded;
    
    // Recalculate grid with new count
    cols = Math.ceil(Math.sqrt(newImageCount * aspectRatio));
    rows = Math.ceil(newImageCount / cols);
    
    while ((rows - 1) * cols >= newImageCount) {
      rows--;
    }
    while (rows * (cols - 1) >= newImageCount && cols > 1) {
      cols--;
    }
    rows = Math.ceil(newImageCount / cols);
    
    // Recalculate cell dimensions with new grid
    const newTotalGapWidth = gap * (cols - 1);
    const newTotalGapHeight = gap * (rows - 1);
    const newCellWidth = (screenWidth - newTotalGapWidth) / cols;
    const newCellHeight = (screenHeight - newTotalGapHeight) / rows;
    const newCellSize = Math.min(newCellWidth, newCellHeight);
    const newActualCellWidth = newCellSize;
    const newActualCellHeight = newCellSize;
    
    const newTotalUsedWidth = cols * newActualCellWidth + (cols - 1) * gap;
    const newTotalUsedHeight = rows * newActualCellHeight + (rows - 1) * gap;
    const offsetX = (screenWidth - newTotalUsedWidth) / 2;
    const offsetY = (screenHeight - newTotalUsedHeight) / 2;
    
    // Generate grid with expanded images
    // Only duplicate if we don't have enough unique images
    for (let i = 0; i < newImageCount; i++) {
      let image: UnsplashImage;
      if (i < expandedImages.length) {
        image = expandedImages[i];
      } else {
        // Last resort: duplicate an image
        const sourceImage = expandedImages[i % expandedImages.length];
        image = {
          ...sourceImage,
          id: `${sourceImage.id}-dup-${i}`,
        };
      }
      
      const row = Math.floor(i / cols);
      const col = i % cols;
      
      const x = offsetX + col * (newActualCellWidth + gap);
      const y = offsetY + row * (newActualCellHeight + gap);
      
      collageImages.push({
        id: image.id,
        url: image.urls.regular,
        x,
        y,
        width: newActualCellWidth,
        height: newActualCellHeight,
        scale: 1,
        rotation: 0,
        originalWidth: image.width,
        originalHeight: image.height,
      });
    }
  } else {
    // Original grid is sufficient
    const totalUsedWidth = cols * actualCellWidth + (cols - 1) * gap;
    const totalUsedHeight = rows * actualCellHeight + (rows - 1) * gap;
    const offsetX = (screenWidth - totalUsedWidth) / 2;
    const offsetY = (screenHeight - totalUsedHeight) / 2;

    for (let i = 0; i < imageCount; i++) {
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

