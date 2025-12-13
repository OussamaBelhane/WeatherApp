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
} from 'react-native';

import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useVideoPlayer, VideoView } from 'expo-video';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import {
    Sun,
    Moon,
    CloudRain,
    Cloud,
    ChevronUp,
    Wind,
    Droplets,
    Thermometer,
    Eye,
    Sunset,
    Sunrise,
    List,
    X,
    Search,
    Plus,
    MapPin,
    Trash2,
} from 'lucide-react-native';
import './global.css';

// Note: Lottie removed to avoid web bundler issues with @lottiefiles/dotlottie-react
// The app uses animated Lucide icons as reliable cross-platform fallbacks


// ============================================================================
// WEATHER OVERLAY - Rain Effect (Gradient-based, no Lottie)
// ============================================================================
const WeatherOverlay = ({ condition }) => {
    // Only show for rain condition - simple gradient overlay
    if (condition !== 'rainy') {
        return null;
    }

    return (
        <View style={[StyleSheet.absoluteFill, { zIndex: 1 }]} pointerEvents="none">
            <LinearGradient
                colors={['rgba(59, 130, 246, 0.1)', 'transparent', 'rgba(59, 130, 246, 0.15)']}
                locations={[0, 0.5, 1]}
                style={StyleSheet.absoluteFill}
            />
        </View>
    );
};

// ============================================================================
// ANIMATED WEATHER ICON - Lucide-based with subtle animation
// ============================================================================
const AnimatedWeatherIcon = ({ condition, isNight = false, size = 32 }) => {
    const iconColor = 'rgba(255,255,255,0.9)';
    if (isNight) return <Moon size={size} color={iconColor} />;
    const icons = {
        sunny: <Sun size={size} color={iconColor} />,
        clear: <Sun size={size} color={iconColor} />,
        rainy: <CloudRain size={size} color={iconColor} />,
        cloudy: <Cloud size={size} color={iconColor} />,
    };
    return icons[condition] || <Sun size={size} color={iconColor} />;
};

const { height, width } = Dimensions.get('window');

// ============================================================================
// CHAMELEON GRADIENT ENGINE - Dynamic Time + Weather Color System
// ============================================================================

/**
 * Returns a dynamic gradient palette based on time of day and weather condition.
 * Rain always overrides the time-based palette.
 * 
 * @param {number} currentHour - Hour of day (0-23)
 * @param {string} weatherCondition - Weather condition string
 * @returns {Object} Gradient configuration with colors and accent
 */
