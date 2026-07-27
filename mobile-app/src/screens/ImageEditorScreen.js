import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, SafeAreaView, Dimensions, Alert , Platform, StatusBar} from 'react-native';
import ViewShot from 'react-native-view-shot';
import * as ImageManipulator from 'expo-image-manipulator';
import { Save, X, RotateCw, Settings2, SlidersHorizontal } from 'lucide-react-native';

const { width } = Dimensions.get('window');

const FILTERS = [
  { name: 'Normal', overlay: 'transparent' },
  { name: 'Vintage', overlay: 'rgba(120, 70, 20, 0.3)' },
  { name: 'Cool', overlay: 'rgba(20, 70, 180, 0.2)' },
  { name: 'Warm', overlay: 'rgba(200, 100, 20, 0.2)' },
  { name: 'Noir', overlay: 'rgba(0, 0, 0, 0.5)' },
];

export default function ImageEditorScreen({ route, navigation }) {
  const { uri } = route.params;
  const [currentUri, setCurrentUri] = useState(uri);
  const [activeFilter, setActiveFilter] = useState(FILTERS[0]);
  const [brightness, setBrightness] = useState(0);
  const viewShotRef = useRef(null);

  const handleRotate = async () => {
    try {
      const result = await ImageManipulator.manipulateAsync(
        currentUri,
        [{ rotate: 90 }],
        { compress: 1, format: ImageManipulator.SaveFormat.JPEG }
      );
      setCurrentUri(result.uri);
    } catch (e) {
      console.log(e);
    }
  };

  const handleSave = async () => {
    try {
      const savedUri = await viewShotRef.current.capture();
      // Normally we'd upload this or save to media library.
      // For now, we alert success and return.
      Alert.alert('Saved!', 'Image edited successfully!', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (e) {
      Alert.alert('Error', 'Failed to save image.');
    }
  };

  const brightnessOverlay = brightness > 0 
    ? `rgba(255,255,255,${brightness * 0.1})` 
    : `rgba(0,0,0,${Math.abs(brightness) * 0.1})`;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <X color="#fff" size={24} />
        </TouchableOpacity>
        <Text style={styles.title}>Edit Photo</Text>
        <TouchableOpacity onPress={handleSave}>
          <Save color="#4f46e5" size={24} />
        </TouchableOpacity>
      </View>

      <View style={styles.previewContainer}>
        <ViewShot ref={viewShotRef} options={{ format: 'jpg', quality: 0.9 }} style={styles.viewShot}>
          <Image source={{ uri: currentUri }} style={styles.image} resizeMode="contain" />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: activeFilter.overlay }]} pointerEvents="none" />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: brightnessOverlay }]} pointerEvents="none" />
        </ViewShot>
      </View>

      <View style={styles.toolsContainer}>
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.toolBtn} onPress={handleRotate}>
            <RotateCw color="#fff" size={24} />
            <Text style={styles.toolText}>Rotate</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.toolBtn} onPress={() => setBrightness(b => Math.min(b + 1, 5))}>
            <SlidersHorizontal color="#fff" size={24} />
            <Text style={styles.toolText}>Brighter</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.toolBtn} onPress={() => setBrightness(b => Math.max(b - 1, -5))}>
            <Settings2 color="#fff" size={24} />
            <Text style={styles.toolText}>Darker</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Filters</Text>
        <View style={styles.filtersRow}>
          {FILTERS.map(f => (
            <TouchableOpacity 
              key={f.name} 
              style={[styles.filterBtn, activeFilter.name === f.name && styles.filterBtnActive]}
              onPress={() => setActiveFilter(f)}
            >
              <Text style={[styles.filterText, activeFilter.name === f.name && styles.filterTextActive]}>{f.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0, flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', justifyContent: 'space-between', padding: 16, alignItems: 'center', backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  title: { color: '#0f172a', fontSize: 18, fontWeight: 'bold' },
  previewcontainer: { paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0, flex: 1, justifyContent: 'center', alignItems: 'center', padding: 16 },
  viewShot: { width: width - 32, aspectRatio: 3/4, backgroundColor: '#e2e8f0', borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#e2e8f0' },
  image: { width: '100%', height: '100%' },
  toolscontainer: { paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0, padding: 20, backgroundColor: '#ffffff', borderTopLeftRadius: 24, borderTopRightRadius: 24, shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 10 },
  actionRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 20 },
  toolBtn: { alignItems: 'center' },
  toolText: { color: '#64748b', marginTop: 8, fontSize: 12 },
  sectionTitle: { color: '#0f172a', fontSize: 14, fontWeight: 'bold', marginBottom: 12 },
  filtersRow: { flexDirection: 'row', justifyContent: 'space-between' },
  filterBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20, backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0' },
  filterBtnActive: { backgroundColor: '#4f46e5', borderColor: '#4f46e5' },
  filterText: { color: '#64748b', fontSize: 12 },
  filterTextActive: { color: '#ffffff', fontWeight: 'bold' },
});
