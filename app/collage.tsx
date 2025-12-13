import { UnsplashImage } from '@/services/unsplash';
import {
    CollageImage,
    CollageMode,
    generateCollage,
    generateFreeCollage,
    generateGridCollage,
    getScreenDimensions,
    ScreenRatio,
} from '@/utils/collage';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

export default function CollageScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const ratio = (params.ratio as ScreenRatio) || '9:16';
  const imageDataParam = params.imageData as string;

  const [collageImages, setCollageImages] = useState<CollageImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [collageMode, setCollageMode] = useState<CollageMode>('free');
  const [screenDimensions, setScreenDimensions] = useState({
    width: 0,
    height: 0,
  });

  useEffect(() => {
    if (!imageDataParam) return;

    try {
      const imageData: UnsplashImage[] = JSON.parse(imageDataParam);

      // Safety check: ensure we have valid image data
      if (!Array.isArray(imageData) || imageData.length === 0) {
        console.warn('CollageScreen: Invalid or empty image data');
        setCollageImages([]);
        setLoading(false);
        return;
      }

      const screenWidth = Dimensions.get('window').width - 48;
      const dimensions = getScreenDimensions(ratio, screenWidth);
      
      // Safety check: ensure valid dimensions
      if (dimensions.width <= 0 || dimensions.height <= 0) {
        console.warn('CollageScreen: Invalid screen dimensions');
        setCollageImages([]);
        setLoading(false);
        return;
      }
      
      setScreenDimensions(dimensions);

      const collage = generateCollage(
        imageData,
        dimensions.width,
        dimensions.height,
        collageMode
      );
      
      // Safety check: ensure we got valid collage result
      if (Array.isArray(collage)) {
        setCollageImages(collage);
      } else {
        console.warn('CollageScreen: Invalid collage result, using empty array');
        setCollageImages([]);
      }
    } catch (error) {
      // Log error but don't show alert - grid generation should never throw now
      console.error('CollageScreen: Error generating collage:', error);
      setCollageImages([]);
    } finally {
      setLoading(false);
    }
  }, [imageDataParam, ratio, collageMode]);

  const regenerateCollage = () => {
    if (!imageDataParam) return;
    try {
      const imageData: UnsplashImage[] = JSON.parse(imageDataParam);
      
      // Safety check
      if (!Array.isArray(imageData) || imageData.length === 0) {
        console.warn('regenerateCollage: Invalid or empty image data');
        return;
      }
      
      const dimensions = getScreenDimensions(
        ratio,
        Dimensions.get('window').width - 48
      );
      
      // Safety check
      if (dimensions.width <= 0 || dimensions.height <= 0) {
        console.warn('regenerateCollage: Invalid screen dimensions');
        return;
      }
      
      let newCollage: CollageImage[];
      if (collageMode === 'free') {
        newCollage = generateFreeCollage(
          imageData,
          dimensions.width,
          dimensions.height
        );
      } else {
        newCollage = generateGridCollage(
          imageData,
          dimensions.width,
          dimensions.height
        );
      }
      
      // Safety check: ensure valid result
      if (Array.isArray(newCollage)) {
        setCollageImages(newCollage);
      } else {
        console.warn('regenerateCollage: Invalid collage result');
      }
    } catch (error) {
      // Log but don't throw - grid generation should never throw now
      console.error('Error regenerating collage:', error);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2C2C2C" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={regenerateCollage}
          style={styles.regenerateButton}
        >
          <Text style={styles.regenerateButtonText}>Regenerate</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.modeToggle}>
        <TouchableOpacity
          onPress={() => {
            setCollageMode('free');
          }}
          style={[
            styles.modeButton,
            collageMode === 'free' && styles.modeButtonActive,
          ]}
        >
          <Text
            style={[
              styles.modeButtonText,
              collageMode === 'free' && styles.modeButtonTextActive,
            ]}
          >
            Free Style
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => {
            setCollageMode('grid');
          }}
          style={[
            styles.modeButton,
            collageMode === 'grid' && styles.modeButtonActive,
          ]}
        >
          <Text
            style={[
              styles.modeButtonText,
              collageMode === 'grid' && styles.modeButtonTextActive,
            ]}
          >
            Symmetric Grid
          </Text>
        </TouchableOpacity>
      </View>

      <View
        style={[
          styles.collageContainer,
          {
            width: screenDimensions.width,
            height: screenDimensions.height,
          },
        ]}
      >
        {collageImages.map((image) => (
          <Image
            key={image.id}
            source={{ uri: image.url }}
            style={[
              styles.collageImage,
              {
                position: 'absolute',
                left: image.x,
                top: image.y,
                width: image.width,
                height: image.height,
                transform: [{ rotate: `${image.rotation}deg` }],
              },
            ]}
            contentFit="cover"
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
    padding: 24,
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 24,
    alignItems: 'center',
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: 16,
    color: '#2C2C2C',
    fontWeight: '500',
  },
  regenerateButton: {
    backgroundColor: '#2C2C2C',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  regenerateButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  collageContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  collageImage: {
    borderRadius: 8,
  },
  modeToggle: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
    width: '100%',
    justifyContent: 'center',
  },
  modeButton: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    maxWidth: 200,
  },
  modeButtonActive: {
    backgroundColor: '#2C2C2C',
    borderColor: '#2C2C2C',
  },
  modeButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  modeButtonTextActive: {
    color: '#fff',
  },
});
