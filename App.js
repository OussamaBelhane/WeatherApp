import React, { useMemo, useCallback, useRef, useEffect, useState } from 'react';
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    Dimensions,
    Pressable,
    Platform,
    Animated,
    Easing,
    TextInput,
    Alert,
} from 'react-native';

import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Location from 'expo-location';
import { useVideoPlayer, VideoView } from 'expo-video';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
// PagerView wrapper: .native.js for iOS/Android, .web.js for web
import PagerView from './components/PagerViewWrapper';
import Svg, { Text as SvgText, Defs, LinearGradient as SvgLinearGradient, Stop, TSpan } from 'react-native-svg';
import {
    Sun,
    Moon,
    CloudRain,
    Cloud,
    ChevronUp,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    Wind,
    Droplets,
    Thermometer,
    Eye,
    Sunset,
    Sunrise,
    X,
    Search,
    Plus,
    Trash2,
    MapPin,
} from 'lucide-react-native';
import './global.css';
import { RadialMenuProvider } from './components/RadialMenuModal';
import FocusWeatherPage from './components/FocusWeatherPage';
import CitiesPage from './components/CitiesPage';
import HomeCitiesPage from './components/HomeCitiesPage';
import RadarScreen from './components/RadarScreen';
import SettingsPage from './components/SettingsPage';

// Services for persistence and API
import {
    loadCities,
    saveCities,
    loadPreferences,
    savePreferences,
    updateLastCityIndex,
    updatePreference,
    cacheWeatherData,
    getCachedWeather,
    saveLastActiveCity,
    loadLastActiveCity,
} from './services/StorageService';
import {
    searchCity,
    getWeather,
    isApiKeyConfigured,
} from './services/WeatherService';
import {
    initializeNotifications,
    updateNotificationSettings,
    sendTestNotification,
} from './services/NotificationService';
import { getVideoUrl, getTimePeriod, clearVideoCache } from './services/VideoService';


const isWeb = Platform.OS === 'web';

// ============================================================================
// WEATHER OVERLAY - Rain Effect
// ============================================================================
const WeatherOverlay = ({ condition }) => {
    if (!condition) return null;
    if (condition.includes('rain') || condition.includes('storm')) {
        return (
            <View style={[StyleSheet.absoluteFill, { zIndex: 1 }]} pointerEvents="none">
                <LinearGradient
                    colors={['rgba(59, 130, 246, 0.1)', 'transparent', 'rgba(59, 130, 246, 0.15)']}
                    locations={[0, 0.5, 1]}
                    style={StyleSheet.absoluteFill}
                />
            </View>
        );
    }
    return null;
};

// ============================================================================
// ANIMATED WEATHER ICON
// ============================================================================
const AnimatedWeatherIcon = ({ condition, isNight = false, size = 32 }) => {
    const iconColor = 'rgba(255,255,255,0.9)';
    const cond = condition?.toLowerCase() || '';

    if (cond.includes('storm')) return <CloudRain size={size} color={iconColor} />;
    if (cond.includes('rain')) return <CloudRain size={size} color={iconColor} />;
    if (cond.includes('snow')) return <CloudRain size={size} color={iconColor} />; // Lucide doesn't have Snow? Use CloudRain or check imports. App used CloudRain for snow before.
    if (cond.includes('fog')) return <Cloud size={size} color={iconColor} />;
    if (cond.includes('cloud')) return <Cloud size={size} color={iconColor} />;

    // Clear/Sunny
    if (cond.includes('night') || isNight) return <Moon size={size} color={iconColor} />;
    return <Sun size={size} color={iconColor} />;
};

const { height, width } = Dimensions.get('window');

// ============================================================================
// CHAMELEON GRADIENT ENGINE
// ============================================================================
const getChameleonGradient = (currentHour, weatherCondition) => {
    const cond = weatherCondition?.toLowerCase() || '';

    if (cond.includes('rain') || cond.includes('storm') || cond.includes('snow')) {
        return {
            name: 'stormy',
            gradientColors: ['rgba(0, 0, 0, 0)', 'rgba(30, 41, 59, 0.9)', 'rgba(15, 23, 42, 0.98)'],
            tintColor: 'rgba(59, 130, 246, 0.08)',
            accent: '#60a5fa',
            border: 'rgba(96, 165, 250, 0.25)',
        };
    }

    if (cond.includes('cloud') || cond.includes('fog')) {
        return {
            name: 'cloudy',
            gradientColors: ['rgba(0, 0, 0, 0)', 'rgba(51, 65, 85, 0.9)', 'rgba(30, 41, 59, 0.98)'],
            tintColor: 'rgba(148, 163, 184, 0.08)',
            accent: '#94a3b8',
            border: 'rgba(148, 163, 184, 0.2)',
        };
    }

    if (currentHour >= 20 || currentHour < 6) {
        return {
            name: 'night',
            gradientColors: ['transparent', 'rgba(15, 23, 42, 0.85)', 'rgba(2, 6, 23, 0.98)'],
            tintColor: 'rgba(99, 102, 241, 0.12)',
            accent: '#818cf8',
            border: 'rgba(129, 140, 248, 0.3)',
        };
    }

    if (currentHour >= 6 && currentHour < 11) {
        return {
            name: 'morning',
            gradientColors: ['transparent', 'rgba(180, 83, 9, 0.7)', 'rgba(120, 53, 15, 0.95)'],
            tintColor: 'rgba(251, 191, 36, 0.1)',
            accent: '#fbbf24',
            border: 'rgba(251, 191, 36, 0.3)',
        };
    }

    if (currentHour >= 16 && currentHour < 20) {
        return {
            name: 'sunset',
            gradientColors: ['transparent', 'rgba(190, 18, 60, 0.75)', 'rgba(136, 19, 55, 0.98)'],
            tintColor: 'rgba(244, 63, 94, 0.12)',
            accent: '#f43f5e',
            border: 'rgba(244, 63, 94, 0.3)',
        };
    }

    return {
        name: 'sunny',
        gradientColors: ['transparent', 'rgba(3, 105, 161, 0.7)', 'rgba(12, 74, 110, 0.95)'],
        tintColor: 'rgba(56, 189, 248, 0.12)',
        accent: '#38bdf8',
        border: 'rgba(56, 189, 248, 0.3)',
    };
};

const getWeatherTheme = (condition, isNight) => {
    const hour = isNight ? 22 : 12;
    const gradient = getChameleonGradient(hour, condition);
    return {
        name: gradient.name,
        glassTint: gradient.tintColor,
        border: gradient.border,
        accent: gradient.accent,
        blurTint: isNight ? 'dark' : 'default',
    };
};

// ============================================================================
// HELPERS
// ============================================================================
// Video URL is now dynamic via VideoService

