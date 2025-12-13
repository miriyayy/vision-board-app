import { UNSPLASH_ACCESS_KEY, UNSPLASH_API_URL } from '@/config/unsplash';

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
 * Fetch images from Unsplash based on keywords
 */
export async function fetchImagesFromUnsplash(
  keywords: string[],
  count: number = 10
): Promise<UnsplashImage[]> {
  if (!UNSPLASH_ACCESS_KEY || UNSPLASH_ACCESS_KEY === 'YOUR_UNSPLASH_ACCESS_KEY') {
    throw new Error('Please add your Unsplash API key in config/unsplash.ts');
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

