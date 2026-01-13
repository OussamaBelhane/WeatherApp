/**
 * NotificationService.js
 * Handles scheduling and managing daily weather notifications
 */

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const NOTIFICATION_PREFS_KEY = '@weather_notification_prefs';

// Configure how notifications are handled when app is in foreground
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
    }),
});

/**
 * Request notification permissions from the user
 * @returns {Promise<boolean>} Whether permissions were granted
 */
export const requestNotificationPermissions = async () => {
    try {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }

        if (finalStatus !== 'granted') {
            console.log('Notification permissions not granted');
            return false;
        }

        // Android requires a notification channel
        if (Platform.OS === 'android') {
            await Notifications.setNotificationChannelAsync('weather-daily', {
                name: 'Daily Weather',
                importance: Notifications.AndroidImportance.HIGH,
                vibrationPattern: [0, 250, 250, 250],
                lightColor: '#60A5FA',
                sound: 'default',
            });
        }

        return true;
    } catch (error) {
        console.error('Error requesting notification permissions:', error);
        return false;
    }
};

/**
 * Schedule daily weather notification
 * @param {number} hour - Hour of day (0-23)
 * @param {number} minute - Minute (0-59)
 * @param {object} cityData - City data for the notification
 */
export const scheduleDailyNotification = async (hour, minute, cityData = null) => {
    try {
        // Cancel existing scheduled notifications first
        await cancelAllNotifications();

        // Request permissions if not already granted
        const hasPermission = await requestNotificationPermissions();
        if (!hasPermission) {
            console.log('Cannot schedule notification: no permission');
            return false;
        }

        // Create the notification content
        const cityName = cityData?.name || 'your area';
        const temp = cityData?.temp ? Math.round(cityData.temp) : null;
        const tempStr = temp !== null ? `${temp}°` : '';
        const condition = cityData?.condition || '';
        const greeting = getGreeting(hour);

        // Schedule the notification
        const trigger = {
            type: 'daily',
            hour: hour,
            minute: minute,
            repeats: true,
        };

        await Notifications.scheduleNotificationAsync({
            content: {
                title: `${greeting}! ${tempStr ? tempStr + ' ' : ''}${getWeatherEmoji(condition)}`,
                body: `${cityName} — ${getVibeMessage(condition, temp)}`,
                data: { type: 'daily-weather', cityName, temp, condition },
                sound: 'default',
                ...(Platform.OS === 'android' && { channelId: 'weather-daily' }),
            },
            trigger,
        });

        console.log(`Notification scheduled for ${hour}:${String(minute).padStart(2, '0')}`);
        return true;
    } catch (error) {
        console.error('Error scheduling notification:', error);
        return false;
    }
};

/**
 * Cancel all scheduled notifications
 */
export const cancelAllNotifications = async () => {
    try {
        await Notifications.cancelAllScheduledNotificationsAsync();
        console.log('All notifications cancelled');
        return true;
    } catch (error) {
        console.error('Error cancelling notifications:', error);
        return false;
    }
};

/**
 * Get weather emoji based on condition
 */
const getWeatherEmoji = (condition) => {
    const c = (condition || '').toLowerCase();
    if (c.includes('rain') || c.includes('drizzle')) return '🌧️';
    if (c.includes('thunder') || c.includes('storm')) return '⛈️';
    if (c.includes('snow')) return '❄️';
    if (c.includes('fog') || c.includes('mist')) return '🌫️';
    if (c.includes('cloud') || c.includes('overcast')) return '☁️';
    if (c.includes('clear')) return '☀️';
    if (c.includes('sun')) return '🌞';
    if (c.includes('wind')) return '💨';
    return '✨';
};

/**
 * Get a fun vibe message based on weather condition and temperature
 */
const getVibeMessage = (condition, temp = null) => {
    const conditionLower = (condition || '').toLowerCase();

    // Temperature-based additions
    let tempVibe = '';
    if (temp !== null) {
        if (temp <= 0) tempVibe = 'Bundle up! ';
        else if (temp <= 10) tempVibe = 'Jacket weather! ';
        else if (temp >= 35) tempVibe = 'Stay cool! ';
        else if (temp >= 28) tempVibe = 'Kinda hot! ';
    }

    // Rainy vibes
    if (conditionLower.includes('rain') || conditionLower.includes('drizzle')) {
        const rainyVibes = [
            'Perfect cozy vibes 🌧️',
            'Lo-fi & raindrop energy 🎧',
            'Umbrella gang rise up ☔',
            'Nature\'s chill playlist 🌧️',
            'Rainy day mood activated 💧',
        ];
        return tempVibe + rainyVibes[Math.floor(Math.random() * rainyVibes.length)];
    }

    // Cloudy vibes
    if (conditionLower.includes('cloud') || conditionLower.includes('overcast')) {
        const cloudyVibes = [
            'Moody sky aesthetic ☁️',
            'Cloud watching vibes ☁️',
            'Soft grey energy today 🌥️',
            'Chill overcast mood ☁️',
        ];
        return tempVibe + cloudyVibes[Math.floor(Math.random() * cloudyVibes.length)];
    }

    // Sunny vibes
    if (conditionLower.includes('sun') || conditionLower.includes('clear')) {
        const sunnyVibes = [
            'Main character energy ☀️',
            'Golden hour all day ✨',
            'Vitamin D loading... ☀️',
            'Sunglasses required 😎',
            'Perfect vibe weather! 🌞',
        ];
        return tempVibe + sunnyVibes[Math.floor(Math.random() * sunnyVibes.length)];
    }

    // Snow vibes
    if (conditionLower.includes('snow')) {
        const snowVibes = [
            'Winter wonderland mode ❄️',
            'Hot cocoa weather ☕❄️',
            'Snow day magic ✨❄️',
            'Cozy szn activated 🧣',
        ];
        return tempVibe + snowVibes[Math.floor(Math.random() * snowVibes.length)];
    }

    // Storm vibes
    if (conditionLower.includes('thunder') || conditionLower.includes('storm')) {
        const stormVibes = [
            'Dramatic weather era ⛈️',
            'Thunder rumbles = nap time 💤',
            'Epic storm energy ⚡',
            'Main character storm arc ⛈️',
        ];
        return tempVibe + stormVibes[Math.floor(Math.random() * stormVibes.length)];
    }

    // Foggy vibes
    if (conditionLower.includes('fog') || conditionLower.includes('mist')) {
        const foggyVibes = [
            'Mysterious aesthetic 🌫️',
            'Silent Hill but make it cute 🌫️',
            'Mystical fog vibes ✨',
            'Dreamy haze mode 💭',
        ];
        return tempVibe + foggyVibes[Math.floor(Math.random() * foggyVibes.length)];
    }

    // Windy vibes
    if (conditionLower.includes('wind')) {
        const windyVibes = [
            'Hair flip weather 💨',
            'Kite flying energy 🪁',
            'Windy adventure day 🌬️',
        ];
        return tempVibe + windyVibes[Math.floor(Math.random() * windyVibes.length)];
    }

    // Default vibes
    const defaultVibes = [
        'Check your weather vibe ✨',
        'New day, new vibes 🌈',
        'Weather check time! 🔮',
    ];
    return tempVibe + defaultVibes[Math.floor(Math.random() * defaultVibes.length)];
};

