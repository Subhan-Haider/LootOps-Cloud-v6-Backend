import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, SafeAreaView, ActivityIndicator, Alert, TextInput , Platform, StatusBar} from 'react-native';
import { getAuth } from 'firebase/auth';
import { Folder, Plus } from 'lucide-react-native';
import axios from 'axios';

const API_BASE = 'https://storage.lootops.me';

export default function AlbumsScreen() {
  const [albums, setAlbums] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newAlbumName, setNewAlbumName] = useState('');

  const fetchAlbums = async () => {
    try {
      setLoading(true);
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) return;
      const token = await user.getIdToken();
      
      // Fetch all files
      const { data } = await axios.get(`${API_BASE}/admin/files`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Extract unique subfolders in MobileBackups
      const folders = new Set();
      data.forEach(file => {
        if (file.folder && file.folder.startsWith('MobileBackups/')) {
          const albumName = file.folder.replace('MobileBackups/', '');
          if (albumName) folders.add(albumName);
        }
      });
      
      setAlbums(Array.from(folders));
    } catch (err) {
      console.log('Failed to fetch albums', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAlbum = async () => {
    if (!newAlbumName.trim()) return;
    try {
      const auth = getAuth();
      const token = await auth.currentUser?.getIdToken();
      const fullFolderName = `MobileBackups/${newAlbumName.trim()}`;
      
      await axios.post(`${API_BASE}/admin/create-folder`, { folder: fullFolderName }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setNewAlbumName('');
      fetchAlbums();
    } catch (err) {
      Alert.alert("Error", "Failed to create album");
    }
  };

  useEffect(() => {
    fetchAlbums();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Cloud Albums</Text>
      </View>
      
      <View style={styles.createSection}>
        <TextInput 
          style={styles.input}
          placeholder="New Album Name..."
          placeholderTextColor="#64748b"
          value={newAlbumName}
          onChangeText={setNewAlbumName}
        />
        <TouchableOpacity style={styles.createButton} onPress={handleCreateAlbum}>
          <Plus size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color="#4f46e5" /></View>
      ) : albums.length === 0 ? (
        <View style={styles.center}>
          <Folder size={48} color="#334155" />
          <Text style={styles.emptyText}>No albums found.</Text>
        </View>
      ) : (
        <FlatList
          data={albums}
          keyExtractor={(item) => item}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.albumItem}>
              <Folder size={24} color="#4f46e5" style={{marginRight: 15}} />
              <Text style={styles.albumText}>{item}</Text>
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
  title: { fontSize: 20, fontWeight: 'bold', color: '#0f172a' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: '#64748b', marginTop: 10, fontSize: 16 },
  albumItem: { flexDirection: 'row', padding: 20, borderBottomWidth: 1, borderBottomColor: '#e2e8f0', alignItems: 'center', backgroundColor: '#ffffff' },
  albumText: { color: '#334155', fontSize: 16, fontWeight: '500' },
  createSection: { flexDirection: 'row', padding: 16, borderBottomWidth: 1, borderBottomColor: '#e2e8f0', backgroundColor: '#ffffff' },
  input: { flex: 1, backgroundColor: '#f1f5f9', color: '#0f172a', padding: 12, borderRadius: 8, marginRight: 10, borderWidth: 1, borderColor: '#e2e8f0' },
  createButton: { backgroundColor: '#4f46e5', padding: 12, borderRadius: 8, justifyContent: 'center', alignItems: 'center' }
});
