import React from 'react';
import { View, StyleSheet, Pressable, Text, Platform, Dimensions } from 'react-native';
import { WebView } from 'react-native-webview';
import { BlurView } from 'expo-blur';
import { X } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

/**
 * RadarScreen - Displays live weather radar using Windy.com embed
 * 
 * @param {Object} props
 * @param {number} props.lat - Latitude of the city to center on
 * @param {number} props.lon - Longitude of the city to center on
 * @param {string} props.cityName - Name of the city for display
 * @param {function} props.onClose - Callback to close the radar screen
 */
const RadarScreen = ({ lat = 33.5731, lon = -7.5898, cityName = 'Casablanca', onClose }) => {
    // Construct the Windy.com embed URL with dynamic coordinates
    const windyUrl = `https://embed.windy.com/embed2.html?lat=${lat}&lon=${lon}&detailLat=${lat}&detailLon=${lon}&width=650&height=450&zoom=5&level=surface&overlay=rain&product=ecmwf&menu=&message=&marker=&calendar=now&pressure=&type=map&location=coordinates&detail=&metricWind=default&metricTemp=default&radarRange=-1`;

    const isIOS = Platform.OS === 'ios';
    const isWeb = Platform.OS === 'web';

    return (
        <View style={styles.container}>
            {/* WebView fills the entire screen */}
            {isWeb ? (
                // For web platform, use an iframe
                <View style={styles.webviewContainer}>
                    <iframe
                        src={windyUrl}
                        width="100%"
                        height="100%"
                        style={{ border: 'none' }}
                        title="Weather Radar"
                        allowFullScreen
                    />
                </View>
            ) : (
                // For native platforms, use WebView
                <WebView
                    source={{ uri: windyUrl }}
                    style={styles.webview}
                    javaScriptEnabled={true}
                    domStorageEnabled={true}
                    startInLoadingState={true}
                    scalesPageToFit={true}
                    allowsInlineMediaPlayback={true}
                    mediaPlaybackRequiresUserAction={false}
                    renderLoading={() => (
                        <View style={styles.loadingContainer}>
                            <Text style={styles.loadingText}>Loading radar...</Text>
                        </View>
                    )}
                />
            )}

            {/* City name header */}
            <SafeAreaView style={styles.headerContainer} edges={['top']}>
                <View style={styles.headerPill}>
                    {isIOS ? (
                        <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
                    ) : (
                        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0, 0, 0, 0.6)' }]} />
                    )}
                    <Text style={styles.headerText}>📍 {cityName} Radar</Text>
                </View>
            </SafeAreaView>

            {/* Floating Close Button - Glassmorphism style at bottom center */}
            <View style={styles.closeButtonContainer}>
                <Pressable
                    onPress={onClose}
                    style={({ pressed }) => [
                        styles.closeButton,
                        pressed && styles.closeButtonPressed,
                    ]}
                >
                    {isIOS ? (
                        <BlurView intensity={60} tint="dark" style={StyleSheet.absoluteFill} />
                    ) : (
                        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(30, 30, 30, 0.85)' }]} />
                    )}
                    <View style={styles.closeButtonContent}>
                        <X size={20} color="white" strokeWidth={2} />
                        <Text style={styles.closeButtonText}>Close</Text>
                    </View>
                </Pressable>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    webviewContainer: {
        flex: 1,
    },
    webview: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    loadingContainer: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        color: 'rgba(255, 255, 255, 0.7)',
        fontSize: 16,
        fontWeight: '500',
    },
    headerContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        alignItems: 'center',
        paddingTop: 10,
        zIndex: 10,
    },
    headerPill: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 20,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.15)',
    },
    headerText: {
        color: 'white',
        fontSize: 15,
        fontWeight: '600',
        letterSpacing: 0.5,
    },
    closeButtonContainer: {
        position: 'absolute',
        bottom: 50,
        left: 0,
        right: 0,
        alignItems: 'center',
        zIndex: 100,
    },
    closeButton: {
        width: 130,
        height: 50,
        borderRadius: 25,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
        // Shadow for iOS
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 16,
        // Elevation for Android
        elevation: 12,
    },
    closeButtonPressed: {
        transform: [{ scale: 0.95 }],
        opacity: 0.9,
    },
    closeButtonContent: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    closeButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
        letterSpacing: 0.5,
    },
});

export default RadarScreen;
