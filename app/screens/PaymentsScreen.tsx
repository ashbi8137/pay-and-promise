import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    Platform,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useAlert } from '../../context/AlertContext';
import { supabase } from '../../lib/supabase';

const { width } = Dimensions.get('window');

export default function PaymentsScreen() {
    const router = useRouter();
    const { showAlert } = useAlert();
    const [loading, setLoading] = useState(true);
    const [upiId, setUpiId] = useState('');
    const [savingUpi, setSavingUpi] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [isFirstTime, setIsFirstTime] = useState(false);

    useFocusEffect(
        React.useCallback(() => {
            fetchUpiData();
        }, [])
    );

    const fetchUpiData = async () => {
        try {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: profileData } = await supabase
                .from('profiles')
                .select('upi_id')
                .eq('id', user.id)
                .single();

            if (profileData?.upi_id) {
                setUpiId(profileData.upi_id);
                setIsEditing(false);
                setIsFirstTime(false);
            } else {
                setUpiId('');
                setIsEditing(true);
                setIsFirstTime(true);
            }
        } catch (error) {
            console.error('Error loading UPI data:', error);
        } finally {
            setLoading(false);
        }
    };

    const saveUpiId = async () => {
        if (!upiId.trim() || !upiId.includes('@')) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            showAlert({
                title: "Invalid UPI ID",
                message: "Please enter a valid UPI ID (e.g. name@bank) to receive protocol winnings.",
                type: "warning"
            });
            return;
        }

        setSavingUpi(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { error } = await supabase
                .from('profiles')
                .update({ upi_id: upiId })
                .eq('id', user.id);

            if (error) throw error;

            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setIsEditing(false);
            setIsFirstTime(false);
        } catch (err) {
            showAlert({
                title: "Protocol Error",
                message: "We encountered an issue saving your digital identity. Please try again.",
                type: "error"
            });
        } finally {
            setSavingUpi(false);
        }
    };

    const getMaskedUpi = (id: string) => {
        if (!id) return '••••••••••••';
        const parts = id.split('@');
        if (parts.length !== 2) return id;
        const [userPart, domainPart] = parts;
        const visible = userPart.slice(0, 3);
        return visible + '•••••@' + domainPart;
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.centerContent}>
                    <ActivityIndicator size="large" color="#4F46E5" />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="chevron-back" size={24} color="#1E293B" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Digital Wallet</Text>
                <View style={{ width: 44 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                <Animated.View entering={FadeInUp} style={styles.walletCard}>
                    <LinearGradient
                        colors={['#1E293B', '#0F172A']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={StyleSheet.absoluteFill}
                    />
                    <View style={styles.cardHeader}>
                        <View style={styles.chip} />
                        <Ionicons name="radio-outline" size={32} color="rgba(255,255,255,0.2)" />
                    </View>

                    <View style={styles.upiContainer}>
                        <Text style={styles.cardLabel}>UPI ID / VPA</Text>
                        <Text style={styles.upiValue}>{isEditing ? 'SETTING UP...' : getMaskedUpi(upiId)}</Text>
                    </View>

                    <View style={styles.cardFooter}>
                        <View>
                            <Text style={styles.footerLabel}>STATUS</Text>
                            <View style={styles.statusRow}>
                                <View style={[styles.statusDot, { backgroundColor: upiId ? '#10B981' : '#F59E0B' }]} />
                                <Text style={styles.statusText}>{upiId ? 'Verified' : 'Pending'}</Text>
                            </View>
                        </View>
                        <Ionicons name="shield-checkmark" size={24} color="rgba(255,255,255,0.3)" />
                    </View>
                </Animated.View>

                <Animated.View entering={FadeInDown.delay(200)} style={styles.formSection}>
                    <View style={styles.infoCard}>
                        <Ionicons name="information-circle" size={24} color="#4F46E5" />
                        <View style={{ flex: 1 }}>
                            <Text style={styles.infoTitle}>Peer-to-Peer Payments</Text>
                            <Text style={styles.infoSub}>Your UPI ID is shared only with members of promises you join to enable direct settlements.</Text>
                        </View>
                    </View>

                    {!isEditing ? (
                        <TouchableOpacity style={styles.editCardBtn} onPress={() => setIsEditing(true)}>
                            <Text style={styles.editCardBtnText}>Update Payment Identity</Text>
                            <Ionicons name="pencil-outline" size={18} color="#4F46E5" />
                        </TouchableOpacity>
                    ) : (
                        <View style={styles.editPanel}>
                            <Text style={styles.inputLabel}>Enter UPI ID</Text>
                            <View style={styles.inputWrapper}>
                                <Ionicons name="at" size={20} color="#94A3B8" style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    value={upiId}
                                    onChangeText={(v) => setUpiId(v.toLowerCase())}
                                    placeholder="yourname@bank"
                                    placeholderTextColor="#94A3B8"
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                />
                            </View>

                            <View style={styles.actionRow}>
                                {!isFirstTime && (
                                    <TouchableOpacity style={styles.cancelBtn} onPress={() => setIsEditing(false)}>
                                        <Text style={styles.cancelBtnText}>Discard</Text>
                                    </TouchableOpacity>
                                )}
                                <TouchableOpacity
                                    style={[styles.saveBtn, savingUpi && { opacity: 0.7 }]}
                                    onPress={saveUpiId}
                                    disabled={savingUpi}
                                >
                                    {savingUpi ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveBtnText}>Save Identity</Text>}
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}

                    <View style={styles.securityBadge}>
                        <Ionicons name="lock-closed" size={12} color="#94A3B8" />
                        <Text style={styles.securityText}>End-to-End Encrypted Verification</Text>
                    </View>
                </Animated.View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFFFFF' },
    centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: Platform.OS === 'android' ? 40 : 10, paddingBottom: 20 },
    backButton: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: 16, fontWeight: '700', color: '#1E293B' },
    content: { padding: 24 },
    // WALLET CARD
    walletCard: { height: 200, borderRadius: 28, overflow: 'hidden', padding: 24, justifyContent: 'space-between', elevation: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 15 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    chip: { width: 48, height: 36, backgroundColor: '#F1F5F9', borderRadius: 8, opacity: 0.8 },
    upiContainer: { gap: 4 },
    cardLabel: { fontSize: 10, fontWeight: '800', color: 'rgba(255,255,255,0.4)', letterSpacing: 1.5, textTransform: 'uppercase' },
    upiValue: { fontSize: 24, fontWeight: '700', color: '#FFF', letterSpacing: 1, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
    cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
    footerLabel: { fontSize: 9, fontWeight: '900', color: 'rgba(255,255,255,0.4)', letterSpacing: 1, marginBottom: 4 },
    statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    statusDot: { width: 8, height: 8, borderRadius: 4 },
    statusText: { fontSize: 12, fontWeight: '600', color: '#FFF' },
    // FORM
    formSection: { marginTop: 40, gap: 24 },
    infoCard: { flexDirection: 'row', backgroundColor: '#F8FAFC', padding: 20, borderRadius: 24, gap: 16, borderWidth: 1, borderColor: '#F1F5F9' },
    infoTitle: { fontSize: 15, fontWeight: '800', color: '#1E293B', marginBottom: 4 },
    infoSub: { fontSize: 13, color: '#64748B', lineHeight: 18 },
    editCardBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#EEF2FF', paddingVertical: 18, borderRadius: 20, gap: 10, borderWidth: 1, borderColor: '#C7D2FE' },
    editCardBtnText: { color: '#4F46E5', fontSize: 15, fontWeight: '800' },
    editPanel: { gap: 16 },
    inputLabel: { fontSize: 12, fontWeight: '800', color: '#94A3B8', letterSpacing: 1, textTransform: 'uppercase' },
    inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0', paddingHorizontal: 16 },
    inputIcon: { marginRight: 12 },
    input: { flex: 1, paddingVertical: 16, fontSize: 16, fontWeight: '700', color: '#1E293B' },
    actionRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
    cancelBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 16, backgroundColor: '#F1F5F9' },
    cancelBtnText: { fontSize: 14, fontWeight: '700', color: '#64748B' },
    saveBtn: { flex: 2, alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 16, backgroundColor: '#4F46E5' },
    saveBtnText: { fontSize: 14, fontWeight: '800', color: '#FFF' },
    securityBadge: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, opacity: 0.6 },
    securityText: { fontSize: 11, fontWeight: '700', color: '#94A3B8' }
});
