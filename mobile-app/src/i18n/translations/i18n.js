import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';

import en from '../translations/en.json';
import si from '../translations/si.json';
import ta from '../translations/ta.json';

const LANGUAGE_KEY = '@app_language';

const LANGUAGE_DETECTOR = {
  type: 'languageDetector',
  async: true,
  detect: async (callback) => {
    try {
      const savedLanguage = await AsyncStorage.getItem(LANGUAGE_KEY);
      if (savedLanguage) {
        return callback(savedLanguage);
      }
    } catch (error) {
      console.log('Error reading language', error);
    }
    callback('en');
  },
  init: () => {},
  cacheUserLanguage: async (language) => {
    try {
      await AsyncStorage.setItem(LANGUAGE_KEY, language);
    } catch (error) {
      console.log('Error saving language', error);
    }
  },
};

i18n
  .use(LANGUAGE_DETECTOR)
  .use(initReactI18next)
  .init({
    compatibilityJSON: 'v3',
    resources: {
  en: { translation: en },
  si: { translation: si },
  ta: { translation: ta },
},
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;