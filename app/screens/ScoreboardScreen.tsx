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
import { GridOverlay } from '../../components/LuxuryVisuals';
import { Colors } from '../../constants/theme';
import { scaleFont } from '../../utils/layout';

const { width } = Dimensions.get('window');

export default function ScoreboardScreen() {
    const router = useRouter();
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <GridOverlay />
            <LinearGradient
                colors={['#5B2DAD', '#7C3AED']}
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
                        <View style={{ width: scaleFont(40) }} />
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
                            <Ionicons name="trophy" size={60} color="#5B2DAD" />
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
                                <Ionicons name="stats-chart" size={20} color="#5B2DAD" />
                                <Text style={styles.featureText}>Global Rankings</Text>
                            </View>
                            <View style={styles.featureItem}>
                                <Ionicons name="people" size={20} color="#5B2DAD" />
                                <Text style={styles.featureText}>Friend Competitions</Text>
                            </View>
                            <View style={styles.featureItem}>
                                <Ionicons name="ribbon" size={20} color="#5B2DAD" />
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
        paddingBottom: scaleFont(30),
        borderBottomLeftRadius: scaleFont(32),
        borderBottomRightRadius: scaleFont(32),
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: scaleFont(24),
        paddingTop: Platform.OS === 'android' ? scaleFont(48) : scaleFont(16),
    },
    backButton: {
        width: scaleFont(40),
        height: scaleFont(40),
        borderRadius: scaleFont(20),
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: scaleFont(18),
        fontWeight: '800',
        color: '#FFFFFF',
        letterSpacing: scaleFont(0.5),
        fontFamily: 'Outfit_800ExtraBold',
    },
    content: {
        flex: 1,
        paddingHorizontal: scaleFont(24),
        paddingTop: scaleFont(40),
        alignItems: 'center',
    },
    comingSoonCard: {
        width: '100%',
        borderRadius: scaleFont(32),
        overflow: 'hidden',
        elevation: scaleFont(10),
        shadowColor: '#5B2DAD',
        shadowOffset: { width: 0, height: scaleFont(10) },
        shadowOpacity: 0.1,
        shadowRadius: scaleFont(20),
    },
    cardGradient: {
        padding: scaleFont(32),
        alignItems: 'center',
    },
    iconContainer: {
        width: scaleFont(100),
        height: scaleFont(100),
        borderRadius: scaleFont(50),
        backgroundColor: '#EEF2FF',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: scaleFont(24),
    },
    comingSoonTitle: {
        fontSize: scaleFont(32),
        fontWeight: '900',
        color: '#1E293B',
        marginBottom: scaleFont(12),
        textAlign: 'center',
        fontFamily: 'Outfit_800ExtraBold',
    },
    badge: {
        backgroundColor: '#5B2DAD',
        paddingHorizontal: scaleFont(16),
        paddingVertical: scaleFont(6),
        borderRadius: scaleFont(20),
        marginBottom: scaleFont(24),
    },
    badgeText: {
        color: '#FFFFFF',
        fontSize: scaleFont(12),
        fontWeight: '800',
        letterSpacing: scaleFont(1),
        fontFamily: 'Outfit_800ExtraBold',
    },
    description: {
        fontSize: scaleFont(16),
        color: '#64748B',
        textAlign: 'center',
        lineHeight: scaleFont(24),
        marginBottom: scaleFont(32),
        fontFamily: 'Outfit_400Regular',
    },
    featureList: {
        width: '100%',
        gap: scaleFont(16),
    },
    featureItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F1F5F9',
        padding: scaleFont(16),
        borderRadius: scaleFont(16),
        gap: scaleFont(12),
    },
    featureText: {
        fontSize: scaleFont(15),
        fontWeight: '600',
        color: '#334155',
        fontFamily: 'Outfit_700Bold',
    },
    footer: {
        marginTop: 'auto',
        marginBottom: scaleFont(40),
    },
    footerText: {
        fontSize: scaleFont(14),
        color: '#94A3B8',
        fontStyle: 'italic',
        fontWeight: '500',
        fontFamily: 'Outfit_400Regular',
    },
});
