import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { Platform, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { GridOverlay } from '../../components/LuxuryVisuals';
import { scaleFont } from '../utils/layout';

export default function TermsScreen() {
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
                        <Text style={styles.headerSubtitle}>LEGAL FRAMEWORK</Text>
                        <Text style={styles.headerTitle}>Terms of Protocol</Text>
                    </View>
                    <View style={{ width: scaleFont(44) }} />
                </View>

                <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                    <View style={styles.infoBox}>
                        <Text style={styles.versionTag}>Version 1.0 • Jan 2026</Text>

                        <View style={styles.section}>
                            <View style={styles.sectionHeader}>
                                <View style={[styles.sectionIcon, { backgroundColor: '#EEF2FF' }]}>
                                    <Ionicons name="document-text" size={scaleFont(18)} color="#4F46E5" />
                                </View>
                                <Text style={styles.sectionTitle}>1. Protocol Membership</Text>
                            </View>
                            <Text style={styles.paragraph}>
                                By using Pay & Promise, you enter into a peer-to-peer social contract. You agree that your commitments are visible to your chosen peers for verification purposes.
                            </Text>
                        </View>

                        <View style={styles.section}>
                            <View style={styles.sectionHeader}>
                                <View style={[styles.sectionIcon, { backgroundColor: '#FDF2F8' }]}>
                                    <Ionicons name="shield-checkmark" size={scaleFont(18)} color="#DB2777" />
                                </View>
                                <Text style={styles.sectionTitle}>2. Verification & Integrity</Text>
                            </View>
                            <Text style={styles.paragraph}>
                                The integrity of the protocol relies on honest peer verification. Any attempts to manipulate or falsify proof of commitment may result in account restriction.
                            </Text>
                        </View>

                        <View style={styles.section}>
                            <View style={styles.sectionHeader}>
                                <View style={[styles.sectionIcon, { backgroundColor: '#F0FDF4' }]}>
                                    <Ionicons name="swap-horizontal" size={scaleFont(18)} color="#16A34A" />
                                </View>
                                <Text style={styles.sectionTitle}>3. Transaction Settlement</Text>
                            </View>
                            <Text style={styles.paragraph}>
                                Settlements are processed based on peer consensus. Pay & Promise is a facilitation tool; actual monetary transfers occur via external UPI gateways.
                            </Text>
                        </View>

                        <View style={styles.section}>
                            <View style={styles.sectionHeader}>
                                <View style={[styles.sectionIcon, { backgroundColor: '#FFF7ED' }]}>
                                    <Ionicons name="alert-circle" size={scaleFont(18)} color="#F97316" />
                                </View>
                                <Text style={styles.sectionTitle}>4. Limitation of Liability</Text>
                            </View>
                            <Text style={styles.paragraph}>
                                Pay & Promise Protocol is provided "as is". We are not liable for any disputes arising from peer-to-peer commitments or external payment failures.
                            </Text>
                        </View>
                    </View>

                    <View style={styles.footer}>
                        <Ionicons name="ribbon-outline" size={scaleFont(16)} color="#CBD5E1" />
                        <Text style={styles.footerText}>GOVERNED BY INTEGRITY</Text>
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
        paddingTop: Platform.OS === 'android' ? scaleFont(44) : scaleFont(12),
        paddingBottom: scaleFont(20)
    },
    backButton: { width: scaleFont(44), height: scaleFont(44), borderRadius: scaleFont(14), backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#F1F5F9', elevation: scaleFont(2), shadowColor: '#000', shadowOffset: { width: 0, height: scaleFont(2) }, shadowOpacity: 0.05, shadowRadius: scaleFont(5) },
    headerText: { alignItems: 'center' },
    headerSubtitle: { fontSize: scaleFont(9), fontWeight: '900', color: '#94A3B8', letterSpacing: scaleFont(2), fontFamily: 'Outfit_800ExtraBold' },
    headerTitle: { fontSize: scaleFont(18), fontWeight: '900', color: '#1E293B', marginTop: scaleFont(2), fontFamily: 'Outfit_800ExtraBold' },
    content: { padding: scaleFont(24) },
    infoBox: { backgroundColor: '#FFF', borderRadius: scaleFont(32), padding: scaleFont(24), borderWidth: 1, borderColor: '#F1F5F9', shadowColor: '#000', shadowOffset: { width: 0, height: scaleFont(10) }, shadowOpacity: 0.03, shadowRadius: scaleFont(20), elevation: scaleFont(2) },
    versionTag: { fontSize: scaleFont(10), fontWeight: '800', color: '#CBD5E1', marginBottom: scaleFont(32), textAlign: 'center', letterSpacing: scaleFont(1), fontFamily: 'Outfit_800ExtraBold' },
    section: { marginBottom: scaleFont(32) },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: scaleFont(12), marginBottom: scaleFont(12) },
    sectionIcon: { width: scaleFont(36), height: scaleFont(36), borderRadius: scaleFont(12), alignItems: 'center', justifyContent: 'center' },
    sectionTitle: { fontSize: scaleFont(15), fontWeight: '800', color: '#1E293B', fontFamily: 'Outfit_800ExtraBold' },
    paragraph: { fontSize: scaleFont(14), color: '#64748B', lineHeight: scaleFont(22), fontWeight: '500', paddingLeft: scaleFont(48), fontFamily: 'Outfit_400Regular' },
    footer: { alignItems: 'center', marginTop: scaleFont(20), gap: scaleFont(8), opacity: 0.5 },
    footerText: { fontSize: scaleFont(10), fontWeight: '900', color: '#94A3B8', letterSpacing: scaleFont(1), fontFamily: 'Outfit_800ExtraBold' }
});
