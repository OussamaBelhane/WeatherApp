import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import {
    View,
    Modal,
    TouchableOpacity,
    TouchableWithoutFeedback,
    Pressable,
    Text,
    StyleSheet,
    Dimensions,
    Animated,
    Platform,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import { Globe, Eye, List, X, Sparkles, Radio } from 'lucide-react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Context for the Radial Menu
const RadialMenuContext = createContext(null);

/**
 * Hook to access the Radial Menu context
 */
export const useRadialMenu = () => {
    const context = useContext(RadialMenuContext);
    if (!context) {
        throw new Error('useRadialMenu must be used within a RadialMenuProvider');
    }
    return context;
};

/**
 * RadialMenuProvider - Provides a top-right corner radial menu
 *
 * Three buttons arranged in a quarter-circle arc from the corner
 */
export const RadialMenuProvider = ({
    children,
    onCitiesPress,
    onFocusPress,
    onRadarPress,
    onSettingsPress,
    hideTrigger = false,
}) => {
    const [modalVisible, setModalVisible] = useState(false);

    // Double-tap detection for Settings
    const lastTapRef = useRef(0);

    // Animation values
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const button1Anim = useRef(new Animated.Value(0)).current;
    const button2Anim = useRef(new Animated.Value(0)).current;
    const button3Anim = useRef(new Animated.Value(0)).current;
    const closeRotate = useRef(new Animated.Value(0)).current;

    // Animate menu open
    const animateOpen = useCallback(() => {
        fadeAnim.setValue(0);
        button1Anim.setValue(0);
        button2Anim.setValue(0);
        button3Anim.setValue(0);
        closeRotate.setValue(0);

        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 250,
                useNativeDriver: true,
            }),
            Animated.timing(closeRotate, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            }),
            // Staggered spring animations
            Animated.spring(button1Anim, {
                toValue: 1,
                tension: 120,
                friction: 8,
                useNativeDriver: true,
            }),
            Animated.sequence([
                Animated.delay(60),
                Animated.spring(button2Anim, {
                    toValue: 1,
                    tension: 120,
                    friction: 8,
                    useNativeDriver: true,
                }),
            ]),
            Animated.sequence([
                Animated.delay(120),
                Animated.spring(button3Anim, {
                    toValue: 1,
                    tension: 120,
                    friction: 8,
                    useNativeDriver: true,
                }),
            ]),
        ]).start();
    }, [fadeAnim, button1Anim, button2Anim, button3Anim, closeRotate]);

    // Animate menu close
    const animateClose = useCallback((callback) => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 180,
                useNativeDriver: true,
            }),
            Animated.timing(button1Anim, {
                toValue: 0,
                duration: 180,
                useNativeDriver: true,
            }),
            Animated.timing(button2Anim, {
                toValue: 0,
                duration: 180,
                useNativeDriver: true,
            }),
            Animated.timing(button3Anim, {
                toValue: 0,
                duration: 180,
                useNativeDriver: true,
            }),
        ]).start(() => {
            if (callback) callback();
        });
    }, [fadeAnim, button1Anim, button2Anim, button3Anim]);

    // Open menu (single tap)
    const openMenu = useCallback(() => {
        if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }
        setModalVisible(true);
    }, []);

    // Open Settings (double-tap or long-press)
    const openSettings = useCallback(() => {
        if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        }
        if (onSettingsPress) onSettingsPress();
    }, [onSettingsPress]);

    // Handle hamburger tap with double-tap detection
    const handleHamburgerPress = useCallback(() => {
        const now = Date.now();
        const DOUBLE_TAP_DELAY = 300;

        if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
            // Double tap detected -> Settings
            lastTapRef.current = 0;
            openSettings();
        } else {
            // First tap -> wait for potential second tap, then open menu
            lastTapRef.current = now;
            setTimeout(() => {
                if (lastTapRef.current === now) {
                    openMenu();
                }
            }, DOUBLE_TAP_DELAY);
        }
    }, [openMenu, openSettings]);

    useEffect(() => {
        if (modalVisible) {
            animateOpen();
        }
    }, [modalVisible, animateOpen]);

    // Button handlers
    const handleCitiesPress = useCallback(() => {
        if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        animateClose(() => {
            setModalVisible(false);
            if (onCitiesPress) onCitiesPress();
        });
    }, [animateClose, onCitiesPress]);

    const handleFocusPress = useCallback(() => {
        if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        animateClose(() => {
            setModalVisible(false);
            if (onFocusPress) onFocusPress();
        });
    }, [animateClose, onFocusPress]);

    const handleRadarPress = useCallback(() => {
        if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        animateClose(() => {
            setModalVisible(false);
            if (onRadarPress) onRadarPress();
        });
    }, [animateClose, onRadarPress]);

    const handleBackgroundPress = useCallback(() => {
        animateClose(() => {
            setModalVisible(false);
        });
    }, [animateClose]);

    // Context value
    const contextValue = {
        openMenu,
        closeMenu: handleBackgroundPress,
        isOpen: modalVisible,
    };

    return (
        <RadialMenuContext.Provider value={contextValue}>
            <GestureHandlerRootView style={styles.container}>
                {children}

                {/* Menu Trigger Button - Top Right */}
                {!hideTrigger && !modalVisible && (
                    <Pressable
                        style={styles.menuTrigger}
                        onPress={handleHamburgerPress}
                        onLongPress={openSettings}
                        delayLongPress={400}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <View style={styles.hamburgerLine} />
                        <View style={[styles.hamburgerLine, styles.hamburgerLineShort]} />
                    </Pressable>
                )}

                {/* Radial Menu Modal */}
                <Modal
                    transparent={true}
                    visible={modalVisible}
                    animationType="none"
                    statusBarTranslucent={true}
                    onRequestClose={handleBackgroundPress}
                >
                    <TouchableWithoutFeedback onPress={handleBackgroundPress}>
                        <View style={styles.modalOverlay}>
                            {/* Dimmed background */}
                            <Animated.View
                                style={[
                                    styles.overlayBackground,
                                    { opacity: Animated.multiply(fadeAnim, 0.6) },
                                ]}
                            />

                            {/* Arc Container - positioned from top-right */}
                            <View style={styles.arcContainer}>

                                {/* Close Button (X) - replaces hamburger */}
                                <Animated.View
                                    style={[
                                        styles.closeButton,
                                        {
                                            opacity: fadeAnim,
                                            transform: [
                                                {
                                                    rotate: closeRotate.interpolate({
                                                        inputRange: [0, 1],
                                                        outputRange: ['0deg', '180deg'],
                                                    }),
                                                },
                                            ],
                                        },
                                    ]}
                                >
                                    <TouchableOpacity
                                        style={styles.closeButtonInner}
                                        onPress={handleBackgroundPress}
                                        activeOpacity={0.7}
                                    >
                                        <X size={20} color="#fff" strokeWidth={2} />
                                    </TouchableOpacity>
                                </Animated.View>

                                {/* Button 1: Cities - Positioned at ~200° */}
                                <Animated.View
                                    style={[
                                        styles.radialButton,
                                        styles.buttonPosition1,
                                        {
                                            opacity: button1Anim,
                                            transform: [
                                                { scale: button1Anim },
                                                {
                                                    translateX: button1Anim.interpolate({
                                                        inputRange: [0, 1],
                                                        outputRange: [50, 0],
                                                    }),
                                                },
                                                {
                                                    translateY: button1Anim.interpolate({
                                                        inputRange: [0, 1],
                                                        outputRange: [-20, 0],
                                                    }),
                                                },
                                            ],
                                        },
                                    ]}
                                >
                                    <TouchableOpacity
                                        style={styles.radialButtonInner}
                                        onPress={handleCitiesPress}
                                        activeOpacity={0.7}
                                    >
                                        <List size={24} color="#fff" strokeWidth={1.8} />
                                        <Text style={styles.buttonLabel}>Cities</Text>
                                    </TouchableOpacity>
                                </Animated.View>

                                {/* Button 2: Radar - Positioned in the middle */}
                                <Animated.View
                                    style={[
                                        styles.radialButton,
                                        styles.buttonPosition2,
                                        {
                                            opacity: button2Anim,
                                            transform: [
                                                { scale: button2Anim },
                                                {
                                                    translateX: button2Anim.interpolate({
                                                        inputRange: [0, 1],
                                                        outputRange: [35, 0],
                                                    }),
                                                },
                                                {
                                                    translateY: button2Anim.interpolate({
                                                        inputRange: [0, 1],
                                                        outputRange: [-35, 0],
                                                    }),
                                                },
                                            ],
                                        },
                                    ]}
                                >
                                    <TouchableOpacity
                                        style={styles.radialButtonInner}
                                        onPress={handleRadarPress}
                                        activeOpacity={0.7}
                                    >
                                        <Radio size={24} color="#fff" strokeWidth={1.8} />
                                        <Text style={styles.buttonLabel}>Radar</Text>
                                    </TouchableOpacity>
                                </Animated.View>

                                {/* Button 3: Focus - Positioned at bottom */}
                                <Animated.View
                                    style={[
                                        styles.radialButton,
                                        styles.buttonPosition3,
                                        {
                                            opacity: button3Anim,
                                            transform: [
                                                { scale: button3Anim },
                                                {
                                                    translateX: button3Anim.interpolate({
                                                        inputRange: [0, 1],
                                                        outputRange: [15, 0],
                                                    }),
                                                },
                                                {
                                                    translateY: button3Anim.interpolate({
                                                        inputRange: [0, 1],
                                                        outputRange: [-50, 0],
                                                    }),
                                                },
                                            ],
                                        },
                                    ]}
                                >
                                    <TouchableOpacity
                                        style={styles.radialButtonInner}
                                        onPress={handleFocusPress}
                                        activeOpacity={0.7}
                                    >
                                        <Sparkles size={24} color="#fff" strokeWidth={1.8} />
                                        <Text style={styles.buttonLabel}>Minimal</Text>
                                    </TouchableOpacity>
                                </Animated.View>
                            </View>
                        </View>
                    </TouchableWithoutFeedback>
                </Modal>
            </GestureHandlerRootView>
        </RadialMenuContext.Provider>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    menuTrigger: {
        position: 'absolute',
        top: 55,
        right: 24,
        zIndex: 100,
        padding: 12,
    },
    hamburgerLine: {
        width: 24,
        height: 2.5,
        backgroundColor: 'white',
        borderRadius: 2,
        marginBottom: 6,
    },
    hamburgerLineShort: {
        width: 16,
        alignSelf: 'flex-end',
        marginBottom: 0,
    },
    modalOverlay: {
        flex: 1,
    },
    overlayBackground: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: '#000',
    },
    arcContainer: {
        position: 'absolute',
        top: 55,
        right: 24,
        width: 260,
        height: 260,
    },
    closeButton: {
        position: 'absolute',
        top: 0,
        right: 0,
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    closeButtonInner: {
        width: '100%',
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
    },
    radialButton: {
        position: 'absolute',
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: 'rgba(20, 20, 25, 0.95)',
        borderWidth: 1.5,
        borderColor: 'rgba(255, 255, 255, 0.15)',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.5,
        shadowRadius: 16,
        elevation: 12,
    },
    radialButtonInner: {
        width: '100%',
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonLabel: {
        color: 'rgba(255, 255, 255, 0.9)',
        fontSize: 10,
        fontWeight: '700',
        marginTop: 4,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    // Button positions - Adjusted for 3 buttons with proper spacing
    buttonPosition1: {
        // Cities - Far left position
        top: 5,
        right: 130,
    },
    buttonPosition2: {
        // Radar - Middle diagonal position  
        top: 70,
        right: 70,
    },
    buttonPosition3: {
        // Focus - Bottom position
        top: 135,
        right: 5,
    },
});

export default RadialMenuProvider;
