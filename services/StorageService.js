/**
 * StorageService.js
 * Centralized service for all AsyncStorage operations
 * Handles cities, preferences, and weather cache persistence
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// Storage keys
const STORAGE_KEYS = {
    CITIES: '@weatherapp_cities',
    PREFERENCES: '@weatherapp_preferences',
    WEATHER_CACHE: '@weatherapp_cache',
    LAST_ACTIVE_CITY: '@weatherapp_last_active_city',
};

// Default cities (used on first launch)
const DEFAULT_CITIES = [
    { id: '1', name: 'Casablanca', country: 'MA', temp: 22, condition: 'rainy', lat: 33.5731, lon: -7.5898 },
];

// Default preferences
const DEFAULT_PREFERENCES = {
    viewMode: 'full', // 'full' (pager) or 'minimal' (focus)
    lastCityIndex: {
        full: 0,
        minimal: 0,
    },
};

/**
 * Save cities array to storage
 * @param {Array} cities - Array of city objects
 */
export const saveCities = async (cities) => {
    try {
        const jsonValue = JSON.stringify(cities);
        await AsyncStorage.setItem(STORAGE_KEYS.CITIES, jsonValue);
        console.log('[StorageService] Cities saved successfully');
        return true;
    } catch (error) {
        console.error('[StorageService] Error saving cities:', error);
        return false;
    }
};

/**
 * Load cities from storage
 * @returns {Array} Array of city objects (or defaults if none saved)
 */
export const loadCities = async () => {
    try {
        const jsonValue = await AsyncStorage.getItem(STORAGE_KEYS.CITIES);
        if (jsonValue !== null) {
            const cities = JSON.parse(jsonValue);
            console.log('[StorageService] Loaded', cities.length, 'cities');
            return cities;
        }
        console.log('[StorageService] No saved cities, using defaults');
        return DEFAULT_CITIES;
    } catch (error) {
        console.error('[StorageService] Error loading cities:', error);
        return DEFAULT_CITIES;
    }
};

/**
 * Save user preferences to storage
 * @param {Object} preferences - User preferences object
 */
export const savePreferences = async (preferences) => {
    try {
        const jsonValue = JSON.stringify(preferences);
        await AsyncStorage.setItem(STORAGE_KEYS.PREFERENCES, jsonValue);
        console.log('[StorageService] Preferences saved:', preferences);
        return true;
    } catch (error) {
        console.error('[StorageService] Error saving preferences:', error);
        return false;
    }
};

/**
 * Load user preferences from storage
 * @returns {Object} User preferences (or defaults if none saved)
 */
export const loadPreferences = async () => {
    try {
        const jsonValue = await AsyncStorage.getItem(STORAGE_KEYS.PREFERENCES);
        if (jsonValue !== null) {
            const prefs = JSON.parse(jsonValue);
            console.log('[StorageService] Loaded preferences:', prefs);
            return { ...DEFAULT_PREFERENCES, ...prefs };
        }
        console.log('[StorageService] No saved preferences, using defaults');
        return DEFAULT_PREFERENCES;
    } catch (error) {
        console.error('[StorageService] Error loading preferences:', error);
        return DEFAULT_PREFERENCES;
    }
};

/**
 * Update a specific preference without overwriting others
 * @param {string} key - Preference key to update
 * @param {any} value - New value
 */
export const updatePreference = async (key, value) => {
    try {
        const currentPrefs = await loadPreferences();
        const updatedPrefs = { ...currentPrefs, [key]: value };
        await savePreferences(updatedPrefs);
        return true;
    } catch (error) {
        console.error('[StorageService] Error updating preference:', error);
        return false;
    }
};

/**
 * Update last selected city index for a specific mode
 * @param {string} mode - 'full' or 'minimal'
 * @param {number} index - City index
 */
export const updateLastCityIndex = async (mode, index) => {
    try {
        const currentPrefs = await loadPreferences();
        const updatedPrefs = {
            ...currentPrefs,
            lastCityIndex: {
                ...currentPrefs.lastCityIndex,
                [mode]: index,
            },
        };
        await savePreferences(updatedPrefs);
        return true;
    } catch (error) {
        console.error('[StorageService] Error updating last city index:', error);
        return false;
    }
};

/**
 * Cache weather data for a city (for offline use)
 * @param {string} cityId - Unique city identifier
 * @param {Object} weatherData - Weather data to cache
 */
