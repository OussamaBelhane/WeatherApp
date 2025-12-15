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

const isWeb = Platform.OS === 'web';

// ============================================================================
// WEATHER OVERLAY - Rain Effect
// ============================================================================
const WeatherOverlay = ({ condition }) => {
    if (condition !== 'rainy') return null;
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
// ANIMATED WEATHER ICON
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
// CHAMELEON GRADIENT ENGINE
// ============================================================================
const getChameleonGradient = (currentHour, weatherCondition) => {
    if (weatherCondition === 'rainy') {
        return {
            name: 'stormy',
            gradientColors: ['rgba(0, 0, 0, 0)', 'rgba(30, 41, 59, 0.9)', 'rgba(15, 23, 42, 0.98)'],
            tintColor: 'rgba(59, 130, 246, 0.08)',
            accent: '#60a5fa',
            border: 'rgba(96, 165, 250, 0.25)',
        };
    }

    if (weatherCondition === 'cloudy') {
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
        <WeatherIcon condition="clear" size={20} color={item.isCurrent ? '#fff' : 'rgba(255,255,255,0.5)'} isNight={item.isNight} />
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
        <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: 14, width: 36, textAlign: 'right' }}>{item.low}°</Text>
        <TempRangeBar low={item.low} high={item.high} globalLow={item.globalLow} globalHigh={item.globalHigh} />
        <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: 14, width: 36, textAlign: 'right', fontWeight: '600' }}>{item.high}°</Text>
    </View>
);

// ============================================================================
// MORPHING HEADER
// ============================================================================
const MorphingHeader = ({ city, temp, translateY, chameleonGradient }) => (
    <Animated.View style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100, transform: [{ translateY }] }}>
        <LinearGradient colors={chameleonGradient.gradientColors} locations={[0, 0.3, 1]} style={{ paddingTop: 50, paddingBottom: 16, paddingHorizontal: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ color: 'white', fontSize: 14, fontWeight: '700', letterSpacing: 2, textTransform: 'uppercase' }}>{city}</Text>
            <Text style={{ color: 'white', fontSize: 24, fontWeight: '200' }}>{temp}°</Text>
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
    const [isHovered, setIsHovered] = useState(false);

    const handlers = Platform.select({
        web: { onHoverIn: () => setIsHovered(true), onHoverOut: () => setIsHovered(false), onPress: onSelect },
        default: { onLongPress: () => setIsHovered(true), onPress: () => { if (isHovered) setIsHovered(false); else onSelect(); }, delayLongPress: 300 },
    });

    return (
        <Pressable {...handlers} style={({ pressed }) => ({ width: '100%', height: 100, marginBottom: 12, borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: isSelected ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.1)', backgroundColor: pressed ? 'rgba(255,255,255,0.1)' : 'transparent' })}>
            <LinearGradient colors={theme.gradientColors} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', padding: 20 }}>
                <View style={{ flex: 1 }}>
                    <Text style={{ color: 'white', fontSize: 20, fontWeight: '600', letterSpacing: 0.5 }}>{city.name}</Text>
                    <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, marginTop: 4, textTransform: 'capitalize' }}>{city.condition}</Text>
                </View>
                <View style={{ alignItems: 'flex-end', justifyContent: 'center', minWidth: 80 }}>
                    {isHovered ? (
                        <Pressable onPress={(e) => { e.stopPropagation(); onDelete(); }} style={{ backgroundColor: '#ef4444', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, flexDirection: 'row', alignItems: 'center' }}>
                            <Trash2 size={20} color="white" />
                            <Text style={{ color: 'white', fontWeight: '600', marginLeft: 6 }}>Delete</Text>
                        </Pressable>
                    ) : (
                        <>
                            <Text style={{ color: 'white', fontSize: 32, fontWeight: '200' }}>{city.temp}°</Text>
                            <AnimatedWeatherIcon condition={city.condition} size={24} />
                        </>
                    )}
                </View>
            </View>
        </Pressable>
    );
};

