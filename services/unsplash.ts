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

/**
 * Search images from Unsplash based on a keyword
 * Returns an array of image URLs
 */
export async function searchImages(keyword: string): Promise<string[]> {
  if (!UNSPLASH_ACCESS_KEY) {
    throw new Error('Please add your Unsplash API key in config/env.ts');
  }

  const url = `${UNSPLASH_API_URL}/search/photos?query=${encodeURIComponent(keyword)}&per_page=10&client_id=${UNSPLASH_ACCESS_KEY}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Unsplash API error: ${response.statusText}`);
    }
    const data: UnsplashResponse = await response.json();
    return data.results.map((image) => image.urls.regular);
  } catch (error) {
    console.error('Error fetching images from Unsplash:', error);
    throw error;
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

