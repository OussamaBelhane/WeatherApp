import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Dimensions, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';

import { ChevronLeft, Search, Plus, MapPin, Sun, Cloud, CloudRain, Wind } from 'lucide-react-native';

const { width, height } = Dimensions.get('window');

const HomeCitiesPage = ({ cities, activeCityIndex, setActiveCityIndex, onBack, onAddCity }) => {
    const [searchQuery, setSearchQuery] = useState('');

    // Helper to get icon based on condition
    const getWeatherIcon = (condition, size = 24, color = 'white') => {
        const cond = condition?.toLowerCase() || '';
        if (cond.includes('rain')) return <CloudRain size={size} color={color} />;
        if (cond.includes('cloud')) return <Cloud size={size} color={color} />;
        return <Sun size={size} color={color} />;
    };

    // Filter cities
    const filteredCities = cities.map((city, index) => ({ ...city, originalIndex: index }))
        .filter(city => city.name.toLowerCase().includes(searchQuery.toLowerCase()));

    const handleAddCityPress = () => {
        if (searchQuery.trim()) {
            onAddCity(searchQuery);
            setSearchQuery('');
        }
    };

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
                    {/* Cities Grid */}
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
                                                        <Text style={[styles.cardTemp, !isHero && styles.smallTemp]}>{city.temp}°</Text>
                                                    </View>
                                                </View>
                                            </>
                                        )}
                                    </Pressable>
                                </View>
                            );
                        })}

                        {/* Add City Button - Fits in grid */}
                        {searchQuery.trim() !== '' && (
                            <View style={[styles.gridItem, styles.standardItem]}>
                                <Pressable style={styles.cardContainer} onPress={handleAddCityPress}>
                                    {Platform.OS === 'android' ? (
                                        <LinearGradient
                                            colors={['#1e3c72', '#2a5298']}
                                            style={[styles.androidCardGradient, { borderWidth: 0 }]}
                                        >
                                            <View style={styles.addCityContent}>
                                                <Plus size={32} color="white" />
                                                <Text style={styles.addCityText}>Add</Text>
                                            </View>
                                        </LinearGradient>
                                    ) : (
                                        <>
                                            <BlurView
                                                intensity={20}
                                                tint="light"
                                                style={StyleSheet.absoluteFill}
                                            />
                                            <View style={styles.addCityContent}>
                                                <Plus size={32} color="white" />
                                                <Text style={styles.addCityText}>Add</Text>
                                            </View>
                                        </>
                                    )}
                                </Pressable>
                            </View>
                        )}
                    </View>
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
});

export default HomeCitiesPage;