const calculateVibe = (temp, condition) => {
    const cond = (condition || '').toLowerCase();
    const now = new Date();
    const hour = now.getHours();
    const dayOfWeek = now.getDay(); // 0 = Sunday, 6 = Saturday

    // Day names for context
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayName = dayNames[dayOfWeek];
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    // Time periods
    const isMorning = hour >= 5 && hour < 12;
    const isAfternoon = hour >= 12 && hour < 17;
    const isEvening = hour >= 17 && hour < 21;
    const isNight = hour >= 21 || hour < 5;
    const isLateNight = hour >= 0 && hour < 5;

    // Weather categories
    const isSunny = cond.includes('clear') || cond.includes('sunny');
    const isCloudy = cond.includes('cloud') || cond.includes('overcast');
    const isRainy = cond.includes('rain') || cond.includes('drizzle') || cond.includes('shower');
    const isStormy = cond.includes('storm') || cond.includes('thunder');
    const isSnowy = cond.includes('snow') || cond.includes('sleet');
    const isFoggy = cond.includes('fog') || cond.includes('mist') || cond.includes('haze');

    // Temperature vibes
    const isCold = temp < 10;
    const isCool = temp >= 10 && temp < 18;
    const isPerfect = temp >= 18 && temp <= 25;
    const isWarm = temp > 25 && temp < 32;
    const isHot = temp >= 32;

    // ========== WEEKEND VIBES ==========
    if (isWeekend) {
        if (isSunny && isPerfect) return { score: 10, label: 'Perfect Weekend Energy ✨' };
        if (isSunny && isWarm && isMorning) return { score: 9, label: 'Brunch Weather 🥂' };
        if (isSunny && isAfternoon) return { score: 9, label: 'Main Character Saturday ☀️' };
        if (isRainy && isWeekend) return { score: 7, label: 'Lazy Weekend Rain 🛋️' };
        if (isSnowy && isWeekend) return { score: 8, label: 'Cozy Weekend Snowday ❄️' };
        if (isEvening && isWeekend) return { score: 8, label: 'Weekend Night Vibes 🌙' };
    }

    // ========== MONDAY MOOD ==========
    if (dayOfWeek === 1) {
        if (isSunny && isMorning) return { score: 6, label: 'Monday but make it sunny ☀️' };
        if (isRainy) return { score: 4, label: 'Rainy Monday Grind ☔' };
        if (isCloudy) return { score: 4, label: 'Moody Monday Clouds ☁️' };
        if (isEvening) return { score: 5, label: 'Monday almost over 🙌' };
        if (isMorning) return { score: 4, label: 'New Week Energy 💪' };
    }

    // ========== FRIDAY VIBES ==========
    if (dayOfWeek === 5) {
        if (isSunny) return { score: 9, label: 'Friday Sunshine = Weekend Soon 🎉' };
        if (isAfternoon) return { score: 8, label: 'Friday Afternoon Energy 💫' };
        if (isEvening) return { score: 9, label: 'Friday Night Mode 🪩' };
        if (isRainy) return { score: 6, label: 'Rainy Friday Cozy Night 🌧️' };
    }

    // ========== MORNING VIBES ==========
    if (isMorning) {
        if (isSunny && isPerfect) return { score: 9, label: 'Golden Morning Energy ✨' };
        if (isSunny && isCold) return { score: 7, label: 'Crisp Morning Fresh 🌅' };
        if (isCloudy) return { score: 5, label: 'Soft Morning Light ☁️' };
        if (isRainy) return { score: 4, label: 'Rainy Morning Mood 🌧️' };
        if (isFoggy) return { score: 6, label: 'Mysterious Morning Fog 🌫️' };
        if (isSnowy) return { score: 7, label: 'Snow Morning Magic ❄️' };
    }

    // ========== AFTERNOON VIBES ==========
    if (isAfternoon) {
        if (isSunny && isPerfect) return { score: 9, label: 'Peak Afternoon Vibes ☀️' };
        if (isSunny && isHot) return { score: 6, label: 'Too Hot to Function 🥵' };
        if (isCloudy) return { score: 5, label: 'Chill Afternoon Mode 🌥️' };
        if (isRainy) return { score: 5, label: 'Afternoon Rain Nap 💤' };
        if (isStormy) return { score: 4, label: 'Dramatic Afternoon ⛈️' };
    }

    // ========== EVENING VIBES ==========
    if (isEvening) {
        if (isSunny) return { score: 8, label: 'Golden Hour Magic 🌇' };
        if (isCloudy && isWarm) return { score: 7, label: 'Warm Evening Stroll 🚶' };
        if (isRainy) return { score: 6, label: 'Evening Rain Aesthetic 🌃' };
        if (isCool) return { score: 7, label: 'Hoodie Weather Evening 🧥' };
    }

    // ========== NIGHT VIBES ==========
    if (isNight) {
        if (isSunny) return { score: 7, label: 'Clear Night Sky ✨' };
        if (isRainy) return { score: 6, label: 'Rainy Night Comfort 🌧️' };
        if (isStormy) return { score: 5, label: 'Stormy Night Drama ⚡' };
        if (isLateNight) return { score: 5, label: 'Late Night Quiet 🌙' };
        if (isSnowy) return { score: 7, label: 'Silent Snow Night ❄️' };
    }

    // ========== TEMPERATURE FALLBACKS ==========
    if (isPerfect) return { score: 8, label: 'Perfect Weather Day 👌' };
    if (isHot) return { score: 5, label: 'Ice Cream Weather 🍦' };
    if (isCold) return { score: 5, label: 'Bundle Up Szn 🧣' };
    if (isCool) return { score: 6, label: 'Light Jacket Vibes 🧥' };

    // ========== WEATHER FALLBACKS ==========
    if (isSunny) return { score: 7, label: 'Sunny Day Energy ☀️' };
    if (isRainy) return { score: 5, label: 'Rainy Day Mood 🌧️' };
    if (isCloudy) return { score: 5, label: 'Cloud Watching Day ☁️' };
    if (isStormy) return { score: 4, label: 'Storm Watch Mode ⛈️' };
    if (isSnowy) return { score: 6, label: 'Snow Day Vibes ❄️' };
    if (isFoggy) return { score: 5, label: 'Foggy Aesthetic 🌫️' };

    return { score: 5, label: 'Regular Day Energy 🌤️' };
};

const WeatherIcon = ({ condition, size = 20, color = 'white', isNight = false }) => {
    // Re-use Logic
    return <AnimatedWeatherIcon condition={condition} isNight={isNight} size={size} />;
};

const generateHourlyForecast = (baseTemp) => {
    const hours = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
        const hour = new Date(now.getTime() + i * 60 * 60 * 1000);
        hours.push({
            id: i,
            time: i === 0 ? 'Now' : hour.toLocaleTimeString('en-US', { hour: 'numeric' }),
            temp: Math.round(baseTemp + Math.sin((i / 6) * Math.PI) * 4),
            isNight: hour.getHours() >= 19 || hour.getHours() < 6,
            isCurrent: i === 0,
        });
    }
    return hours;
};

