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
import * as MediaLibrary from 'expo-media-library';
import { useRef, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import ViewShot from 'react-native-view-shot';

export default function CollageScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const collageViewRef = useRef<ViewShot>(null);

  const ratio = (params.ratio as ScreenRatio) || '9:16';
  const imageDataParam = params.imageData as string;

  const [collageImages, setCollageImages] = useState<CollageImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [collageMode, setCollageMode] = useState<CollageMode>('free');
  const [saving, setSaving] = useState(false);
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

  const saveToGallery = async () => {
    if (!collageViewRef.current) {
      Alert.alert('Error', 'Unable to capture collage. Please try again.');
      return;
    }

    if (saving) {
      return; // Prevent multiple simultaneous saves
    }

    setSaving(true);

    try {
      // Request media library permissions (write-only to avoid AUDIO permission on Android)
      const { status } = await MediaLibrary.requestPermissionsAsync(true);
      
      if (status !== 'granted') {
        console.warn('MediaLibrary permission denied. Status:', status);
        Alert.alert(
          'Permission Required',
          'Please grant permission to save images to your gallery.',
          [{ text: 'OK' }]
        );
        setSaving(false);
        return;
      }

      // Capture the collage view
      if (!collageViewRef.current) {
        throw new Error('ViewShot ref is not available');
      }

      console.log('Capturing collage view...');
      const uri = await collageViewRef.current.capture();

      if (!uri) {
        throw new Error('Failed to capture collage - no URI returned');
      }

      console.log('Collage captured successfully. URI:', uri);

      // Save to gallery
      console.log('Saving to gallery...');
      await MediaLibrary.saveToLibraryAsync(uri);

      console.log('Image saved to gallery successfully');
      // Show success message
      Alert.alert('Saved!', 'Your vision board is now in your gallery.');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorDetails = error instanceof Error ? error.stack : String(error);
      console.error('Error saving to gallery:', {
        message: errorMessage,
        details: errorDetails,
        error,
      });
      Alert.alert(
        'Error',
        'Failed to save image. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setSaving(false);
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

        <View style={styles.headerButtons}>
          <TouchableOpacity
            onPress={saveToGallery}
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.saveButtonText}>Save</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={regenerateCollage}
            style={styles.regenerateButton}
          >
            <Text style={styles.regenerateButtonText}>Regenerate</Text>
          </TouchableOpacity>
        </View>
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

      <ViewShot
        ref={collageViewRef}
        style={[
          styles.collageContainer,
          {
            width: screenDimensions.width,
            height: screenDimensions.height,
          },
        ]}
        options={{
          format: 'png',
          quality: 1.0,
        }}
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
                transform: [
                  { rotate: `${image.rotation}deg` },
                  { scale: image.scale || 1 },
                ],
              },
            ]}
            contentFit="cover"
            placeholder={{ blurhash: 'L6PZfSi_.AyE_3t7t7R**0o#DgR4' }}
            transition={200}
          />
        ))}
      </ViewShot>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9F8F6',
    padding: 24,
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9F8F6',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 24,
    alignItems: 'center',
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 12,
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
  saveButton: {
    backgroundColor: '#4A90E2',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    minWidth: 80,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  regenerateButton: {
    backgroundColor: '#2C2C2C',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  regenerateButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.5,
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
    borderRadius: 4,
    backgroundColor: '#E0E0E0',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  modeToggle: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 24,
    width: '100%',
    justifyContent: 'center',
    backgroundColor: '#F0F0F0',
    borderRadius: 12,
    padding: 4,
  },
  modeButton: {
    flex: 1,
    backgroundColor: 'transparent',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
    maxWidth: 200,
  },
  modeButtonActive: {
    backgroundColor: '#fff',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  modeButtonText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  modeButtonTextActive: {
    color: '#2C2C2C',
    fontWeight: '600',
  },
});
