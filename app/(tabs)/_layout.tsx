import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Tabs, useRouter, useSegments } from 'expo-router';
import { useRef } from 'react';
import { Dimensions, TouchableOpacity, useColorScheme, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { Colors } from '../../constants/theme';
import { useAlert } from '../../context/AlertContext';
import { supabase } from '../../lib/supabase';

const { width } = Dimensions.get('window');

// Custom Background Component
const TabBackground = ({ colorScheme }: { colorScheme: 'light' | 'dark' }) => {
    const theme = Colors[colorScheme];
    return (
        <View style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 72,
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            borderRadius: 36,
            borderWidth: 1,
            borderColor: 'rgba(255, 255, 255, 0.5)',
            shadowColor: '#5B2DAD',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.1,
            shadowRadius: 15,
            elevation: 10,
        }} />
    );
};

const TabBarFab = ({ onPress }: { onPress: () => void }) => {
    const scale = useSharedValue(1);

    const animatedStyle = useAnimatedStyle(() => {
        return {
            transform: [{ scale: scale.value }],
        };
    });

    const handlePressIn = () => {
        scale.value = withSpring(0.9, { damping: 10, stiffness: 300 });
    };

    const handlePressOut = () => {
        scale.value = withSpring(1, { damping: 10, stiffness: 300 });
    };

    return (
        <TouchableOpacity
            activeOpacity={1}
            onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onPress();
            }}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            style={{
                top: -30, // Adjusted for larger size
                justifyContent: 'center',
                alignItems: 'center',
            }}
        >
            <Animated.View style={[
                animatedStyle,
                {
                    width: 74,
                    height: 74,
                    borderRadius: 37,
                    shadowColor: '#5B2DAD',
                    shadowOffset: { width: 0, height: 10 },
                    shadowOpacity: 0.5,
                    shadowRadius: 20,
                    elevation: 20,
                }
            ]}>
                <LinearGradient
                    colors={['#5B2DAD', '#7C3AED']}
                    style={{
                        flex: 1,
                        borderRadius: 37,
                        justifyContent: 'center',
                        alignItems: 'center',
                        borderWidth: 2,
                        borderColor: 'rgba(255,255,255,0.4)', // Slightly stronger border
                    }}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                >
                    <Ionicons name="add" size={38} color="#FFFFFF" />
                </LinearGradient>
            </Animated.View>
        </TouchableOpacity>
    );
};

