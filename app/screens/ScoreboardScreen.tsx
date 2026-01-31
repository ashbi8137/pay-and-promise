import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import {
    Dimensions,
    Platform,
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    useColorScheme
} from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { Colors } from '../../constants/theme';

const { width } = Dimensions.get('window');

export default function ScoreboardScreen() {
    const router = useRouter();
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <LinearGradient
                colors={['#4F46E5', '#7C3AED']}
                style={styles.headerGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            >
                <SafeAreaView>
                    <View style={styles.headerContent}>
                        <TouchableOpacity
                            onPress={() => router.back()}
                            style={styles.backButton}
                        >
                            <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>Scoreboard</Text>
                        <View style={{ width: 40 }} />
                    </View>
                </SafeAreaView>
            </LinearGradient>

            <View style={styles.content}>
                <Animated.View
                    entering={FadeInDown.delay(200).springify()}
                    style={styles.comingSoonCard}
                >
                    <LinearGradient
                        colors={['#FFFFFF', '#F8FAFC']}
                        style={styles.cardGradient}
                    >
                        <View style={styles.iconContainer}>
                            <Ionicons name="trophy" size={60} color="#4F46E5" />
                        </View>

                        <Text style={styles.comingSoonTitle}>Coming Soon</Text>

                        <View style={styles.badge}>
                            <Text style={styles.badgeText}>PHASE 12</Text>
                        </View>

                        <Text style={styles.description}>
                            We're building a world-class ranking system to track the most honorable members of the community.
                        </Text>

                        <View style={styles.featureList}>
                            <View style={styles.featureItem}>
                                <Ionicons name="stats-chart" size={20} color="#4F46E5" />
                                <Text style={styles.featureText}>Global Rankings</Text>
                            </View>
                            <View style={styles.featureItem}>
                                <Ionicons name="people" size={20} color="#4F46E5" />
                                <Text style={styles.featureText}>Friend Competitions</Text>
                            </View>
                            <View style={styles.featureItem}>
                                <Ionicons name="ribbon" size={20} color="#4F46E5" />
                                <Text style={styles.featureText}>Integrity Badges</Text>
                            </View>
                        </View>
                    </LinearGradient>
                </Animated.View>

                <Animated.View
                    entering={FadeInUp.delay(400).duration(800)}
                    style={styles.footer}
                >
                    <Text style={styles.footerText}>Stay honorable. Your time is coming.</Text>
                </Animated.View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    headerGradient: {
        paddingBottom: 30,
        borderBottomLeftRadius: 32,
        borderBottomRightRadius: 32,
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: Platform.OS === 'android' ? 40 : 10,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: '#FFFFFF',
        letterSpacing: 0.5,
    },
    content: {
        flex: 1,
        paddingHorizontal: 24,
        paddingTop: 40,
        alignItems: 'center',
    },
    comingSoonCard: {
        width: '100%',
        borderRadius: 32,
        overflow: 'hidden',
        elevation: 10,
        shadowColor: '#4F46E5',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
    },
    cardGradient: {
        padding: 32,
        alignItems: 'center',
    },
    iconContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#EEF2FF',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
    },
    comingSoonTitle: {
        fontSize: 32,
        fontWeight: '900',
        color: '#1E293B',
        marginBottom: 12,
        textAlign: 'center',
    },
    badge: {
        backgroundColor: '#4F46E5',
        paddingHorizontal: 16,
        paddingVertical: 6,
        borderRadius: 20,
        marginBottom: 24,
    },
    badgeText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '800',
        letterSpacing: 1,
    },
    description: {
        fontSize: 16,
        color: '#64748B',
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 32,
    },
    featureList: {
        width: '100%',
        gap: 16,
    },
    featureItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F1F5F9',
        padding: 16,
        borderRadius: 16,
        gap: 12,
    },
    featureText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#334155',
    },
    footer: {
        marginTop: 'auto',
        marginBottom: 40,
    },
    footerText: {
        fontSize: 14,
        color: '#94A3B8',
        fontStyle: 'italic',
        fontWeight: '500',
    },
});