const generateWeeklyForecast = (baseTemp) => {
    const days = ['Today', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const conditions = ['sunny', 'cloudy', 'sunny', 'rainy', 'cloudy', 'sunny', 'sunny'];
    const globalLow = baseTemp - 8;
    const globalHigh = baseTemp + 12;
    return days.map((day, i) => ({
        id: i,
        day,
        condition: conditions[i],
        low: Math.round(baseTemp - 5 + Math.random() * 3),
        high: Math.round(baseTemp + 3 + Math.random() * 5),
        precipitation: conditions[i] === 'rainy' ? Math.floor(Math.random() * 40) + 60 : Math.floor(Math.random() * 30),
        globalLow,
        globalHigh,
    }));
};

// ============================================================================
// BREATHING VIBE PILL
// ============================================================================
const BreathingVibePill = ({ label, score, accent, border }) => {
    const scaleAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        const breathing = Animated.loop(
            Animated.sequence([
                Animated.timing(scaleAnim, { toValue: 1.05, duration: 1500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
                Animated.timing(scaleAnim, { toValue: 1, duration: 1500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
            ])
        );
        breathing.start();
        return () => breathing.stop();
    }, [scaleAnim]);

    return (
        <Animated.View
            style={{
                transform: [{ scale: scaleAnim }],
                backgroundColor: 'rgba(0, 0, 0, 0.2)',
                paddingHorizontal: 24,
                paddingVertical: 14,
                borderRadius: 999,
                flexDirection: 'row',
                alignItems: 'center',
                borderWidth: 1,
                borderColor: border,
            }}
        >
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: accent, marginRight: 12 }} />
            <Text style={{ color: 'white', fontSize: 14, fontWeight: '500' }}>{label}</Text>
            <View style={{ width: 1, height: 16, backgroundColor: 'rgba(255,255,255,0.2)', marginHorizontal: 12 }} />
            <Text style={{ color: 'white', fontWeight: '700', fontSize: 14 }}>{score}/10</Text>
        </Animated.View>
    );
};

// ============================================================================
// BOUNCING CHEVRON
// ============================================================================
const BouncingChevron = () => {
    const bounceAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const bounce = Animated.loop(
            Animated.sequence([
                Animated.timing(bounceAnim, { toValue: -8, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
                Animated.timing(bounceAnim, { toValue: 0, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
            ])
        );
        bounce.start();
        return () => bounce.stop();
    }, [bounceAnim]);

    return (
        <Animated.View style={{ transform: [{ translateY: bounceAnim }] }}>
            <ChevronUp size={20} color="rgba(255,255,255,0.3)" />
        </Animated.View>
    );
};

// ============================================================================
// FLOATING HOURLY ITEM
// ============================================================================
const FloatingHourlyItem = ({ item }) => (
    <View style={{ alignItems: 'center', marginRight: 28 }}>
        <Text style={{ fontSize: 11, fontWeight: '500', marginBottom: 10, color: item.isCurrent ? 'rgba(255,255,255,1)' : 'rgba(255,255,255,0.4)', letterSpacing: 0.5 }}>{item.time}</Text>
        <WeatherIcon condition={item.condition} size={20} color={item.isCurrent ? '#fff' : 'rgba(255,255,255,0.5)'} isNight={item.isNight} />
        <Text style={{ fontSize: 18, fontWeight: '600', marginTop: 10, color: item.isCurrent ? 'rgba(255,255,255,1)' : 'rgba(255,255,255,0.6)' }}>{item.temp}°</Text>
    </View>
);

// ============================================================================
// TEMPERATURE RANGE BAR
// ============================================================================
const TempRangeBar = ({ low, high, globalLow, globalHigh }) => {
    const range = globalHigh - globalLow;
    const leftPercent = ((low - globalLow) / range) * 100;
    const widthPercent = ((high - low) / range) * 100;
    return (
        <View style={{ height: 5, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 3, flex: 1, marginHorizontal: 16, overflow: 'hidden' }}>
            <LinearGradient colors={['#3b82f6', '#8b5cf6', '#ec4899']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ height: '100%', width: `${widthPercent}%`, marginLeft: `${leftPercent}%`, borderRadius: 3 }} />
        </View>
    );
};

// ============================================================================
// FLOATING DAILY ROW
// ============================================================================
const FloatingDailyRow = ({ item }) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 18, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255,255,255,0.06)' }}>
        <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 15, width: 56, fontWeight: '500' }}>{item.day}</Text>
        <View style={{ width: 32, alignItems: 'center' }}><WeatherIcon condition={item.condition} size={18} color="rgba(255,255,255,0.5)" /></View>
        <View style={{
            backgroundColor: 'rgba(96, 165, 250, 0.15)',
            borderRadius: 12,
            paddingHorizontal: 8,
            paddingVertical: 3,
            marginLeft: 8,
            flexDirection: 'row',
            alignItems: 'center',
            borderWidth: 1,
            borderColor: 'rgba(96, 165, 250, 0.3)'
        }}>
            <Droplets size={14} color="rgba(96, 165, 250, 1)" />
            <Text style={{ color: 'rgba(96, 165, 250, 1)', fontSize: 13, marginLeft: 4, fontWeight: '700' }}>{item.precipitation || 0}%</Text>
        </View>
        <View style={{ flex: 1, marginLeft: 8 }} />
        <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 16, width: 40, textAlign: 'right', fontWeight: '500' }}>{item.low}°</Text>
        <TempRangeBar low={item.low} high={item.high} globalLow={item.globalLow} globalHigh={item.globalHigh} />
        <Text style={{ color: 'rgba(255,255,255,0.95)', fontSize: 16, width: 40, textAlign: 'right', fontWeight: '700' }}>{item.high}°</Text>
    </View>
);

// ============================================================================
// MORPHING HEADER
// ============================================================================
const MorphingHeader = ({ city, temp, translateY, chameleonGradient }) => (
    <Animated.View style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100, transform: [{ translateY }] }}>
        <LinearGradient colors={chameleonGradient.gradientColors} locations={[0, 0.3, 1]} style={{ paddingTop: 50, paddingBottom: 16, paddingHorizontal: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ color: 'white', fontSize: 14, fontWeight: '700', letterSpacing: 2, textTransform: 'uppercase', flex: 1, marginRight: 16 }} numberOfLines={1}>{city}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ color: 'white', fontSize: 24, fontWeight: '200', marginRight: 48 }}>{temp}°</Text>
            </View>
        </LinearGradient>
    </Animated.View>
);

// ============================================================================
// BENTO DETAIL CARD
// ============================================================================
const BentoCard = ({ icon: Icon, label, value, sublabel }) => (
    <View style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 20, padding: 18, margin: 4 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
            <Icon size={13} color="rgba(255,255,255,0.35)" />
            <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: 9, marginLeft: 8, textTransform: 'uppercase', letterSpacing: 2 }}>{label}</Text>
        </View>
        <Text style={{ color: 'white', fontSize: 22, fontWeight: '300' }}>{value}</Text>
        {sublabel && <Text style={{ color: 'rgba(255,255,255,0.25)', fontSize: 12, marginTop: 4 }}>{sublabel}</Text>}
    </View>
);

// ============================================================================
// PAGINATION DOTS
// ============================================================================
const PaginationDots = ({ total, activeIndex }) => (
    <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', position: 'absolute', bottom: 40, left: 0, right: 0, zIndex: 50 }}>
        {Array.from({ length: total }).map((_, i) => (
            <View key={i} style={{ width: i === activeIndex ? 8 : 6, height: i === activeIndex ? 8 : 6, borderRadius: 4, backgroundColor: i === activeIndex ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.3)', marginHorizontal: 4 }} />
        ))}
    </View>
);

// ============================================================================
// PULL DOWN INDICATOR
// ============================================================================
const PullDownIndicator = () => (
    <View style={{ position: 'absolute', top: 50, left: 0, right: 0, alignItems: 'center', zIndex: 20 }}>
        <View style={{ width: 36, height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.25)' }} />
    </View>
);

// ============================================================================
// CITY ROW
// ============================================================================
const CityRow = ({ city, index, activeCityIndex, onSelect, onDelete }) => {
    const theme = getChameleonGradient(12, city.condition);
    const isSelected = index === activeCityIndex;

    // Determine if it's night time
    const currentHour = new Date().getHours();
    const isNight = currentHour >= 19 || currentHour < 6;

    const handleLongPress = () => {
        if (Platform.OS === 'web') {
            onDelete(); // Direct delete or custom web modal could be better, but simple for now
            return;
        }

        // Using standard Alert for specific deletion confirmation
        // This must be imported from react-native
        Alert.alert(
            "Delete City",
            `Are you sure you want to remove ${city.name}?`,
            [
                { text: "Cancel", style: "cancel" },
                { text: "Delete", onPress: onDelete, style: "destructive" }
            ],
            { cancelable: true }
        );
    };

    return (
        <Pressable
            onPress={onSelect}
            onLongPress={handleLongPress}
            delayLongPress={500}
            style={({ pressed }) => ({
                width: '100%',
                height: 100,
                marginBottom: 12,
                borderRadius: 24,
                overflow: 'hidden',
                borderWidth: 1,
                borderColor: isSelected ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.1)',
                backgroundColor: pressed ? 'rgba(255,255,255,0.1)' : 'transparent'
            })}
        >
            <LinearGradient colors={theme.gradientColors} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', padding: 20 }}>
                <View style={{ flex: 1 }}>
                    <Text style={{ color: 'white', fontSize: 20, fontWeight: '600', letterSpacing: 0.5 }}>{city.name}</Text>
                    <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, marginTop: 4, textTransform: 'capitalize' }}>{city.condition}</Text>
                </View>
                <View style={{ alignItems: 'flex-end', justifyContent: 'center', minWidth: 80 }}>
                    <Text style={{ color: 'white', fontSize: 32, fontWeight: '200' }}>{city.temp || 0}°</Text>
                    <AnimatedWeatherIcon condition={city.condition} isNight={isNight} size={24} />
                </View>
            </View>
        </Pressable>
    );
};

