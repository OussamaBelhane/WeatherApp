import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Dimensions, Platform, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';

import { ChevronLeft, Search, Plus, MapPin, Sun, Cloud, CloudRain, Wind } from 'lucide-react-native';
import { searchCity } from '../services/WeatherService';

const { width, height } = Dimensions.get('window');

const HomeCitiesPage = ({ cities, activeCityIndex, setActiveCityIndex, onBack, onAddCity, onRemoveCity }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const searchTimeout = useRef(null);

    // Helper to get icon based on condition
    const getWeatherIcon = (condition, size = 24, color = 'white') => {
        const cond = condition?.toLowerCase() || 'sunny';
        if (cond.includes('rain') || cond.includes('storm')) return <CloudRain size={size} color={color} />;
        if (cond.includes('cloud') || cond.includes('fog')) return <Cloud size={size} color={color} />;
        return <Sun size={size} color={color} />;
    };

    // Debounced city search
    useEffect(() => {
        if (searchQuery.length < 2) {
            setSearchResults([]);
            setIsSearching(false);
            return;
        }

        // Clear previous timeout
        if (searchTimeout.current) {
            clearTimeout(searchTimeout.current);
        }

        setIsSearching(true);

        // Debounce search (300ms)
        searchTimeout.current = setTimeout(async () => {
            try {
                const results = await searchCity(searchQuery);
                setSearchResults(results);
            } catch (error) {
                console.error('Search error:', error);
                setSearchResults([]);
            } finally {
                setIsSearching(false);
            }
        }, 300);

        return () => {
            if (searchTimeout.current) {
                clearTimeout(searchTimeout.current);
            }
        };
    }, [searchQuery]);

    // Filter existing cities (for when not actively searching)
    const filteredCities = cities.map((city, index) => ({ ...city, originalIndex: index }))
        .filter(city => city.name.toLowerCase().includes(searchQuery.toLowerCase()));

    const handleAddCityFromSearch = (city) => {
        // Pass full city object with lat/lon
        onAddCity(city);
        setSearchQuery('');
        setSearchResults([]);
    };

    const handleAddCityPress = () => {
        if (searchQuery.trim()) {
            onAddCity(searchQuery);
            setSearchQuery('');
        }
    };

    // Determine what to show
    const showSearchResults = searchQuery.length >= 2 && searchResults.length > 0;


    return (
        <View style={styles.container}>
            <StatusBar style="light" />

            {/* Dynamic Background */}
            <LinearGradient
                colors={['#1A2980', '#26D0CE']} // Deep Blue to Cyan gradient
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
            />

            <SafeAreaView style={styles.safeArea} edges={['top']}>

                {/* Header */}
                <View style={styles.header}>
                    <Pressable onPress={onBack} style={styles.iconButton}>
                        <BlurView intensity={20} tint="light" style={styles.blurIcon}>
                            <ChevronLeft size={24} color="white" />
                        </BlurView>
                    </Pressable>
                    <Text style={styles.headerTitle}>Cities</Text>
                    <View style={{ width: 44 }} />
                </View>

                {/* Search Bar */}
                <View style={styles.searchContainer}>
                    <BlurView intensity={30} tint="dark" style={styles.searchBarBlur}>
                        <Search size={20} color="rgba(255,255,255,0.6)" />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search for a city..."
                            placeholderTextColor="rgba(255,255,255,0.6)"
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                    </BlurView>
                </View>

                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Search Results from API */}
                    {showSearchResults && (
                        <View style={styles.searchResultsContainer}>
                            <Text style={styles.sectionTitle}>Search Results</Text>
                            {searchResults.map((city, index) => (
                                <Pressable
                                    key={city.id || index}
                                    style={({ pressed }) => [
                                        styles.searchResultItem,
                                        pressed && styles.searchResultItemPressed
                                    ]}
                                    onPress={() => handleAddCityFromSearch(city)}
                                >
                                    <View style={styles.searchResultInfo}>
                                        <MapPin size={18} color="rgba(255,255,255,0.6)" />
                                        <View style={styles.searchResultText}>
                                            <Text style={styles.searchResultName}>{city.name}</Text>
                                            <Text style={styles.searchResultCountry}>{city.displayName || city.country}</Text>
                                        </View>
                                    </View>
                                    <Plus size={24} color="white" />
                                </Pressable>
                            ))}
                        </View>
                    )}

                    {/* Loading indicator */}
                    {isSearching && (
                        <View style={styles.loadingContainer}>
                            <Text style={styles.loadingText}>Searching...</Text>
                        </View>
                    )}

                    {/* No results message */}
                    {searchQuery.length >= 2 && !isSearching && searchResults.length === 0 && (
                        <View style={styles.noResultsContainer}>
                            <Text style={styles.noResultsText}>No cities found for "{searchQuery}"</Text>
                        </View>
                    )}

                    {/* Existing Cities Grid - show when not actively searching */}
                    {!showSearchResults && (
                        <>
                            {searchQuery.length < 2 && (
                                <Text style={styles.sectionTitle}>Your Cities</Text>
                            )}
                            <View style={styles.gridContainer}>
                                {filteredCities.map((city, index) => {
                                    const isHero = index === 0;
                                    return (
                                        <View
                                            key={city.originalIndex}
                                            style={[
                                                styles.gridItem,
                                                isHero ? styles.heroItem : styles.standardItem
                                            ]}
                                        >
                                            <Pressable
                                                style={styles.cardContainer}
                                                onPress={() => {
                                                    setActiveCityIndex(city.originalIndex);
                                                    onBack();
                                                }}
                                                onLongPress={() => {
                                                    if (Platform.OS === 'web') {
                                                        onRemoveCity(city.originalIndex);
                                                        return;
                                                    }
                                                    Alert.alert(
                                                        "Delete City",
                                                        `Are you sure you want to remove ${city.name}?`,
                                                        [
                                                            { text: "Cancel", style: "cancel" },
                                                            { text: "Delete", onPress: () => onRemoveCity(city.originalIndex), style: "destructive" }
                                                        ]
                                                    );
                                                }}
                                            >
                                                {Platform.OS === 'android' ? (
                                                    <LinearGradient
                                                        // Royal Blue: Vibrant, premium blue that fits the weather theme. Not black.
                                                        colors={['#1e3c72', '#2a5298']}
                                                        style={[styles.androidCardGradient, { borderWidth: 0 }]}
                                                    >
                                                        <View style={styles.cardContent}>
                                                            <View style={styles.cardTop}>
                                                                <View>
                                                                    <Text style={styles.cardCity}>{city.name}</Text>
                                                                    <Text style={styles.cardTime}>10:45 PM</Text>
                                                                </View>
                                                                {getWeatherIcon(city.condition, isHero ? 40 : 32, 'white')}
                                                            </View>

                                                            <View style={styles.cardBottom}>
                                                                <Text style={styles.cardCondition}>{city.condition || 'Sunny'}</Text>
                                                                <Text style={[styles.cardTemp, !isHero && styles.smallTemp]}>{city.temp}°</Text>
                                                            </View>
                                                        </View>
                                                    </LinearGradient>
                                                ) : (
                                                    <>
                                                        <BlurView
                                                            intensity={30}
                                                            tint="dark"
                                                            style={StyleSheet.absoluteFill}
                                                        />
                                                        <LinearGradient
                                                            colors={['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']}
                                                            style={StyleSheet.absoluteFill}
                                                        />
                                                        <View style={styles.cardContent}>
                                                            <View style={styles.cardTop}>
                                                                <View>
                                                                    <Text style={styles.cardCity}>{city.name}</Text>
                                                                    <Text style={styles.cardTime}>10:45 PM</Text>
                                                                </View>
                                                                {getWeatherIcon(city.condition, isHero ? 40 : 32, 'white')}
                                                            </View>

                                                            <View style={styles.cardBottom}>
                                                                <Text style={styles.cardCondition}>{city.condition || 'Sunny'}</Text>
                                                                <Text style={[styles.cardTemp, !isHero && styles.smallTemp]}>{city.temp || 0}°</Text>
                                                            </View>
                                                        </View>
                                                    </>
                                                )}
                                            </Pressable>
                                        </View>
                                    );
                                })}
                            </View>
                        </>
                    )}
                </ScrollView>
            </SafeAreaView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    safeArea: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 10,
        marginBottom: 10,
    },
    iconButton: {
        borderRadius: 22,
        overflow: 'hidden',
    },
    blurIcon: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: '700',
        color: 'white',
        letterSpacing: 0.5,
    },
    searchContainer: {
        paddingHorizontal: 20,
        marginBottom: 24,
    },
    searchBarBlur: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 14,
        gap: 12,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        color: 'white',
        fontWeight: '500',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingBottom: 40,
    },
    listContainer: {
        gap: 20,
    },
    cardContainer: {
        borderRadius: 30,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 10,
        backgroundColor: 'rgba(0,0,0,0.2)', // Fallback/Base
    },
    cardContent: {
        padding: 24,
        minHeight: 160,
        justifyContent: 'space-between',
    },
    cardTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    cardCity: {
        fontSize: 24,
        fontWeight: '700',
        color: 'white',
        marginBottom: 4,
    },
    cardTime: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.7)',
        fontWeight: '600',
    },
    cardBottom: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
    },
    cardCondition: {
        fontSize: 16,
        color: 'rgba(255,255,255,0.9)',
        fontWeight: '600',
        marginBottom: 8,
    },
    cardTemp: {
        fontSize: 64,
        fontWeight: '800',
        color: 'white',
        includeFontPadding: false,
        lineHeight: 64,
    },
    smallTemp: {
        fontSize: 42,
        lineHeight: 42,
    },
    gridContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    gridItem: {
        borderRadius: 30,
        overflow: 'hidden',
    },
    heroItem: {
        width: '100%',
        marginBottom: 8,
    },
    standardItem: {
        width: (width - 40 - 12) / 2, // (Screen width - padding - gap) / 2
        marginBottom: 8,
    },
    addCityButton: {
        borderRadius: 30,
        overflow: 'hidden',
        marginTop: 0, // Reset margin since it's in grid now
        backgroundColor: 'rgba(255,255,255,0.05)',
        height: '100%', // Fill grid item height
    },
    addCityContent: {
        padding: 40,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
        borderStyle: 'dashed',
        borderRadius: 30, // Match container
    },
    addCityText: {
        fontSize: 18,
        fontWeight: '600',
        color: 'white',
    },
    androidCardGradient: {
        borderRadius: 30,
        flex: 1,
        overflow: 'hidden',
    },
    // New search-related styles
    sectionTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: 'rgba(255,255,255,0.6)',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 16,
    },
    searchResultsContainer: {
        marginBottom: 24,
    },
    searchResultItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 16,
        padding: 16,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    searchResultItemPressed: {
        backgroundColor: 'rgba(255,255,255,0.2)',
    },
    searchResultInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        gap: 12,
    },
    searchResultText: {
        flex: 1,
    },
    searchResultName: {
        fontSize: 18,
        fontWeight: '600',
        color: 'white',
    },
    searchResultCountry: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.6)',
        marginTop: 2,
    },
    loadingContainer: {
        padding: 20,
        alignItems: 'center',
    },
    loadingText: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 16,
    },
    noResultsContainer: {
        padding: 40,
        alignItems: 'center',
    },
    noResultsText: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 16,
        textAlign: 'center',
    },
});

export default HomeCitiesPage;
