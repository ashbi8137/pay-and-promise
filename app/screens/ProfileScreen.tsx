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
import { supabase } from '../../lib/supabase';

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
            {/* Ambient Background Elements */}
            <View style={styles.ambientGlow} />
            <LinearGradient colors={['#F8FAFC', '#F1F5F9']} style={StyleSheet.absoluteFill} />

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
                                        <Ionicons name="caret-up" size={12} color="#10B981" />
                                        <Text style={[styles.footerValue, { color: '#1E293B' }]}>₹{financials.winnings.toLocaleString()}</Text>
                                    </View>
                                </View>
                                <View style={styles.vDivider} />
                                <View style={styles.footerStat}>
                                    <Text style={styles.footerLabel}>EXITS</Text>
                                    <View style={styles.valueRow}>
                                        <Ionicons name="caret-down" size={12} color="#EF4444" />
                                        <Text style={[styles.footerValue, { color: '#1E293B' }]}>₹{financials.penalties.toLocaleString()}</Text>
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
    ambientGlow: { position: 'absolute', top: -50, right: -50, width: 250, height: 250, borderRadius: 125, backgroundColor: 'rgba(79, 70, 229, 0.05)', filter: 'blur(60px)' } as any,
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 24,
        paddingTop: Platform.OS === 'android' ? 68 : 32,
        paddingBottom: 16
    },
    headerGreeting: { fontSize: 11, fontWeight: '900', color: '#94A3B8', letterSpacing: 2 },
    headerDate: { fontSize: 13, fontWeight: '700', color: '#1E293B', marginTop: 2 },
    settingsBtn: { width: 44, height: 44, borderRadius: 15, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 },

    scrollContent: { paddingBottom: 100 },
    identitySection: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, marginVertical: 20, gap: 16 },
    avatarWrapper: { position: 'relative' },
    avatarGradient: { width: 64, height: 64, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
    avatarTxt: { fontSize: 26, fontWeight: '900', color: '#FFF' },
    statusPing: { position: 'absolute', bottom: -2, right: -2, width: 14, height: 14, borderRadius: 7, backgroundColor: '#10B981', borderWidth: 3, borderColor: '#F8FAFC' },
    nameBlock: { flex: 1 },
    userName: { fontSize: 28, fontWeight: '900', color: '#0F172A', letterSpacing: -1 },
    tierBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
    tierTxt: { fontSize: 10, fontWeight: '800', color: '#64748B', letterSpacing: 1 },

    dashboardSection: { paddingHorizontal: 24, marginBottom: 20 },
    mainCard: { borderRadius: 28, paddingHorizontal: 28, paddingVertical: 24, minHeight: 160, justifyContent: 'center', overflow: 'hidden', borderWidth: 1, borderColor: '#F1F5F9', shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.05, shadowRadius: 15, elevation: 3 },
    cardInfo: { alignItems: 'center', marginBottom: 24 },
    cardLabel: { fontSize: 8, fontWeight: '900', color: '#94A3B8', letterSpacing: 1.5, marginBottom: 4 },
    mainNetValue: { fontSize: 52, fontWeight: '900', letterSpacing: -2.5 },
    cardVisual: { position: 'absolute', right: -30, top: -20, opacity: 0.8 },
    meshPattern: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'transparent', opacity: 0.1 },
    cardIcon: { zIndex: 1 },
    cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 16, borderTopWidth: 1, borderTopColor: '#F8FAFC' },
    footerStat: { flex: 1, alignItems: 'center' },
    footerLabel: { fontSize: 7, fontWeight: '900', color: '#CBD5E1', letterSpacing: 1, marginBottom: 2 },
    valueRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    footerValue: { fontSize: 16, fontWeight: '800', color: '#FFF' },
    vDivider: { width: 1, height: 30, backgroundColor: '#F1F5F9' },

    metricsContainer: { paddingHorizontal: 24, marginBottom: 32 },
    sectionTitle: { fontSize: 10, fontWeight: '900', color: '#94A3B8', letterSpacing: 2, marginBottom: 16 },
    metricsRow: { flexDirection: 'row', gap: 16 },
    metricBox: { flex: 1, backgroundColor: '#FFF', borderRadius: 24, padding: 20, borderWidth: 1, borderColor: '#F1F5F9' },
    metricIconBg: { width: 44, height: 44, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
    metricLabel: { fontSize: 9, fontWeight: '800', color: '#64748B', letterSpacing: 1, marginBottom: 4 },
    metricValue: { fontSize: 22, fontWeight: '900', color: '#0F172A' },

    shortcutSection: { paddingHorizontal: 24, marginBottom: 20 },
    shortcutCard: { backgroundColor: '#FFF', borderRadius: 24, padding: 8, borderWidth: 1, borderColor: '#F1F5F9' },
    shortcutRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
    shortcutLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    shortIconBg: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#F8FAFC', alignItems: 'center', justifyContent: 'center' },
    shortLabel: { fontSize: 15, fontWeight: '700', color: '#1E293B' },
    hDivider: { height: 1, backgroundColor: '#F8FAFC', marginHorizontal: 16 },

    footerInfo: { alignItems: 'center', marginVertical: 20, opacity: 0.3 },
    versionTxt: { fontSize: 9, fontWeight: '900', color: '#64748B', letterSpacing: 1.5 }
});