// ============================================================================
// GLASS DRAWER - With real city search
// ============================================================================
const GlassDrawer = ({ cities, activeCityIndex, onSelectCity, onAddCity, onRemoveCity, onClose, preferences, onUpdatePreference }) => {
    const [searchText, setSearchText] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const searchTimeout = useRef(null);



    // Debounced city search
    useEffect(() => {
        if (searchText.length < 2) {
            setSearchResults([]);
            return;
        }

        // Clear previous timeout
        if (searchTimeout.current) {
            clearTimeout(searchTimeout.current);
        }

        // Debounce search (300ms)
        searchTimeout.current = setTimeout(async () => {
            setIsLoading(true);
            try {
                // New API: searchCity(name) returns array
                const results = await searchCity(searchText);
                // Limit manually if needed, or service already limited it
                setSearchResults(results);
            } catch (error) {
                console.error('Search error:', error);
                setSearchResults([]);
            } finally {
                setIsLoading(false);
            }
        }, 300);

        return () => {
            if (searchTimeout.current) {
                clearTimeout(searchTimeout.current);
            }
        };
    }, [searchText]);

    const isSearching = searchText.length > 0;

    const handleAddCity = (city) => {
        // Pass the full city object with lat/lon
        onAddCity(city);
        setSearchText('');
        setSearchResults([]);
    };

    return (
        <View style={[StyleSheet.absoluteFill, { zIndex: 50 }]}>
            <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.85)' }]} />
            <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
            <SafeAreaView style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingTop: 16, paddingBottom: 24 }}>
                    <Text style={{ color: 'white', fontSize: 28, fontWeight: '200' }}>{isSearching ? 'Add City' : 'My Cities'}</Text>
                    <Pressable onPress={onClose} style={{ padding: 8 }}><X size={24} color="white" /></Pressable>
                </View>

                {/* Search Bar */}
                <View style={{ paddingHorizontal: 24, marginBottom: 24 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' }}>
                        <Search size={18} color="rgba(255,255,255,0.5)" />
                        <TextInput
                            style={{ flex: 1, marginLeft: 12, fontSize: 16, color: 'white' }}
                            placeholder="Search for a city..."
                            placeholderTextColor="rgba(255,255,255,0.4)"
                            value={searchText}
                            onChangeText={setSearchText}
                            autoCorrect={false}
                            autoCapitalize="words"
                        />
                        {isLoading && (
                            <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>...</Text>
                        )}
                    </View>
                </View>



                <ScrollView style={{ flex: 1 }}>
                    {isSearching ? (
                        <View style={{ paddingHorizontal: 24 }}>
                            {searchResults.length === 0 && !isLoading && searchText.length >= 2 && (
                                <Text style={{ color: 'rgba(255,255,255,0.5)', textAlign: 'center', marginTop: 20 }}>
                                    No cities found
                                </Text>
                            )}
                            {searchResults.map((city, index) => (
                                <Pressable
                                    key={city.id || index}
                                    onPress={() => handleAddCity(city)}
                                    style={({ pressed }) => ({
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        padding: 20,
                                        marginBottom: 12,
                                        backgroundColor: pressed ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.05)',
                                        borderRadius: 24,
                                        borderWidth: 1,
                                        borderColor: 'rgba(255,255,255,0.1)'
                                    })}
                                >
                                    <View>
                                        <Text style={{ color: 'white', fontSize: 18, fontWeight: '600' }}>{city.name}</Text>
                                        <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>{city.displayName || city.country}</Text>
                                    </View>
                                    <Plus size={24} color="white" />
                                </Pressable>
                            ))}
                        </View>
                    ) : (
                        <View style={{ paddingHorizontal: 24 }}>
                            {cities.map((city, index) => (
                                <CityRow
                                    key={city.id || index}
                                    city={city}
                                    index={index}
                                    activeCityIndex={activeCityIndex}
                                    onSelect={() => onSelectCity(index)}
                                    onDelete={() => onRemoveCity(index)}
                                />
                            ))}
                        </View>
                    )}
                </ScrollView>
            </SafeAreaView>
        </View>
    );
};

