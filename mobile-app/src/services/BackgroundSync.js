import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAuth } from 'firebase/auth';

const BACKGROUND_SYNC_TASK = 'BACKGROUND_SYNC_TASK';
const LAST_SYNC_KEY = 'lastSyncTimestamp';
const API_BASE = 'https://storage.lootops.me';

// Define the background task
TaskManager.defineTask(BACKGROUND_SYNC_TASK, async () => {
  try {
    console.log('[BackgroundSync] Starting background sync...');
    
    // 1. Ensure user is logged in
    const auth = getAuth();
    if (!auth.currentUser) {
      console.log('[BackgroundSync] No user logged in. Aborting.');
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }
    
    const token = await auth.currentUser.getIdToken();
    
    // 2. Get permissions
    const { status } = await MediaLibrary.requestPermissionsAsync();
    if (status !== 'granted') {
      console.log('[BackgroundSync] Media Library permissions not granted.');
      return BackgroundFetch.BackgroundFetchResult.Failed;
    }

    // 3. Get last sync time
    const lastSyncStr = await AsyncStorage.getItem(LAST_SYNC_KEY);
    const lastSyncTime = lastSyncStr ? parseInt(lastSyncStr, 10) : 0;
    
    // 4. Fetch recent photos
    const { assets } = await MediaLibrary.getAssetsAsync({
      first: 50,
      mediaType: ['photo', 'video'],
      sortBy: [[MediaLibrary.SortBy.creationTime, false]],
    });

    if (assets.length === 0) {
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    const newAssets = assets.filter(asset => asset.creationTime > lastSyncTime);
    
    if (newAssets.length === 0) {
      console.log('[BackgroundSync] No new assets to backup.');
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    console.log(`[BackgroundSync] Found ${newAssets.length} new assets. Starting upload...`);

    // 5. Upload new assets
    for (const asset of newAssets) {
      const fileUri = asset.uri;
      const fileName = asset.filename;
      
      const uploadUrl = `${API_BASE}/admin/upload?folder=MobileBackups`;
      
      try {
        const response = await FileSystem.uploadAsync(uploadUrl, fileUri, {
          httpMethod: 'POST',
          uploadType: FileSystem.FileSystemUploadType.MULTIPART,
          fieldName: 'files',
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        
        if (response.status !== 200) {
          console.error(`[BackgroundSync] Failed to upload ${fileName}. Status: ${response.status}`);
        } else {
          console.log(`[BackgroundSync] Successfully uploaded ${fileName}`);
        }
      } catch (err) {
        console.error(`[BackgroundSync] Upload error for ${fileName}:`, err);
      }
    }

    // 6. Update last sync time
    // Use the newest asset's creation time
    const newestTime = Math.max(...newAssets.map(a => a.creationTime));
    await AsyncStorage.setItem(LAST_SYNC_KEY, newestTime.toString());

    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch (err) {
    console.error('[BackgroundSync] Task error:', err);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

// Function to manually register the task from the Settings UI
export async function registerBackgroundSync() {
  try {
    await BackgroundFetch.registerTaskAsync(BACKGROUND_SYNC_TASK, {
      minimumInterval: 60 * 15, // 15 minutes minimum interval
      stopOnTerminate: false, // Android only
      startOnBoot: true,      // Android only
    });
    console.log('[BackgroundSync] Task registered');
  } catch (err) {
    console.error('[BackgroundSync] Task register failed:', err);
  }
}

// Function to unregister the task
export async function unregisterBackgroundSync() {
  try {
    await BackgroundFetch.unregisterTaskAsync(BACKGROUND_SYNC_TASK);
    console.log('[BackgroundSync] Task unregistered');
  } catch (err) {
    console.error('[BackgroundSync] Task unregister failed:', err);
  }
}

// Function to check if task is registered
export async function isBackgroundSyncRegistered() {
  return await TaskManager.isTaskRegisteredAsync(BACKGROUND_SYNC_TASK);
}
