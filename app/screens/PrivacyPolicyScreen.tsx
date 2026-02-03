import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { Platform, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { GridOverlay } from '../../components/LuxuryVisuals';
import { scaleFont } from '../utils/layout';

export default function PrivacyPolicyScreen() {
    const router = useRouter();

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
                        <Ionicons name="chevron-back" size={scaleFont(24)} color="#1E293B" />
                    </TouchableOpacity>
                    <View style={styles.headerText}>
                        <Text style={styles.headerSubtitle}>PROTOCOL GUIDELINES</Text>
                        <Text style={styles.headerTitle}>Privacy Policy</Text>
                    </View>
                    <View style={{ width: scaleFont(44) }} />
                </View>

                <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                    <View style={styles.infoBox}>
                        <Text style={styles.lastUpdated}>Effective Date: January 2026</Text>

                        <View style={styles.section}>
                            <View style={styles.sectionHeader}>
                                <View style={[styles.sectionIcon, { backgroundColor: '#EEF2FF' }]}>
                                    <Ionicons name="shield-checkmark" size={scaleFont(18)} color="#5B2DAD" />
                                </View>
                                <Text style={styles.sectionTitle}>1. Data Collection</Text>
                            </View>
                            <Text style={styles.policyText}>
                                We collect minimal data: your name, email, and the commitments you make within the protocol. This data is essential for peer verification and the settlement system.
                            </Text>
                        </View>

                        <View style={styles.section}>
                            <View style={styles.sectionHeader}>
                                <View style={[styles.sectionIcon, { backgroundColor: '#F0FDF4' }]}>
                                    <Ionicons name="eye-off" size={scaleFont(18)} color="#16A34A" />
                                </View>
                                <Text style={styles.sectionTitle}>2. Use of Data</Text>
                            </View>
                            <Text style={styles.policyText}>
                                Your data is used solely to facilitate the "Pay & Promise" mechanism. We do not sell, rent, or trade your personal information to third parties.
                            </Text>
                        </View>

                        <View style={styles.section}>
                            <View style={styles.sectionHeader}>
                                <View style={[styles.sectionIcon, { backgroundColor: '#FFF7ED' }]}>
                                    <Ionicons name="finger-print" size={scaleFont(18)} color="#F97316" />
                                </View>
                                <Text style={styles.sectionTitle}>3. Security</Text>
                            </View>
                            <Text style={styles.policyText}>
                                All transactions and sensitive data are protected by industry-standard encryption and Row Level Security on our servers.
                            </Text>
                        </View>

                        <View style={styles.section}>
                            <View style={styles.sectionHeader}>
                                <View style={[styles.sectionIcon, { backgroundColor: '#FEF2F2' }]}>
                                    <Ionicons name="person-circle" size={scaleFont(18)} color="#EF4444" />
                                </View>
                                <Text style={styles.sectionTitle}>4. Your Rights</Text>
                            </View>
                            <Text style={styles.policyText}>
                                You have the right to access, rectify, or delete your data at any time. For a full data purge, please use the "Request Data Deletion" tool in Security settings.
                            </Text>
                        </View>
                    </View>

                    <View style={styles.footer}>
                        <Ionicons name="infinite" size={scaleFont(16)} color="#CBD5E1" />
                        <Text style={styles.footerText}>SECURE PROTOCOL • v1.0.0</Text>
                    </View>
                </ScrollView>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: scaleFont(24),
        paddingTop: Platform.OS === 'android' ? scaleFont(48) : scaleFont(16),
        paddingBottom: scaleFont(20)
    },
    backButton: { width: scaleFont(44), height: scaleFont(44), borderRadius: scaleFont(14), backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#F1F5F9', elevation: scaleFont(2), shadowColor: '#000', shadowOffset: { width: 0, height: scaleFont(2) }, shadowOpacity: 0.05, shadowRadius: scaleFont(5) },
    headerText: { alignItems: 'center' },
    headerSubtitle: { fontSize: scaleFont(9), fontWeight: '900', color: '#94A3B8', letterSpacing: scaleFont(2), fontFamily: 'Outfit_800ExtraBold' },
    headerTitle: { fontSize: scaleFont(18), fontWeight: '900', color: '#1E293B', marginTop: scaleFont(2), fontFamily: 'Outfit_800ExtraBold' },
    content: { padding: scaleFont(24) },
    infoBox: { backgroundColor: '#FFF', borderRadius: scaleFont(32), padding: scaleFont(24), borderWidth: 1, borderColor: '#F1F5F9', shadowColor: '#000', shadowOffset: { width: 0, height: scaleFont(10) }, shadowOpacity: 0.03, shadowRadius: scaleFont(20), elevation: scaleFont(2) },
    lastUpdated: { fontSize: scaleFont(10), fontWeight: '800', color: '#CBD5E1', marginBottom: scaleFont(32), textAlign: 'center', letterSpacing: scaleFont(1), fontFamily: 'Outfit_800ExtraBold' },
    section: { marginBottom: scaleFont(32) },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: scaleFont(12), marginBottom: scaleFont(12) },
    sectionIcon: { width: scaleFont(36), height: scaleFont(36), borderRadius: scaleFont(12), alignItems: 'center', justifyContent: 'center' },
    sectionTitle: { fontSize: scaleFont(15), fontWeight: '800', color: '#1E293B', fontFamily: 'Outfit_800ExtraBold' },
    policyText: { fontSize: scaleFont(14), color: '#64748B', lineHeight: scaleFont(22), fontWeight: '500', paddingLeft: scaleFont(48), fontFamily: 'Outfit_400Regular' },
    footer: { alignItems: 'center', marginTop: scaleFont(20), gap: scaleFont(8), opacity: 0.5 },
    footerText: { fontSize: scaleFont(10), fontWeight: '900', color: '#94A3B8', letterSpacing: scaleFont(1), fontFamily: 'Outfit_800ExtraBold' }
});
