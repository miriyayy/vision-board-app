import { UnsplashImage } from '@/services/unsplash';
import {
    CollageImage,
    generateCollage,
    getScreenDimensions,
    ScreenRatio,
} from '@/utils/collage';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

export default function CollageScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const ratio = (params.ratio as ScreenRatio) || '9:16';
  const imageDataParam = params.imageData as string;

  const [collageImages, setCollageImages] = useState<CollageImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [screenDimensions, setScreenDimensions] = useState({
    width: 0,
    height: 0,
  });

  useEffect(() => {
    if (!imageDataParam) return;

    try {
      const imageData: UnsplashImage[] = JSON.parse(imageDataParam);

      const screenWidth = Dimensions.get('window').width - 48;
      const dimensions = getScreenDimensions(ratio, screenWidth);
      setScreenDimensions(dimensions);

      const collage = generateCollage(
        imageData,
        dimensions.width,
        dimensions.height
      );
      setCollageImages(collage);
    } catch (error) {
      Alert.alert('Error', 'Failed to generate collage');
      router.back();
    } finally {
      setLoading(false);
    }
  }, [imageDataParam, ratio]);

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
          onPress={() => {
            const imageData: UnsplashImage[] = JSON.parse(imageDataParam);
            const dimensions = getScreenDimensions(
              ratio,
              Dimensions.get('window').width - 48
            );
            const newCollage = generateCollage(
              imageData,
              dimensions.width,
              dimensions.height
            );
            setCollageImages(newCollage);
          }}
          style={styles.regenerateButton}
        >
          <Text style={styles.regenerateButtonText}>Regenerate</Text>
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
});
