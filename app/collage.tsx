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
import * as ImagePicker from 'expo-image-picker';
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
import { Ionicons } from '@expo/vector-icons';
import ViewShot from 'react-native-view-shot';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

interface DraggableImageProps {
  image: CollageImage;
  initialX: number;
  initialY: number;
  rotation: number;
  scale: number;
  mode: CollageMode;
  onDragEnd: (imageId: string, newX: number, newY: number) => void;
  onScaleEnd: (imageId: string, newScale: number) => void;
  onRemove: (imageId: string) => void;
}

function DraggableImage({
  image,
  initialX,
  initialY,
  rotation,
  scale: initialScale,
  mode,
  onDragEnd,
  onScaleEnd,
  onRemove,
}: DraggableImageProps) {
  const isDraggable = mode === 'free';
  
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const startX = useSharedValue(initialX);
  const startY = useSharedValue(initialY);
  
  // Scale state management
  const scale = useSharedValue(initialScale);
  const savedScale = useSharedValue(initialScale);
  
  // Z-index management for bringing active images to front
  const zIndex = useSharedValue(0);

  // Update start positions and scale when initial values change (e.g., after drag/scale ends or mode changes)
  useEffect(() => {
    startX.value = initialX;
    startY.value = initialY;
    translateX.value = 0;
    translateY.value = 0;
    scale.value = initialScale;
    savedScale.value = initialScale;
    // Reset z-index when mode changes (but keep it high if it was already high)
    if (mode !== 'free') {
      zIndex.value = 0;
    }
  }, [initialX, initialY, initialScale, mode]);

  const panGesture = Gesture.Pan()
    .enabled(isDraggable)
    .onStart(() => {
      // Bring image to front when gesture starts
      zIndex.value = 999;
      // Capture the current absolute position at drag start
      startX.value = initialX + translateX.value;
      startY.value = initialY + translateY.value;
    })
    .onUpdate((event) => {
      // Update translation based on gesture movement
      translateX.value = event.translationX;
      translateY.value = event.translationY;
    })
    .onEnd(() => {
      // Calculate final absolute position
      const finalX = startX.value + translateX.value;
      const finalY = startY.value + translateY.value;

      // Call onDragEnd callback on JS thread to update state
      runOnJS(onDragEnd)(image.id, finalX, finalY);

      // Reset translation values (position will be updated via state)
      translateX.value = 0;
      translateY.value = 0;
      // Keep z-index high for better UX (image stays in front)
    });

  const pinchGesture = Gesture.Pinch()
    .enabled(isDraggable)
    .onStart(() => {
      // Bring image to front when pinch starts
      zIndex.value = 999;
      // Store the current scale value at the start of pinch
      savedScale.value = scale.value;
    })
    .onUpdate((event) => {
      // Update scale based on gesture's scale change
      scale.value = savedScale.value * event.scale;
    })
    .onEnd(() => {
      // Call onScaleEnd callback on JS thread to update state with final scale
      runOnJS(onScaleEnd)(image.id, scale.value);
      // Keep z-index high for better UX (image stays in front)
    });

  // Long press gesture for removing images
  const longPressGesture = Gesture.LongPress()
    .enabled(isDraggable)
    .minDuration(500)
    .onStart(() => {
      // Show alert when long press is detected
      runOnJS(onRemove)(image.id);
    });

  // Combine pan, pinch, and long press gestures
  // Simultaneous allows all gestures to work together, but long press will only trigger
  // if the user holds for 500ms without significant movement (pan/pinch will take precedence if started)
  const combinedGesture = Gesture.Simultaneous(panGesture, pinchGesture, longPressGesture);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      zIndex: zIndex.value,
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { rotate: `${rotation}deg` },
        { scale: scale.value },
      ],
    };
  });

  return (
    <GestureDetector gesture={combinedGesture}>
      <Animated.View
        style={[
          {
            position: 'absolute',
            left: initialX,
            top: initialY,
            width: image.width,
            height: image.height,
          },
          animatedStyle,
        ]}
      >
        <Image
          source={{ uri: image.url }}
          style={[
            styles.collageImage,
            {
              width: '100%',
              height: '100%',
            },
          ]}
          contentFit="cover"
          placeholder={{ blurhash: 'L6PZfSi_.AyE_3t7t7R**0o#DgR4' }}
          transition={200}
        />
      </Animated.View>
    </GestureDetector>
  );
}

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

  const handleDragEnd = (imageId: string, newX: number, newY: number) => {
    setCollageImages((prevImages) =>
      prevImages.map((img) => {
        if (img.id !== imageId) return img;
        
        // Constrain position within canvas bounds
        const maxX = Math.max(0, screenDimensions.width - img.width);
        const maxY = Math.max(0, screenDimensions.height - img.height);
        
        return {
          ...img,
          x: Math.max(0, Math.min(newX, maxX)),
          y: Math.max(0, Math.min(newY, maxY)),
        };
      })
    );
  };

  const handleScaleEnd = (imageId: string, newScale: number) => {
    // Constrain scale to reasonable bounds (e.g., 0.5x to 3x)
    const constrainedScale = Math.max(0.5, Math.min(newScale, 3));
    
    setCollageImages((prevImages) =>
      prevImages.map((img) =>
        img.id === imageId ? { ...img, scale: constrainedScale } : img
      )
    );
  };

  const handleRemoveImage = (imageId: string) => {
    Alert.alert(
      'Remove Image',
      'Do you want to remove this image from your board?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            setCollageImages((prevImages) =>
              prevImages.filter((img) => img.id !== imageId)
            );
          },
        },
      ]
    );
  };

  const pickImage = async () => {
    try {
      // Request permissions (expo-image-picker handles this automatically)
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Please grant permission to access your photos.',
          [{ text: 'OK' }]
        );
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 1,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return; // User cancelled
      }

      const asset = result.assets[0];
      const imageUri = asset.uri;
      
      // Get image dimensions directly from the asset
      const imgWidth = asset.width;
      const imgHeight = asset.height;

      // Calculate display size (maintain aspect ratio, reasonable default size)
      const aspectRatio = imgWidth / imgHeight;
      const baseSize = Math.min(screenDimensions.width, screenDimensions.height) * 0.3;
      const displayWidth = baseSize;
      const displayHeight = baseSize / aspectRatio;

      // Position in center with slight randomness to avoid perfect stacking
      const centerX = (screenDimensions.width - displayWidth) / 2;
      const centerY = (screenDimensions.height - displayHeight) / 2;
      const randomOffsetX = (Math.random() - 0.5) * 40; // ±20px
      const randomOffsetY = (Math.random() - 0.5) * 40; // ±20px

      const newImage: CollageImage = {
        id: `user-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
        url: imageUri,
        x: Math.max(0, Math.min(centerX + randomOffsetX, screenDimensions.width - displayWidth)),
        y: Math.max(0, Math.min(centerY + randomOffsetY, screenDimensions.height - displayHeight)),
        width: displayWidth,
        height: displayHeight,
        scale: 1,
        rotation: (Math.random() - 0.5) * 10, // Slight random rotation for visual interest
        originalWidth: imgWidth,
        originalHeight: imgHeight,
      };

      // Add to collage images (will appear on top due to being last in array)
      setCollageImages((prevImages) => [...prevImages, newImage]);
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert(
        'Error',
        'Failed to add photo. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

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
          <DraggableImage
            key={image.id}
            image={image}
            initialX={image.x}
            initialY={image.y}
            rotation={image.rotation}
            scale={image.scale || 1}
            mode={collageMode}
            onDragEnd={handleDragEnd}
            onScaleEnd={handleScaleEnd}
            onRemove={handleRemoveImage}
          />
        ))}
      </ViewShot>

      {/* Floating Action Button for adding photos */}
      <TouchableOpacity
        onPress={pickImage}
        style={styles.fab}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
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
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#4A90E2',
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
});
