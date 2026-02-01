import { Ionicons } from '@expo/vector-icons';
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
import { supabase } from '../../lib/supabase';
import { scaleFont } from '../utils/layout';

const { width } = Dimensions.get('window');

export default function ProfileScreen() {
    const router = useRouter();
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

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#4F46E5" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <GridOverlay />

            <SafeAreaView style={{ flex: 1 }}>
                {/* Executive Header */}
                <View style={styles.header}>
                    <View>
                        <Text style={styles.headerGreeting}>EXECUTIVE COMMAND</Text>
                        <Text style={styles.headerDate}>{new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</Text>
                    </View>
                    <TouchableOpacity onPress={() => router.push('/screens/SettingsScreen')} style={styles.settingsBtn}>
                        <Ionicons name="settings-sharp" size={22} color="#4F46E5" />
                    </TouchableOpacity>
                </View>

                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchProfileData(); }} tintColor="#4F46E5" />}
                >
                    {/* IDENTITY BLOCK */}
                    <View style={styles.identitySection}>
                        <View style={styles.avatarWrapper}>
                            <LinearGradient colors={['#4F46E5', '#818CF8']} style={styles.avatarGradient}>
                                <Text style={styles.avatarTxt}>{firstName.charAt(0).toUpperCase()}</Text>
                            </LinearGradient>
                            <View style={styles.statusPing} />
                        </View>
                        <View style={styles.nameBlock}>
                            <Text style={styles.userName}>{profile?.name}</Text>
                            <View style={styles.tierBadge}>
                                <Ionicons name="diamond" size={10} color="#4F46E5" />
                                <Text style={styles.tierTxt}>PREMIUM PROTOCOL</Text>
                            </View>
                        </View>
                    </View>

                    {/* CORE FINANCIAL DASHBOARD */}
                    <View style={styles.dashboardSection}>
                        <LinearGradient colors={['#FFFFFF', '#F9FAFB']} style={styles.mainCard}>
                            <View style={styles.cardInfo}>
                                <Text style={styles.cardLabel}>TOTAL PROTOCOL VALUATION</Text>
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
                            <TouchableOpacity style={styles.shortcutRow} onPress={() => router.push('/screens/PaymentsScreen')}>
                                <View style={styles.shortcutLeft}>
                                    <View style={styles.shortIconBg}><Ionicons name="card-outline" size={20} color="#64748B" /></View>
                                    <Text style={styles.shortLabel}>Connected Accounts</Text>
                                </View>
                                <Ionicons name="chevron-forward" size={16} color="#CBD5E1" />
                            </TouchableOpacity>
                            <View style={styles.hDivider} />
                            <TouchableOpacity style={styles.shortcutRow} onPress={() => router.push('/screens/PrivacySecurityScreen')}>
                                <View style={styles.shortcutLeft}>
                                    <View style={styles.shortIconBg}><Ionicons name="shield-outline" size={20} color="#64748B" /></View>
                                    <Text style={styles.shortLabel}>Biometric Access</Text>
                                </View>
                                <Ionicons name="chevron-forward" size={16} color="#CBD5E1" />
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={styles.footerInfo}>
                        <Text style={styles.versionTxt}>ESTABLISHED PROTOCOL v1.0.4 • 2026</Text>
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
        paddingTop: Platform.OS === 'android' ? scaleFont(68) : scaleFont(32),
        paddingBottom: scaleFont(16)
    },
    headerGreeting: { fontSize: scaleFont(11), fontWeight: '900', color: '#94A3B8', letterSpacing: scaleFont(2), fontFamily: 'Outfit_800ExtraBold' },
    headerDate: { fontSize: scaleFont(13), fontWeight: '700', color: '#1E293B', marginTop: scaleFont(2), fontFamily: 'Outfit_700Bold' },
    settingsBtn: { width: scaleFont(44), height: scaleFont(44), borderRadius: scaleFont(15), backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: scaleFont(4) }, shadowOpacity: 0.05, shadowRadius: scaleFont(10), elevation: scaleFont(3) },

    scrollContent: { paddingBottom: scaleFont(100) },
    identitySection: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: scaleFont(24), marginVertical: scaleFont(20), gap: scaleFont(16) },
    avatarWrapper: { position: 'relative' },
    avatarGradient: { width: scaleFont(64), height: scaleFont(64), borderRadius: scaleFont(24), alignItems: 'center', justifyContent: 'center' },
    avatarTxt: { fontSize: scaleFont(26), fontWeight: '900', color: '#FFF', fontFamily: 'Outfit_800ExtraBold' },
    statusPing: { position: 'absolute', bottom: -2, right: -2, width: scaleFont(14), height: scaleFont(14), borderRadius: scaleFont(7), backgroundColor: '#10B981', borderWidth: scaleFont(3), borderColor: '#F8FAFC' },
    nameBlock: { flex: 1 },
    userName: { fontSize: scaleFont(28), fontWeight: '900', color: '#0F172A', letterSpacing: scaleFont(-1), fontFamily: 'Outfit_800ExtraBold' },
    tierBadge: { flexDirection: 'row', alignItems: 'center', gap: scaleFont(6), marginTop: scaleFont(4) },
    tierTxt: { fontSize: scaleFont(10), fontWeight: '800', color: '#64748B', letterSpacing: scaleFont(1), fontFamily: 'Outfit_800ExtraBold' },

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
    vDivider: { width: 1, height: scaleFont(40), backgroundColor: '#E2E8F0' },

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
    hDivider: { height: 1, backgroundColor: '#F8FAFC', marginHorizontal: scaleFont(16) },

    footerInfo: { alignItems: 'center', marginVertical: scaleFont(20), opacity: 0.3 },
    versionTxt: { fontSize: scaleFont(9), fontWeight: '900', color: '#64748B', letterSpacing: scaleFont(1.5), fontFamily: 'Outfit_800ExtraBold' }
});
