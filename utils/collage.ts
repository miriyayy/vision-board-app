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
 * Calculate safe grid dimensions ensuring minimum size
 */
function calculateSafeGridDimensions(
  imageCount: number,
  screenWidth: number,
  screenHeight: number
): { cols: number; rows: number } {
  if (imageCount <= 0) {
    return { cols: 1, rows: 1 };
  }

  const aspectRatio = screenWidth / screenHeight;
  
  // Calculate initial grid dimensions
  let cols = Math.max(1, Math.ceil(Math.sqrt(imageCount * aspectRatio)));
  let rows = Math.max(1, Math.ceil(imageCount / cols));
  
  // Ensure we have at least 1x1 grid
  if (cols === 0) cols = 1;
  if (rows === 0) rows = 1;
  
  // Adjust to minimize empty space, but ensure minimum size
  while ((rows - 1) * cols >= imageCount && rows > 1) {
    rows--;
  }
  while (rows * (cols - 1) >= imageCount && cols > 1) {
    cols--;
  }
  
  // Final safety check
  rows = Math.max(1, Math.ceil(imageCount / Math.max(1, cols)));
  cols = Math.max(1, cols);
  
  return { cols, rows };
}

/**
 * Generate a symmetric grid collage
 * Fully defensive and fault-tolerant - never throws errors
 */
export function generateGridCollage(
  images: UnsplashImage[],
  screenWidth: number,
  screenHeight: number
): CollageImage[] {
  // Safety checks
  if (!images || images.length === 0) {
    console.warn('generateGridCollage: No images provided, returning empty array');
    return [];
  }

  if (screenWidth <= 0 || screenHeight <= 0) {
    console.warn('generateGridCollage: Invalid screen dimensions, returning empty array');
    return [];
  }

  try {
    const screenArea = screenWidth * screenHeight;
    const targetCoverage = screenArea * 1.1; // 110% coverage target
    const gap = 4;
    
    // Start with original image count
    let imageCount = images.length;
    const collageImages: CollageImage[] = [];
    
    // Ensure we have at least one image
    if (imageCount === 0) {
      console.warn('generateGridCollage: imageCount is 0, returning empty array');
      return [];
    }

    // Calculate initial grid dimensions safely
    let { cols, rows } = calculateSafeGridDimensions(imageCount, screenWidth, screenHeight);
    
    // Calculate cell dimensions with safety checks
    const totalGapWidth = gap * Math.max(0, cols - 1);
    const totalGapHeight = gap * Math.max(0, rows - 1);
    const availableWidth = Math.max(1, screenWidth - totalGapWidth);
    const availableHeight = Math.max(1, screenHeight - totalGapHeight);
    
    const cellWidth = availableWidth / Math.max(1, cols);
    const cellHeight = availableHeight / Math.max(1, rows);
    const cellSize = Math.max(1, Math.min(cellWidth, cellHeight));
    const cellArea = cellSize * cellSize;
    
    // Check if we need more images to reach target coverage
    const currentCoverage = imageCount * cellArea;
    
    let finalCols = cols;
    let finalRows = rows;
    let finalImageCount = imageCount;
    let finalCellSize = cellSize;
    
    if (cellArea > 0 && currentCoverage < targetCoverage) {
      // Calculate how many more cells we need
      const additionalCellsNeeded = Math.ceil((targetCoverage - currentCoverage) / cellArea);
      const newImageCount = imageCount + additionalCellsNeeded;
      
      // Recalculate grid with new count safely
      const newGrid = calculateSafeGridDimensions(newImageCount, screenWidth, screenHeight);
      finalCols = newGrid.cols;
      finalRows = newGrid.rows;
      finalImageCount = newImageCount;
      
      // Recalculate cell dimensions with new grid
      const newTotalGapWidth = gap * Math.max(0, finalCols - 1);
      const newTotalGapHeight = gap * Math.max(0, finalRows - 1);
      const newAvailableWidth = Math.max(1, screenWidth - newTotalGapWidth);
      const newAvailableHeight = Math.max(1, screenHeight - newTotalGapHeight);
      const newCellWidth = newAvailableWidth / Math.max(1, finalCols);
      const newCellHeight = newAvailableHeight / Math.max(1, finalRows);
      finalCellSize = Math.max(1, Math.min(newCellWidth, newCellHeight));
    }
    
    // Calculate offsets for centering
    const totalUsedWidth = finalCols * finalCellSize + gap * Math.max(0, finalCols - 1);
    const totalUsedHeight = finalRows * finalCellSize + gap * Math.max(0, finalRows - 1);
    const offsetX = Math.max(0, (screenWidth - totalUsedWidth) / 2);
    const offsetY = Math.max(0, (screenHeight - totalUsedHeight) / 2);
    
    // Generate grid with safe image access
    for (let i = 0; i < finalImageCount; i++) {
      // Safe image access - never assume images[i] exists
      let image: UnsplashImage | undefined = images[i % images.length];
      
      if (!image) {
        // Fallback: use first image if available
        if (images.length > 0) {
          image = images[0];
        } else {
          console.warn(`generateGridCollage: No image available for index ${i}, skipping`);
          continue;
        }
      }
      
      // Create duplicate if needed (beyond original image count)
      if (i >= images.length) {
        const sourceImage = images[i % images.length] || images[0];
        if (sourceImage) {
          image = {
            ...sourceImage,
            id: `${sourceImage.id}-dup-${i}`,
          };
        }
      }
      
      if (!image) {
        console.warn(`generateGridCollage: Could not get image for index ${i}, skipping`);
        continue;
      }
      
      // Calculate position safely
      const row = Math.floor(i / Math.max(1, finalCols));
      const col = i % Math.max(1, finalCols);
      
      const x = offsetX + col * (finalCellSize + gap);
      const y = offsetY + row * (finalCellSize + gap);
      
      // Ensure valid dimensions
      if (finalCellSize > 0 && x >= 0 && y >= 0) {
        collageImages.push({
          id: image.id,
          url: image.urls.regular,
          x,
          y,
          width: finalCellSize,
          height: finalCellSize,
          scale: 1,
          rotation: 0,
          originalWidth: image.width || finalCellSize,
          originalHeight: image.height || finalCellSize,
        });
      }
    }
    
    return collageImages;
  } catch (error) {
    // Never throw - return a simple fallback layout
    console.error('generateGridCollage: Error generating grid, returning fallback layout:', error);
    
    // Fallback: single column layout
    const fallbackImages: CollageImage[] = [];
    const gap = 4;
    const cellSize = Math.min(screenWidth - gap * 2, (screenHeight - gap * (images.length + 1)) / images.length);
    const safeCellSize = Math.max(50, cellSize); // Minimum 50px
    
    for (let i = 0; i < images.length && i < 20; i++) { // Limit to 20 for safety
      const image = images[i];
      if (image) {
        fallbackImages.push({
          id: image.id,
          url: image.urls.regular,
          x: gap,
          y: gap + i * (safeCellSize + gap),
          width: safeCellSize,
          height: safeCellSize,
          scale: 1,
          rotation: 0,
          originalWidth: image.width || safeCellSize,
          originalHeight: image.height || safeCellSize,
        });
      }
    }
    
    return fallbackImages;
  }
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

