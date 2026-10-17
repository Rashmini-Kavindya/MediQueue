import { Platform } from 'react-native';

// Put these in .env (restart Expo with -c after changing):
//   EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME=your-cloud-name
//   EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET=your-unsigned-preset
const CLOUD_NAME = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

/**
 * Upload a picked photo/video straight to Cloudinary (CDN) and resolve with its public URL.
 * Same idea as the old Supabase helper: pick file -> unique name -> upload -> get public URL.
 *
 * @param {{ uri: string, fileName?: string, mimeType?: string, type?: string }} file
 *        An asset from expo-image-picker (result.assets[0]).
 * @returns {Promise<string>} secure public URL
 */
export default function uploadMediaToCloudinary(file) {
  return new Promise((resolve, reject) => {
    if (!file || !file.uri) {
      return reject('File not added');
    }
    if (!CLOUD_NAME || !UPLOAD_PRESET) {
      return reject('Cloudinary is not configured (check .env)');
    }

    const originalName = file.fileName || file.uri.split('/').pop() || 'upload';
    const parts = originalName.split('.');
    const extension = parts.length > 1 ? parts[parts.length - 1].toLowerCase() : file.type === 'video' ? 'mp4' : 'jpg';

    const timestamp = new Date().getTime();
    const fileName = `${timestamp}.${extension}`;
    const contentType = file.mimeType || (file.type === 'video' ? 'video/mp4' : 'image/jpeg');

    const buildForm = async () => {
      const form = new FormData();
      if (Platform.OS === 'web') {
        const blob = await (await fetch(file.uri)).blob();
        form.append('file', blob, fileName);
      } else {
        form.append('file', { uri: file.uri, name: fileName, type: contentType });
      }
      form.append('upload_preset', UPLOAD_PRESET);
      form.append('public_id', String(timestamp));
      return form;
    };

    buildForm()
      .then((form) =>
        // "auto" lets Cloudinary handle both images and videos
        fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`, {
          method: 'POST',
          body: form,
        })
      )
      .then(async (res) => {
        const json = await res.json().catch(() => null);
        if (!res.ok || !json || !json.secure_url) {
          throw new Error((json && json.error && json.error.message) || `Upload failed (${res.status})`);
        }
        resolve(json.secure_url);
      })
      .catch((err) => reject(err));
  });
}