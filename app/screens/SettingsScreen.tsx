import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Platform, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAlert } from '../../context/AlertContext';
import { supabase } from '../../lib/supabase';

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
            <LinearGradient
                colors={['#F8FAFC', '#F1F5F9']}
                style={StyleSheet.absoluteFill}
            />
            <SafeAreaView style={{ flex: 1 }}>
                <View style={styles.header}>
                    <TouchableOpacity
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            router.back();
                        }}
                        style={styles.backButton}
                    >
                        <Ionicons name="chevron-back" size={24} color="#0F172A" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Settings</Text>
                    <View style={{ width: 44 }} />
                </View>

                <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                    <Text style={styles.sectionTitle}>General</Text>

                    {/* Payments */}
                    <TouchableOpacity style={styles.row} onPress={() => navigateTo('/screens/PaymentsScreen')}>
                        <View style={styles.rowLeft}>
                            <View style={[styles.iconContainer, { backgroundColor: '#EEF2FF' }]}>
                                <Ionicons name="card" size={22} color="#4F46E5" />
                            </View>
                            <View>
                                <Text style={styles.rowLabel}>Payments</Text>
                                <Text style={styles.rowSubLabel}>Manage methods and transactions</Text>
                            </View>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
                    </TouchableOpacity>

                    {/* Privacy & Security */}
                    <TouchableOpacity style={styles.row} onPress={() => navigateTo('/screens/PrivacySecurityScreen')}>
                        <View style={styles.rowLeft}>
                            <View style={[styles.iconContainer, { backgroundColor: '#F0FDF4' }]}>
                                <Ionicons name="shield-checkmark" size={22} color="#16A34A" />
                            </View>
                            <View>
                                <Text style={styles.rowLabel}>Privacy & Security</Text>
                                <Text style={styles.rowSubLabel}>Security and data preferences</Text>
                            </View>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
                    </TouchableOpacity>

                    <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Support</Text>

                    {/* Help & Support */}
                    <TouchableOpacity style={styles.row} onPress={() => navigateTo('/screens/SupportScreen')}>
                        <View style={styles.rowLeft}>
                            <View style={[styles.iconContainer, { backgroundColor: '#FFF7ED' }]}>
                                <Ionicons name="help-circle" size={22} color="#F97316" />
                            </View>
                            <View>
                                <Text style={styles.rowLabel}>Help & Support</Text>
                                <Text style={styles.rowSubLabel}>FAQs and direct assistance</Text>
                            </View>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
                    </TouchableOpacity>

                    {/* About Pay & Promise */}
                    <TouchableOpacity style={styles.row} onPress={() => navigateTo('/screens/AboutScreen')}>
                        <View style={styles.rowLeft}>
                            <View style={[styles.iconContainer, { backgroundColor: '#F8FAFC' }]}>
                                <Ionicons name="information-circle" size={22} color="#64748B" />
                            </View>
                            <View>
                                <Text style={styles.rowLabel}>About</Text>
                                <Text style={styles.rowSubLabel}>Versions and team info</Text>
                            </View>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
                        <LinearGradient
                            colors={['#FFFFFF', '#F8FAFC']}
                            style={styles.logoutGradient}
                        >
                            <Ionicons name="log-out-outline" size={22} color="#EF4444" />
                            <Text style={styles.logoutBtnText}>Sign Out Account</Text>
                        </LinearGradient>
                    </TouchableOpacity>

                    <View style={styles.footer}>
                        <Text style={styles.footerText}>Pay & Promise v1.0.0</Text>
                        <Text style={styles.footerSubText}>Thank you for being part of our protocol.</Text>
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
        paddingHorizontal: 20,
        paddingTop: Platform.OS === 'android' ? 40 : 10,
        paddingBottom: 20,
    },
    backButton: {
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
    content: {
        padding: 20,
    },
    sectionTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: '#94A3B8',
        textTransform: 'uppercase',
        letterSpacing: 1.5,
        marginBottom: 16,
        marginLeft: 4,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#FFFFFF',
        padding: 16,
        borderRadius: 20,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#F1F5F9',
        shadowColor: '#64748B',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.04,
        shadowRadius: 10,
        elevation: 1,
    },
    rowLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    rowLabel: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1E293B',
    },
    rowSubLabel: {
        fontSize: 12,
        color: '#94A3B8',
        marginTop: 2,
    },
    logoutBtn: {
        marginTop: 40,
        borderRadius: 20,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#FEE2E2',
        shadowColor: '#EF4444',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
        elevation: 2,
    },
    logoutGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 18,
        gap: 10,
    } as any,
    logoutBtnText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#EF4444',
        marginLeft: 8,
    },
    footer: {
        marginTop: 40,
        alignItems: 'center',
        paddingBottom: 20,
    },
    footerText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#94A3B8',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    footerSubText: {
        fontSize: 12,
        color: '#CBD5E1',
        marginTop: 4,
    },
}) as any;