const getChameleonGradient = (currentHour, weatherCondition) => {
    // RAIN OVERRIDE - Stormy Blue-Grey palette regardless of time
    if (weatherCondition === 'rainy') {
        return {
            name: 'stormy',
            // Gradient: transparent → stormy blue-grey → deep storm
            gradientColors: [
                'rgba(0, 0, 0, 0)',            // Fully transparent at top
                'rgba(30, 41, 59, 0.9)',      // Slate-800 - more opaque
                'rgba(15, 23, 42, 0.98)',     // Slate-900 - nearly solid
            ],
            tintColor: 'rgba(59, 130, 246, 0.08)',  // Blue tint
            accent: '#60a5fa',
            border: 'rgba(96, 165, 250, 0.25)',
        };
    }

    // NIGHT (8 PM - 6 AM) - Deep Midnight/Dark Indigo
    if (currentHour >= 20 || currentHour < 6) {
        return {
            name: 'night',
            gradientColors: [
                'transparent',
                'rgba(15, 23, 42, 0.85)',     // Deep Indigo
                'rgba(2, 6, 23, 0.98)',       // Near black
            ],
            tintColor: 'rgba(99, 102, 241, 0.12)',
            accent: '#818cf8',
            border: 'rgba(129, 140, 248, 0.3)',
        };
    }

    // SUNNY MORNING (6 AM - 11 AM) - Warm, Golden, Hopeful
    if (currentHour >= 6 && currentHour < 11) {
        return {
            name: 'morning',
            gradientColors: [
                'transparent',
                'rgba(180, 83, 9, 0.7)',      // Amber-700 (Darker)
                'rgba(120, 53, 15, 0.95)',    // Amber-900 (Deep/Dark)
            ],
            tintColor: 'rgba(251, 191, 36, 0.1)',
            accent: '#fbbf24',
            border: 'rgba(251, 191, 36, 0.3)',
        };
    }

    // SUNSET (4 PM - 8 PM) - Romantic, Dramatic, "End of Day"
    if (currentHour >= 16 && currentHour < 20) {
        return {
            name: 'sunset',
            gradientColors: [
                'transparent',
                'rgba(190, 18, 60, 0.75)',    // Rose-700 (Darker)
                'rgba(136, 19, 55, 0.98)',    // Rose-900 (Deep/Dark)
            ],
            tintColor: 'rgba(244, 63, 94, 0.12)',
            accent: '#f43f5e',
            border: 'rgba(244, 63, 94, 0.3)',
        };
    }

    // MID-DAY (11 AM - 4 PM) - Weather dependent
    if (weatherCondition === 'cloudy') {
        // Cloudy Mid-Day - Cool Greys/Slates
        return {
            name: 'cloudy',
            gradientColors: [
                'rgba(0, 0, 0, 0)',            // Fully transparent at top
                'rgba(51, 65, 85, 0.9)',      // Slate-700 - more opaque
                'rgba(30, 41, 59, 0.98)',     // Slate-800
            ],
            tintColor: 'rgba(148, 163, 184, 0.08)', // Slate tint
            accent: '#94a3b8',
            border: 'rgba(148, 163, 184, 0.2)',
        };
    }

    // Sunny/Clear Mid-Day (11 AM - 4 PM) - Vibrant Sky Blue
    return {
        name: 'sunny',
        gradientColors: [
            'transparent',
            'rgba(3, 105, 161, 0.7)',         // Sky-700 (Darker)
            'rgba(12, 74, 110, 0.95)',        // Sky-900 (Deep/Dark)
        ],
        tintColor: 'rgba(56, 189, 248, 0.12)',
        accent: '#38bdf8',
        border: 'rgba(56, 189, 248, 0.3)',
    };
};

// Legacy theme getter for backwards compatibility with other components
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
const VIDEO_SOURCE = require('./videos/red twilight.mp4');

const calculateVibe = (temp, condition) => {
    if (condition === 'clear' || condition === 'sunny') {
        if (temp >= 18 && temp <= 26) return { score: 10, label: 'Perfect Hoodie Weather' };
        if (temp > 26) return { score: 8, label: 'Beach Day Energy' };
        return { score: 7, label: 'Crisp & Refreshing' };
    }
    if (condition === 'rainy') return { score: 4, label: 'Cozy Vibes Only' };
    if (condition === 'cloudy') return { score: 6, label: 'Moody & Beautiful' };
    return { score: 5, label: 'Average Day' };
};

const WeatherIcon = ({ condition, size = 20, color = 'white', isNight = false }) => {
    if (isNight) return <Moon size={size} color={color} />;
    const icons = {
        sunny: <Sun size={size} color={color} />,
        clear: <Sun size={size} color={color} />,
        rainy: <CloudRain size={size} color={color} />,
        cloudy: <Cloud size={size} color={color} />,
    };
    return icons[condition] || <Sun size={size} color={color} />;
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
        globalLow,
        globalHigh,
    }));
};

