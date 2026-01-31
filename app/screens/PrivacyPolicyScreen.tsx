import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Platform, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function PrivacyPolicyScreen() {
    const router = useRouter();

    return (
        <View style={styles.container}>
            <LinearGradient colors={['#F8FAFC', '#F1F5F9']} style={StyleSheet.absoluteFill} />

            <SafeAreaView style={{ flex: 1 }}>
                <View style={styles.header}>
                    <TouchableOpacity
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            router.back();
                        }}
                        style={styles.backButton}
                    >
                        <Ionicons name="chevron-back" size={24} color="#1E293B" />
                    </TouchableOpacity>
                    <View style={styles.headerText}>
                        <Text style={styles.headerSubtitle}>PROTOCOL GUIDELINES</Text>
                        <Text style={styles.headerTitle}>Privacy Policy</Text>
                    </View>
                    <View style={{ width: 44 }} />
                </View>

                <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                    <View style={styles.infoBox}>
                        <Text style={styles.lastUpdated}>Effective Date: January 2026</Text>

                        <View style={styles.section}>
                            <View style={styles.sectionHeader}>
                                <View style={[styles.sectionIcon, { backgroundColor: '#EEF2FF' }]}>
                                    <Ionicons name="shield-checkmark" size={18} color="#4F46E5" />
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
                                    <Ionicons name="eye-off" size={18} color="#16A34A" />
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
                                    <Ionicons name="finger-print" size={18} color="#F97316" />
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
                                    <Ionicons name="person-circle" size={18} color="#EF4444" />
                                </View>
                                <Text style={styles.sectionTitle}>4. Your Rights</Text>
                            </View>
                            <Text style={styles.policyText}>
                                You have the right to access, rectify, or delete your data at any time. For a full data purge, please use the "Request Data Deletion" tool in Security settings.
                            </Text>
                        </View>
                    </View>

                    <View style={styles.footer}>
                        <Ionicons name="infinite" size={16} color="#CBD5E1" />
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
        paddingHorizontal: 24,
        paddingTop: Platform.OS === 'android' ? 44 : 12,
        paddingBottom: 20
    },
    backButton: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#F1F5F9', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5 },
    headerText: { alignItems: 'center' },
    headerSubtitle: { fontSize: 9, fontWeight: '900', color: '#94A3B8', letterSpacing: 2 },
    headerTitle: { fontSize: 18, fontWeight: '900', color: '#1E293B', marginTop: 2 },
    content: { padding: 24 },
    infoBox: { backgroundColor: '#FFF', borderRadius: 32, padding: 24, borderWidth: 1, borderColor: '#F1F5F9', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.03, shadowRadius: 20, elevation: 2 },
    lastUpdated: { fontSize: 10, fontWeight: '800', color: '#CBD5E1', marginBottom: 32, textAlign: 'center', letterSpacing: 1 },
    section: { marginBottom: 32 },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
    sectionIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    sectionTitle: { fontSize: 15, fontWeight: '800', color: '#1E293B' },
    policyText: { fontSize: 14, color: '#64748B', lineHeight: 22, fontWeight: '500', paddingLeft: 48 },
    footer: { alignItems: 'center', marginTop: 20, gap: 8, opacity: 0.5 },
    footerText: { fontSize: 10, fontWeight: '900', color: '#94A3B8', letterSpacing: 1 }
});