// ============================================================================
// CITY WEATHER PAGE
// ============================================================================
const CityWeatherPage = ({ city, isActive, onOpenDrawer, videoPlayer }) => {
    // Calculate current hour in the city's timezone
    const getCityCurrentHour = () => {
        const now = new Date();
        if (city.timezone) {
            try {
                const cityTime = now.toLocaleTimeString('en-US', {
                    timeZone: city.timezone,
                    hour: 'numeric',
                    hour12: false
                });
                return parseInt(cityTime, 10);
            } catch (e) {
                console.log('Timezone error:', e);
            }
        }
        return now.getHours();
    };
    const currentHour = getCityCurrentHour();
    const isNight = currentHour >= 19 || currentHour < 6;
    const isIOS = Platform.OS !== 'android';

    // Use real data from city object, with fallbacks
    const weather = {
        temp: city.temp,
        condition: city.condition || 'sunny',
        city: city.name,
        humidity: city.humidity || 50,
        wind: city.wind || 10,
        uv: city.uv || 0,
        sunrise: city.sunrise || '06:00',
        sunset: city.sunset || '18:00',
        feelsLike: city.feelsLike || city.temp,
    };

    const theme = useMemo(() => getWeatherTheme(weather.condition, isNight), [weather.condition, isNight]);
    const chameleonGradient = useMemo(() => getChameleonGradient(currentHour, weather.condition), [currentHour, weather.condition]);
    const vibe = useMemo(() => calculateVibe(weather.temp, weather.condition), [weather.temp, weather.condition]);

    // Use real hourly/daily data if available, otherwise generate mock
    const hourly = useMemo(() => city.hourly || generateHourlyForecast(weather.temp), [city.hourly, weather.temp]);
    const weekly = useMemo(() => city.daily || generateWeeklyForecast(weather.temp), [city.daily, weather.temp]);

    // Date String - Use city's timezone if available
    const getCityLocalTime = () => {
        const now = new Date();
        if (city.timezone) {
            // Use the city's timezone to get correct local time
            try {
                const options = { timeZone: city.timezone, weekday: 'long', hour: '2-digit', minute: '2-digit' };
                return now.toLocaleDateString('en-US', { timeZone: city.timezone, weekday: 'long' }) + ', ' +
                    now.toLocaleTimeString('en-US', { timeZone: city.timezone, hour: '2-digit', minute: '2-digit' });
            } catch (e) {
                console.log('Timezone error:', e);
            }
        }
        // Fallback to device time
        return now.toLocaleDateString('en-US', { weekday: 'long' }) + ', ' +
            now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    };
    const fullDate = getCityLocalTime();

    // Safe Check for weekly data
    const todayHigh = weekly[0]?.high || weather.temp + 5;
    const todayLow = weekly[0]?.low || weather.temp - 5;

    // Fade animation for city transitions
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (isActive) {
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 300,
                easing: Easing.out(Easing.ease),
                useNativeDriver: true,
            }).start();
        } else {
            fadeAnim.setValue(0);
        }
    }, [isActive, fadeAnim]);

    // Scroll animation
    const scrollY = useRef(new Animated.Value(0)).current;
    const scrollViewRef = useRef(null);

    const scrollHintOpacity = scrollY.interpolate({ inputRange: [0, 100], outputRange: [1, 0], extrapolate: 'clamp' });
    const vibePillOpacity = scrollY.interpolate({ inputRange: [100, 250], outputRange: [1, 0], extrapolate: 'clamp' });
    const tempOpacity = scrollY.interpolate({ inputRange: [200, 400], outputRange: [1, 0], extrapolate: 'clamp' });
    const cityOpacity = scrollY.interpolate({ inputRange: [350, 550], outputRange: [1, 0], extrapolate: 'clamp' });
    const headerTranslateY = scrollY.interpolate({ inputRange: [height - 250, height - 150], outputRange: [-100, 0], extrapolate: 'clamp' });
    const menuOpacity = scrollY.interpolate({ inputRange: [height - 400, height - 200], outputRange: [1, 0], extrapolate: 'clamp' });

    const handleScroll = Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false });

    // Pull-down detection using scroll events
    const handleScrollEndDrag = (e) => {
        const offsetY = e.nativeEvent.contentOffset.y;
        if (offsetY < -80) {
            onOpenDrawer();
        }
    };

    return (
        <Animated.View style={{ flex: 1, width, backgroundColor: 'transparent', opacity: fadeAnim }}>
            {/* Video is rendered at parent level for performance - this overlay is transparent */}
            <WeatherOverlay condition={weather.condition} />
            <LinearGradient colors={['transparent', 'rgba(0,0,0,0.2)', 'rgba(0,0,0,0.5)']} locations={[0, 0.5, 1]} style={StyleSheet.absoluteFill} />

            {/* Hero Cover */}
            <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
                <SafeAreaView style={{ flex: 1, justifyContent: 'space-between', paddingHorizontal: 24, paddingBottom: 60 }}>

                    {/* Top Content Wrapper */}
                    <View>
                        {/* Top Section: Location & Date */}
                        <Animated.View style={{ paddingTop: 60, opacity: isIOS ? 1 : cityOpacity }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <MapPin size={18} color="white" style={{ marginRight: 8 }} />
                                <Text style={{ color: 'white', fontSize: 20, fontWeight: '500', letterSpacing: 0.5 }}>{weather.city}, {city.country || ''}</Text>
                            </View>
                            <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 15, marginTop: 8, fontWeight: '400' }}>{fullDate}</Text>
                        </Animated.View>

                        {/* Middle Section: Temp & Condition */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 20 }}>
                            {/* Gradient Temp */}
                            <Animated.View style={{ opacity: isIOS ? 1 : tempOpacity }}>
                                <Svg height="180" width="240">
                                    <Defs>
                                        <SvgLinearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                                            <Stop offset="0.5" stopColor="white" stopOpacity="1" />
                                            <Stop offset="1" stopColor="white" stopOpacity="0.25" />
                                        </SvgLinearGradient>
                                    </Defs>
                                    <SvgText
                                        fill="url(#grad)"
                                        fontSize="160"
                                        fontWeight="300"
                                        x="0"
                                        y="140"
                                        letterSpacing="-8"
                                    >
                                        {weather.temp}
                                        <TSpan fill="white">°</TSpan>
                                    </SvgText>
                                </Svg>
                                {/* High/Low Pill */}
                                <View style={{ marginTop: -30, marginLeft: 4, backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, alignSelf: 'flex-start' }}>
                                    <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: 13, fontWeight: '600' }}>↑{todayHigh}° ↓{todayLow}°</Text>
                                </View>
                            </Animated.View>

                            {/* Condition Right */}
                            <Animated.View style={{ alignItems: 'center', opacity: isIOS ? 1 : tempOpacity, paddingRight: 10 }}>
                                <AnimatedWeatherIcon condition={weather.condition} isNight={isNight} size={32} />
                                <Text style={{ color: 'white', fontSize: 13, marginTop: 6, fontWeight: '500' }}>{weather.condition.charAt(0).toUpperCase() + weather.condition.slice(1)}</Text>
                            </Animated.View>
                        </View>
                    </View>

                    <Animated.View style={{ alignItems: 'center', opacity: isIOS ? 1 : scrollHintOpacity }}>
                        <Animated.View style={{ opacity: isIOS ? 1 : vibePillOpacity, marginBottom: 20 }}><BreathingVibePill label={vibe.label} score={vibe.score} accent={theme.accent} border={theme.border} /></Animated.View>
                        <BouncingChevron />
                        <Text style={{ color: 'white', fontSize: 9, marginTop: 8, letterSpacing: 3, fontWeight: '600', textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 }}>SWIPE UP</Text>
                    </Animated.View>
                </SafeAreaView>
            </View>

            {/* Scrollable Content */}
            <Animated.ScrollView
                ref={scrollViewRef}
                showsVerticalScrollIndicator={false}
                bounces={true}
                decelerationRate={isIOS ? 'fast' : 'normal'}
                onScroll={handleScroll}
                onScrollEndDrag={handleScrollEndDrag}
                scrollEventThrottle={16}
            >
                <View style={{ height: height + 50 }} />
                <View style={{ minHeight: height, borderTopLeftRadius: 50, borderTopRightRadius: 50, overflow: 'hidden', borderTopWidth: 1, borderColor: chameleonGradient.border }}>
                    {isIOS ? (
                        <>
                            <BlurView intensity={60} tint="dark" style={StyleSheet.absoluteFill} />
                            <LinearGradient colors={chameleonGradient.gradientColors} locations={[0, 0.3, 1]} style={[StyleSheet.absoluteFill, { borderTopLeftRadius: 50, borderTopRightRadius: 50 }]} />
                            <View style={[StyleSheet.absoluteFill, { backgroundColor: chameleonGradient.tintColor }]} />
                        </>
                    ) : (
                        <>
                            <LinearGradient colors={chameleonGradient.gradientColors} locations={[0, 0.3, 1]} style={[StyleSheet.absoluteFill, { borderTopLeftRadius: 50, borderTopRightRadius: 50 }]} />
                            <LinearGradient colors={['transparent', chameleonGradient.tintColor, chameleonGradient.tintColor]} locations={[0, 0.4, 1]} style={StyleSheet.absoluteFill} />
                        </>
                    )}
                    <LinearGradient colors={['rgba(255,255,255,0.15)', 'rgba(255,255,255,0.05)', 'transparent']} locations={[0, 0.03, 0.12]} style={StyleSheet.absoluteFill} />

                    <View style={{ paddingHorizontal: 20, paddingTop: 32, paddingBottom: 60 }}>
                        <View style={{ alignItems: 'center', marginBottom: 32 }}><View style={{ width: 40, height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.25)' }} /></View>
                        <Text style={{ color: 'rgba(255,255,255,0.25)', fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 3, marginBottom: 16 }}>Hourly Forecast</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 40 }} contentContainerStyle={{ paddingRight: 20 }}>{hourly.map((h) => <FloatingHourlyItem key={h.id} item={h} />)}</ScrollView>
                        <Text style={{ color: 'rgba(255,255,255,0.25)', fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 3, marginBottom: 12 }}>7-Day Forecast</Text>
                        <View style={{ marginBottom: 40 }}>{weekly.map((d) => <FloatingDailyRow key={d.id} item={d} />)}</View>
                        <Text style={{ color: 'rgba(255,255,255,0.25)', fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 3, marginBottom: 12 }}>Details</Text>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4 }}>
                            <View style={{ width: '50%' }}><BentoCard icon={Eye} label="UV Index" value={weather.uv} sublabel="Low" /></View>
                            <View style={{ width: '50%' }}><BentoCard icon={Wind} label="Wind" value={weather.wind} sublabel="km/h" /></View>
                            <View style={{ width: '50%' }}><BentoCard icon={Droplets} label="Humidity" value={`${weather.humidity}%`} /></View>
                            <View style={{ width: '50%' }}><BentoCard icon={Thermometer} label="Feels Like" value={`${weather.feelsLike}°`} /></View>
                            <View style={{ width: '50%' }}><BentoCard icon={Sunrise} label="Sunrise" value={weather.sunrise} /></View>
                            <View style={{ width: '50%' }}><BentoCard icon={Sunset} label="Sunset" value={weather.sunset} /></View>
                        </View>
                        <View style={{ height: 80 }} />
                    </View>
                </View>
            </Animated.ScrollView>

            <MorphingHeader city={weather.city} temp={weather.temp} translateY={headerTranslateY} chameleonGradient={chameleonGradient} />

            {/* Menu button is now handled by RadialMenuProvider */}
        </Animated.View>
    );
};

