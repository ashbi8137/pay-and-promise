import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    Dimensions,
    Platform,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { GridOverlay } from '../../components/LuxuryVisuals';
import { useAlert } from '../../context/AlertContext';
import { supabase } from '../../lib/supabase';
import { scaleFont } from '../../utils/layout';

const { width } = Dimensions.get('window');

// Mock data for rewards / coupons
const REWARDS = [
    {
        id: '1',
        title: 'Spotify Premium',
        subtitle: '10% Off Subscription',
        cost: 400,
        icon: 'musical-notes',
        color: '#1DB954',
        glow: 'rgba(29, 185, 84, 0.4)',
    },
    {
        id: '2',
        title: 'Amazon',
        subtitle: '$5 Gift Card',
        cost: 600,
        icon: 'cart',
        color: '#FF9900',
        glow: 'rgba(255, 153, 0, 0.4)',
    },
    {
        id: '3',
        title: 'Starbucks',
        subtitle: 'Free Coffee Scan',
        cost: 400,
        icon: 'cafe',
        color: '#00704A',
        glow: 'rgba(0, 112, 74, 0.4)',
    },
    {
        id: '4',
        title: 'Decathlon',
        subtitle: '20% Off Gear',
        cost: 750,
        icon: 'bicycle',
        color: '#0082C3',
        glow: 'rgba(0, 130, 195, 0.4)',
    },
];