// ============================================================================
// GLASS DRAWER
// ============================================================================
const GlassDrawer = ({ cities, activeCityIndex, onSelectCity, onAddCity, onRemoveCity, onClose }) => {
    const [searchText, setSearchText] = useState('');
    const mockResults = [
        { name: 'Paris', temp: 12, condition: 'rainy' },
        { name: 'Tokyo', temp: 19, condition: 'cloudy' },
        { name: 'Dubai', temp: 35, condition: 'sunny' },
        { name: 'Sydney', temp: 22, condition: 'sunny' },
    ].filter(c => c.name.toLowerCase().includes(searchText.toLowerCase()));
    const isSearching = searchText.length > 0;

    return (
        <View style={[StyleSheet.absoluteFill, { zIndex: 50 }]}>
            <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.85)' }]} />
            <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
            <SafeAreaView style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingTop: 16, paddingBottom: 24 }}>
                    <Text style={{ color: 'white', fontSize: 28, fontWeight: '200' }}>{isSearching ? 'Add City' : 'My Cities'}</Text>
                    <Pressable onPress={onClose} style={{ padding: 8 }}><X size={24} color="white" /></Pressable>
                </View>
                <View style={{ paddingHorizontal: 24, marginBottom: 24 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' }}>
                        <Search size={18} color="rgba(255,255,255,0.5)" />
                        <TextInput style={{ flex: 1, marginLeft: 12, fontSize: 16, color: 'white' }} placeholder="Search for a city..." placeholderTextColor="rgba(255,255,255,0.4)" value={searchText} onChangeText={setSearchText} />
                    </View>
                </View>
                <ScrollView style={{ flex: 1 }}>
                    {isSearching ? (
                        <View style={{ paddingHorizontal: 24 }}>
                            {mockResults.map((city, index) => (
                                <Pressable key={index} onPress={() => { onAddCity(city.name); setSearchText(''); }} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, marginBottom: 12, backgroundColor: pressed ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.05)', borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' })}>
                                    <View><Text style={{ color: 'white', fontSize: 18, fontWeight: '600' }}>{city.name}</Text><Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>{city.condition}</Text></View>
                                    <Plus size={24} color="white" />
                                </Pressable>
                            ))}
                        </View>
                    ) : (
                        <View style={{ paddingHorizontal: 24 }}>
                            {cities.map((city, index) => (<CityRow key={index} city={city} index={index} activeCityIndex={activeCityIndex} onSelect={() => onSelectCity(index)} onDelete={() => onRemoveCity(index)} />))}
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
    const currentHour = new Date().getHours();
    const isNight = currentHour >= 19 || currentHour < 6;
    const isIOS = Platform.OS !== 'android';

    const weather = {
        temp: city.temp,
        condition: city.condition,
        city: city.name,
        humidity: 58,
        wind: 14,
        uv: 3,
        sunrise: '06:42',
        sunset: '18:15',
        feelsLike: city.temp + 2,
    };

    const theme = useMemo(() => getWeatherTheme(weather.condition, isNight), [weather.condition, isNight]);
    const chameleonGradient = useMemo(() => getChameleonGradient(currentHour, weather.condition), [currentHour, weather.condition]);
    const vibe = useMemo(() => calculateVibe(weather.temp, weather.condition), [weather.temp, weather.condition]);
    const hourly = useMemo(() => generateHourlyForecast(weather.temp), [weather.temp]);
    const weekly = useMemo(() => generateWeeklyForecast(weather.temp), [weather.temp]);

    // Date String
    const date = new Date();
    const dateString = date.toLocaleDateString('en-US', { weekday: 'long' });
    const timeString = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const fullDate = `${dateString}, ${timeString}`;

    const todayHigh = weekly[0].high;
    const todayLow = weekly[0].low;

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
                                <Text style={{ color: 'white', fontSize: 20, fontWeight: '500', letterSpacing: 0.5 }}>{weather.city}, UK</Text>
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
                                <AnimatedWeatherIcon condition={weather.condition} size={32} />
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
    const [cities, setCities] = useState([
        { name: 'Casablanca', temp: 22, condition: 'rainy' },
        { name: 'New York', temp: 18, condition: 'cloudy' },
        { name: 'Tokyo', temp: 26, condition: 'sunny' },
        { name: 'London', temp: 14, condition: 'rainy' },
    ]);
    const [activeCityIndex, setActiveCityIndex] = useState(0);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [viewMode, setViewMode] = useState('pager'); // 'pager' | 'focus'
    const pagerRef = useRef(null);

    // SINGLE SHARED VIDEO PLAYER - Only one instance for all cities (performance optimization)
    const videoPlayer = useVideoPlayer(VIDEO_SOURCE, (p) => {
        p.loop = true;
        p.muted = true;
        p.playbackRate = 0.6;
        p.play();
    });

    const handleSelectCity = (index) => {
        setActiveCityIndex(index);
        if (!isWeb) pagerRef.current?.setPage(index);
        setIsDrawerOpen(false);
    };

    const handleAddCity = (cityName) => {
        const conditions = ['sunny', 'cloudy', 'rainy', 'clear'];
        const newCity = { name: cityName, temp: Math.floor(Math.random() * 20) + 10, condition: conditions[Math.floor(Math.random() * conditions.length)] };
        setCities([...cities, newCity]);
    };

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
        // Close drawer if open (though we are navigating away)
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

    return (
        <RadialMenuProvider
            onCitiesPress={handleCitiesPress}
            onFocusPress={handleFocusPress}
            hideTrigger={isDrawerOpen || viewMode === 'focus' || viewMode === 'cities' || viewMode === 'home-cities'}
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
                />
            ) : viewMode === 'home-cities' ? (
                <HomeCitiesPage
                    cities={cities}
                    activeCityIndex={activeCityIndex}
                    setActiveCityIndex={setActiveCityIndex}
                    onBack={handleHomePress}
                    onAddCity={handleAddCity}
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
                />
            )}
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
}) {
    // Ensure video plays when this view is mounted (e.g. returning from Focus mode)
    useEffect(() => {
        if (videoPlayer) {
            // Small delay to ensure the native VideoView is fully attached before playing
            const timer = setTimeout(() => {
                videoPlayer.play();
            }, 100);
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
                <GlassDrawer cities={cities} activeCityIndex={activeCityIndex} onSelectCity={handleSelectCity} onAddCity={handleAddCity} onRemoveCity={handleRemoveCity} onClose={() => setIsDrawerOpen(false)} />
            )}
        </View>
    );
}
