import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Image, SafeAreaView, ActivityIndicator, TouchableOpacity, Alert , Platform, StatusBar} from 'react-native';
import * as MediaLibrary from 'expo-media-library';
import DocumentScanner from 'react-native-document-scanner-plugin';
import { ScanText, Image as ImageIcon } from 'lucide-react-native';

export default function TimelineScreen({ navigation }) {
  const [hasPermission, setHasPermission] = useState(null);
  const [assets, setAssets] = useState([]);
  const [endCursor, setEndCursor] = useState(null);
  const [hasNextPage, setHasNextPage] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchAssets = async (loadMore = false) => {
    if (!loadMore) {
      setHasNextPage(true);
      setEndCursor(null);
    }
    
    if (loadMore && (!hasNextPage || loadingMore)) return;

    const { status } = await MediaLibrary.requestPermissionsAsync();
    setHasPermission(status === 'granted');

    if (status === 'granted') {
      if (loadMore) setLoadingMore(true);
      
      const { assets: newAssets, endCursor: newCursor, hasNextPage: hasNext } = await MediaLibrary.getAssetsAsync({ 
        first: 50, 
        mediaType: ['photo', 'video'],
        sortBy: [[MediaLibrary.SortBy.creationTime, false]],
        ...(loadMore && endCursor ? { after: endCursor } : {})
      });
      
      setAssets(prev => loadMore ? [...prev, ...newAssets] : newAssets);
      setEndCursor(newCursor);
      setHasNextPage(hasNext);
      
      if (loadMore) setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchAssets();
  }, []);

  const handleScanDocument = async () => {
    try {
      const { scannedImages } = await DocumentScanner.scanDocument({
        croppedImageQuality: 100,
        letUserAdjustCrop: true,
      });

      if (scannedImages && scannedImages.length > 0) {
        // Save the first scanned image to the media library
        await MediaLibrary.createAssetAsync(scannedImages[0]);
        Alert.alert('Success', 'Document scanned and saved successfully!');
        fetchAssets(); // Refresh gallery
      }
    } catch (error) {
      console.log('Scanner error:', error);
      Alert.alert('Error', 'Failed to scan document.');
    }
  };

  if (hasPermission === null) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#4f46e5" /></View>;
  }

  if (hasPermission === false) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Permission to access gallery was denied.</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Timeline</Text>
      </View>
      {assets.length === 0 ? (
        <View style={styles.center}>
          <ImageIcon size={48} color="#334155" />
          <Text style={styles.emptyText}>No local photos or videos found.</Text>
        </View>
      ) : (
        <FlatList
          data={assets}
          keyExtractor={(item) => item.id}
          numColumns={3}
          onEndReached={() => fetchAssets(true)}
          onEndReachedThreshold={0.5}
          ListFooterComponent={loadingMore ? <ActivityIndicator style={{ margin: 20 }} color="#4f46e5" /> : null}
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={styles.imageContainer}
              onPress={() => navigation.navigate('ImageEditor', { uri: item.uri })}
            >
              <Image source={{ uri: item.uri }} style={styles.image} />
            </TouchableOpacity>
          )}
        />
      )}
      
      {/* Floating Action Button for Document Scanner */}
      <TouchableOpacity style={styles.fab} onPress={handleScanDocument}>
        <ScanText size={24} color="#ffffff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  header: {
    padding: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  imagecontainer: { paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    width: '33.33%',
    aspectRatio: 1,
    borderWidth: 1,
    borderColor: '#f8fafc',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  errorText: {
    color: '#334155',
    fontSize: 16,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    backgroundColor: '#4f46e5',
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 8, // for Android
  }
});
