import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Pressable,
    ScrollView,
    Animated,
    Dimensions,
    Modal,
    FlatList,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
    X,
    Video,
    Bell,
    BellOff,
    Clock,
    Upload,
    Sparkles,
    Sun,
    Moon,
    CloudRain,
    Check,
    Send,
    MapPin,
} from 'lucide-react-native';

const { width, height } = Dimensions.get('window');

// Hours array for picker
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const ITEM_HEIGHT = 56;

const SettingsPage = ({
    visible,
    onClose,
    notificationPrefs = { enabled: true, hour: 8, minute: 0 },
    onNotificationChange,
    onTestNotification,
    cities = [],
    selectedCityIndex = 0,
    onCityChange,
}) => {
    // Background mode is always video
    const [notificationsEnabled, setNotificationsEnabled] = useState(notificationPrefs.enabled);
    const [notifyHour, setNotifyHour] = useState(notificationPrefs.hour);
    const [notifyMinute, setNotifyMinute] = useState(notificationPrefs.minute);

    // Popups
    const [showUploadPopup, setShowUploadPopup] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);

    // Temp values for picker
    const [tempHour, setTempHour] = useState(8);
    const [tempMinute, setTempMinute] = useState(0);

    // Refs for scroll
    const hourScrollRef = useRef(null);
    const minuteScrollRef = useRef(null);

    // Animation
    const slideAnim = useRef(new Animated.Value(height)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const popupScale = useRef(new Animated.Value(0)).current;
    const timePickerSlide = useRef(new Animated.Value(height)).current;

    useEffect(() => {
        if (visible) {
            Animated.parallel([
                Animated.spring(slideAnim, {
                    toValue: 0,
                    tension: 65,
                    friction: 11,
                    useNativeDriver: true,
                }),
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                }),
            ]).start();
        } else {
            Animated.parallel([
                Animated.timing(slideAnim, {
                    toValue: height,
                    duration: 250,
                    useNativeDriver: true,
                }),
                Animated.timing(fadeAnim, {
                    toValue: 0,
                    duration: 200,
                    useNativeDriver: true,
                }),
            ]).start();
        }
    }, [visible, slideAnim, fadeAnim]);

    // Upload Popup animation
    useEffect(() => {
        if (showUploadPopup) {
            Animated.spring(popupScale, {
                toValue: 1,
                tension: 100,
                friction: 8,
                useNativeDriver: true,
            }).start();
        } else {
            popupScale.setValue(0);
        }
    }, [showUploadPopup, popupScale]);

    // Time Picker animation
    useEffect(() => {
        if (showTimePicker) {
            setTempHour(notifyHour);
            setTempMinute(notifyMinute);
            Animated.spring(timePickerSlide, {
                toValue: 0,
                tension: 65,
                friction: 11,
                useNativeDriver: true,
            }).start();

            // Scroll to current values after mount
            setTimeout(() => {
                hourScrollRef.current?.scrollToIndex({ index: notifyHour, animated: false });
                minuteScrollRef.current?.scrollToIndex({ index: notifyMinute, animated: false });
            }, 100);
        } else {
            Animated.timing(timePickerSlide, {
                toValue: height,
                duration: 250,
                useNativeDriver: true,
            }).start();
        }
    }, [showTimePicker, timePickerSlide, notifyHour, notifyMinute]);

    if (!visible) return null;

    const toggleNotifications = () => {
        const newEnabled = !notificationsEnabled;
        setNotificationsEnabled(newEnabled);
        // Call backend update
        if (onNotificationChange) {
            onNotificationChange(newEnabled, notifyHour, notifyMinute);
        }
    };

    const handleUploadPress = () => {
        setShowUploadPopup(true);
    };

    const handleUploadSelect = (type) => {
        console.log('Upload', type);
        setShowUploadPopup(false);
    };

    const openTimePicker = () => {
        setShowTimePicker(true);
    };

    const confirmTime = () => {
        setNotifyHour(tempHour);
        setNotifyMinute(tempMinute);
        setShowTimePicker(false);
        // Call backend update
        if (onNotificationChange) {
            onNotificationChange(notificationsEnabled, tempHour, tempMinute);
        }
    };

    const formatTime = (hour, minute) => {
        const h = String(hour).padStart(2, '0');
        const m = String(minute).padStart(2, '0');
        const period = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
        return { time: `${String(displayHour).padStart(2, '0')}:${m}`, period };
    };

    const { time: displayTime, period: displayPeriod } = formatTime(notifyHour, notifyMinute);

    // Render hour item for FlatList wheel
    const renderHourItem = ({ item, index }) => {
        const isSelected = item === tempHour;
        return (
            <Pressable
                style={[styles.wheelItem, isSelected && styles.wheelItemSelected]}
                onPress={() => {
                    setTempHour(item);
                    hourScrollRef.current?.scrollToIndex({ index, animated: true });
                }}
            >
                <Text style={[
                    styles.wheelItemText,
                    isSelected && styles.wheelItemTextSelected
                ]}>
                    {String(item).padStart(2, '0')}
                </Text>
            </Pressable>
        );
    };

    // Render minute item
    const renderMinuteItem = ({ item, index }) => {
        const isSelected = item === tempMinute;
        return (
            <Pressable
                style={[styles.wheelItem, isSelected && styles.wheelItemSelected]}
                onPress={() => {
                    setTempMinute(item);
                    minuteScrollRef.current?.scrollToIndex({ index, animated: true });
                }}
            >
                <Text style={[
                    styles.wheelItemText,
                    isSelected && styles.wheelItemTextSelected
                ]}>
                    {String(item).padStart(2, '0')}
                </Text>
            </Pressable>
        );
    };

    // Minutes array (0, 5, 10, 15, ... 55)
    const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5);

    return (
        <View style={StyleSheet.absoluteFill} pointerEvents={visible ? 'auto' : 'none'}>
            {/* Backdrop */}
            <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]}>
                <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
            </Animated.View>

            {/* Settings Panel */}
            <Animated.View
                style={[
                    styles.container,
                    { transform: [{ translateY: slideAnim }] }
                ]}
            >
                <BlurView intensity={90} tint="dark" style={StyleSheet.absoluteFill} />
                <LinearGradient
                    colors={['rgba(20, 20, 35, 0.97)', 'rgba(10, 10, 20, 0.99)']}
                    style={StyleSheet.absoluteFill}
                />

                <SafeAreaView style={styles.content}>
                    {/* Drag Handle */}
                    <View style={styles.dragHandle} />

                    {/* Header */}
                    <View style={styles.header}>
                        <View style={styles.headerLeft}>
                            <Sparkles size={24} color="#A78BFA" />
                            <Text style={styles.headerTitle}>Settings</Text>
                        </View>
                        <Pressable onPress={onClose} style={styles.closeButton}>
                            <X size={22} color="rgba(255,255,255,0.8)" />
                        </Pressable>
                    </View>

                    <ScrollView
                        style={styles.scrollView}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{ paddingBottom: 40 }}
                    >
                        {/* BACKGROUND MODE SECTION */}
                        <View style={styles.section}>
                            <Text style={styles.sectionLabel}>BACKDROP</Text>
                            <Text style={styles.sectionDescription}>
                                Auto-adapts to time of day & weather conditions
                            </Text>

                            {/* Video Mode Display */}
                            <View style={styles.modeToggleContainer}>
                                <View style={[styles.modeOption, styles.modeOptionActive]}>
                                    <LinearGradient
                                        colors={['rgba(139, 92, 246, 0.3)', 'rgba(59, 130, 246, 0.2)']}
                                        style={styles.modeGradient}
                                    >
                                        <Video size={28} color="#A78BFA" />
                                        <Text style={[styles.modeLabel, styles.modeLabelActive]}>Videos</Text>
                                        <Text style={styles.modeSubLabel}>Dynamic motion</Text>
                                    </LinearGradient>
                                </View>
                            </View>

                            {/* Preview Icons */}
                            <View style={styles.previewRow}>
                                <View style={styles.previewItem}>
                                    <Sun size={16} color="#FBBF24" />
                                    <Text style={styles.previewText}>Day</Text>
                                </View>
                                <View style={styles.previewItem}>
                                    <Moon size={16} color="#818CF8" />
                                    <Text style={styles.previewText}>Night</Text>
                                </View>
                                <View style={styles.previewItem}>
                                    <CloudRain size={16} color="#60A5FA" />
                                    <Text style={styles.previewText}>Rain</Text>
                                </View>
                            </View>

                            {/* Upload Custom */}
                            <Pressable style={styles.uploadButton} onPress={handleUploadPress}>
                                <Upload size={20} color="rgba(255,255,255,0.6)" />
                                <Text style={styles.uploadText}>Upload Custom Background</Text>
                            </Pressable>
                        </View>

                        {/* NOTIFICATIONS SECTION */}
                        <View style={styles.section}>
                            <Text style={styles.sectionLabel}>NOTIFICATIONS</Text>

                            {/* Main Toggle */}
                            <Pressable
                                style={[
                                    styles.notificationCard,
                                    notificationsEnabled && styles.notificationCardActive
                                ]}
                                onPress={toggleNotifications}
                            >
                                <View style={styles.notificationIconContainer}>
                                    {notificationsEnabled ? (
                                        <Bell size={24} color="#F472B6" />
                                    ) : (
                                        <BellOff size={24} color="rgba(255,255,255,0.3)" />
                                    )}
                                </View>
                                <View style={styles.notificationTextContainer}>
                                    <Text style={styles.notificationTitle}>Daily Vibe Check</Text>
                                    <Text style={styles.notificationSubtitle}>
                                        {notificationsEnabled
                                            ? 'Get your morning weather mood'
                                            : 'Notifications are off'}
                                    </Text>
                                </View>

                                {/* Toggle Switch */}
                                <View style={[
                                    styles.toggle,
                                    notificationsEnabled && styles.toggleActive
                                ]}>
                                    <View style={[
                                        styles.toggleKnob,
                                        notificationsEnabled && styles.toggleKnobActive
                                    ]} />
                                </View>
                            </Pressable>

                            {/* Time Selector (only if enabled) */}
                            {notificationsEnabled && (
                                <Pressable style={styles.timeCard} onPress={openTimePicker}>
                                    <View style={styles.timeCardLeft}>
                                        <Clock size={22} color="#60A5FA" />
                                        <Text style={styles.timeLabel}>Remind me at</Text>
                                    </View>
                                    <View style={styles.timeDisplay}>
                                        <Text style={styles.timeDisplayValue}>{displayTime}</Text>
                                        <Text style={styles.timeDisplayPeriod}>{displayPeriod}</Text>
                                    </View>
                                </Pressable>
                            )}

                            {/* City Selector */}
                            {notificationsEnabled && cities.length > 0 && (
                                <View style={styles.cityPickerContainer}>
                                    <View style={styles.cityPickerHeader}>
                                        <MapPin size={18} color="#F472B6" />
                                        <Text style={styles.cityPickerLabel}>Notification City</Text>
                                    </View>
                                    <ScrollView
                                        horizontal
                                        showsHorizontalScrollIndicator={false}
                                        style={styles.cityChipsScroll}
                                        contentContainerStyle={styles.cityChipsContent}
                                    >
                                        {cities.map((city, index) => (
                                            <Pressable
                                                key={city.id || index}
                                                style={[
                                                    styles.cityChip,
                                                    selectedCityIndex === index && styles.cityChipActive
                                                ]}
                                                onPress={() => onCityChange && onCityChange(index)}
                                            >
                                                <Text style={[
                                                    styles.cityChipText,
                                                    selectedCityIndex === index && styles.cityChipTextActive
                                                ]}>
                                                    {city.name}
                                                </Text>
                                            </Pressable>
                                        ))}
                                    </ScrollView>
                                </View>
                            )}

                            {/* Test Notification Button */}
                            {notificationsEnabled && onTestNotification && (
                                <Pressable
                                    style={styles.testButton}
                                    onPress={onTestNotification}
                                >
                                    <Send size={18} color="#10B981" />
                                    <Text style={styles.testButtonText}>Send Test Notification</Text>
                                </Pressable>
                            )}
                        </View>

                        {/* App Info */}
                        <View style={styles.footer}>
                            <Text style={styles.footerText}>Weather Vibes</Text>
                            <Text style={styles.footerVersion}>v1.0.0</Text>
                        </View>
                    </ScrollView>
                </SafeAreaView>
            </Animated.View>

            {/* UPLOAD TYPE POPUP */}
            <Modal
                visible={showUploadPopup}
                transparent
                animationType="none"
                onRequestClose={() => setShowUploadPopup(false)}
            >
                <Pressable
                    style={styles.popupOverlay}
                    onPress={() => setShowUploadPopup(false)}
                >
                    <Animated.View
                        style={[
                            styles.popupContainer,
                            { transform: [{ scale: popupScale }] }
                        ]}
                    >
                        <BlurView intensity={100} tint="dark" style={StyleSheet.absoluteFill} />
                        <LinearGradient
                            colors={['rgba(30, 30, 50, 0.98)', 'rgba(15, 15, 30, 0.99)']}
                            style={StyleSheet.absoluteFill}
                        />

                        <Text style={styles.popupTitle}>Upload Background</Text>
                        <Text style={styles.popupSubtitle}>Choose the type of file</Text>

                        <View style={styles.popupOptions}>
                            <Pressable
                                style={styles.popupOption}
                                onPress={() => handleUploadSelect('video')}
                            >
                                <LinearGradient
                                    colors={['rgba(139, 92, 246, 0.25)', 'rgba(59, 130, 246, 0.15)']}
                                    style={styles.popupOptionGradient}
                                >
                                    <Video size={32} color="#A78BFA" />
                                    <Text style={styles.popupOptionText}>Video</Text>
                                </LinearGradient>
                            </Pressable>
                        </View>

                        <Pressable
                            style={styles.popupCancel}
                            onPress={() => setShowUploadPopup(false)}
                        >
                            <Text style={styles.popupCancelText}>Cancel</Text>
                        </Pressable>
                    </Animated.View>
                </Pressable>
            </Modal>

            {/* TIME PICKER MODAL */}
            <Modal
                visible={showTimePicker}
                transparent
                animationType="none"
                onRequestClose={() => setShowTimePicker(false)}
            >
                <View style={styles.timePickerOverlay}>
                    <Pressable
                        style={StyleSheet.absoluteFill}
                        onPress={() => setShowTimePicker(false)}
                    />

                    <Animated.View
                        style={[
                            styles.timePickerContainer,
                            { transform: [{ translateY: timePickerSlide }] }
                        ]}
                    >
                        <BlurView intensity={100} tint="dark" style={StyleSheet.absoluteFill} />
                        <LinearGradient
                            colors={['rgba(25, 25, 45, 0.98)', 'rgba(15, 15, 30, 0.99)']}
                            style={StyleSheet.absoluteFill}
                        />

                        {/* Handle */}
                        <View style={styles.timePickerHandle} />

                        {/* Header */}
                        <View style={styles.timePickerHeader}>
                            <Pressable onPress={() => setShowTimePicker(false)}>
                                <Text style={styles.timePickerCancel}>Cancel</Text>
                            </Pressable>
                            <Text style={styles.timePickerTitle}>Set Time</Text>
                            <Pressable onPress={confirmTime}>
                                <View style={styles.timePickerConfirmBtn}>
                                    <Check size={20} color="white" />
                                </View>
                            </Pressable>
                        </View>

                        {/* Preview */}
                        <View style={styles.timePreview}>
                            <Text style={styles.timePreviewText}>
                                {String(tempHour === 0 ? 12 : tempHour > 12 ? tempHour - 12 : tempHour).padStart(2, '0')}
                                :
                                {String(tempMinute).padStart(2, '0')}
                            </Text>
                            <Text style={styles.timePreviewPeriod}>
                                {tempHour >= 12 ? 'PM' : 'AM'}
                            </Text>
                        </View>

                        {/* Wheel Pickers */}
                        <View style={styles.wheelContainer}>
                            {/* Hour Picker */}
                            <View style={styles.wheelColumn}>
                                <Text style={styles.wheelLabel}>HOUR</Text>
                                <View style={styles.wheelWrapper}>
                                    <View style={styles.wheelHighlight} />
                                    <FlatList
                                        ref={hourScrollRef}
                                        data={HOURS}
                                        renderItem={renderHourItem}
                                        keyExtractor={(item) => `hour-${item}`}
                                        showsVerticalScrollIndicator={false}
                                        snapToInterval={ITEM_HEIGHT}
                                        decelerationRate="fast"
                                        getItemLayout={(_, index) => ({
                                            length: ITEM_HEIGHT,
                                            offset: ITEM_HEIGHT * index,
                                            index,
                                        })}
                                        onMomentumScrollEnd={(e) => {
                                            const index = Math.round(e.nativeEvent.contentOffset.y / ITEM_HEIGHT);
                                            setTempHour(HOURS[Math.max(0, Math.min(index, HOURS.length - 1))]);
                                        }}
                                        contentContainerStyle={{ paddingVertical: ITEM_HEIGHT }}
                                    />
                                </View>
                            </View>

                            {/* Separator */}
                            <Text style={styles.wheelSeparator}>:</Text>

                            {/* Minute Picker */}
                            <View style={styles.wheelColumn}>
                                <Text style={styles.wheelLabel}>MIN</Text>
                                <View style={styles.wheelWrapper}>
                                    <View style={styles.wheelHighlight} />
                                    <FlatList
                                        ref={minuteScrollRef}
                                        data={MINUTES}
                                        renderItem={renderMinuteItem}
                                        keyExtractor={(item) => `min-${item}`}
                                        showsVerticalScrollIndicator={false}
                                        snapToInterval={ITEM_HEIGHT}
                                        decelerationRate="fast"
                                        getItemLayout={(_, index) => ({
                                            length: ITEM_HEIGHT,
                                            offset: ITEM_HEIGHT * index,
                                            index,
                                        })}
                                        onMomentumScrollEnd={(e) => {
                                            const index = Math.round(e.nativeEvent.contentOffset.y / ITEM_HEIGHT);
                                            setTempMinute(MINUTES[Math.max(0, Math.min(index, MINUTES.length - 1))]);
                                        }}
                                        contentContainerStyle={{ paddingVertical: ITEM_HEIGHT }}
                                    />
                                </View>
                            </View>
                        </View>

                        {/* Quick Select */}
                        <View style={styles.quickSelect}>
                            {[6, 8, 9, 12, 18].map((h) => (
                                <Pressable
                                    key={h}
                                    style={[
                                        styles.quickBtn,
                                        tempHour === h && styles.quickBtnActive
                                    ]}
                                    onPress={() => {
                                        setTempHour(h);
                                        setTempMinute(0);
                                        hourScrollRef.current?.scrollToIndex({ index: h, animated: true });
                                        minuteScrollRef.current?.scrollToIndex({ index: 0, animated: true });
                                    }}
                                >
                                    <Text style={[
                                        styles.quickBtnText,
                                        tempHour === h && styles.quickBtnTextActive
                                    ]}>
                                        {h === 0 ? '12' : h > 12 ? h - 12 : h}{h >= 12 ? 'pm' : 'am'}
                                    </Text>
                                </Pressable>
                            ))}
                        </View>
                    </Animated.View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
    },
    container: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: height * 0.82,
        borderTopLeftRadius: 36,
        borderTopRightRadius: 36,
        overflow: 'hidden',
    },
    content: {
        flex: 1,
    },
    dragHandle: {
        width: 44,
        height: 5,
        borderRadius: 3,
        backgroundColor: 'rgba(255, 255, 255, 0.25)',
        alignSelf: 'center',
        marginTop: 12,
        marginBottom: 8,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingVertical: 16,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    headerTitle: {
        fontSize: 26,
        fontWeight: '700',
        color: 'white',
        letterSpacing: -0.5,
    },
    closeButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    scrollView: {
        flex: 1,
        paddingHorizontal: 24,
    },
    section: {
        marginBottom: 32,
    },
    sectionLabel: {
        fontSize: 12,
        fontWeight: '700',
        color: 'rgba(255, 255, 255, 0.4)',
        letterSpacing: 2,
        marginBottom: 8,
    },
    sectionDescription: {
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.6)',
        marginBottom: 20,
        lineHeight: 20,
    },
    modeToggleContainer: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 20,
    },
    modeOption: {
        flex: 1,
        borderRadius: 20,
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        overflow: 'hidden',
    },
    modeOptionActive: {
        borderColor: 'rgba(167, 139, 250, 0.5)',
    },
    modeGradient: {
        paddingVertical: 24,
        paddingHorizontal: 16,
        alignItems: 'center',
        gap: 10,
    },
    modeLabel: {
        fontSize: 17,
        fontWeight: '600',
        color: 'rgba(255, 255, 255, 0.5)',
    },
    modeLabelActive: {
        color: '#A78BFA',
    },
    modeLabelActiveImage: {
        color: '#F472B6',
    },
    modeSubLabel: {
        fontSize: 12,
        color: 'rgba(255, 255, 255, 0.35)',
    },
    previewRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 24,
        marginBottom: 20,
        paddingVertical: 12,
        backgroundColor: 'rgba(255, 255, 255, 0.04)',
        borderRadius: 16,
    },
    previewItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    previewText: {
        fontSize: 13,
        color: 'rgba(255, 255, 255, 0.5)',
    },
    uploadButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        paddingVertical: 16,
        borderRadius: 16,
        borderWidth: 1.5,
        borderColor: 'rgba(255, 255, 255, 0.15)',
        borderStyle: 'dashed',
    },
    uploadText: {
        fontSize: 15,
        fontWeight: '500',
        color: 'rgba(255, 255, 255, 0.6)',
    },
    notificationCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 20,
        padding: 18,
        marginBottom: 12,
        borderWidth: 1.5,
        borderColor: 'transparent',
    },
    notificationCardActive: {
        borderColor: 'rgba(244, 114, 182, 0.3)',
        backgroundColor: 'rgba(244, 114, 182, 0.08)',
    },
    notificationIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'rgba(255, 255, 255, 0.06)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 14,
    },
    notificationTextContainer: {
        flex: 1,
        gap: 4,
    },
    notificationTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: 'white',
    },
    notificationSubtitle: {
        fontSize: 13,
        color: 'rgba(255, 255, 255, 0.5)',
    },
    toggle: {
        width: 56,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        padding: 4,
        justifyContent: 'center',
    },
    toggleActive: {
        backgroundColor: '#F472B6',
    },
    toggleKnob: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: 'white',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
    },
    toggleKnobActive: {
        alignSelf: 'flex-end',
    },
    timeCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'rgba(96, 165, 250, 0.1)',
        borderRadius: 20,
        paddingVertical: 16,
        paddingHorizontal: 20,
        borderWidth: 1.5,
        borderColor: 'rgba(96, 165, 250, 0.25)',
    },
    timeCardLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    timeLabel: {
        fontSize: 16,
        color: 'rgba(255, 255, 255, 0.8)',
        fontWeight: '500',
    },
    timeDisplay: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 6,
    },
    timeDisplayValue: {
        fontSize: 28,
        fontWeight: '700',
        color: '#60A5FA',
    },
    timeDisplayPeriod: {
        fontSize: 14,
        fontWeight: '600',
        color: 'rgba(96, 165, 250, 0.7)',
    },
    footer: {
        alignItems: 'center',
        paddingVertical: 20,
        opacity: 0.4,
    },
    footerText: {
        fontSize: 14,
        fontWeight: '600',
        color: 'white',
    },
    footerVersion: {
        fontSize: 12,
        color: 'rgba(255, 255, 255, 0.5)',
        marginTop: 4,
    },
    // Upload Popup styles
    popupOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    popupContainer: {
        width: width * 0.85,
        borderRadius: 28,
        padding: 28,
        alignItems: 'center',
        overflow: 'hidden',
    },
    popupTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: 'white',
        marginBottom: 8,
    },
    popupSubtitle: {
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.5)',
        marginBottom: 28,
    },
    popupOptions: {
        flexDirection: 'row',
        gap: 16,
        marginBottom: 24,
    },
    popupOption: {
        flex: 1,
        borderRadius: 20,
        overflow: 'hidden',
        borderWidth: 1.5,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    popupOptionGradient: {
        paddingVertical: 28,
        alignItems: 'center',
        gap: 12,
    },
    popupOptionText: {
        fontSize: 16,
        fontWeight: '600',
        color: 'rgba(255, 255, 255, 0.9)',
    },
    popupCancel: {
        paddingVertical: 14,
        paddingHorizontal: 32,
    },
    popupCancelText: {
        fontSize: 15,
        fontWeight: '500',
        color: 'rgba(255, 255, 255, 0.5)',
    },
    // Time Picker styles
    timePickerOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        justifyContent: 'flex-end',
    },
    timePickerContainer: {
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        paddingBottom: 40,
        overflow: 'hidden',
    },
    timePickerHandle: {
        width: 44,
        height: 5,
        borderRadius: 3,
        backgroundColor: 'rgba(255, 255, 255, 0.25)',
        alignSelf: 'center',
        marginTop: 12,
        marginBottom: 8,
    },
    timePickerHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingVertical: 16,
    },
    timePickerCancel: {
        fontSize: 16,
        color: 'rgba(255, 255, 255, 0.6)',
    },
    timePickerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: 'white',
    },
    timePickerConfirmBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#60A5FA',
        alignItems: 'center',
        justifyContent: 'center',
    },
    timePreview: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'baseline',
        gap: 8,
        paddingVertical: 16,
    },
    timePreviewText: {
        fontSize: 56,
        fontWeight: '200',
        color: 'white',
        letterSpacing: -2,
    },
    timePreviewPeriod: {
        fontSize: 24,
        fontWeight: '600',
        color: 'rgba(255, 255, 255, 0.5)',
    },
    wheelContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
        height: ITEM_HEIGHT * 3,
    },
    wheelColumn: {
        alignItems: 'center',
        width: 80,
    },
    wheelLabel: {
        fontSize: 11,
        fontWeight: '700',
        color: 'rgba(255, 255, 255, 0.3)',
        letterSpacing: 2,
        marginBottom: 8,
    },
    wheelWrapper: {
        height: ITEM_HEIGHT * 3,
        overflow: 'hidden',
    },
    wheelHighlight: {
        position: 'absolute',
        top: ITEM_HEIGHT,
        left: 0,
        right: 0,
        height: ITEM_HEIGHT,
        backgroundColor: 'rgba(96, 165, 250, 0.15)',
        borderRadius: 12,
        zIndex: -1,
    },
    wheelItem: {
        height: ITEM_HEIGHT,
        justifyContent: 'center',
        alignItems: 'center',
    },
    wheelItemSelected: {},
    wheelItemText: {
        fontSize: 24,
        fontWeight: '400',
        color: 'rgba(255, 255, 255, 0.35)',
    },
    wheelItemTextSelected: {
        fontSize: 28,
        fontWeight: '600',
        color: '#60A5FA',
    },
    wheelSeparator: {
        fontSize: 32,
        fontWeight: '300',
        color: 'rgba(255, 255, 255, 0.4)',
        marginHorizontal: 16,
        marginTop: 24,
    },
    quickSelect: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 10,
        paddingHorizontal: 24,
        paddingTop: 24,
    },
    quickBtn: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
    },
    quickBtnActive: {
        backgroundColor: 'rgba(96, 165, 250, 0.25)',
    },
    quickBtnText: {
        fontSize: 14,
        fontWeight: '600',
        color: 'rgba(255, 255, 255, 0.5)',
    },
    quickBtnTextActive: {
        color: '#60A5FA',
    },
    testButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        marginTop: 12,
        paddingVertical: 14,
        paddingHorizontal: 20,
        borderRadius: 16,
        backgroundColor: 'rgba(16, 185, 129, 0.15)',
        borderWidth: 1.5,
        borderColor: 'rgba(16, 185, 129, 0.3)',
    },
    testButtonText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#10B981',
    },
    cityPickerContainer: {
        marginTop: 16,
    },
    cityPickerHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 10,
    },
    cityPickerLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: 'rgba(255, 255, 255, 0.7)',
    },
    cityChipsScroll: {
        marginHorizontal: -4,
    },
    cityChipsContent: {
        paddingHorizontal: 4,
        gap: 8,
    },
    cityChip: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        borderWidth: 1.5,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    cityChipActive: {
        backgroundColor: 'rgba(244, 114, 182, 0.2)',
        borderColor: 'rgba(244, 114, 182, 0.5)',
    },
    cityChipText: {
        fontSize: 14,
        fontWeight: '500',
        color: 'rgba(255, 255, 255, 0.6)',
    },
    cityChipTextActive: {
        color: '#F472B6',
        fontWeight: '600',
    },
});

export default SettingsPage;
