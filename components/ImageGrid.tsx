import { FlatList, StyleSheet, View, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { SearchImageResult } from '@/services/unsplash';

interface ImageGridProps {
  images: SearchImageResult[];
  numColumns?: number;
}

export default function ImageGrid({ images, numColumns = 2 }: ImageGridProps) {
  const screenWidth = Dimensions.get('window').width;
  const gap = 12;
  const padding = 24;
  const availableWidth = screenWidth - padding * 2;
  const itemSize = (availableWidth - gap * (numColumns - 1)) / numColumns;

  const renderItem = ({ item }: { item: SearchImageResult }) => (
    <View style={[styles.imageContainer, { width: itemSize, height: itemSize }]}>
      <Image
        source={{ uri: item.smallUrl }}
        style={styles.image}
        contentFit="cover"
      />
    </View>
  );

  return (
    <FlatList
      data={images}
      renderItem={renderItem}
      keyExtractor={(item) => item.id}
      numColumns={numColumns}
      contentContainerStyle={styles.container}
      columnWrapperStyle={numColumns > 1 ? styles.row : undefined}
      showsVerticalScrollIndicator={false}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    gap: 12,
  },
  row: {
    gap: 12,
  },
  imageContainer: {
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#E5E5E5',
  },
  image: {
    width: '100%',
    height: '100%',
  },
});