// ============================================================================
// BREATHING VIBE PILL - React Native Animated API
// ============================================================================
const BreathingVibePill = ({ label, score, accent, border }) => {
    const scaleAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        const breathing = Animated.loop(
            Animated.sequence([
                Animated.timing(scaleAnim, {
                    toValue: 1.05,
                    duration: 1500,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
                Animated.timing(scaleAnim, {
                    toValue: 1,
                    duration: 1500,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
            ])
        );
        breathing.start();
        return () => breathing.stop();
    }, [scaleAnim]);

    const handlePress = useCallback(() => {
        Haptics.selectionAsync();
    }, []);

    return (
        <Pressable onPress={handlePress}>
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
        </Pressable>
    );
};

// ============================================================================
// BOUNCING CHEVRON - React Native Animated API
// ============================================================================
const BouncingChevron = () => {
    const bounceAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const bounce = Animated.loop(
            Animated.sequence([
                Animated.timing(bounceAnim, {
                    toValue: -8,
                    duration: 700,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
                Animated.timing(bounceAnim, {
                    toValue: 0,
                    duration: 700,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
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
// FLOATING HOURLY ITEM - No Background Capsules
// ============================================================================
const FloatingHourlyItem = ({ item }) => (
    <View style={{ alignItems: 'center', marginRight: 28 }}>
        <Text
            style={{
                fontSize: 11,
                fontWeight: '500',
                marginBottom: 10,
                color: item.isCurrent ? 'rgba(255,255,255,1)' : 'rgba(255,255,255,0.4)',
                letterSpacing: 0.5,
            }}
        >
            {item.time}
        </Text>
        <WeatherIcon
            condition="clear"
            size={20}
            color={item.isCurrent ? '#fff' : 'rgba(255,255,255,0.5)'}
            isNight={item.isNight}
        />
        <Text
            style={{
                fontSize: 18,
                fontWeight: '600',
                marginTop: 10,
                color: item.isCurrent ? 'rgba(255,255,255,1)' : 'rgba(255,255,255,0.6)',
            }}
        >
            {item.temp}°
        </Text>
    </View>
);

// ============================================================================
// TEMPERATURE RANGE BAR - Gradient Lines
// ============================================================================
const TempRangeBar = ({ low, high, globalLow, globalHigh }) => {
    const range = globalHigh - globalLow;
    const leftPercent = ((low - globalLow) / range) * 100;
    const widthPercent = ((high - low) / range) * 100;

    return (
        <View style={{ height: 5, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 3, flex: 1, marginHorizontal: 16, overflow: 'hidden' }}>
            <LinearGradient
                colors={['#3b82f6', '#8b5cf6', '#ec4899']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{
                    height: '100%',
                    width: `${widthPercent}%`,
                    marginLeft: `${leftPercent}%`,
                    borderRadius: 3,
                }}
            />
        </View>
    );
};

// ============================================================================
// FLOATING DAILY ROW - Minimal Design
// ============================================================================
const FloatingDailyRow = ({ item }) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 18, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255,255,255,0.06)' }}>
        <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 15, width: 56, fontWeight: '500' }}>{item.day}</Text>
        <View style={{ width: 32, alignItems: 'center' }}>
            <WeatherIcon condition={item.condition} size={18} color="rgba(255,255,255,0.5)" />
        </View>
        <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: 14, width: 36, textAlign: 'right' }}>{item.low}°</Text>
        <TempRangeBar low={item.low} high={item.high} globalLow={item.globalLow} globalHigh={item.globalHigh} />
        <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: 14, width: 36, textAlign: 'right', fontWeight: '600' }}>{item.high}°</Text>
    </View>
);

// ============================================================================
// MORPHING HEADER - Slides in when scrolling past cover
// ============================================================================
const MorphingHeader = ({ city, temp, translateY, chameleonGradient }) => (
    <Animated.View
        style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 100,
            transform: [{ translateY }],
        }}
    >
        <LinearGradient
            colors={chameleonGradient.gradientColors}
            locations={[0, 0.3, 1]}
            style={{
                paddingTop: 50,
                paddingBottom: 16,
                paddingHorizontal: 24,
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
            }}
        >
            <Text
                style={{
                    color: 'white',
                    fontSize: 14,
                    fontWeight: '700',
                    letterSpacing: 2,
                    textTransform: 'uppercase',
                }}
            >
                {city}
            </Text>
            <Text
                style={{
                    color: 'white',
                    fontSize: 24,
                    fontWeight: '200',
                }}
            >
                {temp}°
            </Text>
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
// UNIFIED CITY ROW (Hover/Long-Press to Delete)
// ============================================================================
const CityRow = ({ city, index, activeCityIndex, onSelect, onDelete }) => {
    const theme = getChameleonGradient(12, city.condition);
    const isSelected = index === activeCityIndex;
    const [isHovered, setIsHovered] = useState(false);

    // Platform-specific interaction handlers
    const handlers = Platform.select({
        web: {
            onHoverIn: () => setIsHovered(true),
            onHoverOut: () => setIsHovered(false),
            onPress: onSelect,
        },
        default: {
            onLongPress: () => setIsHovered(true),
            onPress: () => {
                if (isHovered) setIsHovered(false); // Tap to dismiss delete
                else onSelect();
            },
            delayLongPress: 300,
        },
    });

    return (
        <Pressable
            {...handlers}
            style={({ pressed }) => ({
                width: '100%',
                height: 100,
                marginBottom: 12,
                borderRadius: 24,
                overflow: 'hidden',
                borderWidth: 1,
                borderColor: isSelected ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.1)',
                backgroundColor: pressed ? 'rgba(255,255,255,0.1)' : 'transparent',
            })}
        >
            {/* Background Gradient */}
            <LinearGradient
                colors={theme.gradientColors}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            />

            {/* Content Container */}
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', padding: 20 }}>
                {/* City Info */}
                <View style={{ flex: 1 }}>
                    <Text style={{ color: 'white', fontSize: 20, fontWeight: '600', letterSpacing: 0.5 }}>
                        {city.name}
                    </Text>
                    <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, marginTop: 4, textTransform: 'capitalize' }}>
                        {city.condition}
                    </Text>
                </View>

                {/* Right Side: Temp + Icon OR Delete Button */}
                <View style={{ alignItems: 'flex-end', justifyContent: 'center', minWidth: 80 }}>
                    {isHovered ? (
                        // DELETE BUTTON (Absolute Overlay)
                        <Pressable
                            onPress={(e) => {
                                e.stopPropagation();
                                onDelete();
                            }}
                            style={{
                                backgroundColor: '#ef4444',
                                paddingHorizontal: 16,
                                paddingVertical: 8,
                                borderRadius: 12,
                                flexDirection: 'row',
                                alignItems: 'center',
                            }}
                        >
                            <Trash2 size={20} color="white" />
                            <Text style={{ color: 'white', fontWeight: '600', marginLeft: 6 }}>Delete</Text>
                        </Pressable>
                    ) : (
                        // TEMP & ICON
                        <>
                            <Text style={{ color: 'white', fontSize: 32, fontWeight: '200' }}>
                                {city.temp}°
                            </Text>
                            <AnimatedWeatherIcon condition={city.condition} size={24} />
                        </>
                    )}
                </View>
            </View>
        </Pressable>
    );
};

