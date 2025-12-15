import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Platform, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Home, Plus, MapPin, Sun, Cloud, CloudRain, Wind, Thermometer, Droplets, Gauge, Waves, ChevronLeft } from 'lucide-react-native';

const { width } = Dimensions.get('window');

const FocusWeatherPage = ({ cities, activeCityIndex, setActiveCityIndex, onHome, onAddCity }) => {
    const [showDetails, setShowDetails] = useState(false);

    // Helper to get icon based on condition (mock logic)
    const getWeatherIcon = (condition, size = 24, color = 'black') => {
        const cond = condition?.toLowerCase() || '';
        if (cond.includes('rain')) return <CloudRain size={size} color={color} />;
        if (cond.includes('cloud')) return <Cloud size={size} color={color} />;
        return <Sun size={size} color={color} />;
    };

    const activeCity = cities[activeCityIndex];
    const otherCities = cities.map((city, index) => ({ ...city, originalIndex: index })).filter((_, index) => index !== activeCityIndex);

    // Detail View Component
    if (showDetails) {
        return (
            <View style={styles.container}>
                <StatusBar style="dark" />
                <SafeAreaView style={styles.safeArea} edges={['top']}>
                    {/* Detail Header */}
                    <View style={styles.header}>
                        <Pressable onPress={() => setShowDetails(false)} style={styles.iconButton}>
                            <ChevronLeft size={24} color="black" />
                        </Pressable>
                        <View style={styles.headerTitleContainer}>
                            <Text style={styles.headerTitle}>{activeCity?.name || 'City'}, {activeCity?.country || 'Country'}</Text>
                            <Text style={styles.headerSubtitle}>Today, 08.16</Text>
                        </View>
                        <View style={{ width: 40 }} />
                    </View>

                    <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
                        {/* Main Card (Top Part) */}
                        <View style={styles.detailMainCard}>
                            <View style={styles.cardHeader}>
                                <View style={styles.locationRow}>
                                    <MapPin size={16} color="black" />
                                    <Text style={styles.cardLocation}>{activeCity?.name}</Text>
                                </View>
                                <View style={styles.conditionRow}>
                                    {getWeatherIcon(activeCity?.condition, 16, 'black')}
                                    <Text style={styles.cardCondition}>{activeCity?.condition || 'Sunny Day'}</Text>
                                </View>
                            </View>

                            <View style={styles.dateRow}>
                                <Text style={styles.dateText}>Saturday — 10 Feb</Text>
                            </View>

                            <View style={styles.tempContainer}>
                                <Text style={styles.largeTemp}>{activeCity?.temp || 0}°</Text>
                            </View>

                            <View style={styles.cardFooter}>
                                <Text style={styles.footerCondition}>Clear evening sky.</Text>
                                <Text style={styles.tempRange}>18° — 24°</Text>
                            </View>
                        </View>

                        {/* Stats Grid */}
                        <View style={styles.statsGrid}>
                            <View style={styles.statBox}>
                                <Text style={styles.statLabel}>Real Feel</Text>
                                <Text style={styles.statValue}>16<Text style={styles.statUnit}>°C</Text></Text>
                            </View>
                            <View style={styles.statBox}>
                                <Text style={styles.statLabel}>Humidity</Text>
                                <Text style={styles.statValue}>65<Text style={styles.statUnit}>%</Text></Text>
                            </View>
                            <View style={styles.statBox}>
                                <Text style={styles.statLabel}>Pressure</Text>
                                <Text style={styles.statValue}>859<Text style={styles.statUnitSmall}> mmHg</Text></Text>
                            </View>
                            <View style={styles.statBox}>
                                <Text style={styles.statLabel}>Wind</Text>
                                <Text style={styles.statValue}>9<Text style={styles.statUnitSmall}> m/s</Text></Text>
                            </View>
                            <View style={styles.statBox}>
                                <Text style={styles.statLabel}>UV index</Text>
                                <Text style={styles.statValue}>12</Text>
                            </View>
                            <View style={styles.statBox}>
                                <Text style={styles.statLabel}>Water</Text>
                                <Text style={styles.statValue}>17.2<Text style={styles.statUnit}>°C</Text></Text>
                            </View>
                        </View>
                    </ScrollView>
                </SafeAreaView>
            </View>
        );
    }

    // List View Component
    return (
        <View style={styles.container}>
            <StatusBar style="dark" />
            <SafeAreaView style={styles.safeArea} edges={['top']}>

                {/* Header */}
                <View style={styles.header}>
                    <Pressable onPress={onHome} style={styles.iconButton}>
                        <Home size={24} color="black" />
                    </Pressable>
                    <View style={styles.headerTitleContainer}>
                        <Text style={styles.headerTitle}>{activeCity?.name || 'City'}, {activeCity?.country || 'Country'}</Text>
                        <Text style={styles.headerSubtitle}>Today, 08.16</Text>
                    </View>
                    <Pressable onPress={onAddCity} style={styles.iconButton}>
                        <Plus size={24} color="black" />
                    </Pressable>
                </View>

                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Expanded Card (Active City) - Clickable */}
                    <Pressable onPress={() => setShowDetails(true)}>
                        <View style={styles.expandedCard}>
                            <View style={styles.cardHeader}>
                                <View style={styles.locationRow}>
                                    <MapPin size={16} color="black" />
                                    <Text style={styles.cardLocation}>{activeCity?.name}</Text>
                                </View>
                                <View style={styles.conditionRow}>
                                    {getWeatherIcon(activeCity?.condition, 16, 'black')}
                                    <Text style={styles.cardCondition}>{activeCity?.condition || 'Sunny Day'}</Text>
                                </View>
                            </View>

                            <View style={styles.dateRow}>
                                <Text style={styles.dateText}>Saturday — 10 Feb</Text>
                            </View>

                            <View style={styles.tempContainer}>
                                <Text style={styles.largeTemp}>{activeCity?.temp || 0}°</Text>
                            </View>

                            <View style={styles.cardFooter}>
                                <Text style={styles.footerCondition}>Clear evening sky.</Text>
                                <Text style={styles.tempRange}>18° — 24°</Text>
                            </View>
                        </View>
                    </Pressable>

                    {/* Compact List (Other Cities) */}
                    <View style={styles.listContainer}>
                        {otherCities.map((city) => (
                            <Pressable
                                key={city.originalIndex}
                                style={styles.compactRow}
                                onPress={() => setActiveCityIndex(city.originalIndex)}
                            >
                                <View style={styles.rowLeft}>
                                    <Text style={styles.rowCountry}>{city.country || 'Country'}</Text>
                                    <Text style={styles.rowCity}>{city.name}</Text>
                                </View>

                                <View style={styles.rowRight}>
                                    <Text style={styles.rowTime}>10:45 PM</Text>
                                    <View style={styles.rowTempContainer}>
                                        <Text style={styles.rowTemp}>{city.temp}°</Text>
                                        {getWeatherIcon(city.condition, 16, '#999')}
                                    </View>
                                </View>
                            </Pressable>
                        ))}
                    </View>

                </ScrollView>
            </SafeAreaView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F2F2F2', // Light gray background
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
    },
    iconButton: {
        padding: 8,
    },
    headerTitleContainer: {
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: 'black',
    },
    headerSubtitle: {
        fontSize: 12,
        color: '#666',
        marginTop: 2,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 40,
    },
    // Expanded Card Styles
    expandedCard: {
        backgroundColor: 'white',
        borderRadius: 30,
        padding: 24,
        marginBottom: 30,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.05,
        shadowRadius: 20,
        elevation: 5,
        minHeight: 360,
        justifyContent: 'space-between',
    },
    detailMainCard: {
        backgroundColor: 'white',
        borderRadius: 30,
        padding: 24,
        marginBottom: 20,
        minHeight: 320,
        justifyContent: 'space-between',
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    locationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    cardLocation: {
        fontSize: 14,
        fontWeight: '600',
        color: 'black',
    },
    conditionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    cardCondition: {
        fontSize: 12,
        fontWeight: '600',
        color: 'black',
    },
    dateRow: {
        marginBottom: 10,
    },
    dateText: {
        fontSize: 18,
        fontWeight: '600',
        color: 'black',
    },
    tempContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        marginVertical: 20,
    },
    largeTemp: {
        fontSize: 140,
        fontWeight: '800', // Extra bold
        color: 'black',
        includeFontPadding: false,
        lineHeight: 140,
    },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 10,
    },
    footerCondition: {
        fontSize: 14,
        fontWeight: '600',
        color: 'black',
    },
    tempRange: {
        fontSize: 14,
        fontWeight: '600',
        color: '#666',
    },
    // Compact List Styles
    listContainer: {
        gap: 16,
    },
    compactRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E5E5',
    },
    rowLeft: {
        gap: 4,
    },
    rowCountry: {
        fontSize: 12,
        color: '#999',
    },
    rowCity: {
        fontSize: 24,
        fontWeight: '700',
        color: 'black',
    },
    rowRight: {
        alignItems: 'flex-end',
        gap: 4,
    },
    rowTime: {
        fontSize: 12,
        color: '#999',
    },
    rowTempContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    rowTemp: {
        fontSize: 20,
        fontWeight: '600',
        color: 'black',
    },
    // Stats Grid Styles
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 16,
        justifyContent: 'space-between',
    },
    statBox: {
        width: '47%', // Slightly less than 50% to account for gap
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 20,
        justifyContent: 'center',
    },
    statLabel: {
        fontSize: 14,
        color: '#666',
        marginBottom: 8,
    },
    statValue: {
        fontSize: 32,
        fontWeight: '600',
        color: 'black',
    },
    statUnit: {
        fontSize: 16,
        fontWeight: '400',
        color: '#999',
    },
    statUnitSmall: {
        fontSize: 14,
        fontWeight: '400',
        color: '#999',
    },
});

export default FocusWeatherPage;
