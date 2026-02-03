import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Tabs, useRouter } from 'expo-router';
import { Dimensions, TouchableOpacity, useColorScheme, View } from 'react-native';
import { Colors } from '../../constants/theme';

const { width } = Dimensions.get('window');

// Custom Background Component (Standard View to avoid native crashes)
// Custom Background Component
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
            backgroundColor: 'rgba(255, 255, 255, 0.95)', // Slightly more opaque for better legibility
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

export default function TabLayout() {
    const colorScheme = useColorScheme() ?? 'light';
    const router = useRouter();
    const theme = Colors[colorScheme];

    return (
        <Tabs
            screenOptions={{
                headerShown: false,
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
                },
                tabBarActiveTintColor: '#5B2DAD',
                tabBarInactiveTintColor: '#94A3B8',
                tabBarShowLabel: false,
                tabBarIconStyle: {
                    width: 48,
                    height: 48,
                    justifyContent: 'center',
                    alignItems: 'center',
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
                listeners={({ navigation }) => ({
                    tabPress: (e) => {
                        e.preventDefault();
                    },
                })}
                options={{
                    title: 'Create',
                    tabBarButton: (props) => {
                        const { delayLongPress, ...otherProps } = props as any;
                        return (
                            <TouchableOpacity
                                {...otherProps}
                                style={{
                                    top: -28,
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    zIndex: 10,
                                }}
                                onPress={() => router.push('/screens/CreatePromiseScreen')}
                                activeOpacity={0.8}
                            >
                                <View style={{
                                    width: 68,
                                    height: 68,
                                    borderRadius: 34,
                                    shadowColor: '#5B2DAD',
                                    shadowOffset: { width: 0, height: 12 },
                                    shadowOpacity: 0.4,
                                    shadowRadius: 18,
                                    elevation: 15,
                                }}>
                                    <LinearGradient
                                        colors={['#5B2DAD', '#7C3AED']}
                                        style={{
                                            flex: 1,
                                            borderRadius: 34,
                                            justifyContent: 'center',
                                            alignItems: 'center',
                                            borderWidth: 2,
                                            borderColor: 'rgba(255,255,255,0.3)',
                                        }}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 1 }}
                                    >
                                        <Ionicons name="add" size={36} color="#FFFFFF" />
                                    </LinearGradient>
                                </View>
                            </TouchableOpacity>
                        );
                    },
                }}
            />

            <Tabs.Screen
                name="ledger"
                options={{
                    title: 'Ledger',
                    tabBarIcon: ({ color, focused }) => (
                        <View style={{
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: 48,
                            height: 48,
                            borderRadius: 24,
                            backgroundColor: focused ? 'rgba(79, 70, 229, 0.1)' : 'transparent',
                        }}>
                            <Ionicons name={focused ? "wallet" : "wallet-outline"} size={26} color={color} />
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
                }}
            />
        </Tabs>
    );
}