/**
 * Get a time-based greeting
 */
const getGreeting = (hour) => {
    if (hour >= 5 && hour < 12) return 'Good morning';
    if (hour >= 12 && hour < 17) return 'Good afternoon';
    if (hour >= 17 && hour < 21) return 'Good evening';
    return 'Night owl';
};

/**
 * Save notification preferences to storage
 */
export const saveNotificationPreferences = async (enabled, hour, minute) => {
    try {
        const prefs = { enabled, hour, minute };
        await AsyncStorage.setItem(NOTIFICATION_PREFS_KEY, JSON.stringify(prefs));
        console.log('Notification preferences saved:', prefs);
        return true;
    } catch (error) {
        console.error('Error saving notification preferences:', error);
        return false;
    }
};

/**
 * Load notification preferences from storage
 */
export const loadNotificationPreferences = async () => {
    try {
        const stored = await AsyncStorage.getItem(NOTIFICATION_PREFS_KEY);
        if (stored) {
            return JSON.parse(stored);
        }
        // Default preferences
        return { enabled: true, hour: 8, minute: 0 };
    } catch (error) {
        console.error('Error loading notification preferences:', error);
        return { enabled: true, hour: 8, minute: 0 };
    }
};

/**
 * Initialize notifications based on saved preferences
 * Uses last active city from storage if no cityData provided
 */
export const initializeNotifications = async (cityData = null) => {
    try {
        const prefs = await loadNotificationPreferences();

        // If no city data passed, try to load the last active city
        let notificationCity = cityData;
        if (!notificationCity) {
            try {
                const { loadLastActiveCity } = await import('./StorageService');
                notificationCity = await loadLastActiveCity();
                if (notificationCity) {
                    console.log('Using last active city for notifications:', notificationCity.name);
                }
            } catch (e) {
                console.log('Could not load last active city:', e.message);
            }
        }

        if (prefs.enabled) {
            await scheduleDailyNotification(prefs.hour, prefs.minute, notificationCity);
        } else {
            await cancelAllNotifications();
        }

        return prefs;
    } catch (error) {
        console.error('Error initializing notifications:', error);
        return { enabled: true, hour: 8, minute: 0 };
    }
};

/**
 * Update notification settings and reschedule if needed
 */
export const updateNotificationSettings = async (enabled, hour, minute, cityData = null) => {
    try {
        // Save preferences
        await saveNotificationPreferences(enabled, hour, minute);

        // Update scheduled notification
        if (enabled) {
            await scheduleDailyNotification(hour, minute, cityData);
        } else {
            await cancelAllNotifications();
        }

        return true;
    } catch (error) {
        console.error('Error updating notification settings:', error);
        return false;
    }
};

/**
 * Send a test notification immediately
 */
export const sendTestNotification = async (cityData = null) => {
    try {
        // Request permissions if not already granted
        const hasPermission = await requestNotificationPermissions();
        if (!hasPermission) {
            console.log('Cannot send test notification: no permission');
            return false;
        }

        const cityName = cityData?.name || 'your area';
        const temp = cityData?.temp ? Math.round(cityData.temp) : 22;
        const tempStr = `${temp}°`;
        const condition = cityData?.condition || 'clear';
        const currentHour = new Date().getHours();
        const greeting = getGreeting(currentHour);

        await Notifications.scheduleNotificationAsync({
            content: {
                title: `${greeting}! ${tempStr} ${getWeatherEmoji(condition)}`,
                body: `${cityName} — ${getVibeMessage(condition, temp)}`,
                data: { type: 'test', cityName, temp, condition },
                sound: 'default',
                ...(Platform.OS === 'android' && { channelId: 'weather-daily' }),
            },
            trigger: null, // null = immediate
        });

        console.log('Test notification sent!');
        return true;
    } catch (error) {
        console.error('Error sending test notification:', error);
        return false;
    }
};

export default {
    requestNotificationPermissions,
    scheduleDailyNotification,
    cancelAllNotifications,
    saveNotificationPreferences,
    loadNotificationPreferences,
    initializeNotifications,
    updateNotificationSettings,
    sendTestNotification,
};
