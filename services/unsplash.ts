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
 * Fetch a single page of images from Unsplash search
 */
async function fetchSearchPage(
  query: string,
  page: number = 1,
  perPage: number = 30
): Promise<UnsplashImage[]> {
  if (!UNSPLASH_ACCESS_KEY) {
    throw new Error('Please add your Unsplash API key in config/env.ts');
  }

  const url = `${UNSPLASH_API_URL}/search/photos?query=${encodeURIComponent(query)}&page=${page}&per_page=${perPage}&client_id=${UNSPLASH_ACCESS_KEY}`;

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
      console.error(`Error fetching page ${page} for query "${query}":`, error.message);
      throw error;
    }
    throw new Error('Unknown error occurred while fetching images');
  }
}

/**
 * Fetch images from Unsplash based on keywords
 * Fetches multiple pages if needed to reach requiredImageCount
 */
export async function fetchImagesFromUnsplash(
  keywords: string[],
  requiredImageCount: number = 10
): Promise<UnsplashImage[]> {
  if (keywords.length === 0) {
    throw new Error('At least one keyword is required');
  }

  const query = keywords.join(',');
  const uniqueImagesMap = new Map<string, UnsplashImage>();
  const maxPages = 10; // Unsplash API limit
  const perPage = 30; // Maximum per page
  let currentPage = 1;

  try {
    while (uniqueImagesMap.size < requiredImageCount && currentPage <= maxPages) {
      const pageResults = await fetchSearchPage(query, currentPage, perPage);
      
      if (pageResults.length === 0) {
        // No more results available
        break;
      }

      // Add unique images (deduplicate by ID)
      for (const image of pageResults) {
        if (!uniqueImagesMap.has(image.id)) {
          uniqueImagesMap.set(image.id, image);
        }
      }

      // If we got fewer results than requested, we've reached the end
      if (pageResults.length < perPage) {
        break;
      }

      currentPage++;
    }

    const uniqueImages = Array.from(uniqueImagesMap.values());
    
    // If we still don't have enough, return what we have
    // (The collage generation will handle this gracefully)
    return uniqueImages;
  } catch (error) {
    console.error('Error fetching images from Unsplash:', error);
    throw error;
  }
}

interface ImageWithQuery {
  image: UnsplashImage;
  query: string;
}

/**
 * Perform a single Unsplash search with error handling
 * Fetches multiple pages if needed to reach the requested count
 */
async function performSearch(
  query: string,
  requiredCount: number = 10
): Promise<UnsplashImage[]> {
  if (!UNSPLASH_ACCESS_KEY) {
    throw new Error('Please add your Unsplash API key in config/env.ts');
  }

  const uniqueImagesMap = new Map<string, UnsplashImage>();
  const maxPages = 10;
  const perPage = 30;
  let currentPage = 1;

  try {
    while (uniqueImagesMap.size < requiredCount && currentPage <= maxPages) {
      const url = `${UNSPLASH_API_URL}/search/photos?query=${encodeURIComponent(query)}&page=${currentPage}&per_page=${perPage}&client_id=${UNSPLASH_ACCESS_KEY}`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Invalid Unsplash API key');
        } else if (response.status === 403) {
          throw new Error('Unsplash API rate limit exceeded');
        } else {
          // For non-critical errors on later pages, return what we have
          if (currentPage > 1) {
            break;
          }
          throw new Error(`Unsplash API error: ${response.status} ${response.statusText}`);
        }
      }

      const data: UnsplashResponse = await response.json();
      
      if (data.results.length === 0) {
        break;
      }

      // Add unique images
      for (const image of data.results) {
        if (!uniqueImagesMap.has(image.id)) {
          uniqueImagesMap.set(image.id, image);
        }
      }

      // If we got fewer results than requested, we've reached the end
      if (data.results.length < perPage) {
        break;
      }

      currentPage++;
    }

    return Array.from(uniqueImagesMap.values());
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Error fetching images for query "${query}":`, error.message);
      // Return what we have so far if we got some results
      if (uniqueImagesMap.size > 0) {
        return Array.from(uniqueImagesMap.values());
      }
      throw error;
    }
    return [];
  }
}

/**
 * Check if a query is text-based (contains quote, typography, or text)
 */
function isTextBasedQuery(query: string): boolean {
  const lowerQuery = query.toLowerCase();
  return lowerQuery.includes('quote') || lowerQuery.includes('typography') || lowerQuery.includes('text');
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
 * Enforces 30% max text-based images, 70% min photo images
 * Fetches multiple pages if needed to reach requiredImageCount
 */
export async function fetchVisionBoardImages(
  mainKeyword: string,
  subKeywords: string[] = [],
  requiredImageCount: number = 30
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

  // Calculate how many images to fetch per query
  // Distribute requiredImageCount across queries, with minimum per query
  const imagesPerQuery = Math.max(10, Math.ceil(requiredImageCount / allQueries.length));
  
  // Perform all searches in parallel
  const searchPromises = allQueries.map((query) => performSearch(query, imagesPerQuery));
  const resultsArrays = await Promise.all(searchPromises);

  // Pair images with their source queries
  const imagesWithQueries: ImageWithQuery[] = [];
  for (let i = 0; i < allQueries.length; i++) {
    const query = allQueries[i];
    const results = resultsArrays[i];
    for (const image of results) {
      imagesWithQueries.push({ image, query });
    }
  }

  // Remove duplicates by image ID (keep first occurrence)
  const uniqueImagesMap = new Map<string, ImageWithQuery>();
  for (const item of imagesWithQueries) {
    if (!uniqueImagesMap.has(item.image.id)) {
      uniqueImagesMap.set(item.image.id, item);
    }
  }

  // Categorize into text-based and photo images
  const textBasedImages: UnsplashImage[] = [];
  const photoImages: UnsplashImage[] = [];

  for (const item of uniqueImagesMap.values()) {
    if (isTextBasedQuery(item.query)) {
      textBasedImages.push(item.image);
    } else {
      photoImages.push(item.image);
    }
  }

  // Shuffle both categories
  const shuffledTextBased = shuffleArray(textBasedImages);
  const shuffledPhoto = shuffleArray(photoImages);

  // Calculate max text-based images (30% of requiredImageCount)
  const maxTextBased = Math.floor(requiredImageCount * 0.3);
  const minPhoto = Math.ceil(requiredImageCount * 0.7);

  // Trim text-based images if they exceed the ratio
  const selectedTextBased = shuffledTextBased.slice(0, maxTextBased);
  const remainingSlots = requiredImageCount - selectedTextBased.length;

  // Fill remaining slots with photo images
  const selectedPhoto = shuffledPhoto.slice(0, remainingSlots);

  // Combine and shuffle final result
  const finalImages = [...selectedTextBased, ...selectedPhoto];
  const finalShuffled = shuffleArray(finalImages);

  return finalShuffled;
}