export const cacheWeatherData = async (cityId, weatherData) => {
    try {
        const cache = await getWeatherCache();
        cache[cityId] = {
            data: weatherData,
            timestamp: Date.now(),
        };
        await AsyncStorage.setItem(STORAGE_KEYS.WEATHER_CACHE, JSON.stringify(cache));
        console.log('[StorageService] Weather cached for city:', cityId);
        return true;
    } catch (error) {
        console.error('[StorageService] Error caching weather:', error);
        return false;
    }
};

/**
 * Get all cached weather data
 * @returns {Object} Weather cache object
 */
export const getWeatherCache = async () => {
    try {
        const jsonValue = await AsyncStorage.getItem(STORAGE_KEYS.WEATHER_CACHE);
        if (jsonValue !== null) {
            return JSON.parse(jsonValue);
        }
        return {};
    } catch (error) {
        console.error('[StorageService] Error getting weather cache:', error);
        return {};
    }
};

/**
 * Get cached weather data for a specific city
 * @param {string} cityId - Unique city identifier
 * @returns {Object|null} Cached weather data or null
 */
export const getCachedWeather = async (cityId) => {
    try {
        const cache = await getWeatherCache();
        if (cache[cityId]) {
            const cacheAge = Date.now() - cache[cityId].timestamp;
            const maxAge = 3 * 60 * 60 * 1000; // 3 hours
            console.log('[StorageService] Cache age for', cityId, ':', Math.round(cacheAge / 60000), 'minutes');
            return cache[cityId].data;
        }
        return null;
    } catch (error) {
        console.error('[StorageService] Error getting cached weather:', error);
        return null;
    }
};

/**
 * Check if cached weather data is still fresh
 * @param {string} cityId - Unique city identifier
 * @param {number} maxAgeMs - Maximum age in milliseconds (default 3 hours)
 * @returns {boolean} True if cache is fresh
 */
export const isCacheFresh = async (cityId, maxAgeMs = 3 * 60 * 60 * 1000) => {
    try {
        const cache = await getWeatherCache();
        if (cache[cityId]) {
            const cacheAge = Date.now() - cache[cityId].timestamp;
            return cacheAge < maxAgeMs;
        }
        return false;
    } catch (error) {
        return false;
    }
};

/**
 * Clear all app data (useful for debugging/reset)
 */
export const clearAllData = async () => {
    try {
        await AsyncStorage.multiRemove([
            STORAGE_KEYS.CITIES,
            STORAGE_KEYS.PREFERENCES,
            STORAGE_KEYS.WEATHER_CACHE,
        ]);
        console.log('[StorageService] All data cleared');
        return true;
    } catch (error) {
        console.error('[StorageService] Error clearing data:', error);
        return false;
    }
};

/**
 * Save last active city for notifications
 * @param {Object} city - City object with name, temp, condition, etc.
 */
export const saveLastActiveCity = async (city) => {
    try {
        if (!city) return false;
        const jsonValue = JSON.stringify(city);
        await AsyncStorage.setItem(STORAGE_KEYS.LAST_ACTIVE_CITY, jsonValue);
        console.log('[StorageService] Last active city saved:', city.name);
        return true;
    } catch (error) {
        console.error('[StorageService] Error saving last active city:', error);
        return false;
    }
};

/**
 * Load last active city for notifications
 * @returns {Object|null} Last active city or null
 */
export const loadLastActiveCity = async () => {
    try {
        const jsonValue = await AsyncStorage.getItem(STORAGE_KEYS.LAST_ACTIVE_CITY);
        if (jsonValue !== null) {
            const city = JSON.parse(jsonValue);
            console.log('[StorageService] Loaded last active city:', city.name);
            return city;
        }
        console.log('[StorageService] No last active city saved');
        return null;
    } catch (error) {
        console.error('[StorageService] Error loading last active city:', error);
        return null;
    }
};

export default {
    saveCities,
    loadCities,
    savePreferences,
    loadPreferences,
    updatePreference,
    updateLastCityIndex,
    cacheWeatherData,
    getCachedWeather,
    getWeatherCache,
    isCacheFresh,
    clearAllData,
    saveLastActiveCity,
    loadLastActiveCity,
    STORAGE_KEYS,
    DEFAULT_CITIES,
    DEFAULT_PREFERENCES,
};
