import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, FlatList, Image, SafeAreaView, TouchableOpacity, ActivityIndicator , Platform, StatusBar} from 'react-native';
import { getAuth } from 'firebase/auth';
import { Search as SearchIcon } from 'lucide-react-native';
import axios from 'axios';

const API_BASE = 'https://storage.lootops.me';

export default function SearchScreen({ navigation }) {
  const [query, setQuery] = useState('');
  const [allFiles, setAllFiles] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchRemoteFiles();
  }, []);

  const fetchRemoteFiles = async () => {
    try {
      setLoading(true);
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) return;
      const token = await user.getIdToken();
      
      const { data } = await axios.get(`${API_BASE}/admin/files`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setAllFiles(data);
      setResults(data); // initially show all or maybe hide until search
    } catch (err) {
      console.log('Failed to fetch files for search', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (text) => {
    setQuery(text);
    if (!text.trim()) {
      setResults(allFiles);
      return;
    }

    const lowerQ = text.toLowerCase();
    const filtered = allFiles.filter(file => {
      const matchName = file.name?.toLowerCase().includes(lowerQ);
      const matchFolder = file.folder?.toLowerCase().includes(lowerQ);
      // PhotoPrism semantic search using our Tesseract OCR tags
      const matchTags = file.tags && file.tags.some(tag => tag.toLowerCase().includes(lowerQ));
      return matchName || matchFolder || matchTags;
    });

    setResults(filtered);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.searchBox}>
          <SearchIcon size={20} color="#94a3b8" />
          <TextInput
            style={styles.input}
            placeholder="Search by object, text, or file name..."
            placeholderTextColor="#64748b"
            value={query}
            onChangeText={handleSearch}
          />
        </View>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color="#4f46e5" /></View>
      ) : results.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>No matching photos found.</Text>
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item.url}
          numColumns={3}
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={styles.photoContainer}
              onPress={() => navigation.navigate('ImageEditor', { uri: item.url })}
            >
              <Image 
                source={{ uri: item.thumbnailUrl || item.url }} 
                style={styles.photo} 
              />
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0, flex: 1, backgroundColor: '#f8fafc' },
  header: { padding: 16, backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f1f5f9', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: '#e2e8f0' },
  input: { flex: 1, color: '#0f172a', marginLeft: 8, fontSize: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: '#64748b', marginTop: 10, fontSize: 16 },
  photocontainer: { paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0, flex: 1/3, aspectRatio: 1, padding: 1, backgroundColor: '#f8fafc' },
  photo: { width: '100%', height: '100%' },
});
