import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { ChevronLeft, Sun, Cloud, CloudRain, Plus, Search } from 'lucide-react-native';

const CitiesPage = ({ cities, activeCityIndex, setActiveCityIndex, onBack, onAddCity }) => {
    const [searchQuery, setSearchQuery] = useState('');

    // Helper to get icon based on condition (mock logic)
    const getWeatherIcon = (condition, size = 24, color = 'black') => {
        const cond = condition?.toLowerCase() || '';
        if (cond.includes('rain')) return <CloudRain size={size} color={color} />;
        if (cond.includes('cloud')) return <Cloud size={size} color={color} />;
        return <Sun size={size} color={color} />;
    };

    // Filter cities based on search query
    const filteredCities = cities.map((city, index) => ({ ...city, originalIndex: index }))
        .filter(city => city.name.toLowerCase().includes(searchQuery.toLowerCase()));

    const handleAddCityPress = () => {
        if (searchQuery.trim()) {
            onAddCity(searchQuery);
            setSearchQuery(''); // Clear search after adding
        }
    };

    return (
        <View style={styles.container}>
            <StatusBar style="dark" />
            <SafeAreaView style={styles.safeArea} edges={['top']}>

                {/* Header */}
                <View style={styles.header}>
                    <Pressable onPress={onBack} style={styles.iconButton}>
                        <ChevronLeft size={24} color="black" />
                    </Pressable>
                    <Text style={styles.headerTitle}>Cities</Text>
                    <View style={{ width: 40 }} />
                </View>

                {/* Search Bar */}
                <View style={styles.searchContainer}>
                    <View style={styles.searchBar}>
                        <Search size={20} color="#999" />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search for a city..."
                            placeholderTextColor="#999"
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                    </View>
                </View>

                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Cities List */}
                    <View style={styles.listContainer}>
                        {filteredCities.length > 0 ? (
                            filteredCities.map((city) => (
                                <Pressable
                                    key={city.originalIndex}
                                    style={[styles.compactRow, city.originalIndex === activeCityIndex && styles.activeRow]}
                                    onPress={() => {
                                        setActiveCityIndex(city.originalIndex);
                                        onBack(); // Go back to Focus Page on selection
                                    }}
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
                            ))
                        ) : (
                            // Add City Button if no results
                            <Pressable style={styles.addCityButton} onPress={handleAddCityPress}>
                                <View style={styles.addIconContainer}>
                                    <Plus size={24} color="white" />
                                </View>
                                <Text style={styles.addCityText}>Add "{searchQuery}"</Text>
                            </Pressable>
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
        marginBottom: 10,
    },
    iconButton: {
        padding: 8,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: 'black',
    },
    searchContainer: {
        paddingHorizontal: 20,
        marginBottom: 20,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingVertical: 12,
        gap: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        color: 'black',
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
        gap: 16,
    },
    compactRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 20,
        backgroundColor: 'white',
        borderRadius: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    activeRow: {
        borderWidth: 1,
        borderColor: 'black',
    },
    rowLeft: {
        gap: 4,
    },
    rowCountry: {
        fontSize: 12,
        color: '#999',
    },
    rowCity: {
        fontSize: 20,
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
    addCityButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'white',
        borderRadius: 20,
        paddingVertical: 20,
        gap: 12,
        borderWidth: 1,
        borderColor: '#E5E5E5',
        borderStyle: 'dashed',
    },
    addIconContainer: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'black',
        justifyContent: 'center',
        alignItems: 'center',
    },
    addCityText: {
        fontSize: 16,
        fontWeight: '600',
        color: 'black',
    },
});

export default CitiesPage;