export default function TabLayout() {
    const colorScheme = useColorScheme() ?? 'light';
    const router = useRouter();
    const { showAlert } = useAlert();
    const segments = useSegments();
    const lastProfileTap = useRef(0);
    const lastSegment = segments[segments.length - 1];
    const currentTab = !lastSegment || lastSegment === '(tabs)' ? 'index' : lastSegment;

    const tabOrder = ['index', 'activity', 'create', 'ledger', 'profile'];

    const swipeGesture = Gesture.Pan()
        .activeOffsetX([-20, 20]) // Only trigger after some horizontal movement
        .failOffsetY([-20, 20])   // Fail if moving vertically (prevents scroll conflict)
        .onEnd((e) => {
            const VELOCITY_THRESHOLD = 500;
            const currentIndex = tabOrder.indexOf(currentTab);

            if (currentIndex === -1) return;

            if (e.velocityX < -VELOCITY_THRESHOLD && currentIndex < tabOrder.length - 1) {
                // Swipe Left -> Next Tab
                const nextTab = tabOrder[currentIndex + 1];
                const path = nextTab === 'index' ? '/(tabs)/' : `/(tabs)/${nextTab}`;
                runOnJS(router.replace)(path as any);
            } else if (e.velocityX > VELOCITY_THRESHOLD && currentIndex > 0) {
                // Swipe Right -> Previous Tab
                const prevTab = tabOrder[currentIndex - 1];
                const path = prevTab === 'index' ? '/(tabs)/' : `/(tabs)/${prevTab}`;
                runOnJS(router.replace)(path as any);
            }
        });

    return (
        <GestureDetector gesture={swipeGesture}>
            <View style={{ flex: 1 }}>
                <Tabs
                    screenOptions={{
                        headerShown: false,
                        tabBarShowLabel: false,
                        tabBarActiveTintColor: '#5B2DAD',
                        tabBarInactiveTintColor: '#B0B8C8',
                        animation: 'shift',
                        tabBarStyle: {
                            position: 'absolute',
                            bottom: 24,
                            left: 20,
                            right: 20,
                            backgroundColor: 'transparent',
                            borderTopWidth: 0,
                            elevation: 0,
                            height: 72,
                            paddingTop: 0,
                            paddingBottom: 0,
                        },
                        tabBarBackground: () => <TabBackground colorScheme={colorScheme} />,
                        tabBarItemStyle: {
                            flex: 1,
                            justifyContent: 'center',
                            alignItems: 'center',
                            height: 72,
                            paddingTop: 6.5,
                        },
                        tabBarIconStyle: {
                            width: 48,
                            height: 48,
                            justifyContent: 'center',
                            alignItems: 'center',
                            margin: 0,
                        },
                    }}
                >
                    <Tabs.Screen
                        name="index"
                        options={{
                            title: 'Home',
                            tabBarIcon: ({ color, focused }) => (
                                <View style={{
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    width: 48,
                                    height: 48,
                                    borderRadius: 24,
                                    backgroundColor: focused ? 'rgba(79, 70, 229, 0.1)' : 'transparent', // Pill background
                                }}>
                                    <Ionicons
                                        name={focused ? "home-sharp" : "home-outline"}
                                        size={26}
                                        color={color}
                                    />
                                </View>
                            ),
                        }}
                    />

                    <Tabs.Screen
                        name="activity"
                        options={{
                            title: 'Activity',
                            tabBarIcon: ({ color, focused }) => (
                                <View style={{
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    width: 48,
                                    height: 48,
                                    borderRadius: 24,
                                    backgroundColor: focused ? 'rgba(79, 70, 229, 0.1)' : 'transparent',
                                }}>
                                    <Ionicons name={focused ? "stats-chart" : "stats-chart-outline"} size={26} color={color} />
                                </View>
                            ),
                        }}
                    />

                    <Tabs.Screen
                        name="create"
                        options={{
                            title: 'Create',
                            tabBarButton: (props) => (
                                <TabBarFab onPress={() => router.push('/(tabs)/create')} />
                            ),
                        }}
                    />

                    <Tabs.Screen
                        name="ledger"
                        options={{
                            title: 'Activity',
                            tabBarIcon: ({ color, focused }) => (
                                <View style={{
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    width: 48,
                                    height: 48,
                                    borderRadius: 24,
                                    backgroundColor: focused ? 'rgba(79, 70, 229, 0.1)' : 'transparent',
                                }}>
                                    <Ionicons name={focused ? "time" : "time-outline"} size={26} color={color} />
                                </View>
                            ),
                        }}
                    />

                    <Tabs.Screen
                        name="profile"
                        options={{
                            title: 'Profile',
                            tabBarIcon: ({ color, focused }) => (
                                <View style={{
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    width: 48,
                                    height: 48,
                                    borderRadius: 24,
                                    backgroundColor: focused ? 'rgba(79, 70, 229, 0.1)' : 'transparent',
                                }}>
                                    <Ionicons name={focused ? "person" : "person-outline"} size={26} color={color} />
                                </View>
                            ),
                            tabBarButton: (props) => {
                                const { delayLongPress, ...otherProps } = props as any;
                                return (
                                    <TouchableOpacity
                                        {...otherProps}
                                        activeOpacity={0.7}
                                        onPress={async (e) => {
                                            const now = Date.now();
                                            const DOUBLE_TAP_DELAY = 400;

                                            if (now - lastProfileTap.current < DOUBLE_TAP_DELAY) {
                                                // Double Tap -> Quick Logout
                                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                                showAlert({
                                                    title: 'Quick Sign Out',
                                                    message: 'Are you sure you want to exit your session?',
                                                    type: 'warning',
                                                    buttons: [
                                                        { text: 'Cancel', style: 'cancel' },
                                                        {
                                                            text: 'Sign Out',
                                                            style: 'destructive',
                                                            onPress: async () => {
                                                                const { error } = await supabase.auth.signOut();
                                                                if (!error) {
                                                                    router.replace('/screens/AuthScreen');
                                                                }
                                                            }
                                                        }
                                                    ]
                                                });
                                            } else {
                                                // Single Tap -> Normal Navigation
                                                if (otherProps.onPress) otherProps.onPress(e);
                                            }
                                            lastProfileTap.current = now;
                                        }}
                                    />
                                );
                            }
                        }}
                    />
                </Tabs>
            </View>
        </GestureDetector>
    );
}
