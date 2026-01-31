import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Linking, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../lib/supabase';

import { useAlert } from '../../context/AlertContext';

export default function PrivacySecurityScreen() {
    const router = useRouter();
    const { showAlert } = useAlert();

    const handleLogout = async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        showAlert({
            title: 'Sign Out',
            message: 'Are you sure you want to sign out from all devices?',
            type: 'warning',
            buttons: [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Sign Out',
                    style: 'destructive',
                    onPress: async () => {
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
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

    const handleChangePassword = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        showAlert({
            title: 'Change Password',
            message: 'To change your password, please sign out and use the "Forgot Password" link on the login screen.',
            type: 'info'
        });
    };

    const handleDataDeletion = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        Linking.openURL('mailto:payandpromise@gmail.com?subject=Data Deletion Request');
    };

    const handlePress = (path: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push(path as any);
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
                    <Text style={styles.headerTitle}>Privacy & Security</Text>
                    <View style={{ width: 44 }} />
                </View>

                <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

                    <View style={styles.card}>
                        <View style={styles.cardHeader}>
                            <View style={[styles.iconBox, { backgroundColor: '#EEF2FF' }]}>
                                <Ionicons name="lock-closed" size={22} color="#4F46E5" />
                            </View>
                            <Text style={styles.cardTitle}>Data Security</Text>
                        </View>
                        <Text style={styles.cardText}>
                            Your data is shielded using enterprise-grade encryption and Supabase Row Level Security. Only you hold the keys to your private ledger.
                        </Text>
                    </View>

                    <View style={styles.card}>
                        <View style={styles.cardHeader}>
                            <View style={[styles.iconBox, { backgroundColor: '#F0FDF4' }]}>
                                <Ionicons name="analytics" size={22} color="#16A34A" />
                            </View>
                            <Text style={styles.cardTitle}>Data Transparency</Text>
                        </View>
                        <Text style={styles.cardText}>
                            We only process essential data. No third-party tracking, no data sales. Your privacy is baked into the protocol.
                        </Text>
                    </View>

                    <View style={styles.card}>
                        <View style={styles.cardHeader}>
                            <View style={[styles.iconBox, { backgroundColor: '#FEF2F2' }]}>
                                <Ionicons name="trash" size={22} color="#EF4444" />
                            </View>
                            <Text style={styles.cardTitle}>Right to Erasure</Text>
                        </View>
                        <Text style={styles.cardText}>
                            You maintain total sovereignty. Request account deletion at any time to permanently purge all data from the protocol ecosystem.
                        </Text>
                    </View>

                    <Text style={styles.sectionHeader}>Access Control</Text>

                    <TouchableOpacity style={styles.actionRow} onPress={handleChangePassword}>
                        <View style={styles.actionLeft}>
                            <Ionicons name="key" size={20} color="#64748B" style={{ marginRight: 12 }} />
                            <Text style={styles.actionText}>Update Credentials</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.actionRow} onPress={handleLogout}>
                        <View style={styles.actionLeft}>
                            <Ionicons name="log-out" size={20} color="#EF4444" style={{ marginRight: 12 }} />
                            <Text style={[styles.actionText, { color: '#EF4444' }]}>Global Sign Out</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={18} color="#FCA5A5" />
                    </TouchableOpacity>

                    <View style={styles.bottomLinks}>
                        <TouchableOpacity style={styles.linkButton} onPress={() => handlePress('/screens/PrivacyPolicyScreen')}>
                            <Text style={styles.linkText}>View Privacy Policy</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={[styles.linkButton, styles.deleteButton]} onPress={handleDataDeletion}>
                            <Text style={[styles.linkText, { color: '#EF4444' }]}>Request Data Deletion</Text>
                        </TouchableOpacity>
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
    card: {
        backgroundColor: '#FFFFFF',
        padding: 20,
        borderRadius: 24,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#F1F5F9',
        shadowColor: '#64748B',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.03,
        shadowRadius: 10,
        elevation: 1,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    iconBox: {
        width: 44,
        height: 44,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    cardTitle: {
        fontSize: 17,
        fontWeight: '700',
        color: '#1E293B',
    },
    cardText: {
        fontSize: 14,
        color: '#64748B',
        lineHeight: 22,
        fontWeight: '500',
    },
    sectionHeader: {
        fontSize: 13,
        fontWeight: '700',
        color: '#94A3B8',
        textTransform: 'uppercase',
        letterSpacing: 1.5,
        marginTop: 20,
        marginBottom: 16,
        marginLeft: 4,
    },
    actionRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        padding: 18,
        borderRadius: 20,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#F1F5F9',
        shadowColor: '#64748B',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.02,
        shadowRadius: 8,
    },
    actionLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    actionText: {
        fontSize: 15,
        fontWeight: '700',
        color: '#1E293B',
    },
    bottomLinks: {
        marginTop: 32,
        marginBottom: 40,
    },
    linkButton: {
        paddingVertical: 18,
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#F1F5F9',
        marginBottom: 12,
    },
    deleteButton: {
        borderColor: '#FEE2E2',
        backgroundColor: '#FFF1F1',
    },
    linkText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#6366F1',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
}) as any;
