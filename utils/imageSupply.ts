import { CollageMode, getScreenDimensions, ScreenRatio } from './collage';

/**
 * Calculate required image count for a collage based on screen dimensions and mode
 */
export function calculateRequiredImageCount(
  screenWidth: number,
  screenHeight: number,
  mode: CollageMode,
  currentImageCount: number = 0
): number {
  const screenArea = screenWidth * screenHeight;
  const targetCoverage = screenArea * 1.1; // 110% coverage target

  if (mode === 'grid') {
    // For grid: calculate based on optimal cell size
    const gap = 4;
    const aspectRatio = screenWidth / screenHeight;
    
    // Estimate optimal grid dimensions
    const estimatedCols = Math.ceil(Math.sqrt(currentImageCount * aspectRatio) || 1);
    const estimatedRows = Math.ceil((currentImageCount || 1) / estimatedCols);
    
    // Calculate cell size
    const totalGapWidth = gap * (estimatedCols - 1);
    const totalGapHeight = gap * (estimatedRows - 1);
    const cellWidth = (screenWidth - totalGapWidth) / estimatedCols;
    const cellHeight = (screenHeight - totalGapHeight) / estimatedRows;
    const cellSize = Math.min(cellWidth, cellHeight);
    const cellArea = cellSize * cellSize;
    
    // Calculate how many cells we need
    const requiredCells = Math.ceil(targetCoverage / cellArea);
    
    // Add buffer for grid adjustments
    return Math.ceil(requiredCells * 1.2);
  } else {
    // For free mode: estimate based on average image size
    const baseImageSize = Math.min(screenWidth, screenHeight) * 0.3;
    const averageScale = 1.0; // Average of 0.8-1.2 range
    const averageAspectRatio = 1.33; // Common 4:3 aspect ratio
    const averageWidth = baseImageSize * averageScale;
    const averageHeight = averageWidth / averageAspectRatio;
    const averageImageArea = averageWidth * averageHeight;
    
    // Calculate required images
    const requiredImages = Math.ceil(targetCoverage / averageImageArea);
    
    // Add buffer for overlaps and randomness
    return Math.ceil(requiredImages * 1.3);
  }
}

/**
 * Calculate required image count for a given ratio and mode
 */
export function calculateRequiredImageCountForRatio(
  ratio: ScreenRatio,
  mode: CollageMode,
  screenWidth: number,
  currentImageCount: number = 0
): number {
  const dimensions = getScreenDimensions(ratio, screenWidth);
  return calculateRequiredImageCount(
    dimensions.width,
    dimensions.height,
    mode,
    currentImageCount
  );
}









