import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, Switch, TouchableOpacity , Platform, StatusBar} from 'react-native';
import { getAuth, signOut } from 'firebase/auth';
import { registerBackgroundSync, unregisterBackgroundSync, isBackgroundSyncRegistered } from '../services/BackgroundSync';
import { useEffect, useState } from 'react';

export default function SettingsScreen() {
  const [isRegistered, setIsRegistered] = useState(false);

  useEffect(() => {
    isBackgroundSyncRegistered().then(setIsRegistered);
  }, []);

  const handleToggle = async (value) => {
    if (value) {
      await registerBackgroundSync();
    } else {
      await unregisterBackgroundSync();
    }
    setIsRegistered(value);
  };

  const handleLogout = () => {
    const auth = getAuth();
    signOut(auth);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
      </View>
      
      <View style={styles.section}>
        <View style={styles.row}>
          <Text style={styles.rowText}>Background Auto-Backup</Text>
          <Switch 
            value={isRegistered} 
            onValueChange={handleToggle} 
            trackColor={{ false: '#334155', true: '#4f46e5' }}
          />
        </View>
        <Text style={styles.helperText}>
          Automatically backs up new photos and videos to your personal cloud every 15 minutes.
        </Text>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Sign Out</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0, flex: 1, backgroundColor: '#f8fafc' },
  header: { padding: 16, backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  title: { fontSize: 20, fontWeight: 'bold', color: '#0f172a' },
  section: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#e2e8f0', backgroundColor: '#ffffff', marginTop: 16, borderTopWidth: 1 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowText: { fontSize: 16, color: '#0f172a' },
  helperText: { fontSize: 13, color: '#64748b', marginTop: 8 },
  logoutButton: { margin: 16, padding: 16, backgroundColor: '#ef4444', borderRadius: 8, alignItems: 'center' },
  logoutText: { color: '#ffffff', fontWeight: 'bold', fontSize: 16 },
});
