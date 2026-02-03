import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { Linking, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { GridOverlay } from '../../components/LuxuryVisuals';
import { useAlert } from '../../context/AlertContext';
import { supabase } from '../../lib/supabase';
import { scaleFont } from '../utils/layout';

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

    const handleBiometric = () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        showAlert({
            title: 'Coming Soon',
            message: 'Biometric login (FaceID/TouchID) will be available in the next update.',
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
                    <Text style={styles.headerTitle}>Privacy & Security</Text>
                    <View style={{ width: scaleFont(44) }} />
                </View>

                <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

                    <View style={styles.card}>
                        <View style={styles.cardHeader}>
                            <View style={[styles.iconBox, { backgroundColor: '#EEF2FF' }]}>
                                <Ionicons name="lock-closed" size={scaleFont(22)} color="#5B2DAD" />
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
                                <Ionicons name="analytics" size={scaleFont(22)} color="#16A34A" />
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
                                <Ionicons name="trash" size={scaleFont(22)} color="#EF4444" />
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
                            <Ionicons name="key" size={scaleFont(20)} color="#64748B" style={{ marginRight: scaleFont(12) }} />
                            <Text style={styles.actionText}>Update Credentials</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={scaleFont(18)} color="#CBD5E1" />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.actionRow} onPress={handleBiometric}>
                        <View style={styles.actionLeft}>
                            <Ionicons name="finger-print" size={scaleFont(20)} color="#64748B" style={{ marginRight: scaleFont(12) }} />
                            <Text style={styles.actionText}>Biometric Access</Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Text style={{ fontSize: scaleFont(10), color: '#94A3B8', marginRight: scaleFont(8), fontFamily: 'Outfit_700Bold' }}>COMING SOON</Text>
                            <Ionicons name="toggle" size={scaleFont(24)} color="#CBD5E1" />
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.actionRow} onPress={handleLogout}>
                        <View style={styles.actionLeft}>
                            <Ionicons name="log-out" size={scaleFont(20)} color="#EF4444" style={{ marginRight: scaleFont(12) }} />
                            <Text style={[styles.actionText, { color: '#EF4444' }]}>Global Sign Out</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={scaleFont(18)} color="#FCA5A5" />
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
    card: {
        backgroundColor: '#FFFFFF',
        padding: scaleFont(20),
        borderRadius: scaleFont(24),
        marginBottom: scaleFont(16),
        borderWidth: 1,
        borderColor: '#F1F5F9',
        shadowColor: '#64748B',
        shadowOffset: { width: 0, height: scaleFont(4) },
        shadowOpacity: 0.03,
        shadowRadius: scaleFont(10),
        elevation: scaleFont(1),
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: scaleFont(16),
    },
    iconBox: {
        width: scaleFont(44),
        height: scaleFont(44),
        borderRadius: scaleFont(12),
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: scaleFont(16),
    },
    cardTitle: {
        fontSize: scaleFont(17),
        fontWeight: '700',
        color: '#1E293B',
        fontFamily: 'Outfit_700Bold',
    },
    cardText: {
        fontSize: scaleFont(14),
        color: '#64748B',
        lineHeight: scaleFont(22),
        fontWeight: '500',
        fontFamily: 'Outfit_400Regular',
    },
    sectionHeader: {
        fontSize: scaleFont(13),
        fontWeight: '700',
        color: '#94A3B8',
        textTransform: 'uppercase',
        letterSpacing: scaleFont(1.5),
        marginTop: scaleFont(20),
        marginBottom: scaleFont(16),
        marginLeft: scaleFont(4),
        fontFamily: 'Outfit_700Bold',
    },
    actionRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        padding: scaleFont(18),
        borderRadius: scaleFont(20),
        marginBottom: scaleFont(12),
        borderWidth: 1,
        borderColor: '#F1F5F9',
        shadowColor: '#64748B',
        shadowOffset: { width: 0, height: scaleFont(4) },
        shadowOpacity: 0.02,
        shadowRadius: scaleFont(8),
    },
    actionLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    actionText: {
        fontSize: scaleFont(15),
        fontWeight: '700',
        color: '#1E293B',
        fontFamily: 'Outfit_700Bold',
    },
    bottomLinks: {
        marginTop: scaleFont(32),
        marginBottom: scaleFont(40),
    },
    linkButton: {
        paddingVertical: scaleFont(18),
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: scaleFont(20),
        borderWidth: 1,
        borderColor: '#F1F5F9',
        marginBottom: scaleFont(12),
    },
    deleteButton: {
        borderColor: '#FEE2E2',
        backgroundColor: '#FFF1F1',
    },
    linkText: {
        fontSize: scaleFont(14),
        fontWeight: '700',
        color: '#6366F1',
        textTransform: 'uppercase',
        letterSpacing: scaleFont(1),
        fontFamily: 'Outfit_700Bold',
    },
}) as any;