// ============================================================================
// MAIN APP
// ============================================================================
export default function App() {
    return (
        <SafeAreaProvider>
            <WeatherApp />
        </SafeAreaProvider>
    );
}

function WeatherApp() {
    // State
    const [cities, setCities] = useState([]);
    const [activeCityIndex, setActiveCityIndex] = useState(0);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [viewMode, setViewMode] = useState('pager'); // 'pager' | 'focus' | 'cities' | 'home-cities' | 'radar'
    const [isLoading, setIsLoading] = useState(true);
    const [preferences, setPreferences] = useState(null);
    const [notificationPrefs, setNotificationPrefs] = useState({ enabled: true, hour: 8, minute: 0 });
    const [notificationCityIndex, setNotificationCityIndex] = useState(0);
    const pagerRef = useRef(null);

    // ============================================================================
    // LOAD SAVED DATA ON APP LAUNCH
    // ============================================================================
    // ... (existing imports)

    // ============================================================================
    // LOAD SAVED DATA ON APP LAUNCH
    // ============================================================================
    useEffect(() => {
        const initializeApp = async () => {
            try {
                console.log('[App] Initializing...');

                // Load saved cities
                const savedCities = await loadCities();

                if (savedCities && savedCities.length > 0) {
                    // Update weather for all saved cities to ensure new fields (high/low/precip) are present
                    const updatedCities = await Promise.all(savedCities.map(async (city) => {
                        try {
                            const weather = await getWeather(city.lat, city.lon);
                            if (weather) {
                                return {
                                    ...city,
                                    temp: weather.current.temp,
                                    condition: weather.current.condition,
                                    video: weather.current.video,
                                    hourly: weather.hourly,
                                    daily: weather.daily,
                                    timezone: weather.timezone,
                                    utcOffsetSeconds: weather.utcOffsetSeconds,
                                    ...weather.current,
                                };
                            }
                            return city;
                        } catch (e) {
                            console.log(`[App] Failed to refresh weather for ${city.name}`, e);
                            return city;
                        }
                    }));

                    setCities(updatedCities);
                    console.log('[App] Loaded and refreshed', updatedCities.length, 'cities');
                } else {
                    console.log('[App] No saved cities, attempting to fetch user location...');

                    // Request permissions
                    const { status } = await Location.requestForegroundPermissionsAsync();

                    if (status !== 'granted') {
                        console.log('[App] Location permission denied, using defaults');
                        throw new Error('Location permission denied');
                    }

                    const location = await Location.getCurrentPositionAsync({});
                    const { latitude, longitude } = location.coords;

                    // Reverse geocode to get city name
                    const reverseGeocoded = await Location.reverseGeocodeAsync({ latitude, longitude });
                    const cityData = reverseGeocoded[0];
                    const cityName = cityData.city || cityData.name;

                    // Fetch weather for this location
                    const weather = await getWeather(latitude, longitude);

                    const initialCity = {
                        id: Date.now().toString(),
                        name: cityName,
                        country: cityData.isoCountryCode,
                        lat: latitude,
                        lon: longitude,
                        temp: weather ? weather.current.temp : 20,
                        condition: weather ? weather.current.condition : 'sunny',

                        // Spread full weather data
                        ...(weather ? {
                            video: weather.current.video,
                            hourly: weather.hourly,
                            daily: weather.daily,
                            timezone: weather.timezone,
                            utcOffsetSeconds: weather.utcOffsetSeconds,
                            ...weather.current
                        } : {})
                    };

                    setCities([initialCity]);
                    console.log('[App] Used user location:', cityName);
                }

                // Load user preferences
                const savedPrefs = await loadPreferences();
                setPreferences(savedPrefs);

                // Set view mode based on saved preference
                const initialViewMode = savedPrefs.viewMode === 'minimal' ? 'focus' : 'pager';
                setViewMode(initialViewMode);

                // Set last selected city based on mode
                const lastCityIndex = savedPrefs.lastCityIndex?.[savedPrefs.viewMode === 'minimal' ? 'minimal' : 'full'] || 0;
                const validIndex = Math.min(lastCityIndex, (savedCities?.length || 1) - 1);
                setActiveCityIndex(Math.max(0, validIndex));

                console.log('[App] Preferences loaded:', savedPrefs);
                console.log('[App] Starting in', initialViewMode, 'mode');

                // Initialize notifications
                try {
                    const notifPrefs = await initializeNotifications(savedCities?.[0] || null);
                    setNotificationPrefs(notifPrefs);
                    console.log('[App] Notifications initialized:', notifPrefs);
                } catch (notifError) {
                    console.log('[App] Notification init skipped:', notifError.message);
                }



            } catch (error) {
                console.error('[App] Initialization error/fallback:', error);

                // No fallback cities - if location fails and no saved cities, start with empty list
                if (cities.length === 0) {
                    console.log('[App] No cities available, user needs to add manually');
                }
            } finally {
                setIsLoading(false);
            }
        };

        initializeApp();
    }, []);

    // ============================================================================
    // PERSIST CITIES WHEN CHANGED
    // ============================================================================
    useEffect(() => {
        if (!isLoading && cities.length > 0) {
            saveCities(cities);
        }
    }, [cities, isLoading]);

    // ============================================================================
    // PERSIST VIEW MODE PREFERENCE
    // ============================================================================
    useEffect(() => {
        if (!isLoading && preferences) {
            const newViewModePreference = viewMode === 'focus' ? 'minimal' : 'full';
            if (preferences.viewMode !== newViewModePreference) {
                const updatedPrefs = { ...preferences, viewMode: newViewModePreference };
                setPreferences(updatedPrefs);
                savePreferences(updatedPrefs);
            }
        }
    }, [viewMode, isLoading]);

    // ============================================================================
    // SAVE LAST ACTIVE CITY FOR NOTIFICATIONS
    // ============================================================================
    useEffect(() => {
        if (!isLoading && cities.length > 0 && cities[activeCityIndex]) {
            const currentCity = cities[activeCityIndex];
            saveLastActiveCity(currentCity);
            console.log('[App] Last active city saved for notifications:', currentCity.name);
        }
    }, [activeCityIndex, cities, isLoading]);

    // ============================================================================
    // PERSIST LAST SELECTED CITY
    // ============================================================================
    useEffect(() => {
        if (!isLoading && preferences) {
            const mode = viewMode === 'focus' ? 'minimal' : 'full';
            updateLastCityIndex(mode, activeCityIndex);
        }
    }, [activeCityIndex, viewMode, isLoading]);

    // Dynamic video URL based on current weather and time
    const currentCity = cities[activeCityIndex];
    const currentCondition = currentCity?.condition || 'clear';

    // Track the last video URL to prevent unnecessary player recreation
    const lastVideoUrlRef = useRef(null);

    // Get stable video URL - memoize to prevent random URL selection on every render
    const videoUrl = useMemo(() => {
        // Only compute new URL if condition actually changed
        const url = getVideoUrl(currentCondition);
        console.log('[App] Video URL computed for', currentCondition, '->', url?.split('/').pop());
        return url;
    }, [currentCondition]);

    // Track if we should skip playing (during transitions)
    const isTransitioningRef = useRef(false);

    // SINGLE SHARED VIDEO PLAYER - Using Cloudinary URL with error handling
    // The callback is called when player is initialized
    const videoPlayer = useVideoPlayer(videoUrl, (player) => {
        try {
            player.loop = true;
            player.muted = true;
            player.playbackRate = 0.6;

            // Don't auto-play in callback - we'll do it in useEffect to handle transitions properly
        } catch (error) {
            console.log('[VideoPlayer] Config error:', error.message);
        }
    });

    // Safely play video when player or URL changes
    useEffect(() => {
        if (!videoPlayer) return;

        // Mark that we're done transitioning
        isTransitioningRef.current = false;
        lastVideoUrlRef.current = videoUrl;

        // Delay play to ensure player is fully ready
        const playTimer = setTimeout(() => {
            if (!isTransitioningRef.current) {
                try {
                    videoPlayer.play();
                } catch (error) {
                    // Gracefully handle "shared object released" errors
                    console.log('[VideoPlayer] Play skipped (player may be released)');
                }
            }
        }, 200);

        return () => {
            // Mark transition when this effect unmounts (URL changing)
            isTransitioningRef.current = true;
            clearTimeout(playTimer);
        };
    }, [videoPlayer, videoUrl]);

    // ============================================================================
    // HANDLERS
    // ============================================================================
    const handleSelectCity = (index) => {
        setActiveCityIndex(index);
        if (!isWeb) pagerRef.current?.setPage(index);
        setIsDrawerOpen(false);
    };

    const handleAddCity = useCallback(async (cityData) => {
        // cityData can be a string (legacy) or object with lat/lon from search
        let newCity;
        if (typeof cityData === 'string') {
            // Legacy: just city name - try to search it first
            const results = await searchCity(cityData);
            if (results && results.length > 0) {
                const city = results[0];
                newCity = {
                    id: city.id.toString(),
                    name: city.name,
                    country: city.country,
                    lat: city.lat,
                    lon: city.lon,
                };
            } else {
                return; // Can't add if not found
            }
        } else {
            // New: full city object from search
            newCity = {
                id: cityData.id || Date.now().toString(),
                name: cityData.name,
                country: cityData.country,
                lat: cityData.lat,
                lon: cityData.lon,
            };
        }

        // Check if city already exists
        const exists = cities.some(c =>
            c.name.toLowerCase() === newCity.name.toLowerCase() &&
            c.country === newCity.country
        );

        if (!exists) {
            // Fetch weather before adding
            try {
                const weather = await getWeather(newCity.lat, newCity.lon);
                if (weather) {
                    newCity = {
                        ...newCity,
                        temp: weather.current.temp,
                        condition: weather.current.condition,
                        hourly: weather.hourly,
                        daily: weather.daily,
                        timezone: weather.timezone,
                        utcOffsetSeconds: weather.utcOffsetSeconds,
                        ...weather.current,
                    };
                }
            } catch (e) {
                console.error('Failed to fetch initial weather for new city', e);
                newCity.temp = 0;
                newCity.condition = 'cloudy';
            }

            setCities(prev => {
                const newCities = [...prev, newCity];
                // Switch to the new city immediately
                const newIndex = newCities.length - 1;

                // Use setTimeout to allow render cycle to complete before scrolling
                setTimeout(() => {
                    setActiveCityIndex(newIndex);
                    // if (!isWeb) pagerRef.current?.setPage(newIndex); 
                    // Note: setPage might be async or ref not ready, but usually works. 
                    // Use a slightly safer check or just trigger state update.
                }, 100);

                return newCities;
            });

            // Close drawer and reset view mode if needed
            setIsDrawerOpen(false);
            if (viewMode === 'cities' || viewMode === 'home-cities') {
                setViewMode('pager'); // Go back to main view to see the new city
            }

            console.log('[App] Added city:', newCity.name);
        } else {
            console.log('[App] City already exists:', newCity.name);
            Alert.alert('City exists', `${newCity.name} is already in your list.`);
        }
    }, [cities, viewMode]);

    const handleRemoveCity = (index) => {
        if (cities.length <= 1) return;
        const newCities = cities.filter((_, i) => i !== index);
        setCities(newCities);
        if (activeCityIndex >= index && activeCityIndex > 0) {
            const newIndex = activeCityIndex - 1;
            setActiveCityIndex(newIndex);
            if (!isWeb) pagerRef.current?.setPage(newIndex);
        }
    };

    const handlePageSelected = (e) => {
        setActiveCityIndex(e.nativeEvent.position);
    };

    const openDrawer = useCallback(() => {
        setIsDrawerOpen(true);
    }, []);

    // Web navigation handlers (circular)
    const goToPrevCity = () => {
        const newIndex = activeCityIndex > 0 ? activeCityIndex - 1 : cities.length - 1;
        setActiveCityIndex(newIndex);
    };

    const goToNextCity = () => {
        const newIndex = activeCityIndex < cities.length - 1 ? activeCityIndex + 1 : 0;
        setActiveCityIndex(newIndex);
    };

    // Radial menu handlers
    const handleCitiesPress = useCallback(() => {
        console.log('CITIES selected - opening premium cities page');
        setViewMode('home-cities');
        setIsDrawerOpen(false);
    }, []);

    const handleFocusPress = useCallback(() => {
        console.log('FOCUS selected - toggling view');
        setViewMode(prevMode => prevMode === 'focus' ? 'pager' : 'focus');
    }, []);

    const handleHomePress = useCallback(() => {
        setViewMode('pager');
    }, []);

    const handleAddCityPress = useCallback(() => {
        setViewMode('cities');
    }, []);

    const handleBackToFocus = useCallback(() => {
        setViewMode('focus');
    }, []);

    const handleRadarPress = useCallback(() => {
        console.log('RADAR selected - opening weather radar');
        setViewMode('radar');
    }, []);

    const handleSettingsPress = useCallback(() => {
        console.log('SETTINGS opened via double-tap/long-press');
        setIsSettingsOpen(true);
    }, []);

    // Handle notification settings change from SettingsPage
    const handleNotificationChange = useCallback(async (enabled, hour, minute) => {
        console.log('Notification settings changed:', { enabled, hour, minute });
        setNotificationPrefs({ enabled, hour, minute });

        // Get current city data for notification content
        const currentCity = cities[activeCityIndex];
        await updateNotificationSettings(enabled, hour, minute, currentCity);
    }, [cities, activeCityIndex]);

    // ============================================================================
    // LOADING SCREEN
    // ============================================================================
    if (isLoading) {
        return (
            <View style={{ flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' }}>
                <Text style={{ color: 'white', fontSize: 24, fontWeight: '200' }}>Loading...</Text>
            </View>
        );
    }

    return (
        <RadialMenuProvider
            onCitiesPress={handleCitiesPress}
            onFocusPress={handleFocusPress}
            onRadarPress={handleRadarPress}
            onSettingsPress={handleSettingsPress}
            hideTrigger={isDrawerOpen || isSettingsOpen || viewMode === 'focus' || viewMode === 'cities' || viewMode === 'home-cities' || viewMode === 'radar'}
        >
            {viewMode === 'focus' ? (
                <FocusWeatherPage
                    cities={cities}
                    activeCityIndex={activeCityIndex}
                    setActiveCityIndex={setActiveCityIndex}
                    onHome={handleHomePress}
                    onAddCity={handleAddCityPress}
                />
            ) : viewMode === 'cities' ? (
                <CitiesPage
                    cities={cities}
                    activeCityIndex={activeCityIndex}
                    setActiveCityIndex={setActiveCityIndex}
                    onBack={handleBackToFocus}
                    onAddCity={handleAddCity}
                    onRemoveCity={handleRemoveCity}
                />
            ) : viewMode === 'home-cities' ? (
                <HomeCitiesPage
                    cities={cities}
                    activeCityIndex={activeCityIndex}
                    setActiveCityIndex={setActiveCityIndex}
                    onBack={handleHomePress}
                    onAddCity={handleAddCity}
                    onRemoveCity={handleRemoveCity}
                />
            ) : viewMode === 'radar' ? (
                <RadarScreen
                    lat={cities[activeCityIndex]?.lat || 33.5731}
                    lon={cities[activeCityIndex]?.lon || -7.5898}
                    cityName={cities[activeCityIndex]?.name || 'Weather'}
                    onClose={handleHomePress}
                />
            ) : (
                <WeatherAppContent
                    cities={cities}
                    setCities={setCities}
                    activeCityIndex={activeCityIndex}
                    setActiveCityIndex={setActiveCityIndex}
                    isDrawerOpen={isDrawerOpen}
                    setIsDrawerOpen={setIsDrawerOpen}
                    pagerRef={pagerRef}
                    videoPlayer={videoPlayer}
                    handleSelectCity={handleSelectCity}
                    handleAddCity={handleAddCity}
                    handleRemoveCity={handleRemoveCity}
                    handlePageSelected={handlePageSelected}
                    openDrawer={openDrawer}
                    goToPrevCity={goToPrevCity}
                    goToNextCity={goToNextCity}
                    preferences={preferences}
                    onUpdatePreference={updatePreference}
                />
            )}

            {/* Settings Page (overlay) */}
            <SettingsPage
                visible={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
                notificationPrefs={notificationPrefs}
                onNotificationChange={handleNotificationChange}
                cities={cities}
                selectedCityIndex={notificationCityIndex}
                onCityChange={async (index) => {
                    setNotificationCityIndex(index);
                    const selectedCity = cities[index];
                    await saveLastActiveCity(selectedCity);
                    // Reschedule notification with new city
                    if (notificationPrefs.enabled) {
                        await updateNotificationSettings(
                            notificationPrefs.enabled,
                            notificationPrefs.hour,
                            notificationPrefs.minute,
                            selectedCity
                        );
                    }
                }}
                onTestNotification={async () => {
                    // Use selected notification city
                    const testCity = cities[notificationCityIndex] || cities[0];
                    await sendTestNotification(testCity);
                }}
            />
        </RadialMenuProvider>
    );
}

// Separate component to use the useRadialMenu hook
function WeatherAppContent({
    cities,
    activeCityIndex,
    isDrawerOpen,
    setIsDrawerOpen,
    pagerRef,
    videoPlayer,
    handleSelectCity,
    handleAddCity,
    handleRemoveCity,
    handlePageSelected,
    openDrawer,
    goToPrevCity,
    goToNextCity,
    preferences,
    onUpdatePreference,
}) {
    // Ensure video plays when this view is mounted (e.g. returning from Focus mode)
    useEffect(() => {
        if (videoPlayer) {
            // Small delay to ensure the native VideoView is fully attached before playing
            const timer = setTimeout(() => {
                try {
                    // Guard against calling play on released player
                    if (videoPlayer && typeof videoPlayer.play === 'function') {
                        videoPlayer.play();
                    }
                } catch (error) {
                    // Silently ignore - player may have been released during transition
                    console.log('[WeatherAppContent] Video play skipped (player may be released)');
                }
            }, 200);
            return () => clearTimeout(timer);
        }
    }, [videoPlayer]);

    return (
        <View style={{ flex: 1, backgroundColor: '#000' }}>
            <StatusBar style="light" translucent backgroundColor="transparent" />

            {/* SHARED VIDEO BACKGROUND - Single instance for all cities (saves CPU/RAM) */}
            <VideoView player={videoPlayer} style={StyleSheet.absoluteFill} contentFit="cover" nativeControls={false} />

            {/* Platform-specific city pager */}
            {isWeb ? (
                // Web: Single city view with navigation buttons
                <View style={{ flex: 1 }}>
                    <CityWeatherPage city={cities[activeCityIndex]} isActive={true} onOpenDrawer={openDrawer} videoPlayer={videoPlayer} />

                    {/* Left/Right Navigation Arrows for Web (always visible, circular) */}
                    <Pressable onPress={goToPrevCity} style={{ position: 'absolute', left: 16, top: '50%', marginTop: -24, zIndex: 100, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 24, padding: 12 }}>
                        <ChevronLeft size={24} color="white" />
                    </Pressable>
                    <Pressable onPress={goToNextCity} style={{ position: 'absolute', right: 16, top: '50%', marginTop: -24, zIndex: 100, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 24, padding: 12 }}>
                        <ChevronRight size={24} color="white" />
                    </Pressable>
                </View>
            ) : (
                // Native: PagerView with offscreenPageLimit=1 for lazy loading (only renders current + adjacent)
                <PagerView
                    ref={pagerRef}
                    style={{ flex: 1 }}
                    initialPage={0}
                    onPageSelected={handlePageSelected}
                    offscreenPageLimit={1}
                >
                    {cities.map((city, index) => (
                        <View key={index} style={{ flex: 1 }}>
                            <CityWeatherPage city={city} isActive={index === activeCityIndex} onOpenDrawer={openDrawer} videoPlayer={videoPlayer} />
                        </View>
                    ))}
                </PagerView>
            )}

            {isDrawerOpen && (
                <GlassDrawer
                    cities={cities}
                    activeCityIndex={activeCityIndex}
                    onSelectCity={handleSelectCity}
                    onAddCity={handleAddCity}
                    onRemoveCity={handleRemoveCity}
                    onClose={() => setIsDrawerOpen(false)}
                    preferences={preferences}
                    onUpdatePreference={onUpdatePreference}
                />
            )}
        </View>
    );
}
