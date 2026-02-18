import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    Image,
    Platform,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    useColorScheme,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GridOverlay } from '../../components/LuxuryVisuals';
import { supabase } from '../../lib/supabase';
import { scaleFont } from '../../utils/layout';

const { width } = Dimensions.get('window');

interface LeaderboardUser {
    user_id: string;
    full_name: string;
    avatar_url: string | null;
    lifetime_points: number;
    level: number;
    current_streak: number;
    completed_promises_count: number;
}

const RANK_COLORS = ['#FFD700', '#C0C0C0', '#CD7F32']; // Gold, Silver, Bronze
const RANK_ICONS: ('trophy' | 'medal' | 'ribbon')[] = ['trophy', 'medal', 'ribbon'];

export default function ScoreboardScreen() {
    const router = useRouter();
    const colorScheme = useColorScheme() ?? 'light';
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [myRank, setMyRank] = useState<number | null>(null);

    useFocusEffect(
        useCallback(() => {
            fetchLeaderboard();
        }, [])
    );

    const fetchLeaderboard = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) setCurrentUserId(user.id);

            // Try the RPC first
            const { data, error } = await supabase.rpc('get_leaderboard', { p_limit: 50 });

            if (error) {
                console.error('Leaderboard RPC error:', error);
                // Fallback: direct query
                const { data: fallback } = await supabase
                    .from('profiles')
                    .select('id, full_name, avatar_url, lifetime_points, level, current_streak, completed_promises_count')
                    .gt('lifetime_points', 0)
                    .order('lifetime_points', { ascending: false })
                    .limit(50);

                if (fallback) {
                    const mapped = fallback.map(p => ({
                        user_id: p.id,
                        full_name: p.full_name || 'Anonymous',
                        avatar_url: p.avatar_url,
                        lifetime_points: p.lifetime_points || 0,
                        level: p.level || 1,
                        current_streak: p.current_streak || 0,
                        completed_promises_count: p.completed_promises_count || 0,
                    }));
                    setLeaderboard(mapped);
                    if (user) {
                        const idx = mapped.findIndex(u => u.user_id === user.id);
                        setMyRank(idx >= 0 ? idx + 1 : null);
                    }
                }
            } else if (data) {
                setLeaderboard(data);
                if (user) {
                    const idx = data.findIndex((u: LeaderboardUser) => u.user_id === user.id);
                    setMyRank(idx >= 0 ? idx + 1 : null);
                }
            }
        } catch (e) {
            console.error('Error loading leaderboard:', e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchLeaderboard();
    }, []);

    const getLevelTitle = (level: number) => {
        if (level >= 10) return 'Legend';
        if (level >= 5) return 'Pro';
        if (level >= 3) return 'Committed';
        if (level >= 2) return 'Rising';
        return 'Newcomer';
    };

    const renderPodium = () => {
        if (leaderboard.length < 1) return null;
        const top3 = leaderboard.slice(0, 3);
        // Reorder for podium display: [2nd, 1st, 3rd]
        const podiumOrder = top3.length >= 3 ? [top3[1], top3[0], top3[2]] : top3;
        const heights = [scaleFont(90), scaleFont(120), scaleFont(70)];

        return (
            <View style={styles.podiumContainer}>
                {podiumOrder.map((user, idx) => {
                    const actualRank = top3.length >= 3 ? [2, 1, 3][idx] : idx + 1;
                    const isMe = user.user_id === currentUserId;
                    return (
                        <Animated.View
                            key={user.user_id}
                            entering={FadeInDown.delay(idx * 150).springify()}
                            style={[styles.podiumItem, { height: heights[idx] || scaleFont(70) }]}
                        >
                            <View style={[
                                styles.podiumAvatar,
                                { borderColor: RANK_COLORS[actualRank - 1] || '#CBD5E1' },
                                isMe && styles.podiumAvatarMe,
                            ]}>
                                {user.avatar_url ? (
                                    <Image source={{ uri: user.avatar_url }} style={styles.avatarImg} />
                                ) : (
                                    <Text style={styles.avatarInitial}>
                                        {(user.full_name || 'U').charAt(0).toUpperCase()}
                                    </Text>
                                )}
                                <View style={[styles.rankBadge, { backgroundColor: RANK_COLORS[actualRank - 1] || '#64748B' }]}>
                                    <Text style={styles.rankBadgeText}>{actualRank}</Text>
                                </View>
                            </View>
                            <Text style={styles.podiumName} numberOfLines={1}>
                                {isMe ? 'You' : (user.full_name?.split(' ')[0] || 'User')}
                            </Text>
                            <Text style={styles.podiumPoints}>{user.lifetime_points} PP</Text>
                        </Animated.View>
                    );
                })}
            </View>
        );
    };

    const renderListItem = (user: LeaderboardUser, index: number) => {
        const rank = index + 1;
        const isMe = user.user_id === currentUserId;

        return (
            <Animated.View
                key={user.user_id}
                entering={FadeInDown.delay(index * 60).duration(400)}
                style={[styles.listItem, isMe && styles.listItemMe]}
            >
                <View style={styles.listLeft}>
                    <Text style={[styles.listRank, rank <= 3 && { color: RANK_COLORS[rank - 1] }]}>
                        {rank <= 3 ? '' : rank}
                    </Text>
                    {rank <= 3 && (
                        <Ionicons name={RANK_ICONS[rank - 1]} size={scaleFont(18)} color={RANK_COLORS[rank - 1]} />
                    )}
                    <View style={styles.listAvatarContainer}>
                        {user.avatar_url ? (
                            <Image source={{ uri: user.avatar_url }} style={styles.listAvatar} />
                        ) : (
                            <View style={styles.listAvatarPlaceholder}>
                                <Text style={styles.listAvatarText}>
                                    {(user.full_name || 'U').charAt(0).toUpperCase()}
                                </Text>
                            </View>
                        )}
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={[styles.listName, isMe && { color: '#5B2DAD' }]} numberOfLines={1}>
                            {isMe ? `${user.full_name?.split(' ')[0] || 'You'} (You)` : (user.full_name?.split(' ')[0] || 'User')}
                        </Text>
                        <View style={styles.listMeta}>
                            <Text style={styles.listLevel}>Lv.{user.level}</Text>
                            {user.current_streak > 0 && (
                                <View style={styles.streakBadge}>
                                    <Ionicons name="flame" size={scaleFont(10)} color="#EF4444" />
                                    <Text style={styles.streakText}>{user.current_streak}</Text>
                                </View>
                            )}
                        </View>
                    </View>
                </View>
                <View style={styles.listRight}>
                    <Text style={[styles.listPoints, isMe && { color: '#5B2DAD' }]}>
                        {user.lifetime_points}
                    </Text>
                    <Text style={styles.listPointsLabel}>PP</Text>
                </View>
            </Animated.View>
        );
    };

    return (
        <View style={styles.container}>
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
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                router.back();
                            }}
                            style={styles.backButton}
                        >
                            <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>Leaderboard</Text>
                        <View style={{ width: scaleFont(40) }} />
                    </View>
                    {myRank && (
                        <View style={styles.myRankBar}>
                            <Text style={styles.myRankText}>Your Rank</Text>
                            <View style={styles.myRankBadge}>
                                <Text style={styles.myRankNumber}>#{myRank}</Text>
                            </View>
                        </View>
                    )}
                </SafeAreaView>
            </LinearGradient>

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#5B2DAD" />
                    <Text style={styles.loadingText}>Loading rankings...</Text>
                </View>
            ) : leaderboard.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <View style={styles.emptyIcon}>
                        <Ionicons name="trophy-outline" size={scaleFont(48)} color="#CBD5E1" />
                    </View>
                    <Text style={styles.emptyTitle}>No rankings yet</Text>
                    <Text style={styles.emptySubtitle}>Complete promises to earn PP and appear on the leaderboard!</Text>
                </View>
            ) : (
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#5B2DAD" />
                    }
                >
                    {renderPodium()}

                    <View style={styles.listSection}>
                        <Text style={styles.listHeader}>ALL RANKINGS</Text>
                        {leaderboard.map((user, index) => renderListItem(user, index))}
                    </View>

                    <View style={{ height: scaleFont(40) }} />
                </ScrollView>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC' },
    headerGradient: {
        paddingBottom: scaleFont(24),
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
        fontSize: scaleFont(20),
        fontWeight: '800',
        color: '#FFFFFF',
        letterSpacing: scaleFont(0.5),
        fontFamily: 'Outfit_800ExtraBold',
    },
    myRankBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: scaleFont(16),
        gap: scaleFont(10),
    },
    myRankText: {
        fontSize: scaleFont(14),
        color: 'rgba(255,255,255,0.8)',
        fontFamily: 'Outfit_700Bold',
    },
    myRankBadge: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: scaleFont(14),
        paddingVertical: scaleFont(4),
        borderRadius: scaleFont(12),
    },
    myRankNumber: {
        fontSize: scaleFont(16),
        fontWeight: '900',
        color: '#FFFFFF',
        fontFamily: 'Outfit_800ExtraBold',
    },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loadingText: { marginTop: scaleFont(12), color: '#64748B', fontFamily: 'Outfit_700Bold' },
    emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: scaleFont(40) },
    emptyIcon: {
        width: scaleFont(80), height: scaleFont(80), borderRadius: scaleFont(40),
        backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center', marginBottom: scaleFont(20),
    },
    emptyTitle: { fontSize: scaleFont(20), fontWeight: '800', color: '#1E293B', marginBottom: scaleFont(8), fontFamily: 'Outfit_800ExtraBold' },
    emptySubtitle: { fontSize: scaleFont(14), color: '#94A3B8', textAlign: 'center', fontFamily: 'Outfit_400Regular' },

    scrollContent: { paddingTop: scaleFont(20), paddingHorizontal: scaleFont(20) },

    // Podium
    podiumContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'flex-end',
        marginBottom: scaleFont(28),
        gap: scaleFont(16),
    },
    podiumItem: {
        alignItems: 'center',
        justifyContent: 'flex-end',
        flex: 1,
    },
    podiumAvatar: {
        width: scaleFont(56),
        height: scaleFont(56),
        borderRadius: scaleFont(28),
        borderWidth: 3,
        backgroundColor: '#F1F5F9',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
        marginBottom: scaleFont(6),
    },
    podiumAvatarMe: {
        shadowColor: '#5B2DAD',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    avatarImg: { width: '100%', height: '100%', borderRadius: scaleFont(28) },
    avatarInitial: {
        fontSize: scaleFont(20), fontWeight: '900', color: '#5B2DAD', fontFamily: 'Outfit_800ExtraBold',
    },
    rankBadge: {
        position: 'absolute',
        bottom: -2,
        right: -2,
        width: scaleFont(20),
        height: scaleFont(20),
        borderRadius: scaleFont(10),
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#FFFFFF',
    },
    rankBadgeText: { fontSize: scaleFont(10), fontWeight: '900', color: '#FFFFFF', fontFamily: 'Outfit_800ExtraBold' },
    podiumName: {
        fontSize: scaleFont(12), fontWeight: '700', color: '#1E293B', marginBottom: scaleFont(2),
        fontFamily: 'Outfit_700Bold', maxWidth: scaleFont(80), textAlign: 'center',
    },
    podiumPoints: {
        fontSize: scaleFont(11), fontWeight: '600', color: '#64748B', fontFamily: 'Outfit_700Bold',
    },

    // List
    listSection: { marginTop: scaleFont(8) },
    listHeader: {
        fontSize: scaleFont(11), fontWeight: '800', color: '#94A3B8',
        letterSpacing: scaleFont(1.5), marginBottom: scaleFont(12), marginLeft: scaleFont(4),
        fontFamily: 'Outfit_800ExtraBold',
    },
    listItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#FFFFFF',
        padding: scaleFont(14),
        borderRadius: scaleFont(16),
        marginBottom: scaleFont(8),
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    listItemMe: {
        borderColor: '#E0D4F5',
        backgroundColor: '#FDFBFF',
    },
    listLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        gap: scaleFont(10),
    },
    listRank: {
        fontSize: scaleFont(14), fontWeight: '900', color: '#94A3B8',
        width: scaleFont(24), textAlign: 'center', fontFamily: 'Outfit_800ExtraBold',
    },
    listAvatarContainer: {
        width: scaleFont(38), height: scaleFont(38), borderRadius: scaleFont(19),
        overflow: 'hidden',
    },
    listAvatar: { width: '100%', height: '100%' },
    listAvatarPlaceholder: {
        width: '100%', height: '100%', backgroundColor: '#F0EBFF',
        justifyContent: 'center', alignItems: 'center', borderRadius: scaleFont(19),
    },
    listAvatarText: { fontSize: scaleFont(16), fontWeight: '800', color: '#5B2DAD', fontFamily: 'Outfit_800ExtraBold' },
    listName: { fontSize: scaleFont(14), fontWeight: '700', color: '#1E293B', fontFamily: 'Outfit_700Bold' },
    listMeta: { flexDirection: 'row', alignItems: 'center', gap: scaleFont(6), marginTop: scaleFont(2) },
    listLevel: { fontSize: scaleFont(10), fontWeight: '700', color: '#94A3B8', fontFamily: 'Outfit_700Bold' },
    streakBadge: {
        flexDirection: 'row', alignItems: 'center', gap: scaleFont(2),
        backgroundColor: '#FEF2F2', paddingHorizontal: scaleFont(5), paddingVertical: scaleFont(1),
        borderRadius: scaleFont(6),
    },
    streakText: { fontSize: scaleFont(10), fontWeight: '800', color: '#EF4444', fontFamily: 'Outfit_800ExtraBold' },
    listRight: { alignItems: 'flex-end' },
    listPoints: { fontSize: scaleFont(18), fontWeight: '900', color: '#1E293B', fontFamily: 'Outfit_800ExtraBold' },
    listPointsLabel: { fontSize: scaleFont(10), fontWeight: '700', color: '#94A3B8', fontFamily: 'Outfit_700Bold' },
});
