import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Platform,
    RefreshControl,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { supabase } from '../../lib/supabase';

export default function ProfileScreen() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [profile, setProfile] = useState<{ name: string; email: string } | null>(null);
    const [firstName, setFirstName] = useState<string>('Ashbin');


    console.log('ProfileScreen Render. Name:', firstName);

    const [latestContext, setLatestContext] = useState<{ desc: string; type: string } | null>(null);

    const [financials, setFinancials] = useState({
        winnings: 0,
        penalties: 0,
        net: 0
    });




    useFocusEffect(
        React.useCallback(() => {
            fetchProfileData();
        }, [])
    );

    const fetchProfileData = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // 1. Set Profile Info (Exact Home Logic)
            const metadataName = user.user_metadata?.full_name || user.user_metadata?.name;
            if (metadataName) {
                setFirstName(metadataName.split(' ')[0]);
            } else if (user.email) {
                setFirstName(user.email.split('@')[0]);
            }

            setProfile({ name: metadataName || 'User', email: user.email || '' });



            // 4. Fetch Ledger for Financials AND History
            const { data: ledger, error } = await supabase
                .from('ledger')
                .select('amount, type, description, created_at, promise_id')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;

            if (ledger) {
                console.log('DEBUG CHECK - Ledger Data:', JSON.stringify(ledger, null, 2)); // DEBUG LOG
                let totalWinnings = 0;
                let totalPenalties = 0;



                ledger.forEach(item => {
                    const val = Number(item.amount);
                    if (item.type === 'winnings') totalWinnings += val;
                    if (item.type === 'penalty') totalPenalties += val;


                });

                const absPenalties = Math.abs(totalPenalties);

                setFinancials({
                    winnings: totalWinnings,
                    penalties: absPenalties,
                    net: totalWinnings - absPenalties
                });



                if (ledger.length > 0) {
                    setLatestContext({ desc: ledger[0].description, type: ledger[0].type });
                }
            }

        } catch (error) {
            console.error('Error loading profile:', error);
        } finally {
            setLoading(false);
        }
        setLoading(false);
        setRefreshing(false);
    };

    const onRefresh = React.useCallback(() => {
        setRefreshing(true);
        fetchProfileData();
    }, []);







    const handlePress = (route: any) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push(route);
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.centerContent}>
                    <ActivityIndicator size="large" color="#4338ca" />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={['#F8FAFC', '#F1F5F9']}
                style={StyleSheet.absoluteFill}
            />
            <SafeAreaView style={{ flex: 1 }}>
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            tintColor="#4F46E5"
                            colors={['#4F46E5']}
                        />
                    }
                    showsVerticalScrollIndicator={false}
                >

                    {/* Header */}
                    <View style={styles.header}>
                        <TouchableOpacity
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                router.back();
                            }}
                            style={styles.headerButton}
                        >
                            <Ionicons name="chevron-back" size={24} color="#0F172A" />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>Profile</Text>
                        <TouchableOpacity
                            onPress={() => handlePress('/screens/SettingsScreen')}
                            style={styles.headerButton}
                        >
                            <Ionicons name="settings-outline" size={22} color="#0F172A" />
                        </TouchableOpacity>
                    </View>

                    {/* Profile Section */}
                    <View style={styles.profileSection}>
                        <View style={styles.avatarWrapper}>
                            <LinearGradient
                                colors={['#4F46E5', '#3730A3']}
                                style={styles.avatarGradient}
                            >
                                <Text style={styles.avatarInitial}>{(firstName || 'U').charAt(0).toUpperCase()}</Text>
                            </LinearGradient>
                            <View style={styles.verifiedBadge}>
                                <Ionicons name="checkmark-circle" size={22} color="#FFFFFF" />
                            </View>
                        </View>

                        <Text style={styles.profileNameText}>{firstName}</Text>
                        <Text style={styles.profileEmailText}>{profile?.email}</Text>

                        <View style={styles.badgeRow}>
                            <View style={styles.statusBadge}>
                                <View style={styles.dot} />
                                <Text style={styles.statusText}>Active Member</Text>
                            </View>
                        </View>
                    </View>

                    {/* Main Financial Card (Luxury Elevation) */}
                    <View style={styles.statsContainer}>
                        <LinearGradient
                            colors={['#FFFFFF', '#F8FAFC']}
                            style={styles.netProfitCard}
                        >
                            <View style={styles.cardHeader}>
                                <Text style={styles.cardLabel}>Net Performance</Text>
                                <View style={styles.growthBadge}>
                                    <Ionicons
                                        name={financials.net >= 0 ? "trending-up" : "trending-down"}
                                        size={14}
                                        color={financials.net >= 0 ? "#059669" : "#DC2626"}
                                    />
                                    <Text style={[
                                        styles.growthText,
                                        { color: financials.net >= 0 ? "#059669" : "#DC2626", marginLeft: 4 }
                                    ]}>
                                        {financials.net >= 0 ? "Profit" : "Loss"}
                                    </Text>
                                </View>
                            </View>

                            <Text style={[
                                styles.mainNetValue,
                                { color: financials.net >= 0 ? '#0F172A' : '#991B1B' }
                            ]}>
                                {financials.net < 0 ? '-' : ''}₹{Math.abs(financials.net).toLocaleString()}
                            </Text>

                            <Text style={styles.balanceHelper}>
                                {latestContext?.desc || "Combined total from all active and completed promises"}
                            </Text>

                            <View style={styles.divider} />

                            <View style={styles.statBreakdown}>
                                <View style={styles.subStat}>
                                    <View style={[styles.miniIcon, { backgroundColor: '#ECFDF5' }]}>
                                        <Ionicons name="arrow-up" size={14} color="#059669" />
                                    </View>
                                    <View style={{ marginLeft: 12 }}>
                                        <Text style={styles.subLabel}>Gained</Text>
                                        <Text style={styles.subValue}>₹{financials.winnings.toLocaleString()}</Text>
                                    </View>
                                </View>
                                <View style={styles.statLine} />
                                <View style={styles.subStat}>
                                    <View style={[styles.miniIcon, { backgroundColor: '#FEF2F2' }]}>
                                        <Ionicons name="arrow-down" size={14} color="#DC2626" />
                                    </View>
                                    <View style={{ marginLeft: 12 }}>
                                        <Text style={styles.subLabel}>Lost</Text>
                                        <Text style={styles.subValue}>₹{financials.penalties.toLocaleString()}</Text>
                                    </View>
                                </View>
                            </View>
                        </LinearGradient>
                    </View>

                    {/* Activity Section */}
                    <View style={styles.menuSection}>
                        <Text style={styles.menuTitle}>My Activity</Text>

                        <TouchableOpacity
                            style={styles.menuCard}
                            onPress={() => handlePress('/screens/JourneyScreen')}
                        >
                            <View style={[styles.menuIcon, { backgroundColor: '#EEF2FF' }]}>
                                <Ionicons name="map" size={22} color="#4F46E5" />
                            </View>
                            <View style={styles.menuContent}>
                                <Text style={styles.menuLabel}>Promise Journey</Text>
                                <Text style={styles.menuSubLabel}>Review stakes and milestones</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.menuCard}
                            onPress={() => handlePress('/screens/TransactionHistoryScreen')}
                        >
                            <View style={[styles.menuIcon, { backgroundColor: '#F8FAFC' }]}>
                                <Ionicons name="wallet" size={22} color="#1E293B" />
                            </View>
                            <View style={styles.menuContent}>
                                <Text style={styles.menuLabel}>Transaction History</Text>
                                <Text style={styles.menuSubLabel}>View all ledger movements</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
                        </TouchableOpacity>
                    </View>



                    <View style={styles.footerInfo}>
                        <Ionicons name="shield-checkmark" size={14} color="#94A3B8" />
                        <Text style={styles.footerText}>Secured by Pay & Promise Protocol v2.0</Text>
                    </View>

                </ScrollView>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingBottom: 40,
        paddingTop: Platform.OS === 'android' ? 40 : 20,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 20,
        paddingVertical: 10,
    },
    headerButton: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#F1F5F9',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: '#0F172A',
        letterSpacing: -0.5,
    },
    profileSection: {
        alignItems: 'center',
        marginBottom: 30,
    },
    avatarWrapper: {
        marginBottom: 16,
        position: 'relative',
    },
    avatarGradient: {
        width: 100,
        height: 100,
        borderRadius: 50,
        padding: 4,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarInitial: {
        fontSize: 36,
        fontWeight: '900',
        color: '#FFFFFF',
    },
    verifiedBadge: {
        position: 'absolute',
        bottom: 2,
        right: 2,
        backgroundColor: '#4F46E5',
        width: 28,
        height: 28,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 3,
        borderColor: '#F8FAFC',
    },
    profileNameText: {
        fontSize: 26,
        fontWeight: '900',
        color: '#0F172A',
        letterSpacing: -0.5,
    },
    profileEmailText: {
        fontSize: 14,
        color: '#64748B',
        fontWeight: '500',
        marginTop: 4,
    },
    badgeRow: {
        flexDirection: 'row',
        marginTop: 12,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#EEF2FF',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#4F46E5',
    },
    statusText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#4F46E5',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginLeft: 6,
    },
    statsContainer: {
        marginBottom: 24,
    },
    netProfitCard: {
        borderRadius: 24,
        padding: 24,
        borderWidth: 1,
        borderColor: '#F1F5F9',
        shadowColor: '#4F46E5',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.08,
        shadowRadius: 20,
        elevation: 6,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    cardLabel: {
        fontSize: 13,
        fontWeight: '700',
        color: '#64748B',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    growthBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(5, 150, 105, 0.08)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    growthText: {
        fontSize: 11,
        fontWeight: '700',
    },
    mainNetValue: {
        fontSize: 40,
        fontWeight: '900',
        color: '#0F172A',
        letterSpacing: -1,
    },
    balanceHelper: {
        fontSize: 13,
        color: '#94A3B8',
        fontWeight: '500',
        marginTop: 6,
        lineHeight: 18,
    },
    divider: {
        height: 1,
        backgroundColor: '#F1F5F9',
        marginVertical: 20,
    },
    statBreakdown: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    subStat: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    statLine: {
        width: 1,
        height: 30,
        backgroundColor: '#F1F5F9',
    },
    miniIcon: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    subLabel: {
        fontSize: 11,
        fontWeight: '600',
        color: '#94A3B8',
        textTransform: 'uppercase',
    },
    subValue: {
        fontSize: 15,
        fontWeight: '800',
        color: '#1E293B',
    },
    menuSection: {
        marginBottom: 30,
    },
    menuTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: '#0F172A',
        marginBottom: 16,
        marginLeft: 4,
    },
    menuCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        padding: 16,
        borderRadius: 20,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#F1F5F9',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 4,
        elevation: 1,
    },
    menuIcon: {
        width: 48,
        height: 48,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    menuContent: {
        flex: 1,
    },
    menuLabel: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1E293B',
    },
    menuSubLabel: {
        fontSize: 12,
        color: '#94A3B8',
        marginTop: 2,
    },
    logoutBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FFFFFF',
        paddingVertical: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        marginBottom: 30,
    },
    logoutBtnText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#64748B',
        marginLeft: 8,
    },
    footerInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: 0.5,
    },
    footerText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#94A3B8',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginLeft: 6,
    },
    centerContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
}) as any;


