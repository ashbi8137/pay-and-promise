import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Platform, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { GridOverlay } from '../../components/LuxuryVisuals';
import { useAlert } from '../../context/AlertContext';
import { supabase } from '../../lib/supabase';
import { scaleFont } from '../../utils/layout';

export default function SettingsScreen() {
    const router = useRouter();
    const { showAlert } = useAlert();

    const navigateTo = (path: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push(path as any);
    };

    const handleLogout = async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        showAlert({
            title: 'Sign Out',
            message: 'Are you sure you want to sign out of your protocol session?',
            type: 'warning',
            buttons: [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Sign Out',
                    style: 'destructive',
                    onPress: async () => {
                        const { error } = await supabase.auth.signOut();
                        if (error) {
                            showAlert({
                                title: 'Error',
                                message: error.message,
                                type: 'error'
                            });
                        } else {
                            router.replace('/screens/AuthScreen');
                        }
                    }
                }
            ]
        });
    };

    return (
        <View style={styles.container}>
            <GridOverlay />
            <SafeAreaView style={{ flex: 1 }}>
                <View style={styles.header}>
                    <TouchableOpacity
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            router.back();
                        }}
                        style={styles.backButton}
                    >
                        <Ionicons name="chevron-back" size={scaleFont(24)} color="#0F172A" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Settings</Text>
                    <View style={{ width: scaleFont(44) }} />
                </View>

                <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                    <Text style={styles.sectionTitle}>General</Text>

                    {/* Payments */}
                    <TouchableOpacity style={styles.row} onPress={() => navigateTo('/screens/PaymentsScreen')}>
                        <View style={styles.rowLeft}>
                            <View style={[styles.iconContainer, { backgroundColor: '#EEF2FF' }]}>
                                <Ionicons name="card" size={scaleFont(22)} color="#5B2DAD" />
                            </View>
                            <View>
                                <Text style={styles.rowLabel}>Payments</Text>
                                <Text style={styles.rowSubLabel}>Manage methods and transactions</Text>
                            </View>
                        </View>
                        <Ionicons name="chevron-forward" size={scaleFont(20)} color="#CBD5E1" />
                    </TouchableOpacity>

                    {/* Privacy & Security */}
                    <TouchableOpacity style={styles.row} onPress={() => navigateTo('/screens/PrivacySecurityScreen')}>
                        <View style={styles.rowLeft}>
                            <View style={[styles.iconContainer, { backgroundColor: '#F0FDF4' }]}>
                                <Ionicons name="shield-checkmark" size={scaleFont(22)} color="#16A34A" />
                            </View>
                            <View>
                                <Text style={styles.rowLabel}>Privacy & Security</Text>
                                <Text style={styles.rowSubLabel}>Security and data preferences</Text>
                            </View>
                        </View>
                        <Ionicons name="chevron-forward" size={scaleFont(20)} color="#CBD5E1" />
                    </TouchableOpacity>

                    <Text style={[styles.sectionTitle, { marginTop: scaleFont(24) }]}>Support</Text>

                    {/* Help & Support */}
                    <TouchableOpacity style={styles.row} onPress={() => navigateTo('/screens/SupportScreen')}>
                        <View style={styles.rowLeft}>
                            <View style={[styles.iconContainer, { backgroundColor: '#FFF7ED' }]}>
                                <Ionicons name="help-circle" size={scaleFont(22)} color="#F97316" />
                            </View>
                            <View>
                                <Text style={styles.rowLabel}>Help & Support</Text>
                                <Text style={styles.rowSubLabel}>FAQs and direct assistance</Text>
                            </View>
                        </View>
                        <Ionicons name="chevron-forward" size={scaleFont(20)} color="#CBD5E1" />
                    </TouchableOpacity>

                    {/* About Pay & Promise */}
                    <TouchableOpacity style={styles.row} onPress={() => navigateTo('/screens/AboutScreen')}>
                        <View style={styles.rowLeft}>
                            <View style={[styles.iconContainer, { backgroundColor: '#F8FAFC' }]}>
                                <Ionicons name="information-circle" size={scaleFont(22)} color="#64748B" />
                            </View>
                            <View>
                                <Text style={styles.rowLabel}>About</Text>
                                <Text style={styles.rowSubLabel}>Versions and team info</Text>
                            </View>
                        </View>
                        <Ionicons name="chevron-forward" size={scaleFont(20)} color="#CBD5E1" />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
                        <LinearGradient
                            colors={['#FFFFFF', '#F8FAFC']}
                            style={styles.logoutGradient}
                        >
                            <Ionicons name="log-out-outline" size={scaleFont(22)} color="#EF4444" />
                            <Text style={styles.logoutBtnText}>Sign Out Account</Text>
                        </LinearGradient>
                    </TouchableOpacity>

                    <View style={styles.footer}>
                        <Text style={styles.footerText}>Pay & Promise v1.0.0</Text>
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
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: scaleFont(20),
        paddingTop: Platform.OS === 'android' ? scaleFont(40) : scaleFont(10),
        paddingBottom: scaleFont(20),
    },
    backButton: {
        width: scaleFont(44),
        height: scaleFont(44),
        borderRadius: scaleFont(12),
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#F1F5F9',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: scaleFont(2) },
        shadowOpacity: 0.05,
        shadowRadius: scaleFont(4),
        elevation: scaleFont(2),
    },
    headerTitle: {
        fontSize: scaleFont(18),
        fontWeight: '800',
        color: '#0F172A',
        letterSpacing: scaleFont(-0.5),
        fontFamily: 'Outfit_800ExtraBold',
    },
    content: {
        padding: scaleFont(20),
    },
    sectionTitle: {
        fontSize: scaleFont(13),
        fontWeight: '700',
        color: '#94A3B8',
        textTransform: 'uppercase',
        letterSpacing: scaleFont(1.5),
        marginBottom: scaleFont(16),
        marginLeft: scaleFont(4),
        fontFamily: 'Outfit_700Bold',
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#FFFFFF',
        padding: scaleFont(16),
        borderRadius: scaleFont(20),
        marginBottom: scaleFont(12),
        borderWidth: 1,
        borderColor: '#F1F5F9',
        shadowColor: '#64748B',
        shadowOffset: { width: 0, height: scaleFont(4) },
        shadowOpacity: 0.04,
        shadowRadius: scaleFont(10),
        elevation: scaleFont(1),
    },
    rowLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconContainer: {
        width: scaleFont(48),
        height: scaleFont(48),
        borderRadius: scaleFont(14),
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: scaleFont(16),
    },
    rowLabel: {
        fontSize: scaleFont(16),
        fontWeight: '700',
        color: '#1E293B',
        fontFamily: 'Outfit_700Bold',
    },
    rowSubLabel: {
        fontSize: scaleFont(12),
        color: '#94A3B8',
        marginTop: scaleFont(2),
        fontFamily: 'Outfit_400Regular',
    },
    logoutBtn: {
        marginTop: scaleFont(40),
        borderRadius: scaleFont(20),
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#FEE2E2',
        shadowColor: '#EF4444',
        shadowOffset: { width: 0, height: scaleFont(4) },
        shadowOpacity: 0.05,
        shadowRadius: scaleFont(12),
        elevation: scaleFont(2),
    },
    logoutGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: scaleFont(18),
        gap: scaleFont(10),
    } as any,
    logoutBtnText: {
        fontSize: scaleFont(16),
        fontWeight: '700',
        color: '#EF4444',
        marginLeft: scaleFont(8),
        fontFamily: 'Outfit_700Bold',
    },
    footer: {
        marginTop: scaleFont(40),
        alignItems: 'center',
        paddingBottom: scaleFont(20),
    },
    footerText: {
        fontSize: scaleFont(12),
        fontWeight: '700',
        color: '#94A3B8',
        textTransform: 'uppercase',
        letterSpacing: scaleFont(1),
        fontFamily: 'Outfit_700Bold',
    },
    footerSubText: {
        fontSize: scaleFont(12),
        color: '#CBD5E1',
        marginTop: scaleFont(4),
        fontFamily: 'Outfit_400Regular',
    },
});
