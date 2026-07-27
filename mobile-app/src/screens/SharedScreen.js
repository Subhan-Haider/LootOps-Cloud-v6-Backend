import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, SafeAreaView, ActivityIndicator, Image , Platform, StatusBar} from 'react-native';
import { getAuth } from 'firebase/auth';
import { Users, Link as LinkIcon } from 'lucide-react-native';
import axios from 'axios';

const API_BASE = 'https://storage.lootops.me';

export default function SharedScreen() {
  const [sharedFiles, setSharedFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [authToken, setAuthToken] = useState(null);

  const fetchShared = async () => {
    try {
      setLoading(true);
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) return;
      const token = await user.getIdToken();
      setAuthToken(token);
      
      const { data } = await axios.get(`${API_BASE}/admin/files`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Treat 'pinned' or 'public' as Partner Shared for now
      const shared = data.filter(file => file.pinned || file.isPublic);
      setSharedFiles(shared);
    } catch (err) {
      console.log('Failed to fetch shared files', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShared();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Partner Sharing</Text>
      </View>
      
      {loading ? (
        <View style={styles.center}><ActivityIndicator color="#4f46e5" /></View>
      ) : sharedFiles.length === 0 ? (
        <View style={styles.center}>
          <Users size={48} color="#334155" />
          <Text style={styles.emptyText}>No shared photos yet.</Text>
        </View>
      ) : (
        <FlatList
          data={sharedFiles}
          keyExtractor={(item) => item.url}
          numColumns={3}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.photoContainer}>
              <Image 
                source={{ 
                  uri: ((item.thumbnailUrl || item.url).startsWith('http') 
                    ? (item.thumbnailUrl || item.url) 
                    : `${API_BASE}${item.thumbnailUrl || item.url}`) 
                    + (!item.isPublic && authToken ? `?token=${authToken}` : '')
                }} 
                style={styles.photo} 
              />
              {item.isPublic && (
                <View style={styles.badge}>
                  <LinkIcon size={12} color="#fff" />
                </View>
              )}
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
  photocontainer: { paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0, flex: 1/3, aspectRatio: 1, padding: 1, backgroundColor: '#f8fafc' },
  photo: { width: '100%', height: '100%' },
  badge: { position: 'absolute', top: 5, right: 5, backgroundColor: '#4f46e5', borderRadius: 10, padding: 4 }
});
