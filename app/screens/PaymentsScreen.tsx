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
import { GridOverlay } from '../../components/LuxuryVisuals';
import { useAlert } from '../../context/AlertContext';
import { supabase } from '../../lib/supabase';
import { scaleFont } from '../../utils/layout';

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
                    <ActivityIndicator size="large" color="#5B2DAD" />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <View style={styles.container}>
            <GridOverlay />
            <SafeAreaView style={{ flex: 1 }}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Ionicons name="chevron-back" size={24} color="#1E293B" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Digital Wallet</Text>
                    <View style={{ width: scaleFont(44) }} />
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
                                    <View style={[styles.statusDot, { backgroundColor: (upiId && !isEditing) ? '#10B981' : '#F59E0B' }]} />
                                    <Text style={styles.statusText}>{(upiId && !isEditing) ? 'Verified' : 'Pending'}</Text>
                                </View>
                            </View>
                            <Ionicons name="shield-checkmark" size={24} color="rgba(255,255,255,0.3)" />
                        </View>
                    </Animated.View>

                    <Animated.View entering={FadeInDown.delay(200)} style={styles.formSection}>


                        {!isEditing ? (
                            <TouchableOpacity style={styles.editCardBtn} onPress={() => setIsEditing(true)}>
                                <Text style={styles.editCardBtnText}>Update Payment Identity</Text>
                                <Ionicons name="pencil-outline" size={18} color="#5B2DAD" />
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

                        <View style={styles.infoCard}>
                            <Ionicons name="information-circle" size={24} color="#5B2DAD" />
                            <View style={{ flex: 1 }}>
                                <Text style={styles.infoTitle}>Peer-to-Peer Payments</Text>
                                <Text style={styles.infoSub}>Your UPI ID is shared only with members of promises you join to enable direct settlements.</Text>
                            </View>
                        </View>

                        <View style={styles.securityBadge}>
                            <Ionicons name="lock-closed" size={12} color="#94A3B8" />
                            <Text style={styles.securityText}>End-to-End Encrypted Verification</Text>
                        </View>
                    </Animated.View>
                </ScrollView>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFFFFF' },
    centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: scaleFont(20), paddingTop: Platform.OS === 'android' ? scaleFont(40) : scaleFont(10), paddingBottom: scaleFont(20) },
    backButton: { width: scaleFont(44), height: scaleFont(44), borderRadius: scaleFont(12), backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: scaleFont(16), fontWeight: '700', color: '#1E293B', fontFamily: 'Outfit_700Bold' },
    content: { padding: scaleFont(24) },
    // WALLET CARD
    walletCard: { height: scaleFont(200), borderRadius: scaleFont(28), overflow: 'hidden', padding: scaleFont(24), justifyContent: 'space-between', elevation: scaleFont(12), shadowColor: '#000', shadowOffset: { width: 0, height: scaleFont(10) }, shadowOpacity: 0.3, shadowRadius: scaleFont(15) },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    chip: { width: scaleFont(48), height: scaleFont(36), backgroundColor: '#F1F5F9', borderRadius: scaleFont(8), opacity: 0.8 },
    upiContainer: { gap: scaleFont(4) },
    cardLabel: { fontSize: scaleFont(10), fontWeight: '800', color: 'rgba(255,255,255,0.4)', letterSpacing: scaleFont(1.5), textTransform: 'uppercase', fontFamily: 'Outfit_800ExtraBold' },
    upiValue: { fontSize: scaleFont(24), fontWeight: '700', color: '#FFF', letterSpacing: scaleFont(1), fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
    cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
    footerLabel: { fontSize: scaleFont(9), fontWeight: '900', color: 'rgba(255,255,255,0.4)', letterSpacing: scaleFont(1), marginBottom: scaleFont(4), fontFamily: 'Outfit_800ExtraBold' },
    statusRow: { flexDirection: 'row', alignItems: 'center', gap: scaleFont(6) },
    statusDot: { width: scaleFont(8), height: scaleFont(8), borderRadius: scaleFont(4) },
    statusText: { fontSize: scaleFont(12), fontWeight: '600', color: '#FFF', fontFamily: 'Outfit_700Bold' },
    // FORM
    formSection: { marginTop: scaleFont(40), gap: scaleFont(24) },
    infoCard: { flexDirection: 'row', backgroundColor: '#F8FAFC', padding: scaleFont(20), borderRadius: scaleFont(24), gap: scaleFont(16), borderWidth: 1, borderColor: '#F1F5F9' },
    infoTitle: { fontSize: scaleFont(15), fontWeight: '800', color: '#1E293B', marginBottom: scaleFont(4), fontFamily: 'Outfit_800ExtraBold' },
    infoSub: { fontSize: scaleFont(13), color: '#64748B', lineHeight: scaleFont(18), fontFamily: 'Outfit_400Regular' },
    editCardBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#EEF2FF', paddingVertical: scaleFont(18), borderRadius: scaleFont(20), gap: scaleFont(10), borderWidth: 1, borderColor: '#C7D2FE' },
    editCardBtnText: { color: '#5B2DAD', fontSize: scaleFont(15), fontWeight: '800', fontFamily: 'Outfit_800ExtraBold' },
    editPanel: { gap: scaleFont(16) },
    inputLabel: { fontSize: scaleFont(12), fontWeight: '800', color: '#94A3B8', letterSpacing: scaleFont(1), textTransform: 'uppercase', fontFamily: 'Outfit_800ExtraBold' },
    inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: scaleFont(16), borderWidth: 1, borderColor: '#E2E8F0', paddingHorizontal: scaleFont(16) },
    inputIcon: { marginRight: scaleFont(12) },
    input: { flex: 1, paddingVertical: scaleFont(16), fontSize: scaleFont(16), fontWeight: '700', color: '#1E293B', fontFamily: 'Outfit_700Bold' },
    actionRow: { flexDirection: 'row', gap: scaleFont(12), marginTop: scaleFont(8) },
    cancelBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: scaleFont(16), borderRadius: scaleFont(16), backgroundColor: '#F1F5F9' },
    cancelBtnText: { fontSize: scaleFont(14), fontWeight: '700', color: '#64748B', fontFamily: 'Outfit_700Bold' },
    saveBtn: { flex: 2, alignItems: 'center', justifyContent: 'center', paddingVertical: scaleFont(16), borderRadius: scaleFont(16), backgroundColor: '#5B2DAD' },
    saveBtnText: { fontSize: scaleFont(14), fontWeight: '800', color: '#FFF', fontFamily: 'Outfit_800ExtraBold' },
    securityBadge: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: scaleFont(6), opacity: 0.6 },
    securityText: { fontSize: scaleFont(11), fontWeight: '700', color: '#94A3B8', fontFamily: 'Outfit_700Bold' }
});
