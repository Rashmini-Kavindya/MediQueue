import { Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

// Cloudinary unsigned upload: only the PUBLIC cloud name and unsigned preset
// belong in EXPO_PUBLIC_ variables. Never place an API secret in a mobile app.
export async function pickAndUploadCaregiverPhoto() {
  const cloudName = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const preset = process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
  if (!cloudName || !preset) {
    throw new Error('Cloudinary cloud name or upload preset is missing from mobile-app/.env');
  }

  // On web the file chooser must open directly from the tap/click.
  // Request runtime permissions only on Android/iOS.
  if (Platform.OS !== 'web') {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      throw new Error('Photo-library permission is required.');
    }
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.75
  });
  if (result.canceled || !result.assets?.length) return null;

  const asset = result.assets[0];
  if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) {
    throw new Error('Choose an image smaller than 5 MB.');
  }

  const form = new FormData();
  form.append('upload_preset', preset);
  form.append('folder', 'mediqueue/caregiver-profiles');

  if (Platform.OS === 'web') {
    const blob = asset.file || await (await fetch(asset.uri)).blob();
    form.append('file', blob, asset.fileName || 'caregiver-profile.jpg');
  } else {
    form.append('file', {
      uri: asset.uri,
      name: asset.fileName || 'caregiver-profile.jpg',
      type: asset.mimeType || 'image/jpeg'
    });
  }

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/image/upload`,
    { method: 'POST', body: form }
  );
  const data = await response.json();
  if (!response.ok || !data.secure_url) {
    throw new Error(data.error?.message || 'Cloudinary upload failed. Check the unsigned preset.');
  }
  return data.secure_url;
}
