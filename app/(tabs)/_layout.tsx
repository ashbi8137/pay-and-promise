import { Ionicons } from '@expo/vector-icons';
import { Tabs, useRouter } from 'expo-router';
import { Dimensions, TouchableOpacity, useColorScheme, View } from 'react-native';
import { Colors } from '../../constants/theme';

const { width } = Dimensions.get('window');

// Custom Background Component (Standard View to avoid native crashes)
const TabBackground = () => {
    return (
        <View style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: '#FFFFFF',
            borderRadius: 24,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.1,
            shadowRadius: 10,
            elevation: 5,
        }} />
    );
};

export default function TabLayout() {
    const colorScheme = useColorScheme() ?? 'light';
    const router = useRouter(); // Access router
    const theme = Colors[colorScheme];

    return (
        <Tabs
            // Custom button handler for the 'create' tab
            screenOptions={{
                headerShown: false,
                tabBarStyle: {
                    position: 'absolute',
                    bottom: 24,
                    left: 16,
                    right: 16,
                    backgroundColor: 'transparent',
                    borderTopWidth: 0,
                    elevation: 0,
                    height: 70, // Hardcoded standard height
                    paddingBottom: 0,
                    alignItems: 'center',
                    justifyContent: 'center',
                },
                tabBarBackground: () => (
                    <TabBackground />
                ),
                tabBarItemStyle: {
                    height: 70,
                    justifyContent: 'center',
                    paddingVertical: 12,
                },
                tabBarActiveTintColor: theme.tint,
                tabBarInactiveTintColor: '#94A3B8',
                tabBarShowLabel: false,
            }}
        >
            {/* LEFT TAB 1: HOME */}
            <Tabs.Screen
                name="index"
                options={{
                    title: 'Home',
                    tabBarIcon: ({ size, color, focused }) => (
                        <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                            <Ionicons name={focused ? 'grid' : 'grid-outline'} size={24} color={color} />
                        </View>
                    ),
                }}
            />

            {/* LEFT TAB 2: ACTIVITY (Swapped) */}
            <Tabs.Screen
                name="activity"
                options={{
                    title: 'Activity',
                    tabBarIcon: ({ size, color, focused }) => (
                        <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                            <Ionicons name={focused ? 'analytics' : 'analytics-outline'} size={24} color={color} />
                        </View>
                    ),
                }}
            />

            {/* CENTER TAB: CREATE (CUSTOM BUTTON) */}
            <Tabs.Screen
                name="create"
                listeners={({ navigation }) => ({
                    tabPress: (e) => {
                        e.preventDefault();
                        // Navigate to modal or screen
                        // We can use a listener or just let the button handle it
                    },
                })}
                options={{
                    title: 'Create',
                    tabBarButton: (props) => {
                        // Fix TS error: delayLongPress can be null in props, but TouchableOpacity expects number | undefined
                        const { delayLongPress, ...otherProps } = props as any;
                        return (
                            <TouchableOpacity
                                {...otherProps}
                                style={{
                                    top: -30, // Positioned in the notch
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    zIndex: 10,
                                }}
                                onPress={() => router.push('/screens/CreatePromiseScreen')}
                            >
                                <View style={{
                                    width: 72, // Larger (was 64)
                                    height: 72, // Larger (was 64)
                                    borderRadius: 36,
                                    backgroundColor: theme.tint, // Primary Green
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    elevation: 10,
                                    shadowColor: theme.tint,
                                    shadowOffset: { width: 0, height: 6 },
                                    shadowOpacity: 0.35,
                                    shadowRadius: 10,
                                    // Removed border/cutout simulation; now it sits IN the curve
                                }}>
                                    <Ionicons name="add" size={38} color="#FFFFFF" />
                                </View>
                            </TouchableOpacity>
                        );
                    },
                }}
            />

            {/* RIGHT TAB 1: WALLET (Swapped) */}
            <Tabs.Screen
                name="wallet"
                options={{
                    title: 'Wallet',
                    tabBarIcon: ({ size, color, focused }) => (
                        <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                            <Ionicons name={focused ? 'wallet' : 'wallet-outline'} size={24} color={color} />
                        </View>
                    ),
                }}
            />

            {/* RIGHT TAB 2: PROFILE */}
            <Tabs.Screen
                name="profile"
                options={{
                    title: 'Profile',
                    tabBarIcon: ({ size, color, focused }) => (
                        <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                            <Ionicons name={focused ? 'person' : 'person-outline'} size={24} color={color} />
                        </View>
                    ),
                }}
            />
        </Tabs>
    );
}
