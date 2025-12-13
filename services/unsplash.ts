import { UNSPLASH_ACCESS_KEY } from '@/config/env';

const UNSPLASH_API_URL = 'https://api.unsplash.com';

export interface UnsplashImage {
  id: string;
  urls: {
    regular: string;
    small: string;
    thumb: string;
  };
  width: number;
  height: number;
  description: string | null;
}

export interface UnsplashResponse {
  results: UnsplashImage[];
}

export interface SearchImageResult {
  id: string;
  smallUrl: string;
  regularUrl: string;
}

/**
 * Search images from Unsplash based on a keyword
 * Returns an array of objects with id, smallUrl, and regularUrl
 */
export async function searchImages(keyword: string): Promise<SearchImageResult[]> {
  // Handle empty keyword
  if (!keyword || keyword.trim().length === 0) {
    return [];
  }

  if (!UNSPLASH_ACCESS_KEY) {
    throw new Error('Please add your Unsplash API key in config/env.ts');
  }

  const url = `${UNSPLASH_API_URL}/search/photos?query=${encodeURIComponent(keyword.trim())}&per_page=10&client_id=${UNSPLASH_ACCESS_KEY}`;

  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      // Handle API errors gracefully
      if (response.status === 401) {
        throw new Error('Invalid Unsplash API key');
      } else if (response.status === 403) {
        throw new Error('Unsplash API rate limit exceeded');
      } else {
        throw new Error(`Unsplash API error: ${response.status} ${response.statusText}`);
      }
    }

    const data: UnsplashResponse = await response.json();
    
    return data.results.map((image) => ({
      id: image.id,
      smallUrl: image.urls.small,
      regularUrl: image.urls.regular,
    }));
  } catch (error) {
    // Handle network errors and other exceptions
    if (error instanceof Error) {
      console.error('Error fetching images from Unsplash:', error.message);
      throw error;
    }
    throw new Error('Unknown error occurred while fetching images');
  }
}

/**
 * Fetch images from Unsplash based on keywords
 */
export async function fetchImagesFromUnsplash(
  keywords: string[],
  count: number = 10
): Promise<UnsplashImage[]> {
  if (!UNSPLASH_ACCESS_KEY) {
    throw new Error('Please add your Unsplash API key in config/env.ts');
  }

  const query = keywords.join(',');
  const url = `${UNSPLASH_API_URL}/search/photos?query=${encodeURIComponent(query)}&per_page=${count}&client_id=${UNSPLASH_ACCESS_KEY}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Unsplash API error: ${response.statusText}`);
    }
    const data: UnsplashResponse = await response.json();
    return data.results;
  } catch (error) {
    console.error('Error fetching images from Unsplash:', error);
    throw error;
  }
}

/**
 * Perform a single Unsplash search with error handling
 */
async function performSearch(query: string, perPage: number = 10): Promise<UnsplashImage[]> {
  if (!UNSPLASH_ACCESS_KEY) {
    throw new Error('Please add your Unsplash API key in config/env.ts');
  }

  const url = `${UNSPLASH_API_URL}/search/photos?query=${encodeURIComponent(query)}&per_page=${perPage}&client_id=${UNSPLASH_ACCESS_KEY}`;

  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Invalid Unsplash API key');
      } else if (response.status === 403) {
        throw new Error('Unsplash API rate limit exceeded');
      } else {
        throw new Error(`Unsplash API error: ${response.status} ${response.statusText}`);
      }
    }

    const data: UnsplashResponse = await response.json();
    return data.results;
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Error fetching images for query "${query}":`, error.message);
    }
    return [];
  }
}

/**
 * Shuffle array randomly
 */
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Fetch Pinterest-style vision board images
 * Supports main keyword + sub-keywords with aesthetic-focused queries
 */
export async function fetchVisionBoardImages(
  mainKeyword: string,
  subKeywords: string[] = [],
  maxImages: number = 30
): Promise<UnsplashImage[]> {
  if (!mainKeyword || mainKeyword.trim().length === 0) {
    throw new Error('Main keyword is required');
  }

  const allQueries: string[] = [];
  const mainKeywordTrimmed = mainKeyword.trim();

  // Main keyword variations
  allQueries.push(`${mainKeywordTrimmed} aesthetic`);
  allQueries.push(`${mainKeywordTrimmed} lifestyle`);
  allQueries.push(`${mainKeywordTrimmed} quote typography`);
  allQueries.push(`${mainKeywordTrimmed} minimal`);
  allQueries.push(`${mainKeywordTrimmed} inspirational`);

  // Sub-keyword variations
  for (const subKeyword of subKeywords) {
    const trimmed = subKeyword.trim();
    if (trimmed.length > 0) {
      allQueries.push(`${trimmed} aesthetic`);
      allQueries.push(`${trimmed} lifestyle`);
      allQueries.push(`${trimmed} quote typography`);
    }
  }

  // Perform all searches in parallel
  const searchPromises = allQueries.map((query) => performSearch(query, 10));
  const resultsArrays = await Promise.all(searchPromises);

  // Merge all results
  const allImages: UnsplashImage[] = [];
  for (const results of resultsArrays) {
    allImages.push(...results);
  }

  // Remove duplicates by ID
  const uniqueImagesMap = new Map<string, UnsplashImage>();
  for (const image of allImages) {
    if (!uniqueImagesMap.has(image.id)) {
      uniqueImagesMap.set(image.id, image);
    }
  }

  // Convert to array, shuffle, and limit
  const uniqueImages = Array.from(uniqueImagesMap.values());
  const shuffled = shuffleArray(uniqueImages);
  const limited = shuffled.slice(0, maxImages);

  return limited;
}

