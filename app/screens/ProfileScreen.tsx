import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Platform,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { supabase } from '../../lib/supabase';

export default function ProfileScreen() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
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

            // 2. Fetch Ledger for Financials AND History
            const { data: ledger, error } = await supabase
                .from('ledger')
                .select('amount, type, description, created_at')
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
    };

    const handleLogout = async () => {
        Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Sign Out',
                style: 'destructive',
                onPress: async () => {
                    const { error } = await supabase.auth.signOut();
                    if (error) Alert.alert('Error', error.message);
                    else router.replace('/screens/AuthScreen');
                }
            }
        ]);
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
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>

                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color="#0F172A" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Profile</Text>
                    <TouchableOpacity onPress={() => router.push('/screens/SettingsScreen')} style={styles.backButton}>
                        <Ionicons name="settings-outline" size={24} color="#0F172A" />
                    </TouchableOpacity>
                </View>

                {/* Profile Header */}
                <View style={styles.profileHeader}>
                    <TouchableOpacity style={styles.avatarContainer}>
                        <Text style={styles.avatarText}>{(firstName || 'U').charAt(0).toUpperCase()}</Text>
                    </TouchableOpacity>

                    <View style={styles.profileInfo}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            {/* User requested specific render logic */}
                            <Text style={styles.profileName} numberOfLines={1}>
                                {firstName}
                            </Text>
                            <Ionicons name="checkmark-circle" size={20} color="#4F46E5" />
                        </View>
                        <Text style={styles.profileEmail} numberOfLines={1}>{profile?.email}</Text>

                        <View style={styles.userBadge}>
                            <Text style={styles.userBadgeText}>Member</Text>
                        </View>
                    </View>
                </View>

                {/* Financial Summary (Stock Style) */}
                <View style={styles.financialContainer}>
                    <Text style={styles.sectionTitle}>Wallet Summary</Text>

                    {/* Net P&L Main Card */}
                    <View style={styles.netCard}>
                        <Text style={styles.netLabel}>Net Profit / Loss</Text>
                        {financials.net !== 0 ? (
                            <Text style={[
                                styles.netValue,
                                { color: financials.net >= 0 ? '#166534' : '#991B1B' }
                            ]}>
                                {financials.net >= 0 ? '+' : '-'} ₹{Math.abs(financials.net).toFixed(2)}
                            </Text>
                        ) : (
                            <Text style={[styles.netValue, { color: '#94A3B8' }]}>₹0.00</Text>
                        )}
                        <Text style={[
                            styles.netHelper,
                            latestContext ? { color: latestContext.type === 'winnings' ? '#166534' : '#991B1B', fontWeight: '600' } : {}
                        ]}>
                            {latestContext
                                ? latestContext.desc
                                : (financials.net !== 0
                                    ? "Overall result from all your promises"
                                    : "Start your first promise to see your results here.")}
                        </Text>
                    </View>

                    <View style={styles.statsRow}>
                        {/* Winnings */}
                        <View style={[styles.statCard, styles.statCardGreen]}>
                            <View style={styles.iconCircleGreen}>
                                <Ionicons name="trending-up" size={20} color="#166534" />
                            </View>
                            <View>
                                <Text style={styles.statLabel}>Gained</Text>
                                <Text style={[styles.statValue, { color: '#166534' }]}>₹{financials.winnings.toFixed(2)}</Text>
                                <Text style={styles.statSubLabel}>Money you earned</Text>
                            </View>
                        </View>

                        {/* Penalties */}
                        <View style={[styles.statCard, styles.statCardRed]}>
                            <View style={styles.iconCircleRed}>
                                <Ionicons name="trending-down" size={20} color="#991B1B" />
                            </View>
                            <View>
                                <Text style={styles.statLabel}>Lost</Text>
                                <Text style={[styles.statValue, { color: '#991B1B' }]}>₹{financials.penalties.toFixed(2)}</Text>
                                <Text style={styles.statSubLabel}>Money you paid</Text>
                            </View>
                        </View>
                    </View>
                </View>



                {/* Activity Section */}
                <View style={styles.settingsSection}>
                    <Text style={styles.sectionTitle}>Activity</Text>

                    <TouchableOpacity
                        style={styles.settingItem}
                        onPress={() => router.push('/screens/TransactionHistoryScreen')}
                    >
                        <View style={styles.settingLeft}>
                            <View style={[styles.menuIconContainer, { backgroundColor: '#F8FAFC' }]}>
                                <Ionicons name="time-outline" size={20} color="#475569" />
                            </View>
                            <Text style={styles.settingText}>Transaction History</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
                    </TouchableOpacity>
                </View>

                {/* Trust Indicator */}

                {/* Trust Indicator */}
                <View style={styles.trustContainer}>
                    <Ionicons name="lock-closed-outline" size={12} color="#94A3B8" />
                    <Text style={styles.trustText}>All transactions are securely encrypted.</Text>
                </View>

                <Text style={styles.versionText}>Version 1.0.0</Text>

            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    centerContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scrollContent: {
        padding: 24,
        paddingTop: Platform.OS === 'android' ? 60 : 40,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 32,
    },
    backButton: {
        padding: 8,
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#0F172A',
    },
    profileHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 32,
        paddingHorizontal: 8,
    },
    avatarContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#4338ca',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 20,
        shadowColor: '#4338ca',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
        position: 'relative',
    },
    profileInfo: {
        flex: 1,
        justifyContent: 'center',
    },
    editBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: '#0F172A',
        padding: 6,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#FFFFFF',
    },
    editProfileLink: {
        marginTop: 6,
    },
    editProfileText: {
        fontSize: 14,
        color: '#4338ca',
        fontWeight: '600',
    },
    userBadge: {
        backgroundColor: '#EFF6FF',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        marginTop: 6,
        alignSelf: 'flex-start',
    },
    userBadgeText: {
        color: '#4338ca',
        fontSize: 12,
        fontWeight: '700',
    },
    avatarText: {
        fontSize: 32,
        color: '#FFFFFF',
        fontWeight: '700',
    },
    profileName: {
        fontSize: 24,
        fontWeight: '800',
        color: '#0F172A',
        marginBottom: 2,
    },
    profileEmail: {
        fontSize: 14,
        color: '#64748B',
    },
    financialContainer: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#334155',
        marginBottom: 16,
        marginLeft: 4,
    },
    netCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 24,
        marginBottom: 16,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        elevation: 2,
        shadowColor: '#64748B',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
    },
    netLabel: {
        fontSize: 14,
        color: '#64748B',
        marginBottom: 8,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    netValue: {
        fontSize: 36,
        fontWeight: '800',
        marginBottom: 4,
    },
    netHelper: {
        fontSize: 12,
        color: '#94A3B8',
        fontWeight: '500',
    },
    statsRow: {
        flexDirection: 'row',
        gap: 12,
    },
    statCard: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        // elevation: 1,
    },
    statCardGreen: {
        borderColor: '#DCFCE7',
        backgroundColor: '#FFFFFF',
    },
    statCardRed: {
        borderColor: '#FEE2E2',
        backgroundColor: '#FFFFFF',
    },
    iconCircleGreen: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#DCFCE7',
        justifyContent: 'center',
        alignItems: 'center',
    },
    iconCircleRed: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#FEE2E2',
        justifyContent: 'center',
        alignItems: 'center',
    },
    statLabel: {
        fontSize: 12,
        color: '#64748B',
        fontWeight: '600',
        textTransform: 'uppercase',
    },
    statValue: {
        fontSize: 18,
        fontWeight: '700',
    },
    statSubLabel: {
        fontSize: 10,
        color: '#94A3B8',
        marginTop: 2,
    },
    settingsSection: {
        marginBottom: 32,
    },
    settingItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 18,
        paddingHorizontal: 16,
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#F1F5F9',
        shadowColor: '#64748B',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03,
        shadowRadius: 2,
    },
    settingLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
    },
    settingText: {
        fontSize: 16,
        color: '#334155',
        fontWeight: '600',
    },
    // New Action Button
    actionButton: {
        marginBottom: 32,
        borderRadius: 16,
        shadowColor: '#4F46E5',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    actionGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        borderRadius: 16,
    },
    actionButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
    },
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        backgroundColor: '#F8FAFC',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        marginBottom: 12,
    },
    logoutText: {
        color: '#64748B',
        fontSize: 16,
        fontWeight: '600',
    },
    trustContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        marginBottom: 24,
    },
    trustText: {
        fontSize: 12,
        color: '#94A3B8',
        fontWeight: '500',
    },
    versionText: {
        textAlign: 'center',
        color: '#CBD5E1',
        fontSize: 12,
        marginBottom: 24,
    },
    // NEW HISTORY & MENU STYLES
    section: {
        marginBottom: 24,
    },

    // Preferences Menu Styles (to match added UI)
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        padding: 16,
        borderRadius: 16,
        marginBottom: 12,
        shadowColor: '#64748B',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
        elevation: 1,
    },
    menuIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: '#F1F5F9',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    menuText: {
        flex: 1,
        fontSize: 16,
        fontWeight: '500',
        color: '#0F172A',
    },
});
