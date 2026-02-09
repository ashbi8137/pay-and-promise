import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    Platform,
    RefreshControl,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { GridOverlay } from '../../components/LuxuryVisuals';
import { useAlert } from '../../context/AlertContext';
import { supabase } from '../../lib/supabase';
import { scaleFont } from '../utils/layout';

const { width } = Dimensions.get('window');

export default function ProfileScreen() {
    const router = useRouter();
    const { showAlert } = useAlert();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [profile, setProfile] = useState<{ name: string; email: string } | null>(null);
    const [firstName, setFirstName] = useState<string>('User');
    const [financials, setFinancials] = useState({ winnings: 0, penalties: 0, net: 0 });
    const [metrics, setMetrics] = useState({ active: 0, success: '96%' });

    useFocusEffect(
        React.useCallback(() => {
            fetchProfileData();
        }, [])
    );

    const fetchProfileData = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const metadataName = user.user_metadata?.full_name || user.user_metadata?.name;
            if (metadataName) {
                setFirstName(metadataName.split(' ')[0]);
            } else if (user.email) {
                setFirstName(user.email.split('@')[0]);
            }

            setProfile({ name: metadataName || 'Executive Member', email: user.email || '' });

            const { data: ledger } = await supabase.from('ledger').select('amount, type').eq('user_id', user.id);
            const { count: activeCount } = await supabase.from('promises').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('status', 'active');

            if (ledger) {
                let totalWinnings = 0, totalPenalties = 0;
                ledger.forEach(item => {
                    const val = Number(item.amount);
                    if (item.type === 'winnings') totalWinnings += val;
                    if (item.type === 'penalty') totalPenalties += val;
                });
                setFinancials({ winnings: totalWinnings, penalties: Math.abs(totalPenalties), net: totalWinnings - Math.abs(totalPenalties) });
            }
            setMetrics(prev => ({ ...prev, active: activeCount || 0 }));

        } catch (error) {
            console.error('Error loading profile:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleAIIntegration = () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        showAlert({
            title: 'Coming Soon',
            message: 'We will integrate AI for uploaded proof verification to ensure authenticity.',
            type: 'info'
        });
    };
    const handleSelfPromise = () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        showAlert({
            title: 'Coming Soon',
            message: 'A new module for "Self Promise" where you can track promises alone (no peer team needed).',
            type: 'info'
        });
    };
    const handleWallet = () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        showAlert({
            title: 'Coming Soon',
            message: 'Digital Wallet integration will be available in the next update.',
            type: 'info'
        });
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#5B2DAD" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <GridOverlay />

            <SafeAreaView style={{ flex: 1 }}>
                {/* Executive Header */}
                <View style={styles.header}>
                    <View style={styles.headerIdentity}>
                        <View style={styles.avatarWrapperMini}>
                            <LinearGradient colors={['#5B2DAD', '#818CF8']} style={styles.avatarGradientMini}>
                                <Text style={styles.avatarTxtMini}>{firstName.charAt(0).toUpperCase()}</Text>
                            </LinearGradient>
                            <View style={styles.statusPingMini} />
                        </View>
                        <View style={styles.nameBlockMini}>
                            <Text style={styles.userNameMini}>{profile?.name}</Text>
                            <View style={styles.tierBadgeMini}>
                                <Ionicons name="diamond" size={10} color="#5B2DAD" />
                                <Text style={styles.tierTxtMini}>PREMIUM MEMBER</Text>
                            </View>
                        </View>
                    </View>
                    <TouchableOpacity onPress={() => router.push('/screens/SettingsScreen')} style={styles.settingsBtn}>
                        <Ionicons name="settings-sharp" size={20} color="#5B2DAD" />
                    </TouchableOpacity>
                </View>

                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchProfileData(); }} tintColor="#5B2DAD" />}
                >
                    {/* IDENTITY BLOCK REMOVED (Moved to Header) */}
                    <View style={{ height: scaleFont(10) }} />

                    {/* CORE FINANCIAL DASHBOARD */}
                    <View style={styles.dashboardSection}>
                        <LinearGradient colors={['#FFFFFF', '#F9FAFB']} style={styles.mainCard}>
                            <View style={styles.cardInfo}>
                                <Text style={styles.cardLabel}>TOTAL COMMITMENT</Text>
                                <Text style={[styles.mainNetValue, { color: financials.net >= 0 ? '#0F172A' : '#EF4444' }]}>
                                    ₹{financials.net.toLocaleString()}
                                </Text>
                            </View>

                            <View style={styles.cardFooter}>
                                <View style={styles.footerStat}>
                                    <Text style={styles.footerLabel}>GAINS</Text>
                                    <View style={styles.valueRow}>
                                        <Ionicons name="trending-up" size={18} color="#10B981" />
                                        <Text style={[styles.footerValue, { color: '#10B981' }]}>₹{financials.winnings.toLocaleString()}</Text>
                                    </View>
                                </View>
                                <View style={styles.vDivider} />
                                <View style={styles.footerStat}>
                                    <Text style={styles.footerLabel}>EXITS</Text>
                                    <View style={styles.valueRow}>
                                        <Ionicons name="trending-down" size={18} color="#EF4444" />
                                        <Text style={[styles.footerValue, { color: '#EF4444' }]}>₹{financials.penalties.toLocaleString()}</Text>
                                    </View>
                                </View>
                            </View>
                        </LinearGradient>
                    </View>



                    {/* QUICK ACCESS (Account Integrity) */}
                    <View style={styles.shortcutSection}>
                        <Text style={styles.sectionTitle}>SYSTEM INTEGRITY</Text>
                        <View style={styles.shortcutCard}>
                            {/* AI Integration module */}
                            <TouchableOpacity style={styles.shortcutRow} onPress={handleAIIntegration}>
                                <View style={styles.shortcutLeft}>
                                    <View style={styles.shortIconBg}><Ionicons name="scan-outline" size={20} color="#64748B" /></View>
                                    <View>
                                        <Text style={styles.shortLabel}>AI Proof Verification</Text>
                                        <Text style={{ fontSize: scaleFont(9), color: '#94A3B8', fontFamily: 'Outfit_700Bold' }}>COMING SOON</Text>
                                    </View>
                                </View>
                                <Ionicons name="alert-circle-outline" size={16} color="#CBD5E1" />
                            </TouchableOpacity>
                            {/* Connected accounts module */}
                            <TouchableOpacity style={styles.shortcutRow} onPress={handleWallet}>
                                <View style={styles.shortcutLeft}>
                                    <View style={styles.shortIconBg}><Ionicons name="card-outline" size={20} color="#64748B" /></View>
                                    <View>
                                        <Text style={styles.shortLabel}>Connected Accounts</Text>
                                        <Text style={{ fontSize: scaleFont(9), color: '#94A3B8', fontFamily: 'Outfit_700Bold' }}>COMING SOON</Text>
                                    </View>
                                </View>
                                <Ionicons name="alert-circle-outline" size={16} color="#CBD5E1" />
                            </TouchableOpacity>
                            <View style={styles.hDivider} />
                            {/* Self Promise Module */}
                            <TouchableOpacity style={styles.shortcutRow} onPress={handleSelfPromise}>
                                <View style={styles.shortcutLeft}>
                                    <View style={styles.shortIconBg}><Ionicons name="person-circle-outline" size={20} color="#64748B" /></View>
                                    <View>
                                        <Text style={styles.shortLabel}>Self Promise Module</Text>
                                        <Text style={{ fontSize: scaleFont(9), color: '#94A3B8', fontFamily: 'Outfit_700Bold' }}>COMING SOON</Text>
                                    </View>
                                </View>
                                <Ionicons name="alert-circle-outline" size={16} color="#CBD5E1" />
                            </TouchableOpacity>
                            <View style={styles.hDivider} />
                        </View>
                    </View>

                    <View style={styles.footerInfo}>
                        <Text style={styles.versionTxt}>VERSION 1.0.4 • 2026</Text>
                    </View>
                </ScrollView>
            </SafeAreaView> 
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC' },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    ambientGlow: { position: 'absolute', top: -scaleFont(50), right: -scaleFont(50), width: scaleFont(250), height: scaleFont(250), borderRadius: scaleFont(125), backgroundColor: 'rgba(79, 70, 229, 0.05)', filter: 'blur(60px)' } as any,
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: scaleFont(24),
        paddingTop: Platform.OS === 'android' ? scaleFont(60) : scaleFont(32), // More breathing room
        paddingBottom: scaleFont(20)
    },
    headerIdentity: { flexDirection: 'row', alignItems: 'center', gap: scaleFont(16), flex: 1 },
    avatarWrapperMini: { position: 'relative' },
    avatarGradientMini: { width: scaleFont(52), height: scaleFont(52), borderRadius: scaleFont(20), alignItems: 'center', justifyContent: 'center' },
    avatarTxtMini: { fontSize: scaleFont(20), fontWeight: '900', color: '#FFF', fontFamily: 'Outfit_800ExtraBold' },
    statusPingMini: { position: 'absolute', bottom: 0, right: 0, width: scaleFont(12), height: scaleFont(12), borderRadius: scaleFont(6), backgroundColor: '#10B981', borderWidth: scaleFont(2), borderColor: '#F8FAFC' },
    nameBlockMini: { gap: scaleFont(2) },
    userNameMini: { fontSize: scaleFont(20), fontWeight: '900', color: '#0F172A', letterSpacing: scaleFont(-0.5), fontFamily: 'Outfit_800ExtraBold' },
    tierBadgeMini: { flexDirection: 'row', alignItems: 'center', gap: scaleFont(4) },
    tierTxtMini: { fontSize: scaleFont(10), fontWeight: '800', color: '#64748B', letterSpacing: scaleFont(1), fontFamily: 'Outfit_800ExtraBold' },
    settingsBtn: { width: scaleFont(48), height: scaleFont(48), borderRadius: scaleFont(16), backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: scaleFont(4) }, shadowOpacity: 0.05, shadowRadius: scaleFont(10), elevation: scaleFont(2) },

    scrollContent: { paddingBottom: scaleFont(100) },
    // identitySection removed styles... keeping references minimal or cleaning up if safe:
    identitySection: { display: 'none' }, // Legacy safe


    dashboardSection: { paddingHorizontal: scaleFont(24), marginBottom: scaleFont(20) },
    mainCard: { borderRadius: scaleFont(28), paddingHorizontal: scaleFont(28), paddingVertical: scaleFont(24), minHeight: scaleFont(160), justifyContent: 'center', overflow: 'hidden', borderWidth: 1, borderColor: '#F1F5F9', shadowColor: '#000', shadowOffset: { width: 0, height: scaleFont(8) }, shadowOpacity: 0.05, shadowRadius: scaleFont(15), elevation: scaleFont(3) },
    cardInfo: { alignItems: 'center', marginBottom: scaleFont(24) },
    cardLabel: { fontSize: scaleFont(11), fontWeight: '900', color: '#94A3B8', letterSpacing: scaleFont(1.5), marginBottom: scaleFont(6), fontFamily: 'Outfit_800ExtraBold' },
    mainNetValue: { fontSize: scaleFont(52), fontWeight: '900', letterSpacing: scaleFont(-2.5), fontFamily: 'Outfit_800ExtraBold' },
    cardVisual: { position: 'absolute', right: -scaleFont(30), top: -scaleFont(20), opacity: 0.8 },
    meshPattern: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'transparent', opacity: 0.1 },
    cardIcon: { zIndex: 1 },
    cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingTop: scaleFont(20), paddingBottom: scaleFont(8), borderTopWidth: 1, borderTopColor: '#E2E8F0' },
    footerStat: { flex: 1, alignItems: 'center', paddingVertical: scaleFont(8) },
    footerLabel: { fontSize: scaleFont(11), fontWeight: '800', color: '#64748B', letterSpacing: scaleFont(1.5), marginBottom: scaleFont(6), fontFamily: 'Outfit_800ExtraBold' },
    valueRow: { flexDirection: 'row', alignItems: 'center', gap: scaleFont(6) },
    footerValue: { fontSize: scaleFont(22), fontWeight: '900', fontFamily: 'Outfit_800ExtraBold' },
    vDivider: { width: scaleFont(1), height: scaleFont(40), backgroundColor: '#E2E8F0' },

    metricsContainer: { paddingHorizontal: scaleFont(24), marginBottom: scaleFont(32) },
    sectionTitle: { fontSize: scaleFont(10), fontWeight: '900', color: '#94A3B8', letterSpacing: scaleFont(2), marginBottom: scaleFont(16), fontFamily: 'Outfit_800ExtraBold' },
    metricsRow: { flexDirection: 'row', gap: scaleFont(16) },
    metricBox: { flex: 1, backgroundColor: '#FFF', borderRadius: scaleFont(24), padding: scaleFont(20), borderWidth: 1, borderColor: '#F1F5F9' },
    metricIconBg: { width: scaleFont(44), height: scaleFont(44), borderRadius: scaleFont(16), alignItems: 'center', justifyContent: 'center', marginBottom: scaleFont(16) },
    metricLabel: { fontSize: scaleFont(9), fontWeight: '800', color: '#64748B', letterSpacing: scaleFont(1), marginBottom: scaleFont(4), fontFamily: 'Outfit_800ExtraBold' },
    metricValue: { fontSize: scaleFont(22), fontWeight: '900', color: '#0F172A', fontFamily: 'Outfit_800ExtraBold' },

    shortcutSection: { paddingHorizontal: scaleFont(24), marginBottom: scaleFont(20) },
    shortcutCard: { backgroundColor: '#FFF', borderRadius: scaleFont(24), padding: scaleFont(8), borderWidth: 1, borderColor: '#F1F5F9' },
    shortcutRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: scaleFont(16) },
    shortcutLeft: { flexDirection: 'row', alignItems: 'center', gap: scaleFont(12) },
    shortIconBg: { width: scaleFont(40), height: scaleFont(40), borderRadius: scaleFont(12), backgroundColor: '#F8FAFC', alignItems: 'center', justifyContent: 'center' },
    shortLabel: { fontSize: scaleFont(15), fontWeight: '700', color: '#1E293B', fontFamily: 'Outfit_700Bold' },
    hDivider: { height: scaleFont(1), backgroundColor: '#F8FAFC', marginHorizontal: scaleFont(16) },

    footerInfo: { alignItems: 'center', marginVertical: scaleFont(20), opacity: 0.3 },
    versionTxt: { fontSize: scaleFont(9), fontWeight: '900', color: '#64748B', letterSpacing: scaleFont(1.5), fontFamily: 'Outfit_800ExtraBold' }
});
