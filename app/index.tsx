import ImageGrid from '@/components/ImageGrid';
import { fetchImagesFromUnsplash, SearchImageResult, searchImages } from '@/services/unsplash';
import { ScreenRatio } from '@/utils/collage';
import { calculateRequiredImageCountForRatio } from '@/utils/imageSupply';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

export default function InputScreen() {
  const [keywords, setKeywords] = useState<string>('');
  const [keywordInput, setKeywordInput] = useState<string>('');
  const [ratio, setRatio] = useState<ScreenRatio>('9:16');
  const [loading, setLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchImageResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const router = useRouter();

  const handleKeywordSubmit = async () => {
    if (!keywordInput.trim()) {
      return;
    }

    setSearchLoading(true);
    try {
      const images = await searchImages(keywordInput);
      setSearchResults(images);
    } catch (error) {
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'Failed to fetch images. Please check your API key.'
      );
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleGenerate = async () => {
    const keywordList = keywords
      .split(',')
      .map((k) => k.trim())
      .filter((k) => k.length > 0);

    if (keywordList.length === 0) {
      Alert.alert('Error', 'Please enter at least one keyword');
      return;
    }

    setLoading(true);
    try {
      // Calculate required image count for both modes (use the higher count)
      const screenWidth = Dimensions.get('window').width - 48;
      const requiredForFree = calculateRequiredImageCountForRatio(ratio, 'free', screenWidth);
      const requiredForGrid = calculateRequiredImageCountForRatio(ratio, 'grid', screenWidth);
      const requiredImageCount = Math.max(requiredForFree, requiredForGrid);
      
      const images = await fetchImagesFromUnsplash(keywordList, requiredImageCount);
      
      if (images.length === 0) {
        Alert.alert('No Results', 'No images found for your keywords. Try different keywords.');
        setLoading(false);
        return;
      }

      router.push({
        pathname: '/collage',
        params: {
          ratio: ratio,
          imageData: JSON.stringify(images),
        },
      });
    } catch (error) {
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'Failed to fetch images. Please check your API key.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Vision Board Generator</Text>
        <Text style={styles.subtitle}>Create your aesthetic vision board</Text>

        <View style={styles.section}>
          <Text style={styles.label}>Keyword</Text>
          <TextInput
            style={styles.singleInput}
            placeholder="Enter a keyword"
            placeholderTextColor="#999"
            value={keywordInput}
            onChangeText={setKeywordInput}
            onSubmitEditing={handleKeywordSubmit}
            returnKeyType="done"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Keywords (comma-separated)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., nature, minimalism, travel"
            placeholderTextColor="#999"
            value={keywords}
            onChangeText={setKeywords}
            multiline
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Screen Ratio</Text>
          <View style={styles.ratioContainer}>
            <TouchableOpacity
              style={[styles.ratioButton, ratio === '9:16' && styles.ratioButtonActive]}
              onPress={() => setRatio('9:16')}
            >
              <Text style={[styles.ratioText, ratio === '9:16' && styles.ratioTextActive]}>
                9:16 (Phone)
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.ratioButton, ratio === '16:9' && styles.ratioButtonActive]}
              onPress={() => setRatio('16:9')}
            >
              <Text style={[styles.ratioText, ratio === '16:9' && styles.ratioTextActive]}>
                16:9 (Desktop)
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.generateButton, loading && styles.generateButtonDisabled]}
          onPress={handleGenerate}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.generateButtonText}>Generate Vision Board</Text>
          )}
        </TouchableOpacity>

        {searchLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2C2C2C" />
          </View>
        )}

        {!searchLoading && searchResults.length > 0 && (
          <View style={styles.resultsContainer}>
            <Text style={styles.resultsTitle}>Search Results</Text>
            <ImageGrid images={searchResults} />
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#FAFAFA',
  },
  content: {
    padding: 24,
    paddingTop: 60,
  },
  title: {
    fontSize: 32,
    fontWeight: '300',
    color: '#2C2C2C',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 40,
    fontWeight: '300',
  },
  section: {
    marginBottom: 32,
  },
  label: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#2C2C2C',
    minHeight: 100,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  singleInput: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#2C2C2C',
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  ratioContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  ratioButton: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  ratioButtonActive: {
    backgroundColor: '#2C2C2C',
    borderColor: '#2C2C2C',
  },
  ratioText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  ratioTextActive: {
    color: '#fff',
  },
  generateButton: {
    backgroundColor: '#2C2C2C',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    marginTop: 8,
  },
  generateButtonDisabled: {
    opacity: 0.6,
  },
  generateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  loadingContainer: {
    padding: 24,
    alignItems: 'center',
  },
  resultsContainer: {
    marginTop: 32,
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C2C2C',
    marginBottom: 16,
    paddingHorizontal: 24,
  },
});