export default function BazaarScreen() {
    const router = useRouter();
    const { showAlert } = useAlert();
    const [ppBalance, setPpBalance] = useState<number>(0);
    const [loading, setLoading] = useState(true);

    useFocusEffect(
        React.useCallback(() => {
            fetchBalance();
        }, [])
    );

    const fetchBalance = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data } = await supabase
                .from('profiles')
                .select('promise_points')
                .eq('id', user.id)
                .single();

            if (data) setPpBalance(data.promise_points || 0);
        } catch (error) {
            console.error('Error fetching balance:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleRedeem = (reward: typeof REWARDS[0]) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        if (ppBalance < reward.cost) {
            // Insufficient Points Alert
            showAlert({
                title: "Not Enough PP",
                message: `You only have ${ppBalance} PP. Keep completing promises!`,
                type: 'error',
                buttons: [{ text: "Keep Going", style: 'cancel' }]
            });
            return;
        }

        // Confirmation Alert
        showAlert({
            title: `Redeem ${reward.title}?`,
            message: `This will consume ${reward.cost} PP from your vault.`,
            type: 'warning',
            buttons: [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Confirm',
                    style: 'default',
                    onPress: () => {
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                        showAlert({
                            title: "Success! 🎁",
                            message: `Your code for ${reward.title} will be emailed to you soon! (Mock feature for now)`,
                            type: 'success',
                        });
                        // In reality, we'd trigger a backend RPC here to deduct points and generate a code.
                    }
                }
            ]
        });
    };

    return (
        <View style={styles.container}>
            <GridOverlay />

            <SafeAreaView style={{ flex: 1 }}>

                {/* ── HEADER ── */}
                <Animated.View entering={FadeInUp.duration(500)} style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtnWrapper}>
                        <View style={styles.iconCircle}>
                            <Ionicons name="chevron-back" size={24} color="#0F172A" />
                        </View>
                    </TouchableOpacity>
                    <View style={styles.headerCenter}>
                        <Text style={styles.headerTitle}>The Bazaar</Text>
                    </View>
                    <View style={{ width: scaleFont(44) }} />
                </Animated.View>

                {/* ── BALANCE DISPLAY ── */}
                <Animated.View entering={FadeInUp.delay(100).duration(500)} style={styles.balanceSection}>
                    <LinearGradient
                        colors={['#FACC15', '#F59E0B']}
                        style={styles.balanceCard}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                    >
                        <View style={styles.balanceIconWrapper}>
                            <Ionicons name="diamond" size={28} color="#FFF" />
                        </View>
                        <View style={styles.balanceTextWrapper}>
                            <Text style={styles.balanceLabel}>YOUR BALANCE</Text>
                            <Text style={styles.balanceValue}>{loading ? '...' : ppBalance} <Text style={styles.balanceUnit}>PP</Text></Text>
                        </View>
                    </LinearGradient>
                </Animated.View>

                {/* ── REWARDS GRID ── */}
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    <Animated.View entering={FadeInDown.delay(200).duration(500)} style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>AVAILABLE REWARDS</Text>
                        <Text style={styles.sectionSubtitle}>Spend your hard-earned points on real rewards.</Text>
                    </Animated.View>

                    <View style={styles.grid}>
                        {REWARDS.map((reward, index) => (
                            <Animated.View key={reward.id} entering={FadeInDown.delay(300 + (index * 100)).duration(500)} style={styles.gridItem}>
                                <TouchableOpacity
                                    style={[styles.rewardCard, { shadowColor: reward.color }]}
                                    activeOpacity={0.8}
                                    onPress={() => handleRedeem(reward)}
                                >
                                    <View style={[styles.rewardIconBg, { backgroundColor: reward.glow }]}>
                                        <Ionicons name={reward.icon as any} size={28} color={reward.color} />
                                    </View>

                                    <Text style={styles.rewardTitle} numberOfLines={1}>{reward.title}</Text>
                                    <Text style={styles.rewardSubtitle} numberOfLines={1}>{reward.subtitle}</Text>

                                    <View style={styles.costBadge}>
                                        <Ionicons name="sparkles" size={12} color="#5B2DAD" />
                                        <Text style={styles.costText}>{reward.cost} PP</Text>
                                    </View>
                                </TouchableOpacity>
                            </Animated.View>
                        ))}
                    </View>

                    {/* Placeholder bottom spacing */}
                    <View style={{ height: scaleFont(100) }} />
                </ScrollView>

            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC' },

    // Header
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: scaleFont(24),
        paddingTop: Platform.OS === 'android' ? scaleFont(56) : scaleFont(16),
        paddingBottom: scaleFont(16),
    },
    backBtnWrapper: {
        width: scaleFont(44), height: scaleFont(44),
        alignItems: 'center', justifyContent: 'center',
    },
    iconCircle: {
        width: scaleFont(40), height: scaleFont(40), borderRadius: scaleFont(20),
        backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center',
        shadowColor: '#0F172A', shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
    },
    headerCenter: { flex: 1, alignItems: 'center' },
    headerTitle: {
        fontSize: scaleFont(20), fontWeight: '900', color: '#0F172A',
        fontFamily: 'Outfit_800ExtraBold',
    },

    // Balance
    balanceSection: { paddingHorizontal: scaleFont(24), marginBottom: scaleFont(32) },
    balanceCard: {
        flexDirection: 'row', alignItems: 'center',
        padding: scaleFont(24), borderRadius: scaleFont(24),
        shadowColor: '#F59E0B', shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3, shadowRadius: 16, elevation: 8,
    },
    balanceIconWrapper: {
        width: scaleFont(56), height: scaleFont(56), borderRadius: scaleFont(28),
        backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center',
        marginRight: scaleFont(16),
    },
    balanceTextWrapper: { flex: 1 },
    balanceLabel: {
        fontSize: scaleFont(10), fontWeight: '800', fontFamily: 'Outfit_800ExtraBold',
        letterSpacing: scaleFont(1.5), color: 'rgba(255,255,255,0.7)', marginBottom: scaleFont(4),
    },
    balanceValue: {
        fontSize: scaleFont(36), fontWeight: '900', fontFamily: 'Outfit_800ExtraBold',
        color: '#FFFFFF', letterSpacing: scaleFont(-1),
    },
    balanceUnit: {
        fontSize: scaleFont(18), color: 'rgba(255,255,255,0.8)',
    },

    // Rewards
    scrollContent: { paddingHorizontal: scaleFont(24) },
    sectionHeader: { marginBottom: scaleFont(24) },
    sectionTitle: {
        fontSize: scaleFont(12), fontWeight: '900', fontFamily: 'Outfit_800ExtraBold',
        letterSpacing: scaleFont(1.5), color: '#94A3B8', marginBottom: scaleFont(4),
    },
    sectionSubtitle: {
        fontSize: scaleFont(14), fontWeight: '600', fontFamily: 'Outfit_400Regular',
        color: '#64748B',
    },

    grid: {
        flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between',
    },
    gridItem: {
        width: '48%', marginBottom: scaleFont(16),
    },
    rewardCard: {
        backgroundColor: '#FFFFFF', borderRadius: scaleFont(24),
        padding: scaleFont(20), alignItems: 'center',
        borderWidth: 1, borderColor: '#F1F5F9',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.15, shadowRadius: 20, elevation: 6,
    },
    rewardIconBg: {
        width: scaleFont(56), height: scaleFont(56), borderRadius: scaleFont(28),
        alignItems: 'center', justifyContent: 'center', marginBottom: scaleFont(16),
    },
    rewardTitle: {
        fontSize: scaleFont(16), fontWeight: '800', fontFamily: 'Outfit_800ExtraBold',
        color: '#0F172A', marginBottom: scaleFont(4), textAlign: 'center',
    },
    rewardSubtitle: {
        fontSize: scaleFont(11), fontWeight: '500', fontFamily: 'Outfit_400Regular',
        color: '#64748B', marginBottom: scaleFont(16), textAlign: 'center',
    },
    costBadge: {
        flexDirection: 'row', alignItems: 'center', gap: scaleFont(4),
        backgroundColor: '#F5F3FF', paddingVertical: scaleFont(8), paddingHorizontal: scaleFont(12),
        borderRadius: scaleFont(12), borderWidth: 1, borderColor: '#E0E7FF',
    },
    costText: {
        fontSize: scaleFont(12), fontWeight: '800', fontFamily: 'Outfit_800ExtraBold',
        color: '#5B2DAD',
    }
});
