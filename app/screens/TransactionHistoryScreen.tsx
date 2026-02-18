import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    Platform,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GridOverlay } from '../../components/LuxuryVisuals';
import { supabase } from '../../lib/supabase';
import { scaleFont } from '../../utils/layout';

const { width } = Dimensions.get('window');

export default function TransactionHistoryScreen() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [history, setHistory] = useState<any[]>([]);

    useFocusEffect(
        React.useCallback(() => {
            fetchHistory();
        }, [])
    );

    const fetchHistory = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Fetch from promise_point_ledger (PP system)
            const { data: ppLedger, error: ppError } = await supabase
                .from('promise_point_ledger')
                .select('points, reason, description, created_at, promise_id')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (ppError) {
                console.error('PP Ledger error:', ppError);
                setHistory([]);
                return;
            }

            if (ppLedger && ppLedger.length > 0) {
                const promiseIds = [...new Set(ppLedger.map(l => l.promise_id).filter(Boolean))];

                let promiseTitles: Record<string, string> = {};
                if (promiseIds.length > 0) {
                    const { data: promises } = await supabase
                        .from('promises')
                        .select('id, title')
                        .in('id', promiseIds);

                    if (promises) {
                        promises.forEach(p => {
                            promiseTitles[p.id] = p.title;
                        });
                    }
                }

                const enrichedHistory = ppLedger.map(item => ({
                    ...item,
                    amount: item.points,
                    type: item.reason, // Map reason -> type for getTypeConfig
                    promise_title: item.promise_id ? promiseTitles[item.promise_id] : null,
                    description: item.description || getDefaultDescription(item.reason),
                }));

                setHistory(enrichedHistory);
            } else {
                setHistory([]);
            }
        } catch (error) {
            console.error('Error loading history:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const getDefaultDescription = (reason: string): string => {
        switch (reason) {
            case 'commitment_lock': return 'Points locked for promise';
            case 'commitment_unlock': return 'Points unlocked';
            case 'daily_success': return 'Daily check-in success';
            case 'daily_failure': return 'Missed daily check-in';
            case 'daily_redistribution': return 'Redistribution bonus';
            case 'daily_bonus': return 'Team completion bonus';
            case 'signup_bonus': return 'Welcome bonus';
            case 'streak_bonus': return 'Streak milestone bonus';
            case 'daily_checkin': return 'Daily check-in reward';
            default: return reason.replace(/_/g, ' ');
        }
    };

    const onRefresh = React.useCallback(() => {
        setRefreshing(true);
        fetchHistory();
    }, []);

    const formatPoints = (amount: number) => {
        return Math.abs(amount) + ' PP';
    };

    const formatDate = (dateString: string) => {
        const d = new Date(dateString);
        return d.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    const getTypeConfig = (type: string) => {
        switch (type) {
            case 'daily_success':
            case 'daily_checkin':
            case 'earned':
            case 'winnings':
                return { icon: 'arrow-up-circle' as const, color: '#10B981', bg: '#ECFDF5', label: 'EARNED', prefix: '+' };
            case 'daily_bonus':
            case 'streak_bonus':
            case 'signup_bonus':
            case 'level_up_bonus':
            case 'bonus':
                return { icon: 'star' as const, color: '#F59E0B', bg: '#FEF3C7', label: 'BONUS', prefix: '+' };
            case 'daily_redistribution':
                return { icon: 'gift' as const, color: '#8B5CF6', bg: '#F5F3FF', label: 'REDISTRIBUTION', prefix: '+' };
            case 'commitment_lock':
            case 'locked':
                return { icon: 'lock-closed' as const, color: '#D97706', bg: '#FEF3C7', label: 'LOCKED', prefix: '-' };
            case 'commitment_unlock':
            case 'unlocked':
            case 'refund':
                return { icon: 'lock-open' as const, color: '#6366F1', bg: '#EEF2FF', label: 'UNLOCKED', prefix: '+' };
            case 'daily_failure':
            case 'penalty':
            case 'lost':
                return { icon: 'arrow-down-circle' as const, color: '#EF4444', bg: '#FEF2F2', label: 'LOST', prefix: '-' };
            default:
                return { icon: 'swap-horizontal' as const, color: '#64748B', bg: '#F8FAFC', label: type?.toUpperCase().replace(/_/g, ' ') || 'OTHER', prefix: '' };
        }
    };

    const handleBack = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.back();
    };

    return (
        <View style={styles.container}>
            <GridOverlay />
            <SafeAreaView style={{ flex: 1 }}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={handleBack} style={styles.backButton}>
                        <Ionicons name="chevron-back" size={scaleFont(24)} color="#1E293B" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Activity Log</Text>
                    <View style={{ width: scaleFont(44) }} />
                </View>

                {loading ? (
                    <View style={styles.centerContent}>
                        <ActivityIndicator size="large" color="#5B2DAD" />
                    </View>
                ) : (
                    <ScrollView
                        contentContainerStyle={styles.scrollContent}
                        showsVerticalScrollIndicator={false}
                        refreshControl={
                            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#5B2DAD" />
                        }
                    >
                        {history.length === 0 ? (
                            <View style={styles.emptyState}>
                                <View style={styles.emptyIconCircle}>
                                    <Ionicons name="time-outline" size={scaleFont(32)} color="#94A3B8" />
                                </View>
                                <Text style={styles.emptyText}>No activity recorded yet.</Text>
                                <Text style={styles.emptySubtext}>Complete promises to earn Promise Points!</Text>
                            </View>
                        ) : (
                            history.map((item, index) => {
                                const config = getTypeConfig(item.type);
                                return (
                                    <Animated.View
                                        key={index}
                                        entering={FadeInDown.delay(index * 50).duration(400)}
                                        style={styles.historyCard}
                                    >
                                        <View style={styles.cardTop}>
                                            <View style={[styles.typeBadge, { backgroundColor: config.bg }]}>
                                                <Ionicons
                                                    name={config.icon}
                                                    size={scaleFont(12)}
                                                    color={config.color}
                                                />
                                                <Text style={[styles.typeText, { color: config.color }]}>
                                                    {config.label}
                                                </Text>
                                            </View>
                                            <Text style={styles.dateText}>{formatDate(item.created_at)}</Text>
                                        </View>

                                        <View style={styles.cardMain}>
                                            <View style={{ flex: 1 }}>
                                                <Text style={styles.description}>{item.description}</Text>
                                                {item.promise_title && (
                                                    <Text style={styles.promiseRef}>Ref: {item.promise_title}</Text>
                                                )}
                                            </View>
                                            <Text style={[
                                                styles.amount,
                                                { color: config.color }
                                            ]}>
                                                {config.prefix}{formatPoints(item.amount)}
                                            </Text>
                                        </View>
                                    </Animated.View>
                                );
                            })
                        )}
                    </ScrollView>
                )}
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFFFFF' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: scaleFont(20),
        paddingTop: Platform.OS === 'android' ? scaleFont(40) : scaleFont(10),
        paddingBottom: scaleFont(16)
    },
    backButton: {
        width: scaleFont(44),
        height: scaleFont(44),
        borderRadius: scaleFont(12),
        backgroundColor: '#F1F5F9',
        alignItems: 'center',
        justifyContent: 'center'
    },
    headerTitle: {
        fontSize: scaleFont(18),
        fontWeight: '800',
        color: '#1E293B',
        letterSpacing: scaleFont(-0.5),
        fontFamily: 'Outfit_800ExtraBold'
    },
    scrollContent: { padding: scaleFont(20), paddingBottom: scaleFont(40) },
    centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    historyCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: scaleFont(20),
        padding: scaleFont(16),
        marginBottom: scaleFont(12),
        borderWidth: 1,
        borderColor: '#F1F5F9',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: scaleFont(2) },
        shadowOpacity: 0.03,
        shadowRadius: scaleFont(4),
        elevation: scaleFont(1)
    },
    cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: scaleFont(12) },
    typeBadge: { flexDirection: 'row', alignItems: 'center', gap: scaleFont(4), paddingHorizontal: scaleFont(8), paddingVertical: scaleFont(4), borderRadius: scaleFont(8) },
    typeText: { fontSize: scaleFont(10), fontWeight: '900', letterSpacing: scaleFont(0.5), fontFamily: 'Outfit_800ExtraBold' },
    dateText: { fontSize: scaleFont(11), fontWeight: '700', color: '#94A3B8', fontFamily: 'Outfit_700Bold' },
    cardMain: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: scaleFont(12) },
    description: { fontSize: scaleFont(15), fontWeight: '700', color: '#1E293B', marginBottom: scaleFont(4), lineHeight: scaleFont(20), fontFamily: 'Outfit_700Bold' },
    promiseRef: { fontSize: scaleFont(12), color: '#6366F1', fontWeight: '600', fontFamily: 'Outfit_700Bold' },
    amount: { fontSize: scaleFont(16), fontWeight: '900', letterSpacing: scaleFont(-0.5), fontFamily: 'Outfit_800ExtraBold' },
    emptyState: { paddingVertical: scaleFont(100), alignItems: 'center' },
    emptyIconCircle: { width: scaleFont(64), height: scaleFont(64), borderRadius: scaleFont(32), backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center', marginBottom: scaleFont(16) },
    emptyText: { fontSize: scaleFont(14), color: '#94A3B8', fontWeight: '600', fontFamily: 'Outfit_700Bold' },
    emptySubtext: { fontSize: scaleFont(12), color: '#CBD5E1', fontWeight: '500', marginTop: scaleFont(4), fontFamily: 'Outfit_600SemiBold' },
});