// ============================================================================
// GLASS DRAWER - City Manager Overlay
// ============================================================================
const GlassDrawer = ({ cities, activeCityIndex, onSelectCity, onAddCity, onRemoveCity, onClose }) => {
    const [searchText, setSearchText] = useState('');

    // Mock Search Results
    const mockResults = [
        { name: 'Paris', temp: 12, condition: 'rainy' },
        { name: 'Tokyo', temp: 19, condition: 'cloudy' },
        { name: 'Dubai', temp: 35, condition: 'sunny' },
        { name: 'Sydney', temp: 22, condition: 'sunny' },
    ].filter(c => c.name.toLowerCase().includes(searchText.toLowerCase()));

    const isSearching = searchText.length > 0;

    return (
        <Animated.View
            style={[
                StyleSheet.absoluteFill,
                { zIndex: 50 },
            ]}
        >
            {/* Solid Dark Background (85% Opacity) */}
            <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.85)' }]} />

            {/* Blur Effect */}
            <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />

            <SafeAreaView style={{ flex: 1 }}>
                {/* Header */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingTop: 16, paddingBottom: 24 }}>
                    <Text style={{ color: 'white', fontSize: 28, fontWeight: '200' }}>
                        {isSearching ? 'Add City' : 'My Cities'}
                    </Text>
                    <Pressable onPress={onClose} style={{ padding: 8 }}>
                        <X size={24} color="white" />
                    </Pressable>
                </View>

                {/* Search Bar */}
                <View style={{ paddingHorizontal: 24, marginBottom: 24 }}>
                    <View style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: 'rgba(255,255,255,0.1)',
                        borderRadius: 20,
                        paddingHorizontal: 16,
                        paddingVertical: 12,
                        borderWidth: 1,
                        borderColor: 'rgba(255,255,255,0.15)',
                    }}>
                        <Search size={18} color="rgba(255,255,255,0.5)" />
                        <TextInput
                            style={{
                                flex: 1,
                                marginLeft: 12,
                                fontSize: 16,
                                color: 'white',
                            }}
                            placeholder="Search for a city..."
                            placeholderTextColor="rgba(255,255,255,0.4)"
                            value={searchText}
                            onChangeText={setSearchText}
                        />
                    </View>
                </View>

                {/* Content List */}
                <ScrollView style={{ flex: 1 }}>
                    {isSearching ? (
                        // SEARCH RESULTS
                        <View style={{ paddingHorizontal: 24 }}>
                            {mockResults.map((city, index) => (
                                <Pressable
                                    key={index}
                                    onPress={() => {
                                        onAddCity(city.name); // In real app, pass full object
                                        setSearchText('');
                                    }}
                                    style={({ pressed }) => ({
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        padding: 20,
                                        marginBottom: 12,
                                        backgroundColor: pressed ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.05)',
                                        borderRadius: 24,
                                        borderWidth: 1,
                                        borderColor: 'rgba(255,255,255,0.1)',
                                    })}
                                >
                                    <View>
                                        <Text style={{ color: 'white', fontSize: 18, fontWeight: '600' }}>{city.name}</Text>
                                        <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>{city.condition}</Text>
                                    </View>
                                    <Plus size={24} color="white" />
                                </Pressable>
                            ))}
                        </View>
                    ) : (
                        // SAVED CITIES (Unified Row)
                        <View>
                            {cities.map((city, index) => (
                                <CityRow
                                    key={index}
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
    // CITY MANAGER STATE
    const [cities, setCities] = useState([
        { name: 'Casablanca', temp: 22, condition: 'rainy' },
        { name: 'New York', temp: 18, condition: 'cloudy' },
        { name: 'Tokyo', temp: 26, condition: 'sunny' },
        { name: 'London', temp: 14, condition: 'rainy' },
    ]);
    const [activeCityIndex, setActiveCityIndex] = useState(0);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);

    // Derive weather from active city
    const activeCity = cities[activeCityIndex];
    const weather = {
        temp: activeCity.temp,
        condition: activeCity.condition,
        city: activeCity.name,
        humidity: 58,
        wind: 14,
        uv: 3,
        sunrise: '06:42',
        sunset: '18:15',
        feelsLike: activeCity.temp + 2,
    };

    // City management handlers
    const handleSelectCity = (index) => {
        setActiveCityIndex(index);
        setIsDrawerOpen(false);
    };

    const handleAddCity = (cityName) => {
        const conditions = ['sunny', 'cloudy', 'rainy', 'clear'];
        const newCity = {
            name: cityName,
            temp: Math.floor(Math.random() * 20) + 10,
            condition: conditions[Math.floor(Math.random() * conditions.length)],
        };
        setCities([...cities, newCity]);
    };

    const handleRemoveCity = (index) => {
        if (cities.length <= 1) return; // Don't remove last city
        const newCities = cities.filter((_, i) => i !== index);
        setCities(newCities);
        // Adjust active index if needed
        if (activeCityIndex >= index && activeCityIndex > 0) {
            setActiveCityIndex(activeCityIndex - 1);
        }
    };

    // Get current hour for chameleon gradient
    const currentHour = new Date().getHours();
    const isNight = currentHour >= 19 || currentHour < 6;

    // Dynamic theme and gradient based on time + weather
    const theme = useMemo(() => getWeatherTheme(weather.condition, isNight), [weather.condition, isNight]);
    const chameleonGradient = useMemo(() => getChameleonGradient(currentHour, weather.condition), [currentHour, weather.condition]);
    const vibe = useMemo(() => calculateVibe(weather.temp, weather.condition), [weather]);
    const hourly = useMemo(() => generateHourlyForecast(weather.temp), [weather.temp]);
    const weekly = useMemo(() => generateWeeklyForecast(weather.temp), [weather.temp]);

    const player = useVideoPlayer(VIDEO_SOURCE, (p) => {
        p.loop = true;
        p.muted = true;
        p.playbackRate = 0.6;
        p.play();
    });

    // Scroll animation tracking
    const scrollY = useRef(new Animated.Value(0)).current;
    // Platform-specific scroll behavior
    const isIOS = Platform.OS !== 'android'; // iOS style for all except Android

    // iOS: Blur intensity animation (Android: no blur, use gradient instead)
    const blurOpacity = scrollY.interpolate({
        inputRange: [0, 300],
        outputRange: [0, 1],
        extrapolate: 'clamp',
    });

    // Android-only: Progressive element hiding as bottom sheet reaches each element
    // Bottom sheet starts at height + 50 from top, so scrollY = 0 means sheet is at bottom
    // As user scrolls up, sheet moves up. Elements hide when sheet reaches them.

    // Scroll hint (bottom of screen) - hides first (around scrollY 100)
    const scrollHintOpacity = scrollY.interpolate({
        inputRange: [0, 100],
        outputRange: [1, 0],
        extrapolate: 'clamp',
    });

    // Vibe pill (middle-bottom) - hides at scrollY ~200
    const vibePillOpacity = scrollY.interpolate({
        inputRange: [100, 250],
        outputRange: [1, 0],
        extrapolate: 'clamp',
    });

    // Temperature (center) - hides at scrollY ~350
    const tempOpacity = scrollY.interpolate({
        inputRange: [200, 400],
        outputRange: [1, 0],
        extrapolate: 'clamp',
    });

    // City name (top) - hides last at scrollY ~500
    const cityOpacity = scrollY.interpolate({
        inputRange: [350, 550],
        outputRange: [1, 0],
        extrapolate: 'clamp',
    });

    // MORPHING HEADER - Slides down when scrolling past the cover (earlier trigger)
    const headerTranslateY = scrollY.interpolate({
        inputRange: [height - 250, height - 150],
        outputRange: [-100, 0],
        extrapolate: 'clamp',
    });

    // Scroll handler for animations
    const handleScroll = Animated.event(
        [{ nativeEvent: { contentOffset: { y: scrollY } } }],
        { useNativeDriver: false }
    );

    return (
        <View style={{ flex: 1, backgroundColor: '#000' }}>
            <StatusBar style="light" translucent backgroundColor="transparent" />

            {/* LAYER 0: Video Background */}
            <VideoView
                player={player}
                style={StyleSheet.absoluteFill}
                contentFit="cover"
                nativeControls={false}
            />

            {/* RAIN ON GLASS - Weather Overlay (behind ScrollView) */}
            <WeatherOverlay condition={weather.condition} />

            {/* Gradient Overlay for Readability */}
            <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.2)', 'rgba(0,0,0,0.5)']}
                locations={[0, 0.5, 1]}
                style={StyleSheet.absoluteFill}
            />

            {/* HERO COVER - Platform-specific visibility */}
            <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
                <SafeAreaView style={{ flex: 1, justifyContent: 'space-between', paddingHorizontal: 24, paddingBottom: 32 }}>

                    {/* CITY NAME - Always visible on iOS, hides on Android */}
                    <Animated.View style={{ alignItems: 'center', paddingTop: 48, opacity: isIOS ? 1 : cityOpacity }}>
                        <Text
                            style={{
                                color: 'white',
                                fontSize: 12,
                                fontWeight: '700',
                                textTransform: 'uppercase',
                                letterSpacing: 8,
                                textShadowColor: 'rgba(0,0,0,0.6)',
                                textShadowOffset: { width: 0, height: 2 },
                                textShadowRadius: 10,
                            }}
                        >
                            {weather.city}
                        </Text>
                    </Animated.View>

                    {/* TEMPERATURE + VIBE - Progressive hide on Android */}
                    <View style={{ alignItems: 'center' }}>
                        {/* EDITORIAL TEMPERATURE */}
                        <Animated.View style={{ flexDirection: 'row', alignItems: 'flex-start', opacity: isIOS ? 1 : tempOpacity }}>
                            <Text
                                style={{
                                    color: 'white',
                                    fontSize: 180,
                                    fontWeight: '100',
                                    letterSpacing: -12,
                                    lineHeight: 180,
                                    textShadowColor: 'rgba(0,0,0,0.4)',
                                    textShadowOffset: { width: 0, height: 6 },
                                    textShadowRadius: 30,
                                }}
                            >
                                {weather.temp}
                            </Text>
                            <Text
                                style={{
                                    color: 'rgba(255,255,255,0.35)',
                                    fontSize: 56,
                                    fontWeight: '100',
                                    marginTop: 32,
                                    letterSpacing: -3,
                                }}
                            >
                                °
                            </Text>
                        </Animated.View>

                        {/* Condition Label - follows temp */}
                        <Animated.Text
                            style={{
                                color: 'rgba(255,255,255,0.35)',
                                fontSize: 17,
                                fontWeight: '300',
                                marginTop: -8,
                                marginBottom: 32,
                                letterSpacing: 3,
                                opacity: isIOS ? 1 : tempOpacity,
                            }}
                        >
                            {weather.condition.charAt(0).toUpperCase() + weather.condition.slice(1)}
                        </Animated.Text>

                        {/* BREATHING VIBE PILL */}
                        <Animated.View style={{ opacity: isIOS ? 1 : vibePillOpacity }}>
                            <BreathingVibePill
                                label={vibe.label}
                                score={vibe.score}
                                accent={theme.accent}
                                border={theme.border}
                            />
                        </Animated.View>
                    </View>

                    {/* SCROLL HINT - Always visible on iOS, hides on Android */}
                    <Animated.View style={{ alignItems: 'center', opacity: isIOS ? 1 : scrollHintOpacity }}>
                        <BouncingChevron />
                        <Text
                            style={{
                                color: 'white',
                                fontSize: 9,
                                marginTop: 8,
                                letterSpacing: 3,
                                fontWeight: '600',
                                textShadowColor: 'rgba(0,0,0,0.5)',
                                textShadowOffset: { width: 0, height: 1 },
                                textShadowRadius: 4,
                            }}
                        >
                            SWIPE UP
                        </Text>
                    </Animated.View>
                </SafeAreaView>
            </View>

            {/* LAYER 1: SCROLLABLE CONTENT - The Ghost Interface */}
            <Animated.ScrollView
                showsVerticalScrollIndicator={false}
                bounces={true}
                decelerationRate={isIOS ? 'fast' : 'normal'}
                onScroll={handleScroll}
                scrollEventThrottle={16}
            >
                {/* Full-screen transparent spacer - pushes content 100% below the fold */}
                <View style={{ height: height + 50 }} />

                {/* CHAMELEON GLASS SHEET */}
                <View
                    style={{
                        minHeight: height,
                        borderTopLeftRadius: 50,
                        borderTopRightRadius: 50,
                        overflow: 'hidden',
                        borderTopWidth: 1,
                        borderColor: chameleonGradient.border,
                    }}
                >
                    {/* iOS/Web: BlurView + Chameleon Gradient Colors */}
                    {isIOS ? (
                        <>
                            {/* Blur first for frosted glass effect */}
                            <BlurView
                                intensity={60}
                                tint="dark"
                                style={StyleSheet.absoluteFill}
                            />
                            {/* Chameleon gradient on top - shows day/night colors */}
                            <LinearGradient
                                colors={chameleonGradient.gradientColors}
                                locations={[0, 0.3, 1]}
                                style={[StyleSheet.absoluteFill, { borderTopLeftRadius: 50, borderTopRightRadius: 50 }]}
                            />
                            {/* Chameleon Weather Tint */}
                            <View
                                style={[
                                    StyleSheet.absoluteFill,
                                    { backgroundColor: chameleonGradient.tintColor },
                                ]}
                            />
                        </>
                    ) : (
                        <>
                            {/* Android: Gradient-based Ghost Material */}
                            <LinearGradient
                                colors={chameleonGradient.gradientColors}
                                locations={[0, 0.3, 1]}
                                style={[StyleSheet.absoluteFill, { borderTopLeftRadius: 50, borderTopRightRadius: 50 }]}
                            />
                            {/* Chameleon Tint Layer */}
                            <LinearGradient
                                colors={[
                                    'transparent',
                                    chameleonGradient.tintColor,
                                    chameleonGradient.tintColor,
                                ]}
                                locations={[0, 0.4, 1]}
                                style={StyleSheet.absoluteFill}
                            />
                        </>
                    )}

                    {/* Top Edge Shine - Glass Edge Effect */}
                    <LinearGradient
                        colors={['rgba(255,255,255,0.15)', 'rgba(255,255,255,0.05)', 'transparent']}
                        locations={[0, 0.03, 0.12]}
                        style={StyleSheet.absoluteFill}
                    />

                    {/* CONTENT */}
                    <View style={{ paddingHorizontal: 20, paddingTop: 32, paddingBottom: 60 }}>
                        {/* Handle */}
                        <View style={{ alignItems: 'center', marginBottom: 32 }}>
                            <View
                                style={{
                                    width: 40,
                                    height: 5,
                                    borderRadius: 3,
                                    backgroundColor: 'rgba(255,255,255,0.25)',
                                }}
                            />
                        </View>

                        {/* HOURLY FORECAST - Floating Text Columns */}
                        <Text
                            style={{
                                color: 'rgba(255,255,255,0.25)',
                                fontSize: 10,
                                fontWeight: '600',
                                textTransform: 'uppercase',
                                letterSpacing: 3,
                                marginBottom: 16,
                            }}
                        >
                            Hourly Forecast
                        </Text>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            style={{ marginBottom: 40 }}
                            contentContainerStyle={{ paddingRight: 20 }}
                        >
                            {hourly.map((h) => (
                                <FloatingHourlyItem key={h.id} item={h} />
                            ))}
                        </ScrollView>

                        {/* WEEKLY FORECAST - Temperature Range Bars */}
                        <Text
                            style={{
                                color: 'rgba(255,255,255,0.25)',
                                fontSize: 10,
                                fontWeight: '600',
                                textTransform: 'uppercase',
                                letterSpacing: 3,
                                marginBottom: 12,
                            }}
                        >
                            7-Day Forecast
                        </Text>
                        <View style={{ marginBottom: 40 }}>
                            {weekly.map((d) => (
                                <FloatingDailyRow key={d.id} item={d} />
                            ))}
                        </View>

                        {/* DETAILS BENTO GRID */}
                        <Text
                            style={{
                                color: 'rgba(255,255,255,0.25)',
                                fontSize: 10,
                                fontWeight: '600',
                                textTransform: 'uppercase',
                                letterSpacing: 3,
                                marginBottom: 12,
                            }}
                        >
                            Details
                        </Text>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4 }}>
                            <View style={{ width: '50%' }}>
                                <BentoCard icon={Eye} label="UV Index" value={weather.uv} sublabel="Low" />
                            </View>
                            <View style={{ width: '50%' }}>
                                <BentoCard icon={Wind} label="Wind" value={weather.wind} sublabel="km/h" />
                            </View>
                            <View style={{ width: '50%' }}>
                                <BentoCard icon={Droplets} label="Humidity" value={`${weather.humidity}%`} />
                            </View>
                            <View style={{ width: '50%' }}>
                                <BentoCard icon={Thermometer} label="Feels Like" value={`${weather.feelsLike}°`} />
                            </View>
                            <View style={{ width: '50%' }}>
                                <BentoCard icon={Sunrise} label="Sunrise" value={weather.sunrise} />
                            </View>
                            <View style={{ width: '50%' }}>
                                <BentoCard icon={Sunset} label="Sunset" value={weather.sunset} />
                            </View>
                        </View>

                        {/* Bottom Padding */}
                        <View style={{ height: 80 }} />
                    </View>
                </View>
            </Animated.ScrollView>

            {/* MORPHING HEADER - Slides in when scrolling past cover */}
            <MorphingHeader
                city={weather.city}
                temp={weather.temp}
                translateY={headerTranslateY}
                chameleonGradient={chameleonGradient}
            />

            {/* MENU BUTTON - Opens Glass Drawer */}
            <Pressable
                onPress={() => setIsDrawerOpen(true)}
                style={{
                    position: 'absolute',
                    top: 52,
                    right: 24,
                    zIndex: 10,
                    padding: 12,
                    backgroundColor: 'rgba(255,255,255,0.1)',
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: 'rgba(255,255,255,0.15)',
                }}
            >
                <List size={20} color="white" />
            </Pressable>

            {/* LAYER 2: GLASS DRAWER - City Manager Overlay */}
            {isDrawerOpen && (
                <GlassDrawer
                    cities={cities}
                    activeCityIndex={activeCityIndex}
                    onSelectCity={handleSelectCity}
                    onAddCity={handleAddCity}
                    onRemoveCity={handleRemoveCity}
                    onClose={() => setIsDrawerOpen(false)}
                />
            )}
        </View>
    );
}
